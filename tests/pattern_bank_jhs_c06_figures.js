// c06 図あり5パターンの描画可能性悉皆 + lattice_pairs照合表の brute検証。
// (1) lattice_pairs[[k,nd]] を xy=k の整数格子点 brute数え上げ(=2·d(k))で照合∧nd≠k。
// (2) 図あり5パターン(pgraph/igraph/lattice/kouten=xy_graph v2 / taiou=table)を高volサンプルで
//     全描画可能性確認 + 可行スロット組の到達網羅(設計側可行数 5/16/6/11/3 と一致)。
//
// 実行:  node tests/pattern_bank_jhs_c06_figures.js [N]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c06.json'), 'utf-8'));
const lex = bank.shared_lexicon || {};
const N = Number(process.argv[2] || 3000);
let bad = 0;

// (1) lattice_pairs 照合表 brute検証
console.log('=== lattice_pairs 照合表 brute検証(格子点数=2·d(k) ∧ nd≠k) ===');
function numDiv(n) { n = Math.abs(n); let c = 0; for (let d = 1; d <= n; d++) if (n % d === 0) c++; return c; }
for (const [k, nd] of lex.lattice_pairs) {
  // xy=k の整数格子点(x≠0)の総数 = 2·(正の約数個数)
  const brute = 2 * numDiv(k);
  const ok = brute === nd && nd !== k;
  if (!ok) bad++;
  console.log('  k=' + k + ': brute格子点数=' + brute + ' 表値nd=' + nd + (nd !== k ? '' : ' (⚠️nd==k)') + (ok ? ' ✅' : ' ❌'));
}

// (2) 図あり5パターン 描画可能性悉皆 + 可行組網羅
console.log('=== 図あり5パターン 描画可能性悉皆 + 可行組到達 ===');
const expectCombos = { jhs_c06_pgraph_01: 5, jhs_c06_igraph_01: 16, jhs_c06_lattice_01: 6, jhs_c06_kouten_01: 11, jhs_c06_taiou_01: 3 };
// 可行組の識別キー(パターン別の定義スロット)
const comboKey = {
  jhs_c06_pgraph_01: e => e.a1 + ',' + e.p1, jhs_c06_igraph_01: e => e.p1 + ',' + e.q1,
  jhs_c06_lattice_01: e => e.k1 + ',' + e.nd1, jhs_c06_kouten_01: e => e.k1 + ',' + e.s1,
  jhs_c06_taiou_01: e => String(e.a1)
};
const figPats = bank.patterns.filter(p => p.figure_params);
for (const p of figPats) {
  const pid = p.pattern_id; const combos = new Set(); let svgbad = 0;
  for (let i = 0; i < N; i++) {
    let r; try { r = P.makeProblem(p, null, lex); } catch (e) { svgbad++; bad++; continue; }
    const svg = FB.build(r.figure);
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0) { svgbad++; bad++; continue; }
    if (p.figure_params.kind === 'table') { const c = FB._tableMinClearance(r.figure); if (c.overflow > 0.5 || c.contained === false) { svgbad++; bad++; } }
    combos.add(comboKey[pid](r.env));
  }
  const exp = expectCombos[pid], reached = combos.size;
  const covOk = reached === exp;
  if (!covOk) bad++;
  console.log('  ' + pid + ' [' + p.figure_params.kind + ']: 描画不良' + svgbad + ' / 可行組到達 ' + reached + '/' + exp + (covOk ? ' ✅' : ' ⚠️'));
}

console.log('\n' + (bad === 0 ? 'c06 図悉皆+照合表: 全合格 ✅' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
