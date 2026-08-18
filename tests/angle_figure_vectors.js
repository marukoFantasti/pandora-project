// angle_figure_vectors.js — 第2波G-1 angle_around_point 幾何ベクター(24ケース)。
// 交点座標O・ray方向(累積)・各角の弧中心角(bisector)・ray端座標を独立再計算と±0.5px照合。
// 実行時乱数なし=シード非依存(同入力→同出力)を build/clearance の2回一致で確認。
//
// 実行:  node tests/angle_figure_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const RAY = 95, DEG = Math.PI / 180;
let bad = 0;

// 24ケース: 2直線(a) と 3直線(g1/g2/g3・和180)
const CASES = [];
[30, 45, 60, 70, 90, 100, 120, 135, 150].forEach(a =>
  CASES.push({ label: '2L a=' + a, angles: [{ v: a, role: 'known', label: a + '°' }, { v: 180 - a, role: 'unknown', label: '∠x' }, { v: a, role: 'plain' }, { v: 180 - a, role: 'plain' }] }));
[[20, 40, 120], [30, 60, 90], [40, 40, 100], [50, 70, 60], [60, 60, 60], [20, 20, 140], [80, 50, 50], [45, 45, 90], [35, 55, 90], [25, 75, 80], [90, 45, 45], [70, 40, 70], [55, 65, 60], [100, 40, 40], [30, 30, 120]].forEach(gs =>
  CASES.push({ label: '3L ' + gs.join('/'), angles: [
    { v: gs[0], role: 'known', label: gs[0] + '°' }, { v: gs[1], role: 'unknown', label: '∠x' }, { v: gs[2], role: 'plain' },
    { v: gs[0], role: 'plain' }, { v: gs[1], role: 'plain' }, { v: gs[2], role: 'plain' }] }));

console.log('=== angle_figure 幾何ベクター(' + CASES.length + 'ケース) ===');
for (const c of CASES) {
  const g = FB._geom.angle_around_point(c.angles);
  let e = 0;
  // O=[0,0]
  if (g.O[0] !== 0 || g.O[1] !== 0) e++;
  // dirs=累積和 / arcs.bis=(a0+a1)/2 / ends=RAY*(cos,sin)
  let expDir = 0;
  for (let i = 0; i < c.angles.length; i++) {
    if (Math.abs(g.dirs[i] - expDir) > 1e-6) e++;
    const ex = RAY * Math.cos(g.dirs[i] * DEG), ey = RAY * Math.sin(g.dirs[i] * DEG);
    if (Math.abs(g.ends[i][0] - ex) > 0.5 || Math.abs(g.ends[i][1] - ey) > 0.5) e++;
    const expBis = expDir + Number(c.angles[i].v) / 2;
    if (Math.abs(g.arcs[i].bis - expBis) > 1e-6) e++;
    if (g.arcs[i].r !== (c.angles[i].role === 'unknown' ? 34 : 18)) e++;
    expDir += Number(c.angles[i].v);
  }
  if (Math.abs(expDir - 360) > 1e-6) e++;   // 和360
  // シード非依存: build/clearance 2回一致
  const s1 = FB.build({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles });
  const s2 = FB.build({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles });
  if (s1 !== s2) e++;
  if (JSON.stringify(FB._angleFigureMinClearance({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles })) !==
      JSON.stringify(FB._angleFigureMinClearance({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles }))) e++;
  if (e) { bad += e; console.log('  ❌ ' + c.label + ' (' + e + '件不一致)'); }
}
console.log('\n' + (bad === 0 ? 'angle_figure幾何ベクター: 全' + CASES.length + 'ケース一致 ✅(座標±0.5px・弧中心角・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
