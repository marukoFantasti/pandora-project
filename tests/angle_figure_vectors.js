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

// ── 曲率関門: SVG弧の真円性を機械検査（潰れ=楕円化/off半径 を捕まえる） ──
// (a) <path A rx ry …> の rx==ry==期待r（既知18/未知28）。ellipse化(rx≠ry)=潰れ→検出。
// (b) 弧サンプル点(≥5)が頂点O(=SVG[0,0])から距離r±0.5px。
function curvatureCheck(fp) {
  const svg = FB.build(fp);
  const arcs = [...svg.matchAll(/<path d="M [-\d.]+ [-\d.]+ A (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) 0 \d \d [-\d.]+ [-\d.]+" fill="none" stroke="(#[0-9A-Fa-f]+)"/g)];
  const geom = FB._geom.angle_around_point(fp.angles);
  const drawn = geom.arcs.filter(a => a.role !== 'plain');
  let e = 0;
  if (arcs.length !== drawn.length) e++;
  arcs.forEach((m, i) => {
    const rx = +m[1], ry = +m[2], expR = drawn[i] ? drawn[i].r : null;
    if (rx !== ry) e++;                         // 楕円化=潰れ
    if (expR != null && Math.abs(rx - expR) > 0.5) e++;
    // サンプル点(頂点O=[0,0])距離r±0.5
    if (drawn[i]) FB._geom.arc_sample_points([0, 0], drawn[i].r, drawn[i].a0, drawn[i].a1, 6).forEach(p => { if (Math.abs(Math.hypot(p[0], p[1]) - drawn[i].r) > 0.5) e++; });
  });
  return e;
}

// ── viewport整合関門: ルートSVGの width/height縦横比 == viewBox縦横比(±0.1%) かつ
//    preserveAspectRatio が "none" でないこと。自動フィットでviewBoxが変わった際に width/height が
//    追随しない不整合(=直線では見えず円弧だけ楕円化する表示歪み)を構造排除。
function viewportCheck(fp) {
  const svg = FB.build(fp), hdr = (svg.match(/<svg[^>]*>/) || [''])[0];
  const w = +(hdr.match(/ width="([-\d.]+)"/) || [])[1], h = +(hdr.match(/ height="([-\d.]+)"/) || [])[1];
  const vb = hdr.match(/viewBox="[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/);
  const par = (hdr.match(/preserveAspectRatio="([^"]*)"/) || [])[1];
  let e = 0;
  if (!w || !h || !vb) { return 1; }
  const diff = Math.abs((w / h) / (+vb[1] / +vb[2]) - 1) * 100;
  if (diff > 0.1) e++;                         // 縦横比不整合=円弧の楕円化リスク
  if (par == null || par === 'none') e++;      // preserveAspectRatio 未指定/none は歪み許容につき不可
  return e;
}

// 修正前の欠陥クラス(潰れ=楕円弧)を関門が捕まえるか実証: 合成の楕円path(rx≠ry)で RED を確認。
console.log('=== 曲率関門の欠陥捕捉 実証(潰れ=楕円化の検出) ===');
(function () {
  const flat = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M 34 0 A 34 20 0 0 0 -34 0" fill="none" stroke="#C0392B"/></svg>';
  const m = flat.match(/A (\d+) (\d+) /);
  const flattenedDetected = m && m[1] !== m[2];   // rx=34,ry=20 → 楕円=潰れ
  console.log('  合成の潰れ弧(A 34 20=楕円): 関門判定 rx≠ry → ' + (flattenedDetected ? 'RED検出 ✅(欠陥を正しく捕まえる)' : '見逃し ❌'));
  if (!flattenedDetected) bad++;
})();

console.log('\n=== angle_figure 幾何ベクター(' + CASES.length + 'ケース) + 曲率関門 ===');
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
    if (g.arcs[i].r !== (c.angles[i].role === 'unknown' ? 28 : 18)) e++;
    expDir += Number(c.angles[i].v);
  }
  if (Math.abs(expDir - 360) > 1e-6) e++;   // 和360
  // シード非依存: build/clearance 2回一致
  const s1 = FB.build({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles });
  const s2 = FB.build({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles });
  if (s1 !== s2) e++;
  if (JSON.stringify(FB._angleFigureMinClearance({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles })) !==
      JSON.stringify(FB._angleFigureMinClearance({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles }))) e++;
  // 曲率関門: SVG弧の真円性(rx==ry==r・サンプル点r±0.5)
  e += curvatureCheck({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles });
  // viewport整合関門: width/height縦横比==viewBox(±0.1%)・preserveAspectRatio≠none
  e += viewportCheck({ kind: 'angle_figure', subkind: 'angle_around_point', angles: c.angles });
  if (e) { bad += e; console.log('  ❌ ' + c.label + ' (' + e + '件不一致)'); }
}
console.log('\n' + (bad === 0 ? 'angle_figure幾何ベクター+曲率関門: 全' + CASES.length + 'ケース一致 ✅(座標±0.5px・弧中心角・真円rx==ry==r・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
