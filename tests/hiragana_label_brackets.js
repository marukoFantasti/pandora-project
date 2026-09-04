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
const LABELS = 'あいうえおかきくけこ';
// 図のひらがな1字ラベルを収集(label/labels/label_left/label_right/vertices)
function figLabels(o, acc) {
  if (Array.isArray(o)) { o.forEach(x => figLabels(x, acc)); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach(k => {
    const v = o[k];
    if (['label', 'labels', 'label_left', 'label_right', 'vertices'].includes(k)) (Array.isArray(v) ? v : [v]).forEach(x => { if (typeof x === 'string' && /^[ぁ-ん]$/.test(x)) acc.add(x); });
    figLabels(v, acc);
  });
}
// 未囲み検出: 直前がひらがな/カタカナ/漢字/「 でない ラベル1字 が、(角|点|直線)|の(角|点|直線)|と<ラベル>|度|、|空白|行末 に続く
// 強文脈(ラベル+(角|点|直線)/の(角|点|直線))は直前が語の一部(ひらがな/カタカナ/漢字)でない、または助詞「の」(「図のあの角度」型)。語中一致(とく点/低い点/合う角)は除外。弱文脈(と+ラベル/度/区切り/行末)は直前が
// ひらがな/カタカナ/漢字でないときのみ(語中の偶然一致を除外)。いずれも直前が「 なら囲み済み。
const RE = new RegExp('(^|[^ぁ-んァ-ン一-鿿「]|の)([' + LABELS + '])(?=(角|点|直線)|の(角|点|直線))|(^|[^ぁ-んァ-ン一-鿿「])([' + LABELS + '])(?=と[' + LABELS + ']|度|[、 ]|$)', 'gm');
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
        let m; RE.lastIndex = 0;
        while ((m = RE.exec(t))) {
          const lab = m[2] || m[5], strong = !!m[2];
          // 図にひらがなラベルが無いパターンでは強文脈のみ違反(弱文脈は語中の偶然一致の可能性があるため図ラベル所持時のみ)
          if (!acc.has(lab) && !strong) continue;
          const key = p.pattern_id + ':' + field; (hits[key] = hits[key] || new Set()).add(t.slice(Math.max(0, m.index - 6), m.index + 10));
        }
      }
    }
  }
}
const keys = Object.keys(hits);
keys.forEach(k => { bad++; console.log('  ❌ ' + k + ' … ' + [...hits[k]].slice(0, 2).join(' | ')); });
console.log((bad === 0 ? 'hiragana_label_brackets: GREEN ✅(' + cases + '標本・未囲みひらがなラベル0)' : '❌ ' + bad + '件(パターン:欄)'));
process.exit(bad === 0 ? 0 : 1);
