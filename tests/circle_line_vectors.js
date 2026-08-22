// circle_line_vectors.js — P-3a circle v2 直径/半径線+長さラベルの幾何ベクター+corr-0020悉皆。
// 直径線=中心[0,0]通過の水平弦・半径線=中心→円周・真円(<circle> r=90維持=corr-0019)・
// ラベルと円周(rim)/中心点の最小間隔・ラベル真円非破壊・シード非依存。
// スキャン: (i)直径 d∈[2,20] (ii)半径 r∈[1,10] のラベル幅変動を悉皆(描画寸法は固定=ラベル文字数のみ変化)。
//
// 実行:  node tests/circle_line_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
const RPX = 90;

function fp(mode, v) { return { kind: 'circle', fig_version: 2, sector: 'full', mode: mode, value: v, unit: 'cm' }; }
function labelBox(svg) {
  // <text x y ...>Ncm</text> → 中心と概寸(font-size×文字数)から矩形
  const m = svg.match(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="(\d+)"[^>]*>(\d+cm)<\/text>/);
  if (!m) return null;
  const cx = +m[1], cy = +m[2] - (+m[3]) * 0.34, fs = +m[3], t = m[4];
  const w = t.length * fs * 0.62, h = fs;
  return { cx: cx, cy: cy, x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
}
function distPointRect(px, py, b) {
  const dx = Math.max(b.x0 - px, 0, px - b.x1), dy = Math.max(b.y0 - py, 0, py - b.y1);
  return Math.hypot(dx, dy);
}

console.log('=== (1) 直径/半径線の幾何(中心通過・真円・端点) ===');
[['diameter', 12], ['radius', 5], ['diameter', 8], ['radius', 9]].forEach(function (t) {
  cases++; let e = 0;
  const svg = FB.build(fp(t[0], t[1]));
  // 真円rim(r=90・<circle>)
  if (!/<circle cx="0" cy="0" r="90"[^>]*stroke-width="2"/.test(svg)) e++;
  // 線: 太1.8。直径=x1とx2が±90付近(中心通過)・半径=一端が中心(0,0)
  const ln = svg.match(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#1a56c4" stroke-width="1\.8"/);
  if (!ln) { e++; }
  else {
    const x1 = +ln[1], y1 = +ln[2], x2 = +ln[3], y2 = +ln[4];
    if (Math.abs(y1) > 0.5 || Math.abs(y2) > 0.5) e++;                 // 水平(y=0線=中心通過)
    if (t[0] === 'diameter') { if (Math.abs(Math.abs(x1) - RPX) > 0.5 || Math.abs(Math.abs(x2) - RPX) > 0.5) e++; }  // 両端=±r
    else { if (Math.min(Math.abs(x1), Math.abs(x2)) > 0.5 || Math.abs(Math.max(Math.abs(x1), Math.abs(x2)) - RPX) > 0.5) e++; }  // 一端=中心・他端=r
  }
  // ラベル
  const lb = labelBox(svg);
  if (!lb || svg.indexOf(t[1] + 'cm') < 0) e++;
  if (FB.build(fp(t[0], t[1])) !== svg) e++;
  if (svg.indexOf('undefined') >= 0) e++;
  if (e) { bad += e; console.log('  ❌ ' + t[0] + ' ' + t[1] + ' (' + e + ')'); }
});
console.log('  中心通過・真円r90・端点・ラベル・シード ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) corr-0020悉皆: (i)直径d2-20 (ii)半径r1-10 = ラベル対 円周rim/中心点 間隔 ===');
(function () {
  let n = 0, viol = 0, minRim = 1e9, minCen = 1e9, minLine = 1e9;
  const combos = [];
  for (let d = 2; d <= 20; d++) combos.push(['diameter', d]);
  for (let r = 1; r <= 10; r++) combos.push(['radius', r]);
  combos.forEach(function (t) {
    n++;
    const svg = FB.build(fp(t[0], t[1])), lb = labelBox(svg);
    if (!lb) { viol++; return; }
    // ラベル箱の4隅で円周(中心[0,0]・R=90)への内側間隔 = 90 - max|corner|
    const corners = [[lb.x0, lb.y0], [lb.x1, lb.y0], [lb.x0, lb.y1], [lb.x1, lb.y1]];
    const maxR = Math.max.apply(null, corners.map(function (c) { return Math.hypot(c[0], c[1]); }));
    const rimGap = RPX - maxR;                                   // 円周内側にどれだけ余裕があるか
    const cenGap = distPointRect(0, 0, lb);                      // 中心点(0,0)からラベル箱まで
    if (rimGap < minRim) minRim = rimGap;
    if (cenGap < minCen) minCen = cenGap;
    if (rimGap < 4 || cenGap < 4) { viol++; if (viol <= 4) console.log('  ❌ ' + t[0] + ' ' + t[1] + ' rimGap=' + rimGap.toFixed(1) + ' cenGap=' + cenGap.toFixed(1)); }
  });
  cases += n; if (viol) bad += viol;
  console.log('  組' + n + ' / 違反' + viol + ' / min(円周内側余裕 ' + minRim.toFixed(1) + 'px, 中心点間隔 ' + minCen.toFixed(1) + 'px) ' + (viol === 0 ? '✅' : '❌'));
})();

console.log('\n' + (bad === 0 ? 'circle_line: 全' + cases + '照合 一致 ✅(中心通過・真円r90・端点・ラベル対rim/中心間隔・29組悉皆・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
