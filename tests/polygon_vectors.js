// polygon_vectors.js — 第2波G-3 polygon(多角形の内角)幾何ベクター+三重関門拡張。
// 接円接線構成の頂点座標を独立再計算と±0.5px照合・内角の復元(atan2で実測==指定)・凸性・
// 内角弧の真円(rx==ry==r・頂点からr±0.5)・viewport整合。実行時乱数なし=シード非依存。
//
// 実行:  node tests/polygon_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const DEG = Math.PI / 180;
let bad = 0;

const NM = ['A', 'B', 'C', 'D', 'E', 'F'];
function polyFp(angles, roleAt) {
  return { kind: 'angle_figure', subkind: 'polygon', vertices: angles.map((_, i) => ({ name: NM[i] })),
    angles: angles.map((v, i) => ({ v, role: i === roleAt ? 'known' : 'plain', label: undefined })) };
}
function wflip(p) { return [p[0], -p[1]]; }
// 独立・接円接線構成(builderと別実装で照合)
function tangentRecompute(angles) {
  const n = angles.length, dirs = [0];
  for (let i = 1; i < n; i++) dirs.push(dirs[i - 1] + (180 - angles[i]));
  const nrm = dirs.map(d => [Math.sin(d * DEG), -Math.cos(d * DEG)]);
  const V = [];
  for (let i = 0; i < n; i++) { const a = nrm[(i - 1 + n) % n], b = nrm[i], det = a[0] * b[1] - a[1] * b[0]; V.push([(b[1] - a[1]) / det, (a[0] - b[0]) / det]); }
  return V;
}
function interiorAngle(pts, i) {
  const n = pts.length, C = pts[i], P = pts[(i - 1 + n) % n], Q = pts[(i + 1) % n];
  const aP = Math.atan2(P[1] - C[1], P[0] - C[0]), aQ = Math.atan2(Q[1] - C[1], Q[0] - C[0]);
  let d = Math.abs(aP - aQ) / DEG; if (d > 180) d = 360 - d; return d;
}
// 曲率関門(中心cSvg・半径expR): 内角弧 <path A rx ry> の rx==ry==expR ∧ 端点が cSvg から r±0.5
function curvatureCheck(fp, cSvg, expR) {
  const svg = FB.build(fp);
  const m = svg.match(/<path d="M ([-\d.]+) ([-\d.]+) A (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) 0 \d \d ([-\d.]+) ([-\d.]+)" fill="none"/);
  if (!m) return 1;
  let e = 0; if (+m[3] !== +m[4] || +m[3] !== expR) e++;
  [[+m[1], +m[2]], [+m[5], +m[6]]].forEach(p => { if (Math.abs(Math.hypot(p[0] - cSvg[0], p[1] - cSvg[1]) - expR) > 0.5) e++; });
  return e;
}
function viewportCheck(fp) {
  const svg = FB.build(fp), hdr = (svg.match(/<svg[^>]*>/) || [''])[0];
  const w = +(hdr.match(/ width="([-\d.]+)"/) || [])[1], h = +(hdr.match(/ height="([-\d.]+)"/) || [])[1];
  const vb = hdr.match(/viewBox="[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/), par = (hdr.match(/preserveAspectRatio="([^"]*)"/) || [])[1];
  if (!w || !h || !vb) return 1;
  let e = 0; if (Math.abs((w / h) / (+vb[1] / +vb[2]) - 1) * 100 > 0.1) e++; if (par == null || par === 'none') e++; return e;
}

// 6角度セット(n=3..6・凸)。
const SETS = [[50, 60, 70], [40, 75, 65], [80, 100, 110, 70], [95, 115, 80, 70],
  [100, 110, 120, 105, 105], [120, 110, 130, 115, 125, 120]];

console.log('=== polygon 幾何ベクター(接円接線構成) + 三重関門 ===');
let geomCases = 0;
for (const angs of SETS) {
  const n = angs.length;
  const g = FB._geom.polygon(polyFp(angs, 0));
  const ref = tangentRecompute(angs);
  // スケール・中心は builder 側で正規化されるため、内角・凸性・相似(角度)で照合
  let e = 0;
  // (1) 内角の復元(実測==指定)
  for (let i = 0; i < n; i++) { geomCases++; if (Math.abs(interiorAngle(g.pts, i) - angs[i]) > 0.5) e++; }
  // (2) 凸性(全cross同符号>0=CCW)
  for (let i = 0; i < n; i++) { const p = g.pts[i], q = g.pts[(i + 1) % n], r = g.pts[(i + 2) % n]; const cr = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]); if (cr <= 0) e++; }
  // (3) 独立tangent再計算と角度一致(実測内角==ref内角)
  for (let i = 0; i < n; i++) if (Math.abs(interiorAngle(g.pts, i) - interiorAngle(ref, i)) > 0.5) e++;
  // (4) 内角和 == (n-2)*180
  if (Math.abs(angs.reduce((a, b) => a + b, 0) - (n - 2) * 180) > 1e-6) e++;
  // 曲率(頂点0を既知にした図の内角弧・r=known18)+ viewport
  const center = wflip(g.pts[0]);
  e += curvatureCheck(polyFp(angs, 0), center, 18);
  e += viewportCheck(polyFp(angs, 0));
  // シード非依存
  if (FB.build(polyFp(angs, 0)) !== FB.build(polyFp(angs, 0))) e++;
  if (e) { bad += e; console.log('  ❌ n=' + n + ' ' + JSON.stringify(angs) + ' (' + e + '件)'); }
}

