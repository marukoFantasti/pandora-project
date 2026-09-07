// iikae_gate.js — 言い換え便(裁可p)の言い換え関門(設計書§3)。基線=tests/fixtures/iikae_baseline.json(全パターンの sentence_templates/kaisetsu/他フィールドhash)。
// sentence_templates が基線と異なるパターン(=言い換え済み)について:
//  (1) {slot}集合の一致(旧文と新文で参照スロットが完全一致・variant数維持)・生成文に未解決{}ゼロ
//  (2) sentence_templates/kaisetsu 以外の全フィールドのバイト不変(kaisetsuの同時改訂は裁可4で許容=報告)
//  (3) 学年配当漢字(kanji_grade.js=allowed_grades+allowed_extra)・D10(ひらがなラベル「」)・furigana は既存関門が包含
//  (4) 差分検査: 旧文との類似度(レーベンシュタイン比)が全variantで<0.8・文字数は旧文の0.8〜1.3倍
//  (5) 転記例外(SELECTION_ANSWER/FORMULA_TRANSCRIBE/転記例外)パターンは本文の数値定数を保存
//  (6) golden: 基線本文に戻したバンクと現行バンクの生成出力(generate_poc_v10)を比較し、問題文ブロック以外の行がバイト一致
// 実行:  node tests/iikae_gate.js            (検査)
//        node tests/iikae_gate.js --update   (便受理後に基線を現行で更新)
'use strict';
require('./_seeded').install();   // 台帳原則: 関門内の乱択はseed付き(corr-0042)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), BANK = path.join(ROOT, 'pattern_bank'), FIX = path.join(__dirname, 'fixtures', 'iikae_baseline.json');
const P = require(path.join(BANK, 'pattern_generator.js')), K = require(path.join(BANK, 'kanji_grade.js')), H = require(path.join(BANK, 'hyoki_rules.js'));
const update = process.argv.includes('--update');
const files = fs.readdirSync(BANK).filter(f => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(f)).sort();
function restHash(p) { const o = Object.assign({}, p); delete o.sentence_templates; delete o.kaisetsu; return crypto.createHash('md5').update(JSON.stringify(o)).digest('hex'); }
function slots(t) { return new Set([...String(t).matchAll(/\{(\w+)\}/g)].map(m => m[1])); }
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }
function sim(a, b) { const L = Math.max(a.length, b.length); return L ? 1 - lev(a, b) / L : 1; }
function isTranscribed(p) { return /転記例外|SELECTION_ANSWER|FORMULA_TRANSCRIBE/.test(JSON.stringify(p)); }
const cur = {};
for (const f of files) { const bank = JSON.parse(fs.readFileSync(path.join(BANK, f), 'utf-8')); for (const p of bank.patterns) cur[p.pattern_id] = { file: f, sentence_templates: p.sentence_templates, kaisetsu: p.kaisetsu === undefined ? null : p.kaisetsu, rest: restHash(p) }; }
if (update || !fs.existsSync(FIX)) { fs.writeFileSync(FIX, JSON.stringify(cur, null, 1) + '\n'); console.log('  基線を' + (update ? '更新' : '初期採取') + ': ' + path.relative(ROOT, FIX) + ' (' + Object.keys(cur).length + 'パターン)'); console.log('\niikae_gate: GREEN ✅(基線' + (update ? '更新' : '採取') + ')'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(FIX, 'utf-8'));
let bad = 0, changed = [], newIds = [];
console.log('=== (0) 自己検査: 類似度・スロット抽出 ===');
(function () { const s1 = sim('赤いテープは3mです。', '赤いテープは3mです。'), s2 = sim('赤いテープの長さは{a1}mです。何mですか。', 'テープが{a1}mあります。長さは何mでしょう。'); if (s1 !== 1 || s2 >= 0.8) { bad++; console.log('  ❌ sim ' + s1 + ' ' + s2); } const ss = slots('{a1}と{b1}の{a1}'); if (ss.size !== 2 || !ss.has('b1')) { bad++; console.log('  ❌ slots'); } console.log('  ' + (bad === 0 ? '✅' : '❌')); })();
console.log('=== (1)〜(5) 言い換え済みパターンの検査 ===');
for (const f of files) {
  const bank = JSON.parse(fs.readFileSync(path.join(BANK, f), 'utf-8'));
  for (const p of bank.patterns) {
    const id = p.pattern_id, b = base[id];
    if (!b) { newIds.push(id); continue; }
    if (JSON.stringify(p.sentence_templates) === JSON.stringify(b.sentence_templates)) continue;
    changed.push(id); const e = [];
    const old = b.sentence_templates, nw = p.sentence_templates;
    if (old.length !== nw.length) e.push('variant数 ' + old.length + '→' + nw.length);
    const so = new Set(), sn = new Set(); old.forEach(t => slots(t).forEach(x => so.add(x))); nw.forEach(t => slots(t).forEach(x => sn.add(x)));
    if ([...so].sort().join() !== [...sn].sort().join()) e.push('スロット集合 ' + [...so].sort().join('/') + ' ≠ ' + [...sn].sort().join('/'));
    if (restHash(p) !== b.rest) e.push('sentence_templates/kaisetsu以外のフィールドが変化');
    const kaisetsuChanged = (p.kaisetsu === undefined ? null : p.kaisetsu) !== b.kaisetsu;
    for (let i = 0; i < Math.min(old.length, nw.length); i++) { const s = sim(old[i], nw[i]), r = nw[i].length / Math.max(1, old[i].length); if (s >= 0.8) e.push('variant' + i + ' 類似度 ' + s.toFixed(2) + '≥0.8(言い換えが実質的でない)'); if (r < 0.8 || r > 1.3) e.push('variant' + i + ' 文字数比 ' + r.toFixed(2) + '(0.8〜1.3外)'); }
    if (isTranscribed(p)) { const digs = new Set(); old.forEach(t => (t.replace(/\{\w+\}/g, '').match(/\d+(?:\.\d+)?/g) || []).forEach(d => digs.add(d))); const nd = nw.join('\n').replace(/\{\w+\}/g, ''); [...digs].forEach(d => { if (nd.indexOf(d) < 0) e.push('転記例外: 本文の数値 ' + d + ' が新文に無い'); }); }
    const allowed = K.allowedFor(p);
    for (let s = 0; s < 20; s++) { let r; try { r = P.makeProblem(p, null, bank.shared_lexicon); } catch (err) { e.push('生成失敗 ' + err.message.slice(0, 60)); break; }
      if (r.problem.indexOf('{') >= 0) { e.push('未解決{}: ' + r.problem.slice(0, 40)); break; }
      const kv = K.check(r.problem, allowed); if (kv.length) { e.push('配当外漢字 ' + [...new Set(kv)].join('')); break; }
      const d10 = H.findUnbracketedLabels(r.problem, []); if (d10.length) { e.push('D10 未囲みラベル ' + d10.map(x => x.label).join('')); break; } }
    if (e.length) { bad++; console.log('  ❌ ' + id + ': ' + e.join(' / ')); } else console.log('  ✅ ' + id + (kaisetsuChanged ? '(解説同時改訂=裁可4)' : ''));
  }
}
console.log('  言い換え済み ' + changed.length + 'パターン' + (newIds.length ? ' / 基線に無い新パターン ' + newIds.length + '(次回 --update で基線化: ' + newIds.slice(0, 5).join(',') + (newIds.length > 5 ? '…' : '') + ')' : '') + ' ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (6) golden: 問題文ブロック以外の行がバイト一致(基線本文に戻したバンク vs 現行) ===');
(function () {
  const grades = [...new Set(changed.map(id => cur[id].file))]; if (!grades.length) { console.log('  (言い換え差分なし=スキップ)'); return; }
  const tmp = path.join(require('os').tmpdir(), 'iikae_golden'); fs.mkdirSync(tmp, { recursive: true });
  function strip(txt) { const out = []; let skip = false; for (const l of txt.split('\n')) { if (/^ \[(PASS|FAIL)/.test(l)) { skip = true; continue; } if (skip && /^        解答:/.test(l)) skip = false; if (!skip) out.push(l); } return out.join('\n'); }
  for (const f of grades) {
    const bank = JSON.parse(fs.readFileSync(path.join(BANK, f), 'utf-8')); const bb = JSON.parse(JSON.stringify(bank));
    bb.patterns.forEach(p => { const b = base[p.pattern_id]; if (b && JSON.stringify(p.sentence_templates) !== JSON.stringify(b.sentence_templates)) { p.sentence_templates = b.sentence_templates; if (b.kaisetsu === null) delete p.kaisetsu; else p.kaisetsu = b.kaisetsu; } });
    const fb = path.join(tmp, 'base_' + f); fs.writeFileSync(fb, JSON.stringify(bb, null, 1));
    const HJ = path.join(BANK, 'handoff_jhs'), kj = path.join(HJ, 'kyoiku_kanji_g1to6_jhs.json');
    let a, b2; try { a = execFileSync('python3', ['generate_poc_v10.py', path.join(BANK, f), kj], { cwd: HJ, encoding: 'utf-8', maxBuffer: 64 << 20 }); b2 = execFileSync('python3', ['generate_poc_v10.py', fb, kj], { cwd: HJ, encoding: 'utf-8', maxBuffer: 64 << 20 }); } catch (err) { bad++; console.log('  ❌ 生成失敗 ' + f); continue; }
    const sa = strip(a), sb = strip(b2); if (sa !== sb) { bad++; const la = sa.split('\n'), lb = sb.split('\n'); let i = 0; while (i < la.length && la[i] === lb[i]) i++; console.log('  ❌ ' + f + ' 問題文以外の行が変化: ' + (lb[i] || '').slice(0, 60) + ' → ' + (la[i] || '').slice(0, 60)); } else console.log('  ✅ ' + f);
  }
})();
console.log('\n' + (bad === 0 ? 'iikae_gate: GREEN ✅(言い換え ' + changed.length + 'パターン)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
