// c09 図あり8パターンの描画可能性悉皆ハーネス。全スロット組合せ(高volサンプル)×レンダラ契約で
// 図が破綻なく描けることを機械確認: (1)有効SVG・undefined混入なし (2)table=はみ出し0・全文内包・
// 行列対応 (3)histogram=軸ラベル描画。設計側ローカルの描画可能性悉皆の再現。
//
// 実行:  node tests/pattern_bank_jhs_c09_figures.js [N]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c09.json'), 'utf-8'));
const lex = bank.shared_lexicon || {};
const N = Number(process.argv[2] || 300);

const figPats = bank.patterns.filter(p => p.figure_params);
let bad = 0, total = 0;
const per = {};
for (const p of figPats) {
  const kind = p.figure_params.kind;
  const rec = per[p.pattern_id] = { kind: kind, n: 0, svgbad: 0, ovf: 0, contain: 0, sem: 0, axis: 0 };
  for (let i = 0; i < N; i++) {
    total++; rec.n++;
    let r; try { r = P.makeProblem(p, null, lex); } catch (e) { rec.svgbad++; bad++; continue; }
    const fp = r.figure, svg = FB.build(fp);
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0) { rec.svgbad++; bad++; continue; }
    if (kind === 'table') {
      const c = FB._tableMinClearance(fp);
      if (c.overflow > 0.5) { rec.ovf++; bad++; }
      if (c.contained === false) { rec.contain++; bad++; }
      if (c.semOk === false) { rec.sem++; bad++; }
    } else if (kind === 'histogram') {
      const c = FB._histogramMinClearance(fp);
      if (c && c.overflow !== undefined && c.overflow > 0.5) { rec.ovf++; bad++; }
      // 軸ラベル契約: x_label/y_label 宣言時は描画されていること
      if (fp.x_label !== undefined && svg.indexOf('>' + fp.x_label + '<') < 0) { rec.axis++; bad++; }
      if (fp.y_label !== undefined && svg.indexOf('>' + fp.y_label + '<') < 0) { rec.axis++; bad++; }
    }
  }
}
console.log('c09 描画可能性悉皆: ' + figPats.length + '図パターン × ' + N + '回');
for (const [pid, r] of Object.entries(per)) {
  const issues = [];
  if (r.svgbad) issues.push('SVG不良' + r.svgbad);
  if (r.ovf) issues.push('はみ出し' + r.ovf);
  if (r.contain) issues.push('非内包' + r.contain);
  if (r.sem) issues.push('行列不整合' + r.sem);
  if (r.axis) issues.push('軸ラベル欠' + r.axis);
  console.log('  ' + pid + ' [' + r.kind + ']: ' + (issues.length ? '❌ ' + issues.join(',') : r.n + '/' + r.n + ' 描画OK ✅'));
}
console.log('総計 ' + total + '件 / 不良 ' + bad + (bad === 0 ? '  全描画可能 ✅' : '  ❌'));
process.exit(bad === 0 ? 0 : 1);
