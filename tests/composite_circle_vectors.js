// composite_circle_vectors.js — P-3a 複合円kind(求積の受け皿)幾何ベクター+corr-0020悉皆。
// 4構成: (a)square_minus_circle(正方形−内接円・辺=直径) (b)circle_minus_circle(同心環)
//        (c)half_pair(半環) (d)circle_in_circle_side(大円−横並び小円2)。
// 内接/同心整合・真円(<circle>/<path A r r>=corr-0019)・塗り正面積契約throw・ラベル対塗り境界clearance・シード非依存。
//
// 実行:  node tests/composite_circle_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
function fp(o) { return Object.assign({ kind: 'composite_circle', unit: 'cm' }, o); }
function clr(o) { return FB._compositeCircleMinClearance(o); }

console.log('=== (1) 4構成の描画・真円・整合(幾何ベクター) ===');
[
  ['square_minus_circle', { shape: 'square_minus_circle', s: 10 }, { circle: 1, poly: 1 }],
  ['square_minus_circle', { shape: 'square_minus_circle', s: 6 }, { circle: 1, poly: 1 }],
  ['circle_minus_circle', { shape: 'circle_minus_circle', R: 8, r: 5 }, { circle: 2 }],
  ['circle_minus_circle', { shape: 'circle_minus_circle', R: 12, r: 3 }, { circle: 2 }],
  ['half_pair', { shape: 'half_pair', R: 10, r: 4 }, { arc: 2 }],
  ['half_pair', { shape: 'half_pair', R: 6, r: 2 }, { arc: 2 }],
  ['circle_in_circle_side', { shape: 'circle_in_circle_side', R: 10, r: 4 }, { circle: 3 }],
  ['circle_in_circle_side', { shape: 'circle_in_circle_side', R: 12, r: 6 }, { circle: 3 }]
].forEach(function (t) {
  cases++; let e = 0;
  const o = fp(t[1]), svg = FB.build(o), g = FB._geom.composite_circle(o);
  const nc = (svg.match(/<circle/g) || []).length, np = (svg.match(/<polygon/g) || []).length;
  const na = (svg.match(/ A (\d+(?:\.\d+)?) \1 /g) || []).length;   // <path A R R>(真円弧=corr-0019: rx==ry)
  if (t[2].circle !== undefined && nc !== t[2].circle) e++;
  if (t[2].poly !== undefined && np !== t[2].poly) e++;
  if (t[2].arc !== undefined && na !== t[2].arc) e++;
  // 全<circle>は真円(<circle>は定義上rx==ry)・全弧path はA R R(等半径)であること
  const badArc = (svg.match(/ A (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) /g) || []).some(function (m) { const p = m.trim().split(/\s+/); return p[1] !== p[2]; });
  if (badArc) e++;
  // 内接整合(a): 内円px=半辺(80) / 同心(b): rpx<Rpx / 横並び(d): 2小円が大円内(off+rpx<=Rpx)
  if (g.shape === 'square_minus_circle' && Math.abs(g.rpx - g.half) > 0.01) e++;
  if ((g.shape === 'circle_minus_circle' || g.shape === 'half_pair') && !(g.rpx < g.Rpx)) e++;
  if (g.shape === 'circle_in_circle_side' && !(g.Rpx / 2 + g.rpx <= g.Rpx + 0.01)) e++;
  // 寸法ラベル(値)描画
  const vals = t[1].s !== undefined ? [t[1].s] : [t[1].R, t[1].r];
  vals.forEach(function (v) { if (svg.indexOf(v + 'cm') < 0) e++; });
  if (FB.build(o) !== svg) e++;
  if (svg.indexOf('undefined') >= 0) e++;
  if (e) { bad += e; console.log('  ❌ ' + t[0] + ' ' + JSON.stringify(t[1]) + ' (' + e + ')'); }
});
console.log('  描画要素数・真円・整合・ラベル・シード ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) 塗り正面積の契約throw ===');
[['circle_minus_circle', { shape: 'circle_minus_circle', R: 5, r: 8 }], ['circle_minus_circle', { shape: 'circle_minus_circle', R: 5, r: 5 }],
['half_pair', { shape: 'half_pair', R: 4, r: 6 }], ['circle_in_circle_side', { shape: 'circle_in_circle_side', R: 6, r: 4 }],
['square_minus_circle', { shape: 'square_minus_circle', s: 0 }]].forEach(function (t) {
  cases++; let threw = false;
  try { FB.build(fp(t[1])); } catch (e) { threw = true; }
  if (!threw) { bad++; console.log('  ❌ 非throw ' + JSON.stringify(t[1])); }
});
console.log('  整合違反5種throw ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (3) corr-0020悉皆: 4構成×寸法域(r2-10/R>r/正方形s2-20) ラベル対塗り境界 ===');
(function () {
  let n = 0, viol = 0, minMT = 1e9, minSeg = 1e9, worst = null;
  const combos = [];
  for (let s = 2; s <= 20; s++) combos.push({ shape: 'square_minus_circle', s: s });
  for (let R = 3; R <= 12; R++) for (let r = 2; r < R; r++) { combos.push({ shape: 'circle_minus_circle', R: R, r: r }); combos.push({ shape: 'half_pair', R: R, r: r }); }
  for (let R = 4; R <= 12; R++) for (let r = 2; 2 * r <= R; r++) combos.push({ shape: 'circle_in_circle_side', R: R, r: r });
  combos.forEach(function (co) {
    n++;
    const cl = clr(fp(co));
    if (cl.minText < minMT) minMT = cl.minText;
    if (cl.minSeg < minSeg) { minSeg = cl.minSeg; worst = co; }
    if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { viol++; if (viol <= 5) console.log('  ❌ ' + JSON.stringify(co) + ' minText=' + cl.minText.toFixed(2) + ' minSeg=' + cl.minSeg.toFixed(2) + ' semBad=' + cl.semBad); }
  });
  cases += n; if (viol) bad += viol;
  console.log('  組' + n + ' / 違反' + viol + ' / min(minText ' + minMT.toFixed(1) + ', minSeg ' + minSeg.toFixed(1) + '@' + JSON.stringify(worst) + ') ' + (viol === 0 ? '✅' : '❌'));
})();

console.log('\n' + (bad === 0 ? 'composite_circle: 全' + cases + '照合 一致 ✅(4構成・内接/同心整合・真円・正面積契約・寸法域悉皆clearance・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
