// 国語(pandora_global統合)非破壊ハーネス。§2Bの自動化。
// 国内由来の固定入力に対し、globalゲートが閉じた状態(domestic)の決定的関数の出力が
// 基準(main HEADの現挙動=正)と一致するかを検査する最小回帰ハーネス。
//   - story:    verifyFurigana(3層ルビ戦略の付け忘れ/付けすぎ検出) — KANJI_CUMULATIVE/RUBY_WORD_PATTERN/furiganaTargetKanjiSet依存
//   - question: endsWithMidForm(抜き出しの連用中止・テ形ガード) — EXTRACTION_MIDFORM_SUFFIX_RE依存
//   - quiz:     summarizeQuestions(配布/印刷共通の要約形状)
// 基準は tests/fixtures/japanese_nondestructive_golden.json。不在なら現挙動から採取(bootstrap)。
//
// 実行:  node tests/japanese_nondestructive.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const GOLDEN = path.join(__dirname, 'fixtures', 'japanese_nondestructive_golden.json');

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf-8'); }

// 波括弧対応で function 本体を抽出
function extractFn(src, name) {
  const a = 'function ' + name;
  const s = src.indexOf(a);
  if (s < 0) throw new Error(name + ' が見つかりません');
  const bs = src.indexOf('{', s);
  let d = 0, i = bs;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (d === 0) { i++; break; } } }
  return src.slice(s, i);
}
// const NAME = <expr>; を文字列/正規表現の境界を意識して抽出(文字列外の ; が終端)
function extractConst(src, name) {
  const a = 'const ' + name;
  const s = src.indexOf(a);
  if (s < 0) throw new Error(name + ' が見つかりません');
  let i = s + a.length, inStr = false, q = '', inRe = false, expr = a;
  for (; i < src.length; i++) {
    const ch = src[i]; expr += ch;
    if (inStr) { if (ch === '\\') { expr += src[++i]; continue; } if (ch === q) inStr = false; }
    else if (inRe) { if (ch === '\\') { expr += src[++i]; continue; } if (ch === '/') inRe = false; }
    else {
      if (ch === "'" || ch === '"' || ch === '`') { inStr = true; q = ch; }
      else if (ch === '/' && src[i + 1] !== '/' && src[i + 1] !== '*') inRe = true;  // 素朴だが本用途(RE定数)には十分
      else if (ch === ';') break;
    }
  }
  return expr;
}
// consts+fns を1バンドルとして eval し、必要な関数を取り出す
function bundle(parts, exportNames) {
  const body = parts.join('\n') + '\nreturn {' + exportNames.join(',') + '};';
  return new Function(body)();
}

// ---- 抽出 ----
const story = read('Japanese_story_generator.html');
const ques = read('Japanese_question_generator.html');
const quiz = read('Japanese_quiz_template.html');

const S = bundle([
  extractConst(story, 'KANJI_CUMULATIVE'),
  extractConst(story, 'RUBY_WORD_PATTERN'),
  extractFn(story, 'furiganaTargetKanjiSet'),
  extractFn(story, 'stripRuby'),
  extractFn(story, 'verifyFurigana'),
], ['verifyFurigana', 'stripRuby']);

const Q = bundle([
  extractConst(ques, 'EXTRACTION_MIDFORM_SUFFIX_RE'),
  extractFn(ques, 'endsWithMidForm'),
], ['endsWithMidForm']);

const QZ = bundle([
  extractFn(quiz, 'summarizeQuestions'),
], ['summarizeQuestions']);

// ---- 国内固定入力(globalゲート閉じた状態) ----
const storyInput = { text: '今日は学校《がっこう》で先生《せんせい》と algebra を勉強《べんきょう》した。山と川を見る。', grade: 'g3', level: 'g1' };
const quesInput = { answers: ['歩いて', '走る', '食べていて', 'みかんを持ちながら', '静かだ', '書かなくて', '読む'] };
const quizInput = { questions: [
  { number: 1, type: 'select', kanten: '内容', question_text: '主人公の気持ちは？', choices: ['ア うれしい', 'イ かなしい'], answer: 'ア', explanation: '本文3行目' },
  { number: 2, type: 'kijutsu', kanten: '理由', question_text: 'なぜか。', answer: '雨がふったから。', _actualCount: 8 }
] };

// ---- 現挙動を計算 ----
const current = {
  story_verifyFurigana: S.verifyFurigana(storyInput.text, storyInput.grade, storyInput.level),
  story_stripRuby: S.stripRuby(storyInput.text),
  question_endsWithMidForm: quesInput.answers.map(a => Q.endsWithMidForm(a)),
  quiz_summarizeQuestions: QZ.summarizeQuestions(quizInput),
};

// ---- 基準と照合(不在なら採取) ----
if (!fs.existsSync(GOLDEN)) {
  fs.writeFileSync(GOLDEN, JSON.stringify({ _comment: '国語非破壊の基準(main HEADの現挙動=正)。globalゲート閉じた状態のdomestic出力。', captured: new Date().toISOString().slice(0, 10), inputs: { storyInput, quesInput, quizInput }, expected: current }, null, 2) + '\n');
  console.log('基準採取(bootstrap): ' + path.relative(ROOT, GOLDEN) + ' を現挙動から作成しPASS。');
  console.log('  story_verifyFurigana=' + JSON.stringify(current.story_verifyFurigana) + ' / question_endsWithMidForm=' + JSON.stringify(current.question_endsWithMidForm));
  process.exit(0);
}
const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf-8')).expected;
let bad = 0;
for (const k of Object.keys(current)) {
  const ok = JSON.stringify(current[k]) === JSON.stringify(golden[k]);
  if (!ok) { bad++; console.log('  ❌ ' + k + '\n     基準: ' + JSON.stringify(golden[k]) + '\n     現在: ' + JSON.stringify(current[k])); }
  else console.log('  ✅ ' + k + ' = ' + JSON.stringify(current[k]).slice(0, 70));
}
console.log('\n' + (bad === 0 ? '国語非破壊: 全3関数 基準一致 ✅(globalゲート閉時のdomestic出力 不変)' : '❌ ' + bad + '件 基準不一致(国内挙動が変化)'));
process.exit(bad === 0 ? 0 : 1);
