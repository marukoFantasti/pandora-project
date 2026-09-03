// line_set_vectors.js — e-2 Kind: line_set(直線散布・垂直/平行組合せ)の関門(設計書§1.4・corr-0030原則)。
// 角度差検査(正答ペア|Δθ|<0.5/|Δθ−90|<0.5・非正答は余白12°以上)・包含/交点検査(線分キャンバス内・
// 垂直ペア交点あり・端寄り/三重交点なし)・ラベル帰属(最近傍線分=担当)・決定性。悉皆域=3行構成×seed200。
//
// 実行:  node tests/line_set_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
const ROWS = [
  { labels: ['ウ', 'エ', 'オ', 'カ', 'ク', 'ケ'], pairs: { perpendicular: [['カ', 'ケ'], ['ウ', 'エ']], parallel: [['オ', 'ク']] } },
  { labels: ['ウ', 'エ', 'オ', 'カ', 'ク', 'ケ'], pairs: { perpendicular: [['オ', 'ケ'], ['ウ', 'エ']], parallel: [['カ', 'ク']] } },
  { labels: ['ウ', 'エ', 'オ', 'ク', 'ケ', 'コ'], pairs: { perpendicular: [['オ', 'ケ'], ['ウ', 'エ']], parallel: [['ク', 'コ']] } }
];
function fp(row, seed) { return Object.assign({ kind: 'line_set', seed: seed }, row); }

console.log('=== (1) 悉皆: 3行構成×seed1..200 = 角度差/包含/交点/ラベル帰属/決定性 ===');
let nLbl = 0, fails = 0, maxCross = 0;
ROWS.forEach(function (row, ri) {
  for (let s = 1; s <= 200; s++) {
    cases++;
    let a;
    try { a = FB._lineSetAudit(fp(row, s)); } catch (e) { fails++; bad++; if (fails <= 3) console.log('  ❌ row' + ri + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
    if (a.issues.length) { bad++; if (fails++ <= 3) console.log('  ❌ row' + ri + ' seed' + s + ' issues=' + a.issues.slice(0, 2)); }
    a.labels.forEach(function (l) { nLbl++; if (!l.ok) { bad++; if (fails++ <= 3) console.log('  ❌ 帰属 row' + ri + ' seed' + s + ' ' + l.own + '→' + l.nearest); } });
    Object.keys(a.cross).forEach(function (k) { if (a.cross[k] > 2) { bad++; if (fails++ <= 3) console.log('  ❌ 交差>2 row' + ri + ' seed' + s + ' ' + k); } maxCross = Math.max(maxCross, a.cross[k]); });
    if (FB.build(fp(row, s)) !== FB.build(fp(row, s))) { bad++; console.log('  ❌ 非決定 seed' + s); }
  }
});
console.log('  ' + cases + '構成 / ラベル' + nLbl + ' / 交差相手max' + maxCross + '(上限2) ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) 契約throw(labels不足・明示linesの角度違反・余白違反) ===');
const b2 = bad;
[
  { kind: 'line_set', labels: ['ア'], pairs: {} },
  { kind: 'line_set', labels: ['ア', 'イ'], pairs: { parallel: [['ア', 'イ']] }, lines: [{ label: 'ア', angle: 20, cx: 0.4, cy: 0.5, len: 0.5 }, { label: 'イ', angle: 25, cx: 0.6, cy: 0.5, len: 0.5 }] },
  { kind: 'line_set', labels: ['ア', 'イ'], pairs: {}, lines: [{ label: 'ア', angle: 20, cx: 0.4, cy: 0.5, len: 0.5 }, { label: 'イ', angle: 25, cx: 0.6, cy: 0.5, len: 0.5 }] },
  { kind: 'line_set', labels: ['ア', 'イ'], pairs: {}, lines: [{ label: 'ア', angle: 0, cx: 0.5, cy: 0.5, len: 1.2 }, { label: 'イ', angle: 60, cx: 0.5, cy: 0.5, len: 0.5 }] }
].forEach(function (o) { cases++; let t = false; try { FB.build(o); } catch (e) { t = true; } if (!t) { bad++; console.log('  ❌ 非throw ' + JSON.stringify(o.labels)); } });
console.log('  契約4種 ' + (bad === b2 ? '✅' : '❌'));

console.log('\n' + (bad === 0 ? 'line_set: 全' + cases + '照合 一致 ✅(悉皆600+契約4)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
