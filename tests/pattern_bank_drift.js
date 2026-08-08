// ドリフト防止テスト（条件①）。
//
// 背景: computed_slots の Python `formula` と JS `js_formatter` ヒントは別ソースのため、
// 将来どちらか一方だけ編集されると無言で乖離しうる。これを恒久的に検出する。
//
// 方針: pattern_bank/patterns_g0*.json を走査し、js_formatter を持つ全 computed_slot について、
//   参照元スロットの choices 全値で
//     Python: eval(formula, {src: v})            ← Python 側の真の評価
//     JS:     PatternGen.FORMATTERS[fmt](v)       ← JS 側の真の評価
//   を悉皆照合する。両ランタイムで独立に計算して比較するため、片側だけの編集を必ず捕捉する。
//   js_formatter 付きスロットが増えても自動で対象に入る（走査型）。
//
// 実行:  node tests/pattern_bank_drift.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));

// 走査対象: デプロイ実体のバンク（ランタイムが読むもの）。将来学年も自動で入る。
const bankFiles = fs.readdirSync(path.join(ROOT, 'pattern_bank'))
  .filter(f => /^patterns_g\d\d\.json$/.test(f))
  .map(f => path.join(ROOT, 'pattern_bank', f));

// js_formatter を持つ computed_slot を収集
const jobs = [];   // {file, pid, slot, fmt, src, choices}
for (const file of bankFiles) {
  const bank = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const p of (bank.patterns || [])) {
    const pid = p.id || p.pattern_id || '(no-id)';
    for (const [slot, spec] of Object.entries(p.computed_slots || {})) {
      if (!spec.js_formatter) continue;
      const [fmt, src] = spec.js_formatter;
      // 参照元スロットの choices（quantity_slots 優先、無ければ slots）
      const qs = (p.quantity_slots || {})[src] || (p.slots || {})[src] || {};
      const choices = qs.choices;
      if (!Array.isArray(choices) || !choices.length) {
        console.error(`ERROR: ${path.basename(file)} ${pid}.${slot}: js_formatter の参照元 "${src}" に有限の choices がありません（走査型テストが検証できないため要対応）`);
        process.exit(2);
      }
      if (typeof P.FORMATTERS[fmt] !== 'function') {
        console.error(`ERROR: ${path.basename(file)} ${pid}.${slot}: FORMATTERS["${fmt}"] が存在しません`);
        process.exit(2);
      }
      jobs.push({ file: path.basename(file), pid, slot, fmt, src, choices, formula: spec.formula });
    }
  }
}

if (!jobs.length) {
  console.log('js_formatter 付き computed_slot は 0 件（対象なし・合格）');
  process.exit(0);
}

// --- Python 側を1回のサブプロセスで一括評価（formula を src=v で eval） ---
const pyProg = `
import sys, json
def gcd(a,b):
    a,b=int(a),int(b)
    while b: a,b=b,a%b
    return a
def lcm(a,b):
    a,b=int(a),int(b); return a//gcd(a,b)*b
def reduce_num(n,d): return int(n)//gcd(n,d)
def reduce_den(n,d): return int(d)//gcd(n,d)
SAFE={"gcd":gcd,"lcm":lcm,"reduce_num":reduce_num,"reduce_den":reduce_den}
tasks=json.load(sys.stdin)
out=[]
for t in tasks:
    res=[str(eval(t["formula"], SAFE, {t["src"]: v})) for v in t["choices"]]
    out.append(res)
json.dump(out, sys.stdout)
`;
const pyOut = execFileSync('python3', ['-c', pyProg], {
  input: JSON.stringify(jobs.map(j => ({ formula: j.formula, src: j.src, choices: j.choices }))),
  encoding: 'utf-8'
});
const pyResults = JSON.parse(pyOut);

// --- JS 側 FORMATTERS と照合 ---
let bad = 0, totalCases = 0;
jobs.forEach((j, i) => {
  const py = pyResults[i];
  j.choices.forEach((v, k) => {
    totalCases++;
    const js = String(P.FORMATTERS[j.fmt](v));
    if (js !== py[k]) {
      console.log(`DRIFT ${j.file} ${j.pid}.${j.slot} fmt=${j.fmt} src=${j.src}=${v}: JS=${JSON.stringify(js)} != PY=${JSON.stringify(py[k])}`);
      bad++;
    }
  });
});

console.log(`js_formatter スロット ${jobs.length} 件 / 照合ケース ${totalCases} 件（参照元choices悉皆）`);
jobs.forEach(j => console.log(`  - ${j.file} ${j.pid}.${j.slot}: ${j.fmt}(${j.src}) × ${j.choices.length}値`));
console.log(bad === 0 ? 'ドリフト防止: Python formula == JS FORMATTERS 全件一致 ✅' : `${bad}件ドリフト ❌`);
process.exit(bad === 0 ? 0 : 1);
