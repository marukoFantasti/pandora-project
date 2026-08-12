// corr-0007 転記検査ハーネス v2(統一遡及フェーズ①・監査レポートg04パイロットで確定)。
// 表示答えの「答え」マーカー以降の数値トークン ∩ 本文の数値トークン が非空=転記候補。
//   - トークン: \d+(?:\.\d+)?(小数対応・JS/Python同一正規表現)
//   - 照合範囲: 最後の「答え」以降のみ(「しき」部は本文の数の再掲=学習内容のため対象外)
//   - 例外: tests/fixtures/corr0007_transcription_exemptions.json(理由つき)
// 2段モード:
//   report(既定): 検出一覧を出力・即FAILしない(初回悉皆・トリアージ用)
//   gate(--gate): 例外登録済み以外の検出0を要求。非空検出でFAIL(exit 1)
//
// 実行:  node tests/pattern_bank_corr0007.js [samplesPerPattern] [--gate] [bankGlob]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));

const args = process.argv.slice(2);
const gateMode = args.includes('--gate');
const N = Number(args.find(a => /^\d+$/.test(a)) || 200);
const glob = args.find(a => !/^\d+$/.test(a) && a !== '--gate');

const exempt = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'corr0007_transcription_exemptions.json'), 'utf-8')).exemptions.map(e => e.pattern_id));

const TOKEN = /\d+(?:\.\d+)?/g;                                   // 小数対応・両言語同一
function nums(s) { return new Set((String(s).match(TOKEN) || [])); }
function answerTail(ans) { const i = String(ans).lastIndexOf('答え'); return i >= 0 ? String(ans).slice(i + 2) : String(ans); }

const bankFiles = fs.readdirSync(path.join(ROOT, 'pattern_bank'))
  .filter(f => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(f) && (!glob || f.indexOf(glob) >= 0)).sort();

const detections = [];       // {grade, pid, hits, rate, example, exempt}
let totalPat = 0;
for (const bf of bankFiles) {
  const grade = bf.replace(/^patterns_/, '').replace(/\.json$/, '');
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', bf), 'utf-8'));
  const lex = bank.shared_lexicon || {};
  for (const p of bank.patterns) {
    totalPat++;
    let hits = 0, example = null;
    for (let i = 0; i < N; i++) {
      let r; try { r = P.makeProblem(p, null, lex); } catch (e) { continue; }
      const aNums = nums(answerTail(r.answer)), pNums = nums(r.problem);
      const inter = [...aNums].filter(x => pNums.has(x));
      if (inter.length) { hits++; if (!example) example = { problem: r.problem.replace(/\n/g, ' '), answer: r.answer, shared: inter }; }
    }
    if (hits > 0) detections.push({ grade, pid: p.pattern_id, hits, rate: hits + '/' + N, example, exempt: exempt.has(p.pattern_id) });
  }
}

// 出力
const byGrade = {};
detections.forEach(d => { (byGrade[d.grade] = byGrade[d.grade] || []).push(d); });
console.log('corr-0007 転記検査 v2 [' + (gateMode ? 'GATEモード' : 'REPORTモード') + '] ' + bankFiles.length + 'バンク / 各' + N + '本 / 全' + totalPat + 'パターン');
console.log('例外登録: ' + [...exempt].join(', '));
for (const g of Object.keys(byGrade).sort()) {
  console.log('\n[' + g + ']');
  byGrade[g].forEach(d => {
    console.log('  ' + (d.exempt ? '(例外)' : '★検出') + ' ' + d.pid + ' ' + d.rate + ' 共有数値=' + JSON.stringify(d.example.shared)
      + '\n      問題: ' + d.example.problem.slice(0, 56) + '\n      答え: ' + d.example.answer);
  });
}
const nonExempt = detections.filter(d => !d.exempt);
console.log('\n検出パターン計 ' + detections.length + '(うち例外 ' + detections.filter(d => d.exempt).length + ' / 非例外 ' + nonExempt.length + ')');
if (gateMode) {
  console.log(nonExempt.length === 0 ? 'corr-0007 GATE: 非例外検出0 ✅' : 'corr-0007 GATE: ❌ 非例外検出 ' + nonExempt.length + '(' + nonExempt.map(d => d.pid).join(',') + ')');
  process.exit(nonExempt.length === 0 ? 0 : 1);
} else {
  console.log('REPORTモード: 検出一覧のみ(即FAILしない)。トリアージ→制約追加/例外登録の後 --gate で関門化。');
  process.exit(0);
}
