// jhs 恒等検算ハーネス（c04で確立した品質基準・corr-0006の合成E2E思想の延長）。
// 生成解を各パターンの「元の等式」に代入し、整数の完全一致で成立を確認する。
// パリティ(JS答え==Python答え)が「両言語が同じ答えを出す」ことを保証するのに対し、
// 本ハーネスは「その答えが問題の等式を実際に満たす」ことを保証する（答え自体の正しさ）。
//
// 検算式は rationale の source_features/representation 由来（指示書の正準形）。
// 新jhsバンク追加時は当該パターンの ID チェックをここに登録すること（未登録は WARN）。
//
// 実行:  node tests/pattern_bank_jhs_identity.js [samplesPerPattern] [bankGlob]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));

const N = Number(process.argv[2] || 200);
const glob = process.argv[3] || 'jhs_c0';   // 既定: jhs バンク全部

// pid -> (env, ans) => bool。env はスロット整数、ans は answer_formula の解。
// 例外的に pair 型(renritsu)は y を env から再導出して両式を確認。
const ID = {
  // --- c04 方程式（全6型） ---
  jhs_c04_move_01: (e, x) => e.p1 * x - e.q1 === e.r1 * x + e.s1,                 // px−q＝rx＋s
  jhs_c04_move_02: (e, x) => e.p1 * x + e.q1 === e.r1 * x + e.s1,                 // px＋q＝rx＋s
  jhs_c04_paren_01: (e, x) => e.k1 * (x - e.m1) === e.r1 * x + e.s1,              // k(x−m)＝rx＋s
  jhs_c04_ratio_01: (e, x) => e.a1 * e.c1 === e.b1 * x,                           // a：x＝b：c → a·c＝b·x
  jhs_c04_coeff_back_01: (e, a) => e.p1 * e.s1 + a === e.t1,                      // px＋a＝t, x＝s
  jhs_c04_renritsu_01: (e, x) => { const y = (e.A1 - e.B1) / 2; return (x + y === e.A1) && (x - y === e.B1); }, // x＋y＝A, x−y＝B
  // --- c05 文章題（全7型） ---
  jhs_c05_kaimono_01: (e, n) => e.p1 * n + e.c1 === e.t1,                         // 単価·個数＋定額＝合計
  jhs_c05_kafusoku_01: (e, ppl) => e.a1 * ppl + e.r1 === e.b1 * ppl - e.s1,       // a·x＋r＝b·x−s
  jhs_c05_kafusoku_02: (e, total) => { const ppl = (e.r1 + e.s1) / (e.b1 - e.a1); return total === e.a1 * ppl + e.r1 && total === e.b1 * ppl - e.s1; },
  jhs_c05_hayasa_01: (e, t) => e.vb1 * t === e.va1 * (t + e.d1),                  // vb·t＝va·(t＋d)
  jhs_c05_hayasa_02: (e, t) => (e.va1 + e.vb1) * t === e.L1,                      // (va＋vb)·t＝L
  jhs_c05_nenrei_01: (e, t) => e.P1 + t === e.k1 * (e.C1 + t),                    // P＋t＝k(C＋t)
  jhs_c05_seisu_01: (e, m) => m + (m + 1) + (m + 2) === e.S1,                     // 連続3整数の和
  // --- c10 確率（ball_01のみ恒等検算。dice/coinは pattern_bank_jhs_c10_tables.js の照合表悉皆で代替=item9） ---
  jhs_c10_ball_01: (e, r) => {                                                    // P×(r＋w)＝r：既約f1が r/(r+w) と等価
    const g = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
    const tot = e.r1 + e.w1, d = g(e.r1, tot);
    return e.tot1 === tot && (e.r1 / d) * tot === r * (tot / d);                  // rn·tot == r·rd
  },
};

const bankFiles = fs.readdirSync(path.join(ROOT, 'pattern_bank'))
  .filter(f => f.indexOf(glob) >= 0 && /^patterns_.*\.json$/.test(f)).sort();

let totalId = 0, idFail = 0, vFail = 0, genErr = 0;
const perPat = {}; const skipped = []; const failSamples = [];
for (const bf of bankFiles) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', bf), 'utf-8'));
  const lex = bank.shared_lexicon || {};
  for (const p of bank.patterns) {
    const pid = p.pattern_id;
    const check = ID[pid];
    if (!check) { skipped.push(pid); continue; }
    const rec = perPat[pid] = { n: 0, idbad: 0, vbad: 0 };
    for (let i = 0; i < N; i++) {
      let r; try { r = P.makeProblem(p, null, lex); } catch (e) { genErr++; failSamples.push(pid + ' GEN ' + e.message); break; }
      const v = P.verify(p, r.env, r.problem);
      if (!(v.checks.kanji_ok && v.checks.nums_from_slots && v.checks.answer_positive)) { rec.vbad++; vFail++; }
      totalId++; rec.n++;
      let okId; try { okId = check(r.env, r.env.ans) === true; } catch (e) { okId = false; }
      if (!okId) { rec.idbad++; idFail++; if (failSamples.length < 8) failSamples.push(pid + ' IDENTITY-FAIL ans=' + r.env.ans + ' env=' + JSON.stringify(r.env)); }
    }
  }
}

console.log('jhs 恒等検算: ' + bankFiles.join(',') + ' / 各' + N + '回');
for (const [pid, r] of Object.entries(perPat)) {
  console.log('  ' + pid + ': 恒等成立 ' + (r.n - r.idbad) + '/' + r.n + (r.idbad ? ' ❌' : '') + (r.vbad ? ' [verifyFail ' + r.vbad + ']' : ''));
}
if (skipped.length) console.log('  ⚠️ ID未登録(WARN):', skipped.join(', '));
failSamples.forEach(s => console.log('   ', s));
console.log('総計 ' + totalId + '件 / 恒等不成立 ' + idFail + ' / verify不成立 ' + vFail + ' / genErr ' + genErr);
console.log((idFail === 0 && vFail === 0 && genErr === 0) ? '恒等検算: 全パターン成立 ✅' : '❌ 失敗あり(即停止)');
process.exit((idFail === 0 && vFail === 0 && genErr === 0) ? 0 : 1);
