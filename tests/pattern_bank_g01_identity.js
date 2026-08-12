// g01(小1・加法/減法)12パターンの恒等検算(設計側ストレスと同一仕様)。
// 各パターンの答え=answer_formula の恒等性 + 制約(転記退化排除・桁上/桁下条件)を高volで悉皆検証。
//
// 実行:  node tests/pattern_bank_g01_identity.js [N]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_g01.json'), 'utf-8'));
const lex = bank.shared_lexicon || {};
const N = Number(process.argv[2] || 3000);

// pattern_id -> (env) => bool。設計側ストレスと同一仕様。
const ID = {
  g01_add_nocarry_01: e => e.ans === e.a1 + e.b1 && e.ans <= 9,
  g01_add_carry_01: e => e.ans === e.a1 + e.b1 && e.ans >= 11 && e.ans <= 18,
  g01_sub_noborrow_01: e => e.ans === e.a1 - e.b1 && e.ans >= 1 && e.a1 !== 2 * e.b1,
  g01_sub_borrow_01: e => e.ans === e.a1 - e.b1 && (e.a1 % 10) < e.b1 && e.ans >= 1 && e.ans <= 9 && e.a1 !== 2 * e.b1,
  g01_threenum_01: e => e.ans === e.a1 + e.b1 - e.c1 && ![e.a1, e.b1, e.c1].includes(e.ans),
  g01_compose_01: e => e.ans === 10 + e.k1,
  g01_decompose_01: e => e.ans === e.n1 - 10,
  g01_box_add_01: e => e.a1 + e.ans === e.b1 && e.ans >= 1 && e.ans <= 9 && e.ans !== e.a1,
  g01_bunsho_awasete_01: e => e.ans === e.a1 + e.b1 && e.ans <= 15,
  g01_bunsho_nokori_01: e => e.ans === e.a1 - e.b1 && e.ans >= 1 && e.ans !== e.b1,
  g01_bunsho_chigai_01: e => e.ans === e.a1 - e.b1 && e.a1 > e.b1 && e.ans !== e.b1,
  g01_kurabe_01: e => e.ans === Math.max(e.a1, e.b1) && e.a1 !== e.b1,
};

let bad = 0, checked = 0;
const ids = new Set(bank.patterns.map(p => p.pattern_id));
// 登録漏れ検出
for (const id of Object.keys(ID)) if (!ids.has(id)) { console.log('⚠️ ID登録あり・バンク不在: ' + id); bad++; }
for (const id of ids) if (!ID[id]) { console.log('⚠️ バンク存在・ID未登録: ' + id); bad++; }

for (const p of bank.patterns) {
  const chk = ID[p.pattern_id]; if (!chk) continue;
  let pb = 0;
  for (let i = 0; i < N; i++) {
    let r; try { r = P.makeProblem(p, null, lex); } catch (e) { pb++; bad++; continue; }
    checked++;
    if (!chk(r.env)) { pb++; bad++; if (pb <= 2) console.log('  NG ' + p.pattern_id + ' env=' + JSON.stringify(r.env)); }
  }
  console.log('  ' + p.pattern_id.padEnd(24) + ' ' + N + '本 恒等' + (pb === 0 ? 'OK ✅' : 'NG ' + pb + ' ❌'));
}
console.log('\n' + (bad === 0 ? 'g01 恒等検算: 全12パターン合格 ✅ (' + checked + '本)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
