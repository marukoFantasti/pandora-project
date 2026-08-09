// ============================================================
// Pandora パターンバンク: 図形SVGビルダー（figure_params → インラインSVG）
// ★単一ファイル。quiz_template / print_template から <script src> で共有読込する
//   （二重インライン実装は禁止：checkConsistencyForReview 複製と同じ漂流リスクのため）。
// ★外部依存なし（CDN禁止の意図は外部依存排除。自リポジトリ内の共有モジュールは可）。
// ★figure_params は make_problem が本文と同一 env で解決済みの数値を渡す。
//   したがって図中の数値と問題文が構造的に食い違わない。
// ブラウザ<script>とNode(require)の両対応。
// ============================================================
(function (root) {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 長方形の面積: たて h × 横 w（cm）。寸法ラベル付き。
  function rectArea(fp) {
    var w = Number(fp.w), h = Number(fp.h), unit = fp.unit || 'cm';
    // 左マージン: たて寸法ラベル(最大「12cm」=4文字, text-anchor=end)が切れないよう固定余白を確保。
    var pad = 34, leftMargin = 30, scale = Math.min(220 / Math.max(w, 1), 220 / Math.max(h, 1), 26);
    var W = w * scale, H = h * scale;
    var x = pad + leftMargin, y = pad;
    var svgW = x + W + pad, svgH = H + pad * 2;
    var parts = [];
    parts.push('<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '" fill="#eef4ff" stroke="#1a56c4" stroke-width="2"/>');
    if (fp.show_dims !== false) {
      parts.push('<text x="' + (x + W / 2) + '" y="' + (y + H + 20) + '" text-anchor="middle" font-size="14" fill="#333">' + esc(w) + esc(unit) + '</text>');
      parts.push('<text x="' + (x - 8) + '" y="' + (y + H / 2 + 4) + '" text-anchor="end" font-size="14" fill="#333">' + esc(h) + esc(unit) + '</text>');
    }
    return svg(svgW, svgH, parts.join(''));
  }

  // 角度の和: 頂点Oから3本の辺。下→a1→a2 で開き、既知角 a1/a2 に小さめの弧、
  // 求める角「あ」(=全体 a1+a2)に大きめの弧を描き、あラベルを弧の外側中点に置く。
  // ---- angle_sum の幾何・衝突ユーティリティ（build と機械検査で共有）----
  var A_CX = 40, A_CY = 200, A_R = 150, DEG = Math.PI / 180;
  function aPt(deg, r) { return [A_CX + r * Math.cos(deg * DEG), A_CY - r * Math.sin(deg * DEG)]; }
  // 文字列の概算bbox（半角=0.58em / 全角かな=1.0em）
  function textBox(center, text, fs) {
    var w = 0; for (var i = 0; i < text.length; i++) w += /[0-9°.a-zA-Z]/.test(text[i]) ? fs * 0.58 : fs;
    return { x0: center[0] - w / 2, x1: center[0] + w / 2, y0: center[1] - fs / 2, y1: center[1] + fs / 2 };
  }
  function boxPts(b) { return [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]]; }
  function distPtSeg(p, s1, s2) {
    var vx = s2[0] - s1[0], vy = s2[1] - s1[1], L2 = vx * vx + vy * vy || 1;
    var t = Math.max(0, Math.min(1, ((p[0] - s1[0]) * vx + (p[1] - s1[1]) * vy) / L2));
    return Math.hypot(p[0] - (s1[0] + t * vx), p[1] - (s1[1] + t * vy));
  }
  function rectRect(a, b) { var dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1), dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1); return Math.hypot(dx, dy); }
  function boxSeg(b, s1, s2) { var m = 1e9; boxPts(b).forEach(function (p) { m = Math.min(m, distPtSeg(p, s1, s2)); }); return m; }
  // bbox が弧(半径 r, 角度span[d1,d2])に「分断」されるか＝弧の線がbboxを横切るか。
  // 判定: bbox頂点の半径帯[min,max]に弧半径が入り、かつ角度がspanと重なる。単なる近接(隣接)は
  // 分断ではない（数字は自分の弧に隣接してよい）。
  function boxCutArc(b, arc) {
    var lo = Math.min(arc.d1, arc.d2) - 3, hi = Math.max(arc.d1, arc.d2) + 3;
    var radii = [], inSpan = false;
    boxPts(b).forEach(function (p) {
      var rr = Math.hypot(p[0] - A_CX, A_CY - p[1]);
      var ang = Math.atan2(A_CY - p[1], p[0] - A_CX) / DEG; if (ang < 0) ang += 360;
      radii.push(rr); if (ang >= lo && ang <= hi) inSpan = true;
    });
    if (!inSpan) return false;
    var mn = Math.min.apply(null, radii), mx = Math.max.apply(null, radii);
    return arc.r >= mn + 1.5 && arc.r <= mx - 1.5;   // 弧の線がbbox内部を実際に横切る場合のみ（縁のかすりは分断としない）
  }
  // bbox から半直線(角度 rayDeg)への符号付きギャップ（負=めり込み量）。自セクター境界の許容判定に使う。
  function signedRayGap(b, rayDeg) {
    var c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], w = b.x1 - b.x0, h = b.y1 - b.y0;
    var halfPerp = (w / 2) * Math.abs(Math.sin(rayDeg * DEG)) + (h / 2) * Math.abs(Math.cos(rayDeg * DEG));
    return distPtSeg(c, [A_CX, A_CY], aPt(rayDeg, A_R)) - halfPerp;
  }

  // レイアウト（テスト可能）: 候補スロット貪欲配置 + viewBox自動フィット。
  // 個別の条件分岐を廃し、各ラベルに候補[基本, r+12, r+24, 角+15, 角-15]を優先順で与え、
  // 確定済みラベル・半直線・弧との距離が全て10px以上になる最初の候補を採る。全滅なら最遠候補+font12。
  function angleSumLayout(a1, a2, label) {
    var rayDeg = [0, a1, a1 + a2];
    var rays = rayDeg.map(function (d) { return aPt(d, A_R); });
    var arcs = [{ r: 30, d1: 0, d2: a1 }, { r: 30, d1: a1, d2: a1 + a2 }, { r: 60, d1: 0, d2: a1 + a2 }];
    var placed = [];
    function lblMin(b) { var mn = 1e9; placed.forEach(function (q) { mn = Math.min(mn, rectRect(b, q.b)); }); return mn; }
    function otherRayMin(b, ownIdx) { var mn = 1e9; rayDeg.forEach(function (d, i) { if (ownIdx.indexOf(i) >= 0) return; mn = Math.min(mn, boxSeg(b, [A_CX, A_CY], rays[i])); }); return mn; }
    function ownRayGapMin(b, ownIdx) { var mn = 1e9; ownIdx.forEach(function (i) { mn = Math.min(mn, signedRayGap(b, rayDeg[i])); }); return mn; }
    // 既知角の数字: 自セクター二等分線上のみ（角度方向は動かさない＝脱走の根絶）。半径とフォントだけ変える。
    // 候補順: (46,13)→(46,11)→(40,11)→(54,11)。r=54は赤弧(60)の内側で分断しない。
    // どれも収まらない極狭角は r=46/font11 で置き、自セクター半直線への2px以内のかぶりは許容（角の外・下は禁止＝二等分線上なので構造的に無い）。
    function placeKnown(bis, ownIdx, text) {
      var cands = [[46, 12], [46, 11], [40, 12], [54, 12], [40, 11], [54, 11], [40, 10], [54, 10]];
      var best = null, bestScore = -1e9;
      for (var i = 0; i < cands.length; i++) {
        var r = cands[i][0], fs = cands[i][1], b = textBox(aPt(bis, r), text, fs);
        var cut = arcs.some(function (a) { return boxCutArc(b, a); });
        if (lblMin(b) >= 10 && otherRayMin(b, ownIdx) >= 10 && !cut && ownRayGapMin(b, ownIdx) >= -2) {
          placed.push({ angle: bis, r: r, text: text, color: '#333', fs: fs, b: b, ownIdx: ownIdx }); return;
        }
        // 全滅時の保険: 分断せず、他ラベルからの分離が最大の候補を選ぶ（極狭対称のみここに来る）。
        var score = cut ? -1000 : Math.min(lblMin(b), otherRayMin(b, ownIdx));
        if (score > bestScore) { bestScore = score; best = { r: r, fs: fs, b: b }; }
      }
      placed.push({ angle: bis, r: best.r, text: text, color: '#333', fs: best.fs, b: best.b, ownIdx: ownIdx });
    }
    placeKnown(a1 / 2, [0, 1], a1 + '°');
    placeKnown(a1 + a2 / 2, [1, 2], a2 + '°');
    // あ: 全体角の二等分線上 r=72 固定 font13。真ん中の半直線(内部, idx1)と重なる場合のみ r=84（方向不変）。
    var aBis = (a1 + a2) / 2, aR = 72, aB = textBox(aPt(aBis, aR), label, 13);
    if (boxSeg(aB, [A_CX, A_CY], rays[1]) < 8) { aR = 84; aB = textBox(aPt(aBis, aR), label, 13); }
    placed.push({ angle: aBis, r: aR, text: label, color: '#c0392b', fs: 13, b: aB, ownIdx: [0, 2], interiorRay: 1 });
    // viewBox 自動フィット: 全描画要素の外接矩形 + 12px
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    function ext(x, y) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    ext(A_CX, A_CY); rays.forEach(function (p) { ext(p[0], p[1]); });
    arcs.forEach(function (a) { for (var d = a.d1; d <= a.d2 + 0.001; d += 4) { var p = aPt(d, a.r); ext(p[0], p[1]); } });
    placed.forEach(function (q) { ext(q.b.x0, q.b.y0); ext(q.b.x1, q.b.y1); });
    var M = 12;
    return { rays: rays, arcs: arcs, labels: placed, viewBox: { x: minX - M, y: minY - M, w: (maxX - minX) + 2 * M, h: (maxY - minY) + 2 * M } };
  }

  function angleSum(fp) {
    var a1 = Number(fp.a1), a2 = Number(fp.a2), lay = angleSumLayout(a1, a2, fp.label || 'あ');
    function arc(a) {
      var steps = Math.max(2, Math.round(Math.abs(a.d2 - a.d1) / 4)), pts = [], col = a.r === 60 ? '#c0392b' : '#888', wid = a.r === 60 ? 2 : 1.4;
      for (var i = 0; i <= steps; i++) { var d = a.d1 + (a.d2 - a.d1) * i / steps; pts.push(aPt(d, a.r).join(',')); }
      return '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + wid + '"/>';
    }
    var parts = [];
    lay.rays.forEach(function (p) { parts.push('<line x1="' + A_CX + '" y1="' + A_CY + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#1a56c4" stroke-width="2"/>'); });
    lay.arcs.forEach(function (a) { parts.push(arc(a)); });
    lay.labels.forEach(function (q) { var p = aPt(q.angle, q.r); parts.push('<text x="' + p[0] + '" y="' + (p[1] + q.fs * 0.34) + '" text-anchor="middle" font-size="' + q.fs + '" paint-order="stroke" stroke="#fff" stroke-width="3" fill="' + q.color + '">' + esc(q.text) + '</text>'); });
    parts.push('<circle cx="' + A_CX + '" cy="' + A_CY + '" r="3" fill="#1a56c4"/>');
    var v = lay.viewBox;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + v.x.toFixed(1) + ' ' + v.y.toFixed(1) + ' ' + v.w.toFixed(1) + ' ' + v.h.toFixed(1) +
      '" width="' + Math.ceil(v.w) + '" height="' + Math.ceil(v.h) + '" role="img">' + parts.join('') + '</svg>';
  }

  // 機械検査用（build と同一幾何関数を共有）。ユーザ規定:
  //  a) 衝突: ラベル間・ラベル対他半直線 ≥10px、既知数字対「自セクター半直線」のみ ≥-2px(2px許容)、
  //     あ対「内部の中央半直線」はハローで許容（除外）、弧の分断なし。
  //  b) 意味: 各ラベル重心角が自セクター角度範囲 ±8° 以内（脱走の機械検出）。
  function angleSumMinClearance(a1, a2, labelText) {
    var lay = angleSumLayout(a1, a2, labelText || 'あ'), L = lay.labels, rd = [0, a1, a1 + a2];
    var sec = [[0, a1], [a1, a1 + a2], [0, a1 + a2]];
    var minLbl = 1e9, minOther = 1e9, minOwn = 1e9, cut = false, semBad = 0, colBad = 0;
    for (var i = 0; i < L.length; i++) {
      for (var j = i + 1; j < L.length; j++) { var dl = rectRect(L[i].b, L[j].b); minLbl = Math.min(minLbl, dl); if (dl < 10) colBad++; }
      var own = L[i].ownIdx || [], interior = L[i].interiorRay;
      for (var k = 0; k < rd.length; k++) {
        if (own.indexOf(k) >= 0) { var g = signedRayGap(L[i].b, rd[k]); minOwn = Math.min(minOwn, g); if (g < -2) colBad++; }
        else if (k === interior) { /* 中央半直線: ハロー許容で除外 */ }
        else { var d = boxSeg(L[i].b, [A_CX, A_CY], lay.rays[k]); minOther = Math.min(minOther, d); if (d < 10) colBad++; }
      }
      lay.arcs.forEach(function (a) { if (boxCutArc(L[i].b, a)) cut = true; });
      var c = [(L[i].b.x0 + L[i].b.x1) / 2, (L[i].b.y0 + L[i].b.y1) / 2];
      var ang = Math.atan2(A_CY - c[1], c[0] - A_CX) / DEG; if (ang < 0) ang += 360;
      if (ang < sec[i][0] - 8 || ang > sec[i][1] + 8) semBad++;
    }
    return { minLbl: minLbl, minOther: minOther, minOwn: minOwn, cut: cut, semBad: semBad, colBad: colBad, viewBox: lay.viewBox, labels: L };
  }

  // ============================================================
  // kind: "table" 対応表（B層・v0.9）。仕様: v09_js_port_draft.js / figure_kinds_design_g05.md。
  // 配置原則（angle_sum で確立した原則の表への写像）:
  //  1. ラベル束縛 — 見出し・値は自セルに束縛（セル外に出さない）。
  //  2. 可動自由度 — フォントサイズと列幅のみ（行高・罫線・セル対応は固定）。
  //  3. 全域スキャン — (a)セル境界はみ出し0px (b)隣接テキスト距離≥10px (c)行列対応の意味判定。
  //     列幅=最長セル文字列の実測幅+パディングで確保するため (a)(b) は構造的に保証。
  //     幅がMAXWを超える場合のみフォント縮小で吸収（可動自由度の範囲）。
  //  値セルには数値のみ、単位は行ラベル側に含める（バンク側の責務）。数値直書きはしない（スロット参照）。
  // ============================================================
  function tblTextW(text, fs) {   // 概算幅（半角=0.58em / 全角=1.0em。angle_sum の textBox と同一係数）
    var s = String(text), w = 0;
    for (var i = 0; i < s.length; i++) w += /[0-9.\-a-zA-Z%]/.test(s[i]) ? fs * 0.58 : fs;
    return w;
  }
  // レイアウト（テスト可能・描画から分離）。cell[row][col]: row0=ヘッダ, col0=行ラベル, 左上=空。
  function tableLayout(fp) {
    var colHeader = fp.col_header || [], rows = fp.rows || [];
    var nCol = 1 + colHeader.length, nRow = 1 + rows.length;
    var cell = [];
    for (var r = 0; r < nRow; r++) {
      cell[r] = [];
      for (var c = 0; c < nCol; c++) {
        if (r === 0 && c === 0) cell[r][c] = '';
        else if (r === 0) cell[r][c] = String(colHeader[c - 1]);
        else if (c === 0) cell[r][c] = String(rows[r - 1].label);
        else { var vals = rows[r - 1].values || []; cell[r][c] = String(vals[c - 1] !== undefined ? vals[c - 1] : ''); }
      }
    }
    var HPAD = 10, VPAD = 7, MAXW = 460, fs = 13, colW, rowH, tableW;
    while (true) {   // 可動自由度: 幅超過時のみフォント縮小（最小9）。列幅は各列の実測最長に合わせる。
      colW = [];
      for (var c2 = 0; c2 < nCol; c2++) {
        var mx = 0;
        for (var r2 = 0; r2 < nRow; r2++) mx = Math.max(mx, tblTextW(cell[r2][c2], fs));
        colW[c2] = mx + 2 * HPAD;
      }
      rowH = fs + 2 * VPAD;
      tableW = colW.reduce(function (a, b) { return a + b; }, 0);
      if (tableW <= MAXW || fs <= 9) break;
      fs -= 1;
    }
    var capFs = 13, capH = fp.caption ? capFs + 8 : 0;
    var colX = [0]; for (var c3 = 0; c3 < nCol; c3++) colX[c3 + 1] = colX[c3] + colW[c3];
    var y0 = capH, cells = [];
    for (var r3 = 0; r3 < nRow; r3++) {
      for (var c4 = 0; c4 < nCol; c4++) {
        var x = colX[c4], y = y0 + r3 * rowH, tw = tblTextW(cell[r3][c4], fs);
        var cx = x + colW[c4] / 2, cy = y + rowH / 2;
        cells.push({ r: r3, c: c4, text: cell[r3][c4], x: x, y: y, w: colW[c4], h: rowH,
          tx0: cx - tw / 2, tx1: cx + tw / 2, ty0: cy - fs / 2, ty1: cy + fs / 2, cx: cx, cy: cy });
      }
    }
    return { nCol: nCol, nRow: nRow, colW: colW, colX: colX, rowH: rowH, fs: fs, capFs: capFs, capH: capH,
      cells: cells, W: tableW, H: capH + nRow * rowH };
  }
  function drawTable(fp) {
    var L = tableLayout(fp), parts = [], x0 = 0, y0 = L.capH, x1 = L.W, y1 = L.H;
    if (fp.caption) parts.push('<text x="' + (L.W / 2) + '" y="' + L.capFs + '" text-anchor="middle" font-size="' + L.capFs + '" font-weight="bold" fill="#222">' + esc(fp.caption) + '</text>');
    parts.push('<rect x="0" y="' + y0 + '" width="' + L.W + '" height="' + L.rowH + '" fill="#eef4ff"/>');            // ヘッダ行
    parts.push('<rect x="0" y="' + y0 + '" width="' + L.colW[0] + '" height="' + (L.H - y0) + '" fill="#f4f7fd"/>');   // 行ラベル列
    for (var r = 0; r <= L.nRow; r++) { var yy = y0 + r * L.rowH; parts.push('<line x1="' + x0 + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="#1a56c4" stroke-width="1"/>'); }
    for (var c = 0; c <= L.nCol; c++) { var xx = L.colX[c]; parts.push('<line x1="' + xx + '" y1="' + y0 + '" x2="' + xx + '" y2="' + y1 + '" stroke="#1a56c4" stroke-width="1"/>'); }
    L.cells.forEach(function (cl) {
      if (cl.text === '') return;
      parts.push('<text x="' + cl.cx + '" y="' + (cl.cy + L.fs * 0.34) + '" text-anchor="middle" font-size="' + L.fs + '" fill="#222">' + esc(cl.text) + '</text>');
    });
    // 罫線(width1)が viewBox 端で欠けないよう 1px 内側に置く。
    return svg(L.W + 2, L.H + 2, '<g transform="translate(1,1)">' + parts.join('') + '</g>');
  }
  // 機械検査（build と同一 tableLayout を共有）。(a)はみ出し (b)テキスト間距離 (c)行列対応の意味判定。
  function tableMinClearance(fp) {
    var L = tableLayout(fp), overflow = 0, minGap = 1e9;
    var nonEmpty = L.cells.filter(function (c) { return c.text !== ''; });
    nonEmpty.forEach(function (cl) {
      var ox = Math.max(0, cl.x - cl.tx0, cl.tx1 - (cl.x + cl.w));
      var oy = Math.max(0, cl.y - cl.ty0, cl.ty1 - (cl.y + cl.h));
      overflow = Math.max(overflow, ox, oy);
    });
    function gapBox(a, b) { var dx = Math.max(0, a.tx0 - b.tx1, b.tx0 - a.tx1), dy = Math.max(0, a.ty0 - b.ty1, b.ty0 - a.ty1); return Math.hypot(dx, dy); }
    for (var i = 0; i < nonEmpty.length; i++) for (var j = i + 1; j < nonEmpty.length; j++) {
      var a = nonEmpty[i], b = nonEmpty[j];
      if ((a.r === b.r && Math.abs(a.c - b.c) === 1) || (a.c === b.c && Math.abs(a.r - b.r) === 1)) minGap = Math.min(minGap, gapBox(a, b));
    }
    if (minGap === 1e9) minGap = 999;
    var semOk = true;   // (c) 各ボディ行の値数がヘッダ列数と一致（行列対応の構造検証）
    (fp.rows || []).forEach(function (row) { if ((row.values || []).length !== (fp.col_header || []).length) semOk = false; });
    var contained = true;   // 全テキストが表領域内
    nonEmpty.forEach(function (cl) { if (cl.tx0 < -0.01 || cl.tx1 > L.W + 0.01 || cl.ty0 < L.capH - 0.01 || cl.ty1 > L.H + 0.01) contained = false; });
    return { overflow: overflow, minGap: minGap, semOk: semOk, contained: contained, W: L.W, H: L.H, fs: L.fs };
  }

  // ============================================================
  // C層 9kind（fig_geometry_reference.py と同一手順・定数で移植。幾何は
  // geometry_test_vectors.json で±0.5px検収。リファレンスは y上向きローカル座標、
  // SVG出力時に y反転（worldFlip）+ viewBox自動フィット。既存3kindには触れない）。
  // 色: 本体 #1a56c4 / 塗り #eef4ff、既知角 #1D9E75、求める対象・高さ点線・直角記号 #C0392B。
  // ============================================================
  function d2r(x) { return x * DEG; }
  var C_STROKE = '#1a56c4', C_FILL = '#eef4ff', C_KNOWN = '#1D9E75', C_TARGET = '#C0392B';
  function worldFlip(p) { return [p[0], -p[1]]; }   // y上向き→SVG(y下向き)
  function polyStr(ps) { return ps.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
  function polygonEl(ps, fill, sw) { return '<polygon points="' + polyStr(ps) + '" fill="' + (fill || C_FILL) + '" stroke="' + C_STROKE + '" stroke-width="' + (sw || 2) + '"/>'; }
  function lineEl(p1, p2, color, w, dash) { return '<line x1="' + p1[0].toFixed(2) + '" y1="' + p1[1].toFixed(2) + '" x2="' + p2[0].toFixed(2) + '" y2="' + p2[1].toFixed(2) + '" stroke="' + color + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
  function textEl(cx, cy, text, fs, color) { return '<text x="' + cx.toFixed(2) + '" y="' + (cy + fs * 0.34).toFixed(2) + '" text-anchor="middle" font-size="' + fs + '" paint-order="stroke" stroke="#fff" stroke-width="3" fill="' + color + '">' + esc(text) + '</text>'; }
  function arcPoly(c, r, a0, a1, color, w) {
    var steps = Math.max(3, Math.round(Math.abs(a1 - a0) / (Math.PI / 45))), pts = [];
    for (var i = 0; i <= steps; i++) { var a = a0 + (a1 - a0) * i / steps; pts.push((c[0] + r * Math.cos(a)).toFixed(2) + ',' + (c[1] + r * Math.sin(a)).toFixed(2)); }
    return '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="' + w + '"/>';
  }
  // 頂点Vの内角弧（P,Qは隣接頂点、centroidで内側決定）。{el, bisIn}(bisInは内向き単位ベクトル)。
  function vertexArc(V, P, Q, centroid, r, color, w) {
    var aP = Math.atan2(P[1] - V[1], P[0] - V[0]), aQ = Math.atan2(Q[1] - V[1], Q[0] - V[0]);
    var d = aQ - aP; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI;
    var bis = aP + d / 2, toC = [centroid[0] - V[0], centroid[1] - V[1]];
    if (Math.cos(bis) * toC[0] + Math.sin(bis) * toC[1] < 0) bis += Math.PI;
    return { el: arcPoly(V, r, aP, aP + d, color, w), bisIn: [Math.cos(bis), Math.sin(bis)] };
  }
  // ラベル候補配置（可動はラベル距離・フォントのみ）。anchorからdir方向へ距離を試し、
  // 他ラベル≥10px・非自線分≥4pxを満たす最初の候補、無ければ最良。
  // dirs: 試行する方向の配列（寸法系は「辺からのオフセット」自由度として複数方向を許容）。
  // 各方向×距離候補を試し、(a)他ラベル≥10px (b)非自線分≥4px (c)意味判定=自要素が最近傍
  // (nearestOwn≤nearestOther) を満たす最初の候補を採る。全滅なら意味判定を優先した最良候補。
  function segMin(b, segs) { var m = 1e9; segs.forEach(function (s) { m = Math.min(m, boxSeg(b, s.p1, s.p2)); }); return m; }
  // ownMin>0: 自要素(点線)からの水平クリアランス≥ownMin を強条件として課す（高さ点線/たて対角線の
  // 先頭数字が線と平行に紛れるのを字形レベルの前段で防ぐ）。この場合は意味判定(自要素が最近傍)は
  // 課さない（ラベルは点線と側辺の間に置かれ、識別は位置＋赤色＋白フチで担保）。ownMin=0 は従来どおり。
  function placeLbl(anchor, dirs, text, others, ownSegs, otherSegs, cands, ownMin) {
    ownMin = ownMin || 0;
    var strong = ownMin > 0, best = null, bestScore = -1e9;
    for (var di = 0; di < dirs.length; di++) {
      var dir = dirs[di];
      for (var i = 0; i < cands.length; i++) {
        var dist = cands[i][0], fs = cands[i][1];
        var cx = anchor[0] + dir[0] * dist, cy = anchor[1] + dir[1] * dist, b = textBox([cx, cy], text, fs);
        var gL = 1e9; others.forEach(function (o) { gL = Math.min(gL, rectRect(b, o)); });
        var nOwn = ownSegs.length ? segMin(b, ownSegs) : 0, nOther = segMin(b, otherSegs);
        var ok = strong ? (nOwn >= ownMin) : (nOwn <= nOther);
        if (gL >= 10 && nOther >= 4 && ok) return { box: b, cx: cx, cy: cy, fs: fs, text: text };
        var score = Math.min(gL, nOther * 2.5) + (ok ? 1000 : 0) + (gL >= 10 && nOther >= 4 ? 500 : 0);
        if (score > bestScore) { bestScore = score; best = { box: b, cx: cx, cy: cy, fs: fs, text: text }; }
      }
    }
    return best;
  }
  // 高さ点線+直角記号+高さラベル（para/tri/trap 共通・1実装）。apexW→footW は真下の縦線。
  function heightComponent(apexW, footW, valueText, layout) {
    var fx = footW[0], fy = footW[1];
    layout.parts.push(lineEl(apexW, footW, C_TARGET, 1.6, '5,4'));
    layout.parts.push('<path d="M ' + fx.toFixed(2) + ' ' + (fy - 8).toFixed(2) + ' h 8 v 8" fill="none" stroke="' + C_TARGET + '" stroke-width="1.4"/>');
    layout.segs.push({ id: 'hline', p1: apexW, p2: footW });
    layout.pts.push(apexW, footW, [fx + 8, fy - 8]);
    // 高さラベルは点線の左右どちらか空いている側（「辺からのオフセット」自由度）。アンカーは
    // 下寄り(底辺側=くさびが広い)にして、点線からの水平クリアランス≥12px(ownMin)を満たせる余地を確保。
    // 候補は「点線から12px以上離れる距離」から開始し、狭ければフォントを段階縮小(14→10)する。
    // 足元からの上向きオフセット。背の高い図(tri)はくさびを広く取るため低め、背の低い図(trap短)は
    // 底辺に近づきすぎないよう最低16px確保。上限は中央付近(0.45H)。適応的にクランプ。
    var H = Math.abs(apexW[1] - footW[1]);
    var off = Math.min(0.45 * H, Math.max(0.15 * H, 16));
    var ay = footW[1] + (apexW[1] - footW[1]) / H * off;
    return {
      anchor: [fx, ay], dirs: [[1, 0], [-1, 0]], text: valueText, own: 'hline', ownMin: 12,
      cands: [[28, 14], [32, 14], [28, 13], [33, 13], [27, 12], [33, 12], [26, 11], [31, 11], [26, 10], [30, 10], [24, 10], [36, 10]]
    };
  }
  var KNOWN_R = 26, UNKNOWN_R = 34;
  // 内側ラベル: 隣接ラベルと分離できるよう距離を広く（短⇔深）・フォントを段階的に試行。
  var KN_IN = [[36, 15], [34, 15], [42, 15], [48, 15], [36, 13], [34, 13], [42, 13], [30, 13], [52, 13], [58, 13],
    [36, 11], [34, 11], [42, 11], [30, 11], [52, 11], [60, 11], [34, 10], [44, 10], [58, 10]];
  // 未知角ラベル(内側・二等分方向)。初期半径=未知弧半径(34)+14=48、可動域 r∈[弧+10,弧+34]=[44,68]、
  // font 15→13→11。r≥44>弧34 なので必ず弧の外側(頂点から遠い側)＝弧とラベルが重ならない。
  var UN_IN = [[48, 15], [44, 15], [54, 15], [48, 13], [44, 13], [60, 13], [48, 11], [44, 11], [68, 11]];

  // ---- 幾何（リファレンスと1:1） ----
  function triAngleGeom(a1, a2) {
    var L = 260, t1 = Math.tan(d2r(a1)), t2 = Math.tan(d2r(a2));
    var h = L * t1 * t2 / (t1 + t2), ax = L * t2 / (t1 + t2), sc = Math.min(1, 260 / h);
    return { B: [0, 0], C: [L * sc, 0], A: [ax * sc, h * sc], scale: sc };
  }
  function triAngleIsoGeom(t) {
    var s = 190, half = d2r(t / 2), base = 2 * s * Math.sin(half), h = s * Math.cos(half);
    return { T: [base / 2, h], BL: [0, 0], BR: [base, 0], base: base, h: h };
  }
  var QUAD_AD = [150, 170, 130, 190, 110, 210, 100, 90];
  function quadTry(a1, a2, a3, AB, AD) {
    var A = [0, 0], B = [AB, 0], r1 = d2r(a1), D = [AD * Math.cos(r1), AD * Math.sin(r1)];
    var ang_da = Math.atan2(A[1] - D[1], A[0] - D[0]), ang_dc = ang_da + d2r(a3), ang_bc = Math.PI - d2r(a2);
    var bx = Math.cos(ang_bc), by = Math.sin(ang_bc), dx = Math.cos(ang_dc), dy = Math.sin(ang_dc);
    var den = bx * (-dy) - by * (-dx);
    if (Math.abs(den) < 1e-9) return null;
    var ex = D[0] - B[0], ey = D[1] - B[1];
    var t = (ex * (-dy) - ey * (-dx)) / den, s = (bx * ey - by * ex) / den;
    if (t <= 1 || s <= 1) return null;
    var C = [B[0] + t * bx, B[1] + t * by], pts = [A, B, C, D], cross = [];
    for (var i = 0; i < 4; i++) { var p = pts[i], q = pts[(i + 1) % 4], r = pts[(i + 2) % 4]; cross.push((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0])); }
    var pos = cross.every(function (c) { return c > 0; }), neg = cross.every(function (c) { return c < 0; });
    if (!(pos || neg)) return null;
    function dist(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); }
    var edges = []; for (var j = 0; j < 4; j++) edges.push(dist(pts[j], pts[(j + 1) % 4]));
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    if (Math.max.apply(null, xs) - Math.min.apply(null, xs) > 620 || Math.max.apply(null, ys) - Math.min.apply(null, ys) > 540) return null;
    return { pts: pts, min_edge: Math.min.apply(null, edges) };
  }
  function quadAngleGeom(a1, a2, a3) {
    var best = null, bestM = -1;
    for (var k = 0; k < QUAD_AD.length; k++) {
      var r = quadTry(a1, a2, a3, 180, QUAD_AD[k]);
      if (r && r.min_edge >= 42) { best = r; break; }
      if (r && r.min_edge > bestM) { best = r; bestM = r.min_edge; }
    }
    var p = best.pts;
    return { A: p[0], B: p[1], C: p[2], D: p[3], min_edge: best.min_edge };
  }
  function paraAreaGeom(b, h, slant) {
    var sc = Math.min(260 / b, 170 / h, 24), B_ = b * sc, H_ = h * sc, off = H_ / Math.tan(d2r(slant));
    return { A: [0, 0], B: [B_, 0], C: [B_ + off, H_], D: [off, H_], foot: [off, 0], scale: sc };
  }
  function triAreaGeom(base, height, ar) {
    var sc = Math.min(260 / base, 170 / height, 24), B_ = base * sc, H_ = height * sc, ax = B_ * ar / 1000;
    return { P1: [0, 0], P2: [B_, 0], apex: [ax, H_], foot: [ax, 0], scale: sc };
  }
  function trapAreaGeom(a, b, h, orpm) {
    var sc = Math.min(260 / b, 170 / h, 24), A_ = a * sc, B_ = b * sc, H_ = h * sc, off = (B_ - A_) * orpm / 1000;
    return { P1: [0, 0], P2: [B_, 0], P3: [off + A_, H_], P4: [off, H_], h_top: [off + A_ * 0.5, H_], h_foot: [off + A_ * 0.5, 0], scale: sc };
  }
  function rhombusAreaGeom(d1, d2) {
    var sc = Math.min(240 / Math.max(d1, d2), 22), hx = d1 * sc / 2, hy = d2 * sc / 2;
    return { Lp: [-hx, 0], Rp: [hx, 0], Tp: [0, hy], Bp: [0, -hy], scale: sc };
  }
  function circleGeom(given) {
    var r = 90;
    return given === 'diameter' ? { c: [0, 0], r_px: r, line: [[-r, 0], [r, 0]] } : { c: [0, 0], r_px: r, line: [[0, 0], [r, 0]] };
  }
  function cuboidGeom(w, d, h) {
    var sc = Math.min(180 / w, 150 / h, 110 / d, 20), W = w * sc, H = h * sc, D = d * sc * 0.5;
    var ox = D * Math.cos(d2r(45)), oy = D * Math.sin(d2r(45));
    return { F: [[0, 0], [W, 0], [W, H], [0, H]], off: [ox, oy], scale: sc };
  }
  var GEOMS_C = { tri_angle: triAngleGeom, tri_angle_iso: triAngleIsoGeom, quad_angle: quadAngleGeom, para_area: paraAreaGeom, trap_area: trapAreaGeom, rhombus_area: rhombusAreaGeom, circle: circleGeom, cuboid: cuboidGeom };

  // ---- 共通: レイアウト→SVG / スキャン ----
  function newLayout() { return { parts: [], segs: [], labels: [], pts: [] }; }
  function finishLabels(layout, specs) {   // specs: {anchor,dir,text,cands,color,own}
    specs.forEach(function (sp) {
      var others = layout.labels.map(function (l) { return l.box; });
      var ownSegs = layout.segs.filter(function (s) { return s.id === sp.own; });
      var otherSegs = layout.segs.filter(function (s) { return s.id !== sp.own; });
      var pl = placeLbl(sp.anchor, sp.dirs || [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands, sp.ownMin || 0);
      layout.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      layout.labels.push({ box: pl.box, own: sp.own, ownMin: sp.ownMin || 0, text: sp.text });
      layout.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
  }
  function layoutToSvg(layout, M) {
    M = M || 14;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    layout.pts.forEach(function (p) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
    var vx = minX - M, vy = minY - M, vw = (maxX - minX) + 2 * M, vh = (maxY - minY) + 2 * M;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vx.toFixed(1) + ' ' + vy.toFixed(1) + ' ' + vw.toFixed(1) + ' ' + vh.toFixed(1) +
      '" width="' + Math.ceil(vw) + '" height="' + Math.ceil(vh) + '" role="img">' + layout.parts.join('') + '</svg>';
  }
  function scanLayout(layout) {
    var L = layout.labels, minText = 1e9, minSeg = 1e9, semBad = 0, strongBad = 0, minStrongOwn = 1e9;
    for (var i = 0; i < L.length; i++) {
      for (var j = i + 1; j < L.length; j++) minText = Math.min(minText, rectRect(L[i].box, L[j].box));
      var own = L[i].own, ownMin = L[i].ownMin || 0, nOwn = 1e9, nOther = 1e9;
      layout.segs.forEach(function (s) {
        var dd = boxSeg(L[i].box, s.p1, s.p2);
        if (s.id === own) nOwn = Math.min(nOwn, dd);
        else { nOther = Math.min(nOther, dd); minSeg = Math.min(minSeg, dd); }
      });
      if (ownMin > 0) {
        // 部品固有の強不変条件: 自点線からの水平クリアランス≥ownMin。意味判定は課さない。
        if (nOwn !== 1e9) minStrongOwn = Math.min(minStrongOwn, nOwn);
        if (nOwn < ownMin) strongBad++;
      } else if (own && nOwn > nOther + 0.01) semBad++;
    }
    return { minText: minText === 1e9 ? 999 : minText, minSeg: minSeg === 1e9 ? 999 : minSeg, semBad: semBad,
      strongBad: strongBad, minStrongOwn: minStrongOwn === 1e9 ? 999 : minStrongOwn };
  }

  // ---- 角度系（多角形の内角ラベル）共通描画 ----
  function polyAngleLayout(worldPts, knownLabels, unknownIdx, unknownText) {
    // worldPts: 多角形(world). knownLabels: {idx:text}. unknownIdx: 未知角の頂点idx。
    // 既知角も未知角も内側・二等分方向に配置（未知は UN_IN の大きめ半径で弧の外側に置く）。
    var lay = newLayout(), n = worldPts.length;
    var cen = [0, 0]; worldPts.forEach(function (p) { cen[0] += p[0] / n; cen[1] += p[1] / n; });
    lay.parts.push(polygonEl(worldPts));
    worldPts.forEach(function (p) { lay.pts.push(p); });
    // 辺セグメント（頂点iに接する辺 e(i-1), e(i)）
    var segEdges = [];
    for (var e = 0; e < n; e++) { var s = { id: 'e' + e, p1: worldPts[e], p2: worldPts[(e + 1) % n] }; lay.segs.push(s); segEdges.push(s); }
    var specs = [];
    for (var i = 0; i < n; i++) {
      var isUnknown = (i === unknownIdx);
      // 未知でも既知ラベルでもない頂点（例: 二等辺の右底角）は弧・ラベルを付けない
      if (!isUnknown && knownLabels[i] === undefined) continue;
      var V = worldPts[i], P = worldPts[(i + 1) % n], Q = worldPts[(i + n - 1) % n];
      var arcR = isUnknown ? UNKNOWN_R : KNOWN_R, col = isUnknown ? C_TARGET : C_KNOWN;
      var va = vertexArc(V, P, Q, cen, arcR, col, isUnknown ? 2 : 1.6);
      lay.parts.push(va.el);
      lay.pts.push([V[0] + va.bisIn[0] * arcR, V[1] + va.bisIn[1] * arcR]);
      // 既知・未知とも内側（二等分方向）に配置。未知はより大きい弧の外側(頂点から遠い側)に
      // 置くため専用の候補列 UN_IN（r∈[44,68]）を使う。angle_sum の外側慣行は三角形頂点には持ち込まない。
      var dir = va.bisIn;
      var txt = isUnknown ? unknownText : knownLabels[i];
      // 自要素=接する2辺
      var own = 'e' + i;
      specs.push({ anchor: V, dir: dir, text: txt, cands: isUnknown ? UN_IN : KN_IN, color: col, _edges: ['e' + i, 'e' + ((i + n - 1) % n)] });
    }
    // finishLabels だが own を2辺対応にするため個別実装
    specs.forEach(function (sp) {
      var others = lay.labels.map(function (l) { return l.box; });
      var ownSegs = lay.segs.filter(function (s) { return sp._edges.indexOf(s.id) >= 0; });
      var otherSegs = lay.segs.filter(function (s) { return sp._edges.indexOf(s.id) < 0; });
      var pl = placeLbl(sp.anchor, [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands);
      lay.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      lay.labels.push({ box: pl.box, own: sp._edges, text: sp.text });
      lay.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
    return lay;
  }
  // 角度系スキャン（own が辺配列）
  function scanPolyAngle(lay) {
    var L = lay.labels, minText = 1e9, minSeg = 1e9, semBad = 0;
    for (var i = 0; i < L.length; i++) {
      for (var j = i + 1; j < L.length; j++) minText = Math.min(minText, rectRect(L[i].box, L[j].box));
      var own = L[i].own, nOwn = 1e9, nOther = 1e9;
      lay.segs.forEach(function (s) {
        var dd = boxSeg(L[i].box, s.p1, s.p2);
        if (own.indexOf(s.id) >= 0) nOwn = Math.min(nOwn, dd);
        else { nOther = Math.min(nOther, dd); minSeg = Math.min(minSeg, dd); }
      });
      if (nOwn > nOther + 0.01) semBad++;
    }
    return { minText: minText === 1e9 ? 999 : minText, minSeg: minSeg === 1e9 ? 999 : minSeg, semBad: semBad };
  }

  // ---- 各kind: layout ----
  function triAngleLayout(fp) {
    var g = triAngleGeom(Number(fp.a1), Number(fp.a2));
    var B = worldFlip(g.B), C = worldFlip(g.C), A = worldFlip(g.A);
    // 多角形順 B→C→A。未知角(頂点A)も内側・二等分方向（UN_IN）
    return polyAngleLayout([B, C, A], { 0: fp.a1 + '°', 1: fp.a2 + '°' }, 2, fp.label || 'あ');
  }
  function triAngleIsoLayout(fp) {
    var t = Number(fp.apex), g = triAngleIsoGeom(t);
    var BL = worldFlip(g.BL), BR = worldFlip(g.BR), T = worldFlip(g.T);
    var lay = polyAngleLayout([BL, BR, T], { 2: t + '°' }, 0, fp.label || 'あ');
    // 等辺2辺(T-BL, T-BR)の中点に等長ティック(8px・辺に垂直)
    [[T, BL], [T, BR]].forEach(function (seg) {
      var mid = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
      var dx = seg[1][0] - seg[0][0], dy = seg[1][1] - seg[0][1], L = Math.hypot(dx, dy) || 1;
      var nx = -dy / L, ny = dx / L;
      lay.parts.push(lineEl([mid[0] - nx * 4, mid[1] - ny * 4], [mid[0] + nx * 4, mid[1] + ny * 4], C_STROKE, 1.6));
    });
    return lay;
  }
  function quadAngleLayout(fp) {
    var g = quadAngleGeom(Number(fp.a1), Number(fp.a2), Number(fp.a3));
    var A = worldFlip(g.A), B = worldFlip(g.B), C = worldFlip(g.C), D = worldFlip(g.D);
    return polyAngleLayout([A, B, C, D], { 0: fp.a1 + '°', 1: fp.a2 + '°', 3: fp.a3 + '°' }, 2, fp.label || 'あ');
  }
  // 面積系（底辺+高さ点線）共通
  function areaLayout(worldPoly, baseMid, baseVal, heightApexW, heightFootW, heightVal, extraLabels) {
    var lay = newLayout();
    lay.parts.push(polygonEl(worldPoly));
    worldPoly.forEach(function (p) { lay.pts.push(p); });
    for (var e = 0; e < worldPoly.length; e++) lay.segs.push({ id: 'e' + e, p1: worldPoly[e], p2: worldPoly[(e + 1) % worldPoly.length] });
    var specs = [];
    var hc = heightComponent(heightApexW, heightFootW, heightVal, lay);
    specs.push({ anchor: hc.anchor, dirs: hc.dirs, text: hc.text, cands: hc.cands, color: C_TARGET, own: hc.own, ownMin: hc.ownMin });
    specs.push({ anchor: baseMid, dir: [0, 1], text: baseVal, cands: [[22, 15], [28, 15], [22, 13], [30, 13], [22, 11]], color: '#333', own: 'e0' });
    (extraLabels || []).forEach(function (x) { specs.push(x); });
    finishLabels(lay, specs);
    return lay;
  }
  function paraAreaLayout(fp) {
    var g = paraAreaGeom(Number(fp.base), Number(fp.height), Number(fp.slant)), u = fp.unit || 'cm';
    var A = worldFlip(g.A), B = worldFlip(g.B), C = worldFlip(g.C), D = worldFlip(g.D), foot = worldFlip(g.foot);
    return areaLayout([A, B, C, D], [(A[0] + B[0]) / 2, A[1]], fp.base + u, D, foot, fp.height + u, []);
  }
  function triAreaLayout(fp) {
    var g = triAreaGeom(Number(fp.base), Number(fp.height), Number(fp.apex_ratio)), u = fp.unit || 'cm';
    var P1 = worldFlip(g.P1), P2 = worldFlip(g.P2), ap = worldFlip(g.apex), foot = worldFlip(g.foot);
    return areaLayout([P1, P2, ap], [(P1[0] + P2[0]) / 2, P1[1]], fp.base + u, ap, foot, fp.height + u, []);
  }
  function trapAreaLayout(fp) {
    var g = trapAreaGeom(Number(fp.top), Number(fp.bottom), Number(fp.height), Number(fp.offset_ratio)), u = fp.unit || 'cm';
    var P1 = worldFlip(g.P1), P2 = worldFlip(g.P2), P3 = worldFlip(g.P3), P4 = worldFlip(g.P4), ht = worldFlip(g.h_top), hf = worldFlip(g.h_foot);
    var topLbl = { anchor: [(P3[0] + P4[0]) / 2, P3[1]], dir: [0, -1], text: fp.top + u, cands: [[20, 15], [26, 15], [20, 13], [28, 13], [20, 11]], color: '#333', own: 'e2' };
    return areaLayout([P1, P2, P3, P4], [(P1[0] + P2[0]) / 2, P1[1]], fp.bottom + u, ht, hf, fp.height + u, [topLbl]);
  }
  function rhombusAreaLayout(fp) {
    var g = rhombusAreaGeom(Number(fp.diag_h), Number(fp.diag_v)), u = fp.unit || 'cm';
    var Lp = worldFlip(g.Lp), Rp = worldFlip(g.Rp), Tp = worldFlip(g.Tp), Bp = worldFlip(g.Bp);
    var lay = newLayout();
    lay.parts.push(polygonEl([Lp, Tp, Rp, Bp]));   // 菱形(辺は実線)
    lay.pts.push(Lp, Tp, Rp, Bp);
    lay.parts.push(lineEl(Lp, Rp, C_TARGET, 1.4, '5,4'));   // 横対角線(点線)
    lay.parts.push(lineEl(Tp, Bp, C_TARGET, 1.4, '5,4'));   // たて対角線(点線)
    lay.segs.push({ id: 'dh', p1: Lp, p2: Rp }, { id: 'dv', p1: Tp, p2: Bp });
    // 横対角線値: 横点線の下側・右寄り（自要素=横対角線が最近傍になるようx方向へずらす）／
    // たて対角線値: たて点線の右側・上半分。
    finishLabels(lay, [
      { anchor: [Rp[0] * 0.5, 0], dir: [0, 1], text: fp.diag_h + u, cands: [[12, 15], [15, 15], [12, 13], [18, 13], [12, 11], [16, 11]], color: '#333', own: 'dh' },
      // たて対角線ラベル: たて点線からの水平クリアランス≥12px(ownMin)。先頭数字が縦線と平行に紛れるのを防ぐ。
      { anchor: [0, Tp[1] * 0.5], dir: [1, 0], text: fp.diag_v + u, cands: [[26, 13], [30, 13], [26, 12], [32, 12], [26, 11], [32, 11], [26, 10], [34, 10]], color: '#333', own: 'dv', ownMin: 12 }
    ]);
    return lay;
  }
  function circleLayout(fp) {
    var g = circleGeom(fp.given), u = fp.unit || 'cm', r = g.r_px, lay = newLayout();
    lay.parts.push('<circle cx="0" cy="0" r="' + r + '" fill="' + C_FILL + '" stroke="' + C_STROKE + '" stroke-width="2"/>');
    lay.parts.push('<circle cx="0" cy="0" r="2.4" fill="' + C_STROKE + '"/>');
    var p1 = worldFlip(g.line[0]), p2 = worldFlip(g.line[1]);
    lay.parts.push(lineEl(p1, p2, C_STROKE, 1.6));
    lay.segs.push({ id: 'line', p1: p1, p2: p2 });
    lay.pts.push([-r, -r], [r, r]);   // 円の外接
    var mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    finishLabels(lay, [{ anchor: mid, dir: [0, -1], text: fp.value + u, cands: [[14, 15], [18, 15], [14, 13], [20, 13], [14, 11]], color: '#333', own: 'line' }]);
    return lay;
  }
  function cuboidLayout(fp) {
    var g = cuboidGeom(Number(fp.w), Number(fp.d), Number(fp.h)), u = fp.unit || 'cm', lay = newLayout();
    var F = g.F.map(worldFlip), off = [g.off[0], -g.off[1]];   // worldでの奥行オフセット
    var Bk = F.map(function (p) { return [p[0] + off[0], p[1] + off[1]]; });
    lay.parts.push(polygonEl([F[1], Bk[1], Bk[2], F[2]], '#dce8fb'));   // 右面
    lay.parts.push(polygonEl([F[3], F[2], Bk[2], Bk[3]], '#e6effd'));   // 上面
    lay.parts.push(polygonEl(F, C_FILL));                               // 前面
    [[Bk[0], Bk[1]], [Bk[0], Bk[3]], [Bk[0], F[0]]].forEach(function (s) { lay.parts.push(lineEl(s[0], s[1], C_STROKE, 1.4, '4,4')); }); // 隠れ3辺
    F.concat(Bk).forEach(function (p) { lay.pts.push(p); });
    lay.segs.push({ id: 'wedge', p1: F[0], p2: F[1] }, { id: 'hedge', p1: F[0], p2: F[3] }, { id: 'dedge', p1: F[1], p2: Bk[1] });
    var specs = [];
    // w: 前面下辺の下
    specs.push({ anchor: [(F[0][0] + F[1][0]) / 2, F[0][1]], dir: [0, 1], text: fp.w + u, cands: [[20, 15], [26, 15], [20, 13], [28, 13], [20, 11]], color: '#333', own: 'wedge' });
    if (!fp.cube) {
      // h: 前面左辺の左
      specs.push({ anchor: [(F[0][0] + F[3][0]) / 2, (F[0][1] + F[3][1]) / 2], dir: [-1, 0], text: fp.h + u, cands: [[20, 15], [26, 15], [20, 13], [28, 13], [20, 11]], color: '#333', own: 'hedge' });
      // d: 右下斜辺の右下
      specs.push({ anchor: [(F[1][0] + Bk[1][0]) / 2, (F[1][1] + Bk[1][1]) / 2], dir: [0.7, 0.7], text: fp.d + u, cands: [[20, 15], [26, 15], [20, 13], [28, 13], [20, 11]], color: '#333', own: 'dedge' });
    }
    finishLabels(lay, specs);
    return lay;
  }

  var C_LAYOUTS = {
    tri_angle: triAngleLayout, tri_angle_iso: triAngleIsoLayout, quad_angle: quadAngleLayout,
    para_area: paraAreaLayout, tri_area: triAreaLayout, trap_area: trapAreaLayout,
    rhombus_area: rhombusAreaLayout, circle: circleLayout, cuboid: cuboidLayout
  };
  var C_ANGLE = { tri_angle: 1, tri_angle_iso: 1, quad_angle: 1 };
  function makeCBuilder(kind) { return function (fp) { return layoutToSvg(C_LAYOUTS[kind](fp)); }; }
  function makeCClearance(kind) {
    return function (fp) { var lay = C_LAYOUTS[kind](fp); return (C_ANGLE[kind] ? scanPolyAngle : scanLayout)(lay); };
  }

  var BUILDERS = { rect_area: rectArea, angle_sum: angleSum, table: drawTable };
  Object.keys(C_LAYOUTS).forEach(function (k) { BUILDERS[k] = makeCBuilder(k); });

  function svg(w, h, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Math.ceil(w) + ' ' + Math.ceil(h) +
      '" width="' + Math.ceil(w) + '" height="' + Math.ceil(h) + '" role="img">' + inner + '</svg>';
  }

  // figure_params → SVG文字列。未知 kind / 未対応 fig_version は空文字（描画スキップ・非破壊）。
  function build(fp) {
    if (!fp || typeof fp !== 'object') return '';
    if (fp.fig_version !== undefined && fp.fig_version !== 1) return '';
    var b = BUILDERS[fp.kind];
    return b ? b(fp) : '';
  }

  var FigureBuilder = { build: build, BUILDERS: BUILDERS, _angleSumMinClearance: angleSumMinClearance, _tableMinClearance: tableMinClearance };
  // C層kindの機械検査関数を _<kind>MinClearance 形式で公開（受け入れテスト用・table と同形式）
  Object.keys(C_LAYOUTS).forEach(function (k) {
    FigureBuilder['_' + k.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }) + 'MinClearance'] = makeCClearance(k);
  });
  // 幾何関数も検収（geometry_test_vectors.json 照合）用に公開
  FigureBuilder._geom = { tri_angle: triAngleGeom, tri_angle_iso: triAngleIsoGeom, quad_angle: quadAngleGeom, para_area: paraAreaGeom, tri_area: triAreaGeom, trap_area: trapAreaGeom, rhombus_area: rhombusAreaGeom, circle: circleGeom, cuboid: cuboidGeom };
  if (typeof module !== 'undefined' && module.exports) module.exports = FigureBuilder;
  else root.FigureBuilder = FigureBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
