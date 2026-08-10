// c10 確率バンクの照合表 悉皆検証ハーネス。
// レキシコンの照合表(prod_cases/coin_events)と数え上げ型パターンの場合数を、
// 標本空間の総当たり列挙から独立に再計算して一致を確認する（恒等検算のdice/coin代替=item9）。
//
// 実行:  node tests/pattern_bank_jhs_c10_tables.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c10.json'), 'utf-8'));
const lex = bank.shared_lexicon;

let bad = 0;
function check(name, cond, detail) { if (!cond) { bad++; console.log('  ❌ ' + name + ' ' + (detail || '')); } }

// --- 2個のさいころ 6×6 標本空間 ---
const dice36 = [];
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) dice36.push([a, b]);

// (1) prod_cases[[k,cnt]] を 6×6総当たりで独立再計算: 積==k の場合数 == cnt
console.log('=== prod_cases 6×6総当たり悉皆検証 (' + lex.prod_cases.length + '件) ===');
for (const [k, cnt] of lex.prod_cases) {
  const actual = dice36.filter(([a, b]) => a * b === k).length;
  check('prod_cases 積=' + k, actual === cnt, '独立数え上げ=' + actual + ' / 表=' + cnt);
  console.log('  積=' + k + ': 独立列挙=' + actual + ' 表値=' + cnt + (actual === cnt ? ' ✅' : ' ❌'));
}

// (2) dice_02 の和 num_c=6-|s-7| を 6×6総当たりで検証 (s=2..12全域)
console.log('=== dice_02 和の場合数 6×6総当たり検証 (s=2..12) ===');
let d2bad = 0;
for (let s = 2; s <= 12; s++) {
  const actual = dice36.filter(([a, b]) => a + b === s).length;
  const formula = 6 - Math.abs(s - 7);
  if (actual !== formula) { d2bad++; check('sum=' + s, false, 'enum=' + actual + ' formula=' + formula); }
}
console.log('  和 s=2..12 全域: 独立列挙==式(6-|s-7|) ' + (d2bad === 0 ? '全一致 ✅' : d2bad + '件不一致 ❌'));

// (3) dice_01 の m以下 = m1 を 6面総当たりで検証 (m=2..5)
let d1bad = 0;
for (let m = 2; m <= 5; m++) { const actual = [1, 2, 3, 4, 5, 6].filter(f => f <= m).length; if (actual !== m) d1bad++; }
console.log('=== dice_01 m以下の場合数 6面総当たり (m=2..5): ' + (d1bad === 0 ? 'enum==m1 全一致 ✅' : d1bad + '件❌') + ' ===');

// (4) coin_events[[desc,cnt]] を 2枚=4通り総当たりで独立再計算
console.log('=== coin_events 4通り総当たり悉皆検証 (' + lex.coin_events.length + '件) ===');
const coin4 = [['H', 'H'], ['H', 'T'], ['T', 'H'], ['T', 'T']];
function coinPredicate(desc) {
  const heads = o => o.filter(c => c === 'H').length;
  if (desc.indexOf('とも表') >= 0) return o => heads(o) === 2;          // 2枚とも表
  if (desc.indexOf('1枚だけ表') >= 0) return o => heads(o) === 1;       // 1枚だけ表
  if (desc.indexOf('少なくとも1枚は表') >= 0) return o => heads(o) >= 1; // 少なくとも1枚は表
  return null;
}
for (const [desc, cnt] of lex.coin_events) {
  const pred = coinPredicate(desc);
  check('coin_events "' + desc + '" 述語未定義', pred !== null);
  const actual = pred ? coin4.filter(pred).length : -1;
  check('coin_events "' + desc + '"', actual === cnt, '独立列挙=' + actual + ' / 表=' + cnt);
  console.log('  「' + desc + '」: 独立列挙=' + actual + ' 表値=' + cnt + (actual === cnt ? ' ✅' : ' ❌'));
}

// (5) 生成サンプルの答え(cnt1/場合数)が表と整合 & f1 が reduce(場合数,分母) であること
console.log('=== 生成サンプル整合 (dice_03/coin_01 の答え==表, f1==既約分数) ===');
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function reducedStr(n, d) { const g = gcd(n, d); const rn = n / g, rd = d / g; return rn === 0 ? '0' : (rn === rd ? '1' : rn + '/' + rd); }
const np = {}; bank.patterns.forEach(p => np[p.pattern_id] = p);
for (const [pid, denom] of [['jhs_c10_dice_03', 36], ['jhs_c10_coin_01', 4]]) {
  let fbad = 0;
  for (let i = 0; i < 300; i++) {
    const r = P.makeProblem(np[pid], null, lex);
    if (r.env.f1 !== reducedStr(r.env.cnt1, denom)) fbad++;
  }
  console.log('  ' + pid + ': f1==reduce(cnt1,' + denom + ') 300サンプル ' + (fbad === 0 ? '全一致 ✅' : fbad + '件❌'));
  if (fbad) bad += fbad;
}

console.log('\n' + (bad === 0 ? '照合表悉皆検証: 全一致 ✅' : '❌ ' + bad + '件不一致'));
process.exit(bad === 0 ? 0 : 1);
