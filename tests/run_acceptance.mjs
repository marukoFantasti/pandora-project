// 受け入れテスト・ハーネス
// pandora_main.html から「実際に使われている」CONSISTENCY_CRITERIA_PROMPT と
// findDuplicateKanjiChoices を抽出して使う（テスト用に再実装するとドリフトするため）。
//
// 実行:
//   node tests/run_acceptance.mjs                 … JS前処理のみ（APIキー不要）
//   ANTHROPIC_API_KEY=sk-... node tests/run_acceptance.mjs   … LLM基準チェックも実行
//
// LLM判定のゆらぎ確認のため test_fixed.json は3回連続実行する。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const html = readFileSync(join(ROOT, 'pandora_main.html'), 'utf-8');

// ── 1. CONSISTENCY_CRITERIA_PROMPT の値を、文字列/エスケープを意識して抽出し eval ──
function extractPromptExpr(src) {
  const anchor = 'var CONSISTENCY_CRITERIA_PROMPT =';
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error('CONSISTENCY_CRITERIA_PROMPT が見つかりません');
  let i = start + anchor.length;
  let inStr = false, expr = '';
  for (; i < src.length; i++) {
    const ch = src[i];
    expr += ch;
    if (inStr) {
      if (ch === '\\') { expr += src[++i]; continue; }  // エスケープ次の1文字を取り込む
      if (ch === "'") inStr = false;
    } else {
      if (ch === "'") inStr = true;
      else if (ch === ';') break;  // 文字列外の ; が文の終端
    }
  }
  return expr.replace(/;\s*$/, '');
}
const CONSISTENCY_CRITERIA_PROMPT = eval(extractPromptExpr(html));

// ── 2. findDuplicateKanjiChoices 関数を波括弧の対応で抽出し eval ──
function extractFunction(src, name) {
  const anchor = 'function ' + name;
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error(name + ' が見つかりません');
  const braceStart = src.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}
const findDuplicateKanjiChoices = eval('(' + extractFunction(html, 'findDuplicateKanjiChoices') + ')');

// ── 3. checkText を checkConsistency と同じ形で組み立てる ──
function buildCheckText(data) {
  const grades = (data.meta && data.meta.grades) || [];
  const gradeLabel = grades.length ? grades.join('、') : '不明';
  return '【対象学年】' + gradeLabel + '\n\n' + (data.problems || []).map(function (p, i) {
    return '【問' + (i + 1) + '】（level: ' + (p.level || '不明') + '）\n問題文：' + (p.question || p.problem || '') + '\n正解：' + (p.answer || '');
  }).join('\n\n');
}

// ── 4. LLM 基準チェック（checkConsistency の fetch と同一パラメータ）──
async function llmCheck(data) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { skipped: true };
  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: 'あなたは算数・数学の問題の整合性チェッカーです。問題文中の数値・条件・答えに矛盾や不整合がないか確認します。',
    messages: [{ role: 'user', content:
      CONSISTENCY_CRITERIA_PROMPT + buildCheckText(data) +
      '\n\n結果をJSONのみで返してください（他のテキスト不要）:\n{"ok":true} または {"ok":false,"issues":["問題番号と矛盾の説明",...]}' }]
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  const txt = (d.content || []).map(c => c.text || '').join('');
  let parsed = null;
  try { parsed = JSON.parse(txt.replace(/```json|```/g, '').trim()); } catch (e) { parsed = null; }
  return { skipped: false, raw: txt, result: parsed, apiError: d.error || null };
}

// ── 5. 1ケース評価（JS前処理 + LLM）──
async function evaluate(file) {
  const data = JSON.parse(readFileSync(join(ROOT, 'tests', file), 'utf-8'));
  const dup = findDuplicateKanjiChoices(data.kanji_quiz || []);
  const llm = await llmCheck(data);
  const dupReject = !dup.ok;
  const llmReject = !llm.skipped && llm.result && llm.result.ok === false;
  const llmIndeterminate = !llm.skipped && (llm.result === null);
  const rejected = dupReject || llmReject;
  return { file, dup, llm, dupReject, llmReject, llmIndeterminate, rejected };
}

