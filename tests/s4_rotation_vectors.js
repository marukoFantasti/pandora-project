// s4_rotation_vectors.js — 第2ブロックS-4 rotation_source(回転体の源)幾何ベクター。
// 軸位置(x=0の一点鎖線)・図形の軸接触(rect/tri=辺が軸上/semi=直径が軸上)・半円弧の真円性(corr-0019・rx==ry==R)・
// 直角三角形の直角記号・寸法ラベルr/h。乱数なし=シード非依存。回転後の立体は非描画(源のみ)。
//
// 実行:  node tests/s4_rotation_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
const AXIS = 'stroke-dasharray="7,3,1.5,3"';

function axisLineX(svg) {   // 一点鎖線の軸: x1==x2 を返す(無ければnull)
  const m = svg.match(/<line x1="([-\d.]+)" y1="[-\d.]+" x2="([-\d.]+)" y2="[-\d.]+"[^>]*stroke-dasharray="7,3,1\.5,3"/);
  return m ? [+m[1], +m[2]] : null;
}
function polyPoints(svg) {
  const m = svg.match(/<polygon points="([^"]+)"/);
  return m ? m[1].trim().split(' ').map(p => p.split(',').map(Number)) : [];
}

console.log('=== S-4 rotation_source 幾何ベクター(軸・図形接触・真円半円・直角記号) ===');
// rect / right_tri: rx=r·scale・H=h·scale・軸x=0・図形の2点が軸上(x=0)・寸法r/h・一点鎖線
[['rect', [4, 9]], ['rect', [2, 13]], ['rect', [10, 3]], ['rect', [6, 7]], ['rect', [3, 15]],
['right_tri', [4, 9]], ['right_tri', [3, 6]], ['right_tri', [8, 12]], ['right_tri', [2, 5]], ['right_tri', [10, 15]]].forEach(function (t) {
  const sk = t[0], r = t[1][0], h = t[1][1], fp = { kind: 'rotation_source', source_kind: sk, r: r, height: h, unit: 'cm' };
  const g = FB._geom.rotation_source(fp), svg = FB.build(fp); let e = 0; cases++;
  if (Math.abs(g.rx - r * g.scale) > 0.5) e++;
  if (Math.abs(g.H - h * g.scale) > 0.5) e++;
  const ax = axisLineX(svg);
  if (!ax || Math.abs(ax[0]) > 0.01 || Math.abs(ax[1]) > 0.01) e++;               // 軸=一点鎖線・x=0(縦)
  const pts = polyPoints(svg), onAxis = pts.filter(p => Math.abs(p[0]) < 0.5).length;
  if (onAxis < 2) e++;                                                            // 図形の辺(2点)が軸上
  if (svg.indexOf(r + 'cm') < 0 || svg.indexOf(h + 'cm') < 0) e++;                // 寸法r/h
  if (sk === 'right_tri' && !/stroke="#1D9E75" stroke-width="1\.6"/.test(svg)) e++; // 直角記号(緑)
  if (FB.build(fp) !== FB.build(fp)) e++;                                         // シード非依存
  if (svg.indexOf('undefined') >= 0) e++;
  if (e) { bad += e; console.log('  ❌ ' + sk + ' r' + r + ' h' + h + ' (' + e + ')'); }
});
// semicircle: R=r·scale・半円弧=真円(A R R・rx==ry==R)・直径が軸上(x=0)・半径ラベル
[3, 5, 8].forEach(function (r) {
  const fp = { kind: 'rotation_source', source_kind: 'semicircle', r: r, unit: 'cm' };
  const g = FB._geom.rotation_source(fp), svg = FB.build(fp); let e = 0; cases++;
  if (Math.abs(g.R - r * g.scale) > 0.5) e++;
  const arc = svg.match(/<path d="M [-\d.]+ [-\d.]+ A ([\d.]+) ([\d.]+) 0 \d \d/);
  if (!arc || arc[1] !== arc[2] || Math.abs(+arc[1] - g.R) > 0.5) e++;            // 半円弧=真円 rx==ry==R(corr-0019)
  const ax = axisLineX(svg);
  if (!ax || Math.abs(ax[0]) > 0.01) e++;                                         // 軸x=0
  // 直径(実線)が軸上: <line x1=0 ... x2=0>(dash無し)
  if (!/<line x1="0\.00" y1="[-\d.]+" x2="0\.00" y2="[-\d.]+" stroke="#1a56c4" stroke-width="2"/.test(svg)) e++;
  if (svg.indexOf(r + 'cm') < 0) e++;
  if (svg.indexOf('undefined') >= 0) e++;
  if (e) { bad += e; console.log('  ❌ semicircle r' + r + ' (' + e + ')'); }
});
// 一点鎖線が新描画要素として存在(全kind)
(function () {
  const has = ['rect', 'right_tri', 'semicircle'].every(function (sk) {
    return FB.build({ kind: 'rotation_source', source_kind: sk, r: 4, height: 8, unit: 'cm' }).indexOf(AXIS) >= 0;
  });
  if (!has) bad++;
  console.log('  一点鎖線(dash-dot軸)全kind描画: ' + (has ? '✅' : '❌'));
})();

console.log('\n' + (bad === 0 ? 'S-4幾何ベクター: 全' + cases + 'ケース一致 ✅(軸x=0一点鎖線・図形の軸接触・半円=真円rx==ry==R・直角記号・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
