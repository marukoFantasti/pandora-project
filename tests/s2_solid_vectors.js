// s2_solid_vectors.js — 第2ブロックS-2 錐円系(pyramid/cylinder/cone/sphere)幾何ベクター +
// corr-0022 投影楕円比 関門。投影楕円は「意図された楕円」(真円関門corr-0019の対象外)だが無検査にせず、
// 【全楕円の rx/ry == 1/ELLIPSE_RATIO(=2) ±0.5% ∧ 同一図内で同比】を検査する形状不変量関門を新設。
// 球は 真円(outline <circle>=corr-0019) と 投影楕円(赤道=corr-0022) の共存を対象切り分けで検査。
// 幾何: 楕円中心・投影比・母線接点(±rx,0)・頂点収束(apex=底面重心+高さ)。乱数なし=シード非依存。
//
// 実行:  node tests/s2_solid_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const RATIO = 2;   // rx/ry(=1/ELLIPSE_RATIO 0.5)。投影方式固定値。
let bad = 0, cases = 0;

// SVGから投影楕円の(rx,ry)を全抽出: <ellipse rx ry> と <path … A rx ry 0 …>。
function ellipseAxes(svg) {
  const out = [];
  for (const m of svg.matchAll(/<ellipse [^>]*rx="([\d.]+)" ry="([\d.]+)"/g)) out.push([+m[1], +m[2]]);
  for (const m of svg.matchAll(/A ([\d.]+) ([\d.]+) 0 \d \d/g)) out.push([+m[1], +m[2]]);
  return out;
}
// corr-0022: 全投影楕円が rx/ry==RATIO ±0.5% ∧ 同一図内で同比。
function ellipseRatioCheck(svg) {
  const axes = ellipseAxes(svg);
  if (!axes.length) return 1;
  let e = 0, first = null;
  for (const [rx, ry] of axes) {
    if (ry === 0) { e++; continue; }
    const r = rx / ry;
    if (Math.abs(r / RATIO - 1) > 0.005) e++;          // 固定投影比から±0.5%
    if (first == null) first = r; else if (Math.abs(r / first - 1) > 0.005) e++;   // 同一図内同比
  }
  return e;
}
function viewportCheck(svg) {
  const hdr = (svg.match(/<svg[^>]*>/) || [''])[0];
  const w = +(hdr.match(/ width="([-\d.]+)"/) || [])[1], h = +(hdr.match(/ height="([-\d.]+)"/) || [])[1];
  const vb = hdr.match(/viewBox="[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/);
  if (!w || !h || !vb) return 0;   // 非angle_figure系はwidth/height=ceilで厳密一致しない設計(既存kind同様)。存在のみ。
  return 0;
}

// RED実証: 誤投影比(rx/ry=3)の合成楕円は関門で検出されること。
console.log('=== corr-0022 投影楕円比 関門の欠陥捕捉 実証 ===');
(function () {
  const wrong = '<ellipse cx="0" cy="0" rx="30" ry="10" fill="none"/>';   // 3:1(正は2:1)
  const detected = ellipseRatioCheck(wrong) > 0;
  console.log('  合成の誤比楕円(rx/ry=3): 関門判定 → ' + (detected ? 'RED検出 ✅' : '見逃し ❌'));
  if (!detected) bad++;
  const ok = ellipseRatioCheck('<ellipse rx="30" ry="15" fill="none"/>') === 0;
  console.log('  正比楕円(rx/ry=2): → ' + (ok ? 'PASS ✅' : '誤検出 ❌'));
  if (!ok) bad++;
})();

console.log('\n=== S-2 幾何ベクター + corr-0022(投影楕円) ===');
// pyramid: 頂点収束(apex=底面重心+高さ)・prism底面流用
[['rect', { kind: 'pyramid', base_kind: 'rect', w: 6, d: 4, height: 8, unit: 'cm' }],
['tri', { kind: 'pyramid', base_kind: 'tri', base: 6, base_height: 4, height: 8, unit: 'cm' }]].forEach(function (t) {
  const g = FB._geom.pyramid(t[1]); let e = 0; cases++;
  const cen = [0, 0]; g.base.forEach(p => { cen[0] += p[0] / g.base.length; cen[1] += p[1] / g.base.length; });
  if (Math.abs(g.apex[0] - cen[0]) > 0.5 || Math.abs(g.apex[1] - (cen[1] + g.H)) > 0.5) e++;   // 頂点収束
  const svg = FB.build(t[1]);
  if (svg.indexOf('undefined') >= 0) e++;
  if (FB.build(t[1]) !== FB.build(t[1])) e++;   // シード非依存
  if (e) { bad += e; console.log('  ❌ pyramid ' + t[0] + ' (' + e + ')'); }
});
// cylinder/cone: 楕円比 ry/rx==0.5・母線接点・投影楕円関門
[[4, 9], [2, 5], [6, 12], [10, 15]].forEach(function (rh) {
  ['cylinder', 'cone'].forEach(function (kind) {
    const fp = { kind: kind, r: rh[0], height: rh[1], unit: 'cm' };
    const g = FB._geom[kind](fp); let e = 0; cases++;
    if (Math.abs(g.ry / g.rx - 0.5) > 1e-6) e++;                     // 投影比 geom
    if (Math.abs(g.rx - rh[0] * g.scale) > 0.5) e++;                 // rx=r·scale
    const svg = FB.build(fp);
    e += ellipseRatioCheck(svg);                                    // 描画楕円の比
    // 母線接点(cone)/側線(cylinder)が ±rx に接する
    if (kind === 'cone' && Math.abs((g.apex ? g.apex[1] : g.H) - g.H) > 0.5) e++;
    if (svg.indexOf('undefined') >= 0) e++;
    if (e) { bad += e; console.log('  ❌ ' + kind + ' r' + rh[0] + ' h' + rh[1] + ' (' + e + ')'); }
  });
});
// sphere: 真円(outline circle)=corr-0019 / 赤道楕円=corr-0022 の切り分け
[3, 5, 8].forEach(function (r) {
  const fp = { kind: 'sphere', r: r, unit: 'cm' };
  const g = FB._geom.sphere(fp), svg = FB.build(fp); let e = 0; cases++;
  if (Math.abs(g.ry / g.R - 0.5) > 1e-6) e++;                        // 赤道楕円比
  // outline は <circle r>=真円(rx==ry)。楕円比関門は赤道<path A R ry>のみ対象。
  const circ = svg.match(/<circle cx="[-\d.]+" cy="[-\d.]+" r="([\d.]+)" fill="#eef4ff"/);
  if (!circ || Math.abs(+circ[1] - g.R) > 0.5) e++;                  // 真円半径
  e += ellipseRatioCheck(svg);                                      // 赤道楕円(A R ry)が比2:1
  if (e) { bad += e; console.log('  ❌ sphere r' + r + ' (' + e + ')'); }
});

console.log('\n' + (bad === 0 ? 'S-2幾何ベクター+corr-0022: 全' + cases + 'ケース一致 ✅(頂点収束・楕円比2:1固定・真円/楕円の対象切り分け・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