function printCase(label, e) {
  console.log('──────────────────────────────────────────────');
  console.log(label + '  (' + e.file + ')');
  console.log('  JS前処理[選択肢重複]: ' + (e.dup.ok ? 'OK(重複なし)' : 'NG → ' + e.dup.issues.join(' / ')));
  if (e.llm.skipped) {
    console.log('  LLM基準チェック: SKIPPED（ANTHROPIC_API_KEY 未設定）');
  } else if (e.llm.apiError) {
    console.log('  LLM基準チェック: API ERROR → ' + JSON.stringify(e.llm.apiError));
  } else if (e.llm.result === null) {
    console.log('  LLM基準チェック: 判定不能（応答をJSONとして解析できず）raw=' + JSON.stringify(e.llm.raw).slice(0, 400));
  } else if (e.llm.result.ok) {
    console.log('  LLM基準チェック: OK（全問通過）');
  } else {
    console.log('  LLM基準チェック: NG（リジェクト）検出:');
    (e.llm.result.issues || []).forEach(s => console.log('      - ' + s));
  }
  console.log('  ⇒ 総合: ' + (e.rejected ? 'リジェクト' : (e.llm.skipped ? '（LLM未実行のためJS前処理のみで判定：非リジェクト）' : '非リジェクト（通過）')));
}

(async () => {
  console.log('==== 受け入れテスト ====');
  console.log('APIキー: ' + (process.env.ANTHROPIC_API_KEY ? 'あり（LLM基準チェックを実行）' : 'なし（JS前処理のみ）'));

  const orig = await evaluate('test_orig.json');
  printCase('① test_orig（ドラえもん・修正前／リジェクト期待）', orig);

  const cat = await evaluate('test_cat.json');
  printCase('② test_cat（白ねこ・値転記／リジェクト期待）', cat);

  console.log('──────────────────────────────────────────────');
  console.log('③ test_fixed（修正後・全問通過期待／ゆらぎ確認で3回連続）');
  const fixedRuns = [];
  for (let n = 1; n <= 3; n++) {
    const f = await evaluate('test_fixed.json');
    fixedRuns.push(f);
    console.log('  [run ' + n + '/3] JS前処理: ' + (f.dup.ok ? 'OK' : 'NG(' + f.dup.issues.join(';') + ')') +
      ' / LLM: ' + (f.llm.skipped ? 'SKIPPED' : f.llm.apiError ? 'API_ERROR' : f.llm.result === null ? '判定不能' : (f.llm.result.ok ? 'OK(通過)' : 'NG→' + (f.llm.result.issues || []).join(' / '))));
  }

  // ── 合否判定 ──
  console.log('\n==== 合否サマリー ====');
  const skipped = orig.llm.skipped;
  const passOrig = orig.rejected;
  const passCat = cat.rejected;
  const passFixed = fixedRuns.every(f => !f.rejected && (skipped || (f.llm.result && f.llm.result.ok === true)));
  console.log('① test_orig リジェクト: ' + (passOrig ? 'PASS' : 'FAIL'));
  console.log('② test_cat  リジェクト: ' + (passCat ? 'PASS' : 'FAIL'));
  console.log('③ test_fixed 3連続通過: ' + (skipped ? 'N/A（LLM未実行）' : (passFixed ? 'PASS' : 'FAIL')));
  if (skipped) {
    console.log('\n⚠️ ANTHROPIC_API_KEY 未設定のため、基準12/13/4 のLLM判定は未実行です。');
    console.log('   完全な受け入れ判定には次で再実行してください:');
    console.log('   ANTHROPIC_API_KEY=sk-... node tests/run_acceptance.mjs');
  }
})();
