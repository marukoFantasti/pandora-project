// single_char_contexts.js — furigana_lexicon の1字登録(単独漢字1字の表層)が「どの文脈に当たっているか」の一覧を出力・変化検出する関門。
// 目的: 1字登録は最長一致で意図しない語に当たりやすい(例: 「行=い」が「列や行」に当たった=まるこ検収 2026-09-05)。
// 読みの正誤は人が見る前提で、この関門は「割り当たり文脈一覧」を固定(fixtures/single_char_contexts.json)し、
// バンク/解説/lexicon文字列の変更で一覧が変わったら差分を表示してFAILする(人が確認後 --update で更新)。
// 走査対象(静的・決定的): 全学年バンクの sentence_templates / answer_template / kaisetsu / shared_lexicon の文字列({slot}は□に置換)。
// 実行:  node tests/single_char_contexts.js [--update]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const E = require(path.join(ROOT, 'pattern_bank', 'reading_engine.js')).loadDefault();
const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'handoff_jhs', 'furigana_lexicon.json'), 'utf-8')).surfaces;
const ONES = new Set(Object.keys(lex).filter(k => k.length === 1));
const FIX = path.join(__dirname, 'fixtures', 'single_char_contexts.json');
const update = process.argv.includes('--update');
function strings(o, out) { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(x => strings(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => strings(o[k], out)); }
const texts = [];
for (const f of fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(x => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(x)).sort()) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', f), 'utf-8'));
  bank.patterns.forEach(p => { strings(p.sentence_templates, texts); strings(p.answer_template, texts); if (typeof p.kaisetsu === 'string') texts.push(p.kaisetsu); });
  strings(bank.shared_lexicon || {}, texts);
}
const ctx = {};   // key → Set(context)
let scanned = 0;
texts.forEach(t => {
  const s = t.replace(/\{\w+\}/g, '□');
  if (!/[一-鿿]/.test(s)) return; scanned++;
  let pos = 0;
  try {
    E._scan(s, function (orig, hira, ruby) {
      if (ONES.has(orig)) { const c = s.slice(Math.max(0, pos - 3), pos) + '[' + orig + ']' + s.slice(pos + 1, pos + 4); (ctx[orig] = ctx[orig] || new Set()).add(c.replace(/\d+/g, 'N')); }
      pos += orig.length;
    });
  } catch (e) { /* 残存漢字は furigana_coverage が担当 */ }
});
const cur = {}; Object.keys(ctx).sort().forEach(k => { cur[k] = [...ctx[k]].sort(); });
const nCtx = Object.values(cur).reduce((a, b) => a + b.length, 0);
console.log('=== 1字登録 ' + ONES.size + '語 / 走査文字列 ' + scanned + ' / 当たった1字登録 ' + Object.keys(cur).length + '語・文脈 ' + nCtx + '件 ===');
if (!fs.existsSync(FIX) || update) {
  fs.writeFileSync(FIX, JSON.stringify(cur, null, 1) + '\n');
  console.log('  一覧を' + (update ? '更新' : '初期採取') + ': ' + path.relative(ROOT, FIX));
  console.log('\nsingle_char_contexts: GREEN ✅(一覧' + (update ? '更新' : '採取') + ')'); process.exit(0);
}
const prev = JSON.parse(fs.readFileSync(FIX, 'utf-8'));
let bad = 0;
const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
[...keys].sort().forEach(k => {
  const a = new Set(prev[k] || []), b = new Set(cur[k] || []);
  const added = [...b].filter(x => !a.has(x)), removed = [...a].filter(x => !b.has(x));
  if (added.length || removed.length) { bad++; console.log('  ❌ ' + k + '(' + (lex[k] || '未登録') + ') 追加' + added.length + ' 削除' + removed.length + ': ' + added.slice(0, 3).map(x => '+' + x).concat(removed.slice(0, 3).map(x => '-' + x)).join(' | ')); }
});
console.log('\n' + (bad === 0 ? 'single_char_contexts: GREEN ✅(一覧不変 ' + Object.keys(cur).length + '語/' + nCtx + '文脈)' : '❌ 一覧が変化 ' + bad + '語 — 読みを人が確認のうえ `node tests/single_char_contexts.js --update` で更新'));
process.exit(bad === 0 ? 0 : 1);
