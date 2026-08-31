// composite_area_vectors.js — P5-3 Kind B: composite_area(かぎ型/L字/コの字/くりぬき/複合)の幾何ベクター+clearance悉皆。
// 追補A cuts一般化(角4種/辺+offset/hole・1〜3個)・§2.1糖衣cut単数・正面積契約throw・
// 輪郭線分構成(外形−接触区間+切欠き内側辺)・直角マーク・ラベル対輪郭clearance・シード非依存。
//
// 実行:  node tests/composite_area_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
function fp(o) { return Object.assign({ kind: 'composite_area', unit: 'cm' }, o); }
const clr = FB._compositeAreaMinClearance;

console.log('=== (1) 構成別の面積・線分・直角マーク ===');
[
  ['L字(角)', { outer: { w: 9, h: 8 }, cuts: [{ w: 5, h: 2, at: 'top_right' }] }, { area: 62, lines: 6, marks: 6 }],
  ['コの字(辺+offset)', { outer: { w: 12, h: 8 }, cuts: [{ w: 4, h: 3, at: 'top', offset: 4 }] }, { area: 84, lines: 8, marks: 8 }],
  ['くりぬき(hole)', { outer: { w: 15, h: 20 }, cuts: [{ w: 9, h: 9, at: 'hole' }] }, { area: 219, lines: 8, marks: 8 }],
  ['複合2切欠き', { outer: { w: 14, h: 10 }, cuts: [{ w: 4, h: 3, at: 'top_left' }, { w: 5, h: 2, at: 'bottom_right' }] }, { area: 118, lines: 8, marks: 8 }],
  ['3切欠き(角+辺+hole)', { outer: { w: 16, h: 12 }, cuts: [{ w: 3, h: 3, at: 'top_left' }, { w: 4, h: 2, at: 'bottom', offset: 6 }, { w: 2, h: 2, at: 'hole', x: 10, y: 7 }] }, { area: 171, lines: 14, marks: 14 }],
  ['§2.1糖衣cut単数', { outer: { w: 8, h: 6 }, cut: { w: 3, h: 2, corner: 'top_right' } }, { area: 42, lines: 6, marks: 6 }]
].forEach(function (t) {
  cases++; let e = 0;
  const g = FB._geom.composite_area(fp(t[1]));
  const svg = FB.build(fp(t[1]));
  if (g.area !== t[2].area) e++;
  if ((svg.match(/<line/g) || []).length !== t[2].lines) e++;
  if ((svg.match(/stroke="#888"/g) || []).length !== t[2].marks) e++;
  if (svg.indexOf('undefined') >= 0 || svg.indexOf('NaN') >= 0) e++;
  if (FB.build(fp(t[1])) !== svg) e++;
  if (e) { bad += e; console.log('  ❌ ' + t[0] + ' (' + e + ')'); }
});
console.log('  6構成 ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) 正面積契約throw(6種) ===');
const b2 = bad;
[
  { outer: { w: 8, h: 6 }, cuts: [{ w: 9, h: 2, at: 'top_left' }] },                       // cut外形超過
  { outer: { w: 8, h: 6 }, cuts: [{ w: 4, h: 3, at: 'top_left' }, { w: 5, h: 4, at: 'top_left' }] },  // 交差
  { outer: { w: 8, h: 6 }, cuts: [{ w: 8, h: 6, at: 'bottom_left' }] },                    // 残面積0
  { outer: { w: 8, h: 6 }, cuts: [{ w: 2, h: 2, at: 'hole', x: 7, y: 2 }] },               // holeはみ出し
  { outer: { w: 8, h: 6 }, cuts: [] },                                                     // cuts空
  { outer: { w: 8, h: 6 }, cuts: [{ w: 2, h: 2, at: 'diagonal' }] }                        // at不正
].forEach(function (o) {
  cases++; let threw = false;
  try { FB.build(fp(o)); } catch (e) { threw = true; }
  if (!threw) { bad++; console.log('  ❌ 非throw ' + JSON.stringify(o.cuts)); }
});
console.log('  契約6種 ' + (bad === b2 ? '✅' : '❌'));

console.log('=== (3) clearance悉皆(L字/コの字/hole×寸法域) ===');
(function () {
  const b3 = bad;
  let n = 0, viol = 0, minMT = 1e9, minSeg = 1e9, worst = null;
  const combos = [];
  for (let W = 6; W <= 20; W += 2) for (let H = 5; H <= 15; H += 2)
    for (let cw = 2; cw < W - 1; cw += 2) for (let ch = 2; ch < H - 1; ch += 2) {
      combos.push({ outer: { w: W, h: H }, cuts: [{ w: cw, h: ch, at: 'top_right' }] });
      if (cw + 4 <= W) combos.push({ outer: { w: W, h: H }, cuts: [{ w: cw, h: ch, at: 'top', offset: 2 }] });
      if (cw >= 4 && ch >= 4 && cw + 4 <= W && ch + 4 <= H) combos.push({ outer: { w: W, h: H }, cuts: [{ w: cw, h: ch, at: 'hole' }] });  // hole実需域(バンク実在7〜9)
    }
  combos.forEach(function (co) {
    n++;
    const c = clr(fp(co));
    if (c.minText < minMT) minMT = c.minText;
    if (c.minSeg < minSeg) { minSeg = c.minSeg; worst = co; }
    if (c.minText < 8 || c.semBad > 0) { viol++; if (viol <= 5) console.log('  ❌ ' + JSON.stringify(co) + ' mT=' + c.minText.toFixed(1) + ' mS=' + c.minSeg.toFixed(1) + ' sem=' + c.semBad); }
  });
  cases += n; if (viol) bad += viol;
  console.log('  組' + n + ' / 違反' + viol + ' / min(minText ' + minMT.toFixed(1) + ', minSeg ' + minSeg.toFixed(1) + ') ' + (viol === 0 ? '✅' : '❌'));
})();

console.log('\n' + (bad === 0 ? 'composite_area: 全' + cases + '照合 一致 ✅(6構成・契約throw・clearance悉皆・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
