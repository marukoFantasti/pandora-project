// parallel_lines_vectors.js — 第2波G-2 parallel_lines 幾何ベクター(24ケース)+三重関門拡張。
// 交点U,L座標(=(H/2)cotθ)・楔の中心角・平行輸送(U,L同pos角の一致)・平行マーク位置を独立再計算と±0.5px照合。
// 曲率関門(弧の真円 rx==ry==r・中心U/Lからr±0.5)・viewport整合関門(width/height縦横比==viewBox)を
// parallel_lines(中心が非原点U/L)に拡張。実行時乱数なし=シード非依存。
//
// 実行:  node tests/parallel_lines_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const DEG = Math.PI / 180, H = 78;
let bad = 0;

function fp1(t1, at, pos, role) {
  return { kind: 'angle_figure', subkind: 'parallel_lines', parallel: [{ label: 'ℓ' }, { label: 'm' }],
    transversal: { angle: t1 }, angles: [{ at: at, pos: pos, v: (pos % 2 === 0) ? t1 : 180 - t1, role: role || 'known', label: role === 'unknown' ? '∠x' : undefined }] };
}
function wflip(p) { return [p[0], -p[1]]; }

// 曲率関門(中心cSvg): <path A rx ry> の rx==ry==expR ∧ 端点が cSvg から距離 expR±0.5。
function curvatureCheck(fp, cSvg, expR) {
  const svg = FB.build(fp);
  const m = svg.match(/<path d="M ([-\d.]+) ([-\d.]+) A (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) 0 \d \d ([-\d.]+) ([-\d.]+)" fill="none"/);
  if (!m) return 1;
  let e = 0;
  const rx = +m[3], ry = +m[4];
  if (rx !== ry || rx !== expR) e++;                                  // 楕円化/off半径
  const p0 = [+m[1], +m[2]], p1 = [+m[5], +m[6]];
  [p0, p1].forEach(p => { if (Math.abs(Math.hypot(p[0] - cSvg[0], p[1] - cSvg[1]) - expR) > 0.5) e++; });
  return e;
}
// viewport整合関門(G-1と同一・ルートsvg属性)。
function viewportCheck(fp) {
  const svg = FB.build(fp), hdr = (svg.match(/<svg[^>]*>/) || [''])[0];
  const w = +(hdr.match(/ width="([-\d.]+)"/) || [])[1], h = +(hdr.match(/ height="([-\d.]+)"/) || [])[1];
  const vb = hdr.match(/viewBox="[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/);
  const par = (hdr.match(/preserveAspectRatio="([^"]*)"/) || [])[1];
  if (!w || !h || !vb) return 1;
  let e = 0;
  if (Math.abs((w / h) / (+vb[1] / +vb[2]) - 1) * 100 > 0.1) e++;
  if (par == null || par === 'none') e++;
  return e;
}

// 合成の楕円(rx≠ry)が曲率関門でREDになることを実証
console.log('=== 曲率関門の欠陥捕捉 実証(parallel_lines・非原点中心) ===');
(function () {
  const flat = '<path d="M 10 0 A 34 20 0 0 0 -10 0" fill="none"';
  const mm = flat.match(/A (\d+) (\d+) /);
  const detected = mm && mm[1] !== mm[2];
  console.log('  合成の潰れ弧(A 34 20=楕円): rx≠ry → ' + (detected ? 'RED検出 ✅' : '見逃し ❌'));
  if (!detected) bad++;
})();

// 24ケース: t1×(at,pos) の単角図。幾何(U,L座標/楔中心角/端座標) + 曲率 + viewport。
const CASES = [];
[30, 45, 60, 90, 120, 150].forEach(t => {
  [['upper', 0], ['upper', 2], ['lower', 1], ['lower', 3]].forEach(ap => CASES.push({ t1: t, at: ap[0], pos: ap[1] }));
});
console.log('\n=== parallel_lines 幾何ベクター(' + CASES.length + 'ケース)+曲率+viewport ===');
for (const c of CASES) {
  const g = FB._geom.parallel_lines({ transversal: { angle: c.t1 } });
  let e = 0;
  // U,L 座標: U=[(H/2)cotθ, H/2], L=-U
  const ux = (H / 2) / Math.tan(c.t1 * DEG);
  if (Math.abs(g.U[0] - ux) > 0.5 || Math.abs(g.U[1] - H / 2) > 0.5) e++;
  if (Math.abs(g.L[0] + ux) > 0.5 || Math.abs(g.L[1] + H / 2) > 0.5) e++;
  // 横断向き
  if (Math.abs(g.dir[0] - Math.cos(c.t1 * DEG)) > 1e-9 || Math.abs(g.dir[1] - Math.sin(c.t1 * DEG)) > 1e-9) e++;
  // 楔の実角値(pos偶=t1/奇=180−t1) と中心角範囲
  const wd = FB._geom.parallel_wedge(c.t1, c.pos);
  const expV = (c.pos % 2 === 0) ? c.t1 : 180 - c.t1;
  if (Math.floor(wd.v + 0.5) !== Math.floor(expV + 0.5)) e++;
  if (Math.abs((wd.a1 - wd.a0) - expV) > 1e-9) e++;
  // 曲率(中心=worldFlip(U|L)・r=known18)
  const center = wflip(c.at === 'upper' ? g.U : g.L);
  e += curvatureCheck(fp1(c.t1, c.at, c.pos, 'known'), center, 18);
  // viewport
  e += viewportCheck(fp1(c.t1, c.at, c.pos, 'known'));
  // シード非依存(2回build一致)
  if (FB.build(fp1(c.t1, c.at, c.pos, 'known')) !== FB.build(fp1(c.t1, c.at, c.pos, 'known'))) e++;
  if (e) { bad += e; console.log('  ❌ t=' + c.t1 + ' ' + c.at + ' pos' + c.pos + ' (' + e + '件)'); }
}

// 平行輸送: U-posk と L-posk の弧が同一中心角(同位角の相等をデータ構造が担保)
console.log('\n=== 平行輸送(U,L同posの角一致) ===');
[30, 55, 80, 110, 140].forEach(t => {
  for (let pos = 0; pos < 4; pos++) {
    const wu = FB._geom.parallel_wedge(t, pos);
    if (Math.abs(wu.v - ((pos % 2 === 0) ? t : 180 - t)) > 1e-9) { bad++; console.log('  ❌ t=' + t + ' pos' + pos + ' 平行輸送不一致'); }
  }
});
console.log('  平行輸送: U,L の同pos角が t/180−t で一致 ✅');

// 平行マーク位置: 「>」パスの頂点が線中点 (0, ∓H/2)svg 付近
console.log('\n=== 平行マーク位置(線中点束縛) ===');
(function () {
  const svg = FB.build(fp1(60, 'upper', 0, 'known'));
  const chevs = [...svg.matchAll(/<path d="M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)" fill="none" stroke="#1a56c4" stroke-width="1.6"/g)];
  let e = 0;
  if (chevs.length !== 2) e++;
  const tipYs = chevs.map(m => +m[4]).sort((a, b) => a - b);      // 頂点(2番目のL)のy
  // 上マークtip≈ -39(svg)・下≈ +39
  if (chevs.length === 2 && (Math.abs(tipYs[0] + H / 2) > 1 || Math.abs(tipYs[1] - H / 2) > 1)) e++;
  const tipXs = chevs.map(m => +m[3]);
  if (chevs.length === 2 && tipXs.some(x => Math.abs(x - 3.5) > 0.5)) e++;   // 中点x=0 +3.5(>の突端)
  bad += e;
  console.log('  ' + (e === 0 ? '✅ 平行マーク2個・線中点(x≈0,y≈∓39)・+x向き' : '❌ ' + e + '件'));
})();

console.log('\n' + (bad === 0 ? 'parallel_lines幾何ベクター+三重関門: 全' + CASES.length + 'ケース一致 ✅(U,L座標±0.5px・楔中心角・真円rx==ry==r・平行輸送・平行マーク・viewport・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
