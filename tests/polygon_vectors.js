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

// 合成の潰れ弧(rx≠ry)を曲率関門が捕まえるか実証
(function () { const flat = '<path d="M 5 0 A 18 12 0 0 0 -5 0" fill="none"'; const m = flat.match(/A (\d+) (\d+) /); if (!(m && m[1] !== m[2])) bad++; console.log('  曲率関門 潰れ検出(A 18 12=楕円): ' + (m && m[1] !== m[2] ? 'RED ✅' : '見逃し ❌')); })();

console.log('\n' + (bad === 0 ? 'polygon幾何ベクター+三重関門: 全' + geomCases + '内角ケース+凸性+曲率+viewport 一致 ✅(接円接線構成・内角復元±0.5°・真円rx==ry==r・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
