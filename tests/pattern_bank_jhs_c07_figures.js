// c07 図あり2パターンの描画可能性悉皆。graph_01(xy_graph v2)の可行28組到達 + taiou_01(table)描画。
// 実行:  node tests/pattern_bank_jhs_c07_figures.js [N]
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c07.json'), 'utf-8'));
const lex = bank.shared_lexicon || {}; const N = Number(process.argv[2] || 4000);
const expect = { jhs_c07_graph_01: 28 };   // 設計側可行組(graph_01)
const key = { jhs_c07_graph_01: e => e.av1 + ',' + e.b1 + ',' + e.p1, jhs_c07_taiou_01: e => e.a1 + ',' + e.b1 };
let bad = 0;
console.log('=== c07 図描画可能性悉皆 ===');
for (const p of bank.patterns.filter(x => x.figure_params)) {
  const pid = p.pattern_id; const combos = new Set(); let svgbad = 0;
  for (let i = 0; i < N; i++) {
    let r; try { r = P.makeProblem(p, null, lex); } catch (e) { svgbad++; bad++; continue; }
    const svg = FB.build(r.figure);
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0) { svgbad++; bad++; continue; }
    if (p.figure_params.kind === 'table') { const c = FB._tableMinClearance(r.figure); if (c.overflow > 0.5 || c.contained === false) { svgbad++; bad++; } }
    combos.add(key[pid](r.env));
  }
  const exp = expect[pid], covOk = exp === undefined || combos.size === exp;
  if (!covOk) bad++;
  console.log('  ' + pid + ' [' + p.figure_params.kind + ']: 描画不良' + svgbad + ' / 可行組到達 ' + combos.size + (exp ? '/' + exp : '(表)') + (covOk ? ' ✅' : ' ⚠️'));
}
console.log(bad === 0 ? 'c07 図悉皆: 全合格 ✅' : '❌ ' + bad);
process.exit(bad === 0 ? 0 : 1);
