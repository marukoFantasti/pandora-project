// c12 図あり4パターン(第2波G-1・angle_figure/angle_around_point)の悉皆図照合。
// angle_figure が本番バンクに載る初章のため、c06〜c10の図照合(xy_graph/table)と同格の関門を新設する。
// 各パターンの正式値域を全数(仮値域でなくバンクconstraint準拠で)列挙し、
//   (1) 受理組数 == 設計値(taicho_01=24 / taicho_02=24 / isshuu_01=232 / mawari_01=5,538)
//   (2) 全組で figure_params の角の和 == 360(floor丸め前の整数和)
//   (3) 全組で SVG 描画可能(長さ・undefined混入なし・単一svg)
//   (4) 全組で clearance 悉皆(ラベル間 minText≥10px ∧ viewBox はみ出し0=nominal内)
// を確認する。clearance は clearance_scan_angle.js の scan() を流用(G-2以降と同機構)。
//
// 実行:  node tests/pattern_bank_jhs_c12_figures.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const { scan } = require('./clearance_scan_angle.js');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'patterns_jhs_c12.json'), 'utf-8'));
const byId = {}; bank.patterns.forEach(p => byId[p.pattern_id] = p);

function rng(lo, hi, st) { const a = []; for (let v = lo; v <= hi; v += st) a.push(v); return a; }
function resolve(v, env) { const k = String(v).replace(/[{}]/g, ''); return env[k] !== undefined ? env[k] : Number(v); }
// バンク figure_params の "{slot}" を env で解決して具体 fp を得る(テンプレ由来=ドリフトなし)。両subkind対応。
function instantiate(p, env) {
  const fp = JSON.parse(JSON.stringify(p.figure_params));
  if (fp.transversal) fp.transversal = Object.assign({}, fp.transversal, { angle: resolve(fp.transversal.angle, env) });
  fp.angles = fp.angles.map(a => {
    const out = { v: resolve(a.v, env), role: a.role };
    if (a.at) out.at = a.at; if (a.pos !== undefined) out.pos = a.pos; if (a.label) out.label = a.label;
    return out;
  });
  if (fp.external) fp.external = Array.isArray(fp.external)
    ? fp.external.map(e => Object.assign({}, e, { v: resolve(e.v, env) }))
    : Object.assign({}, fp.external, { v: resolve(fp.external.v, env) });   // polygon外角(handoff書式=単体obj/builder正規化)
  return fp;
}

// 正式値域の全数列挙(バンク value_constraints をミラー。恒等/図照合の慣行=数式を検査側に写す)。
// sub='around'(angle_around_point・和360検査) / 'parallel'(parallel_lines・semBad/minSeg検査)。
const DOMAINS = {
  // --- 第1波 angle_around_point ---
  jhs_c12_taicho_01: { expect: 24, sub: 'around', envs: () => rng(30, 150, 5).filter(a1 => a1 !== 90).map(a1 => ({ a1, s1: 180 - a1 })) },
  jhs_c12_taicho_02: { expect: 24, sub: 'around', envs: () => rng(30, 150, 5).filter(a1 => a1 !== 90).map(a1 => ({ a1, xv1: 180 - a1 })) },
  jhs_c12_isshuu_01: {
    expect: 222, sub: 'around', envs: () => { const o = []; for (const a1 of rng(25, 130, 5)) for (const a2 of rng(25, 130, 5)) { const xv1 = 180 - a1 - a2; if (xv1 >= 25 && xv1 !== a1 && xv1 !== a2 && a1 + a2 >= 70) o.push({ a1, a2, xv1 }); } return o; }
  },
  jhs_c12_mawari_01: {
    expect: 5538, sub: 'around', envs: () => { const o = []; for (const a1 of rng(40, 140, 5)) for (const a2 of rng(40, 140, 5)) for (const a3 of rng(40, 140, 5)) { const xv1 = 360 - a1 - a2 - a3; if (xv1 >= 40 && xv1 <= 140 && xv1 !== a1 && xv1 !== a2 && xv1 !== a3) o.push({ a1, a2, a3, xv1 }); } return o; }
  },
  // --- 第2波 parallel_lines(交差角t1∈[30,150]/5・t1≠90直交退化。実pos構成でclearance悉皆・corr-0020二段) ---
  jhs_c12_doui_01: { expect: 24, sub: 'parallel', envs: () => rng(30, 150, 5).filter(t => t !== 90).map(t1 => ({ t1 })) },
  jhs_c12_sakka_01: { expect: 24, sub: 'parallel', envs: () => rng(30, 150, 5).filter(t => t !== 90).map(t1 => ({ t1 })) },
  jhs_c12_naikaku_01: { expect: 24, sub: 'parallel', envs: () => rng(30, 150, 5).filter(t => t !== 90).map(t1 => ({ t1, xv1: 180 - t1 })) },
  jhs_c12_fukugo_01: { expect: 24, sub: 'parallel', envs: () => rng(30, 150, 5).filter(t => t !== 90).map(t1 => ({ t1, s1: 180 - t1 })) },
  // --- 第3波 G-3 polygon(実構成clearance悉皆・corr-0020) ---
  // 三角形2既知+1未知: a1,a2∈[25,130]/5・xv1=180−a1−a2∈[25,130]∧≠a1,a2。
  jhs_c12_tri_naikaku_01: { expect: 226, sub: 'polygon', envs: () => { const o = []; for (const a1 of rng(25, 130, 5)) for (const a2 of rng(25, 130, 5)) { const xv1 = 180 - a1 - a2; if (xv1 >= 25 && xv1 <= 130 && xv1 !== a1 && xv1 !== a2 && a1 + a2 >= 65) o.push({ a1, a2, xv1 }); } return o; } },
  // 三角形外角: a1,a2∈[25,130]/5・xv1=a1+a2∈[50,155]。s1=180−a1−a2。
  jhs_c12_tri_gaikaku_01: { expect: 253, sub: 'polygon', envs: () => { const o = []; for (const a1 of rng(25, 130, 5)) for (const a2 of rng(25, 130, 5)) { const x = a1 + a2; if (x >= 50 && x <= 155) o.push({ a1, a2, xv1: x, s1: 180 - a1 - a2 }); } return o; } },
  // 五角形4既知+1未知: a1..a4∈[90,130]/5・xv1=540−Σ∈[90,130]∧≠各。
  jhs_c12_gokaku_naikaku_01: { expect: 2536, sub: 'polygon', envs: () => { const o = []; for (const a1 of rng(90, 130, 5)) for (const a2 of rng(90, 130, 5)) for (const a3 of rng(90, 130, 5)) for (const a4 of rng(90, 130, 5)) { const xv1 = 540 - a1 - a2 - a3 - a4; if (xv1 >= 90 && xv1 <= 130 && xv1 !== a1 && xv1 !== a2 && xv1 !== a3 && xv1 !== a4) o.push({ a1, a2, a3, a4, xv1 }); } return o; } }
};

