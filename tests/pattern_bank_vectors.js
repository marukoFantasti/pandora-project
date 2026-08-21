// v0.9 ヘルパの等価性ベクター照合（JS側）。
// pattern_generator.js の公開ヘルパを helpers_test_vectors.json の
// シード非依存ベクター全件に通し、Python実装(generate_poc_v09.py)との一致を確認する。
//
// 実行:  node tests/pattern_bank_vectors.js
//        node tests/pattern_bank_vectors.js <別のvectors.json>
//
// ベクターは Python/JS 共用。generate_poc_v09.py 側の等価ランナーと同一ベクター全件一致で合格。
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));

// ベクター名 → 実装（既存 fmt_mixed/fmt_fraction/round_half_up も束ねて登録）
const IMPL = {
  gcd: P.gcdInt, lcm: P.lcmInt, reduce_num: P.reduceNum, reduce_den: P.reduceDen,
  fmt_dec: P.fmtDec, fmt_percent_pm: P.fmtPercentPm, fmt_buai_pm: P.fmtBuaiPm,
  fmt_mixed: P.fmtMixed, fmt_fraction: P.fmtFraction, round_half_up: P.roundHalfUp,
  // v1.0 jhs ヘルパ（符号/係数/平方根 + 負域サンプリング照合）
  fmt_signed: P.fmtSigned, fmt_coef: P.fmtCoef, fmt_coefj: P.fmtCoefj,
  fmt_termj: P.fmtTermj, sgn_str: P.sgnStr, sqrt_coef: P.sqrtCoef,
  sqrt_rad: P.sqrtRad, fmt_sqrt: P.fmtSqrt, sample_domain: P.sampleDomain,
  fmt_pi: P.fmtPi, fmt_pi_frac: P.fmtPiFrac, fmt_choice: P.fmtChoice,
  dec2fix: P.fmtDec2fix
};

const vecPath = process.argv[2] || path.join(ROOT, 'pattern_bank', 'handoff_g05', 'helpers_test_vectors.json');
const vec = JSON.parse(fs.readFileSync(vecPath, 'utf-8'));

let bad = 0, total = 0, covered = 0, skipped = [];
for (const [name, cases] of Object.entries(vec)) {
  if (name === 'comment') continue;
  // expr_arith: [[expr, env], want] を evalExpr で照合（* / // % の優先順位・左結合の関門）
  if (name === 'expr_arith') {
    covered++;
    for (const [[expr, env], want] of cases) {
      total++;
      let got; try { got = P.evalExpr(expr, env); } catch (e) { got = 'ERR:' + e.message; }
      if (String(got) !== String(want)) { console.log('VEC-FAIL expr_arith', JSON.stringify(expr), '=>', JSON.stringify(got), 'want', JSON.stringify(want)); bad++; }
    }
    continue;
  }
  if (!IMPL[name]) { skipped.push(name); continue; }
  covered++;
  for (const [args, want] of cases) {
    total++;
    const got = IMPL[name](...args);
    if (String(got) !== String(want)) {
      console.log('VEC-FAIL', name, JSON.stringify(args), '=>', JSON.stringify(got), 'want', JSON.stringify(want));
      bad++;
    }
  }
}
if (skipped.length) {
  console.error('ERROR: 実装が見つからないベクター名:', skipped.join(', '));
  process.exit(2);
}
console.log(`ベクター群 ${covered} 種 / 総ケース ${total} 件`);
console.log(bad === 0 ? '等価性ベクター(JS側): 全件一致 ✅' : `${bad}件不一致 ❌`);
process.exit(bad === 0 ? 0 : 1);
