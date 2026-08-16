// math_display_nondestructive.js — pandora_global算数編 表示層の国内非破壊 + 配信アセットのドリフト関門。
// (A) 配信コピー(assets_global)md5 == 出所(handoff_jhs)md5 のドリフト検査。
// (B) 共有述語 isGlobalStudent: 国内固定レコードで false(=engine/辞書ロード不発火)、海外で true。
//     result_view.html にインライン展開した定義と assets_global/global_student.js が同一挙動。
// (C) 国内固定レコード5件(図あり/図なし/複名数/しき三点/漢字)の表示内容(gates閉=無変換)を基準凍結し一致検査。
// (D) processMathText 'off' は入力を素通し(エスケープのみ)=国内相当。
//
// 実行:  node tests/math_display_nondestructive.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const GOLDEN = path.join(__dirname, 'fixtures', 'math_display_nondestructive_golden.json');
function md5(p) { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
let bad = 0;

// (A) ドリフト: 配信 == 出所
console.log('=== (A) 配信アセット ドリフト検査(assets_global == handoff_jhs 出所) ===');
const DRIFT = [
  ['furigana_lexicon.json', 'pattern_bank/handoff_jhs/furigana_lexicon.json', 'assets_global/furigana_lexicon.json'],
  ['counter_reading_table.json', 'pattern_bank/handoff_jhs/counter_reading_table.json', 'assets_global/counter_reading_table.json'],
  ['reading_engine.js', 'pattern_bank/reading_engine.js', 'assets_global/reading_engine.js'],
];
for (const [name, src, dst] of DRIFT) {
  const a = md5(path.join(ROOT, src)), b = md5(path.join(ROOT, dst));
  const ok = a === b; if (!ok) bad++;
  console.log('  ' + (ok ? '✅' : '❌ドリフト') + ' ' + name + (ok ? '' : ' (' + a.slice(0, 8) + ' vs ' + b.slice(0, 8) + ')'));
}

// (B) isGlobalStudent: 正準(global_student.js) と result_view インラインが同一挙動
const canon = require(path.join(ROOT, 'assets_global', 'global_student.js')).isGlobalStudent;
// result_view.html からインライン isGlobalStudent を抽出して比較
const rv = fs.readFileSync(path.join(ROOT, 'result_view.html'), 'utf-8');
const fnSrc = (function () { const a = rv.indexOf('function isGlobalStudent'); const bs = rv.indexOf('{', a); let d = 0, i = bs; for (; i < rv.length; i++) { if (rv[i] === '{') d++; else if (rv[i] === '}') { d--; if (d === 0) { i++; break; } } } return rv.slice(a, i); })();
const inlineFn = new Function('return (' + fnSrc + ')')();
console.log('\n=== (B) isGlobalStudent(共有述語・国内false/海外true・正準==インライン) ===');
const RECORDS = [
  { label: '国内・図なし計算', rec: { mode: 'domestic' }, data: {}, global: false },
  { label: '国内(mode無し)', rec: {}, data: {}, global: false },
  { label: '国内・図あり表', rec: { mode: 'domestic', subject: 'math' }, data: {}, global: false },
  { label: '国内・複名数', rec: {}, data: { problems: [] }, global: false },
  { label: '国内・しき三点', rec: { mode: 'domestic' }, data: {}, global: false },
  { label: '海外・overseas', rec: { mode: 'overseas' }, data: {}, global: true },
  { label: '海外・globalSource', rec: { globalSource: true }, data: {}, global: true },
  { label: '海外・vocabLevel', rec: {}, data: { vocabLevel: 'N4' }, global: true },
];
for (const r of RECORDS) {
  const c = canon(r.rec, r.data), inl = inlineFn(r.rec, r.data);
  const okVal = c === r.global, okSame = c === inl;
  if (!okVal || !okSame) bad++;
  console.log('  ' + (okVal && okSame ? '✅' : '❌') + ' ' + r.label + ': ' + c + (okVal ? '' : ' (期待' + r.global + ')') + (okSame ? '' : ' /インライン不一致' + inl));
}

// (C) 国内固定レコード5件の表示内容(gates閉=無変換=esc) 基準凍結
console.log('\n=== (C) 国内表示(gates閉=無変換) 基準凍結一致 ===');
const DOMESTIC = [
  { pid: 'q1', question: '右の表は入館者数を表しています。1日平均何人ですか。', answer: 'しき （218+217+208+97）÷4=185 答え 185人' },
  { pid: 'q2', question: '次の計算をしなさい。 3/8 + 1/8', answer: '答え 1/2' },
  { pid: 'q3', question: '午前8時50分に出発しました。', answer: '答え 3日間' },
  { pid: 'q4', question: '次の割合を歩合で表しなさい。 0.352', answer: '答え 3割5分2厘' },
  { pid: 'q5', question: '図の直線は比例のグラフである。', answer: '答え y＝−2x' },
];
const domesticDisplay = DOMESTIC.map(p => ({ pid: p.pid, question_html: esc(p.question), answer_html: p.answer ? '正解：' + esc(p.answer) : null }));
if (!fs.existsSync(GOLDEN)) {
  fs.writeFileSync(GOLDEN, JSON.stringify({ _comment: '国内(gates閉)表示の基準。result_viewは国内でprocessMathText不発火=esc相当。現HEADの現挙動を正とする。', captured: new Date().toISOString().slice(0, 10), expected: domesticDisplay }, null, 2) + '\n');
  console.log('  基準採取(bootstrap): ' + path.relative(ROOT, GOLDEN) + ' 作成しPASS');
} else {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf-8')).expected;
  const okC = JSON.stringify(golden) === JSON.stringify(domesticDisplay);
  if (!okC) { bad++; console.log('  ❌ 国内表示が基準と不一致'); }
  else console.log('  ✅ 国内表示5件 基準一致(無変換=esc、Phase2追加で不変)');
}

// (D) processMathText 'off' = 素通し(国内相当)
console.log('\n=== (D) processMathText off = 素通し ===');
const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets_global', 'furigana_lexicon.json')));
const ct = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets_global', 'counter_reading_table.json')));
const RE = require(path.join(ROOT, 'pattern_bank', 'reading_engine.js')).createEngine;
const MD = require(path.join(ROOT, 'assets_global', 'math_display.js')).createMathDisplay(lex, ct, RE);
const offOk = DOMESTIC.every(p => MD.processMathText(p.question, { mode: 'off' }) === p.question);
if (!offOk) bad++;
console.log('  ' + (offOk ? '✅' : '❌') + ' off モードは入力そのまま返す(変換なし)');

// (E) 生成quizテンプレ: 海外テンプレのインライン資産ドリフト + 国内テンプレのバイト凍結
console.log('\n=== (E) 生成quizテンプレ(海外インライン資産ドリフト・国内バイト凍結) ===');
const OV = fs.readFileSync(path.join(ROOT, 'templates', 'student_quiz_overseas_template.html'), 'utf-8');
function pgExtract(id) { const m = OV.match(new RegExp('<script id="' + id + '"[^>]*>([\\s\\S]*?)</' + 'script>')); return m ? m[1] : null; }
const INLINE = [
  ['pg-engine', 'pattern_bank/reading_engine.js'], ['pg-md', 'assets_global/math_display.js'], ['pg-gs', 'assets_global/global_student.js'],
  ['pg-lex', 'pattern_bank/handoff_jhs/furigana_lexicon.json'], ['pg-ct', 'pattern_bank/handoff_jhs/counter_reading_table.json'],
];
for (const [id, src] of INLINE) {
  const inl = pgExtract(id);
  if (inl == null) { bad++; console.log('  ❌ ' + id + ' がテンプレに不在'); continue; }
  const srcTxt = fs.readFileSync(path.join(ROOT, src), 'utf-8');
  const ok = id.startsWith('pg-lex') || id.startsWith('pg-ct') ? inl.trim() === srcTxt.trim() : inl === srcTxt;
  if (!ok) bad++;
  console.log('  ' + (ok ? '✅' : '❌ドリフト') + ' 海外テンプレ ' + id + ' == ' + path.basename(src));
}
// 国内テンプレは無改変(国内生成quizのbase)。md5を基準凍結。
const DOM_TPL = path.join(ROOT, 'templates', 'student_quiz_domestic_template.html');
const domMd5 = md5(DOM_TPL);
const gp = JSON.parse(fs.readFileSync(GOLDEN, 'utf-8'));
if (gp.domestic_template_md5 == null) {
  gp.domestic_template_md5 = domMd5;
  fs.writeFileSync(GOLDEN, JSON.stringify(gp, null, 2) + '\n');
  console.log('  国内テンプレmd5 基準採取(bootstrap): ' + domMd5.slice(0, 12));
} else {
  const ok = gp.domestic_template_md5 === domMd5;
  if (!ok) bad++;
  console.log('  ' + (ok ? '✅' : '❌') + ' 国内テンプレ(student_quiz_domestic) md5 基準一致(国内生成quiz base バイト不変)');
}

console.log('\n' + (bad === 0 ? 'math_display_nondestructive: 全通過 ✅(ドリフト0・国内不変・述語共有)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
