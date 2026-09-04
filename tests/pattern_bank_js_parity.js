// JS↔Python 答えパリティ 標準関門。
//
// 教訓(2026-08-09): JSスモークは「生成成功」しか見ず、Pythonゴールデンは Python 同士のため、
// JS式エバリュエータの誤訳(例: A*B//C の floor-div 優先順位)で JS の答えが誤っても検出できなかった。
// 本関門は「JS が生成した各問題の env について、answer_formula と computed_slots を Python が
// 同じ env で評価した値と一致する」ことを全学年で照合する。以後の全バンク追加・生成器変更で必須実行。
//
// 実行:  node tests/pattern_bank_js_parity.js [samplesPerPattern]
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));

const N = Number(process.argv[2] || 40);
// 第2引数(任意): バンクファイル名フィルタ。既定は既存6学年(patterns_gNN)＝標準関門の基準不変。
// 例) node tests/pattern_bank_js_parity.js 40 jhs_c01  → patterns_jhs_c01.json を照合(840サンプル)。
const filter = process.argv[3];
const bankFiles = fs.readdirSync(path.join(ROOT, 'pattern_bank'))
  .filter(f => filter ? (f.indexOf(filter) >= 0 && /^patterns_.*\.json$/.test(f)) : /^patterns_g\d\d\.json$/.test(f))
  .sort();

// JS 側: 各パターンを N 回生成し、int env と JS が算出した ans/computed_slots を集める。
const jobs = [];
for (const bf of bankFiles) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', bf), 'utf-8'));
  const lex = bank.shared_lexicon || {};
  for (const p of bank.patterns) {
    const csFormulas = {};
    for (const [k, v] of Object.entries(p.computed_slots || {})) csFormulas[k] = v.formula;
    for (let s = 0; s < N; s++) {
      let r; try { r = P.makeProblem(p, null, lex); } catch (e) { console.log('GEN-ERR', bf, p.pattern_id, e.message); process.exit(2); }
      // computed_slots は Python 側で全env(int+文字列)で eval、answer_formula は int + computed文字列（generate_poc準拠・e-2）。
      const fullEnv = {}, intEnv = {};
      for (const [k, v] of Object.entries(r.env)) {
        if (typeof v === 'string' || (typeof v === 'number' && Number.isInteger(v))) fullEnv[k] = v;
        if (typeof v === 'number' && Number.isInteger(v)) intEnv[k] = v;
        else if (typeof v === 'string' && Object.prototype.hasOwnProperty.call(csFormulas, k)) intEnv[k] = v;   // e-2: computed文字列はans名前空間に含む(生成器準拠)
      }
      const jsCs = {};
      for (const k of Object.keys(csFormulas)) jsCs[k] = r.env[k];
      jobs.push({ bank: bf, pid: p.pattern_id, env: fullEnv, intEnv: intEnv,
        ans_formula: p.answer_formula || null, ans_js: r.env.ans,
        cs_formula: csFormulas, cs_js: jsCs });
    }
  }
}

// Python 側: 同じ env で answer_formula / computed_slots を評価して返す。SAFE は生成器
// (generate_poc_v10.py) の権威 SAFE をそのまま import して使う＝ヘルパ定義の二重管理を避け、
// v1.0 追加ヘルパ(fmt_signed/sgn_str 等・文字列を返す computed_slots)も自動で解決される。
// --vectors ガードで import 時のバンク読み込みを回避する。
const GEN_DIR = path.join(ROOT, 'pattern_bank', 'handoff_jhs');
const pyProg = `
import sys, json
sys.argv=['x','--vectors']            # バンク読込を回避してヘルパのみ import
sys.path.insert(0, ${JSON.stringify(GEN_DIR)})
import generate_poc_v10 as G
SAFE = G.SAFE
out=[]
for j in json.load(sys.stdin):
    env=j["env"]; ienv=j["intEnv"]; res={"ans":None,"cs":{}}
    try:
        if j["ans_formula"] is not None:
            res["ans"]=eval(j["ans_formula"], SAFE, dict(ienv))   # ans は int env のみ
    except Exception as e: res["ans"]="PYERR:"+str(e)[:40]
    for k,f in j["cs_formula"].items():
        try: res["cs"][k]=eval(f, SAFE, dict(env))                # computed_slots は全env
        except Exception as e: res["cs"][k]="PYERR:"+str(e)[:40]
    out.append(res)
json.dump(out, sys.stdout)
`;
const pyOut = JSON.parse(execFileSync('python3', ['-c', pyProg], {
  input: JSON.stringify(jobs.map(j => ({ env: j.env, intEnv: j.intEnv, ans_formula: j.ans_formula, cs_formula: j.cs_formula }))),
  encoding: 'utf-8', maxBuffer: 1 << 28
}));

// 照合
let mism = 0; const byPat = {}; const samples = [];
jobs.forEach((j, i) => {
  const py = pyOut[i];
  const rec = byPat[j.pid] || (byPat[j.pid] = { n: 0, bad: 0 });
  rec.n++;
  const diffs = [];
  if (j.ans_formula !== null && String(j.ans_js) !== String(py.ans)) diffs.push('ans JS=' + j.ans_js + ' PY=' + py.ans);
  for (const k of Object.keys(j.cs_formula)) if (String(j.cs_js[k]) !== String(py.cs[k])) diffs.push(k + ' JS=' + j.cs_js[k] + ' PY=' + py.cs[k]);
  if (diffs.length) {
    rec.bad++; mism++;
    if (samples.length < 15) samples.push(j.pid + ' [' + diffs.join('; ') + '] env=' + JSON.stringify(j.intEnv));
  }
});
const total = jobs.length;
console.log('JS↔Python 答えパリティ: ' + bankFiles.join(',') + ' / ' + Object.keys(byPat).length + 'パターン × ' + N + '回 = ' + total + 'サンプル');
console.log(mism === 0 ? '全サンプル一致 ✅' : mism + '件 不一致 ❌');
if (mism) {
  const badPats = Object.entries(byPat).filter(([, v]) => v.bad).map(([k, v]) => k + '(' + v.bad + '/' + v.n + ')');
  console.log('不一致パターン:', badPats.join(', '));
  samples.forEach(s => console.log('  ', s));
}
process.exit(mism === 0 ? 0 : 1);
