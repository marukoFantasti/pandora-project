// c13(三角形・平行四辺形)図あり4パターン(G-3 polygon)の悉皆図照合。
// 直角三角形(90直角マーク)・二等辺(等長マーク×2)・平行四辺形(平行マーク>/>>)を実構成value域で全数、
//   受理組数==設計値(rt10/nitohen9・8/heishi24)・描画可能・clearance悉皆(minText≥10∧minSeg≥4∧semBad=0)。
// figure_params は handoff書式(頂点名・equal_marks/parallel_marks名ペア・定数90)→builder正規化を経由。
//
// 実行:  node tests/pattern_bank_jhs_c13_figures.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c13.json'), 'utf-8'));
const byId = {}; bank.patterns.forEach(p => byId[p.pattern_id] = p);
function rng(lo, hi, st) { const a = []; for (let v = lo; v <= hi; v += st) a.push(v); return a; }
function resolve(v, env) { const k = String(v).replace(/[{}]/g, ''); return env[k] !== undefined ? env[k] : Number(v); }
function instantiate(p, env) {
  const fp = JSON.parse(JSON.stringify(p.figure_params));
  fp.angles = fp.angles.map(a => Object.assign({}, a, { v: resolve(a.v, env) }));   // v解決・他フィールド(role/left/right/label_right)は保持
  return fp;   // vertices/equal_marks/parallel_marks/left_vertices/right_vertices は builder が正規化
}
// 実value域(バンクconstraintミラー) + 設計受理組数
const DOMAINS = {
  jhs_c13_rt_tri_01: { expect: 10, envs: () => rng(20, 70, 5).filter(a1 => a1 !== 45).map(a1 => ({ a1, xv1: 90 - a1 })) },
  jhs_c13_nitohen_01: { expect: 9, envs: () => rng(30, 120, 10).filter(t1 => t1 !== 60).map(t1 => ({ t1, xv1: Math.floor((180 - t1) / 2) })) },
  jhs_c13_nitohen_02: { expect: 8, envs: () => rng(35, 75, 5).filter(b1 => b1 !== 60).map(b1 => ({ b1, xv1: 180 - 2 * b1 })) },
  jhs_c13_heishi_01: { expect: 22, envs: () => rng(30, 150, 5).filter(a1 => a1 !== 90 && a1 >= 40).map(a1 => ({ a1, xv1: 180 - a1 })) },
  // --- G-4a congruent_pair(合同求角・確定値域45〜100°) ---
  // 左1角既知+右対応角∠x: a1,b1∈[45,100]/5・c1=180−a1−b1∈[45,100]。
  jhs_c13_goudou_01: { expect: 55, envs: () => { const o = []; for (const a1 of rng(45, 100, 5)) for (const b1 of rng(45, 100, 5)) { const c1 = 180 - a1 - b1; if (c1 >= 45 && c1 <= 100) o.push({ a1, b1, c1 }); } return o; } },
  // 左2角既知+右第3角∠x: 同域・xv1=180−a1−b1∈[45,100]∧≠a1,b1(転記排除)。
  jhs_c13_goudou_02: { expect: 46, envs: () => { const o = []; for (const a1 of rng(45, 100, 5)) for (const b1 of rng(45, 100, 5)) { const xv1 = 180 - a1 - b1; if (xv1 >= 45 && xv1 <= 100 && xv1 !== a1 && xv1 !== b1) o.push({ a1, b1, xv1 }); } return o; } }
};
let bad = 0;
console.log('=== c13 polygon 悉皆図照合(実構成value域・受理組数/描画/clearance) ===');
for (const p of bank.patterns) {
  const dom = DOMAINS[p.pattern_id];
  if (!dom) { console.log('  ⚠️ ' + p.pattern_id + ' 値域未定義'); bad++; continue; }
  const envs = dom.envs();
  const countOk = envs.length === dom.expect;
  if (!countOk) bad++;
  let drawBad = 0, clBad = 0, minMT = 1e9;
  for (const env of envs) {
    let fp, svg;
    try { fp = instantiate(p, env); svg = FB.build(fp); } catch (e) { drawBad++; continue; }
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0 || (svg.match(/<svg/g) || []).length !== 1) drawBad++;
    const cl = FB._angleFigureMinClearance(fp);
    if (cl.minText < minMT) minMT = cl.minText;
    if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { clBad++; if (clBad <= 6) console.log('       ❌ ' + p.pattern_id + ' ' + JSON.stringify(env) + ' minText=' + cl.minText.toFixed(2) + ' minSeg=' + cl.minSeg.toFixed(2) + ' semBad=' + cl.semBad); }
  }
  if (drawBad) bad += drawBad; if (clBad) bad += clBad;
  console.log('  ' + (countOk && !drawBad && !clBad ? '✅' : '❌') + ' ' + p.pattern_id + ' [' + p.semantic_category.slice(0, 16) + ']: 受理組 ' + envs.length + '/' + dom.expect + ' / 描画不良 ' + drawBad + ' / clearance違反 ' + clBad + ' / min minText ' + minMT.toFixed(2));
}
console.log('\n' + (bad === 0 ? 'c13 図照合: 全6パターン合格 ✅(受理組数10/9/8/22 + G-4a合同55/46・直角/等長/平行マーク+対応チョン・描画・clearance悉皆違反0)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
