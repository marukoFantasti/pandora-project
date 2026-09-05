// furigana_coverage.js — pandora_global算数編 読み合成の網羅関門。
// (1) 全パターンを高volサンプルし、問題文+答え+解説(e-9 kaisetsu)の表示文字列を reading_engine.toHiragana に通す。
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
  // P4-2追加(複合単位counter・lexicon最長一致優先・複数漢字連表層・訓の送り仮名表層)
  ['15分後', 'じゅうごふんご'], ['3時間後', 'さんじかんご'], ['4cm1mm', 'よんセンチメートルいちミリメートル'],
  ['何分の一', 'なんぶんのいち'], ['分けた', 'わけた'],
  // P5-1追加(億兆readNumber・m²系counter・回る/の間の表層・アール表記)
  ['72019900000000', 'ななじゅうにちょうひゃくきゅうじゅうきゅうおく'], ['9m²', 'きゅうへいほうメートル'],
  ['96cm²', 'きゅうじゅうろくへいほうセンチメートル'], ['回る角度', 'まわるかくど'],
  ['針の間の角', 'はりのあいだのかく'], ['3日間', 'みっかかん'], ['3a+2b', 'さんa+にb'],
  // P5-2追加(°alias・ひし形表層・「〜形」族の正読封印)
  ['60°', 'ろくじゅうど'], ['ひし形', 'ひしがた'], ['台形', 'だいけい'], ['はこの形', 'はこのかたち'],
  // P5-3第3便追加(複合人読みgt10・年生counter・ひと/にん弁別・くみ弁別)
  ['211人', 'にひゃくじゅういちにん'], ['11人', 'じゅういちにん'], ['1人', 'ひとり'], ['2人', 'ふたり'],
  ['4年生', 'よねんせい'], ['した人は何人', 'したひとはなんにん'], ['1組の辺', 'ひとくみのへん'], ['1くみ', 'いちくみ'],
  // D10 表記規則(ひらがな記号の「」): 「X」1字記号は読み対象外=不変(かな化でも「カ」はカタカナのまま)
  ['「あ」の角度', '「あ」のかくど'], ['「い」105度', '「い」ひゃくごど'], ['「カ」と「ケ」', '「カ」と「ケ」'], ['「A」の点', '「A」のてん'],
  // 緊急パッチ(まるこ検収 2026-09-05): 単独「行」=ぎょう(表の行)・送り仮名付き「行く/行き/行っ/行け」=い
  ['行の合計', 'ぎょうのごうけい'], ['駅まで行く', 'えきまでいく'], ['列や行の数', 'れつやぎょうのかず'], ['学校へ行った', 'がっこうへいった'],
  // 関門44(1字登録文脈一覧)の初回採取で検出: 算数=さんすう(算=ざんの誤爆)・千人/万人=にん(漢数字+人)
  ['算数と国語', 'さんすうとこくご'], ['5万6千人', 'ごまんろくせんにん'], ['千人が56こ分', 'せんにんがごじゅうろっこぶん'],
  // 緊急パッチ第2弾(Fable読み上げ実測 2026-09-05): 上=うえ(単独)/上がる・上がれ=あ / 空いて・空い・空く=あ(空=から維持)
  ['列や行の数', 'れつやぎょうのかず'], ['それより上にある', 'それよりうえにある'], ['はじめて上がる', 'はじめてあがる'], ['空いている', 'あいている'], ['空のはこ', 'からのはこ'], ['上底', 'じょうてい'],
  // 第2弾④: かな+漢字キーの読みは漢字部分のみ(がい数=すう)
  ['千の位までのがい数', 'せんのくらいまでのがいすう'],
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
      for (const field of ['problem', 'answer', 'kaisetsu']) {   // e-9: 解説本文も包含(残存0を維持)
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

// ---- (3) 1字登録の当たり文脈一覧(surface→例文2件): 関門44(single_char_contexts)の固定一覧を表示し、差分検出を同時実行 ----
console.log('\n=== (3) 1字登録の当たり文脈一覧(読みの正誤は人が判定=アイさんのシート・差分はコミットごとに検出) ===');
let cbad = 0;
try {
  const { execFileSync } = require('child_process');
  const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'handoff_jhs', 'furigana_lexicon.json'), 'utf-8')).surfaces;
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'single_char_contexts.json'), 'utf-8'));
  Object.keys(list).sort().forEach(k => console.log('  ' + k + '=' + (lex[k] || '?') + ' (' + list[k].length + '): ' + list[k].slice(0, 2).join(' ／ ')));
  try { execFileSync('node', [path.join(__dirname, 'single_char_contexts.js')], { encoding: 'utf-8' }); console.log('  一覧差分: なし ✅'); }
  catch (e) { cbad++; console.log('  ❌ 一覧が変化(関門44): ' + String(e.stdout || '').split('\n').filter(l => /❌/.test(l)).slice(0, 5).join(' | ')); }
} catch (e) { cbad++; console.log('  ❌ 一覧の読み込み不可: ' + e.message.slice(0, 60)); }
// ---- (4) 辞書規約の機械検査: 読みはキーの漢字部分のみ(かな始まりキーの読みがそのかなで始まらない・かな終わりキーの読みがそのかなで終わらない) ----
console.log('\n=== (4) 辞書規約検査(読み=漢字部分のみ) ===');
let lbad = 0;
(function () {
  const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'handoff_jhs', 'furigana_lexicon.json'), 'utf-8')).surfaces;
  Object.keys(lex).forEach(k => {
    const v = lex[k], head = (k.match(/^[ぁ-んァ-ンー]+/) || [''])[0], tail = (k.match(/[ぁ-んァ-ンー]+$/) || [''])[0];
    if (!/[一-鿿々]/.test(k)) return;
    if (head && v.startsWith(head)) { lbad++; console.log('  ❌ かな始まりキーの読みがかな部分から始まる: ' + k + '=' + v + ' → ' + v.slice(head.length)); }
    if (tail && v.length > tail.length && v.endsWith(tail) && k.length > tail.length + 1) { lbad++; console.log('  ❌ かな終わりキーの読みがかな部分で終わる: ' + k + '=' + v); }
  });
  console.log('  ' + (lbad === 0 ? '規約違反0 ✅' : lbad + '件 ❌'));
})();
const fail = vbad > 0 || vpats.length > 0 || cbad > 0 || lbad > 0;
console.log('\n' + (fail ? '❌ furigana_coverage 失敗' : 'furigana_coverage: 全通過 ✅(ベクター' + VECTORS.length + ' + 残存漢字0)'));
process.exit(fail ? 1 : 0);
