// kaisetsu_resolve.js — e-9 kaisetsu_template 関門(仕様書§4-1)。
// (1) kaisetsu を持つ全パターン: JS makeProblem.kaisetsu が未解決 {..} ゼロで解決・pedagogy由来の設計ノート接頭辞なし
// (2) JS/Python 出力一致: 同一 env で Python(generate_poc_v10.make_kaisetsu)が同じ文字列を返す(リゾルバ1:1)
// (3) 決定性: 同一 env からの再解決が同一文字列 / validatePattern が kaisetsu の未宣言プレースホルダを検出(契約)
// (4) retrofit 完全性: rationale_g04 で pedagogy を持つパターン(P5-3以降=31)は全て kaisetsu を持つ。kaisetsu 無しパターン数(解説backfill在庫)を学年別に報告
// 実行:  node tests/kaisetsu_resolve.js [samplesPerPattern]
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const N = Number(process.argv[2] || 30);
let bad = 0, cases = 0;
const jobs = [], backfill = {}, withK = {};
const files = fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(f => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(f)).sort();
console.log('=== (1) kaisetsu 解決(未解決{}ゼロ) + (3) 決定性/契約 ===');
for (const f of files) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', f), 'utf-8'));
  const lex = bank.shared_lexicon || {};
  const key = f.replace(/^patterns_|\.json$/g, '');
  for (const p of bank.patterns) {
    if (typeof p.kaisetsu !== 'string') { backfill[key] = (backfill[key] || 0) + 1; continue; }
    withK[key] = (withK[key] || 0) + 1;
    if (/^設計ノート|Fable本文未着/.test(p.kaisetsu)) { bad++; console.log('  ❌ 設計ノート接頭辞が残存 ' + p.pattern_id); }
    const v = P.validatePattern ? P.validatePattern(p) : null;
    if (v && !v.ok) { const ki = v.issues.filter(x => /kaisetsu/.test(x)); if (ki.length) { bad++; console.log('  ❌ ' + p.pattern_id + ' ' + ki[0]); } }
    for (let s = 0; s < N; s++) {
      cases++;
      let r; try { r = P.makeProblem(p, null, lex); } catch (e) { bad++; console.log('  ❌ 生成失敗 ' + p.pattern_id + ' ' + e.message.slice(0, 60)); break; }
      if (typeof r.kaisetsu !== 'string' || !r.kaisetsu.length) { bad++; console.log('  ❌ kaisetsu 空 ' + p.pattern_id); break; }
      if (/\{\w+\}/.test(r.kaisetsu)) { bad++; console.log('  ❌ 未解決プレースホルダ ' + p.pattern_id + ' ' + r.kaisetsu.match(/\{\w+\}/)[0]); break; }
      const env = {}; for (const [k, val] of Object.entries(r.env)) if (typeof val === 'string' || typeof val === 'number' || Array.isArray(val) || (val && typeof val === 'object')) env[k] = val;
      jobs.push({ pid: p.pattern_id, tmpl: p.kaisetsu, env: env, js: r.kaisetsu });
    }
  }
}
console.log('  対象 ' + Object.values(withK).reduce((a, b) => a + b, 0) + 'パターン / 標本 ' + cases + ' ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (2) JS/Python 出力一致(同一env・str.format) ===');
const pyProg = `
import sys, json
sys.argv=['x','--vectors']
sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'pattern_bank', 'handoff_jhs'))})
import generate_poc_v10 as G
out=[]
for j in json.load(sys.stdin):
    try: out.append(G.make_kaisetsu({"kaisetsu": j["tmpl"]}, j["env"]))
    except Exception as e: out.append("PYERR:"+str(e)[:60])
json.dump(out, sys.stdout, ensure_ascii=False)
`;
let py; try { py = JSON.parse(execFileSync('python3', ['-c', pyProg], { input: JSON.stringify(jobs), encoding: 'utf-8', maxBuffer: 1 << 28 })); } catch (e) { bad++; console.log('  ❌ Python実行不可 ' + e.message.slice(0, 80)); py = []; }
let mism = 0;
jobs.forEach((j, i) => { if (py[i] !== j.js) { mism++; bad++; if (mism <= 3) console.log('  ❌ 不一致 ' + j.pid + '\n    js=' + j.js.slice(0, 80) + '\n    py=' + String(py[i]).slice(0, 80)); } });
console.log('  ' + jobs.length + '標本 不一致 ' + mism + ' ' + (mism === 0 ? '✅' : '❌'));

console.log('=== (4) retrofit 完全性(rationale_g04 pedagogy保持=P5-3以降) + 解説backfill在庫 ===');
const rat = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'pandora2', 'rationale_g04.json'), 'utf-8'));
const g04 = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_g04.json'), 'utf-8'));
const byId = {}; g04.patterns.forEach(p => { byId[p.pattern_id] = p; });
let need = 0, missing = [];
for (const [pid, e] of Object.entries(rat)) { if (pid === '_meta') continue; const ped = e.rationale && e.rationale.pedagogy; if (!ped || (Array.isArray(ped) && !ped.length)) continue; need++; if (!byId[pid] || typeof byId[pid].kaisetsu !== 'string') missing.push(pid); }
if (missing.length) { bad++; console.log('  ❌ kaisetsu 未投入: ' + missing.join(', ')); }
console.log('  pedagogy保持 ' + need + 'パターン → kaisetsu投入 ' + (need - missing.length) + ' ' + (missing.length ? '❌' : '✅'));
const bfTotal = Object.values(backfill).reduce((a, b) => a + b, 0);
console.log('  解説backfill在庫(kaisetsu無し): ' + bfTotal + 'パターン ' + JSON.stringify(backfill));
console.log('\n' + (bad === 0 ? 'kaisetsu_resolve: GREEN ✅(解決/決定性/JS=Python ' + jobs.length + '標本/retrofit完全)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
