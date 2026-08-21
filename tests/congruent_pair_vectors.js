// congruent_pair_vectors.js — 第2波G-4a congruent_pair 幾何ベクター + 三重関門拡張。
// 右図=左図のミラー+固定回転+平行移動(等長変換)を独立照合: 対応辺長の一致・対応内角の一致・
// 向き反転(符号付面積の符号反転=ミラー)・変換座標±0.5px。曲率(表示弧真円)・viewport。乱数なし。
//
// 実行:  node tests/congruent_pair_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const DEG = Math.PI / 180, ROT = 22, GAP = 54, TARGET = 148;
let bad = 0, cases = 0;

function fp(angles, leftShow) {
  return { kind: 'angle_figure', subkind: 'congruent_pair', angles: angles.map(v => ({ v })),
    left: { names: ['A', 'B', 'C'], show: leftShow || [] }, right: { names: ['D', 'E', 'F'], show: [] }, side_ticks: true };
}
function wflip(p) { return [p[0], -p[1]]; }
function sideLen(pts, i) { const a = pts[i], b = pts[(i + 1) % 3]; return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function interior(pts, i) { const C = pts[i], P = pts[(i - 1 + 3) % 3], Q = pts[(i + 1) % 3]; const aP = Math.atan2(P[1] - C[1], P[0] - C[0]), aQ = Math.atan2(Q[1] - C[1], Q[0] - C[0]); let d = Math.abs(aP - aQ) / DEG; if (d > 180) d = 360 - d; return d; }
function signedArea(pts) { let s = 0; for (let i = 0; i < 3; i++) { const a = pts[i], b = pts[(i + 1) % 3]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function curvatureCheck(f, cSvg, expR) {
  const svg = FB.build(f), m = svg.match(/<path d="M ([-\d.]+) ([-\d.]+) A (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) 0 \d \d ([-\d.]+) ([-\d.]+)" fill="none"/);
  if (!m) return 1; let e = 0; if (+m[3] !== +m[4] || +m[3] !== expR) e++;
  [[+m[1], +m[2]], [+m[5], +m[6]]].forEach(p => { if (Math.abs(Math.hypot(p[0] - cSvg[0], p[1] - cSvg[1]) - expR) > 0.5) e++; });
  return e;
}
function viewportCheck(f) {
  const svg = FB.build(f), hdr = (svg.match(/<svg[^>]*>/) || [''])[0];
  const w = +(hdr.match(/ width="([-\d.]+)"/) || [])[1], h = +(hdr.match(/ height="([-\d.]+)"/) || [])[1];
  const vb = hdr.match(/viewBox="[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/), par = (hdr.match(/preserveAspectRatio="([^"]*)"/) || [])[1];
  if (!w || !h || !vb) return 1; let e = 0; if (Math.abs((w / h) / (+vb[1] / +vb[2]) - 1) * 100 > 0.1) e++; if (par == null || par === 'none') e++; return e;
}

const SETS = [[55, 65, 60], [50, 70, 60], [45, 90, 45], [70, 60, 50], [80, 55, 45], [60, 60, 60]];
console.log('=== congruent_pair 幾何ベクター(ミラー+回転の等長変換照合) + 三重関門 ===');
for (const angs of SETS) {
  const g = FB._geom.congruent_pair(fp(angs));
  let e = 0;
  // (1) 対応辺長の一致(合同=等長変換)
  for (let i = 0; i < 3; i++) { cases++; if (Math.abs(sideLen(g.left, i) - sideLen(g.right, i)) > 0.5) e++; }
  // (2) 対応内角の一致(左i==右i==指定a_i)
  for (let i = 0; i < 3; i++) { cases++; if (Math.abs(interior(g.left, i) - angs[i]) > 0.5 || Math.abs(interior(g.right, i) - angs[i]) > 0.5) e++; }
  // (3) 向き反転(ミラー): 左と右の符号付面積が逆符号
  if (Math.sign(signedArea(g.left)) === Math.sign(signedArea(g.right))) e++;
  // (4) 右変換座標の独立再計算(左中心形Tを復元→ミラー+回転+平行移動)と±0.5px照合
  const T = g.left.map(p => [p[0] + g.DX, p[1]]);   // 左を+DXで中心形へ戻す
  const C = Math.cos(ROT * DEG), S = Math.sin(ROT * DEG);
  for (let i = 0; i < 3; i++) { const mx = -T[i][0], my = T[i][1]; const rx = mx * C - my * S + g.DX, ry = mx * S + my * C; if (Math.abs(g.right[i][0] - rx) > 0.5 || Math.abs(g.right[i][1] - ry) > 0.5) e++; }
  // 曲率(左頂点0を既知表示・r=known18) + viewport
  const f1 = fp(angs, [{ at: 0, role: 'known' }]);
  e += curvatureCheck(f1, wflip(g.left[0]), 18);
  e += viewportCheck(f1);
  if (FB.build(f1) !== FB.build(f1)) e++;   // シード非依存
  if (e) { bad += e; console.log('  ❌ ' + JSON.stringify(angs) + ' (' + e + '件)'); }
}
// 対応辺の等長チョン本数(1/2/3)が両三角形に描かれる(SVG上の該当strokeライン数で確認)
(function () {
  const svg = FB.build(fp([55, 65, 60]));
  const ticks = (svg.match(/<line [^>]*stroke="#1a56c4" stroke-width="1.6"\/>/g) || []).length;
  const ok = ticks === (1 + 2 + 3) * 2;   // 各三角形 1+2+3=6本 × 2図 = 12本
  if (!ok) bad++;
  console.log('  対応辺チョン: 検出' + ticks + '本 (期待12=1/2/3×2図) ' + (ok ? '✅' : '❌'));
})();
// ---- G-4b mark_scheme(SSS/SAS/ASA・合同条件識別)の対応整合ベクター ----
// マーク(等長チョン/等角弧)が左右両三角形に対応して同数描かれ、構成ごとの規定密度に一致する。
// マークは頂点内側=条件をマークだけで判定させる設計(角度値は全plain)。
function markFp(scheme, angs) {
  return { kind: 'angle_figure', subkind: 'congruent_pair', mark_scheme: scheme,
    angles: angs.map(v => ({ v })), left: { names: ['A', 'B', 'C'], show: [] }, right: { names: ['D', 'E', 'F'], show: [] } };
}
function markCounts(svg) {
  let ticksL = 0, ticksR = 0, arcsL = 0, arcsR = 0; const radii = {}; let m;
  const reL = /<line x1="([-\d.]+)" y1="[-\d.]+" x2="([-\d.]+)" y2="[-\d.]+" stroke="#1a56c4" stroke-width="1.6"/g;
  while ((m = reL.exec(svg))) { ((+m[1] + +m[2]) / 2 < 0 ? ticksL++ : ticksR++); }
  const reA = /<path d="M ([-\d.]+) [-\d.]+ A ([\d.]+) [\d.]+ 0 \d \d [-\d.]+ [-\d.]+" fill="none" stroke="#1a56c4" stroke-width="1.3"/g;
  while ((m = reA.exec(svg))) { (+m[1] < 0 ? arcsL++ : arcsR++); radii[m[2]] = 1; }
  return { ticksL, ticksR, arcsL, arcsR, radii: Object.keys(radii).map(Number).sort((a, b) => a - b) };
}
// per-triangle 期待: SSS チョン6/弧0・SAS チョン3/弧1(半径1種)・ASA チョン1/弧3(半径2種=等角弧2種)
const EXPECT = { SSS: { t: 6, a: 0, nr: 0 }, SAS: { t: 3, a: 1, nr: 1 }, ASA: { t: 1, a: 3, nr: 2 } };
console.log('  --- G-4b mark_scheme 対応整合(SSS/SAS/ASA) ---');
for (const scheme of ['SSS', 'SAS', 'ASA']) {
  for (const angs of SETS.slice(0, 5)) {
    cases++; let e = 0;
    const svg = FB.build(markFp(scheme, angs)), c = markCounts(svg), ex = EXPECT[scheme];
    if (c.ticksL !== ex.t || c.ticksR !== ex.t) e++;           // チョン数=規定 かつ 左右対応(合同の視認)
    if (c.arcsL !== ex.a || c.arcsR !== ex.a) e++;             // 等角弧数=規定 かつ 左右対応
    if (c.radii.length !== ex.nr) e++;                         // 弧半径の種数(ASA=2種でASA固有性)
    if (svg.indexOf('undefined') >= 0) e++;
    if (FB.build(markFp(scheme, angs)) !== svg) e++;           // シード非依存
    if (e) { bad += e; console.log('    ❌ ' + scheme + ' ' + JSON.stringify(angs) + ' counts=' + JSON.stringify(c) + ' (' + e + ')'); }
  }
  const c0 = markCounts(FB.build(markFp(scheme, [55, 65, 60])));
  console.log('    ' + scheme + ': チョン' + c0.ticksL + '/' + c0.ticksR + '(L/R) 等角弧' + c0.arcsL + '/' + c0.arcsR + ' 半径種' + c0.radii.length + ' ✅');
}
// 未知mark_schemeは契約違反throw
(function () { cases++; let threw = 0; try { FB.build(markFp('ZZZ', [60, 60, 60])); } catch (e) { threw = 1; } if (!threw) { bad++; console.log('    ❌ 未知mark_scheme非throw'); } })();
// ---- fmt_choice(choice機構・表示記号1字・恒等=番号一致) ----
const PG = require(path.join(__dirname, '..', 'pattern_bank', 'pattern_generator.js'));
console.log('  --- fmt_choice(1→ア/2→イ/3→ウ・数値トークン非混入) ---');
[[1, 'ア'], [2, 'イ'], [3, 'ウ'], [0, ''], [4, 'エ']].forEach(function (t) {
  cases++; const got = PG.fmtChoice(t[0]);
  if (got !== t[1]) { bad++; console.log('    ❌ fmt_choice(' + t[0] + ')=' + JSON.stringify(got) + ' 期待' + JSON.stringify(t[1])); }
  if (/\d/.test(got)) { bad++; console.log('    ❌ fmt_choice(' + t[0] + ') に数字トークン混入'); }   // corr-0007透過
});

console.log('\n' + (bad === 0 ? 'congruent_pair幾何ベクター+三重関門+G-4bマーク構成/fmt_choice: 全' + cases + '照合 一致 ✅(等長変換・対応角±0.5°・真円・マーク左右対応・SSS/SAS/ASA密度・記号透過・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
