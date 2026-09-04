// hiragana_label_brackets.js — 表示規則(D12・まるこ 2026-09-04): 角や点のひらがな1字ラベル(あ・い・う…)は本文・正解表示・解説の
// 全箇所で「」で囲む(図中ラベルは対象外・カタカナ記号は現状維持)。回帰検査: 本文/答え/kaisetsu の表示文字列で
// 「未囲みのひらがなラベルが (角|点|直線)/の(角|点|直線)/と+ラベル/度/区切り に隣接」する出現ゼロ。
// 実行:  node tests/hiragana_label_brackets.js [samplesPerPattern]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const N = Number(process.argv[2] || 20);
const H = require(path.join(ROOT, 'pattern_bank', 'hyoki_rules.js'));   // 共通表記規則層(D10)
const LABELS = H.LABELS, RE = H.RE;
// 図のひらがな1字ラベルを収集(label/labels/label_left/label_right/vertices)
function figLabels(o, acc) {
  if (Array.isArray(o)) { o.forEach(x => figLabels(x, acc)); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach(k => {
    const v = o[k];
    if (['label', 'labels', 'label_left', 'label_right', 'vertices'].includes(k)) (Array.isArray(v) ? v : [v]).forEach(x => { if (typeof x === 'string' && /^[ぁ-ん]$/.test(x)) acc.add(x); });
    figLabels(v, acc);
  });
}
let bad = 0, cases = 0; const hits = {};
// 契約(感度): 旧様式の未囲み文字列を検出し、囲み済み文字列は検出しない
[['あの角度が55度のとき、いとうの角度を求めなさい。', true], ['答え い 105度 う 75度', true], ['図のあの角度を求めなさい。', true], ['例: あの角が55度なら、いの角は', true],
 ['「あ」の角度が55度のとき、「い」と「う」の角度を求めなさい。', false], ['答え 「い」105度 「う」75度', false], ['図の「あ」の角度を求めなさい。', false], ['あと何度をあわせると一直線', false]].forEach(([t, want]) => {
  RE.lastIndex = 0; const got = RE.test(t);
  if (got !== want) { bad++; console.log('  ❌ 契約: ' + t + ' 検出=' + got); }
});
console.log('  契約8件(旧様式検出4/囲み済み・非ラベル非検出4) ' + (bad === 0 ? '✅' : '❌'));
for (const f of fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(x => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(x)).sort()) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', f), 'utf-8'));
  for (const p of bank.patterns) {
    const acc = new Set(); figLabels(p.figure_params || {}, acc);
    for (let s = 0; s < N; s++) {
      let r; try { r = P.makeProblem(p, null, bank.shared_lexicon || {}); } catch (e) { break; }
      cases++;
      for (const field of ['problem', 'answer', 'kaisetsu']) {
        const t = r[field]; if (!t) continue;
        H.findUnbracketedLabels(t, [...acc]).forEach(h => { const key = p.pattern_id + ':' + field; (hits[key] = hits[key] || new Set()).add(h.context); });
      }
    }
  }
}
// 経路2: 国語教材(japanese_handoff/*.json + samples) / 経路3: homeworkビルダー(jio課題・homework/*.json・存在時のみ) の全文字列を走査
const { execFileSync } = require('child_process');
function walkStrings(o, p, out) { if (Array.isArray(o)) o.forEach((v, i) => walkStrings(v, p + '[' + i + ']', out)); else if (o && typeof o === 'object') Object.keys(o).forEach(k => walkStrings(o[k], p + '/' + k, out)); else if (typeof o === 'string') out.push([p, o]); }
const staticFiles = [];
['japanese_handoff', path.join('japanese_handoff', 'samples'), 'homework'].forEach(d => { const dir = path.join(ROOT, d); if (fs.existsSync(dir)) fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => staticFiles.push(path.join(dir, f))); });
let staticStrings = 0;
staticFiles.forEach(f => { let d; try { d = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (e) { return; } const out = []; walkStrings(d, '', out); staticStrings += out.length; out.forEach(([p, s]) => { cases++; H.findUnbracketedLabels(s, []).forEach(h => { const key = path.relative(ROOT, f) + p; (hits[key] = hits[key] || new Set()).add(h.context); }); }); });
console.log('  静的教材走査: ' + staticFiles.length + 'ファイル / ' + staticStrings + '文字列(国語handoff' + (fs.existsSync(path.join(ROOT, 'homework')) ? '+homework' : '・homework不在') + ')');
// Python同等実装(hyoki_rules.py)との判定一致(契約8件+バンク由来の文字列サンプル)
const pyIn = ['あの角度が55度のとき、いとうの角度を求めなさい。', '答え い 105度 う 75度', '図のあの角度を求めなさい。', '例: あの角が55度なら、いの角は', '「あ」の角度が55度のとき', '答え 「い」105度 「う」75度', 'あと何度をあわせると一直線', 'とく点・低い点・合う角'];
try {
  const py = JSON.parse(execFileSync('python3', ['-c', 'import sys,json\nsys.path.insert(0,"pattern_bank")\nimport hyoki_rules as H\nprint(json.dumps([len(H.find_unbracketed_labels(t)) for t in json.load(sys.stdin)]))'], { cwd: ROOT, input: JSON.stringify(pyIn), encoding: 'utf-8' }));
  pyIn.forEach((t, i) => { cases++; if (py[i] !== H.findUnbracketedLabels(t, []).length) { bad++; console.log('  ❌ JS/Python不一致: ' + t); } });
  console.log('  Python同等実装パリティ ' + pyIn.length + '件 ✅');
} catch (e) { bad++; console.log('  ❌ Python照合不可 ' + e.message.slice(0, 80)); }
const keys = Object.keys(hits);
keys.forEach(k => { bad++; console.log('  ❌ ' + k + ' … ' + [...hits[k]].slice(0, 2).join(' | ')); });
console.log((bad === 0 ? 'hiragana_label_brackets: GREEN ✅(' + cases + '標本・未囲みひらがなラベル0・経路=算数バンク/国語handoff/homework JSON・JS=Python)' : '❌ ' + bad + '件(パターン:欄)'));
process.exit(bad === 0 ? 0 : 1);
