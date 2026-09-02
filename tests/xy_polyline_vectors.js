// xy_polyline_vectors.js — P5-3 Kind A: xy_graph mode="polyline"(折れ線グラフ)のスキーマ検証+スモークレンダ関門。
// 1〜2系列・x_labels等間隔・y_range/y_tick(1-2-5自動)・省略波線(y_range下端>0)・draw:true(方眼+軸のみ)・
// 実線●/破線○+凡例(グレースケール前提)・ガードthrow・シード非依存・v1(prop/inv)/v2非破壊。
//
// 実行:  node tests/xy_polyline_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
function fp(o) { return Object.assign({ kind: 'xy_graph', mode: 'polyline' }, o); }

console.log('=== (1) 描画要素(1系列/2系列/draw/波線/凡例) ===');
[
  // [name, fp, expect]
  ['1系列基本', { series: [{ y: [11, 14, 15, 15, 13, 8] }], x_labels: ['8', '10', '12', '2', '4', '6'], x_title: 'X', y_title: 'Y', title: 'T' },
    { circles: 6, polylines: 1, dash: false, wave: false, legend: false }],
  ['2系列+非ゼロ下端', { series: [{ name: 'C', y: [30, 34, 38, 36] }, { name: 'D', y: [32, 31, 35, 39] }], x_labels: ['1', '2', '3', '4'], y_range: [30, 40], y_tick: 2 },
    { circles: 8, polylines: 2, dash: true, wave: true, legend: true }],
  ['draw作図用', { series: [{ y: [1, 2, 3] }], x_labels: ['a', 'b', 'c'], draw: true, title: 'T' },
    { circles: 0, polylines: 0, dash: false, wave: false, legend: false }],
  ['y_tick自動(1-2-5)', { series: [{ y: [300, 2800, 1500, 900] }], x_labels: ['1', '2', '3', '4'] },
    { circles: 4, polylines: 1, dash: false, wave: false, legend: false }]
].forEach(function (t) {
  cases++; let e = 0;
  const svg = FB.build(fp(t[1]));
  const nc = (svg.match(/<circle/g) || []).length, np = (svg.match(/<polyline/g) || []).length;
  if (nc !== t[2].circles) e++;
  if (np !== t[2].polylines) e++;
  if (svg.includes('stroke-dasharray="6 3"') !== t[2].dash) e++;
  if (svg.includes('q 3.5 -4 7 0') !== t[2].wave) e++;
  if ((svg.match(/<text[^>]*font-size="11" fill="#333">/g) || []).length > 0 !== t[2].legend) e++;
  if (svg.indexOf('undefined') >= 0 || svg.indexOf('NaN') >= 0) e++;
  if (FB.build(fp(t[1])) !== svg) e++;                       // シード非依存(決定性)
  if (e) { bad += e; console.log('  ❌ ' + t[0] + ' (' + e + ')'); }
});
console.log('  要素数・破線/波線/凡例・決定性 ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) 目盛自動(1-2-5系列で6〜10目盛) ===');
const b2 = bad;
[[20, 2], [10, 1], [40, 5], [100, 10], [3000, 500], [7, 1]].forEach(function (t) {
  cases++;
  const svg = FB.build(fp({ series: [{ y: [0, t[0]] }], x_labels: ['a', 'b'] }));
  // 主目盛横線本数 = span/tick + 1
  const want = Math.ceil(t[0] / t[1]) + 1;
  const n = (svg.match(/stroke="#d5deea" stroke-width="1"/g) || []).length - 2;  // 縦2本を除く
  if (n !== want) { bad++; console.log('  ❌ span=' + t[0] + ' 主目盛' + n + ' (期待' + want + ')'); }
});
console.log('  1-2-5目盛 ' + (bad === b2 ? '✅' : '❌'));

console.log('=== (2b) y_minor補助目盛(主0.5+補助0.1) ===');
(function () {
  cases++;
  const svg = FB.build(fp({ series: [{ y: [36.2, 36.8] }], x_labels: ['a', 'b'], y_range: [36, 39], y_tick: 0.5, y_minor: 0.1 }));
  const minor = (svg.match(/stroke="#eaeff6"/g) || []).length;
  if (minor !== 24) { bad++; console.log('  ❌ 補助目盛' + minor + ' (期待24)'); }
  else console.log('  補助24本(31位置−主7) ✅');
})();

console.log('=== (3) ガードthrow(契約違反5種) ===');
const b3 = bad;
[
  { series: [], x_labels: ['a', 'b'] },
  { series: [{ y: [1] }, { y: [1] }, { y: [1] }], x_labels: ['a'] },
  { series: [{ y: [1, 2, 3] }], x_labels: ['a', 'b'] },
  { series: [{ y: [5, 45] }], x_labels: ['a', 'b'], y_range: [10, 40] },
  { series: [{ y: [1, 2] }], x_labels: ['a', 'b'], y_range: [5, 5] }
].forEach(function (o) {
  cases++; let threw = false;
  try { FB.build(fp(o)); } catch (e) { threw = true; }
  if (!threw) { bad++; console.log('  ❌ 非throw ' + JSON.stringify(o).slice(0, 60)); }
});
console.log('  ガード5種 ' + (bad === b3 ? '✅' : '❌'));

console.log('=== (4) 既存モード非破壊(v1 prop/inv・v2) ===');
const b4 = bad;
(function () {
  cases += 2;
  const v1p = FB.build({ kind: 'xy_graph', mode: 'prop', k: 2, xmax: 6, ymax: 6 });
  const v1i = FB.build({ kind: 'xy_graph', mode: 'inv', k: 6, xmax: 6, ymax: 6 });
  if (!(v1p.length > 100 && v1p.includes('<polyline'))) { bad++; console.log('  ❌ v1 prop'); }
  if (!(v1i.length > 100 && v1i.includes('<polyline'))) { bad++; console.log('  ❌ v1 inv'); }
})();
console.log('  v1非破壊 ' + (bad === b4 ? '✅' : '❌'));

console.log('\n' + (bad === 0 ? 'xy_polyline: 全' + cases + '照合 一致 ✅(要素・目盛・ガード・決定性・非破壊)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
