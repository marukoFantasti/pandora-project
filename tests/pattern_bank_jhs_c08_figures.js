// c08 図あり3パターン描画可能性悉皆。gyomi_01(63組)/gyomi_02(45組)=xy_graph v2 segment / ryokin_01=table。
// gyomi系の x目盛数(契約16以内・推奨12微超過=14)をまるこ目視確認用に報告。
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c08.json'), 'utf-8'));
const lex = bank.shared_lexicon || {}; const N = Number(process.argv[2] || 5000);
const expect = { jhs_c08_gyomi_01: 63, jhs_c08_gyomi_02: 45 };
const key = { jhs_c08_gyomi_01: e => [e.s1, e.t1, e.r1, e.u1].join(','), jhs_c08_gyomi_02: e => [e.s1, e.t1, e.r1, e.u1].join(','), jhs_c08_ryokin_01: e => [e.s1, e.pa1, e.qb1, e.dq1].join(',') };
let bad = 0;
for (const p of bank.patterns.filter(x => x.figure_params)) {
  const pid = p.pattern_id; const combos = new Set(); let svgbad = 0, xticks = 0;
  for (let i = 0; i < N; i++) {
    let r; try { r = P.makeProblem(p, null, lex); } catch (e) { svgbad++; bad++; continue; }
    const svg = FB.build(r.figure);
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0) { svgbad++; bad++; continue; }
    if (p.figure_params.kind === 'table') { const c = FB._tableMinClearance(r.figure); if (c.overflow > 0.5 || c.contained === false) { svgbad++; bad++; } }
    else if (r.figure.view) { const v = r.figure.view; xticks = Math.round((v.xmax - v.xmin) / v.tick_x); }
    combos.add(key[pid](r.env));
  }
  const exp = expect[pid], covOk = exp === undefined || combos.size === exp; if (!covOk) bad++;
  const tick = xticks ? ' / x目盛数=' + xticks + (xticks <= 16 ? '(契約16以内✅' : '(契約超過⚠️') + (xticks > 12 ? '・推奨12超' : '') + ')' : '';
  console.log('  ' + pid + ' [' + p.figure_params.kind + ']: 描画不良' + svgbad + ' / 可行組 ' + combos.size + (exp ? '/' + exp : '(表)') + (covOk ? ' ✅' : ' ⚠️') + tick);
}
console.log(bad === 0 ? 'c08 図悉皆: 全合格 ✅' : '❌ ' + bad);
process.exit(bad === 0 ? 0 : 1);
