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
const jsonOut = args.includes('--json');                          // 全件リスト(由来区分つき)を handoff_jhs/ に出力
const N = Number(args.find(a => /^\d+$/.test(a)) || 200);
const glob = args.find(a => !/^\d+$/.test(a) && a !== '--gate' && a !== '--json');

const exempt = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'corr0007_transcription_exemptions.json'), 'utf-8')).exemptions.map(e => e.pattern_id));

const TOKEN = /\d+(?:\.\d+)?/g;                                   // 小数対応・両言語同一
function nums(s) { return new Set((String(s).match(TOKEN) || [])); }
// 答えマーカー: 「答え」または「こたえ」の最後の出現以降を答え部とする(加法・g01配線の前提)
const ANSWER_MARK = /(答え|こたえ)/g;
function answerTail(ans) {
  const s = String(ans); let last = -1, m;
  ANSWER_MARK.lastIndex = 0;
  while ((m = ANSWER_MARK.exec(s))) last = m.index + m[0].length;
  return last >= 0 ? s.slice(last) : s;
}

// 由来判定: 問題テンプレの{slot}プレースホルダ集合と、リテラル定数(テンプレ地の数字+template_number_constants)を抽出
function templatesText(p) {
  const out = [];
  const st = p.sentence_templates;
  if (Array.isArray(st)) st.forEach(x => out.push(typeof x === 'string' ? x : (x && (x.text || x.template) || JSON.stringify(x))));
  else if (st) out.push(String(st));
  return out.join(' ');
}
function provenanceOf(p) {
  const txt = templatesText(p);
  const slotNames = new Set();                                    // 問題文に実在する {name}
  (txt.match(/\{([^}]+)\}/g) || []).forEach(ph => slotNames.add(ph.slice(1, -1)));
  const literal = new Set((txt.replace(/\{[^}]+\}/g, ' ').match(TOKEN) || []));  // 地の文リテラル数字(例: 2乗の2)
  (p.template_number_constants || []).forEach(c => literal.add(String(c)));      // 宣言済み定数
  return { slotNames, literal };
}

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
    const prov = provenanceOf(p);
    let hits = 0, example = null, residualHits = 0;               // residualHits: v2.1(constant単独除外)適用後も残る標本数
    const tokOrigin = {};                                         // 値 -> {sawSlot, sawConst}
    for (let i = 0; i < N; i++) {
      let r; try { r = P.makeProblem(p, null, lex); } catch (e) { continue; }
      const aNums = nums(answerTail(r.answer)), pNums = nums(r.problem);
      const inter = [...aNums].filter(x => pNums.has(x));
      if (!inter.length) continue;
      hits++;
      // 問題側で実際に置換された {slot} 値から数値トークンを抽出(複合表示 f1_disp="1/4" → 1,4 も拾う)
      const slotVals = new Set();
      prov.slotNames.forEach(nm => { const v = r.env[nm]; if (v === undefined || v === null) return; (String(v).match(TOKEN) || []).forEach(t => slotVals.add(t)); });
      let residualThis = 0;
      for (const t of inter) {
        const inSlot = slotVals.has(t), inConst = prov.literal.has(t);
        const o = tokOrigin[t] || (tokOrigin[t] = { sawSlot: false, sawConst: false });
        if (inSlot) o.sawSlot = true;
        if (inConst && !inSlot) o.sawConst = true;                 // 定数「のみ」由来
        // v2.1: constant単独(inConst && !inSlot)のみ除外。slot/both/不明はすべて残す(保守=バグ見逃し回避)
        if (!(inConst && !inSlot)) residualThis++;
      }
      if (residualThis > 0) residualHits++;
      if (!example) example = { problem: r.problem.replace(/\n/g, ' '), answer: r.answer, shared: inter };
    }
    if (hits > 0) {
      const origin = {};
      // slot(置換値由来)/constant(定数単独)/both。不明(どちらのフラグも立たず)は保守的に slot 扱い
      Object.keys(tokOrigin).forEach(t => { const o = tokOrigin[t]; origin[t] = (o.sawSlot && o.sawConst) ? 'both' : o.sawConst ? 'constant' : 'slot'; });
      detections.push({ grade, pid: p.pattern_id, hits, rate: hits + '/' + N,
        v2_1_residual: residualHits, v2_1_residual_rate: residualHits + '/' + N,
        tokens: Object.keys(origin), origin, example, exempt: exempt.has(p.pattern_id) });
    }
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

// 由来内訳(トークン単位・非例外) + v2.1残存(パターン単位・非例外)
const tokCnt = { slot: 0, constant: 0, both: 0 };
nonExempt.forEach(d => Object.values(d.origin).forEach(o => tokCnt[o]++));
const v2_1_remain = nonExempt.filter(d => d.v2_1_residual > 0);
console.log('由来内訳(非例外・トークン): slot ' + tokCnt.slot + ' / constant ' + tokCnt.constant + ' / both ' + tokCnt.both);
console.log('v2.1(constant単独除外)適用時 残存パターン: ' + v2_1_remain.length + ' / ' + nonExempt.length + ' (消える ' + (nonExempt.length - v2_1_remain.length) + ')');

if (jsonOut) {
  const outPath = path.join(ROOT, 'pattern_bank', 'handoff_jhs', 'corr0007_report_full.json');
  const rows = detections.map(d => ({
    grade: d.grade, pattern_id: d.pid, exempt: d.exempt,
    rate: d.rate, hits: d.hits,
    v2_1_residual_rate: d.v2_1_residual_rate,
    matched_tokens: d.tokens,
    token_origin: d.origin,                                       // 値 -> slot|constant|both
    example: { problem_head: d.example.problem.slice(0, 40), answer: d.example.answer, shared: d.example.shared }
  }));
  const doc = {
    _comment: 'corr-0007 転記検査 全件リスト(統一遡及フェーズ②・トリアージ素材)。由来: slot=問題文の{slot}置換値 / constant=テンプレ地の数字・template_number_constants / both=両方に同値。v2.1案=constant単独トークンを照合除外。',
    generated: new Date().toISOString().slice(0, 10),
    samples_per_pattern: N,
    total_patterns: totalPat,
    detected: detections.length,
    exempt_count: detections.filter(d => d.exempt).length,
    nonexempt_count: nonExempt.length,
    token_origin_breakdown_nonexempt: tokCnt,
    v2_1_remaining_nonexempt: v2_1_remain.length,
    v2_1_eliminated_nonexempt: nonExempt.length - v2_1_remain.length,
    exemptions: [...exempt],
    detections: rows
  };
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  console.log('全件リスト出力: ' + path.relative(ROOT, outPath));
}
if (gateMode) {
  console.log(nonExempt.length === 0 ? 'corr-0007 GATE: 非例外検出0 ✅' : 'corr-0007 GATE: ❌ 非例外検出 ' + nonExempt.length + '(' + nonExempt.map(d => d.pid).join(',') + ')');
  process.exit(nonExempt.length === 0 ? 0 : 1);
} else {
  console.log('REPORTモード: 検出一覧のみ(即FAILしない)。トリアージ→制約追加/例外登録の後 --gate で関門化。');
  process.exit(0);
}
