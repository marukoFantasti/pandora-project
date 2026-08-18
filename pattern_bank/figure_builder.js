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
  // 列書式(B層c09): col_formats[c] が "dec2fix" の値セルをスケール100整数→固定2桁(末尾ゼロ保持)。
  // 未指定 or "raw"(または非整数値)は String(v) で既存挙動バイト不変。generate_poc_v10 fmt_dec2fix と同一。
  function tblDec2fix(b) { b = Math.trunc(b); return Math.trunc(b / 100) + '.' + String(b % 100).padStart(2, '0'); }
  function tblFmtCell(colFormats, c, raw) {
    if (Array.isArray(colFormats) && colFormats[c] === 'dec2fix' && /^-?\d+$/.test(String(raw))) return tblDec2fix(parseInt(raw, 10));
    return String(raw);
  }
  function tableLayout(fp) {
    var colHeader = fp.col_header || [], rows = fp.rows || [];
    var nCol = 1 + colHeader.length, nRow = 1 + rows.length;
    var cell = [];
    for (var r = 0; r < nRow; r++) {
      cell[r] = [];
      for (var c = 0; c < nCol; c++) {
        if (r === 0 && c === 0) cell[r][c] = fp.corner_label !== undefined ? String(fp.corner_label) : '';   // corner_label(B層c09・不在=空セル=既存バイト不変)
        else if (r === 0) cell[r][c] = String(colHeader[c - 1]);
        else if (c === 0) cell[r][c] = String(rows[r - 1].label);
        else { var vals = rows[r - 1].values || []; cell[r][c] = tblFmtCell(fp.col_formats, c, vals[c - 1] !== undefined ? vals[c - 1] : ''); }
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
    // highlight(v0.9追加): [[row,col],...] のセルに強調背景。未指定=無挙動（既存出力バイト不変）。
    (Array.isArray(fp.highlight) ? fp.highlight : []).forEach(function (rc) {
      L.cells.forEach(function (cl) {
        if (cl.r === rc[0] && cl.c === rc[1]) parts.push('<rect x="' + cl.x + '" y="' + cl.y + '" width="' + cl.w + '" height="' + cl.h + '" fill="#fff2b8"/>');
      });
    });
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
  // circle fig_version 2: sector(full/half/quarter)+radius_label。v1(未指定/1)は下の既存 circleLayout。
  var CIRCLE_R = 90, CV2_ARC = { full: [0, 360], half: [0, 180], quarter: [0, 90] }, CV2_RANG = { full: 30, half: 90, quarter: 45 };
  function circleV2Geom(sector) {
    var r = CIRCLE_R, sp = CV2_ARC[sector] || CV2_ARC.full, cuts = [];
    if (sector === 'half') cuts = [[[r, 0], [-r, 0]]];
    else if (sector === 'quarter') cuts = [[[0, 0], [r, 0]], [[0, 0], [0, r]]];
    var ra = d2r(CV2_RANG[sector] || 30);
    return { c: [0, 0], r_px: r, arc: sp, cuts: cuts, corner: sector === 'quarter', rlabel_end: [r * Math.cos(ra), r * Math.sin(ra)] };
  }
  function circleV2Layout(fp) {
    var sector = fp.sector || 'full', g = circleV2Geom(sector), r = g.r_px, u = fp.unit || 'cm', sp = g.arc, lay = newLayout();
    if (sector === 'full') {
      lay.parts.push('<circle cx="0" cy="0" r="' + r + '" fill="' + C_FILL + '" stroke="' + C_STROKE + '" stroke-width="2"/>');
    } else {
      var pts = [];
      if (sector === 'quarter') pts.push([0, 0]);      // 四分円は中心を含む扇形
      var steps = Math.max(12, Math.round((sp[1] - sp[0]) / 5));
      for (var i = 0; i <= steps; i++) { var a = d2r(sp[0] + (sp[1] - sp[0]) * i / steps); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      lay.parts.push(polygonEl(pts.map(worldFlip), C_FILL));   // 弧+切り口(閉包の実線)を一体で塗り
    }
    lay.parts.push('<circle cx="0" cy="0" r="2.4" fill="' + C_STROKE + '"/>');
    if (sector === 'quarter') {   // 中心の直角記号（+x と world上方向の間）
      var m = 11;
      lay.parts.push('<path d="M ' + m + ' 0 L ' + m + ' ' + (-m) + ' L 0 ' + (-m) + '" fill="none" stroke="' + C_TARGET + '" stroke-width="1.4"/>');
    }
    if (fp.radius_label) {   // 半径線+長さラベル（外向き法線側に配置）
      var re = worldFlip(g.rlabel_end);
      lay.parts.push(lineEl([0, 0], re, C_STROKE, 1.6));
      lay.segs.push({ id: 'rline', p1: [0, 0], p2: re });
      var mid = [re[0] / 2, re[1] / 2], nx = -re[1], ny = re[0], L = Math.hypot(nx, ny) || 1;
      finishLabels(lay, [{ anchor: mid, dirs: [[nx / L, ny / L], [-nx / L, -ny / L]], text: fp.value + u,
        cands: [[12, 15], [16, 15], [12, 13], [18, 13], [12, 11]], color: '#333', own: 'rline' }]);
    }
    lay.pts.push([-r - 2, -r - 2], [r + 2, r + 2]);
    return lay;
  }
  // ---- prism（角柱・cuboidの平行投影を流用し底面を差し替え）fig_version 1相当(新kind) ----
  var PRISM_D45 = 0.5;
  function prismGeom(fp) {
    var bk = fp.base_kind || 'rect', h = Number(fp.height), c45 = Math.cos(d2r(45)), s45 = Math.sin(d2r(45));
    if (bk === 'rect') {
      var w = Number(fp.w), d = Number(fp.d), sc = Math.min(180 / w, 150 / h, 110 / d, 20);
      var W = w * sc, H = h * sc, D = d * sc * PRISM_D45, ox = D * c45, oy = D * s45;
      var base = [[0, 0], [W, 0], [W + ox, oy], [ox, oy]];
      return { base_kind: 'rect', base: base, top: base.map(function (p) { return [p[0], p[1] + H]; }), off: [ox, oy], H: H, scale: sc };
    }
    var b = Number(fp.base), th = Number(fp.base_height), pH = h;   // base_height=底面三角形の高さ、height=角柱の高さ
    var sc2 = Math.min(180 / b, 150 / pH, 110 / Math.max(th, 1), 20);
    var B = b * sc2, TH = th * sc2 * PRISM_D45, H2 = pH * sc2, ox2 = TH * c45, oy2 = TH * s45;
    var base2 = [[0, 0], [B, 0], [B / 2 + ox2, oy2]];   // 底面三角形: 前辺(0,0)-(B,0)+奥に頂点
    return { base_kind: 'tri', base: base2, top: base2.map(function (p) { return [p[0], p[1] + H2]; }), off: [ox2, oy2], H: H2, scale: sc2 };
  }
  function prismLayout(fp) {
    var g = prismGeom(fp), u = fp.unit || 'cm', lay = newLayout();
    var base = g.base.map(worldFlip), top = g.top.map(worldFlip), n = base.length;
    // 面: 上面(塗り)、前面(前辺×高さ)。前辺は base[0]-base[1]。
    lay.parts.push(polygonEl(top, '#dce8fb'));                                   // 上面
    lay.parts.push(polygonEl([base[0], base[1], top[1], top[0]], C_FILL));       // 前面
    if (bk_is_rect(g)) lay.parts.push(polygonEl([base[1], base[2], top[2], top[1]], '#e6effd')); // 右側面(rect)
    // 底面の可視前辺 + 縦辺(前)実線。奥の底辺・奥の縦辺は破線(隠れ線)。
    lay.parts.push(lineEl(base[0], base[1], C_STROKE, 2));                        // 前底辺
    for (var v = 0; v < n; v++) {                                                // 縦辺
      var solid = (v === 0 || v === 1);                                          // 前2縦辺は実線、他は破線
      lay.parts.push(lineEl(base[v], top[v], C_STROKE, solid ? 2 : 1.4, solid ? null : '4,4'));
    }
    for (var e = 1; e < n; e++) {                                                // 底面の残り辺(奥)=破線
      lay.parts.push(lineEl(base[e], base[(e + 1) % n], C_STROKE, 1.4, '4,4'));
    }
    lay.parts.push(lineEl(base[n - 1], base[0], C_STROKE, 1.4, '4,4'));
    base.concat(top).forEach(function (p) { lay.pts.push(p); });
    // セグメント（ラベル束縛用）
    lay.segs.push({ id: 'wedge', p1: base[0], p2: base[1] }, { id: 'hedge', p1: base[0], p2: top[0] }, { id: 'dedge', p1: base[1], p2: base[2] });
    var specs = [];
    // 底面寸法ラベル（cuboid規約準拠）
    if (g.base_kind === 'rect') {
      specs.push({ anchor: [(base[0][0] + base[1][0]) / 2, base[0][1]], dir: [0, 1], text: fp.w + u, cands: dimCands(), color: '#333', own: 'wedge' });
      specs.push({ anchor: [(base[1][0] + base[2][0]) / 2, (base[1][1] + base[2][1]) / 2], dir: [0.7, 0.7], text: fp.d + u, cands: dimCands(), color: '#333', own: 'dedge' });
    } else {
      specs.push({ anchor: [(base[0][0] + base[1][0]) / 2, base[0][1]], dir: [0, 1], text: fp.base + u, cands: dimCands(), color: '#333', own: 'wedge' });
    }
    // 高さラベル: 前面左縦辺の左
    specs.push({ anchor: [(base[0][0] + top[0][0]) / 2, (base[0][1] + top[0][1]) / 2], dir: [-1, 0], text: fp.height + u, cands: dimCands(), color: '#333', own: 'hedge' });
    finishLabels(lay, specs);
    return lay;
  }
  function bk_is_rect(g) { return g.base_kind === 'rect'; }
  function dimCands() { return [[20, 15], [26, 15], [20, 13], [28, 13], [20, 11]]; }

  function circleLayout(fp) {
    if (Number(fp.fig_version) === 2) return circleV2Layout(fp);   // v2へ分岐（v1は以下で完全維持）
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

  // ============================================================
  // C層(第5弾) 5kind: sym_polygon / similar_pair / xy_graph / dot_plot / histogram
  // 幾何は y上向きローカル、fig_geometry_reference.py と ±0.5px 照合。座標規約は各APIに明記。
  // ============================================================
  function rotPt(p, deg) { var a = d2r(deg), c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function regularPoly(n, r) { var v = []; for (var i = 0; i < n; i++) { var a = d2r(90 + 360 * i / n); v.push([r * Math.cos(a), r * Math.sin(a)]); } return v; }

  // ---- 1. sym_polygon: 形状id固定頂点。mode=line(対称軸)/point(点対称中心)。axis表示有無・rotate度 ----
  var SYM_SHAPES = {
    square: { verts: [[-40, -40], [40, -40], [40, 40], [-40, 40]], axes: [[[-56, 0], [56, 0]], [[0, -56], [0, 56]], [[-56, -56], [56, 56]], [[-56, 56], [56, -56]]], point_sym: true },
    rect: { verts: [[-50, -30], [50, -30], [50, 30], [-50, 30]], axes: [[[-64, 0], [64, 0]], [[0, -44], [0, 44]]], point_sym: true },
    parallelogram: { verts: [[-45, -25], [25, -25], [45, 25], [-25, 25]], axes: [], point_sym: true },
    iso_tri: { verts: [[-38, -28], [38, -28], [0, 44]], axes: [[[0, -40], [0, 56]]], point_sym: false },
    equi_tri: { regular: 3, point_sym: false },
    reg_pentagon: { regular: 5, point_sym: false },
    reg_hexagon: { regular: 6, point_sym: true }
  };
  function symPolygonGeom(shape, rotate) {
    rotate = rotate || 0;
    var sh = SYM_SHAPES[shape] || SYM_SHAPES.square, verts, axes;
    if (sh.regular) {
      var n = sh.regular; verts = regularPoly(n, 45); axes = [];
      // 対称軸n本。奇数=各頂点↔対辺中点(360/n間隔)、偶数=頂点対と辺中点対で180/n間隔。
      for (var k = 0; k < n; k++) { var ang = d2r(n % 2 ? (90 + 360 * k / n) : (90 + 180 * k / n)); axes.push([[62 * Math.cos(ang), 62 * Math.sin(ang)], [-62 * Math.cos(ang), -62 * Math.sin(ang)]]); }
    } else { verts = sh.verts; axes = sh.axes; }
    verts = verts.map(function (p) { return rotPt(p, rotate); });
    axes = axes.map(function (seg) { return [rotPt(seg[0], rotate), rotPt(seg[1], rotate)]; });
    return { verts: verts, center: [0, 0], axes: axes, n_axes: axes.length, point_sym: sh.point_sym };
  }
  function symPolygonLayout(fp) {
    var g = symPolygonGeom(fp.shape || 'square', Number(fp.rotate) || 0), lay = newLayout();
    var wp = g.verts.map(worldFlip);
    lay.parts.push(polygonEl(wp, C_FILL));
    wp.forEach(function (p) { lay.pts.push(p); });
    var showAxis = fp.axis !== false, mode = fp.mode || 'line';
    if (showAxis && mode === 'line') {
      g.axes.forEach(function (seg) { var a = worldFlip(seg[0]), b = worldFlip(seg[1]); lay.parts.push(lineEl(a, b, C_TARGET, 1.4, '5,4')); lay.pts.push(a, b); });
    } else if (showAxis && mode === 'point' && g.point_sym) {
      lay.parts.push('<circle cx="0" cy="0" r="3" fill="' + C_TARGET + '"/>');
    }
    return lay;
  }

  // ---- 2. similar_pair: base多角形×ratio を並置。座標は整数格子(10px単位)。対応辺ラベル ----
  var SIM_BASES = {
    right_tri: [[0, 0], [40, 0], [0, 30]],
    tri: [[0, 0], [50, 0], [15, 35]],
    rect: [[0, 0], [40, 0], [40, 30], [0, 30]],
    lshape: [[0, 0], [40, 0], [40, 20], [20, 20], [20, 40], [0, 40]]
  };
  function similarPairGeom(base_shape, ratio) {
    var base = SIM_BASES[base_shape] || SIM_BASES.right_tri, r = ratio;
    var scaled = base.map(function (p) { return [p[0] * r, p[1] * r]; });
    var bw = Math.max.apply(null, base.map(function (p) { return p[0]; }));
    return { base: base, scaled: scaled, base_off: [0, 0], scaled_off: [bw + 40, 0], ratio: r };
  }
  function similarPairLayout(fp) {
    var g = similarPairGeom(fp.base_shape || 'right_tri', Number(fp.ratio) || 2), u = fp.unit || 'cm', lay = newLayout();
    function place(verts, off) { return verts.map(function (p) { return worldFlip([p[0] + off[0], p[1] + off[1]]); }); }
    var b = place(g.base, g.base_off), s = place(g.scaled, g.scaled_off);
    lay.parts.push(polygonEl(b, C_FILL)); lay.parts.push(polygonEl(s, '#eaf3ff'));
    b.concat(s).forEach(function (p) { lay.pts.push(p); });
    // 対応辺（底辺 verts[0]-verts[1]）にラベル
    if (fp.base_label !== undefined) lay.parts.push(textEl((b[0][0] + b[1][0]) / 2, b[0][1] + 14, fp.base_label + u, 13, '#333'));
    if (fp.scaled_label !== undefined) lay.parts.push(textEl((s[0][0] + s[1][0]) / 2, s[0][1] + 14, fp.scaled_label + u, 13, '#333'));
    return lay;
  }

  // ---- 3. xy_graph: mode=prop(y=kx直線)/inv(y=k/x曲線)。格子・軸・読み取り点。反比例は整数格子点強調 ----
  function xyGraphGeom(mode, k, xmax, ymax) {
    var U = Math.min(Math.floor(260 / xmax), Math.floor(260 / ymax), 30);   // 1目盛りpx
    var curve = [], lattice = [];
    if (mode === 'prop') {
      curve = [[0, 0], [xmax, Math.min(k * xmax, ymax)]];
    } else {
      // 反比例 y=k/x を 0.25刻みで平滑サンプル（折れ線=誤概念誘発を避ける）。可視域: y<=ymax の x から xmax。
      var xTop = k / ymax; curve.push([xTop, ymax]);
      var x0 = Math.ceil(xTop * 4) / 4;
      for (var x = x0; x <= xmax + 1e-9; x += 0.25) curve.push([x, k / x]);
      if (Math.abs(curve[curve.length - 1][0] - xmax) > 1e-6) curve.push([xmax, k / xmax]);
      for (var xi = 1; xi <= xmax; xi++) { var yi = k / xi; if (Math.abs(yi - Math.round(yi)) < 1e-9 && yi <= ymax) lattice.push([xi, Math.round(yi)]); }
    }
    // ベクター照合は 端点(ends)+整数格子点(lattice) の代表点で行う（curve全点は描画用）。
    return { unit: U, xaxis: [[0, 0], [xmax, 0]], yaxis: [[0, 0], [0, ymax]], W: xmax * U, H: ymax * U,
      curve: curve, ends: [curve[0], curve[curve.length - 1]], lattice: lattice };
  }
  function xyGraphLayout(fp) {
    if (Number(fp.fig_version) === 2) return xyGraphV2Layout(fp);   // v2へ分岐（v1は以下で完全維持・非破壊）
    var mode = fp.mode || 'prop', k = Number(fp.k), xmax = Number(fp.xmax) || 6, ymax = Number(fp.ymax) || 6;
    var g = xyGraphGeom(mode, k, xmax, ymax), U = g.unit, lay = newLayout();
    // 格子
    for (var gx = 0; gx <= xmax; gx++) { var a = worldFlip([gx * U, 0]), b = worldFlip([gx * U, ymax * U]); lay.parts.push(lineEl(a, b, '#d5deea', 1)); }
    for (var gy = 0; gy <= ymax; gy++) { var c = worldFlip([0, gy * U]), d = worldFlip([xmax * U, gy * U]); lay.parts.push(lineEl(c, d, '#d5deea', 1)); }
    // 軸
    lay.parts.push(lineEl(worldFlip([0, 0]), worldFlip([xmax * U, 0]), C_STROKE, 1.6));
    lay.parts.push(lineEl(worldFlip([0, 0]), worldFlip([0, ymax * U]), C_STROKE, 1.6));
    lay.pts.push(worldFlip([-6, -6]), worldFlip([xmax * U + 6, ymax * U + 6]));
    // 曲線/直線
    var wpts = g.curve.map(function (p) { return worldFlip([p[0] * U, p[1] * U]); });
    lay.parts.push('<polyline points="' + wpts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + C_TARGET + '" stroke-width="2"/>');
    if (mode === 'inv') g.lattice.forEach(function (p) { var w = worldFlip([p[0] * U, p[1] * U]); lay.parts.push('<circle cx="' + w[0].toFixed(1) + '" cy="' + w[1].toFixed(1) + '" r="3" fill="' + C_TARGET + '"/>'); });
    // 読み取り点
    if (fp.mark) { var mw = worldFlip([Number(fp.mark[0]) * U, Number(fp.mark[1]) * U]); lay.parts.push('<circle cx="' + mw[0].toFixed(1) + '" cy="' + mw[1].toFixed(1) + '" r="3.5" fill="#fff" stroke="' + C_TARGET + '" stroke-width="2"/>'); }
    return lay;
  }

  // ============================================================
  // xy_graph fig_version 2(jhs B層 c06-c08): 4象限view・有理数[num,den]要素・決定的px。
  // v1(xyGraphLayout)には一切触れず独立実装(§3非破壊)。共有はマッピング系のみ。
  // 座標はプロット局所px(0..W,0..H・y下向き)。fig_geometry_reference.py と ±0.5px 照合。
  // ============================================================
  var V2_W = 240, V2_H = 240;                 // プロット幅/高px(xmin→xmax / ymin→ymax)
  var V2_ARROW = 6, V2_TICK = 4, V2_HYP_SAMPLES = 64;   // 矢印px・目盛px・双曲線サンプル数/枝
  var V2_PT_DX = 8, V2_PT_DY = 8, V2_FLIP_MARGIN = 1;   // 点ラベルオフセットpx・反転マージン(view単位)
  // label_pos(設計側が幾何を知って方位宣言・レンダラは決定的配置のみ)。斜め方位=8px・直交方位=10px。
  // dx/dy=px(y下向き)、anc=text-anchor(right系=start / left系=end / 縦=middle)。未宣言時は既存(ne+端反転)。
  var V2_LABEL_DIRS = {
    ne: { dx: 8, dy: -8, anc: 'start' }, nw: { dx: -8, dy: -8, anc: 'end' }, se: { dx: 8, dy: 8, anc: 'start' }, sw: { dx: -8, dy: 8, anc: 'end' },
    n: { dx: 0, dy: -10, anc: 'middle' }, s: { dx: 0, dy: 10, anc: 'middle' }, e: { dx: 10, dy: 0, anc: 'start' }, w: { dx: -10, dy: 0, anc: 'end' }
  };
  function v2LabelPos(px, dir) { var D = V2_LABEL_DIRS[dir] || V2_LABEL_DIRS.ne; return [px[0] + D.dx, px[1] + D.dy + 4]; }   // +4=textElと同じベースライン補正
  // 有理数[num,den]→プロット局所px。非等方(x,y独立)・決定的丸め1回(round-half-up=floor(v+0.5))。
  function v2px(v, xn, xd, yn, yd) {
    var px = Math.floor((xn - v.xmin * xd) * V2_W / (xd * (v.xmax - v.xmin)) + 0.5);
    var py = Math.floor((v.ymax * yd - yn) * V2_H / (yd * (v.ymax - v.ymin)) + 0.5);
    return [px, py];
  }
  // 浮動小数点(双曲線サンプル用)。同一マッピング・同一丸め。※Python照合対象外(§4-5は解析点のみ)。
  function v2pxf(v, x, y) {
    return [Math.floor((x - v.xmin) / (v.xmax - v.xmin) * V2_W + 0.5), Math.floor((v.ymax - y) / (v.ymax - v.ymin) * V2_H + 0.5)];
  }
  // 直線 y=(an/ad)x+(bn/bd) を view矩形でクリップ→2端点px(有理数交点経由・(px_x,px_y)昇順)。
  function v2clip(v, an, ad, bn, bd) {
    var cand = [];
    [v.xmin, v.xmax].forEach(function (xe) {
      var yn = an * xe * bd + bn * ad, yd = ad * bd;
      if (yd < 0) { yn = -yn; yd = -yd; }
      if (v.ymin * yd <= yn && yn <= v.ymax * yd) cand.push([xe, 1, yn, yd]);
    });
    if (an !== 0) [v.ymin, v.ymax].forEach(function (ye) {
      var xn = (ye * bd - bn) * ad, xd = bd * an;
      if (xd < 0) { xn = -xn; xd = -xd; }
      if (v.xmin * xd <= xn && xn <= v.xmax * xd) cand.push([xn, xd, ye, 1]);
    });
    var seen = {}, pts = [];
    cand.forEach(function (c) { var p = v2px(v, c[0], c[1], c[2], c[3]), key = p[0] + ',' + p[1]; if (!seen[key]) { seen[key] = 1; pts.push(p); } });
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return pts;
  }
  function v2rat(r) { return Array.isArray(r) ? [Number(r[0]), Number(r[1])] : [Number(r), 1]; }
  function v2ratStr(r) { var a = v2rat(r); return a[1] === 1 ? String(a[0]) : a[0] + '/' + a[1]; }
  function xyGraphV2Layout(fp) {
    var v = fp.view, lay = newLayout();
    if (!v) return lay;
    // 入力契約 assert(目盛過密回避=設計側値域で保証・レンダラは防御)
    if ((v.xmax - v.xmin) / v.tick_x > 16 || (v.ymax - v.ymin) / v.tick_y > 16) throw new Error('xy_graph v2: 目盛過密(契約違反)');
    function Pn(xn, xd, yn, yd) { return v2px(v, xn, xd, yn, yd); }
    function Pr(xr, yr) { var a = v2rat(xr), b = v2rat(yr); return v2px(v, a[0], a[1], b[0], b[1]); }
    var ori = Pn(0, 1, 0, 1);
    // グリッド(tick間隔・薄色)
    if (v.grid) {
      for (var gx = v.xmin; gx <= v.xmax + 1e-9; gx += v.tick_x) lay.parts.push(lineEl(Pn(gx, 1, v.ymin, 1), Pn(gx, 1, v.ymax, 1), '#d5deea', 1));
      for (var gy = v.ymin; gy <= v.ymax + 1e-9; gy += v.tick_y) lay.parts.push(lineEl(Pn(v.xmin, 1, gy, 1), Pn(v.xmax, 1, gy, 1), '#d5deea', 1));
    }
    // 軸(矢印付き) x軸=原点行・y軸=原点列
    var xL = Pn(v.xmin, 1, 0, 1), xR = Pn(v.xmax, 1, 0, 1), yB = Pn(0, 1, v.ymin, 1), yT = Pn(0, 1, v.ymax, 1);
    lay.parts.push(lineEl(xL, xR, C_STROKE, 1.6));
    lay.parts.push(lineEl(yB, yT, C_STROKE, 1.6));
    lay.parts.push('<path d="M' + xR[0].toFixed(1) + ',' + xR[1].toFixed(1) + ' l-' + V2_ARROW + ',-' + (V2_ARROW * 0.6).toFixed(1) + ' v' + (V2_ARROW * 1.2).toFixed(1) + ' z" fill="' + C_STROKE + '"/>');
    lay.parts.push('<path d="M' + yT[0].toFixed(1) + ',' + yT[1].toFixed(1) + ' l-' + (V2_ARROW * 0.6).toFixed(1) + ',' + V2_ARROW + ' h' + (V2_ARROW * 1.2).toFixed(1) + ' z" fill="' + C_STROKE + '"/>');
    // 軸ラベル(任意テキスト・全角括弧単位そのまま)
    var axl = fp.axis_labels || {};
    lay.parts.push(textEl(xR[0] + 20, xR[1] + 3, axl.x || 'x', 12, '#333'));   // 軸端+20px(検収調整: 最終目盛数値との近接回避で+8px外側へ)
    lay.parts.push(textEl(yT[0] + 2, yT[1] - 12, axl.y || 'y', 12, '#333'));
    // 目盛数値(0はO表記に譲る)
    for (var tx = v.xmin; tx <= v.xmax + 1e-9; tx += v.tick_x) { if (tx === 0) continue; var tp = Pn(tx, 1, 0, 1); lay.parts.push(lineEl([tp[0], ori[1] - V2_TICK / 2], [tp[0], ori[1] + V2_TICK / 2], C_STROKE, 1)); lay.parts.push(textEl(tp[0], ori[1] + 12, String(tx), 10, '#555')); }
    for (var ty = v.ymin; ty <= v.ymax + 1e-9; ty += v.tick_y) { if (ty === 0) continue; var tq = Pn(0, 1, ty, 1); lay.parts.push(lineEl([ori[0] - V2_TICK / 2, tq[1]], [ori[0] + V2_TICK / 2, tq[1]], C_STROKE, 1)); lay.parts.push(textEl(ori[0] - 13, tq[1], String(ty), 10, '#555')); }
    lay.parts.push(textEl(ori[0] - 9, ori[1] + 12, 'O', 11, '#555'));
    lay.pts.push([0, 0], [V2_W, V2_H], [xR[0] + 26, xR[1]], [yT[0], yT[1] - 20], [ori[0] - 26, ori[1]]);
    // elements(配列順=描画順)
    (fp.elements || []).forEach(function (el) {
      if (el.type === 'line') {
        var a = v2rat(el.a), b = v2rat(el.b), pts = v2clip(v, a[0], a[1], b[0], b[1]);
        if (pts.length < 2) throw new Error('xy_graph v2: lineクリップ結果<2(契約違反)');
        lay.parts.push(lineEl(pts[0], pts[1], C_TARGET, 2));
        if (el.label) lay.parts.push(textEl((pts[0][0] + pts[1][0]) / 2 + 10, (pts[0][1] + pts[1][1]) / 2 - 4, el.label, 12, C_TARGET));
      } else if (el.type === 'hyperbola') {
        var k = Number(el.k);
        [-1, 1].forEach(function (s) {                       // 2枝(x<0 / x>0)
          if (s < 0 && v.xmin >= 0) return;
          if (s > 0 && v.xmax <= 0) return;
          // 可視x域: |k/x|≦ymax相当(漸近線側を除外) かつ view内・当該符号側
          var xa = s < 0 ? v.xmin : Math.max(v.xmin, Math.abs(k) / v.ymax);
          var xb = s < 0 ? Math.min(v.xmax, -Math.abs(k) / v.ymax) : v.xmax;
          if (!(xb > xa)) return;
          var seg = [];
          for (var i = 0; i < V2_HYP_SAMPLES; i++) {
            var x = xa + (xb - xa) * i / (V2_HYP_SAMPLES - 1), y = k / x;
            if (y < v.ymin - 1e-9 || y > v.ymax + 1e-9) continue;
            seg.push(v2pxf(v, x, y));
          }
          if (seg.length < 2) throw new Error('xy_graph v2: hyperbola サンプル残数<2/枝(契約違反)');
          lay.parts.push('<polyline points="' + seg.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + C_TARGET + '" stroke-width="2"/>');
        });
        if (el.label) { var lp = Pr([v.xmax, 1], [k >= 0 ? v.ymax : v.ymin, 1]); lay.parts.push(textEl(lp[0] - 12, lp[1] + (k >= 0 ? 12 : -6), el.label, 12, C_TARGET)); }
      } else if (el.type === 'segment') {
        var p1 = Pr(el.x1, el.y1), p2 = Pr(el.x2, el.y2);
        lay.parts.push(lineEl(p1, p2, C_TARGET, 2, el.style === 'dashed' ? '5,4' : null));
      } else if (el.type === 'point') {
        var pp = Pr(el.x, el.y);
        var xv = v2rat(el.x), yv = v2rat(el.y);
        var xr = xv[0] / xv[1], yr = yv[0] / yv[1];
        var guides = el.guides || 'none';
        if (guides === 'x' || guides === 'both') lay.parts.push(lineEl(pp, [pp[0], ori[1]], C_TARGET, 1, '4,3'));
        if (guides === 'y' || guides === 'both') lay.parts.push(lineEl(pp, [ori[0], pp[1]], C_TARGET, 1, '4,3'));
        lay.parts.push('<circle cx="' + pp[0].toFixed(1) + '" cy="' + pp[1].toFixed(1) + '" r="3.5" fill="' + C_TARGET + '"/>');
        if (el.label || el.show_coords) {
          var txt = el.show_coords ? ('(' + v2ratStr(el.x) + '，' + v2ratStr(el.y) + ')') : el.label;
          if (el.label_pos) {   // 方位宣言=決定的配置(端反転なし)。設計側が幾何を知って宣言
            var D = V2_LABEL_DIRS[el.label_pos] || V2_LABEL_DIRS.ne, lp = v2LabelPos(pp, el.label_pos);
            lay.parts.push('<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" text-anchor="' + D.anc + '" font-size="12" paint-order="stroke" stroke="#fff" stroke-width="3" fill="#333">' + esc(txt) + '</text>');
            lay.pts.push([lp[0] - (D.anc === 'middle' ? 14 : (D.anc === 'end' ? 26 : 0)), lp[1]], [lp[0] + (D.anc === 'middle' ? 14 : (D.anc === 'start' ? 26 : 0)), lp[1]]);
          } else {   // 既存: ne既定+右端/上端近傍で左下反転(label_pos未宣言時=バイト不変)
            var flip = (xr >= v.xmax - V2_FLIP_MARGIN) || (yr >= v.ymax - V2_FLIP_MARGIN);
            var lx = pp[0] + (flip ? -V2_PT_DX - 10 : V2_PT_DX + 4), ly = pp[1] + (flip ? V2_PT_DY + 8 : -V2_PT_DY);
            lay.parts.push(textEl(lx, ly, txt, 12, '#333'));
            lay.pts.push([lx - 14, ly], [lx + 14, ly]);
          }
        }
      } else if (el.type === 'curve_label') {
        var cp = Pr(el.x, el.y);
        lay.parts.push(textEl(cp[0], cp[1], el.text, 13, C_TARGET));
      }
    });
    return lay;
  }

  // ---- 4. dot_plot: 数直線 min..max、各値の上にドット積み上げ ----
  function dotPlotGeom(values, mn, mx) {
    var U = Math.min(Math.floor(280 / (mx - mn)), 26), axisY = 0, count = {};
    var dots = values.map(function (v) { count[v] = (count[v] || 0) + 1; return [(v - mn) * U, 12 + (count[v] - 1) * 12]; });
    return { unit: U, axis: [[0, 0], [(mx - mn) * U, 0]], ticks: [], dots: dots, min: mn, max: mx };
  }
  function dotPlotLayout(fp) {
    var vals = (fp.values || []).map(Number), mn = Number(fp.min), mx = Number(fp.max), g = dotPlotGeom(vals, mn, mx), U = g.unit, lay = newLayout();
    lay.parts.push(lineEl(worldFlip([0, 0]), worldFlip([(mx - mn) * U, 0]), C_STROKE, 1.6));
    for (var t = mn; t <= mx; t++) { var x = (t - mn) * U, tk = worldFlip([x, 0]); lay.parts.push(lineEl(tk, worldFlip([x, -4]), C_STROKE, 1)); lay.parts.push(textEl(tk[0], tk[1] + 12, String(t), 11, '#333')); }
    g.dots.forEach(function (dp) { var w = worldFlip(dp); lay.parts.push('<circle cx="' + w[0].toFixed(1) + '" cy="' + w[1].toFixed(1) + '" r="4" fill="' + C_TARGET + '"/>'); lay.pts.push(w); });
    lay.pts.push(worldFlip([0, -18]), worldFlip([(mx - mn) * U, 0]));
    return lay;
  }

  // ---- 5. histogram: 階級幅・度数配列。B層tableの度数分布と同一データ ----
  function histogramGeom(class_width, freqs, x0) {
    var maxF = Math.max.apply(null, freqs), barW = Math.min(Math.floor(300 / freqs.length), 44), U = Math.min(Math.floor(150 / Math.max(maxF, 1)), 22);
    var bars = freqs.map(function (f, i) { return { x: i * barW, y: 0, w: barW, h: f * U, f: f }; });
    return { barW: barW, unit: U, bars: bars, axisX: [[0, 0], [freqs.length * barW, 0]], axisY: [[0, 0], [0, maxF * U]], x0: x0, class_width: class_width };
  }
  function histogramLayout(fp) {
    var freqs = (fp.freqs || []).map(Number), g = histogramGeom(Number(fp.class_width), freqs, Number(fp.x0) || 0), lay = newLayout();
    lay.parts.push(lineEl(worldFlip([0, 0]), worldFlip([freqs.length * g.barW, 0]), C_STROKE, 1.6));
    lay.parts.push(lineEl(worldFlip([0, 0]), worldFlip([0, g.bars.reduce(function (m, b) { return Math.max(m, b.h); }, 0)]), C_STROKE, 1.6));
    g.bars.forEach(function (b, i) {
      var tl = worldFlip([b.x, b.h]);   // 左上(world)
      lay.parts.push('<rect x="' + tl[0].toFixed(1) + '" y="' + tl[1].toFixed(1) + '" width="' + b.w + '" height="' + (b.h).toFixed(1) + '" fill="' + C_FILL + '" stroke="' + C_STROKE + '" stroke-width="1.4"/>');
      lay.pts.push(tl, worldFlip([b.x + b.w, 0]));
      lay.parts.push(textEl(b.x + b.w / 2, 12, String(fp.x0 + i * fp.class_width), 10, '#333'));  // 階級下端値
    });
    // 軸タイトル(B層c09・不在=描画なし=既存バイト不変)。x_label=x軸下・中央、y_label=y軸左・縦書き(-90°)
    var maxH = g.bars.reduce(function (m, b) { return Math.max(m, b.h); }, 0), chartW = freqs.length * g.barW;
    if (fp.x_label !== undefined) {
      lay.parts.push(textEl(chartW / 2, 30, String(fp.x_label), 11, '#333'));
      lay.pts.push([chartW / 2 - 32, 30], [chartW / 2 + 32, 30]);
    }
    if (fp.y_label !== undefined) {
      var yx = -18, yy = -maxH / 2;
      lay.parts.push('<text x="' + yx + '" y="' + yy.toFixed(1) + '" text-anchor="middle" font-size="11" paint-order="stroke" stroke="#fff" stroke-width="3" fill="#333" transform="rotate(-90 ' + yx + ' ' + yy.toFixed(1) + ')">' + esc(String(fp.y_label)) + '</text>');
      lay.pts.push([yx - 7, -maxH], [yx + 7, 0]);
    }
    return lay;
  }

  // ============================================================
  // 第2波G-1: angle_figure kind（spec_angle_figure.md v1.0）。実証台=angle_around_point。
  // 一点で交わる2〜3直線の一点周りの角。既知角=緑(r18)/未知角=赤(r34)・未知∠x白丸囲み(g05 v5様式)。
  // figure_params = {kind:'angle_figure', subkind:'angle_around_point',
  //   angles:[{v:<度>, role:'known'|'unknown'|'plain', label:<表示文字>}, …連続・和360], point?:<原点名>}
  // 契約: 角度和=360(整数)。違反は例外(生徒非露出)。全数値はスロット参照(数値直書き禁止)。
  // ============================================================
  var ANGLE_RAY_LEN = 95, ANGLE_KR = 18, ANGLE_UR = 34;
  // 決定的候補列（可動=距離・フォントのみ・仕様§0-2）。[Oからの距離, フォント]
  var ANGLE_KN_CANDS = [[30, 13], [27, 13], [34, 13], [30, 11], [27, 11], [38, 11], [24, 11], [42, 11]];
  var ANGLE_UN_CANDS = [[48, 13], [44, 13], [52, 13], [48, 11], [44, 11], [56, 11], [40, 11], [60, 11]];
  function angleAroundPointGeom(angles) {
    var sum = 0; for (var i = 0; i < angles.length; i++) sum += Number(angles[i].v);
    if (Math.floor(sum + 0.5) !== 360) throw new Error('angle_around_point契約違反: 角度和' + sum + '≠360');
    if (angles.length < 3) throw new Error('angle_around_point契約違反: 角の数<3(2直線=4角/3直線=6角)');
    var O = [0, 0], n = angles.length, dirs = [0], ends = [];
    for (var k = 0; k < n; k++) { if (k > 0) dirs.push(dirs[k - 1] + Number(angles[k - 1].v)); }
    for (var j = 0; j < n; j++) { var a = dirs[j] * DEG; ends.push([ANGLE_RAY_LEN * Math.cos(a), ANGLE_RAY_LEN * Math.sin(a)]); }
    var arcs = [];
    for (var m = 0; m < n; m++) {
      var a0 = dirs[m], a1 = dirs[m] + Number(angles[m].v), role = angles[m].role || 'plain';
      arcs.push({ a0: a0, a1: a1, bis: (a0 + a1) / 2, role: role, r: role === 'unknown' ? ANGLE_UR : ANGLE_KR, label: angles[m].label });
    }
    return { O: O, dirs: dirs, ends: ends, arcs: arcs, RAY_LEN: ANGLE_RAY_LEN };
  }
  // 弧描画の一本化(赤=未知/緑=既知/等角弧G-4も共通)。中心O・半径r(rx=ry=r=真円)の native SVG弧。
  // worldFlip(y反転)でworld-CCW↔SVG-CWが反転するため sweep を反転して指定(仮説どおり)。
  // A rx ry ... で rx=ry=r を厳守(elliptical化=潰れ を構造的に排除)。曲率はangle_figure_vectorsで悉皆関門。
  function arcPtWorld(O, r, degv) { return worldFlip([O[0] + r * Math.cos(degv * DEG), O[1] + r * Math.sin(degv * DEG)]); }
  function arcPath(O, r, a0d, a1d, color, w) {
    var s = arcPtWorld(O, r, a0d), e = arcPtWorld(O, r, a1d), span = a1d - a0d;
    var largeArc = Math.abs(span) > 180 ? 1 : 0, sweep = span > 0 ? 0 : 1;   // world-CCW(span>0)→SVGでCW(sweep0)
    return { el: '<path d="M ' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' ' + sweep + ' ' + e[0].toFixed(2) + ' ' + e[1].toFixed(2) + '" fill="none" stroke="' + color + '" stroke-width="' + w + '"/>',
      r: r, ext: [s, e, arcPtWorld(O, r, (a0d + a1d) / 2)] };   // ext: viewBox拡張用(端点+中点)。>90°で頂側にも及ぶ分は下の cardinal で補う
  }
  // 弧サンプル点(頂点Oからの距離r検査用・幾何ベクター/曲率関門が使う)。SVG座標。
  function arcSamplePoints(O, r, a0d, a1d, n) {
    n = n || 7; var pts = [];
    for (var i = 0; i <= n; i++) pts.push(arcPtWorld(O, r, a0d + (a1d - a0d) * i / n));
    return pts;
  }
  function angleAroundPointLayout(fp) {
    var angles = (fp.angles || []).map(function (a) { return { v: Number(a.v), role: a.role || 'plain', label: a.label }; });
    var g = angleAroundPointGeom(angles), lay = newLayout(), O = worldFlip(g.O), n = g.ends.length;
    // 直線(=各ray。対頂角配置ではrayが対で直線を成す)。交点中心・固定長。
    for (var i = 0; i < n; i++) { var e = worldFlip(g.ends[i]); lay.parts.push(lineEl(O, e, C_STROKE, 2)); lay.segs.push({ id: 'r' + i, p1: O, p2: e }); lay.pts.push(O, e); }
    lay.parts.push('<circle cx="' + O[0].toFixed(2) + '" cy="' + O[1].toFixed(2) + '" r="2.2" fill="' + C_STROKE + '"/>');
    // 弧 + ラベル（known/unknownのみ。plainは幾何のみ）
    var specs = [];
    g.arcs.forEach(function (arc, idx) {
      if (arc.role === 'plain') return;
      var col = arc.role === 'unknown' ? C_TARGET : C_KNOWN, w = arc.role === 'unknown' ? 2 : 1.6;
      var aw = arcPath(g.O, arc.r, arc.a0, arc.a1, col, w); lay.parts.push(aw.el);
      aw.ext.forEach(function (p) { lay.pts.push(p); });
      for (var cd = Math.ceil(arc.a0 / 90) * 90; cd < arc.a1; cd += 90) lay.pts.push(arcPtWorld(g.O, arc.r, cd));   // >90°弧が跨ぐcardinalもviewBoxに含める
      var bisW = [Math.cos(arc.bis * DEG), Math.sin(arc.bis * DEG)], dirSvg = [bisW[0], -bisW[1]];   // world→svg
      specs.push({ role: arc.role, text: arc.label != null ? String(arc.label) : (arc.role === 'unknown' ? '∠x' : Math.floor(arc.a1 - arc.a0 + 0.5) + '°'),
        dir: dirSvg, cands: arc.role === 'unknown' ? ANGLE_UN_CANDS : ANGLE_KN_CANDS, color: col, own: ['r' + idx, 'r' + ((idx + 1) % n)] });
    });
    // ラベル配置（自弧束縛=own2ray・placeLbl・決定的候補列）。未知は白丸囲みを先に敷く。
    specs.forEach(function (sp) {
      var others = lay.labels.map(function (l) { return l.box; });
      var ownSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) >= 0; });
      var otherSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) < 0; });
      var pl = placeLbl(O, [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands);
      if (sp.role === 'unknown') lay.parts.push('<circle cx="' + pl.cx.toFixed(2) + '" cy="' + pl.cy.toFixed(2) + '" r="' + (pl.fs * 0.95).toFixed(1) + '" fill="#fff" stroke="' + C_TARGET + '" stroke-width="1.2"/>');
      lay.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      lay.labels.push({ box: pl.box, own: sp.own, text: sp.text });
      lay.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
    return lay;
  }
  function angleFigureLayout(fp) {
    if (fp.subkind === 'angle_around_point') return angleAroundPointLayout(fp);
    throw new Error('angle_figure: 未対応subkind ' + fp.subkind);
  }

  var C_LAYOUTS = {
    tri_angle: triAngleLayout, tri_angle_iso: triAngleIsoLayout, quad_angle: quadAngleLayout,
    para_area: paraAreaLayout, tri_area: triAreaLayout, trap_area: trapAreaLayout,
    rhombus_area: rhombusAreaLayout, circle: circleLayout, cuboid: cuboidLayout, prism: prismLayout,
    sym_polygon: symPolygonLayout, similar_pair: similarPairLayout, xy_graph: xyGraphLayout, dot_plot: dotPlotLayout, histogram: histogramLayout,
    angle_figure: angleFigureLayout
  };
  var C_ANGLE = { tri_angle: 1, tri_angle_iso: 1, quad_angle: 1, angle_figure: 1 };
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
    // fig_version 1(または未指定)=既存挙動。2=拡張(circle扇形/半径ラベル等)。3以上は未対応で空文字。
    if (fp.fig_version !== undefined && fp.fig_version !== 1 && fp.fig_version !== 2) return '';
    var b = BUILDERS[fp.kind];
    return b ? b(fp) : '';
  }

  var FigureBuilder = { build: build, BUILDERS: BUILDERS, _angleSumMinClearance: angleSumMinClearance, _tableMinClearance: tableMinClearance };
  // C層kindの機械検査関数を _<kind>MinClearance 形式で公開（受け入れテスト用・table と同形式）
  Object.keys(C_LAYOUTS).forEach(function (k) {
    FigureBuilder['_' + k.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }) + 'MinClearance'] = makeCClearance(k);
  });
  // 幾何関数も検収（geometry_test_vectors.json 照合）用に公開
  FigureBuilder._geom = {
    tri_angle: triAngleGeom, tri_angle_iso: triAngleIsoGeom, quad_angle: quadAngleGeom,
    para_area: paraAreaGeom, tri_area: triAreaGeom, trap_area: trapAreaGeom,
    rhombus_area: rhombusAreaGeom, circle: circleGeom, cuboid: cuboidGeom, circle_v2: circleV2Geom,
    angle_around_point: angleAroundPointGeom,   // 第2波G-1: 幾何ベクター用(ray方向・弧中心角・座標)
    arc_sample_points: arcSamplePoints,          // 弧サンプル点(曲率関門用・頂点からr一定検査)
    // ベクター用の位置引数ラッパ（Python prism_geom(base_kind,a,b,h) と同型）
    prism: function (base_kind, a, b, h) {
      return prismGeom(base_kind === 'rect' ? { base_kind: 'rect', w: a, d: b, height: h }
        : { base_kind: 'tri', base: a, base_height: b, height: h });
    },
    sym_polygon: function (shape) { return symPolygonGeom(shape, 0); },
    similar_pair: similarPairGeom,
    xy_graph: xyGraphGeom, dot_plot: function (mn, mx, vals) { return dotPlotGeom(vals, mn, mx); },
    histogram: function (cw, x0, freqs) { return histogramGeom(cw, freqs, x0); },
    // xy_graph fig_version 2(fig_geometry_reference.py と ±0.5px 照合)。位置引数=Python同型。
    xy_graph_v2_px: function (xmin, xmax, ymin, ymax, xnum, xden, ynum, yden) {
      return v2px({ xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax }, xnum, xden, ynum, yden);
    },
    xy_graph_v2_clip: function (xmin, xmax, ymin, ymax, an, ad, bn, bd) {
      return { ends: v2clip({ xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax }, an, ad, bn, bd) };
    },
    // point label_pos の配置px(方位宣言時の決定的配置。fig_geometry_reference.py と ±0.5px照合)
    xy_graph_v2_labelpos: function (xmin, xmax, ymin, ymax, xnum, xden, ynum, yden, dir) {
      return v2LabelPos(v2px({ xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax }, xnum, xden, ynum, yden), dir);
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FigureBuilder;
  else root.FigureBuilder = FigureBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
