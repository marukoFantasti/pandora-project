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

// --- 独立整数ヘルパ(生成器のsqrt_coef/sqrt_radとは別実装＝循環回避) ---
function isqrt(n) { n = Math.trunc(n); let a = Math.floor(Math.sqrt(n)); while (a * a > n) a--; while ((a + 1) * (a + 1) <= n) a++; return a; }
function isSquareFree(n) { n = Math.trunc(Math.abs(n)); for (let d = 2; d * d <= n; d++) if (n % (d * d) === 0) return false; return true; }
function squareFreePart(n) { n = Math.trunc(Math.abs(n)); for (let d = 2; d * d <= n; d++) while (n % (d * d) === 0) n = n / (d * d); return n; }

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
  // --- c15 展開・因数分解：多項式係数の恒等(問題多項式 == 答えの展開) ---
  // 展開5型: 問題=因数積 → 展開係数が答え多項式の係数と一致(答え係数からの復元と等価)
  jhs_c15_exp_01: (e) => e.s1 === e.a1 + e.b1 && e.t1 === e.a1 * e.b1,            // (x+a)(x+b)=x²+(a+b)x+ab
  jhs_c15_exp_02: (e) => e.ans === e.a1 - e.b1 && e.t1 === e.a1 * e.b1,           // (x+a)(x−b)=x²+(a−b)x−ab
  jhs_c15_exp_03: (e) => e.d1 === 2 * e.a1 && e.q1 === e.a1 * e.a1,               // (x+a)²=x²+2ax+a²
  jhs_c15_exp_04: (e) => e.d1 === 2 * e.a1 && e.q1 === e.a1 * e.a1,               // (x−a)²=x²−2ax+a²
  jhs_c15_exp_05: (e) => e.q1 === e.a1 * e.a1,                                    // (x+a)(x−a)=x²−a²
  // 因数分解4型: 答え=因数積を展開し直して本文多項式の係数と一致
  jhs_c15_fac_01: (e) => e.A1 * e.m1 === e.B1,                                    // Ax²+Bx=Ax(x+B/A)
  jhs_c15_fac_02: (e) => e.av1 - e.bv1 === e.p1 && e.av1 * e.bv1 === e.q1,        // x²+px−q=(x+av)(x−bv)
  jhs_c15_fac_03: (e) => 2 * e.av1 === e.d1 && e.av1 * e.av1 === e.q1,            // x²−dx+q=(x−av)²
  jhs_c15_fac_04: (e) => e.av1 * e.av1 === e.N1,                                  // x²−N=(x+av)(x−av)
  // --- c16 根号：k²m復元・平方因数・挟み撃ちを独立整数演算で再確認 ---
  jhs_c16_simp_01: (e, k) => e.N1 % (k * k) === 0 && isSquareFree(e.N1 / (k * k)) && k >= 2,       // √N=k√m, k最大(mが平方因数なし)
  jhs_c16_mul_01: (e, k) => { const P = e.a1 * e.b1; return P % (k * k) === 0 && isSquareFree(P / (k * k)); }, // √a·√b=√(ab)=k√m
  jhs_c16_add_01: (e, s) => s === e.p1 + e.q1 - e.r1 && s !== 0,                                    // p√m+q√m−r√m=(p+q−r)√m
  jhs_c16_mixadd_01: (e, s) => { const c = isqrt(e.N1 / e.m1); return squareFreePart(e.N1) === e.m1 && c * c * e.m1 === e.N1 && s === c + e.p1; }, // √N=c√m1, sqrt_rad(N)==m1
  jhs_c16_intpart_01: (e, a) => a * a <= e.n1 && e.n1 < (a + 1) * (a + 1) && a === isqrt(e.n1),     // 挟み撃ち a²≦n<(a+1)² 再確認
  // --- c17 二次方程式：整数解型は解を元方程式に代入して0、無理数解型はk²m復元+D整合 ---
  // 整数解型: 各解を元の二次多項式 pv(x)=x²+b·x+c に代入し 0（両根を確認）
  jhs_c17_fact_01: (e) => { const pv = x => x * x + e.p1 * x - e.q1; return pv(e.bv1) === 0 && pv(-e.av1) === 0; },        // x²+px−q=0, 根 bv1,−av1
  jhs_c17_fact_02: (e) => { const pv = x => x * x + e.d1 * x + e.q1; return pv(-e.bv1) === 0 && pv(-e.av1) === 0; },       // x²+dx+q=0, 根 −bv1,−av1
  jhs_c17_fact_03: (e, a) => a * a - e.d1 * a + e.q1 === 0,                                                                // (x−a)²=0 重解 x²−dx+q
  jhs_c17_back_01: (e, a) => e.s1 * e.s1 + a * e.s1 - e.q1 === 0,                                                          // x²+ax−q=0 に x=s1 代入
  // 無理数解型: 根号の k²m 復元 + 平方因数なし + 判別式整合
  jhs_c17_sq_01: (e, k) => e.k1 % (k * k) === 0 && isSquareFree(e.k1 / (k * k)) && squareFreePart(e.k1) >= 2,             // x²=k1, x=±sqc√m
  jhs_c17_sq_02: (e) => { const m = squareFreePart(e.k1), c = isqrt(e.k1 / m); return c * c * m === e.k1 && m >= 2; },     // (x−m)²=k1
  jhs_c17_formula_01: (e) => { const D = e.p1 * e.p1 - 4 * e.q1; return D >= 2 && isSquareFree(D); },                      // (p±√D)/2, D=p²−4q 既約
  // --- c18 二次関数 y=ax²：復元・代入・変化の割合の整数恒等 + 変域は数値走査 ---
  jhs_c18_table_01: (e) => e.a1v * e.s1 * e.s1 === e.t1,                                                                  // a=t/s² 復元: a·s²==t
  jhs_c18_val_01: (e, ans) => ans === e.a1 * e.u1 * e.u1,                                                                 // y=a·(−u)²=a·u²
  jhs_c18_rate_01: (e, ans) => ans * (e.v1 - e.u1) === e.a1 * e.v1 * e.v1 - e.a1 * e.u1 * e.u1,                           // 変化の割合 ans·(v−u)==av²−au²
  // 変域: x∈[−p,q] を0.1刻み悉皆走査した近似y範囲が閉形式(0≦y≦M / −M≦y≦0)と一致
  jhs_c18_range_01: (e) => {
    const M = e.M1, a = e.a1; let mn = Infinity, mx = -Infinity;
    for (let i = 0; i <= (e.p1 + e.q1) * 10; i++) { const x = -e.p1 + i * 0.1, y = a * x * x; if (y < mn) mn = y; if (y > mx) mx = y; }
    return M === a * Math.max(e.p1, e.q1) * Math.max(e.p1, e.q1) && Math.abs(mn) < 1e-6 && Math.abs(mx - M) < 1e-6;        // 下に凸: 最小0(頂点)・最大M
  },
  jhs_c18_range_02: (e) => {
    const M = e.M1, a = e.a1; let mn = Infinity, mx = -Infinity;
    for (let i = 0; i <= (e.p1 + e.q1) * 10; i++) { const x = -e.p1 + i * 0.1, y = -a * x * x; if (y < mn) mn = y; if (y > mx) mx = y; }
    return M === a * Math.max(e.p1, e.q1) * Math.max(e.p1, e.q1) && Math.abs(mx) < 1e-6 && Math.abs(mn + M) < 1e-6;        // 上に凸: 最大0(頂点)・最小−M
  },
  // --- c09 資料の活用：統計量を独立再計算(度数/相対度数/中央値/最頻値/範囲/平均等) ---
  jhs_c09_dosu_01: (e, ans) => ans + e.f1 + e.f2 + e.f3 + e.f4 + e.f5 === e.n1,                                            // Σ度数=N(未記入度数逆算)
  jhs_c09_dosu_02: (e, ans) => {                                                                                          // Σ相対度数=100 ∧ 全セル100f%N=0 ∧ 答%10≠0
    const fs = [e.f1, e.f2, e.f3, e.f4, e.f5, e.c6];
    return fs.every(f => (100 * f) % e.n1 === 0) && fs.reduce((s, f) => s + Math.floor(100 * f / e.n1), 0) === 100 && ans % 10 !== 0 && ans === Math.floor(100 * e.f3 / e.n1);
  },
  jhs_c09_dosu_03: (e, ans) => ans * 100 === e.n1 * e.r1,                                                                 // 答×100=N×r(人数逆算)
  jhs_c09_med_01: (e, ans) => { const N = e.f1 + e.f2 + e.f3 + e.f4 + e.f5 + e.f6; return N % 2 === 0 && (e.f1 + e.f2) < N / 2 && (e.f1 + e.f2 + e.f3) >= N / 2 + 1 && ans === 2 * e.w1; }, // 中央値階級=第3(累積走査)
  jhs_c09_mode_01: (e, ans) => e.f4 > Math.max(e.f1, e.f2, e.f3, e.f5, e.f6) && ans === Math.floor(7 * e.w1 / 2),          // 最頻値=第4階級(argmax一意)
  jhs_c09_pct_01: (e, ans) => (100 * (e.n1 - e.f1 - e.f2 - e.f3)) % e.n1 === 0 && ans > 0 && ans < 100 && ans === Math.floor(100 * (e.n1 - e.f1 - e.f2 - e.f3) / e.n1), // 割合%整数
  jhs_c09_kinji_01: (e, ans) => ans + e.hi1 === 20 * e.a1,                                                                // 近似値範囲: 下限+上限=20a
  jhs_c09_yuko_01: (e, ans) => ans * 100 === e.v1 && ans % 10 !== 0,                                                       // 有効数字: 答×100=v ∧ 末尾≠0
  jhs_c09_mean_01: (e, ans) => { const N = e.f1 + e.f2 + e.f3 + e.f4, S = 60 * e.f1 + 70 * e.f2 + 80 * e.f3 + 90 * e.f4; return S % N === 0 && ans === S / N; }, // 階級値平均(割り切れ)
  jhs_c09_range_01: (e, ans) => {                                                                                         // 範囲=max−min ∧ 最大最小一意
    const v = [e.b1, e.b1 + e.g1, e.b1 + e.g2, e.b1 + e.g3, e.b1 + e.g4, e.b1 + e.g5, e.b1 + e.g6, e.b1 + e.g7, e.b1 + e.r1];
    const mx = Math.max.apply(null, v), mn = Math.min.apply(null, v);
    return mx - mn === ans && ans === e.r1 && v.filter(x => x === mx).length === 1 && v.filter(x => x === mn).length === 1;
  },
  jhs_c09_med_02: (e, ans) => {                                                                                           // 10値ソート→第5・6位=(m1,m2) ∧ 和偶数
    const v = [e.lo1, e.lo2, e.lo3, e.lo4, e.m1, e.m2, e.hi1, e.hi2, e.hi3, e.hi4].slice().sort((a, b) => a - b);
    return v[4] === e.m1 && v[5] === e.m2 && (e.m1 + e.m2) % 2 === 0 && ans === (e.m1 + e.m2) / 2;
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
