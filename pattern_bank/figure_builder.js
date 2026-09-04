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
    // P-3a: 直径/半径の線+長さラベル(mode切替)。全数値スロット参照({value})・真円(<circle>維持)。
    // 直径=中心を通る水平弦[-r,0]→[r,0]・半径=中心→円周[0,0]→[r,0]。ラベルは線の下側(中心点/円周からの間隔検査対象)。
    if (fp.mode === 'diameter' || fp.mode === 'radius') {
      var isD = fp.mode === 'diameter';
      var lp1 = worldFlip(isD ? [-r, 0] : [0, 0]), lp2 = worldFlip([r, 0]);
      lay.parts.push(lineEl(lp1, lp2, C_STROKE, 1.8));
      lay.segs.push({ id: 'dline', p1: lp1, p2: lp2 });
      var lmid = worldFlip(isD ? [0, 0] : [r / 2, 0]);
      finishLabels(lay, [{ anchor: lmid, dirs: [[0, 1], [0, -1]], text: fp.value + u,
        cands: [[13, 15], [16, 15], [13, 13], [19, 13], [13, 11], [22, 11]], color: '#333', own: 'dline' }]);
    }
    lay.pts.push([-r - 2, -r - 2], [r + 2, r + 2]);
    return lay;
  }
  // ==== P-3a: composite_circle(複合円・求積の受け皿)。外形×内側円×塗りmode(差/環)。 ====
  // shade=求積対象(網掛け#cfe0fb)・cut=白抜き。真円は<circle>/<path A r r>(corr-0019)。寸法整合を契約検査。
  var CC_R = 84, CC_SHADE = '#cfe0fb';
  function ccArcPathFilled(R, topHalf) {   // 半円塗り(直径=x軸・世界y上)。真円弧<path A R R>で閉包。
    var L = worldFlip([-R, 0]), Rt = worldFlip([R, 0]), sweep = topHalf ? 1 : 0;
    return '<path d="M ' + L[0].toFixed(2) + ' ' + L[1].toFixed(2) + ' A ' + R + ' ' + R + ' 0 0 ' + sweep + ' ' + Rt[0].toFixed(2) + ' ' + Rt[1].toFixed(2) + ' Z"';
  }
  function compositeCircleGeom(fp) {
    var shape = fp.shape;
    if (shape === 'square_minus_circle') {
      var s = Number(fp.s); if (!(s > 0)) throw new Error('composite_circle契約違反: s>0');
      return { shape: shape, s: s, half: 80, rpx: 80 };   // 正方形辺160px・内接円r=80(辺=直径整合)
    }
    var R = Number(fp.R), r = Number(fp.r);
    if (!(R > 0 && r > 0)) throw new Error('composite_circle契約違反: R,r>0');
    if (shape === 'circle_minus_circle' || shape === 'half_pair') {
      if (!(R > r)) throw new Error('composite_circle契約違反: R>r(環/半環の正面積)');
    } else if (shape === 'circle_in_circle_side') {
      if (!(2 * r <= R)) throw new Error('composite_circle契約違反: 2r<=R(横並び内接)');
    } else throw new Error('composite_circle: 未対応shape ' + shape);
    var Rpx = CC_R, rpx = Math.max(24, Math.min(CC_R - 8, CC_R * r / R));
    return { shape: shape, R: R, r: r, Rpx: Rpx, rpx: rpx };
  }
  function compositeCircleLayout(fp) {
    var g = compositeCircleGeom(fp), u = fp.unit || 'cm', lay = newLayout(), c = worldFlip([0, 0]);
    function circ(cx, cy, rr, fill) { var p = worldFlip([cx, cy]); lay.parts.push('<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="' + rr.toFixed(2) + '" fill="' + fill + '" stroke="' + C_STROKE + '" stroke-width="2"/>'); }
    var specs = [];
    if (g.shape === 'square_minus_circle') {
      var h = g.half;
      lay.parts.push(polygonEl([[-h, -h], [h, -h], [h, h], [-h, h]].map(worldFlip), CC_SHADE, 2));   // 正方形=網掛け
      circ(0, 0, g.rpx, '#ffffff');                                                                  // 内接円=白抜き
      lay.pts.push(worldFlip([-h, -h]), worldFlip([h, h]));
      lay.segs.push({ id: 'sedge', p1: worldFlip([-h, -h]), p2: worldFlip([h, -h]) });
      specs.push({ anchor: worldFlip([0, -h]), dir: [0, 1], text: fp.s + u, cands: [[13, 15], [16, 13], [20, 13], [24, 12]], color: '#333', own: 'sedge' });
    } else if (g.shape === 'circle_minus_circle') {
      circ(0, 0, g.Rpx, CC_SHADE); circ(0, 0, g.rpx, '#ffffff');                                     // 同心ドーナツ(環=網掛け)
      lay.pts.push(worldFlip([-g.Rpx, 0]), worldFlip([g.Rpx, 0]), worldFlip([0, g.Rpx]), worldFlip([0, -g.Rpx]));
      // 外半径R(右)・内半径r(左)の半径線+ラベル
      lay.parts.push(lineEl(c, worldFlip([g.Rpx, 0]), C_STROKE, 1.4)); lay.segs.push({ id: 'Rline', p1: c, p2: worldFlip([g.Rpx, 0]) });
      lay.parts.push(lineEl(c, worldFlip([-g.rpx, 0]), C_STROKE, 1.4)); lay.segs.push({ id: 'rline', p1: c, p2: worldFlip([-g.rpx, 0]) });
      specs.push({ anchor: worldFlip([g.Rpx / 2, 0]), dir: [0, 1], text: fp.R + u, cands: [[12, 14], [15, 13], [19, 12]], color: '#333', own: 'Rline' });
      specs.push({ anchor: worldFlip([-g.rpx / 2, 0]), dir: [0, -1], text: fp.r + u, cands: [[12, 14], [15, 13], [19, 12]], color: '#333', own: 'rline' });
    } else if (g.shape === 'half_pair') {
      lay.parts.push(ccArcPathFilled(g.Rpx, true) + ' fill="' + CC_SHADE + '" stroke="' + C_STROKE + '" stroke-width="2"/>');   // 外半円(網掛け)
      lay.parts.push(ccArcPathFilled(g.rpx, true) + ' fill="#ffffff" stroke="' + C_STROKE + '" stroke-width="2"/>');            // 内半円(白抜き)
      lay.parts.push(lineEl(worldFlip([-g.Rpx, 0]), worldFlip([g.Rpx, 0]), C_STROKE, 2));                                        // 直径(底辺)
      lay.pts.push(worldFlip([-g.Rpx, 0]), worldFlip([g.Rpx, 0]), worldFlip([0, g.Rpx]));
      lay.segs.push({ id: 'Rline', p1: worldFlip([-g.Rpx, 0]), p2: worldFlip([-g.rpx, 0]) }, { id: 'rline', p1: worldFlip([g.rpx, 0]), p2: worldFlip([g.Rpx, 0]) });
      specs.push({ anchor: worldFlip([-(g.Rpx + g.rpx) / 2, 0]), dir: [0, 1], text: fp.R + u, cands: [[13, 13], [17, 12], [21, 12]], color: '#333', own: 'Rline' });
      specs.push({ anchor: worldFlip([g.rpx / 2, 0]), dir: [0, 1], text: fp.r + u, cands: [[13, 13], [17, 12], [21, 12]], color: '#333', own: 'rline' });
    } else if (g.shape === 'circle_in_circle_side') {
      circ(0, 0, g.Rpx, CC_SHADE);                                                                   // 大円(網掛け)
      var off = g.Rpx / 2;
      circ(-off, 0, g.rpx, '#ffffff'); circ(off, 0, g.rpx, '#ffffff');                               // 横並び小円2(白抜き)
      lay.pts.push(worldFlip([-g.Rpx, 0]), worldFlip([g.Rpx, 0]), worldFlip([0, g.Rpx]), worldFlip([0, -g.Rpx]));
      lay.parts.push(lineEl(c, worldFlip([0, g.Rpx]), C_STROKE, 1.4)); lay.segs.push({ id: 'Rline', p1: c, p2: worldFlip([0, g.Rpx]) });
      lay.parts.push(lineEl(worldFlip([-off, 0]), worldFlip([-off + g.rpx, 0]), C_STROKE, 1.4)); lay.segs.push({ id: 'rline', p1: worldFlip([-off, 0]), p2: worldFlip([-off + g.rpx, 0]) });
      specs.push({ anchor: worldFlip([0, g.Rpx / 2]), dir: [1, 0], text: fp.R + u, cands: [[12, 13], [15, 12], [19, 12]], color: '#333', own: 'Rline' });
      specs.push({ anchor: worldFlip([-off + g.rpx / 2, 0]), dir: [0, -1], text: fp.r + u, cands: [[12, 12], [15, 11], [19, 11]], color: '#333', own: 'rline' });
    }
    finishLabels(lay, specs);
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
    // G-4b書式突合(正規化層): vertex_labels(配列/true)=頂点名描画・show_dims:false=寸法ラベル抑制。
    // 既存prismはこれらのフラグ不在=従来どおり寸法表示・頂点名なし=バイト不変。
    var wantVertex = fp.vertex_names || fp.vertex_labels, showDims = fp.show_dims !== false;
    // 底面寸法ラベル（cuboid規約準拠・show_dims:falseで非表示）
    if (showDims && g.base_kind === 'rect') {
      specs.push({ anchor: [(base[0][0] + base[1][0]) / 2, base[0][1]], dir: [0, 1], text: fp.w + u, cands: dimCands(), color: '#333', own: 'wedge' });
      specs.push({ anchor: [(base[1][0] + base[2][0]) / 2, (base[1][1] + base[2][1]) / 2], dir: [0.7, 0.7], text: fp.d + u, cands: dimCands(), color: '#333', own: 'dedge' });
    } else if (showDims) {
      specs.push({ anchor: [(base[0][0] + base[1][0]) / 2, base[0][1]], dir: [0, 1], text: fp.base + u, cands: dimCands(), color: '#333', own: 'wedge' });
    }
    // 高さラベル: 前面左縦辺の左（show_dims:falseで非表示）
    if (showDims) specs.push({ anchor: [(base[0][0] + top[0][0]) / 2, (base[0][1] + top[0][1]) / 2], dir: [-1, 0], text: fp.height + u, cands: dimCands(), color: '#333', own: 'hedge' });
    // G-4b 位置関係(multi_symbol): 頂点名A-H + 基準辺強調(gated=既存prismはフラグ不在でバイト不変)。
    // 直方体ABCD-EFGH: 上面ABCD=top[0..3](FL/FR/BR/BL)・底面EFGH=base[0..3]。pattern_generator の頂点順序規約と一致。
    if ((wantVertex || fp.highlight_edge) && g.base_kind === 'rect') {
      var VN = { A: top[0], B: top[1], C: top[2], D: top[3], E: base[0], F: base[1], G: base[2], H: base[3] };
      if (fp.highlight_edge) {   // 意匠案: 基準辺=赤太線(C_TARGET・幅3.4)で強調
        var he = String(fp.highlight_edge).toUpperCase(), hp1 = VN[he.charAt(0)], hp2 = VN[he.charAt(1)];
        if (hp1 && hp2) { lay.parts.push(lineEl(hp1, hp2, C_TARGET, 3.4)); lay.pts.push(hp1, hp2); }
      }
      if (wantVertex) {
        var KS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], cen8 = [0, 0];
        KS.forEach(function (k) { cen8[0] += VN[k][0] / 8; cen8[1] += VN[k][1] / 8; });
        // 8頂点名は既存prismの寸法ラベルより密。頂点ごとに重心外向きを第一候補とし、8方位へ探索して
        // ラベル間≥10・辺クリア≥4を満たす向きをplaceLblに選ばせる(内側投影の隠れ頂点も空き方位へ逃がす)。
        var COMPASS = [[0, 1], [0.71, 0.71], [1, 0], [0.71, -0.71], [0, -1], [-0.71, -0.71], [-1, 0], [-0.71, 0.71],
          [0.38, 0.92], [0.92, 0.38], [0.92, -0.38], [0.38, -0.92], [-0.38, -0.92], [-0.92, -0.38], [-0.92, 0.38], [-0.38, 0.92]];
        KS.forEach(function (k) {
          var v = VN[k], dx = v[0] - cen8[0], dy = v[1] - cen8[1], L = Math.hypot(dx, dy);
          var out = L > 1 ? [dx / L, dy / L] : [-0.71, -0.71];
          specs.push({ anchor: v, dirs: [out].concat(COMPASS), text: k, cands: [[13, 13], [16, 12], [20, 12], [25, 11], [30, 11], [35, 10], [40, 10]], color: C_STROKE, own: '' });
        });
      }
    }
    finishLabels(lay, specs);
    return lay;
  }
  function bk_is_rect(g) { return g.base_kind === 'rect'; }
  function dimCands() { return [[20, 15], [26, 15], [20, 13], [28, 13], [20, 11]]; }

  // ==== 第2ブロックS-2: 錐円系kind(pyramid/cylinder/cone/sphere) ====
  // 投影楕円: 円の斜投影は「意図された楕円」。minor/major = ELLIPSE_RATIO(斜投影の深さ0.5に整合)固定。
  // corr-0022関門(projection_ellipse_ratio)で全楕円がこの比±0.5%・同一図内で同比を検査(真円関門corr-0019とは対象別)。
  var ELLIPSE_RATIO = 0.5;
  // 楕円の半弧(front=手前=下側world・back=奥=上側world)。native <path A rx ry>(rx≠ry=投影楕円)。
  function ellipseArcEl(cxW, cyW, rx, ry, side, color, w, dash) {
    var L = worldFlip([cxW - rx, cyW]), R = worldFlip([cxW + rx, cyW]);
    var sweep = side === 'front' ? 0 : 1;   // SVG y下向き: front(下側world)→sweep0
    return '<path d="M ' + L[0].toFixed(2) + ' ' + L[1].toFixed(2) + ' A ' + rx.toFixed(2) + ' ' + ry.toFixed(2) + ' 0 0 ' + sweep + ' ' + R[0].toFixed(2) + ' ' + R[1].toFixed(2) + '" fill="none" stroke="' + color + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }
  function ellipseFullEl(cxW, cyW, rx, ry, color, w, fill) {
    var c = worldFlip([cxW, cyW]);
    return '<ellipse cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" rx="' + rx.toFixed(2) + '" ry="' + ry.toFixed(2) + '" fill="' + (fill || 'none') + '" stroke="' + color + '" stroke-width="' + w + '"/>';
  }
  // 凸包(Andrew monotone chain・小点集合用)。隠線のシルエット可視判定に使う。
  function convexHull(pts) {
    var p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (p.length < 3) return p.slice();
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  // pyramid底頂点の可視判定(svg座標): {apex}∪base の凸包に載る底頂点=可視(シルエット上)。
  // 隠れる側稜は凸包内点(最遠=基底+奥行きベクトルの頂点)への1本のみ。前後ペアの一律判定は誤り。
  function pyramidVisible(baseSvg, apexSvg) {
    var hull = convexHull(baseSvg.concat([apexSvg]));
    return baseSvg.map(function (v) { return hull.some(function (h) { return Math.abs(h[0] - v[0]) < 0.01 && Math.abs(h[1] - v[1]) < 0.01; }); });
  }
  // ---- pyramid(角錐・prism小改修: 上面→頂点1点に収束) ----
  function pyramidGeom(fp) {
    var g = prismGeom(fp), base = g.base, n = base.length, cen = [0, 0];
    base.forEach(function (p) { cen[0] += p[0] / n; cen[1] += p[1] / n; });
    return { base_kind: fp.base_kind || 'rect', base: base, cen: cen, apex: [cen[0], cen[1] + g.H], H: g.H, scale: g.scale };
  }
  function pyramidLayout(fp) {
    var g = pyramidGeom(fp), u = fp.unit || 'cm', lay = newLayout();
    var base = g.base.map(worldFlip), apex = worldFlip(g.apex), cen = worldFlip(g.cen), n = base.length;
    // シルエット準拠の隠線判定(convex hull)。両端可視の底辺=実線 / 可視底頂点への側稜=実線、隠れ(凸包内)=破線。
    var vis = pyramidVisible(base, apex);
    for (var e = 0; e < n; e++) { var solid = vis[e] && vis[(e + 1) % n]; lay.parts.push(lineEl(base[e], base[(e + 1) % n], C_STROKE, solid ? 2 : 1.4, solid ? null : '4,4')); }
    for (var v = 0; v < n; v++) lay.parts.push(lineEl(base[v], apex, C_STROKE, vis[v] ? 2 : 1.4, vis[v] ? null : '4,4'));   // 側稜(隠れは最遠1本のみ)
    lay.parts.push(lineEl(apex, cen, C_TARGET, 1.4, '5,4'));                                 // 高さ(頂点→底中心・破線)
    lay.parts.push('<path d="M ' + cen[0].toFixed(2) + ' ' + (cen[1] - 8).toFixed(2) + ' h 8 v 8" fill="none" stroke="' + C_TARGET + '" stroke-width="1.2"/>');
    base.concat([apex, cen]).forEach(function (p) { lay.pts.push(p); });
    lay.segs.push({ id: 'wedge', p1: base[0], p2: base[1] }, { id: 'hedge', p1: apex, p2: cen });
    finishLabels(lay, [
      { anchor: [(base[0][0] + base[1][0]) / 2, base[0][1]], dir: [0, 1], text: (g.base_kind === 'rect' ? fp.w : fp.base) + u, cands: dimCands(), color: '#333', own: 'wedge' },
      { anchor: [(apex[0] + cen[0]) / 2, (apex[1] + cen[1]) / 2], dir: [1, 0], text: fp.height + u, cands: dimCands(), color: '#333', own: 'hedge' }]);
    return lay;
  }
  // ---- cylinder(円柱: 上下楕円+側線2本) ----
  function cylinderGeom(fp) {
    var r = Number(fp.r), h = Number(fp.height), sc = Math.min(78 / r, 150 / h, 16);
    var rx = r * sc; return { r: r, h: h, rx: rx, ry: rx * ELLIPSE_RATIO, H: h * sc, scale: sc };
  }
  function cylinderLayout(fp) {
    var g = cylinderGeom(fp), u = fp.unit || 'cm', lay = newLayout(), rx = g.rx, ry = g.ry;
    lay.parts.push(ellipseFullEl(0, g.H, rx, ry, C_STROKE, 2, C_FILL));                       // 上面(全楕円)
    lay.parts.push(lineEl(worldFlip([-rx, g.H]), worldFlip([-rx, 0]), C_STROKE, 2));          // 左側線
    lay.parts.push(lineEl(worldFlip([rx, g.H]), worldFlip([rx, 0]), C_STROKE, 2));            // 右側線
    lay.parts.push(ellipseArcEl(0, 0, rx, ry, 'front', C_STROKE, 2));                         // 底面前半(実)
    lay.parts.push(ellipseArcEl(0, 0, rx, ry, 'back', C_STROKE, 1.4, '4,4'));                 // 底面後半(破)
    [[-rx, -ry], [rx, ry], [-rx, g.H - ry], [rx, g.H + ry]].forEach(function (p) { lay.pts.push(worldFlip(p)); });
    lay.segs.push({ id: 'redge', p1: worldFlip([0, g.H]), p2: worldFlip([rx, g.H]) }, { id: 'hedge', p1: worldFlip([rx, g.H]), p2: worldFlip([rx, 0]) });
    lay.parts.push(lineEl(worldFlip([0, g.H]), worldFlip([rx, g.H]), C_TARGET, 1.4));         // 半径線(上面)
    finishLabels(lay, [
      { anchor: worldFlip([rx / 2, g.H]), dir: [0, -1], text: fp.r + u, cands: dimCands(), color: '#333', own: 'redge' },
      { anchor: worldFlip([rx, g.H / 2]), dir: [1, 0], text: fp.height + u, cands: dimCands(), color: '#333', own: 'hedge' }]);
    return lay;
  }
  // ---- cone(円錐: 底面楕円+頂点+母線2本) ----
  function coneGeom(fp) {
    var r = Number(fp.r), h = Number(fp.height), sc = Math.min(78 / r, 150 / h, 16);
    var rx = r * sc; return { r: r, h: h, rx: rx, ry: rx * ELLIPSE_RATIO, H: h * sc, scale: sc };
  }
  function coneLayout(fp) {
    var g = coneGeom(fp), u = fp.unit || 'cm', lay = newLayout(), rx = g.rx, ry = g.ry, apex = worldFlip([0, g.H]), cen = worldFlip([0, 0]);
    lay.parts.push(lineEl(apex, worldFlip([-rx, 0]), C_STROKE, 2));                           // 母線左
    lay.parts.push(lineEl(apex, worldFlip([rx, 0]), C_STROKE, 2));                            // 母線右
    lay.parts.push(ellipseArcEl(0, 0, rx, ry, 'front', C_STROKE, 2));
    lay.parts.push(ellipseArcEl(0, 0, rx, ry, 'back', C_STROKE, 1.4, '4,4'));
    lay.parts.push(lineEl(apex, cen, C_TARGET, 1.4, '5,4'));                                  // 高さ(頂点→底中心・破線)
    lay.parts.push('<path d="M ' + cen[0].toFixed(2) + ' ' + (cen[1] - 8).toFixed(2) + ' h 8 v 8" fill="none" stroke="' + C_TARGET + '" stroke-width="1.2"/>');
    [[-rx, -ry], [rx, ry], [0, g.H]].forEach(function (p) { lay.pts.push(worldFlip(p)); });
    lay.segs.push({ id: 'redge', p1: cen, p2: worldFlip([rx, 0]) }, { id: 'hedge', p1: apex, p2: cen });
    lay.parts.push(lineEl(cen, worldFlip([rx, 0]), C_TARGET, 1.4));                           // 半径線(底面前)
    finishLabels(lay, [
      { anchor: worldFlip([rx / 2, 0]), dir: [0, 1], text: fp.r + u, cands: dimCands(), color: '#333', own: 'redge' },
      { anchor: worldFlip([0, g.H / 2]), dir: [-1, 0], text: fp.height + u, cands: dimCands(), color: '#333', own: 'hedge' }]);
    return lay;
  }
  // ---- sphere(球: 真円+赤道楕円。真円=corr-0019 / 楕円=corr-0022 の共存初例) ----
  function sphereGeom(fp) { var r = Number(fp.r), sc = Math.min(84 / r, 18), R = r * sc; return { r: r, R: R, ry: R * ELLIPSE_RATIO, scale: sc }; }
  function sphereLayout(fp) {
    var g = sphereGeom(fp), u = fp.unit || 'cm', lay = newLayout(), R = g.R, c = worldFlip([0, 0]);
    lay.parts.push('<circle cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" r="' + R.toFixed(2) + '" fill="' + C_FILL + '" stroke="' + C_STROKE + '" stroke-width="2"/>');   // 外形=真円
    lay.parts.push(ellipseArcEl(0, 0, R, g.ry, 'front', C_STROKE, 1.6));                      // 赤道前半(実)
    lay.parts.push(ellipseArcEl(0, 0, R, g.ry, 'back', C_STROKE, 1.3, '4,4'));                // 赤道後半(破)
    lay.parts.push('<circle cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" r="2.2" fill="' + C_STROKE + '"/>');
    lay.pts.push(worldFlip([-R, -R]), worldFlip([R, R]));
    lay.segs.push({ id: 'redge', p1: c, p2: worldFlip([R, 0]) });
    lay.parts.push(lineEl(c, worldFlip([R, 0]), C_TARGET, 1.4));                              // 半径線
    finishLabels(lay, [{ anchor: worldFlip([R / 2, 0]), dir: [0, -1], text: fp.r + u, cands: dimCands(), color: '#333', own: 'redge' }]);
    return lay;
  }
  // ---- 第2ブロックS-4: rotation_source(回転体の源=回転前平面図形+回転軸。立体は描かない) ----
  // 軸=縦の一点鎖線(dash-dot・新描画要素)・直線ℓ。図形は軸の右側。回転後の立体は想像が学習内容ゆえ非描画。
  var AXIS_DASH = '7,3,1.5,3';   // 一点鎖線(長dash-gap-dot-gap)
  function rotationSourceGeom(fp) {
    var sk = fp.source_kind || 'rect', r = Number(fp.r);
    if (sk === 'semicircle') { var scS = Math.min(80 / r, 16); return { source_kind: sk, r: r, R: r * scS, scale: scS }; }
    var h = Number(fp.height != null ? fp.height : fp.h), sc = Math.min(90 / r, 150 / h, 16);
    return { source_kind: sk, r: r, h: h, rx: r * sc, H: h * sc, scale: sc };
  }
  function rotationSourceLayout(fp) {
    var g = rotationSourceGeom(fp), u = fp.unit || 'cm', lay = newLayout(), sk = g.source_kind;
    var topY = sk === 'semicircle' ? g.R : g.H, botY = sk === 'semicircle' ? -g.R : 0;
    var aTop = worldFlip([0, topY + 22]), aBot = worldFlip([0, botY - 22]);
    lay.parts.push(lineEl(aTop, aBot, C_STROKE, 1.4, AXIS_DASH));                 // 回転軸(一点鎖線)。参照線ゆえclearance対象外(寸法は軸基準に置く)
    lay.pts.push(aTop, aBot);
    lay.parts.push(textEl(aTop[0] - 9, aTop[1] + 2, 'ℓ', 13, C_STROKE));          // 直線ℓ
    lay.pts.push([aTop[0] - 15, aTop[1]]);
    if (sk === 'rect') {
      var pr = [[0, 0], [g.rx, 0], [g.rx, g.H], [0, g.H]].map(worldFlip);
      lay.parts.push(polygonEl(pr, C_FILL)); pr.forEach(function (p) { lay.pts.push(p); });
      lay.segs.push({ id: 'redge', p1: pr[0], p2: pr[1] }, { id: 'hedge', p1: pr[1], p2: pr[2] });
      finishLabels(lay, [
        { anchor: [(pr[0][0] + pr[1][0]) / 2, pr[0][1]], dir: [0, 1], text: g.r + u, cands: dimCands(), color: '#333', own: 'redge' },
        { anchor: [(pr[1][0] + pr[2][0]) / 2, (pr[1][1] + pr[2][1]) / 2], dir: [1, 0], text: g.h + u, cands: dimCands(), color: '#333', own: 'hedge' }]);
    } else if (sk === 'right_tri') {
      var v = [[0, 0], [g.rx, 0], [0, g.H]].map(worldFlip);                       // 直角 at (0,0)=軸と底辺
      lay.parts.push(polygonEl(v, C_FILL)); v.forEach(function (p) { lay.pts.push(p); });
      var rm = rightAngleMark([0, 0], [1, 0], [0, 1]); lay.parts.push(rm.el); rm.pts.forEach(function (p) { lay.pts.push(p); });
      lay.segs.push({ id: 'redge', p1: v[0], p2: v[1] }, { id: 'hedge', p1: v[0], p2: v[2] });
      finishLabels(lay, [
        { anchor: [(v[0][0] + v[1][0]) / 2, v[0][1]], dir: [0, 1], text: g.r + u, cands: dimCands(), color: '#333', own: 'redge' },
        { anchor: [(v[0][0] + v[2][0]) / 2, (v[0][1] + v[2][1]) / 2], dir: [-1, 0], text: g.h + u, cands: dimCands(), color: '#333', own: 'hedge' }]);
    } else {   // semicircle: 直径が軸に接する半円(半径r・弧は真円=corr-0019)。arcPath(中心[0,0],r=R,90→−90=右半)
      var R = g.R, top = worldFlip([0, R]), bot = worldFlip([0, -R]), cen = worldFlip([0, 0]);
      lay.parts.push(lineEl(top, bot, C_STROKE, 2));                             // 直径(軸上・実線)
      var aw = arcPath([0, 0], R, 90, -90, C_STROKE, 2); lay.parts.push(aw.el); aw.ext.forEach(function (p) { lay.pts.push(p); });
      lay.pts.push(top, bot, worldFlip([R, 0]));
      lay.parts.push(lineEl(cen, worldFlip([R, 0]), C_TARGET, 1.4));             // 半径線
      lay.parts.push('<circle cx="' + cen[0].toFixed(2) + '" cy="' + cen[1].toFixed(2) + '" r="2.2" fill="' + C_STROKE + '"/>');
      lay.segs.push({ id: 'redge', p1: cen, p2: worldFlip([R, 0]) });
      finishLabels(lay, [{ anchor: worldFlip([R / 2, 0]), dir: [0, -1], text: g.r + u, cands: dimCands(), color: '#333', own: 'redge' }]);
    }
    return lay;
  }

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
  // ---- P5-3 Kind B: composite_area(かぎ型/L字/コの字/くりぬき/複合)。追補A cuts一般化 ----
  // cuts 1〜3(角4種 / 辺+offset / hole)。§2.1 cut単数はcuts1個の糖衣。世界座標=左下原点y上向き。
  // 輪郭=外形辺から切欠き接触区間を除いた線分+各切欠きの内側辺(補助線・塗りなし=§2.3(4))。
  var CA_MAXW = 200, CA_MAXH = 160, CA_MARK = 7;
  function compositeAreaGeom(fp) {
    var o = fp.outer || {}, W = Number(o.w), H = Number(o.h);
    if (!(W > 0) || !(H > 0)) throw new Error('composite_area: outer寸法不正(契約違反)');
    var cuts = fp.cuts;
    if (!cuts && fp.cut) cuts = [{ w: fp.cut.w, h: fp.cut.h, at: fp.cut.corner || 'top_right' }];   // §2.1糖衣
    if (!Array.isArray(cuts) || cuts.length < 1 || cuts.length > 3) throw new Error('composite_area: cutsは1〜3(契約違反)');
    var rects = cuts.map(function (c) {
      var w = Number(c.w), h = Number(c.h), at = c.at || 'top_right', off = Number(c.offset) || 0, x, y;
      if (!(w > 0) || !(h > 0)) throw new Error('composite_area: cut寸法不正(契約違反)');
      if (at === 'top_left') { x = 0; y = H - h; }
      else if (at === 'top_right') { x = W - w; y = H - h; }
      else if (at === 'bottom_left') { x = 0; y = 0; }
      else if (at === 'bottom_right') { x = W - w; y = 0; }
      else if (at === 'top') { x = off; y = H - h; }
      else if (at === 'bottom') { x = off; y = 0; }
      else if (at === 'left') { x = 0; y = off; }
      else if (at === 'right') { x = W - w; y = off; }
      else if (at === 'hole') { x = (c.x !== undefined) ? Number(c.x) : (W - w) / 2; y = (c.y !== undefined) ? Number(c.y) : (H - h) / 2; }
      else throw new Error('composite_area: at不正(契約違反)');
      if (x < 0 || y < 0 || x + w > W + 1e-9 || y + h > H + 1e-9) throw new Error('composite_area: cutが外形外(契約違反)');
      if (at === 'hole' && !(x > 0 && y > 0 && x + w < W && y + h < H)) throw new Error('composite_area: holeが外周接触(契約違反)');
      return { x: x, y: y, w: w, h: h, at: at };
    });
    for (var i = 0; i < rects.length; i++) for (var j = i + 1; j < rects.length; j++) {
      var a = rects[i], b = rects[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) throw new Error('composite_area: cuts交差(契約違反)');
    }
    var area = W * H - rects.reduce(function (s, r) { return s + r.w * r.h; }, 0);
    if (!(area > 0)) throw new Error('composite_area: 残面積非正(契約違反)');
    return { W: W, H: H, rects: rects, area: area };
  }
  function caInside(g, x, y) {   // 領域内判定(境界除く近傍テスト用)
    if (x <= 0 || y <= 0 || x >= g.W || y >= g.H) return false;
    for (var i = 0; i < g.rects.length; i++) {
      var r = g.rects[i];
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return false;
    }
    return true;
  }
  function caSubtractIntervals(lo, hi, cuts) {   // 1次元区間[lo,hi]からcuts区間群を除いた区間列
    var segs = [[lo, hi]];
    cuts.forEach(function (c) {
      var out = [];
      segs.forEach(function (s) {
        var a = Math.max(s[0], c[0]), b = Math.min(s[1], c[1]);
        if (a >= b) { out.push(s); return; }
        if (s[0] < a) out.push([s[0], a]);
        if (b < s[1]) out.push([b, s[1]]);
      });
      segs = out;
    });
    return segs.filter(function (s) { return s[1] - s[0] > 1e-9; });
  }
  function compositeAreaLayout(fp) {
    var g = compositeAreaGeom(fp), lay = newLayout();
    var sx = CA_MAXW / g.W, sy = CA_MAXH / g.H;
    var s = Math.min(sx, sy);
    sx = s; sy = s;
    // 最小辺クランプ(§2.3(1): 判読不能回避のため縦横独立に下限拡大可)
    var minW = g.W, minH = g.H;
    g.rects.forEach(function (r) { minW = Math.min(minW, r.w); minH = Math.min(minH, r.h); });
    if (minW * sx < 30) sx = Math.min(30 / minW, CA_MAXW * 1.6 / g.W);
    if (minH * sy < 30) sy = Math.min(30 / minH, CA_MAXH * 1.6 / g.H);
    function pt(x, y) { return [x * sx, (g.H - y) * sy]; }   // 左下原点→svg(y下向き)
    var segsOut = [];   // [p1,p2,id]
    // 外形4辺(切欠き接触区間を除く)
    var edges = [
      { lo: 0, hi: g.W, fix: 0, horiz: true, id: 'bottom', cuts: g.rects.filter(function (r) { return r.y <= 1e-9; }).map(function (r) { return [r.x, r.x + r.w]; }) },
      { lo: 0, hi: g.W, fix: g.H, horiz: true, id: 'top', cuts: g.rects.filter(function (r) { return r.y + r.h >= g.H - 1e-9; }).map(function (r) { return [r.x, r.x + r.w]; }) },
      { lo: 0, hi: g.H, fix: 0, horiz: false, id: 'left', cuts: g.rects.filter(function (r) { return r.x <= 1e-9; }).map(function (r) { return [r.y, r.y + r.h]; }) },
      { lo: 0, hi: g.H, fix: g.W, horiz: false, id: 'right', cuts: g.rects.filter(function (r) { return r.x + r.w >= g.W - 1e-9; }).map(function (r) { return [r.y, r.y + r.h]; }) }
    ];
    edges.forEach(function (e) {
      caSubtractIntervals(e.lo, e.hi, e.cuts).forEach(function (sgm, k) {
        var p1 = e.horiz ? pt(sgm[0], e.fix) : pt(e.fix, sgm[0]);
        var p2 = e.horiz ? pt(sgm[1], e.fix) : pt(e.fix, sgm[1]);
        segsOut.push([p1, p2, e.id + k]);
      });
    });
    // 切欠きの内側辺(外形境界上に載る辺は描かない)
    g.rects.forEach(function (r, ri) {
      var E = [
        [[r.x, r.y], [r.x + r.w, r.y], r.y > 1e-9],
        [[r.x, r.y + r.h], [r.x + r.w, r.y + r.h], r.y + r.h < g.H - 1e-9],
        [[r.x, r.y], [r.x, r.y + r.h], r.x > 1e-9],
        [[r.x + r.w, r.y], [r.x + r.w, r.y + r.h], r.x + r.w < g.W - 1e-9]
      ];
      E.forEach(function (ed, k) { if (ed[2]) segsOut.push([pt(ed[0][0], ed[0][1]), pt(ed[1][0], ed[1][1]), 'cut' + ri + '_' + k]); });
    });
    segsOut.forEach(function (sg) {
      lay.parts.push(lineEl(sg[0], sg[1], C_STROKE, 2));
      lay.segs.push({ id: sg[2], p1: sg[0], p2: sg[1] });
    });
    // 直角マーク(検収差し戻しr2): 頂点から出る2辺方向ベクトルが張る90°扇形の内側に描画。
    // 凸=図形内・凹=開口側・穴=穴内に自動一致(向き固定の場合分けを廃止)。
    var vmap = {};
    function vkey(p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }
    lay.segs.forEach(function (s) {
      [[s.p1, s.p2], [s.p2, s.p1]].forEach(function (e) {
        var k = vkey(e[0]); (vmap[k] = vmap[k] || []).push(e[1]);
      });
    });
    var caMarks = [];
    Object.keys(vmap).forEach(function (k) {
      var ends = vmap[k];
      if (ends.length !== 2) return;                       // 輪郭頂点=2辺が会する点のみ
      var v = k.split(',').map(Number);
      var ds = ends.map(function (q) {
        // 頂点キーと同じ2桁丸めで方向を出す(生floatとの混在で直交フィルタが微小dotで誤爆するのを防ぐ)
        var dx = Number(q[0].toFixed(2)) - v[0], dy = Number(q[1].toFixed(2)) - v[1], L = Math.hypot(dx, dy);
        return [dx / L, dy / L];
      });
      if (Math.abs(ds[0][0] * ds[1][0] + ds[0][1] * ds[1][1]) > 1e-6) return;   // 直交頂点のみ(直角図形では常に成立)
      var m = CA_MARK, a = [v[0] + ds[0][0] * m, v[1] + ds[0][1] * m];
      var c = [v[0] + (ds[0][0] + ds[1][0]) * m, v[1] + (ds[0][1] + ds[1][1]) * m];
      var b = [v[0] + ds[1][0] * m, v[1] + ds[1][1] * m];
      lay.parts.push('<path d="M ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' L ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" fill="none" stroke="#888" stroke-width="1"/>');
      caMarks.push({ v: v, d1: ds[0], d2: ds[1], center: c });
    });
    // 寸法ラベル(検収差し戻しr2): 担当辺の中点へ垂直オフセットで帰属配置。
    // 外形辺=外側・切欠き辺=開口内(=切欠き矩形内)・穴辺=穴内。開口幅が不足する辺のみ外置き+リーダー線。
    var u = fp.unit || '';
    var showList = fp.show || (function () {
      var d = ['outer.w', 'outer.h'];
      g.rects.forEach(function (_, i) { d.push('cuts.' + i + '.w', 'cuts.' + i + '.h'); });
      return d;
    })();
    var lbls = [], caLabelAudit = [];
    var CANDS = [[12, 13], [12, 11], [14, 10], [16, 12], [20, 11], [24, 11], [30, 10]];
    var LEADER_CANDS = [[10, 12], [10, 10], [22, 11], [34, 11], [46, 10], [58, 10], [70, 10]];   // リーダー先は長梯子(並走2本の分離)
    function addLbl(key, text, anchor, dirs, own, ownMin, leader) {
      if (showList.indexOf(key) < 0) return;
      var txt = (fp.labels && fp.labels[key]) || text;
      lbls.push({ anchor: anchor, dirs: dirs, text: txt, cands: leader ? LEADER_CANDS : CANDS, color: '#333', own: own, ownMin: ownMin || 0 });
      caLabelAudit.push({ key: key, own: own, leader: leader || null });
      if (leader) {   // 再差し戻しr3: 実線細線+起点●(担当辺中点)。破線と垂直延長経路は廃止
        lay.parts.push(lineEl(leader.start, leader.end, '#888', 1));
        lay.parts.push('<circle cx="' + leader.start[0].toFixed(1) + '" cy="' + leader.start[1].toFixed(1) + '" r="2.5" fill="#888"/>');
      }
    }
    addLbl('outer.w', g.W + u, pt(g.W / 2, 0), [[0, 1]], 'bottom0');
    addLbl('outer.h', g.H + u, pt(0, g.H / 2), [[-1, 0]], 'left0');
    var LBL_NEED = 26;   // 開口の垂直方向余地がこれ未満なら外置き+リーダー
    g.rects.forEach(function (r, ri) {
      var topAtt = r.y + r.h >= g.H - 1e-9 && r.at !== 'hole';
      var botAtt = r.y <= 1e-9 && r.at !== 'hole';
      var leftAtt = r.x <= 1e-9 && r.at !== 'hole';
      var wEdgeK = botAtt ? 1 : 0, hEdgeK = leftAtt ? 3 : 2;
      // 担当辺の中点(world)と開口内への垂直方向(world)
      var wMid = [r.x + r.w / 2, botAtt ? r.y + r.h : r.y];
      var wPerpWorld = botAtt ? -1 : 1;                    // 開口(=切欠き矩形内)へ: 下接触なら下向き(-y)、他は上向き
      var hMid = [leftAtt ? r.x + r.w : r.x, r.y + r.h / 2];
      var hPerpWorld = leftAtt ? -1 : 1;                   // 左接触なら左向き(-x)、他は右向き(+x)
      // svg方向へ変換(y反転)
      var wDir = [0, -wPerpWorld], hDir = [hPerpWorld, 0];
      // 開口余地(px): 担当辺から切欠き反対辺までの垂直距離
      // in-void条件: 垂直余地(担当辺→対辺)とラベル幅方向余地の両立(帰属=最近傍辺が担当辺になる幾何保証)
      var wRoomOK = (r.h * sy >= LBL_NEED) && (r.w * sx >= 40);
      var hRoomOK = (r.w * sx >= LBL_NEED) && (r.h * sy >= 40);
      // 2枚同居はボイド最小辺≥64pxのときのみ(中点+垂直オフセット同士の衝突回避)。不足時はhを外置きへ
      if (wRoomOK && hRoomOK && Math.min(r.w * sx, r.h * sy) < 64) hRoomOK = false;
      // リーダー(再差し戻しr3): 起点=担当辺中点(●)・45°斜め外向き(最短で外形bboxを出る象限)・実線・長さ=出口+8px
      var BW = g.W * sx, BH = g.H * sy, RT = Math.SQRT1_2;
      function caLeader(midPx) {
        var best = null;
        [[RT, -RT], [-RT, -RT], [RT, RT], [-RT, RT]].forEach(function (d) {
          var tx = d[0] > 0 ? (BW - midPx[0]) / d[0] : (0 - midPx[0]) / d[0];
          var ty = d[1] > 0 ? (BH - midPx[1]) / d[1] : (0 - midPx[1]) / d[1];
          var t = Math.min(tx, ty);
          if (best === null || t < best.t - 1e-9) best = { d: d, t: t };
        });
        var len = best.t + 8;
        return { start: midPx, end: [midPx[0] + best.d[0] * len, midPx[1] + best.d[1] * len], d: best.d, len: len, exit: best.t };
      }
      if (wRoomOK) addLbl('cuts.' + ri + '.w', r.w + u, pt(wMid[0], wMid[1]), [wDir], 'cut' + ri + '_' + wEdgeK);
      else {
        var Lw = caLeader(pt(wMid[0], wMid[1]));
        addLbl('cuts.' + ri + '.w', r.w + u, Lw.end, [Lw.d], 'cut' + ri + '_' + wEdgeK, 4, Lw);
      }
      if (hRoomOK) addLbl('cuts.' + ri + '.h', r.h + u, pt(hMid[0], hMid[1]), [hDir], 'cut' + ri + '_' + hEdgeK);
      else {
        var Lh = caLeader(pt(hMid[0], hMid[1]));
        addLbl('cuts.' + ri + '.h', r.h + u, Lh.end, [Lh.d], 'cut' + ri + '_' + hEdgeK, 4, Lh);
      }
    });
    finishLabels(lay, lbls);
    lay._caAudit = { marks: caMarks, labels: caLabelAudit };
    lay.pts.push([-26, -14], [g.W * sx + 26, g.H * sy + 18]);
    return lay;
  }

  // ---- e-2 Kind: line_set(直線散布・垂直/平行の組合せ選択)。裁可(i)・設計書e-2 §1 ----
  // labels(バンク由来記号)+pairs(正答ペア=転記保存)+seed → 合成規則(§1.2)で配置を決定的生成。
  // lines[]明示も受理(anchor固定)。日本語ハードコードなし。ラベル=線分一端の外側(自線分束縛)。
  var LS_W = 240, LS_H = 240, LS_MARGIN = 0.06, LS_TRIES = 600, LS_STATS = null;   // r6④: 等スケール(正方形viewBox=角度保存)。260×200の非等方写像は垂直ペアを78°/102°に歪めていた(型B目視差し戻しの原因)
  function lsRand(seed) {   // mulberry32(決定的)
    var a = (Number(seed) >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function lsAngDiff(a, b) { var d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); }   // 直線の角度差[0,90]
  function lsEnds(l) {   // 中点・角度・長さ→両端(正規化)
    var r = l.angle * DEG, hx = Math.cos(r) * l.len / 2, hy = Math.sin(r) * l.len / 2;
    return [[l.cx - hx, l.cy - hy], [l.cx + hx, l.cy + hy]];
  }
  function lsSegInter(a, b) {   // 線分交点(正規化)。無ければnull
    var p = lsEnds(a), q = lsEnds(b);
    var x1 = p[0][0], y1 = p[0][1], x2 = p[1][0], y2 = p[1][1], x3 = q[0][0], y3 = q[0][1], x4 = q[1][0], y4 = q[1][1];
    var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-9) return null;
    var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t: t, u: u };
  }
  function lsPtSeg(p, a, b) {   // 点-線分距離(正規化)
    var vx = b[0] - a[0], vy = b[1] - a[1], wx = p[0] - a[0], wy = p[1] - a[1];
    var L2 = vx * vx + vy * vy, t = L2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / L2)) : 0;
    return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
  }
  function lsLabelEnd(lines, i) {   // ラベル端=他線分からの余地が大きい端(描画・検査で同じ導出)
    var e = lsEnds(lines[i]), best = 0, bestD = -1;
    for (var k = 0; k < 2; k++) {
      var d = 1e9;
      for (var j = 0; j < lines.length; j++) { if (j === i) continue; var q = lsEnds(lines[j]); d = Math.min(d, lsPtSeg(e[k], q[0], q[1])); }
      if (d > bestD + 1e-9) { bestD = d; best = k; }
    }
    return { idx: best, room: bestD };
  }
  var LS_LABEL_ROOM = 0.12;
  function lsLineInter(a, b) {   // 直線(無限)交点と各線分のパラメータt(0..1が線分内)
    var p = lsEnds(a), q = lsEnds(b);
    var x1 = p[0][0], y1 = p[0][1], x2 = p[1][0], y2 = p[1][1], x3 = q[0][0], y3 = q[0][1], x4 = q[1][0], y4 = q[1][1];
    var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-9) return null;
    var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t: t, u: u };
  }
  function lsExtRatio(t, len) {   // 交点が線分外のとき延長距離/線分長(線分内なら0)
    var over = t < 0 ? -t : (t > 1 ? t - 1 : 0);
    return over;   // tは線分長を1とするパラメータ→延長距離/線分長そのもの
  }
  function lsPerpClass(a, b) {   // 垂直ペアの分類: 'cross'(実線分交差) / 'extend'(延長型) / null(交点キャンバス外等)
    var X = lsLineInter(a, b); if (!X) return null;
    var inCanvas = X.x >= LS_MARGIN && X.x <= 1 - LS_MARGIN && X.y >= LS_MARGIN && X.y <= 1 - LS_MARGIN;
    var onA = X.t >= 0 && X.t <= 1, onB = X.u >= 0 && X.u <= 1;
    if (onA && onB) return { kind: 'cross', X: X };
    if (!inCanvas) return { kind: 'out', X: X };
    var ra = lsExtRatio(X.t, a.len), rb = lsExtRatio(X.u, b.len);
    var ok = (ra === 0 || (ra >= 0.3 && ra <= 0.8)) && (rb === 0 || (rb >= 0.3 && rb <= 0.8));
    return { kind: ok ? 'extend' : 'extend_bad', X: X, ra: ra, rb: rb };
  }
  function lsValidate(lines, pairs, density) {   // §1.2/§1.4の幾何ガード(描画と同じ導出で独立検査可)。density: low|normal(難度ノブ・diff連動)
    density = density || 'low';
    var byL = {}; lines.forEach(function (l) { byL[l.label] = l; });
    var issues = [];
    var roomMin = density === 'low' ? LS_LABEL_ROOM : 0.05;   // normalは横断構成のため余地閾値を緩め、帰属は関門(最近傍線分=担当)で担保
    lines.forEach(function (l, i) { if (lsLabelEnd(lines, i).room < roomMin) issues.push('label_room:' + l.label); });
    lines.forEach(function (l) {
      lsEnds(l).forEach(function (e) { if (e[0] < LS_MARGIN || e[0] > 1 - LS_MARGIN || e[1] < LS_MARGIN || e[1] > 1 - LS_MARGIN) issues.push('out:' + l.label); });
    });
    // r5: 端点規則——任意2線分の端点間距離≥0.10・端点から他線分への距離≥0.06(端が他線に乗らない=折れ線/角の見え方を排除)
    for (var e1 = 0; e1 < lines.length; e1++) for (var e2 = e1 + 1; e2 < lines.length; e2++) {
      var ea = lsEnds(lines[e1]), eb = lsEnds(lines[e2]);
      for (var ka = 0; ka < 2; ka++) for (var kb = 0; kb < 2; kb++) {
        if (Math.hypot(ea[ka][0] - eb[kb][0], ea[ka][1] - eb[kb][1]) < 0.10) issues.push('end_end:' + lines[e1].label + lines[e2].label);
      }
      for (var ka2 = 0; ka2 < 2; ka2++) { if (lsPtSeg(ea[ka2], eb[0], eb[1]) < 0.06) issues.push('end_on_line:' + lines[e1].label + '>' + lines[e2].label); }
      for (var kb2 = 0; kb2 < 2; kb2++) { if (lsPtSeg(eb[kb2], ea[0], ea[1]) < 0.06) issues.push('end_on_line:' + lines[e2].label + '>' + lines[e1].label); }
    }
    var isPair = {};
    (pairs.perpendicular || []).forEach(function (p) { isPair[p[0] + p[1]] = isPair[p[1] + p[0]] = 'perp'; });
    (pairs.parallel || []).forEach(function (p) { isPair[p[0] + p[1]] = isPair[p[1] + p[0]] = 'para'; });
    var inters = [];
    for (var i = 0; i < lines.length; i++) for (var j = i + 1; j < lines.length; j++) {
      var a = lines[i], b = lines[j], d = lsAngDiff(a.angle, b.angle), rel = isPair[a.label + b.label];
      if (rel === 'perp') { if (Math.abs(d - 90) >= 0.5) issues.push('perp_angle:' + a.label + b.label); }
      else if (rel === 'para') { if (d >= 0.5) issues.push('para_angle:' + a.label + b.label); }
      else if (!(d >= 12 && d <= 78)) issues.push('margin:' + a.label + b.label + ':' + d.toFixed(1));   // [12,78]∪[102,168]は直線角度差で[12,78]
      var X = lsSegInter(a, b);
      if (rel === 'perp' && density === 'low' && !X) issues.push('perp_nointer:' + a.label + b.label);
      if (X) {
        if (X.t < 0.08 || X.t > 0.92 || X.u < 0.08 || X.u > 0.92) issues.push('inter_near_end:' + a.label + b.label);
        inters.push(X);
      }
    }
    for (var m = 0; m < inters.length; m++) for (var n = m + 1; n < inters.length; n++) {
      if (Math.hypot(inters[m].x - inters[n].x, inters[m].y - inters[n].y) < 0.04) issues.push('triple_or_close');
    }
    // 交差規則(難度ノブ): low=交差は垂直ペア内のみ(平行ペア線は非交差・垂直ペア同士非交差)
    //                    normal=横断線1〜2本が平行ペア両方を横切る配置を許容・非正答交差は角度帯[40,75]・非ペア交差相手≦2
    var cross = {}; lines.forEach(function (l) { cross[l.label] = 0; });   // 非ペア(非正答)交差相手数
    var perpOf = {}; (pairs.perpendicular || []).forEach(function (p, k) { perpOf[p[0]] = k; perpOf[p[1]] = k; });
    var paraOf = {}; (pairs.parallel || []).forEach(function (p, k) { paraOf[p[0]] = k; paraOf[p[1]] = k; });
    var perpX = {}, paraCrossed = {};
    for (var i2 = 0; i2 < lines.length; i2++) for (var j2 = i2 + 1; j2 < lines.length; j2++) {
      var a2 = lines[i2], b2 = lines[j2], X2 = lsSegInter(a2, b2);
      if (!X2) continue;
      var pa = perpOf[a2.label], pb = perpOf[b2.label];
      var samePerp = pa !== undefined && pa === pb;
      if (samePerp) { continue; }                                        // 正答(垂直ペア)交差は分類で扱う
      cross[a2.label]++; cross[b2.label]++;
      var d2 = lsAngDiff(a2.angle, b2.angle);
      if (density === 'low') {
        if (paraOf[a2.label] !== undefined || paraOf[b2.label] !== undefined) issues.push('para_cross:' + a2.label + b2.label);
        if (pa !== undefined && pb !== undefined) issues.push('perp_pairs_cross:' + a2.label + b2.label);
      } else {
        if (!(d2 >= 40 && d2 <= 60)) issues.push('cross_band:' + a2.label + b2.label + ':' + d2.toFixed(1));   // r6③: [40,60]∪[120,140](75°は直角と紛れる)。横断線の角度帯①もこれに包含
        if (paraOf[a2.label] !== undefined) (paraCrossed[a2.label] = paraCrossed[a2.label] || []).push(b2.label);
        if (paraOf[b2.label] !== undefined) (paraCrossed[b2.label] = paraCrossed[b2.label] || []).push(a2.label);
      }
    }
    lines.forEach(function (l) { if (cross[l.label] > 2) issues.push('cross_gt2:' + l.label); });
    // 垂直ペアの分類(r4): low=全組が実交差 / normal=少なくとも1組が延長型(実線分非交差・延長交点キャンバス内・延長距離=線分長×[0.3,0.8])
    var nExtend = 0, byLbl = {}; lines.forEach(function (l) { byLbl[l.label] = l; });
    (pairs.perpendicular || []).forEach(function (p, k) {
      var A = byLbl[p[0]], B = byLbl[p[1]]; if (!A || !B) return;
      var c = lsPerpClass(A, B); if (!c) { issues.push('perp_parallel:' + p.join('')); return; }
      perpX[k] = c.X;
      if (c.kind === 'cross' && (c.X.t < 0.25 || c.X.t > 0.75 || c.X.u < 0.25 || c.X.u > 0.75)) issues.push('perp_cross_offcenter:' + p.join(''));   // r6②: 十字に見える最小はみ出し
      if (density === 'low') { if (c.kind !== 'cross') issues.push('perp_nocross_low:' + p.join('')); }
      else { if (c.kind === 'extend') nExtend++; else if (c.kind !== 'cross') issues.push('perp_' + c.kind + ':' + p.join('')); }
    });
    var perpComplete = (pairs.perpendicular || []).every(function (p) { return byLbl[p[0]] && byLbl[p[1]]; });
    if (density !== 'low' && perpComplete && (pairs.perpendicular || []).length && nExtend < 1) issues.push('no_extend_pair');
    if (density !== 'low') {   // 横断線は平行ペアの両方を横切ること(片側のみは禁止)・完成形では横断線≥1(教科書並み)
      (pairs.parallel || []).forEach(function (p) {
        var A = paraCrossed[p[0]] || [], B = paraCrossed[p[1]] || [];
        var allLabels = lines.map(function (l) { return l.label; });
        var complete = Object.keys(paraOf).concat(Object.keys(perpOf)).every(function (lb) { return allLabels.indexOf(lb) >= 0; });
        if (complete && A.filter(function (t) { return B.indexOf(t) >= 0; }).length < 1) issues.push('no_transversal');
      });
    }
    var pk = Object.keys(perpX);
    for (var u = 0; u < pk.length; u++) for (var v = u + 1; v < pk.length; v++) {
      if (Math.hypot(perpX[pk[u]].x - perpX[pk[v]].x, perpX[pk[u]].y - perpX[pk[v]].y) < 0.3) issues.push('perp_pairs_close');
    }
    return issues;
  }
  // 第2テンプレート(まるこ前倒し指示・2026-09-04): normalは seed偶数=型A(横断線T∈延長型ペア) / seed奇数=型B(横断線T∈交差型ペア:
  // 相棒T2は帯の外でTの端寄りに交わり帯から離れる向きへ・第2組=延長型を帯外に配置)。規則(lsValidate)・関門は両型共通。
  function lsSynthesize(labels, pairs, seed, density, template) {   // §1.2 合成規則(決定的乱択・増分配置)。density=難度ノブ
    density = density || 'low'; template = template || 'A';
    var rnd = lsRand(seed), paraCenter = null;
    var R = function (lo, hi) { return lo + rnd() * (hi - lo); };
    function partialOk(lines) { var iss = lsValidate(lines, pairs, density); if (iss.length && LS_STATS) iss.forEach(function (x) { var k = x.split(':')[0]; LS_STATS[k] = (LS_STATS[k] || 0) + 1; }); return iss.length === 0; }
    for (var tri = 0; tri < 120; tri++) {
      var lines = [], angles = [], placed = {}, bad = false;
      function okAngle(th) { for (var k = 0; k < angles.length; k++) { var d = lsAngDiff(th, angles[k]); if (!(d >= 12 && d <= 78)) return false; } return true; }
      function tryAdd(makers) {   // makers: () => 追加候補配列。成立まで最大80回
        for (var k = 0; k < 140; k++) {
          var cand = makers(); if (!cand) continue;
          var test = lines.concat(cand);
          if (partialOk(test)) { cand.forEach(function (c) { lines.push(c); angles.push(c.angle); placed[c.label] = true; }); return true; }
        }
        return false;
      }
      function rnd3(v) { return Math.round(v * 1000) / 1000; }
      (pairs.parallel || []).forEach(function (p) {
        if (bad) return;
        bad = !tryAdd(function () {
          var th = Math.floor(R(0, 180)); if (!okAngle(th)) return null;
          // low: 端側4帯配置(非交差にしやすい) / normal: 中央帯(横断線を受ける)
          var band = Math.floor(R(0, 4)), cx, cy;
          if (density === 'low') { cx = band === 0 ? R(0.2, 0.3) : band === 1 ? R(0.7, 0.8) : R(0.3, 0.7); cy = band === 2 ? R(0.2, 0.3) : band === 3 ? R(0.7, 0.8) : R(0.3, 0.7); }
          else { cx = R(0.35, 0.65); cy = R(0.35, 0.65); }
          paraCenter = [cx, cy];
          var nx = -Math.sin(th * DEG), ny = Math.cos(th * DEG), gap = density === 'low' ? R(0.18, 0.26) : (template === 'B' ? R(0.16, 0.18) : R(0.14, 0.18));   // normal: 横断線の端が両平行線の外側(≥0.06)に届く間隔(型BはT2の帯内余地のため広め)
          return [{ label: p[0], angle: th, cx: rnd3(cx - nx * gap / 2), cy: rnd3(cy - ny * gap / 2), len: rnd3(R(0.36, 0.44)) },
                  { label: p[1], angle: th, cx: rnd3(cx + nx * gap / 2), cy: rnd3(cy + ny * gap / 2), len: rnd3(R(0.36, 0.44)) }];
        });
      });
      var paraAngle = angles.length ? angles[0] : null, perpIdx = 0;
      (pairs.perpendicular || []).forEach(function (p) {
        if (bad) return;
        // normal: 第1組=延長型ペアの一員Tが平行ペアを横断(急角[58,75])・相棒T2は帯の外で延長交点 / 第2組=交差型を離して配置
        var wantTrans = density !== 'low' && paraAngle !== null && perpIdx === 0;
        var wantExtB = density !== 'low' && paraAngle !== null && perpIdx === 1 && template === 'B'; perpIdx++;
        bad = !tryAdd(function () {
          if (wantTrans && template === 'B') {
            // 型B(r6): T=角度帯[40,50]で平行ペアを横断・相棒T2はTの帯内部分で交差(交点は両線分とも両端から≥0.25=十字)・
            // T2は平行線P1のみを横切り(交差角90−dd∈[40,50]=帯内)・P2の手前(≥0.06)で止まる。第2組=延長型を帯外に配置
            var ddB = Math.floor(R(40, 51)), sgnB = rnd() < 0.5 ? 1 : -1, thTB = ((paraAngle + sgnB * ddB) % 180 + 180) % 180, thT2B = (thTB + 90) % 180;
            if (!okAngle(thTB) || !okAngle(thT2B)) return null;
            var lenTB = rnd3(R(0.42, 0.44)), rTB = thTB * DEG;
            var cTB = [paraCenter[0] + R(-0.02, 0.02), paraCenter[1] + R(-0.02, 0.02)];
            var TB = { label: p[0], angle: thTB, cx: rnd3(cTB[0]), cy: rnd3(cTB[1]), len: lenTB };
            var P1 = lines[0], P2 = lines[1]; if (rnd() < 0.5) { var tmpP = P1; P1 = P2; P2 = tmpP; }
            var XP1 = lsLineInter(TB, P1), XP2 = lsLineInter(TB, P2); if (!XP1 || !XP2) return null;
            var gapB = Math.hypot(XP2.x - XP1.x, XP2.y - XP1.y) * Math.sin(ddB * DEG);   // 平行線間隔(法線距離)
            var aB = R(0.03, 0.06);                                                       // XのP1からの法線距離
            var fB = aB / Math.sin(ddB * DEG) / Math.hypot(XP2.x - XP1.x, XP2.y - XP1.y);  // T上でP1交点からP2側へ
            var XB = [XP1.x + (XP2.x - XP1.x) * fB, XP1.y + (XP2.y - XP1.y) * fB];
            var sinE = Math.sin((90 - ddB) * DEG), r2B = thT2B * DEG;
            var len2B = rnd3(R(0.36, 0.44)), LqMax = (gapB - aB - 0.06) / sinE, Lq = R(0.25, 0.4) * len2B;
            if (Lq > LqMax) return null;
            var Lp = len2B - Lq; if (Lp < aB / sinE + 0.08 || Lq < 0.25 * len2B || Lp < 0.25 * len2B) return null;
            // T2の向き: P1側へ長さLp・P2側へLq。P1側の符号=Xから見てP1交点方向の法線成分
            var toP1 = (XP1.x - XB[0]) * Math.cos(r2B) + (XP1.y - XB[1]) * Math.sin(r2B) >= 0 ? 1 : -1;
            var c2 = [XB[0] + Math.cos(r2B) * toP1 * (Lp - Lq) / 2, XB[1] + Math.sin(r2B) * toP1 * (Lp - Lq) / 2];
            var T2B = { label: p[1], angle: thT2B, cx: rnd3(c2[0]), cy: rnd3(c2[1]), len: len2B };
            return [TB, T2B];
          }
          if (wantExtB) {
            // 型B 第2組: 延長型(のばすと直角に交わる)を帯の外に配置。延長交点X2はキャンバス内・延長比[0.3,0.8]
            var thE = Math.floor(R(0, 180)), thE2 = (thE + 90) % 180; if (!okAngle(thE) || !okAngle(thE2)) return null;
            var X2 = [R(0.2, 0.8), R(0.2, 0.8)];
            return [[p[0], thE], [p[1], thE2]].map(function (q) {
              var r = q[1] * DEG, len = rnd3(R(0.36, 0.44)), ext = R(0.3, 0.8) * len;
              var toC = (0.5 - X2[0]) * Math.cos(r) + (0.5 - X2[1]) * Math.sin(r) >= 0 ? 1 : -1;
              return { label: q[0], angle: q[1], cx: rnd3(X2[0] + Math.cos(r) * toC * (len / 2 + ext)), cy: rnd3(X2[1] + Math.sin(r) * toC * (len / 2 + ext)), len: len };
            });
          }
          if (wantTrans) {
            var dd = Math.floor(R(40, 61)), thT = ((paraAngle + (rnd() < 0.5 ? dd : -dd)) % 180 + 180) % 180, thT2 = (thT + 90) % 180;   // r6①: 直角から30°以上離す
            if (!okAngle(thT) || !okAngle(thT2)) return null;
            var lenT = rnd3(R(0.40, 0.44)), rT = thT * DEG;
            var cT = [paraCenter[0] + R(-0.04, 0.04), paraCenter[1] + R(-0.04, 0.04)];
            var T = { label: p[0], angle: thT, cx: rnd3(cT[0]), cy: rnd3(cT[1]), len: lenT };
            // 延長交点X: Tの一端の外側(延長比[0.3,0.5])・キャンバス中心へ近い側の端を選ぶ
            var sE = (0.5 - cT[0]) * Math.cos(rT) + (0.5 - cT[1]) * Math.sin(rT) >= 0 ? 1 : -1;
            var extT = R(0.3, 0.5) * lenT, X = [cT[0] + Math.cos(rT) * sE * (lenT / 2 + extT), cT[1] + Math.sin(rT) * sE * (lenT / 2 + extT)];
            var r2 = thT2 * DEG, len2 = rnd3(R(0.36, 0.44)), ext2 = R(0.3, 0.8) * len2;
            var toC = (0.5 - X[0]) * Math.cos(r2) + (0.5 - X[1]) * Math.sin(r2) >= 0 ? 1 : -1;
            var T2 = { label: p[1], angle: thT2, cx: rnd3(X[0] + Math.cos(r2) * toC * (len2 / 2 + ext2)), cy: rnd3(X[1] + Math.sin(r2) * toC * (len2 / 2 + ext2)), len: len2 };
            return [T, T2];
          }
          var th = Math.floor(R(0, 180)), th2 = (th + 90) % 180; if (!okAngle(th) || !okAngle(th2)) return null;
          var Xc = [R(0.22, 0.78), R(0.22, 0.78)];
          return [[p[0], th], [p[1], th2]].map(function (q) {
            var r = q[1] * DEG, off = R(-0.08, 0.08);   // r6②: 交点が両端から≥0.25(len≥0.36→t∈[0.28,0.72])
            return { label: q[0], angle: q[1], cx: rnd3(Xc[0] + Math.cos(r) * off), cy: rnd3(Xc[1] + Math.sin(r) * off), len: rnd3(R(0.36, 0.44)) };
          });
        });
      });
      if (bad) continue;
      labels.forEach(function (lb) {
        if (bad || placed[lb]) return;
        bad = !tryAdd(function () {
          var th = Math.floor(R(0, 180)); if (!okAngle(th)) return null;
          return [{ label: lb, angle: th, cx: rnd3(R(0.22, 0.78)), cy: rnd3(R(0.22, 0.78)), len: rnd3(R(0.36, 0.44)) }];
        });
      });
      if (bad) continue;
      if (partialOk(lines)) return lines;
    }
    throw new Error('line_set: 合成規則を満たす配置が得られない(契約違反: seed=' + seed + ')');
  }
  function lsLayoutFromLines(lines) {   // 線分+ラベル配置(帰属自己検査にも使う)
    var lay = newLayout();
    function px(p) { return [p[0] * LS_W, (1 - p[1]) * LS_H]; }
    var specs = [];
    lines.forEach(function (l, li) {
      var e = lsEnds(l), p1 = px(e[0]), p2 = px(e[1]);
      lay.parts.push(lineEl(p1, p2, C_STROKE, 2));
      lay.segs.push({ id: 'ln_' + l.label, p1: p1, p2: p2 });
      var le = lsLabelEnd(lines, li).idx;
      var end = le === 1 ? p2 : p1, other = le === 1 ? p1 : p2;
      var dx = end[0] - other[0], dy = end[1] - other[1], L = Math.hypot(dx, dy);
      var ux = dx / L, uy = dy / L, c35 = Math.cos(35 * DEG), s35 = Math.sin(35 * DEG);
      var dirs = [[ux, uy], [ux * c35 - uy * s35, ux * s35 + uy * c35], [ux * c35 + uy * s35, -ux * s35 + uy * c35]];   // 外向き・±35°
      specs.push({ anchor: end, dirs: dirs, text: String(l.label), cands: [[10, 13], [14, 12], [18, 12], [22, 11], [26, 11]], color: '#333', own: 'ln_' + l.label });
    });
    finishLabels(lay, specs);
    lay.pts.push([-4, -4], [LS_W + 4, LS_H + 4]);
    return lay;
  }
  function lsAttributionOk(lay) {   // 最近傍線分=担当線分(関門と同一導出)
    return lay.labels.every(function (lb) {
      var nearest = null, nd = 1e9;
      lay.segs.forEach(function (s) { var dd = boxSeg(lb.box, s.p1, s.p2); if (dd < nd) { nd = dd; nearest = s.id; } });
      return nearest === lb.own;
    });
  }
  function lineSetGeom(fp) {
    var labels = fp.labels || [], pairs = fp.pairs || {}, density = fp.density || 'low';
    if (!Array.isArray(labels) || labels.length < 2) throw new Error('line_set: labelsは2本以上(契約違反)');
    if (fp.lines) {
      var lines0 = fp.lines.map(function (l) { return { label: l.label, angle: Number(l.angle), cx: Number(l.cx), cy: Number(l.cy), len: Number(l.len) }; });
      var iss0 = lsValidate(lines0, pairs, density);
      if (iss0.length) throw new Error('line_set: 幾何ガード違反 ' + iss0.slice(0, 3).join(','));
      return { lines: lines0, pairs: pairs, density: density, sub: -1 };
    }
    var seed = fp.seed !== undefined ? Number(fp.seed) : 1;
    var template = fp.template || (density === 'normal' ? (seed % 2 === 0 ? 'A' : 'B') : 'A');   // 型はseedで交互(normal)・明示指定も受理
    for (var sub = 0; sub < 24; sub++) {   // サブシード探索(決定的): 合成成功+ラベル帰属自己検査の両立まで
      var lines;
      try { lines = lsSynthesize(labels, pairs, seed * 1000 + sub, density, template); } catch (e) { continue; }
      if (lsAttributionOk(lsLayoutFromLines(lines))) return { lines: lines, pairs: pairs, density: density, sub: sub, template: template };
    }
    throw new Error('line_set: 合成規則+帰属を満たす配置が得られない(契約違反: seed=' + seed + ')');
  }
  function lineSetLayout(fp) { return lsLayoutFromLines(lineSetGeom(fp).lines); }

  // ---- 対称第1便 Kind: sym_figure(方眼格子上の対称多角形+頂点ラベル・線対称/点対称・裁可j §1) ----
  // 座標系: 格子1目盛=SF_CELL px・y上向き(worldFlipで描画)。線対称の軸=x=0(縦)・点対称の中心=(0,0)。
  // 写像(§1.2): 周回順ラベル i → 線対称 (k−i) mod n / 点対称 (i+n/2) mod n。合成(§1.3)=半分を作って写す。
  var SF_CELL = 20, SF_HALF = 6, SF_TRIES = 400;
  var SF_DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function sfMod(a, n) { return ((a % n) + n) % n; }
  function sfMapIdx(n, sym, k, i) { return sym === 'point' ? sfMod(i + n / 2, n) : sfMod(k - i, n); }
  function sfImage(p, sym) { return sym === 'point' ? [-p[0], -p[1]] : [-p[0], p[1]]; }
  function sfDirOk(dx, dy) { return (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)); }
  function sfArea2(V) { var a = 0; for (var i = 0; i < V.length; i++) { var p = V[i], q = V[(i + 1) % V.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
  function sfInteriorAngles(V) {   // 各頂点の内角(度)。向きは符号付き面積で判定
    var n = V.length, ccw = sfArea2(V) > 0, out = [];
    for (var i = 0; i < n; i++) {
      var p = V[(i - 1 + n) % n], c = V[i], q = V[(i + 1) % n];
      var a1 = Math.atan2(p[1] - c[1], p[0] - c[0]), a2 = Math.atan2(q[1] - c[1], q[0] - c[0]);
      var ang = ((a2 - a1) * 180 / Math.PI % 360 + 360) % 360;
      out.push(Math.round((ccw ? 360 - ang : ang) * 1000) / 1000);
    }
    return out;
  }
  function sfOrient(a, b, c) { return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])); }
  function sfOnSeg(a, b, p) { return sfOrient(a, b, p) === 0 && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]); }
  function sfSegTouch(a, b, c, d) {   // 線分の交差または接触(整数座標・厳密)
    var o1 = sfOrient(a, b, c), o2 = sfOrient(a, b, d), o3 = sfOrient(c, d, a), o4 = sfOrient(c, d, b);
    if (o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) return true;
    return sfOnSeg(a, b, c) || sfOnSeg(a, b, d) || sfOnSeg(c, d, a) || sfOnSeg(c, d, b);
  }
  // 幾何ガード(§1.3/§1.5): 対称性(厳密)・単純多角形・辺方向0/45/90・内角{90,135,270}・頂点相異・格子域・最小辺長≥1
  function sfValidate(V, n, sym, k, half) {
    half = half || SF_HALF;
    var issues = [];
    if (V.length !== n) { issues.push('n_mismatch'); return issues; }
    for (var i = 0; i < n; i++) {
      var img = sfImage(V[i], sym), j = sfMapIdx(n, sym, k, i);
      if (V[j][0] !== img[0] || V[j][1] !== img[1]) issues.push('symmetry:' + i);
      if (Math.abs(V[i][0]) > half || Math.abs(V[i][1]) > half) issues.push('out:' + i);
      for (var j2 = i + 1; j2 < n; j2++) if (V[i][0] === V[j2][0] && V[i][1] === V[j2][1]) issues.push('dup:' + i + ',' + j2);
      var q = V[(i + 1) % n], dx = q[0] - V[i][0], dy = q[1] - V[i][1];
      if (!sfDirOk(dx, dy)) issues.push('dir:' + i);
    }
    if (issues.length) return issues;
    var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
    V.forEach(function (q) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]); });
    if (bx1 - bx0 < 4 || by1 - by0 < 4) issues.push('small');                    // 最小サイズ: 4×4目盛以上(ラベル余地・視認)
    if (sym === 'point') for (var ce = 0; ce < n; ce++) if (sfOnSeg(V[ce], V[(ce + 1) % n], [0, 0])) issues.push('center_on_edge:' + ce);   // 中心Oが辺上に乗らない
    sfInteriorAngles(V).forEach(function (a, i) { if ([90, 135, 270].indexOf(a) < 0) issues.push('angle:' + i + ':' + a); });
    for (var e1 = 0; e1 < n; e1++) for (var e2 = e1 + 1; e2 < n; e2++) {
      if (e2 === e1 + 1 || (e1 === 0 && e2 === n - 1)) continue;
      if (sfSegTouch(V[e1], V[(e1 + 1) % n], V[e2], V[(e2 + 1) % n])) issues.push('cross:' + e1 + ',' + e2);
    }
    return issues;
  }
  // 乱歩: 進行方向(SF_DIRS index・反時計回り順)に対して 右90(index−2)/右45(−1)/左90(+2) の折れのみ(=時計回り多角形の内角90/135/270)。
  function sfTurnStep(rnd, hd, maxLen) {
    var turns = [-2, -1, 2], t = turns[Math.floor(rnd() * 3)], nh = sfMod(hd + t, 8), d = SF_DIRS[nh], L = 1 + Math.floor(rnd() * maxLen);
    return { hd: nh, d: [d[0] * L, d[1] * L] };
  }
  function sfSynthLine(n, k, rnd, half) {   // 線対称: 右側(x>0)の頂点列を乱択→鏡映
    half = half || SF_HALF;
    var fixed = [], crossed = [];
    for (var i = 0; i < n; i++) { if (sfMod(2 * i - k, n) === 0) fixed.push(i); if (sfMod(2 * i - (k - 1), n) === 0) crossed.push(i); }
    var startFixed = fixed.length > 0, c0 = startFixed ? fixed[0] : sfMod(crossed[0] + 1, n);
    var chain = [], idx = c0, endFixed = false;
    for (var st = 0; st < n; st++) {
      chain.push(idx);
      if (st > 0 && fixed.indexOf(idx) >= 0) { endFixed = true; break; }
      if (crossed.indexOf(idx) >= 0) break;
      idx = sfMod(idx + 1, n);
    }
    for (var t = 0; t < SF_TRIES; t++) {
      var pts = [], ok = true, L = chain.length, hd;
      var p0 = startFixed ? [0, 0] : [1 + Math.floor(rnd() * 3), 0]; pts.push(p0);
      // 初期進行方向: 固定始点(軸上)からは右下〜右上(x>0側へ)、交差辺始点(右端)からは下向き系(時計回り=右側を下る)
      hd = startFixed ? [7, 0, 1][Math.floor(rnd() * 3)] : [6, 7, 5][Math.floor(rnd() * 3)];
      for (var j = 1; j < L && ok; j++) {
        var prev = pts[j - 1], nx;
        if (j === L - 1 && endFixed) {
          var opts = [[0, prev[1]], [0, prev[1] + prev[0]], [0, prev[1] - prev[0]]].filter(function (q) { return q[1] !== prev[1] || prev[0] !== 0; });
          nx = opts[Math.floor(rnd() * opts.length)];
        } else {
          var st2 = (j === 1) ? { hd: hd, d: [SF_DIRS[hd][0] * (1 + Math.floor(rnd() * 3)), SF_DIRS[hd][1] * (1 + Math.floor(rnd() * 3))] } : sfTurnStep(rnd, hd, 3);
          hd = st2.hd; nx = [prev[0] + st2.d[0], prev[1] + st2.d[1]];
          if (nx[0] <= 0 || nx[0] > half || Math.abs(nx[1]) > half) { ok = false; break; }
        }
        pts.push(nx);
      }
      if (!ok) continue;
      var V = []; for (var v = 0; v < n; v++) V.push(null);
      chain.forEach(function (ci, j2) { V[ci] = pts[j2]; var mi = sfMapIdx(n, 'line', k, ci); V[mi] = [-pts[j2][0], pts[j2][1]]; });
      if (V.some(function (x) { return !x; })) continue;
      if (sfArea2(V) > 0) V = V.map(function (q) { return [-q[0], q[1]]; });   // 時計回りへ(鏡映は写像を保つ)
      if (sfValidate(V, n, 'line', k, half).length === 0) return V;
    }
    return null;
  }
  function sfSynthPoint(n, rnd, half) {   // 点対称: 半周(v0..v_{n/2})を乱択→180°回転
    half = half || SF_HALF;
    var h = n / 2;
    for (var t = 0; t < SF_TRIES; t++) {
      var P = [Math.floor(rnd() * 9) - 4, Math.floor(rnd() * 9) - 4]; if (P[0] === 0 && P[1] === 0) continue;
      var pts = [P], ok = true, hd = Math.floor(rnd() * 8);
      for (var j = 1; j < h; j++) {
        var st2 = (j === 1) ? { hd: hd, d: [SF_DIRS[hd][0] * (1 + Math.floor(rnd() * 3)), SF_DIRS[hd][1] * (1 + Math.floor(rnd() * 3))] } : sfTurnStep(rnd, hd, 3);
        hd = st2.hd; var nx = [pts[j - 1][0] + st2.d[0], pts[j - 1][1] + st2.d[1]];
        if (Math.abs(nx[0]) > half || Math.abs(nx[1]) > half) { ok = false; break; } pts.push(nx);
      }
      if (!ok) continue;
      var Q = pts[h - 1], dd = [-P[0] - Q[0], -P[1] - Q[1]];
      if (!sfDirOk(dd[0], dd[1]) || Math.max(Math.abs(dd[0]), Math.abs(dd[1])) > 4) continue;
      var V = []; for (var i = 0; i < h; i++) { V[i] = pts[i]; V[i + h] = [-pts[i][0], -pts[i][1]]; }
      if (sfArea2(V) > 0) V = V.map(function (q) { return [-q[0], q[1]]; });
      if (sfValidate(V, n, 'point', 0, half).length === 0) return V;
    }
    return null;
  }
  function symFigureGeom(fp) {
    var sym = fp.sym === 'point' ? 'point' : 'line', n = Number(fp.n), k = Number(fp.k) || 0, labels = fp.labels || [];
    if (!(n >= 3)) throw new Error('sym_figure: nは3以上(契約違反)');
    if (labels.length !== n) throw new Error('sym_figure: labelsの長さがnと不一致(契約違反)');
    if (sym === 'point' && n % 2) throw new Error('sym_figure: 点対称はn偶数(契約違反)');
    var V, sub = -1;
    if (fp.regular) {   // 正多角形(u03の正五角形/正六角形行): 頂点0を上・時計回り。線対称の軸x=0は k=0 のとき頂点0を通る
      V = regularPoly(n, 2.6).map(function (q, i) { var a = d2r(90 - 360 * i / n); return [2.6 * Math.cos(a), 2.6 * Math.sin(a)]; });
      // 軸をk/2に合わせて回転(頂点iと(k−i)が鏡像になるよう、x=0を対称軸に)
      var rot = k * 180 / n; V = V.map(function (q) { return rotPt(q, rot); });   // 頂点k/2(kが奇数なら辺の中点)を上=軸x=0上へ
      V = V.map(function (q) { return [Math.round(q[0] * 1e6) / 1e6, Math.round(q[1] * 1e6) / 1e6]; });
    } else if (fp.vertices) {   // anchor固定(整数格子)
      V = fp.vertices.map(function (q) { return [Number(q[0]), Number(q[1])]; });
      var iss = sfValidate(V, n, sym, k, Math.min(7, Number(fp.half) || SF_HALF)); if (iss.length) throw new Error('sym_figure: 幾何ガード違反 ' + iss.slice(0, 3).join(','));
    } else {
      var seed = fp.seed !== undefined ? Number(fp.seed) : 1;
      for (sub = 0; sub < 24; sub++) {
        var rnd = lsRand(seed * 1000 + sub);
        var half = Math.min(7, Number(fp.half) || SF_HALF);
        V = sym === 'line' ? sfSynthLine(n, k, rnd, half) : sfSynthPoint(n, rnd, half);
        if (V && sfAttributionOk(sfLayoutFromGeom({ V: V, n: n, sym: sym, k: k, labels: labels }, fp))) break;
        V = null;
      }
      if (!V) throw new Error('sym_figure: 合成規則+帰属を満たす配置が得られない(契約違反: seed=' + seed + ')');
    }
    var map = {}; for (var i = 0; i < n; i++) map[labels[i]] = labels[sfMapIdx(n, sym, k, i)];
    return { V: V, n: n, sym: sym, k: k, labels: labels, map: map, sub: sub, regular: !!fp.regular };
  }
  function sfLayoutFromGeom(g, fp) {
    var lay = newLayout(), C = SF_CELL, V = g.V, n = g.n;
    function px(q) { return [q[0] * C, -q[1] * C]; }
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    V.forEach(function (q) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); miny = Math.min(miny, q[1]); maxy = Math.max(maxy, q[1]); });
    if (fp.grid) {   // 方眼: 図形域+1目盛の格子(薄線)
      var gx0 = Math.floor(minx) - 1, gx1 = Math.ceil(maxx) + 1, gy0 = Math.floor(miny) - 1, gy1 = Math.ceil(maxy) + 1;
      for (var gx = gx0; gx <= gx1; gx++) lay.parts.push(lineEl(px([gx, gy0]), px([gx, gy1]), '#d5dde8', 0.8));
      for (var gy = gy0; gy <= gy1; gy++) lay.parts.push(lineEl(px([gx0, gy]), px([gx1, gy]), '#d5dde8', 0.8));
      lay.pts.push(px([gx0, gy0]), px([gx1, gy1]));
    }
    var wp = V.map(px);
    lay.parts.push(polygonEl(wp, '#ffffff'));
    wp.forEach(function (q, i) { lay.pts.push(q); lay.segs.push({ id: 'e_' + i, p1: q, p2: wp[(i + 1) % n] }); });
    var showAxis = fp.show_axis !== false, specs = [];
    if (showAxis && g.sym === 'line') {
      var a = px([0, maxy + 1.2]), b = px([0, miny - 1.2]);
      lay.parts.push(lineEl(a, b, C_TARGET, 1.4, '6,4')); lay.segs.push({ id: 'axis', p1: a, p2: b }); lay.pts.push(a, b);
      var al = fp.axis_labels || ['ア', 'イ'];
      specs.push({ anchor: a, dirs: [[0, -1], [0.5, -0.87], [-0.5, -0.87]], text: String(al[0]), cands: [[10, 13], [14, 12]], color: C_TARGET, own: 'axis' });
      specs.push({ anchor: b, dirs: [[0, 1], [0.5, 0.87], [-0.5, 0.87]], text: String(al[1]), cands: [[10, 13], [14, 12]], color: C_TARGET, own: 'axis' });
    } else if (showAxis && g.sym === 'point') {
      lay.parts.push('<circle cx="0" cy="0" r="3" fill="' + C_TARGET + '"/>');
      specs.push({ anchor: [0, 0], dirs: [[1, 1], [1, -1], [-1, 1], [-1, -1]], text: String(fp.center_label || 'O'), cands: [[10, 13], [13, 12]], color: C_TARGET, own: 'center' });
    }
    (fp.extra_points || []).forEach(function (ep) {   // 補助点(例: 辺の中点P)
      var i1 = g.labels.indexOf(ep.mid[0]), i2 = g.labels.indexOf(ep.mid[1]); if (i1 < 0 || i2 < 0) return;
      var m = [(wp[i1][0] + wp[i2][0]) / 2, (wp[i1][1] + wp[i2][1]) / 2];
      lay.parts.push('<circle cx="' + m[0].toFixed(2) + '" cy="' + m[1].toFixed(2) + '" r="2.4" fill="' + C_STROKE + '"/>');
      var ux = wp[i2][0] - wp[i1][0], uy = wp[i2][1] - wp[i1][1], L = Math.hypot(ux, uy) || 1;
      specs.push({ anchor: m, dirs: [[-uy / L, ux / L], [uy / L, -ux / L]], text: String(ep.label), cands: [[10, 13], [14, 12]], color: '#333', own: 'e_' + Math.min(i1, i2) });
    });
    var angs = sfInteriorAngles(V);
    V.forEach(function (q, i) {   // 頂点ラベル: 外側(内角の二等分の逆)・±35°候補
      var p = V[(i - 1 + n) % n], r = V[(i + 1) % n];
      var e1 = [p[0] - q[0], p[1] - q[1]], e2 = [r[0] - q[0], r[1] - q[1]], L1 = Math.hypot(e1[0], e1[1]), L2 = Math.hypot(e2[0], e2[1]);
      var bx = e1[0] / L1 + e2[0] / L2, by = e1[1] / L1 + e2[1] / L2, Lb = Math.hypot(bx, by) || 1;
      var sgn = angs[i] > 180 ? 1 : -1, ox = sgn * bx / Lb, oy = -sgn * by / Lb;   // yはSVG向きに反転
      var c35 = Math.cos(35 * DEG), s35 = Math.sin(35 * DEG);
      specs.push({ anchor: wp[i], dirs: [[ox, oy], [ox * c35 - oy * s35, ox * s35 + oy * c35], [ox * c35 + oy * s35, -ox * s35 + oy * c35]], text: String(g.labels[i]), cands: [[10, 13], [13, 12], [16, 12], [19, 11]], color: '#333', own: 'v_' + i });
    });
    finishLabels(lay, specs);
    lay.pts.push([-4, -4]);
    lay._vpx = wp;
    return lay;
  }
  function sfAttributionOk(lay) {   // 頂点ラベルの最近傍頂点=担当頂点(関門と同一導出)
    return lay.labels.every(function (lb) {
      if (!/^v_/.test(lb.own)) return true;
      var cx = (lb.box.x0 + lb.box.x1) / 2, cy = (lb.box.y0 + lb.box.y1) / 2, best = -1, bd = 1e9;
      lay._vpx.forEach(function (q, i) { var d = Math.hypot(q[0] - cx, q[1] - cy); if (d < bd) { bd = d; best = i; } });
      return 'v_' + best === lb.own;
    });
  }
  function symFigureLayout(fp) { var g = symFigureGeom(fp); return sfLayoutFromGeom(g, fp); }

  // ---- P5-3 Kind A: xy_graph mode="polyline"(折れ線グラフ・1〜2系列・draw対応) ----
  // v1(prop/inv)/v2(jhs4象限)へ一切触れない独立分岐。日本語ハードコード禁止(表示文字列は全てfp由来)。
  var PL_W = 264, PL_H = 190, PL_FS = 11;
  function plNiceTick(span) {
    var cands = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    for (var i = 0; i < cands.length; i++) { if (span / cands[i] <= 10) return cands[i]; }
    return cands[cands.length - 1];
  }
  function xyGraphPolylineLayout(fp) {
    var series = fp.series;
    if (!Array.isArray(series) || series.length < 1 || series.length > 2) throw new Error('xy_graph polyline: seriesは1〜2(契約違反)');
    var xl = fp.x_labels;
    if (!Array.isArray(xl) || xl.length < 2) throw new Error('xy_graph polyline: x_labelsは2点以上(契約違反)');
    series.forEach(function (s) {
      if (!Array.isArray(s.y) || s.y.length !== xl.length) throw new Error('xy_graph polyline: series.y長とx_labels長の不一致(契約違反)');
    });
    var allY = [];
    series.forEach(function (s) { s.y.forEach(function (v) { allY.push(Number(v)); }); });
    var lo = 0, hi = Math.max.apply(null, allY);
    if (fp.y_range) { lo = Number(fp.y_range[0]); hi = Number(fp.y_range[1]); }
    var tick = fp.y_tick ? Number(fp.y_tick) : plNiceTick((hi - lo) || 1);
    hi = Math.ceil(hi / tick) * tick;
    if (hi <= lo) throw new Error('xy_graph polyline: y_range不正(契約違反)');
    allY.forEach(function (v) { if (v < lo || v > hi) throw new Error('xy_graph polyline: y値がy_range外(契約違反)'); });
    var n = xl.length, draw = !!fp.draw, lay = newLayout();
    function X(i) { return i * (PL_W / (n - 1)); }
    function Y(v) { return PL_H - (v - lo) / (hi - lo) * PL_H; }
    // 方眼: 主目盛=薄実線・補助(1/2目盛)=さらに薄く
    var nTicks = Math.round((hi - lo) / tick);
    for (var ti = 0; ti <= nTicks; ti++) {
      var t = lo + ti * tick, tr = Math.round(t * 10000) / 10000;   // 小数目盛の浮動小数蓄積対策(整数は不変)
      lay.parts.push(lineEl([0, Y(t)], [PL_W, Y(t)], '#d5deea', 1));
      if (!fp.y_minor && ti < nTicks) lay.parts.push(lineEl([0, Y(t + tick / 2)], [PL_W, Y(t + tick / 2)], '#eaeff6', 0.7));
      lay.parts.push(textEl(-16, Y(t), String(tr), PL_FS, '#333'));
    }
    if (fp.y_minor) {   // 補助目盛の刻み指定(例: 主0.5+補助0.1)。主目盛位置は重複描画しない
      var mstep = Number(fp.y_minor), nm = Math.round((hi - lo) / mstep);
      for (var mi = 0; mi <= nm; mi++) {
        var mt = lo + mi * mstep;
        if (Math.abs(mt / tick - Math.round(mt / tick)) < 1e-9) continue;
        lay.parts.push(lineEl([0, Y(mt)], [PL_W, Y(mt)], '#eaeff6', 0.7));
      }
    }
    var maxXL = 0;
    xl.forEach(function (v) { maxXL = Math.max(maxXL, String(v).length); });
    var pitch = PL_W / (n - 1);
    var xfs = Math.max(7, Math.min(PL_FS, Math.floor(pitch / (maxXL * 0.62))));   // ピッチ不足時は縮小(§1.3-6・下限7)
    for (var xi = 0; xi < n; xi++) {
      lay.parts.push(lineEl([X(xi), 0], [X(xi), PL_H], '#d5deea', 1));
      lay.parts.push(textEl(X(xi), PL_H + 12, String(xl[xi]), xfs, '#333'));
    }
    // 軸(左・下)
    lay.parts.push(lineEl([0, -8], [0, PL_H], C_STROKE, 1.6));
    lay.parts.push(lineEl([0, PL_H], [PL_W + 8, PL_H], C_STROKE, 1.6));
    // 省略波線: y_range下端>0 のとき軸下端に「〜」二重波
    if (lo > 0) {
      var yb = PL_H - 12;
      lay.parts.push('<rect x="-7" y="' + (yb - 5).toFixed(1) + '" width="14" height="10" fill="#fff"/>');
      [yb - 3, yb + 3].forEach(function (yw) {
        lay.parts.push('<path d="M -7 ' + yw.toFixed(1) + ' q 3.5 -4 7 0 t 7 0" fill="none" stroke="' + C_STROKE + '" stroke-width="1.4"/>');
      });
    }
    // タイトル・軸題(全てfp由来・省略可)
    if (fp.title) lay.parts.push(textEl(PL_W / 2, -22, String(fp.title), 12, '#333'));
    if (fp.y_title) lay.parts.push(textEl(0, -16, String(fp.y_title), PL_FS, '#333'));
    if (fp.x_title) lay.parts.push(textEl(PL_W + 24, PL_H, String(fp.x_title), PL_FS, '#333'));
    // 系列: 実線●(第1)/破線○(第2)。draw:trueでは描かない
    if (!draw) {
      series.forEach(function (s, si) {
        var pts = s.y.map(function (v, i) { return [X(i), Y(Number(v))]; });
        lay.parts.push('<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
          '" fill="none" stroke="' + C_TARGET + '" stroke-width="2"' + (si === 1 ? ' stroke-dasharray="6 3"' : '') + '/>');
        pts.forEach(function (p) {
          lay.parts.push(si === 0
            ? '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="' + C_TARGET + '"/>'
            : '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="#fff" stroke="' + C_TARGET + '" stroke-width="1.6"/>');
        });
      });
      if (series.length === 2) {   // 凡例(右上・実線/破線見本+系列名)
        series.forEach(function (s, si) {
          var ly = -14 + si * 14, lx = PL_W - 64;
          lay.parts.push(lineEl([lx, ly], [lx + 20, ly], C_TARGET, 2, si === 1 ? '6 3' : null));
          lay.parts.push('<text x="' + (lx + 25) + '" y="' + (ly + PL_FS * 0.34).toFixed(1) + '" font-size="' + PL_FS + '" fill="#333">' + esc(String(s.name || '')) + '</text>');
        });
      }
    }
    lay.pts.push([-34, -34], [PL_W + 52, PL_H + 20]);
    return lay;
  }

  function xyGraphLayout(fp) {
    if (fp.mode === 'polyline') return xyGraphPolylineLayout(fp);   // P5-3折れ線モード(独立分岐)
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
  var ANGLE_RAY_LEN = 95, ANGLE_KR = 18, ANGLE_UR = 28;   // 未知弧 r34→r28(2026-08-15・A/B選定でB採用・間延び解消。既知r18との比1.56)
  // 決定的候補列（可動=距離・フォントのみ・仕様§0-2）。[Oからの距離, フォント]
  var ANGLE_KN_CANDS = [[30, 13], [27, 13], [34, 13], [30, 11], [27, 11], [38, 11], [24, 11], [42, 11]];
  var ANGLE_UN_CANDS = [[46, 13], [42, 13], [50, 13], [46, 11], [42, 11], [54, 11], [38, 11], [58, 11]];   // r28に合わせラベルを2px内寄せ(2026-08-15。6pxはisshuu密度と衝突→値域保全優先で2px)
  var ANGLE_UN_CANDS_BIG = [[52, 16], [48, 16], [56, 16], [52, 14], [48, 14], [60, 14], [44, 14], [64, 13]];   // 案b: フォント拡大(白丸径連動)
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
    var uStyle = fp.unknown_style || 'bare_zx';   // bare_zx(既定・まるこ選定2026-08-14)/circle_zx/circle_x/circle_zx_big
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
      // 未知角ラベルの意匠(既定=circle_zx: 白丸+∠x)。案a=circle_x(白丸+x・∠を落とす)/案b=circle_zx_big(∠x拡大)/案c=bare_zx(囲みなし)
      var isUn = arc.role === 'unknown';
      var unText = uStyle === 'circle_x' ? 'x' : (arc.label != null ? String(arc.label) : '∠x');
      specs.push({ role: arc.role, text: isUn ? unText : (arc.label != null ? String(arc.label) : Math.floor(arc.a1 - arc.a0 + 0.5) + '°'),
        dir: dirSvg, cands: isUn ? (uStyle === 'circle_zx_big' ? ANGLE_UN_CANDS_BIG : ANGLE_UN_CANDS) : ANGLE_KN_CANDS, color: col, own: ['r' + idx, 'r' + ((idx + 1) % n)] });
    });
    // ラベル配置（自弧束縛=own2ray・placeLbl・決定的候補列）。未知は(案により)白丸囲みを先に敷く。
    specs.forEach(function (sp) {
      var others = lay.labels.map(function (l) { return l.box; });
      var ownSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) >= 0; });
      var otherSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) < 0; });
      var pl = placeLbl(O, [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands);
      var withCircle = sp.role === 'unknown' && uStyle !== 'bare_zx';   // 案c(bare_zx)は白丸なし
      if (withCircle) { var cr = pl.fs * (uStyle === 'circle_x' ? 1.15 : 0.95); lay.parts.push('<circle cx="' + pl.cx.toFixed(2) + '" cy="' + pl.cy.toFixed(2) + '" r="' + cr.toFixed(1) + '" fill="#fff" stroke="' + C_TARGET + '" stroke-width="1.2"/>'); lay.pts.push([pl.cx - cr, pl.cy - cr], [pl.cx + cr, pl.cy + cr]); }
      lay.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      lay.labels.push({ box: pl.box, own: sp.own, text: sp.text });
      lay.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
    return lay;
  }
  // ---- 第2波G-2: parallel_lines(平行線と角) ----
  // 平行2直線ℓ(上),m(下)を縦GAPで隔て、横断線1本が上下の交点U,Lで交わる。
  // 横断角 t1(=横断線が平行線と成す角・pos0の実角)から、各交点の4角=[t1,180−t1,t1,180−t1]が
  // 決定的に定まる(隣接和180・対頂相等・平行輸送でU,Lの同位置角が一致=平行性はデータ構造が担保)。
  // pos 0..3 は交点の局所frameで CCW(0=右+x, θ, 180=左, θ+180)——posk は ray_k〜ray_{k+1} の楔。
  var PARALLEL_GAP = 78, PARALLEL_LINE_EXT = 44, PARALLEL_TRANS_EXT = 40;
  function parallelLinesGeom(fp) {
    var t1 = Number((fp.transversal || {}).angle);
    if (!(t1 > 0 && t1 < 180)) throw new Error('parallel_lines契約違反: 横断角 ' + t1 + ' は(0,180)必須');
    var H = PARALLEL_GAP, th = t1 * DEG;
    var ux = (H / 2) / Math.tan(th);                       // U_x(θ=90で0・θ<90で正・θ>90で負)
    var U = [ux, H / 2], L = [-ux, -H / 2];
    var W = Math.abs(ux) + PARALLEL_LINE_EXT;
    var dir = [Math.cos(th), Math.sin(th)];
    var topEnd = [U[0] + PARALLEL_TRANS_EXT * dir[0], U[1] + PARALLEL_TRANS_EXT * dir[1]];
    var botEnd = [L[0] - PARALLEL_TRANS_EXT * dir[0], L[1] - PARALLEL_TRANS_EXT * dir[1]];
    return { t1: t1, H: H, U: U, L: L, ux: ux, W: W, dir: dir, topEnd: topEnd, botEnd: botEnd };
  }
  // (at,pos)→楔の中心角範囲[a0,a1](交点局所・度)と、そのposが持つ実角値(pos偶=t1/奇=180−t1)。
  function parallelWedge(t1, pos) {
    var A0 = [0, t1, 180, 180 + t1], A1 = [t1, 180, 180 + t1, 360];
    return { a0: A0[pos], a1: A1[pos], v: (pos % 2 === 0) ? t1 : 180 - t1 };
  }
  function parallelLinesLayout(fp) {
    var uStyle = fp.unknown_style || 'bare_zx';
    var g = parallelLinesGeom(fp), lay = newLayout(), t1 = g.t1;
    var Uw = worldFlip(g.U), Lw = worldFlip(g.L);
    var Wr = worldFlip([g.W, g.H / 2]), Wl = worldFlip([-g.W, g.H / 2]);      // ℓの右端・左端
    var Mr = worldFlip([g.W, -g.H / 2]), Ml = worldFlip([-g.W, -g.H / 2]);    // mの右端・左端
    var top = worldFlip(g.topEnd), bot = worldFlip(g.botEnd);
    // 直線3本(ℓ・m・横断線)
    lay.parts.push(lineEl(Wl, Wr, C_STROKE, 2));
    lay.parts.push(lineEl(Ml, Mr, C_STROKE, 2));
    lay.parts.push(lineEl(top, bot, C_STROKE, 2));
    lay.pts.push(Wl, Wr, Ml, Mr, top, bot);
    // ray分割セグメント(ラベルの自要素判定用)。交点局所CCW: [右, 横断上/U→トップ・L→U, 左, 横断下/U→L・L→ボトム]
    function seg(id, p1, p2) { lay.segs.push({ id: id, p1: p1, p2: p2 }); }
    seg('lU_e', Uw, Wr); seg('lU_w', Uw, Wl);
    seg('mL_e', Lw, Mr); seg('mL_w', Lw, Ml);
    seg('t_up', Uw, top); seg('t_UL', Uw, Lw); seg('t_lo', Lw, bot);
    var rays = { upper: ['lU_e', 't_up', 'lU_w', 't_UL'], lower: ['mL_e', 't_UL', 'mL_w', 't_lo'] };
    // 交点マーカー
    lay.parts.push('<circle cx="' + Uw[0].toFixed(2) + '" cy="' + Uw[1].toFixed(2) + '" r="2.2" fill="' + C_STROKE + '"/>');
    lay.parts.push('<circle cx="' + Lw[0].toFixed(2) + '" cy="' + Lw[1].toFixed(2) + '" r="2.2" fill="' + C_STROKE + '"/>');
    // 平行マーク(各線中点に「>」1個・線分中点束縛・+x向き)
    function chevron(midW, id) {
      var mx = midW[0], my = midW[1], p0 = [mx - 3, my - 6], p1 = [mx + 3.5, my], p2 = [mx - 3, my + 6];
      lay.parts.push('<path d="M ' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' L ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' L ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2) + '" fill="none" stroke="' + C_STROKE + '" stroke-width="1.6"/>');
      seg(id, p0, p2); lay.pts.push(p0, p1, p2);
    }
    chevron(worldFlip([0, g.H / 2]), 'pm_u');
    chevron(worldFlip([0, -g.H / 2]), 'pm_l');
    // 角の弧 + ラベルspec
    var specs = [];
    (fp.angles || []).forEach(function (a) {
      var role = a.role || 'plain'; if (role === 'plain') return;
      var at = a.at, pos = Number(a.pos);
      if (at !== 'upper' && at !== 'lower') throw new Error('parallel_lines契約違反: at ' + at + ' は upper|lower');
      if (!(pos >= 0 && pos <= 3)) throw new Error('parallel_lines契約違反: pos ' + pos + ' は0..3');
      var wd = parallelWedge(t1, pos);
      if (a.v != null && Math.floor(Number(a.v) + 0.5) !== Math.floor(wd.v + 0.5))
        throw new Error('parallel_lines契約違反: (' + at + ',pos' + pos + ')の角=' + wd.v + ' だが v=' + a.v + '(隣接和180/対頂相等/平行輸送に反する)');
      var center = at === 'upper' ? g.U : g.L, isUn = role === 'unknown';
      var col = isUn ? C_TARGET : C_KNOWN, w = isUn ? 2 : 1.6, r = isUn ? ANGLE_UR : ANGLE_KR;
      var aw = arcPath(center, r, wd.a0, wd.a1, col, w); lay.parts.push(aw.el);
      aw.ext.forEach(function (p) { lay.pts.push(p); });
      for (var cd = Math.ceil(wd.a0 / 90) * 90; cd < wd.a1; cd += 90) lay.pts.push(arcPtWorld(center, r, cd));
      var bis = (wd.a0 + wd.a1) / 2, dirSvg = [Math.cos(bis * DEG), -Math.sin(bis * DEG)];
      var text = isUn ? (uStyle === 'circle_x' ? 'x' : (a.label != null ? String(a.label) : '∠x'))
        : (a.label != null ? String(a.label) : Math.floor(wd.v + 0.5) + '°');
      specs.push({ role: role, text: text, anchor: worldFlip(center), dir: dirSvg,
        cands: isUn ? (uStyle === 'circle_zx_big' ? ANGLE_UN_CANDS_BIG : ANGLE_UN_CANDS) : ANGLE_KN_CANDS,
        color: col, own: [rays[at][pos], rays[at][(pos + 1) % 4]] });
    });
    // 直線ラベル ℓ,m(線端束縛=左端の外側)
    var lp = (fp.parallel || [{}, {}]);
    var lLbl = (lp[0] && lp[0].label) || 'ℓ', mLbl = (lp[1] && lp[1].label) || 'm';
    specs.push({ role: 'line', text: lLbl, anchor: Wl, dirs: [[-0.96, -0.28], [-0.96, 0.28]], cands: [[11, 13], [14, 13], [17, 12]], color: C_STROKE, own: ['lU_e', 'lU_w'] });
    specs.push({ role: 'line', text: mLbl, anchor: Ml, dirs: [[-0.96, 0.28], [-0.96, -0.28]], cands: [[11, 13], [14, 13], [17, 12]], color: C_STROKE, own: ['mL_e', 'mL_w'] });
    // 配置(自要素束縛・placeLbl・決定的候補列)
    specs.forEach(function (sp) {
      var others = lay.labels.map(function (l) { return l.box; });
      var ownSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) >= 0; });
      var otherSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) < 0; });
      var pl = placeLbl(sp.anchor, sp.dirs || [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands);
      if (sp.role === 'unknown' && uStyle !== 'bare_zx') {
        var cr = pl.fs * (uStyle === 'circle_x' ? 1.15 : 0.95);
        lay.parts.push('<circle cx="' + pl.cx.toFixed(2) + '" cy="' + pl.cy.toFixed(2) + '" r="' + cr.toFixed(1) + '" fill="#fff" stroke="' + C_TARGET + '" stroke-width="1.2"/>');
        lay.pts.push([pl.cx - cr, pl.cy - cr], [pl.cx + cr, pl.cy + cr]);
      }
      lay.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      lay.labels.push({ box: pl.box, own: sp.own, text: sp.text });
      lay.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
    return lay;
  }
  // ---- 第2波G-3: polygon(多角形の内角・n=3〜6) ----
  // 頂点配置=接円(incircle)接線構成: 全辺を共通の内接円(ρ=1)に接する直線とし、隣接接線の交点を頂点とする。
  // 外角=隣接辺の回転角=(180−内角)で法線は総回転360°→必ず閉じ・必ず凸(乱数なし・n非依存の統一式。
  // g05 quad_angleのAD探索(n=4の2自由度探索)を、閉形のn一般構成へ一般化)。最短辺はρスケールで担保。
  var POLY_TARGET = 226;   // 目標最大寸法(既存図とUI整合)
  function polygonGeom(fp) {
    var angles = (fp.angles || []).map(function (a) { return Number(a.v); });
    var n = angles.length, verts = fp.vertices || [];
    if (verts.length !== n) throw new Error('polygon契約違反: vertices数' + verts.length + '≠angles数' + n);
    if (n < 3 || n > 6) throw new Error('polygon契約違反: n=' + n + ' は3..6');
    var sum = 0; for (var i = 0; i < n; i++) sum += angles[i];
    if (Math.floor(sum + 0.5) !== (n - 2) * 180) throw new Error('polygon契約違反: 内角和' + sum + '≠' + ((n - 2) * 180));
    for (var j = 0; j < n; j++) if (!(angles[j] > 0 && angles[j] < 180)) throw new Error('polygon契約違反: 内角' + angles[j] + 'は(0,180)=凸必須');
    var dirs = [0];
    for (var k = 1; k < n; k++) dirs.push(dirs[k - 1] + (180 - angles[k]));
    var nrm = dirs.map(function (dd) { return [Math.sin(dd * DEG), -Math.cos(dd * DEG)]; });   // 外向き法線
    var Vraw = [];
    for (var m = 0; m < n; m++) { var a = nrm[(m - 1 + n) % n], b = nrm[m], det = a[0] * b[1] - a[1] * b[0]; Vraw.push([(b[1] - a[1]) / det, (a[0] - b[0]) / det]); }
    var xs = Vraw.map(function (p) { return p[0]; }), ys = Vraw.map(function (p) { return p[1]; });
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs), h = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    var sc = POLY_TARGET / Math.max(w, h);
    var mx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2, my = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
    var pts = Vraw.map(function (p) { return [(p[0] - mx) * sc, (p[1] - my) * sc]; });
    var cen = [0, 0]; pts.forEach(function (p) { cen[0] += p[0] / n; cen[1] += p[1] / n; });
    var edges = []; for (var e = 0; e < n; e++) edges.push(Math.hypot(pts[e][0] - pts[(e + 1) % n][0], pts[e][1] - pts[(e + 1) % n][1]));
    return { pts: pts, cen: cen, angles: angles, n: n, min_edge: Math.min.apply(null, edges), edges: edges, scale: sc };
  }
  // 頂点Vでの内角[a0,a1](world度・span≈内角値・内側=重心向き)
  function polyInteriorArc(g, i) {
    var n = g.n, V = g.pts[i], P = g.pts[(i - 1 + n) % n], Q = g.pts[(i + 1) % n];
    var aP = Math.atan2(P[1] - V[1], P[0] - V[0]) / DEG, aN = Math.atan2(Q[1] - V[1], Q[0] - V[0]) / DEG;
    var span = ((aN - aP) % 360 + 360) % 360, av = g.angles[i];
    if (Math.abs(span - av) < 1) return { a0: aP, a1: aP + span };
    return { a0: aN, a1: aN + (360 - span) };
  }
  // 直角マーク(小正方形・教科書標準記法)。angle_figure系共通: 既知角==90°のとき弧+「90°」の代わりに
  // 頂点Vの角内側へ一辺≈10pxの小正方形を描く。e1,e2=Vからの2辺方向(world単位)。既知緑。
  // ★非対称(契約): role=unknownは値が90でも直角マークにせず赤弧+∠xのまま——マーク化すると
  //   「90°」という答えが図から視認で漏れるため。既知(=与件)のみマーク化する。
  function rightAngleMark(Vw, e1, e2, sidePx) {
    var s = sidePx || 10;
    var P1 = [Vw[0] + e1[0] * s, Vw[1] + e1[1] * s], P2 = [Vw[0] + e2[0] * s, Vw[1] + e2[1] * s], Cn = [Vw[0] + (e1[0] + e2[0]) * s, Vw[1] + (e1[1] + e2[1]) * s];
    var f1 = worldFlip(P1), f2 = worldFlip(P2), fc = worldFlip(Cn);
    return { el: '<path d="M ' + f1[0].toFixed(2) + ' ' + f1[1].toFixed(2) + ' L ' + fc[0].toFixed(2) + ' ' + fc[1].toFixed(2) + ' L ' + f2[0].toFixed(2) + ' ' + f2[1].toFixed(2) + '" fill="none" stroke="' + C_KNOWN + '" stroke-width="1.6"/>',
      pts: [f1, f2, fc], seg1: [f1, fc], seg2: [fc, f2] };
  }
  // 書式ゆらぎ吸収(意味不変の正書式化・契約検査throwが最終防衛)。バンク設計側の記法(頂点名・辺名ペア・
  // external単体)を builder 正書式(頂点{name}・辺index・external配列/at-index)へ機械変換する。
  function polyNameIdx(names, nm) { return names.indexOf(nm); }
  function polyEdgeFromPair(names, pair) {   // 辺名ペア[n1,n2]→辺index(隣接頂点間の辺)。既にindexならそのまま。
    if (!Array.isArray(pair)) return pair;
    if (typeof pair[0] === 'number') return pair[0];
    var n = names.length, i1 = names.indexOf(pair[0]), i2 = names.indexOf(pair[1]);
    for (var e = 0; e < n; e++) { var a = e, b = (e + 1) % n; if ((a === i1 && b === i2) || (a === i2 && b === i1)) return e; }
    return -1;
  }
  function normalizePolygonFp(fp) {
    var names = (fp.vertices || []).map(function (v) { return typeof v === 'string' ? v : (v && v.name); });
    var out = Object.assign({}, fp);
    out.vertices = names.map(function (nm) { return { name: nm }; });
    if (fp.external) {   // 単体obj→配列 / vertex名→at-index
      var exs = Array.isArray(fp.external) ? fp.external : [fp.external];
      out.external = exs.map(function (ex) { var e = Object.assign({}, ex); if (e.at == null && e.vertex != null) e.at = names.indexOf(e.vertex); return e; });
    }
    if (fp.equal_marks) {   // 辺名ペア列(フラット=同一等長)→ marks(edge index・ticks1)
      out.marks = (fp.marks || []).concat([{ ticks: 1, edges: fp.equal_marks.map(function (pr) { return polyEdgeFromPair(names, pr); }) }]);
    }
    if (fp.parallel_marks) out.parallel_marks = fp.parallel_marks.map(function (pr) { return polyEdgeFromPair(names, pr); });   // 辺index(フラット)へ
    return out;
  }
  function polygonLayout(fp) {
    fp = normalizePolygonFp(fp);   // 書式正規化
    var uStyle = fp.unknown_style || 'bare_zx';
    var g = polygonGeom(fp), n = g.n, lay = newLayout();
    var W = g.pts.map(worldFlip);
    lay.parts.push(polygonEl(W, '#ffffff', 2));                 // 白塗り+青枠
    W.forEach(function (p) { lay.pts.push(p); });
    for (var e = 0; e < n; e++) lay.segs.push({ id: 'e' + e, p1: W[e], p2: W[(e + 1) % n] });   // 辺e = V_e→V_{e+1}
    var specs = [];
    var extSet = {}; (fp.external || []).forEach(function (ex) { extSet[Number(ex.at)] = 1; });   // 外角を持つ頂点(延長線を頂点名のown扱いに)
    // 内角の弧+ラベル / 頂点名
    (fp.angles || []).forEach(function (a, i) {
      var role = a.role || 'plain', Vw = g.pts[i];
      var arc = polyInteriorArc(g, i), bis = (arc.a0 + arc.a1) / 2;
      if (role !== 'plain') {
        var isUn = role === 'unknown';
        if (!isUn && Math.floor(g.angles[i] + 0.5) === 90) {
          // 既知の直角=小正方形マーク(弧+「90°」を描かない)。unknownは値90でも下のarc経路(∠x)=非対称。
          var nx = g.pts[(i + 1) % n], pv = g.pts[(i - 1 + n) % n];
          var l1 = Math.hypot(nx[0] - Vw[0], nx[1] - Vw[1]), l2 = Math.hypot(pv[0] - Vw[0], pv[1] - Vw[1]);
          var rm = rightAngleMark(Vw, [(nx[0] - Vw[0]) / l1, (nx[1] - Vw[1]) / l1], [(pv[0] - Vw[0]) / l2, (pv[1] - Vw[1]) / l2]);
          lay.parts.push(rm.el);
          lay.segs.push({ id: 'rm' + i, p1: rm.seg1[0], p2: rm.seg1[1] }, { id: 'rm' + i, p1: rm.seg2[0], p2: rm.seg2[1] });
          rm.pts.forEach(function (p) { lay.pts.push(p); });
        } else {
          var col = isUn ? C_TARGET : C_KNOWN, wdt = isUn ? 2 : 1.6, r = isUn ? ANGLE_UR : ANGLE_KR;
          var aw = arcPath(Vw, r, arc.a0, arc.a1, col, wdt); lay.parts.push(aw.el);
          aw.ext.forEach(function (p) { lay.pts.push(p); });
          var text = isUn ? (uStyle === 'circle_x' ? 'x' : (a.label != null ? String(a.label) : '∠x')) : (a.label != null ? String(a.label) : Math.floor(g.angles[i] + 0.5) + '°');
          specs.push({ role: role, text: text, anchor: worldFlip(Vw), dir: [Math.cos(bis * DEG), -Math.sin(bis * DEG)],
            cands: isUn ? ANGLE_UN_CANDS : ANGLE_KN_CANDS, color: col, own: ['e' + i, 'e' + ((i - 1 + n) % n)] });
        }
      }
      var nm = (fp.vertices[i] || {}).name;
      if (nm != null) specs.push({ role: 'name', text: String(nm), anchor: worldFlip(Vw), dir: [-Math.cos(bis * DEG), Math.sin(bis * DEG)],
        cands: [[13, 13], [16, 13], [19, 12], [23, 12], [27, 12]], color: C_STROKE, own: extSet[i] ? ['e' + i, 'e' + ((i - 1 + n) % n), 'ext' + i] : ['e' + i, 'e' + ((i - 1 + n) % n)] });
    });
    // 等長マーク(二等辺・平行四辺形の等辺): {ticks, edges:[edgeIdx…]} を辺中点に垂直チョン
    (fp.marks || []).forEach(function (mk) {
      (mk.edges || []).forEach(function (ei) {
        var p1 = W[ei], p2 = W[(ei + 1) % n], mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        var dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy); dx /= len; dy /= len;
        var px = -dy, py = dx, t = mk.ticks || 1;
        for (var s = 0; s < t; s++) {
          var off = (s - (t - 1) / 2) * 3.2, c = [mid[0] + dx * off, mid[1] + dy * off];
          lay.parts.push(lineEl([c[0] - px * 4.5, c[1] - py * 4.5], [c[0] + px * 4.5, c[1] + py * 4.5], C_STROKE, 1.6));
        }
        lay.pts.push(mid);
      });
    });
    // 平行辺マーク: 辺indexフラット列を方向で自動グループ化し、グループ順位+1本の「>」を描く
    // (>=第1平行対・>>=第2平行対。平行四辺形の2対を区別する教科書記法)。
    (function () {
      var pm = fp.parallel_marks || []; if (!pm.length) return;
      var groups = [];
      pm.forEach(function (ei) {
        var p1 = g.pts[ei], p2 = g.pts[(ei + 1) % n], dx = p2[0] - p1[0], dy = p2[1] - p1[1], l = Math.hypot(dx, dy); dx /= l; dy /= l;
        var grp = null; for (var k = 0; k < groups.length; k++) if (Math.abs(groups[k].dir[0] * dy - groups[k].dir[1] * dx) < 0.03) { grp = groups[k]; break; }
        if (grp) grp.edges.push(ei); else groups.push({ dir: [dx, dy], edges: [ei] });
      });
      groups.forEach(function (gr, gi) {
        gr.edges.forEach(function (ei) {
          var p1 = W[ei], p2 = W[(ei + 1) % n], mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
          var dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy); dx /= len; dy /= len;
          var px = -dy, py = dx, cnt = gi + 1;
          for (var c = 0; c < cnt; c++) {
            var base = mid[0] - dx * ((cnt - 1) * 1.75) + dx * c * 3.5, basy = mid[1] - dy * ((cnt - 1) * 1.75) + dy * c * 3.5;
            var tip = [base + dx * 3.5, basy + dy * 3.5], b1 = [base - dx * 2 + px * 5, basy - dy * 2 + py * 5], b2 = [base - dx * 2 - px * 5, basy - dy * 2 - py * 5];
            lay.parts.push('<path d="M ' + b1[0].toFixed(2) + ' ' + b1[1].toFixed(2) + ' L ' + tip[0].toFixed(2) + ' ' + tip[1].toFixed(2) + ' L ' + b2[0].toFixed(2) + ' ' + b2[1].toFixed(2) + '" fill="none" stroke="' + C_STROKE + '" stroke-width="1.5"/>');
            lay.pts.push(b1, b2, tip);
          }
        });
      });
    })();
    // 外角(辺の延長線+外角弧)。external:[{at:vertexIdx, role, label, v}] v=180−内角
    (fp.external || []).forEach(function (ex) {
      var i = Number(ex.at), Vw = g.pts[i], Pw = g.pts[(i - 1 + n) % n], Qw = g.pts[(i + 1) % n];
      var av = g.angles[i], extAng = 180 - av;
      if (ex.v != null && Math.floor(Number(ex.v) + 0.5) !== Math.floor(extAng + 0.5)) throw new Error('polygon契約違反: 頂点' + i + 'の外角=' + extAng + ' だが v=' + ex.v);
      var din = [Vw[0] - Pw[0], Vw[1] - Pw[1]], dl = Math.hypot(din[0], din[1]); din = [din[0] / dl, din[1] / dl];
      var extEnd = [Vw[0] + din[0] * 40, Vw[1] + din[1] * 40];
      lay.parts.push(lineEl(worldFlip(Vw), worldFlip(extEnd), C_STROKE, 2));
      lay.segs.push({ id: 'ext' + i, p1: worldFlip(Vw), p2: worldFlip(extEnd) });
      lay.pts.push(worldFlip(extEnd));
      // 外角弧: 延長線方向 → 次の辺方向(V→Q)
      var aExt = Math.atan2(din[1], din[0]) / DEG, aQ = Math.atan2(Qw[1] - Vw[1], Qw[0] - Vw[0]) / DEG;
      var span = ((aQ - aExt) % 360 + 360) % 360; if (Math.abs(span - extAng) > 1) span = -(360 - span);
      var role = ex.role || 'known', isUn = role === 'unknown', col = isUn ? C_TARGET : C_KNOWN, r = isUn ? ANGLE_UR : ANGLE_KR;
      var aw = arcPath(Vw, r, aExt, aExt + span, col, isUn ? 2 : 1.6); lay.parts.push(aw.el); aw.ext.forEach(function (p) { lay.pts.push(p); });
      var bis = aExt + span / 2;
      var text = isUn ? '∠x' : (ex.label != null ? String(ex.label) : Math.floor(extAng + 0.5) + '°');
      specs.push({ role: role, text: text, anchor: worldFlip(Vw), dir: [Math.cos(bis * DEG), -Math.sin(bis * DEG)], cands: isUn ? ANGLE_UN_CANDS : ANGLE_KN_CANDS, color: col, own: ['ext' + i, 'e' + i] });
    });
    // 配置
    specs.forEach(function (sp) {
      var others = lay.labels.map(function (l) { return l.box; });
      var ownSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) >= 0; });
      var otherSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) < 0; });
      var pl = placeLbl(sp.anchor, [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands);
      if (sp.role === 'unknown' && uStyle !== 'bare_zx') {
        var cr = pl.fs * (uStyle === 'circle_x' ? 1.15 : 0.95);
        lay.parts.push('<circle cx="' + pl.cx.toFixed(2) + '" cy="' + pl.cy.toFixed(2) + '" r="' + cr.toFixed(1) + '" fill="#fff" stroke="' + C_TARGET + '" stroke-width="1.2"/>');
        lay.pts.push([pl.cx - cr, pl.cy - cr], [pl.cx + cr, pl.cy + cr]);
      }
      lay.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      lay.labels.push({ box: pl.box, own: sp.own, text: sp.text });
      lay.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
    return lay;
  }
  // ---- 第2波G-4a: congruent_pair(合同な三角形2つの求角) ----
  // 左=接円接線構成そのまま、右=同一形状の決定的変換(ミラー+固定回転CONG_ROT+平行移動)。
  // 「向きは違うが合同」の教科書標準見え。乱数なし。対応マーク: 等長チョン(対応辺1/2/3本)・
  // 等角弧(対応角1/2重・§3積み残しの実装)。答=対応角の転写(数値・経路A)。
  var CONG_TARGET = 148, CONG_GAP = 54, CONG_ROT = 22;
  function congruentPairGeom(fp) {
    var angles = (fp.angles || []).map(function (a) { return Number(a && a.v != null ? a.v : a); });
    if (angles.length !== 3) throw new Error('congruent_pair契約違反: angles=3(三角形)必須');
    var sum = angles[0] + angles[1] + angles[2];
    if (Math.floor(sum + 0.5) !== 180) throw new Error('congruent_pair契約違反: 内角和' + sum + '≠180');
    for (var i = 0; i < 3; i++) if (!(angles[i] > 0 && angles[i] < 180)) throw new Error('congruent_pair契約違反: 内角' + angles[i] + 'は(0,180)');
    var base = polygonGeom({ vertices: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], angles: angles.map(function (v) { return { v: v }; }) });
    var xs = base.pts.map(function (p) { return p[0]; }), ys = base.pts.map(function (p) { return p[1]; });
    var bw = Math.max.apply(null, xs) - Math.min.apply(null, xs), bh = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    var sc = CONG_TARGET / Math.max(bw, bh);
    var cx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2, cy = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
    var T = base.pts.map(function (p) { return [(p[0] - cx) * sc, (p[1] - cy) * sc]; });   // 原点中心・正規化した基本形
    var DX = CONG_TARGET / 2 + CONG_GAP / 2;
    var left = T.map(function (p) { return [p[0] - DX, p[1]]; });
    var rr = CONG_ROT * DEG, C = Math.cos(rr), S = Math.sin(rr);
    var right = T.map(function (p) { var mx = -p[0], my = p[1]; return [mx * C - my * S + DX, mx * S + my * C]; });   // ミラー+回転+右へ平行移動
    return { left: left, right: right, angles: angles, DX: DX };
  }
  // 書式ゆらぎ吸収(意味不変の正書式化・G-3方式)。バンク設計側の記法(left_vertices/right_vertices・
  // angles[i]のleft/right role+label_right・side_ticks配列)を builder 正書式へ機械変換する。
  function normalizeCongruentFp(fp) {
    var out = Object.assign({}, fp);
    var ln = fp.left_vertices || (fp.left && fp.left.names) || ['A', 'B', 'C'];
    var rn = fp.right_vertices || (fp.right && fp.right.names) || ['D', 'E', 'F'];
    var leftShow = (fp.left && fp.left.show) ? fp.left.show.slice() : [];
    var rightShow = (fp.right && fp.right.show) ? fp.right.show.slice() : [];
    var angleVals = fp.angles;
    if (fp.angles && fp.angles.some(function (a) { return a && (a.left != null || a.right != null); })) {
      leftShow = []; rightShow = [];
      fp.angles.forEach(function (a, i) {
        if (a.left && a.left !== 'plain') leftShow.push({ at: i, role: a.left, label: a.label_left });
        if (a.right && a.right !== 'plain') rightShow.push({ at: i, role: a.right, label: a.label_right });
      });
      angleVals = fp.angles.map(function (a) { return { v: a.v }; });
    }
    out.angles = angleVals; out.left = { names: ln, show: leftShow }; out.right = { names: rn, show: rightShow };
    // mark_scheme(G-4b): SSS/SAS/ASA の静的マーク構成(G-4a資産 side_ticks/angle_marks の構成替え)。
    // 辺e0=V0-V1・e1=V1-V2・e2=V2-V0。角Vi=辺e(i-1)とeiの間。角度値は全plain(shows空)=マークだけで条件判定。
    if (fp.mark_scheme) {
      var MS = {
        SSS: { side_ticks: [1, 2, 3], angle_marks: [] },                                          // 対応3辺チョン1/2/3本
        SAS: { side_ticks: [1, 2, 0], angle_marks: [{ weight: 1, at: [1] }] },                    // 2辺(e0,e1)チョン+間の角V1に等角弧
        ASA: { side_ticks: [1, 0, 0], angle_marks: [{ weight: 1, at: [0] }, { weight: 2, at: [1] }] } // 1辺(e0)チョン+両端角V0,V1に等角弧2種
      };
      var ms = MS[String(fp.mark_scheme).toUpperCase()];   // 大小非依存(バンクはsss/sas/asa小文字)
      if (!ms) throw new Error('congruent_pair契約違反: 未知mark_scheme ' + fp.mark_scheme);
      if (fp.side_ticks == null) out.side_ticks = ms.side_ticks;
      if (fp.angle_marks == null) out.angle_marks = ms.angle_marks;
    }
    return out;
  }
  function congruentPairLayout(fp) {
    fp = normalizeCongruentFp(fp);   // 書式正規化
    var uStyle = fp.unknown_style || 'bare_zx';
    var g = congruentPairGeom(fp), lay = newLayout(), specs = [];
    var lnames = (fp.left && fp.left.names) || ['A', 'B', 'C'], rnames = (fp.right && fp.right.names) || ['D', 'E', 'F'];
    function processTri(pts, prefix, names, showList) {
      var W = pts.map(worldFlip);
      lay.parts.push(polygonEl(W, '#ffffff', 2)); W.forEach(function (p) { lay.pts.push(p); });
      for (var e = 0; e < 3; e++) lay.segs.push({ id: prefix + e, p1: W[e], p2: W[(e + 1) % 3] });
      var cen = [0, 0]; pts.forEach(function (p) { cen[0] += p[0] / 3; cen[1] += p[1] / 3; });
      var gg = { n: 3, pts: pts, angles: g.angles };
      for (var i = 0; i < 3; i++) {
        var Vw = pts[i], ac = Math.atan2(cen[1] - Vw[1], cen[0] - Vw[0]) / DEG;
        specs.push({ role: 'name', text: names[i], anchor: worldFlip(Vw), dir: [-Math.cos(ac * DEG), Math.sin(ac * DEG)],
          cands: [[13, 13], [16, 13], [19, 12], [23, 12], [27, 12]], color: C_STROKE, own: [prefix + i, prefix + ((i - 1 + 3) % 3)] });
      }
      (showList || []).forEach(function (sh) {
        var i = Number(sh.at), Vw = pts[i], role = sh.role || 'known', arc = polyInteriorArc(gg, i), bis = (arc.a0 + arc.a1) / 2;
        var isUn = role === 'unknown', col = isUn ? C_TARGET : C_KNOWN, w = isUn ? 2 : 1.6, r = isUn ? ANGLE_UR : ANGLE_KR;
        var aw = arcPath(Vw, r, arc.a0, arc.a1, col, w); lay.parts.push(aw.el); aw.ext.forEach(function (p) { lay.pts.push(p); });
        var text = isUn ? (uStyle === 'circle_x' ? 'x' : (sh.label != null ? String(sh.label) : '∠x')) : (sh.label != null ? String(sh.label) : Math.floor(g.angles[i] + 0.5) + '°');
        specs.push({ role: role, text: text, anchor: worldFlip(Vw), dir: [Math.cos(bis * DEG), -Math.sin(bis * DEG)],
          cands: isUn ? ANGLE_UN_CANDS : ANGLE_KN_CANDS, color: col, own: [prefix + i, prefix + ((i - 1 + 3) % 3)] });
      });
    }
    processTri(g.left, 'L', lnames, (fp.left || {}).show);
    processTri(g.right, 'R', rnames, (fp.right || {}).show);
    // 対応辺の等長チョン: side_ticks=true → 辺e(=0,1,2)に(e+1)本 / 配列 → side_ticks[e]本。対応辺が同本数=合同の視認。
    if (fp.side_ticks) {
      var tickCounts = Array.isArray(fp.side_ticks) ? fp.side_ticks : [1, 2, 3];
      [g.left, g.right].forEach(function (pts) {
        var W = pts.map(worldFlip);
        for (var e = 0; e < 3; e++) {
          var p1 = W[e], p2 = W[(e + 1) % 3], mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
          var dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy); dx /= len; dy /= len;
          var px = -dy, py = dx, cnt = tickCounts[e] != null ? tickCounts[e] : (e + 1);
          for (var c = 0; c < cnt; c++) { var off = (c - (cnt - 1) / 2) * 3.2, cc = [mid[0] + dx * off, mid[1] + dy * off]; lay.parts.push(lineEl([cc[0] - px * 4.5, cc[1] - py * 4.5], [cc[0] + px * 4.5, cc[1] + py * 4.5], C_STROKE, 1.6)); }
          lay.pts.push(mid);
        }
      });
    }
    // 対応角の等角弧(§3積み残し): angle_marks:[{weight, at:[idx…]}] → 各対応角に weight 重の同心弧(青・値弧と別色系)。
    (fp.angle_marks || []).forEach(function (am) {
      var weight = am.weight || 1;
      [g.left, g.right].forEach(function (pts) {
        var gg = { n: 3, pts: pts, angles: g.angles };
        (am.at || []).forEach(function (i) {
          var Vw = pts[i], arc = polyInteriorArc(gg, i);
          for (var w = 0; w < weight; w++) { var aw = arcPath(Vw, 12 + w * 4, arc.a0, arc.a1, C_STROKE, 1.3); lay.parts.push(aw.el); aw.ext.forEach(function (p) { lay.pts.push(p); }); }
        });
      });
    });
    specs.forEach(function (sp) {
      var others = lay.labels.map(function (l) { return l.box; });
      var ownSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) >= 0; });
      var otherSegs = lay.segs.filter(function (s) { return sp.own.indexOf(s.id) < 0; });
      var pl = placeLbl(sp.anchor, [sp.dir], sp.text, others, ownSegs, otherSegs, sp.cands);
      if (sp.role === 'unknown' && uStyle !== 'bare_zx') { var cr = pl.fs * (uStyle === 'circle_x' ? 1.15 : 0.95); lay.parts.push('<circle cx="' + pl.cx.toFixed(2) + '" cy="' + pl.cy.toFixed(2) + '" r="' + cr.toFixed(1) + '" fill="#fff" stroke="' + C_TARGET + '" stroke-width="1.2"/>'); lay.pts.push([pl.cx - cr, pl.cy - cr], [pl.cx + cr, pl.cy + cr]); }
      lay.parts.push(textEl(pl.cx, pl.cy, sp.text, pl.fs, sp.color));
      lay.labels.push({ box: pl.box, own: sp.own, text: sp.text });
      lay.pts.push([pl.box.x0, pl.box.y0], [pl.box.x1, pl.box.y1]);
    });
    return lay;
  }
  function angleFigureLayout(fp) {
    if (fp.subkind === 'angle_around_point') return angleAroundPointLayout(fp);
    if (fp.subkind === 'parallel_lines') return parallelLinesLayout(fp);
    if (fp.subkind === 'polygon') return polygonLayout(fp);
    if (fp.subkind === 'congruent_pair') return congruentPairLayout(fp);
    throw new Error('angle_figure: 未対応subkind ' + fp.subkind);
  }

  // ==== 小学第2波: clock_face(時計文字盤・読み専用・実需起点第1号) ====
  // 真円文字盤(<circle>=構造的真円・corr-0019/0022系の要素種別切り分けに整合)+数字1〜12(円周配置)+
  // 分目盛60(5分毎に長目盛)+針2本(短針=太短・長針=細長)。針角度は決定的:
  // 短針=30h+0.5m度・長針=6m度(12時方向=0度・時計回り)。契約: h∈[1,12]・m∈[0,59]。
  var CLOCK_R = 92, CLOCK_NUM_R = 71, CLOCK_HOUR_LEN = 36, CLOCK_MIN_LEN = 56;
  function clockPos(deg, r) { var t = deg * DEG; return [r * Math.sin(t), r * Math.cos(t)]; }   // world(y上)・12時=+y・時計回り
  function clockFaceGeom(fp) {
    var h = Math.floor(Number(fp.h)), m = Math.floor(Number(fp.m));
    if (!(h >= 1 && h <= 12)) throw new Error('clock_face契約違反: h=' + fp.h + ' は[1,12]');
    if (!(m >= 0 && m <= 59)) throw new Error('clock_face契約違反: m=' + fp.m + ' は[0,59]');
    var hourAngle = 30 * h + 0.5 * m, minAngle = 6 * m;
    return { h: h, m: m, R: CLOCK_R, numR: CLOCK_NUM_R, hourLen: CLOCK_HOUR_LEN, minLen: CLOCK_MIN_LEN,
      hourAngle: hourAngle, minAngle: minAngle,
      hourTip: clockPos(hourAngle, CLOCK_HOUR_LEN), minTip: clockPos(minAngle, CLOCK_MIN_LEN),
      numbers: (function () { var a = []; for (var k = 1; k <= 12; k++) a.push(clockPos(30 * k, CLOCK_NUM_R)); return a; })() };
  }
  function clockFaceLayout(fp) {
    var g = clockFaceGeom(fp), lay = newLayout(), c = worldFlip([0, 0]);
    // 文字盤(真円)+外周点束縛
    lay.parts.push('<circle cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" r="' + g.R + '" fill="#ffffff" stroke="' + C_STROKE + '" stroke-width="2.4"/>');
    lay.pts.push(worldFlip([-g.R, 0]), worldFlip([g.R, 0]), worldFlip([0, -g.R]), worldFlip([0, g.R]));
    // 分目盛60(5分毎=長・太)
    for (var i = 0; i < 60; i++) {
      var five = (i % 5 === 0), a = 6 * i;
      var p1 = worldFlip(clockPos(a, g.R - (five ? 9 : 4.5))), p2 = worldFlip(clockPos(a, g.R - 1.2));
      lay.parts.push(lineEl(p1, p2, C_STROKE, five ? 1.8 : 1));
    }
    // 針2本(描き分け: 短針=太短・長針=細長)。segs登録=数字ラベルとのclearance対象。
    var ht = worldFlip(g.hourTip), mt = worldFlip(g.minTip);
    lay.parts.push(lineEl(c, mt, C_STROKE, 2.2)); lay.segs.push({ id: 'mh', p1: c, p2: mt });
    lay.parts.push(lineEl(c, ht, C_STROKE, 4.6)); lay.segs.push({ id: 'hh', p1: c, p2: ht });
    lay.parts.push('<circle cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" r="3.4" fill="' + C_STROKE + '"/>');
    // 数字1〜12(固定円周配置・手動label box=針とのclearance検査対象)
    for (var k = 1; k <= 12; k++) {
      var np = worldFlip(g.numbers[k - 1]);
      lay.parts.push(textEl(np[0], np[1], String(k), 14, C_STROKE));
      var box = textBox([np[0], np[1]], String(k), 14);
      lay.labels.push({ box: box, own: '', text: String(k) });
      lay.pts.push([box.x0, box.y0], [box.x1, box.y1]);
    }
    return lay;
  }

  var C_LAYOUTS = {
    tri_angle: triAngleLayout, tri_angle_iso: triAngleIsoLayout, quad_angle: quadAngleLayout,
    para_area: paraAreaLayout, tri_area: triAreaLayout, trap_area: trapAreaLayout,
    rhombus_area: rhombusAreaLayout, circle: circleLayout, cuboid: cuboidLayout, prism: prismLayout,
    pyramid: pyramidLayout, cylinder: cylinderLayout, cone: coneLayout, sphere: sphereLayout,
    rotation_source: rotationSourceLayout, clock_face: clockFaceLayout, composite_circle: compositeCircleLayout, composite_area: compositeAreaLayout, line_set: lineSetLayout, sym_figure: symFigureLayout,
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
  // angle_figure限定のviewport整合(既存kindのlayoutToSvg出力は非接触=golden不変)。
  // width/height を viewBox の w,h と厳密一致させ(ceil由来の縦横比ズレを排除)、preserveAspectRatio=meetを明示。
  // → consumerがnone/固定枠で描画しても円弧が楕円化(潰れ)しない。angle_figure_vectorsで関門化。
  function matchViewportAspect(svg) {
    var m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/);
    if (!m) return svg;
    return svg.replace(/ width="[^"]*" height="[^"]*"/, ' width="' + m[1] + '" height="' + m[2] + '" preserveAspectRatio="xMidYMid meet"');
  }
  BUILDERS.angle_figure = function (fp) { return matchViewportAspect(layoutToSvg(angleFigureLayout(fp))); };

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
  // e-2: line_setの監査(角度差/包含/交点/ラベル帰属を描画と同じ導出で独立再計算)
  FigureBuilder._lsStats = function (on) { LS_STATS = on ? {} : null; return LS_STATS; };
  FigureBuilder._symFigureAudit = function (fp) {   // 対称第1便 関門用: 写像・幾何ガード・ラベル帰属・辺長を独立導出で返す
    var g = symFigureGeom(fp), lay = sfLayoutFromGeom(g, fp);
    var iss = g.regular ? [] : sfValidate(g.V, g.n, g.sym, g.k, Math.min(7, Number(fp.half) || SF_HALF));
    if (g.regular) for (var ri = 0; ri < g.n; ri++) { var im = sfImage(g.V[ri], g.sym), rj = sfMapIdx(g.n, g.sym, g.k, ri); if (Math.hypot(g.V[rj][0] - im[0], g.V[rj][1] - im[1]) > 1e-6) iss.push('symmetry:' + ri); }
    var out = { issues: iss, map: g.map, n: g.n, sym: g.sym, k: g.k, labels: [], angles: sfInteriorAngles(g.V), V: g.V, sub: g.sub };
    lay.labels.forEach(function (lb) {
      if (!/^v_/.test(lb.own)) return;
      var cx = (lb.box.x0 + lb.box.x1) / 2, cy = (lb.box.y0 + lb.box.y1) / 2, best = -1, bd = 1e9;
      lay._vpx.forEach(function (q, i) { var d = Math.hypot(q[0] - cx, q[1] - cy); if (d < bd) { bd = d; best = i; } });
      out.labels.push({ own: lb.own, nearest: 'v_' + best, ok: 'v_' + best === lb.own });
    });
    out.dist = function (a, b) { var i = g.labels.indexOf(a), j = g.labels.indexOf(b); return Math.hypot(g.V[i][0] - g.V[j][0], g.V[i][1] - g.V[j][1]); };
    return out;
  };
  FigureBuilder._lineSetAudit = function (fp) {
    var g = lineSetGeom(fp), lay = lineSetLayout(fp);
    var out = { issues: lsValidate(g.lines, g.pairs, fp.density), labels: [], cross: {}, transversals: 0, perp: [], template: g.template };
    (function () { var byL = {}; g.lines.forEach(function (l) { byL[l.label] = l; });
      (g.pairs.perpendicular || []).forEach(function (p) { var c = lsPerpClass(byL[p[0]], byL[p[1]]); out.perp.push({ pair: p.join(''), kind: c ? c.kind : null, X: c ? [c.X.x, c.X.y] : null, ra: c && c.ra, rb: c && c.rb }); }); })();
    g.lines.forEach(function (l) { out.cross[l.label] = 0; });
    for (var i = 0; i < g.lines.length; i++) for (var j = i + 1; j < g.lines.length; j++) if (lsSegInter(g.lines[i], g.lines[j])) { out.cross[g.lines[i].label]++; out.cross[g.lines[j].label]++; }
    (g.pairs.parallel || []).forEach(function (p) {
      var A = g.lines.filter(function (l) { return l.label === p[0]; })[0], B = g.lines.filter(function (l) { return l.label === p[1]; })[0];
      g.lines.forEach(function (l) { if (l.label !== p[0] && l.label !== p[1] && lsSegInter(l, A) && lsSegInter(l, B)) out.transversals++; });
    });
    lay.labels.forEach(function (lb) {
      var nearest = null, nd = 1e9;
      lay.segs.forEach(function (s) { var dd = boxSeg(lb.box, s.p1, s.p2); if (dd < nd) { nd = dd; nearest = s.id; } });
      out.labels.push({ own: lb.own, nearest: nearest, ok: nearest === lb.own });
    });
    return out;
  };
  // P5-3検収差し戻しr2: composite_areaの帰属/マーク監査(ラベル最近傍辺・マーク中心の90°扇形内判定)
  FigureBuilder._compositeAreaAudit = function (fp) {
    var lay = compositeAreaLayout(fp);
    var out = { labels: [], marks: [] };
    // 外形bbox(リーダー出口の独立再計算用)
    var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    lay.segs.forEach(function (s) {
      if (!/^(top|bottom|left|right)/.test(s.id)) return;
      [s.p1, s.p2].forEach(function (p) { bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]); bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]); });
    });
    lay._caAudit.labels.forEach(function (a, i) {
      var lb = lay.labels[i + 0];
      // finishLabelsはlbls順にlayout.labelsへ積む(先行labelsは無い前提=composite_area専用layout)
      var nearest = null, nd = 1e9;
      lay.segs.forEach(function (s) {
        var dd = boxSeg(lb.box, s.p1, s.p2);
        if (dd < nd) { nd = dd; nearest = s.id; }
      });
      var rec = { key: a.key, own: a.own, nearest: nearest, leader: !!a.leader };
      if (a.leader) {
        var L = a.leader;
        // 起点=担当辺の中点±ε(担当セグメントから独立再計算)
        var ownSeg = null;
        lay.segs.forEach(function (s) { if (s.id === a.own) ownSeg = s; });
        var mid = ownSeg ? [(ownSeg.p1[0] + ownSeg.p2[0]) / 2, (ownSeg.p1[1] + ownSeg.p2[1]) / 2] : null;
        rec.startOnMid = !!mid && Math.hypot(L.start[0] - mid[0], L.start[1] - mid[1]) <= 0.5;
        // 長さ=出口+8pxキャップ(bboxから独立再計算)
        var d = L.d;
        var tx = d[0] > 0 ? (bx1 - L.start[0]) / d[0] : (bx0 - L.start[0]) / d[0];
        var ty = d[1] > 0 ? (by1 - L.start[1]) / d[1] : (by0 - L.start[1]) / d[1];
        var texit = Math.min(tx, ty);
        var len = Math.hypot(L.end[0] - L.start[0], L.end[1] - L.start[1]);
        rec.lenOK = len <= texit + 8 + 0.5;
        rec.diag45 = Math.abs(Math.abs(d[0]) - Math.abs(d[1])) <= 1e-9;   // 45°象限
      }
      out.labels.push(rec);
    });
    lay._caAudit.marks.forEach(function (m) {
      var rel = [m.center[0] - m.v[0], m.center[1] - m.v[1]];
      var c1 = rel[0] * m.d1[0] + rel[1] * m.d1[1], c2 = rel[0] * m.d2[0] + rel[1] * m.d2[1];
      out.marks.push({ v: m.v, inSector: c1 > 0 && c2 > 0 });
    });
    return out;
  };
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
    parallel_lines: parallelLinesGeom,           // 第2波G-2: 交点U,L座標・横断向き・平行輸送(vector用)
    parallel_wedge: parallelWedge,               // (t1,pos)→楔[a0,a1]と実角値(pos偶t1/奇180−t1)
    polygon: polygonGeom,                         // 第2波G-3: 接円接線構成の頂点座標(vector用)
    poly_interior_arc: polyInteriorArc,          // 頂点iの内角弧[a0,a1](world度)
    right_angle_mark: rightAngleMark,            // G-3.1: 直角マーク(小正方形)頂点座標(vector用)
    congruent_pair: congruentPairGeom,           // 第2波G-4a: 合同2三角形の左右座標(vector用)
    pyramid: pyramidGeom, cylinder: cylinderGeom, cone: coneGeom, sphere: sphereGeom,   // 第2ブロックS-2: 錐円系(vector用)
    pyramid_visible: pyramidVisible, convex_hull: convexHull,   // S-2.1: 隠線シルエット判定(vector用・corr-0023)
    rotation_source: rotationSourceGeom,   // 第2ブロックS-4: 回転体の源(vector用)
    clock_face: clockFaceGeom,             // 小学第2波: 時計文字盤(vector用)
    composite_circle: compositeCircleGeom, composite_area: compositeAreaGeom, line_set: lineSetGeom, sym_figure: symFigureGeom, // P-3a: 複合円(vector用) / 対称第1便
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
