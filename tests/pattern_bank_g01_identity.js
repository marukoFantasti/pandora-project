// g01(小1・加法/減法)43パターンの恒等検算(12+バッチ1 11+バッチ2 8+バッチ3 12)(設計側ストレスと同一仕様)。
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
  // バッチ1(P-1第一波・11パターン)
  g01_add_zero_01: e => e.ans === e.a1 + e.b1 && (e.a1 === 0 || e.b1 === 0) && e.ans >= 0,
  g01_sub_zero_01: e => e.ans === e.a1 - e.b1 && (e.b1 === 0 || e.a1 === e.b1) && e.ans >= 0,
  g01_add_tens_01: e => e.ans === 10 * (e.t1 + e.t2) && e.t1 + e.t2 <= 13,
  g01_sub_tens_01: e => e.ans === 10 * (e.t1 - e.t2) && e.t1 > e.t2 && e.t1 !== 2 * e.t2,
  g01_add_tensone_01: e => e.ans === 10 * e.t1 + e.u1 + e.v1 && e.u1 + e.v1 <= 9,
  g01_sub_tensone_01: e => e.ans === 10 * e.t1 + e.u1 - e.v1 && e.v1 <= e.u1,
  g01_threenum_mix_01: e => e.ans === e.a1 - e.b1 + e.c1 && e.a1 - e.b1 >= 1 && e.ans <= 15 && e.b1 !== e.c1 && e.a1 !== e.b1 && e.a1 + e.c1 !== 2 * e.b1,
  g01_bunsho_kyudai_01: e => e.ans === e.b1 + e.d1 && e.ans <= 15,
  g01_bunsho_kyusho_01: e => e.ans === e.b1 - e.d1 && e.ans >= 2 && e.b1 !== 2 * e.d1,
  g01_bunsho_onaji_01: e => e.ans === e.d1 * e.n1 && e.ans <= 15,
  g01_bunsho_kyuho_01: e => e.ans === e.a1 - e.b1 && e.ans >= 2 && e.a1 !== 2 * e.b1,
  // バッチ2(P-1第二波・8パターン。num_seq系=先頭要素+全要素をここで照合)
  g01_kurai_kosei_01: e => e.ans === 10 * e.x1 + e.y1,
  g01_kurai_bunkai_01: e => e.ans === e.x1 && e.N1 === 10 * e.x1 + e.y1 && e.x1 >= 1 && e.x1 <= 9 && e.y1 >= 1 && e.y1 <= 9,
  g01_hyaku_kosei_01: e => e.ans === 100 * e.h1 + 10 * e.t1 && e.ans <= 210,
  g01_kurabe_ookii_01: e => e.ans === Math.max(e.a1, e.b1) && e.a1 !== e.b1,
  g01_seq_tsugi_01: e => e.ans === e.n1 + 1,
  g01_seq_mae_01: e => e.ans === e.n1 - 1,
  g01_seq_ana_01: e => e.ans === e.s1 + 2 && e.d1 === e.s1 + 1 && e.n1d === e.s1 + 2 && e.n2d === e.s1 + 3 && e.e1 === e.s1 + 4,
  g01_seq_tobi_01: e => e.ans === e.s1 + 2 * e.k1 && [2, 5, 10].includes(e.k1) && e.d1 === e.s1 + e.k1 && e.n1d === e.s1 + 2 * e.k1 && e.n2d === e.s1 + 3 * e.k1 && e.e1 === e.s1 + 4 * e.k1 && e.e1 <= 120,
  // バッチ3(P-1完了便・12パターン。word_choice系=番号一致+語マップ整合はスモークで確認)
  g01_junjo_banme_01: e => e.ans === e.n1 - e.k1 && e.k1 <= e.n1 - 2 && e.n1 !== 2 * e.k1,
  g01_junjo_shugo_01: e => e.ans === e.n1 - e.k1 && e.k1 <= e.n1 - 2 && e.n1 !== 2 * e.k1,
  g01_jikan_ato_01: e => e.ans === e.h1 + e.d1 && e.ans <= 12,
  g01_jikan_mae_01: e => e.ans === e.h1 - e.d1 && e.ans >= 1 && e.h1 !== 2 * e.d1,
  g01_kurabe_nagasa_01: e => e.ans === (e.a1 > e.b1 ? 1 : 2) && e.a1 !== e.b1,
  g01_kurabe_kasa_01: e => e.ans === (e.a1 > e.b1 ? 1 : 2) && e.a1 !== e.b1,
  g01_kurabe_hirosa_01: e => e.ans === (e.a1 > e.b1 ? 1 : 2) && e.a1 !== e.b1,
  g01_kurabe_ichiban_01: e => e.ans === ((e.a1 > e.b1 && e.a1 > e.c1) ? 1 : (e.b1 > e.c1 ? 2 : 3)) && e.a1 !== e.b1 && e.b1 !== e.c1 && e.a1 !== e.c1,
  g01_katachi_utsushi_01: e => e.ans === e.j1 + 1 && [0, 1, 2].includes(e.j1),
  g01_katachi_nakama_01: e => e.ans === (e.s1 === 0 ? 1 : 2) && e.c1 !== e.d1 && [0, 1].includes(e.s1),
  g01_katachi_kosei_01: e => e.ans === e.kn1 && [2, 4].includes(e.kn1),
  g01_kazushirabe_ooi_01: e => e.ans === ((e.a1 > e.b1 && e.a1 > e.c1) ? 1 : (e.b1 > e.c1 ? 2 : 3)) && e.a1 !== e.b1 && e.b1 !== e.c1 && e.a1 !== e.c1,
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
console.log('\n' + (bad === 0 ? 'g01 恒等検算: 全43パターン合格 ✅ (' + checked + '本)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
