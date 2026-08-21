// c14(空間図形)図あり4パターン(prism・斜投影)の悉皆図照合。
// 角度系(semBad=弧ラベル)と論点が異なり、prismは【寸法ラベル(w/d/h)】の配置が検査対象:
//   (a) ラベル間 minText ≥ 10px（寸法ラベル同士が重ならない）
//   (b) ラベル/辺重なり minSeg ≥ 4px（寸法ラベルが非自要素の辺線に重ならない）
//   (c) semBad = 0（各寸法ラベルが自寸法辺を最近傍とする=どの辺の寸法か曖昧にならない）
// を実受理組(613/621/384/30)で全数確認する。figure_params は prism 実書式(height名・全スロット参照)。
//
// 実行:  node tests/pattern_bank_jhs_c14_figures.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
function rng(lo, hi, st) { const a = []; for (let v = lo; v <= hi; v += (st || 1)) a.push(v); return a; }
function prism(o) { return Object.assign({ kind: 'prism', unit: 'cm' }, o); }
function cyl(r, h) { return { kind: 'cylinder', r: r, height: h, unit: 'cm' }; }
function cone(r, h) { return { kind: 'cone', r: r, height: h, unit: 'cm' }; }
function sphere(r) { return { kind: 'sphere', r: r, unit: 'cm' }; }
function pyr(o) { return Object.assign({ kind: 'pyramid', unit: 'cm' }, o); }
function rot(sk, r, h) { const o = { kind: 'rotation_source', source_kind: sk, r: r, unit: 'cm' }; if (h != null) o.height = h; return o; }
// G-4b位置関係(実構成): prism rect + 頂点名8(vertex_labels) + 基準辺AB強調 + 寸法非表示(show_dims:false)。
function cuboidRel(w, d, h) { return { kind: 'prism', base_kind: 'rect', w: w, d: d, height: h, unit: 'cm', vertex_labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], highlight_edge: 'AB', show_dims: false }; }
function cuboidDomain() { const o = []; for (const w of rng(3, 12)) for (const d of rng(3, 10)) for (const h of rng(4, 15)) { if (w * d * h > 500) continue; o.push(cuboidRel(w, d, h)); } return o; }