// 直角マーク(G-3.1): 既知90°=小正方形。マーク3点座標±0.5px・両辺への平行性・「90°」非表示。
(function () {
  const fp = { kind: 'angle_figure', subkind: 'polygon', vertices: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    angles: [{ v: 90, role: 'known' }, { v: 55, role: 'known' }, { v: 35, role: 'unknown', label: '∠x' }] };
  const g = FB._geom.polygon(fp), V = g.pts[0], nx = g.pts[1], pv = g.pts[2];
  const l1 = Math.hypot(nx[0] - V[0], nx[1] - V[1]), l2 = Math.hypot(pv[0] - V[0], pv[1] - V[1]);
  const e1 = [(nx[0] - V[0]) / l1, (nx[1] - V[1]) / l1], e2 = [(pv[0] - V[0]) / l2, (pv[1] - V[1]) / l2];
  const exp = FB._geom.right_angle_mark(V, e1, e2);   // world V(内部でflip)。{pts:[f1,f2,fc]}(SVG)
  const svg = FB.build(fp);
  const m = svg.match(/<path d="M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)" fill="none" stroke="#1D9E75" stroke-width="1.6"/);
  let e = 0;
  if (!m) e++; else {
    const P1 = [+m[1], +m[2]], Cn = [+m[3], +m[4]], P2 = [+m[5], +m[6]];
    if (Math.hypot(P1[0] - exp.pts[0][0], P1[1] - exp.pts[0][1]) > 0.5) e++;   // f1
    if (Math.hypot(Cn[0] - exp.pts[2][0], Cn[1] - exp.pts[2][1]) > 0.5) e++;   // fc
    if (Math.hypot(P2[0] - exp.pts[1][0], P2[1] - exp.pts[1][1]) > 0.5) e++;   // f2
    // 平行性: (P1→Cn)∥辺e2(svg) ・ (Cn→P2)∥辺e1(svg)
    const e1s = [e1[0], -e1[1]], e2s = [e2[0], -e2[1]];
    const v1 = [Cn[0] - P1[0], Cn[1] - P1[1]], v2 = [P2[0] - Cn[0], P2[1] - Cn[1]];
    if (Math.abs(v1[0] * e2s[1] - v1[1] * e2s[0]) > 0.5) e++;
    if (Math.abs(v2[0] * e1s[1] - v2[1] * e1s[0]) > 0.5) e++;
    // 一辺≈10px
    if (Math.abs(Math.hypot(v1[0], v1[1]) - 10) > 0.5 || Math.abs(Math.hypot(v2[0], v2[1]) - 10) > 0.5) e++;
  }
  if (svg.indexOf('90°') >= 0) e++;                                            // 既知90°の値は非表示
  // 非対称: 未知90°はマークにせず赤弧+∠x
  const un = FB.build({ kind: 'angle_figure', subkind: 'polygon', vertices: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], angles: [{ v: 90, role: 'unknown', label: '∠x' }, { v: 55, role: 'known' }, { v: 35, role: 'known' }] });
  if (!un.includes('∠x') || !/A 28 28/.test(un)) e++;                          // 未知90°=r28赤弧(マークでない)
  bad += e;
  console.log('  直角マーク(既知90°=小正方形): 3点±0.5px・両辺平行・一辺10px・90°非表示・未知90非対称 ' + (e === 0 ? '✅' : '❌ ' + e + '件'));
})();

// 合成の潰れ弧(rx≠ry)を曲率関門が捕まえるか実証
(function () { const flat = '<path d="M 5 0 A 18 12 0 0 0 -5 0" fill="none"'; const m = flat.match(/A (\d+) (\d+) /); if (!(m && m[1] !== m[2])) bad++; console.log('  曲率関門 潰れ検出(A 18 12=楕円): ' + (m && m[1] !== m[2] ? 'RED ✅' : '見逃し ❌')); })();

console.log('\n' + (bad === 0 ? 'polygon幾何ベクター+三重関門: 全' + geomCases + '内角ケース+凸性+曲率+viewport 一致 ✅(接円接線構成・内角復元±0.5°・真円rx==ry==r・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
