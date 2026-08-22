// clock_face_vectors.js — 小学第2波 clock_face(時計文字盤・読み専用)幾何ベクター+三重関門+corr-0020悉皆。
// 針角度(短針=30h+0.5m/長針=6m・12時=0度・時計回り)・数字1〜12の円周座標・分目盛60(5分毎長)・
// 文字盤真円(<circle>=構造的真円)・viewport・契約(h∈[1,12]/m∈[0,59]でthrow)・シード非依存。
// スキャン: バンク想定3構成 (i)正時 (ii)半 (iii)何分5刻み(0,30除く) ×h全12=144組の数字×針clearance悉皆。
//
// 実行:  node tests/clock_face_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const DEG = Math.PI / 180;
let bad = 0, cases = 0;

function fp(h, m) { return { kind: 'clock_face', h: h, m: m }; }
function pos(deg, r) { return [r * Math.sin(deg * DEG), -r * Math.cos(deg * DEG)]; }  // svg座標(y下)・12時=0度・時計回り

console.log('=== (1) 針角度・数字座標・目盛(幾何ベクター) ===');
[[3, 0], [7, 30], [2, 35], [12, 0], [6, 30], [9, 45], [1, 5], [11, 55], [4, 20], [10, 50], [5, 15], [8, 40]].forEach(function (t) {
  const h = t[0], m = t[1], g = FB._geom.clock_face(fp(h, m)), svg = FB.build(fp(h, m));
  let e = 0; cases++;
  // 針角度の決定式
  if (Math.abs(g.hourAngle - (30 * h + 0.5 * m)) > 1e-9) e++;
  if (Math.abs(g.minAngle - 6 * m) > 1e-9) e++;
  // SVG実描画の針先端(太4.6=短針・細2.2=長針)を式から独立照合(±0.5px)
  const hh = svg.match(/<line x1="[-\d.]+" y1="[-\d.]+" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#1a56c4" stroke-width="4.6"/);
  const mh = svg.match(/<line x1="[-\d.]+" y1="[-\d.]+" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#1a56c4" stroke-width="2.2"/);
  const eh = pos(30 * h + 0.5 * m, g.hourLen), em = pos(6 * m, g.minLen);
  if (!hh || Math.hypot(+hh[1] - eh[0], +hh[2] - eh[1]) > 0.5) e++;
  if (!mh || Math.hypot(+mh[1] - em[0], +mh[2] - em[1]) > 0.5) e++;
  // 数字1〜12の円周座標(角度30k・半径numR・±0.5px)
  for (let k = 1; k <= 12; k++) {
    const re = new RegExp('<text x="([-\\d.]+)" y="([-\\d.]+)"[^>]*>' + k + '</text>');
    const tm = svg.match(re); if (!tm) { e++; continue; }
    const ex = pos(30 * k, g.numR);
    if (Math.hypot(+tm[1] - ex[0], (+tm[2] - 14 * 0.34) - ex[1]) > 0.75) e++;   // textElのy+fs*0.34補正
  }
  // 目盛60本(5分毎=太1.8が12本・他=1が48本)
  const long = (svg.match(/stroke-width="1\.8"/g) || []).length, short = (svg.match(/stroke-width="1"\/>/g) || []).length;
  if (long !== 12 || short !== 48) e++;
  // 文字盤=<circle>(構造的真円・r=R)
  const rim = svg.match(/<circle [^>]*r="(\d+)"[^>]*stroke-width="2\.4"/);
  if (!rim || +rim[1] !== g.R) e++;
  if (FB.build(fp(h, m)) !== svg) e++;                    // シード非依存
  if (svg.indexOf('undefined') >= 0) e++;
  if (e) { bad += e; console.log('  ❌ ' + h + ':' + String(m).padStart(2, '0') + ' (' + e + ')'); }
});
console.log('  12時刻×(角度式・実描画照合・数字12・目盛60・真円・シード) ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) viewport・契約違反throw ===');
(function () {
  cases++;
  const svg = FB.build(fp(3, 0)), hdr = (svg.match(/<svg[^>]*>/) || [''])[0];
  const w = +(hdr.match(/ width="([\d.]+)"/) || [])[1], hgt = +(hdr.match(/ height="([\d.]+)"/) || [])[1];
  const vb = hdr.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!w || !vb || Math.abs((w / hgt) / (+vb[1] / +vb[2]) - 1) > 0.02) { bad++; console.log('  ❌ viewport'); }
  if (w > 260) { bad++; console.log('  ❌ モバイル幅超過 w=' + w); }   // UI整合(既存図と同帯)
})();
[[0, 0], [13, 0], [3, -1], [3, 60]].forEach(function (t) {
  cases++; let threw = false;
  try { FB.build(fp(t[0], t[1])); } catch (e) { threw = true; }
  if (!threw) { bad++; console.log('  ❌ 契約(' + t + ')が非throw'); }
});
console.log('  viewport・契約4種 ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (3) corr-0020悉皆: (i)正時12 (ii)半12 (iii)何分5刻み(0,30除く)10値×12=120 → 計144組 ===');
(function () {
  let n = 0, viol = 0, minMT = 1e9, minSeg = 1e9, worst = null;
  const combos = [];
  for (let h = 1; h <= 12; h++) {
    combos.push([h, 0]); combos.push([h, 30]);
    for (let m = 5; m < 60; m += 5) if (m !== 30) combos.push([h, m]);
  }
  combos.forEach(function (t) {
    n++;
    const cl = FB._clockFaceMinClearance(fp(t[0], t[1]));
    if (cl.minText < minMT) minMT = cl.minText;
    if (cl.minSeg < minSeg) { minSeg = cl.minSeg; worst = t; }
    if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { viol++; if (viol <= 5) console.log('  ❌ ' + t[0] + ':' + t[1] + ' minText=' + cl.minText.toFixed(2) + ' minSeg=' + cl.minSeg.toFixed(2)); }
  });
  cases += n; if (viol) bad += viol;
  console.log('  組' + n + ' / 違反' + viol + ' / min(minText ' + minMT.toFixed(1) + ', minSeg ' + minSeg.toFixed(1) + '@' + worst + ') ' + (viol === 0 ? '✅(針が数字を横切らない配置を全時刻で保証)' : '❌'));
})();

console.log('\n' + (bad === 0 ? 'clock_face: 全' + cases + '照合 一致 ✅(針角度決定式・数字円周・目盛60・真円・契約・144組clearance悉皆・シード非依存)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