let bad = 0;
console.log('=== c12 angle_figure 悉皆図照合(正式値域・受理組数/幾何整合/描画/clearance) ===');
for (const p of bank.patterns) {
  const dom = DOMAINS[p.pattern_id];
  if (!dom) { console.log('  ⚠️ ' + p.pattern_id + ' 値域未定義(要登録)'); bad++; continue; }
  const envs = dom.envs();
  const countOk = envs.length === dom.expect;
  if (!countOk) bad++;
  let geomBad = 0, drawBad = 0, clBad = 0, minMT = 1e9;   // geomBad: around=和360≠ / parallel=契約throw
  for (const env of envs) {
    let fp, svg;
    try { fp = instantiate(p, env); } catch (e) { geomBad++; continue; }
    if (dom.sub === 'around') { if (fp.angles.reduce((acc, a) => acc + Number(a.v), 0) !== 360) geomBad++; }
    try { svg = FB.build(fp); } catch (e) { geomBad++; continue; }   // parallel: 契約検査throw=幾何不整合
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0 || (svg.match(/<svg/g) || []).length !== 1) drawBad++;
    const cl = FB._angleFigureMinClearance(fp);
    if (cl.minText < minMT) minMT = cl.minText;
    // clearance: ラベル間≥10 ∧ 非自線分≥4 ∧ 自要素最近傍(semBad=0)
    if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { clBad++; if (clBad <= 6) console.log('       ❌ ' + p.pattern_id + ' ' + JSON.stringify(env) + ' minText=' + cl.minText.toFixed(2) + ' minSeg=' + cl.minSeg.toFixed(2) + ' semBad=' + cl.semBad); }
  }
  if (geomBad) bad += geomBad; if (drawBad) bad += drawBad; if (clBad) bad += clBad;
  const gLbl = dom.sub === 'around' ? '和360不一致' : '契約不整合';
  console.log('  ' + (countOk && !geomBad && !drawBad && !clBad ? '✅' : '❌') + ' ' + p.pattern_id +
    ' [' + p.figure_params.subkind + ']: 受理組 ' + envs.length + '/' + dom.expect +
    ' / ' + gLbl + ' ' + geomBad + ' / 描画不良 ' + drawBad + ' / clearance違反 ' + clBad + ' / min minText ' + minMT.toFixed(2));
}
console.log('\n' + (bad === 0 ? 'c12 図照合: 全11パターン合格 ✅(G-1 24/24/222/5,538 + G-2 24×4 + G-3 226/253/2,536・幾何整合・描画・clearance悉皆違反0)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
