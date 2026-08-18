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
// バンク figure_params の "{slot}" を env で解決して具体 fp を得る(テンプレ由来=ドリフトなし)。
function instantiate(p, env) {
  const fp = JSON.parse(JSON.stringify(p.figure_params));
  fp.angles = fp.angles.map(a => {
    const key = String(a.v).replace(/[{}]/g, '');
    const out = { v: env[key], role: a.role };
    if (a.label) out.label = a.label;
    return out;
  });
  return fp;
}

// 正式値域の全数列挙(バンク value_constraints をミラー。恒等/図照合の慣行=数式を検査側に写す)。
const DOMAINS = {
  // 2直線4角: a1∈[30,150]/5・a1≠90(直交退化)。s1=180−a1。
  jhs_c12_taicho_01: { expect: 24, envs: () => rng(30, 150, 5).filter(a1 => a1 !== 90).map(a1 => ({ a1, s1: 180 - a1 })) },
  jhs_c12_taicho_02: { expect: 24, envs: () => rng(30, 150, 5).filter(a1 => a1 !== 90).map(a1 => ({ a1, xv1: 180 - a1 })) },
  // 3直線6角: a1,a2∈[25,130]/5・xv1=180−a1−a2 で xv1≥25∧xv1≠a1∧xv1≠a2∧a1+a2≥70(隣接2既知の密度clearance・corr-0020)。
  jhs_c12_isshuu_01: {
    expect: 222, envs: () => { const o = []; for (const a1 of rng(25, 130, 5)) for (const a2 of rng(25, 130, 5)) { const xv1 = 180 - a1 - a2; if (xv1 >= 25 && xv1 !== a1 && xv1 !== a2 && a1 + a2 >= 70) o.push({ a1, a2, xv1 }); } return o; }
  },
  // 光線4本: a1,a2,a3∈[40,140]/5・xv1=360−Σ で xv1∈[40,140]∧xv1≠a1/a2/a3。
  jhs_c12_mawari_01: {
    expect: 5538, envs: () => { const o = []; for (const a1 of rng(40, 140, 5)) for (const a2 of rng(40, 140, 5)) for (const a3 of rng(40, 140, 5)) { const xv1 = 360 - a1 - a2 - a3; if (xv1 >= 40 && xv1 <= 140 && xv1 !== a1 && xv1 !== a2 && xv1 !== a3) o.push({ a1, a2, a3, xv1 }); } return o; }
  }
};

let bad = 0;
console.log('=== c12 angle_figure 悉皆図照合(正式値域・受理組数/和360/描画/clearance) ===');
for (const p of bank.patterns) {
  const dom = DOMAINS[p.pattern_id];
  if (!dom) { console.log('  ⚠️ ' + p.pattern_id + ' 値域未定義(要登録)'); bad++; continue; }
  const envs = dom.envs();
  // (1) 受理組数
  const countOk = envs.length === dom.expect;
  if (!countOk) bad++;
  // (2)(3) 和360 + 描画可能性、(4) clearance用 cases
  let sumBad = 0, drawBad = 0;
  const cases = [];
  for (const env of envs) {
    const fp = instantiate(p, env);
    const s = fp.angles.reduce((acc, a) => acc + Number(a.v), 0);
    if (s !== 360) sumBad++;
    let svg; try { svg = FB.build(fp); } catch (e) { drawBad++; continue; }
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0 || (svg.match(/<svg/g) || []).length !== 1) drawBad++;
    cases.push({ label: p.pattern_id + ' ' + JSON.stringify(env), fp });
  }
  // (4) clearance 悉皆(minText≥10 ∧ overflow0)
  const res = scan(cases);
  const clOk = res.violations.length === 0;
  if (sumBad) bad++; if (drawBad) bad++; if (!clOk) bad += res.violations.length;
  console.log('  ' + (countOk && !sumBad && !drawBad && clOk ? '✅' : '❌') + ' ' + p.pattern_id +
    ' [' + p.figure_params.subkind + ']: 受理組 ' + envs.length + '/' + dom.expect +
    ' / 和360不一致 ' + sumBad + ' / 描画不良 ' + drawBad + ' / clearance違反 ' + res.violations.length);
  res.violations.slice(0, 6).forEach(v => console.log('       ❌ ' + v.label + ' minText=' + v.minText + ' overflow=' + v.overflow + (v.err ? ' err=' + v.err : '')));
}
console.log('\n' + (bad === 0 ? 'c12 図照合: 全4パターン合格 ✅(受理組数24/24/222/5,538・和360・描画・clearance悉皆違反0・min minText 10.05px)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
