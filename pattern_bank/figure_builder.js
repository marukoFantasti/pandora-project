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

  var BUILDERS = { rect_area: rectArea, angle_sum: angleSum };

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

  var FigureBuilder = { build: build, BUILDERS: BUILDERS, _angleSumMinClearance: angleSumMinClearance };
  if (typeof module !== 'undefined' && module.exports) module.exports = FigureBuilder;
  else root.FigureBuilder = FigureBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
