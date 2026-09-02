// p53_static_assets.js — P5-3第4便: 例示図2枚のバイト封印 + polyline3行の保存答再導出assert(§設計書h-3/h-4)。
// 例示図(だん積み/ようじ)は固定ベクター=md5封印(意図的更新時は本ファイルのmd5を併せて更新)。
// polyline検算: バンクの系列(figure_params.series)から各保存/再生成答を再導出して一致をassert。
//
// 実行:  node tests/p53_static_assets.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let bad = 0;

console.log('=== (1) 例示図2枚のバイト封印 ===');
const SEALS = {
  'pattern_bank/handoff_jhs/p53_dan_example.svg': '3afc7630b8ac9a3503180bff27c580de',
  'pattern_bank/handoff_jhs/p53_yoji_example.svg': '7705de410a6a86b12e1ac820549c0105'
};
for (const [f, md] of Object.entries(SEALS)) {
  const got = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
  if (got !== md) { bad++; console.log('  ❌ ' + f + ' md5=' + got + ' (封印 ' + md + ')'); }
}
console.log('  封印2枚 ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (2) polyline3行: 保存答の系列再導出 ===');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_g04.json'), 'utf-8'));
const byId = {};
bank.patterns.forEach(p => { byId[p.pattern_id] = p; });
function y(pid, si) { return byId[pid].figure_params.series[si].y; }
const b2 = bad;
// row2: y=x+5 → ①7分後=12(保存) ②外挿35分後=5+35=40(再生成)
(function () {
  const s = y('g04_kawari_mizu_01', 0);
  if (s[7] !== 12) { bad++; console.log('  ❌ mizu ①: y[7]=' + s[7]); }
  const slope = s[1] - s[0];
  s.forEach((v, i) => { if (v !== s[0] + slope * i) { bad++; } });   // 直線性
  if (s[0] + slope * 35 !== 40) { bad++; console.log('  ❌ mizu ②外挿'); }
})();
// row4: y=70−2x(5分刻み) → ①20分後=30(再生成) ②x切片=35分後(保存)
(function () {
  const s = y('g04_kawari_senko_01', 0);
  if (s[4] !== 30) { bad++; console.log('  ❌ senko ①: x=20(idx4)=' + s[4]); }
  if (s[7] !== 0) { bad++; console.log('  ❌ senko ②: x=35(idx7)=' + s[7]); }
  const d = s[1] - s[0];
  s.forEach((v, i) => { if (v !== s[0] + d * i) { bad++; } });
})();
// row6: A=20+x・B=2+3x → ①|A−B|(4)=10(保存) ②A(9)==B(9)(保存)・交点前後の大小逆転
(function () {
  const A = y('g04_kawari_futatsu_01', 0), B = y('g04_kawari_futatsu_01', 1);
  if (Math.abs(A[4] - B[4]) !== 10) { bad++; console.log('  ❌ futatsu ①差: ' + (A[4] - B[4])); }
  if (A[9] !== B[9]) { bad++; console.log('  ❌ futatsu ②等値'); }
  if (!(A[8] > B[8] && B[10] > A[10])) { bad++; console.log('  ❌ futatsu 交点前後の大小逆転'); }
})();
console.log('  再導出assert ' + (bad === b2 ? '✅' : '❌'));

console.log('\n' + (bad === 0 ? 'p53_static_assets: GREEN ✅(封印2+系列検算3行)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
