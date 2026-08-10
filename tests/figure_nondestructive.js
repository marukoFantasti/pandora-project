// 既存3kind 非破壊（受け入れテスト d）＋ JS生成スモーク（e）。
// d: rect_area/angle_sum/table の固定ケース出力が golden（C層統合前と同一）とバイト一致することを確認。
//    将来 figure_builder.js を編集して既存3kindが変わればここで検出する。
// e: patterns_g05.json 全パターンが JS ジェネレータで生成成功すること（70/70）。
//
// 実行:  node tests/figure_nondestructive.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));

// d. 既存3kind 非破壊
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'figure_existing_golden.json'), 'utf-8'));
let dBad = 0;
golden.forEach(function (g) {
  if (FB.build(g.params) !== g.svg) { dBad++; console.log('  CHANGED', g.params.kind, JSON.stringify(g.params)); }
});
console.log('非破壊(既存kind rect_area/angle_sum/table/histogram/dot_plot + xy_graph fig_version 1): ' + (golden.length - dBad) + '/' + golden.length + (dBad === 0 ? ' バイト一致 ✅' : ' ❌'));

// e. JS生成スモーク 70/70
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_g05.json'), 'utf-8'));
const lex = bank.shared_lexicon || {};
let ok = 0; const errs = [];
bank.patterns.forEach(function (p) {
  let gen = false;
  for (let t = 0; t < 60 && !gen; t++) {
    try { const r = P.makeProblem(p, null, lex); if (r && r.problem) gen = true; } catch (e) { errs.push((p.id || p.pattern_id) + ':' + e.message.slice(0, 50)); break; }
  }
  if (gen) ok++;
});
console.log('JS生成スモーク: ' + ok + '/' + bank.patterns.length + (errs.length ? '  ERR ' + errs.join('; ') : ' ✅'));

process.exit(dBad === 0 && ok === bank.patterns.length ? 0 : 1);
