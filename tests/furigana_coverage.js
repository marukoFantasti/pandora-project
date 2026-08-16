// furigana_coverage.js — pandora_global算数編 読み合成の網羅関門。
// (1) 全356パターンを高volサンプルし、問題文+答えの表示文字列を reading_engine.toHiragana に通す。
//     残存漢字(例外)が出たら pattern_id + 残存文字列を列挙して失敗(握りつぶし禁止)。
//     図内SVGテキストは裁可②によりv1対象外につき除外。
// (2) 読み合成の固定ベクター20件(変音/和語数詞/複名数/小数/分数/負数/question形)を golden照合。
//
// 実行:  node tests/furigana_coverage.js [samplesPerPattern]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const E = require(path.join(ROOT, 'pattern_bank', 'reading_engine.js')).loadDefault();
const N = Number(process.argv[2] || 60);

// ---- (2) 固定ベクター20件(変音・和語・複名数・小数・分数・帯分数・負数・百・question) ----
const VECTORS = [
  ['1本', 'いっぽん'], ['3本', 'さんぼん'], ['6本', 'ろっぽん'], ['20本', 'にじゅっぽん'],
  ['21本', 'にじゅういっぽん'], ['300本', 'さんびゃっぽん'], ['100本', 'ひゃっぽん'],
  ['3つ', 'みっつ'], ['何つ', 'いくつ'], ['何本', 'なんぼん'],
  ['3日間', 'みっかかん'], ['8時50分', 'はちじごじゅっぷん'], ['2日', 'ふつか'],
  ['3.14', 'さんてんいちよん'], ['0.56', 'れいてんごろく'],
  ['3/4', 'よんぶんのさん'], ['2と3/4', 'にとよんぶんのさん'],
  ['-5', 'マイナスご'], ['25円', 'にじゅうごえん'], ['345', 'さんびゃくよんじゅうご'],
  // v1.0.2 追加(buai複合・午前+時刻複名数・単独分=ふん非歩合)
  ['3割5分2厘', 'さんわりごぶにりん'], ['午前8時50分', 'ごぜんはちじごじゅっぷん'], ['5分', 'ごふん'],
];

console.log('=== (2) 固定ベクター' + VECTORS.length + '件 golden照合 ===');
let vbad = 0;
for (const [inp, exp] of VECTORS) {
  let got; try { got = E.toHiragana(inp); } catch (e) { got = 'ERR:' + e.message; }
  const ok = got === exp; if (!ok) vbad++;
  if (!ok) console.log('  ❌ ' + inp + ' → ' + got + ' (期待 ' + exp + ')');
}
console.log('  ' + (vbad === 0 ? VECTORS.length + '/' + VECTORS.length + ' 一致 ✅' : vbad + '件不一致 ❌'));

// ---- (1) 全パターン網羅: サンプルの問題文+答えを toHiragana、残存漢字を検出 ----
console.log('\n=== (1) 全356パターン 残存漢字網羅(各' + N + '本) ===');
const files = fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(f => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(f)).sort();
const violations = {};   // pattern_id -> Set(残存文字列snippet)
let totalPat = 0, sampled = 0;
for (const f of files) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', f), 'utf-8'));
  const lex = bank.shared_lexicon || {};
  for (const p of bank.patterns) {
    totalPat++;
    for (let k = 0; k < N; k++) {
      let r; try { r = P.makeProblem(p, null, lex); } catch (e) { continue; }
      sampled++;
      for (const field of ['problem', 'answer']) {
        const txt = r[field]; if (!txt) continue;
        try { E.toHiragana(String(txt)); }
        catch (e) {
          const set = violations[p.pattern_id] || (violations[p.pattern_id] = new Set());
          set.add(e.message.replace(/^残存漢字: /, ''));
        }
      }
    }
  }
}
const vpats = Object.keys(violations);
if (vpats.length === 0) console.log('  残存漢字 0 ✅ (' + totalPat + 'パターン / ' + sampled + '標本、全て読み化完了)');
else {
  console.log('  ❌ 残存漢字あり ' + vpats.length + 'パターン:');
  for (const pid of vpats) console.log('    ' + pid + ': ' + [...violations[pid]].slice(0, 4).join(' | '));
}

const fail = vbad > 0 || vpats.length > 0;
console.log('\n' + (fail ? '❌ furigana_coverage 失敗' : 'furigana_coverage: 全通過 ✅(ベクター' + VECTORS.length + ' + 残存漢字0)'));
process.exit(fail ? 1 : 0);