const DOMAINS = {
  // 三角柱の体積: b1∈[4,12]・bh1∈[3,10]・h1∈[4,15]・even(b1·bh1)・V≤500。図=tri(base=b1,base_height=bh1,height=h1)。
  jhs_c14_sankakuchu_vol_01: {
    expect: 613, envs: () => { const o = []; for (const b1 of rng(4, 12)) for (const bh1 of rng(3, 10)) for (const h1 of rng(4, 15)) { if ((b1 * bh1) % 2 !== 0) continue; if (Math.floor(b1 * bh1 / 2) * h1 > 500) continue; o.push(prism({ base_kind: 'tri', base: b1, base_height: bh1, height: h1 })); } return o; }
  },
  // 四角柱の体積: w1∈[3,12]・d1∈[3,10]・h1∈[4,15]・V≤500。図=rect。
  jhs_c14_shikakuchu_vol_01: {
    expect: 621, envs: () => { const o = []; for (const w1 of rng(3, 12)) for (const d1 of rng(3, 10)) for (const h1 of rng(4, 15)) { if (w1 * d1 * h1 > 500) continue; o.push(prism({ base_kind: 'rect', w: w1, d: d1, height: h1 })); } return o; }
  },
  // 四角柱の表面積: w1∈[3,10]・d1∈[3,8]・h1∈[3,10]。
  jhs_c14_shikakuchu_hyomen_01: {
    expect: 384, envs: () => { const o = []; for (const w1 of rng(3, 10)) for (const d1 of rng(3, 8)) for (const h1 of rng(3, 10)) o.push(prism({ base_kind: 'rect', w: w1, d: d1, height: h1 })); return o; }
  },
  // 三角柱の表面積(直角三角形底面 3k/4k/5k): k1∈[1,3]・h1∈[3,12]。図=tri(base=3k,base_height=4k,height=h1)。
  jhs_c14_sankakuchu_hyomen_01: {
    expect: 30, envs: () => { const o = []; for (const k1 of rng(1, 3)) for (const h1 of rng(3, 12)) o.push(prism({ base_kind: 'tri', base: 3 * k1, base_height: 4 * k1, height: h1 })); return o; }
  },
  // --- S-3 wave2 錐円系(π答え・pi_coef/pi_coef_frac3) ---
  // 円柱体積: r∈[2,10]・h∈[3,15]・r²h≤600。図=cylinder。
  jhs_c14_enchu_vol_01: { expect: 91, envs: () => { const o = []; for (const r of rng(2, 10)) for (const h of rng(3, 15)) { if (r * r * h > 600) continue; o.push(cyl(r, h)); } return o; } },
  // 円柱表面積: r∈[2,8]・h∈[3,12]。
  jhs_c14_enchu_hyomen_01: { expect: 70, envs: () => { const o = []; for (const r of rng(2, 8)) for (const h of rng(3, 12)) o.push(cyl(r, h)); return o; } },
  // 円錐体積: r∈[2,10]・h∈[3,15]・r²h≤600。図=cone。
  jhs_c14_ensui_vol_01: { expect: 91, envs: () => { const o = []; for (const r of rng(2, 10)) for (const h of rng(3, 15)) { if (r * r * h > 600) continue; o.push(cone(r, h)); } return o; } },
  // 球体積: r∈[2,9]・最疎。図=sphere。
  jhs_c14_kyu_vol_01: { expect: 8, envs: () => rng(2, 9).map(function (r) { return sphere(r); }) },
  // 四角錐体積: w∈[3,12]・d∈[3,10]・h∈[4,15]・(wdh)%3==0・wdh//3≤400。図=pyramid。
  jhs_c14_kakusui_vol_01: { expect: 695, envs: () => { const o = []; for (const w of rng(3, 12)) for (const d of rng(3, 10)) for (const h of rng(4, 15)) { if ((w * d * h) % 3 !== 0) continue; if (Math.floor(w * d * h / 3) > 400) continue; o.push(pyr({ base_kind: 'rect', w: w, d: d, height: h })); } return o; } },
  // --- S-4 wave3 回転体(rotation_source・軸ℓは参照線=clearance除外) ---
  // 回転体(長方形→円柱): r∈[2,10]・h∈[3,15]・r²h≤600。図=rotation_source(rect)。
  jhs_c14_kaiten_enchu_01: { expect: 91, envs: () => { const o = []; for (const r of rng(2, 10)) for (const h of rng(3, 15)) { if (r * r * h > 600) continue; o.push(rot('rect', r, h)); } return o; } },
  // 回転体(直角三角形→円錐): r∈[2,10]・h∈[3,15]・r²h≤600。図=rotation_source(right_tri)。
  jhs_c14_kaiten_ensui_01: { expect: 91, envs: () => { const o = []; for (const r of rng(2, 10)) for (const h of rng(3, 15)) { if (r * r * h > 600) continue; o.push(rot('right_tri', r, h)); } return o; } },
  // 回転体(半円→球): r∈[2,9]・最疎。図=rotation_source(semicircle)。
  jhs_c14_kaiten_kyu_01: { expect: 8, envs: () => rng(2, 9).map(function (r) { return rot('semicircle', r); }) },
  // --- G-4b Phase2 位置関係(edge_set・実構成=頂点名8/寸法非表示・全AB基準) ---
  jhs_c14_nejire_01: { expect: 621, envs: cuboidDomain },
  jhs_c14_heikou_hen_01: { expect: 621, envs: cuboidDomain },
  jhs_c14_suichoku_01: { expect: 621, envs: cuboidDomain }
};

let bad = 0;
console.log('=== c14 prism 悉皆図照合(寸法ラベル: ラベル間≥10 / ラベル辺重なり≥4 / semBad0) ===');
for (const [pid, dom] of Object.entries(DOMAINS)) {
  const envs = dom.envs();
  const countOk = envs.length === dom.expect;
  if (!countOk) bad++;
  let drawBad = 0, clBad = 0, minMT = 1e9, minSeg = 1e9;
  for (const fp of envs) {
    let svg; try { svg = FB.build(fp); } catch (e) { drawBad++; continue; }
    if (!svg || svg.length < 200 || svg.indexOf('undefined') >= 0 || (svg.match(/<svg/g) || []).length !== 1) drawBad++;
    const clKey = '_' + fp.kind.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }) + 'MinClearance';
    const cl = FB[clKey](fp);
    if (cl.minText < minMT) minMT = cl.minText; if (cl.minSeg < minSeg) minSeg = cl.minSeg;
    if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { clBad++; if (clBad <= 6) console.log('       ❌ ' + pid + ' ' + JSON.stringify(fp) + ' minText=' + cl.minText.toFixed(2) + ' minSeg=' + cl.minSeg.toFixed(2) + ' semBad=' + cl.semBad); }
  }
  if (drawBad) bad += drawBad; if (clBad) bad += clBad;
  console.log('  ' + (countOk && !drawBad && !clBad ? '✅' : '❌') + ' ' + pid + ': 受理組 ' + envs.length + '/' + dom.expect + ' / 描画不良 ' + drawBad + ' / clearance違反 ' + clBad + ' / min(minText ' + minMT.toFixed(1) + ', minSeg ' + minSeg.toFixed(1) + ')');
}
console.log('\n' + (bad === 0 ? 'c14 図照合: 全15パターン合格 ✅(角柱613/621/384/30 + 錐円91/70/91/8/695 + 回転体91/91/8 + 位置関係621×3・prism流儀/頂点名8悉皆違反0)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
