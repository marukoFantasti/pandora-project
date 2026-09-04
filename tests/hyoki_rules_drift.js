// hyoki_rules_drift.js — D10 表記規則層のドリフト検査。生成HTML(standalone)へインライン複製した検査コードが
// 正典(pattern_bank/hyoki_rules.js INLINE_SNIPPET)と同一で、正典の findUnbracketedLabels と挙動一致することを検査。
// 接続先: pandora_main.html(算数AI生成経路) / Japanese_question_generator.html / Japanese_story_generator.html / pandora_global_generator.html
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const H = require(path.join(ROOT, 'pattern_bank', 'hyoki_rules.js'));
const FILES = ['pandora_main.html', 'Japanese_question_generator.html', 'Japanese_story_generator.html', 'pandora_global_generator.html'];
let bad = 0;
const VEC = ['あの角度が55度のとき、いとうの角度を求めなさい。', '答え い 105度 う 75度', '図のあの角度を求めなさい。', '「あ」の角度が55度', 'あと何度をあわせると一直線', 'とく点・低い点・合う角', '例: あの角が55度なら、いの角は'];
for (const f of FILES) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf-8');
  const m = html.match(/\/\/ >>> hyoki_rules inline[^\n]*\n([\s\S]*?)\n\/\/ <<< hyoki_rules inline/);
  if (!m) { bad++; console.log('  ❌ ' + f + ' インライン不在'); continue; }
  const same = m[1] === H.INLINE_SNIPPET;
  if (!same) { bad++; console.log('  ❌ ' + f + ' インラインが正典と不一致(ドリフト)'); }
  // 挙動一致(正典 vs インライン)
  const fn = new Function(m[1] + '\nreturn hyokiFindUnbracketedLabels;')();
  let mism = 0; VEC.forEach(t => { if (JSON.stringify(fn(t, [])) !== JSON.stringify(H.findUnbracketedLabels(t, []))) mism++; });
  if (mism) { bad++; console.log('  ❌ ' + f + ' 挙動不一致 ' + mism); }
  console.log('  ' + (same && !mism ? '✅' : '❌') + ' ' + f + ' インライン==正典・挙動一致(' + VEC.length + '件)');
}
// Python同等実装のRE文字列が正典と同一(hyoki_rules.py)
const py = fs.readFileSync(path.join(ROOT, 'pattern_bank', 'hyoki_rules.py'), 'utf-8');
if (py.indexOf('LABELS = "' + H.LABELS + '"') < 0) { bad++; console.log('  ❌ hyoki_rules.py LABELS 不一致'); }
console.log('\n' + (bad === 0 ? 'hyoki_rules_drift: GREEN ✅(4経路のインライン==正典・挙動一致・py LABELS一致)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
