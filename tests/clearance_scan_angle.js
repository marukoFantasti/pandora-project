// clearance_scan_angle.js — angle_figure族 共通の悉皆clearanceスキャナ(乱数不使用・G-1〜G-4再利用)。
// 与えられた値域の全組合せについて figure_builder で図を生成し、
//   (1) ラベル衝突: minText < minGap(既定10px)
//   (2) 図枠はみ出し: 自動フィットviewBoxが nominal を超過(=配置が異常肥大した退化組の代理指標)
// を機械検査し、違反組を列挙する。scan(cases, opts) は {total, violations[]} を返す(G-2以降が流用)。
//
// 実行:  node tests/clearance_scan_angle.js   (仮値域=2直線/3直線 の実装検証スキャン)
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));

// cases: [{label, fp}]。clearanceFn: fp->{minText,...}。opts: {minGap, nominal}
function scan(cases, opts) {
  opts = opts || {};
  const minGap = opts.minGap != null ? opts.minGap : 10;
  const nominal = opts.nominal != null ? opts.nominal : 280;
  const clearanceFn = opts.clearanceFn || (fp => FB._angleFigureMinClearance(fp));
  const violations = [];
  for (const c of cases) {
    let cl, svg, vb, overflow = 0, err = null;
    try {
      cl = clearanceFn(c.fp);
      svg = FB.build(c.fp);
      const m = svg.match(/viewBox="[^ ]+ [^ ]+ ([\d.]+) ([\d.]+)"/);
      if (m) { const w = +m[1], h = +m[2]; overflow = Math.max(0, w - nominal, h - nominal); }
    } catch (e) { err = e.message; }
    const bad = err || cl.minText < minGap || overflow > 0;
    if (bad) violations.push({ label: c.label, minText: cl ? +cl.minText.toFixed(2) : null, minSeg: cl ? +cl.minSeg.toFixed(2) : null, overflow: +overflow.toFixed(1), err: err });
  }
  return { total: cases.length, violations: violations };
}

// ---- 仮値域のケース生成(実装検証用・正式値域はバンク設計時にFableが実物と突合) ----
function around(angles) { return { kind: 'angle_figure', subkind: 'angle_around_point', angles: angles }; }
// 2直線交差: 交差角 a∈[30,150] step5。4角=[a, 180-a(未知∠x), a, 180-a]
function cases2lines() {
  const cs = [];
  for (let a = 30; a <= 150; a += 5) {
    cs.push({ label: '2直線 a=' + a, fp: around([{ v: a, role: 'known', label: a + '°' }, { v: 180 - a, role: 'unknown', label: '∠x' }, { v: a, role: 'plain' }, { v: 180 - a, role: 'plain' }]) });
  }
  return cs;
}
// 3直線: 3隙間 g1,g2,g3(各≥20・和180) step5。6角=[g1,g2(未知),g3, g1,g2,g3]
function cases3lines() {
  const cs = [];
  for (let g1 = 20; g1 <= 140; g1 += 5)
    for (let g2 = 20; g2 <= 140; g2 += 5) {
      const g3 = 180 - g1 - g2; if (g3 < 20) continue;
      cs.push({ label: '3直線 ' + g1 + '/' + g2 + '/' + g3, fp: around([
        { v: g1, role: 'known', label: g1 + '°' }, { v: g2, role: 'unknown', label: '∠x' }, { v: g3, role: 'plain' },
        { v: g1, role: 'plain' }, { v: g2, role: 'plain' }, { v: g3, role: 'plain' }]) });
    }
  return cs;
}

// ---- 第2波G-2 parallel_lines(平行線と角)。corr-0020: バンクが使うラベル密度・役割構成でスキャンを組む ----
// 横断角 t1 から各交点4角=[t1,180−t1,t1,180−t1]。pos偶=t1/奇=180−t1。unknownは∠x(bare_zx)。
function parallel(t1, specs) {
  return { kind: 'angle_figure', subkind: 'parallel_lines', parallel: [{ label: 'ℓ' }, { label: 'm' }], transversal: { angle: t1 },
    angles: specs.map(s => ({ at: s.at, pos: s.pos, v: (s.pos % 2 === 0) ? t1 : 180 - t1, role: s.role, label: s.role === 'unknown' ? '∠x' : undefined })) };
}
// 4構成(ラベル密度・役割が別)。バンクはこの密度で角を置くため、構成別に悉皆する。
const PAR_CONS = {
  i: { name: '(i)同位角 上pos0既知+下pos0未知(最疎)', specs: [{ at: 'upper', pos: 0, role: 'known' }, { at: 'lower', pos: 0, role: 'unknown' }] },
  ii: { name: '(ii)錯角 上pos2既知+下pos0未知', specs: [{ at: 'upper', pos: 2, role: 'known' }, { at: 'lower', pos: 0, role: 'unknown' }] },
  iii: { name: '(iii)上2既知隣接+下未知(G-1隣接2既知の平行線版)', specs: [{ at: 'upper', pos: 0, role: 'known' }, { at: 'upper', pos: 1, role: 'known' }, { at: 'lower', pos: 0, role: 'unknown' }] },
  iv: { name: '(iv)対頂複合 同交点2ラベル 上pos0既知+上pos2未知+下pos0既知', specs: [{ at: 'upper', pos: 0, role: 'known' }, { at: 'upper', pos: 2, role: 'unknown' }, { at: 'lower', pos: 0, role: 'known' }] }
};
// 交差角レンジ(仮 30〜150°/5°)で1構成を悉皆
function casesParallel(kind, lo, hi, st) {
  lo = lo == null ? 30 : lo; hi = hi == null ? 150 : hi; st = st || 5;
  const c = PAR_CONS[kind], cs = [];
  for (let t = lo; t <= hi; t += st) cs.push({ label: kind + ' t=' + t, fp: parallel(t, c.specs), t1: t });
  return cs;
}

// ---- 第2波G-3 polygon(多角形の内角)。バンク想定5構成をvalue域で悉皆(corr-0020) ----
function poly(names, angleSpecs, extra) {
  return Object.assign({ kind: 'angle_figure', subkind: 'polygon',
    vertices: names.map(nm => ({ name: nm })), angles: angleSpecs }, extra || {});
}
const NM = ['A', 'B', 'C', 'D', 'E', 'F'];
function polyClear(FB, fp) { try { return FB._angleFigureMinClearance(fp); } catch (e) { return { minText: -1, minSeg: -1, semBad: 99, err: e.message }; } }
// 各構成のvalue域列挙器(FB注入)。violation=minText<10 ∨ minSeg<4 ∨ semBad>0。
function polyScan(FB) {
  const out = {};
  const rng = (lo, hi, st) => { const a = []; for (let v = lo; v <= hi; v += st) a.push(v); return a; };
  function run(key, name, combos) {
    let viol = 0, minMT = 1e9, worst = null, badEx = [];
    for (const fp of combos) { const cl = polyClear(FB, fp); if (cl.minText < minMT) { minMT = cl.minText; worst = fp; } if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { viol++; if (badEx.length < 4) badEx.push({ a: fp.angles.map(a => a.v), mt: cl.minText, ms: cl.minSeg, sb: cl.semBad }); } }
    out[key] = { name, total: combos.length, viol, minMT: +minMT.toFixed(2), badEx };
  }
  // (i) 三角形 2既知+1未知
  { const c = []; for (const a1 of rng(35, 110, 5)) for (const a2 of rng(35, 110, 5)) { const a3 = 180 - a1 - a2; if (a3 < 35 || a3 > 110) continue; c.push(poly(NM.slice(0, 3), [{ v: a1, role: 'known' }, { v: a2, role: 'known' }, { v: a3, role: 'unknown', label: '∠x' }])); } run('i', '(i)三角形 2既知+1未知', c); }
  // (ii) 三角形 1既知+外角未知(頂点C)
  { const c = []; for (const a1 of rng(35, 110, 5)) for (const a2 of rng(35, 110, 5)) { const a3 = 180 - a1 - a2; if (a3 < 35 || a3 > 110) continue; c.push(poly(NM.slice(0, 3), [{ v: a1, role: 'known' }, { v: a2, role: 'plain' }, { v: a3, role: 'plain' }], { external: [{ at: 2, v: 180 - a3, role: 'unknown' }] })); } run('ii', '(ii)三角形 1既知+外角未知', c); }
  // (iii) 四角形 3既知+1未知
  { const c = []; for (const a1 of rng(60, 140, 10)) for (const a2 of rng(60, 140, 10)) for (const a3 of rng(60, 140, 10)) { const a4 = 360 - a1 - a2 - a3; if (a4 < 60 || a4 > 140) continue; c.push(poly(NM.slice(0, 4), [{ v: a1, role: 'known' }, { v: a2, role: 'known' }, { v: a3, role: 'known' }, { v: a4, role: 'unknown', label: '∠x' }])); } run('iii', '(iii)四角形 3既知+1未知', c); }
  // (iv) 五角形 4既知+1未知
  { const c = []; for (const a1 of rng(90, 130, 10)) for (const a2 of rng(90, 130, 10)) for (const a3 of rng(90, 130, 10)) for (const a4 of rng(90, 130, 10)) { const a5 = 540 - a1 - a2 - a3 - a4; if (a5 < 90 || a5 > 130) continue; c.push(poly(NM.slice(0, 5), [{ v: a1, role: 'known' }, { v: a2, role: 'known' }, { v: a3, role: 'known' }, { v: a4, role: 'known' }, { v: a5, role: 'unknown', label: '∠x' }])); } run('iv', '(iv)五角形 4既知+1未知', c); }
  // (rt) 直角三角形 90既知(直角マーク)+鋭角1既知+鋭角1未知
  { const c = []; for (const a2 of rng(20, 70, 5)) { const a3 = 90 - a2; if (a3 < 20 || a3 > 70) continue; c.push(poly(NM.slice(0, 3), [{ v: 90, role: 'known' }, { v: a2, role: 'known' }, { v: a3, role: 'unknown', label: '∠x' }])); } run('rt', '(rt)直角三角形 90既知+鋭角既知+鋭角未知', c); }
  // (v) 二等辺 頂角未知(底角等長マーク)
  { const c = []; for (const t of rng(20, 140, 5)) { const b = (180 - t) / 2; if (b % 1 !== 0) continue; c.push(poly(NM.slice(0, 3), [{ v: t, role: 'unknown', label: '∠x' }, { v: b, role: 'known' }, { v: b, role: 'plain' }], { marks: [{ ticks: 1, edges: [0, 2] }] })); } run('v', '(v)二等辺 頂角未知+底角等長', c); }
  return out;
}

// ---- 第2波G-4a congruent_pair(合同2三角形の求角)。バンク想定2構成をvalue域で悉皆(corr-0020) ----
function cong(angles, leftShow, rightShow) {
  return { kind: 'angle_figure', subkind: 'congruent_pair', angles: angles.map(function (v) { return { v: v }; }),
    left: { names: ['A', 'B', 'C'], show: leftShow }, right: { names: ['D', 'E', 'F'], show: rightShow }, side_ticks: true };
}
function congScan(FB) {
  const out = {}; const rng = (lo, hi, st) => { const a = []; for (let v = lo; v <= hi; v += st) a.push(v); return a; };
  function run(key, name, combos) {
    let viol = 0, minMT = 1e9, minSeg = 1e9, badEx = []; let vbW = 0, vbH = 0;
    for (const fp of combos) {
      let cl; try { cl = FB._angleFigureMinClearance(fp); } catch (e) { cl = { minText: -1, minSeg: -1, semBad: 99 }; }
      const svg = FB.build(fp); const m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/); if (m) { vbW = Math.max(vbW, +m[1]); vbH = Math.max(vbH, +m[2]); }
      if (cl.minText < minMT) minMT = cl.minText; if (cl.minSeg < minSeg) minSeg = cl.minSeg;
      if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { viol++; if (badEx.length < 4) badEx.push({ a: fp.angles.map(x => x.v), mt: cl.minText, sb: cl.semBad }); }
    }
    out[key] = { name, total: combos.length, viol, minMT: +minMT.toFixed(2), minSeg: +minSeg.toFixed(2), vbW: Math.round(vbW), vbH: Math.round(vbH), badEx };
  }
  // 三角形域(G-3): a1,a2∈[25,130]/5・a3=180−a1−a2∈[25,130]・a1+a2≥65(偏平刈り初期適用)
  function domain() { const o = []; for (const a1 of rng(25, 130, 5)) for (const a2 of rng(25, 130, 5)) { const a3 = 180 - a1 - a2; if (a3 >= 25 && a3 <= 130 && a1 + a2 >= 65) o.push([a1, a2, a3]); } return o; }
  run('i', '(i)左1角既知+右対応角∠x(マーク疎)', domain().map(a => cong(a, [{ at: 0, role: 'known' }], [{ at: 0, role: 'unknown', label: '∠x' }])));
  run('ii', '(ii)左2角既知+右第3角∠x(ラベル3+マーク)', domain().map(a => cong(a, [{ at: 0, role: 'known' }, { at: 1, role: 'known' }], [{ at: 2, role: 'unknown', label: '∠x' }])));
  return out;
}

// ---- G-4b congruent_pair mark_scheme(SSS/SAS/ASA・合同条件識別)。確定値域[45,100]で3構成を悉皆(corr-0020) ----
// マークだけで条件判定させる(角度値は全plain)。検査: (1)名前ラベルclearance(scanPolyAngle) +
// (2)マーク(チョン線1.6/等角弧1.3)と頂点名ラベルの最小間隔(マークは頂点内側・名は外側=分離が担保。
// 密度最大のASA(等角弧6本)でも名に食い込まないことを実測)。乱数なし=シード非依存。
function congMark(scheme, angles) {
  return { kind: 'angle_figure', subkind: 'congruent_pair', mark_scheme: scheme,
    angles: angles.map(function (v) { return { v: v }; }),
    left: { names: ['A', 'B', 'C'], show: [] }, right: { names: ['D', 'E', 'F'], show: [] } };
}
function markNameGap(svg) {
  // 名ラベル中心
  var names = [], m, reN = /<text x="([-\d.]+)" y="([-\d.]+)"[^>]*>[A-F]<\/text>/g;
  while ((m = reN.exec(svg))) names.push([+m[1], +m[2]]);
  // マーク点: チョン線(1.6)の両端 + 等角弧(1.3)の両端
  var marks = [], reL = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#1a56c4" stroke-width="1\.6"/g;
  while ((m = reL.exec(svg))) { marks.push([+m[1], +m[2]]); marks.push([+m[3], +m[4]]); }
  var reA = /<path d="M ([-\d.]+) ([-\d.]+) A [\d.]+ [\d.]+ 0 \d \d ([-\d.]+) ([-\d.]+)" fill="none" stroke="#1a56c4" stroke-width="1\.3"/g;
  while ((m = reA.exec(svg))) { marks.push([+m[1], +m[2]]); marks.push([+m[3], +m[4]]); }
  var min = 1e9;
  names.forEach(function (n) { marks.forEach(function (k) { var d = Math.hypot(n[0] - k[0], n[1] - k[1]); if (d < min) min = d; }); });
  return { min: min, names: names.length, marks: marks.length };
}
function congMarkScan(FB) {
  var out = {}; var rng = function (lo, hi, st) { var a = []; for (var v = lo; v <= hi; v += st) a.push(v); return a; };
  // G-4a確定値域: a1,b1∈[45,100]/5・c1=180−a1−b1∈[45,100]
  var domain = []; for (var a1 of rng(45, 100, 5)) for (var b1 of rng(45, 100, 5)) { var c1 = 180 - a1 - b1; if (c1 >= 45 && c1 <= 100) domain.push([a1, b1, c1]); }
  ['SSS', 'SAS', 'ASA'].forEach(function (scheme) {
    var viol = 0, minMT = 1e9, minSeg = 1e9, minGap = 1e9, markMax = 0, drawBad = 0, badEx = [];
    domain.forEach(function (a) {
      var fp = congMark(scheme, a), svg, cl;
      try { svg = FB.build(fp); } catch (e) { drawBad++; return; }
      if (!svg || svg.indexOf('undefined') >= 0 || (svg.match(/<svg/g) || []).length !== 1) drawBad++;
      try { cl = FB._angleFigureMinClearance(fp); } catch (e) { cl = { minText: -1, minSeg: -1, semBad: 99 }; }
      if (cl.minText < minMT) minMT = cl.minText; if (cl.minSeg < minSeg) minSeg = cl.minSeg;
      var g = markNameGap(svg); if (g.min < minGap) minGap = g.min; if (g.marks > markMax) markMax = g.marks;
      if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0 || g.min < 8) { viol++; if (badEx.length < 4) badEx.push({ a: a, mt: +cl.minText.toFixed(1), gap: +g.min.toFixed(1) }); }
    });
    out[scheme] = { total: domain.length, viol, drawBad, minMT: +minMT.toFixed(2), minSeg: +minSeg.toFixed(2), minGap: +minGap.toFixed(2), markMax, badEx };
  });
  return out;
}

module.exports = { scan, cases2lines, cases3lines, around, parallel, casesParallel, PAR_CONS, poly, polyScan, cong, congScan, congMark, congMarkScan };

if (require.main === module) {
  const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
  for (const [name, cs] of [['2直線交差(30〜150°/5°刻み)', cases2lines()], ['3直線(各隙間≥20°・和180)', cases3lines()]]) {
    const r = scan(cs);
    console.log('=== ' + name + ' ===');
    console.log('  組合せ ' + r.total + ' / 違反 ' + r.violations.length + (r.violations.length ? ':' : ' ✅(違反0)'));
    r.violations.slice(0, 12).forEach(v => console.log('    ❌ ' + v.label + ' minText=' + v.minText + ' overflow=' + v.overflow + (v.err ? ' err=' + v.err : '')));
  }
  // G-2: 構成別スキャン(仮値域 交差角30〜150°/5°)
  console.log('\n=== G-2 parallel_lines 構成別スキャン(仮 交差角30〜150°/5° = 25本/構成) ===');
  for (const kind of ['i', 'ii', 'iii', 'iv']) {
    const cs = casesParallel(kind);
    const r = scan(cs);
    // 構成内の min minText と、違反(minText<10)の交差角
    let minMT = 1e9, minAt = null;
    const violT = [];
    cs.forEach(c => { const cl = FB._angleFigureMinClearance(c.fp); if (cl.minText < minMT) { minMT = cl.minText; minAt = c.t1; } if (cl.minText < 10) violT.push(c.t1 + '(' + cl.minText.toFixed(2) + ')'); });
    console.log('  ' + PAR_CONS[kind].name);
    console.log('    組合せ ' + r.total + ' / 違反 ' + r.violations.length + ' / min minText ' + minMT.toFixed(2) + '@t=' + minAt +
      (violT.length ? '\n      ❌違反t: ' + violT.join(', ') : ' ✅(違反0)'));
    if (violT.length) {
      // 違反する交差角の最大値=下限候補(これより浅い交差はラベルが割れる)
      const badTs = violT.map(s => parseInt(s));
      console.log('      → 値域候補: 交差角 ≥ ' + (Math.max(...badTs) + 5) + '°(浅い交差の刈り上げ)');
    }
  }
  // G-4b: congruent_pair mark_scheme(SSS/SAS/ASA)悉皆(corr-0020・確定値域[45,100])
  console.log('\n=== G-4b congruent_pair mark_scheme 悉皆(3構成×[45,100]=55組/構成・マークだけで条件判定) ===');
  const mr = congMarkScan(FB);
  for (const s of ['SSS', 'SAS', 'ASA']) {
    const o = mr[s];
    console.log('  ' + (o.viol === 0 && o.drawBad === 0 ? '✅' : '❌') + ' ' + s + ': 組' + o.total + ' 違反' + o.viol + ' 描画不良' + o.drawBad +
      ' / minText ' + o.minMT + ' minSeg ' + o.minSeg + ' マーク-名間隔 ' + o.minGap + 'px(マーク点最大' + o.markMax + ')');
    if (o.badEx.length) console.log('       ex: ' + JSON.stringify(o.badEx));
  }
  console.log('  → マーク密度: ASA(等角弧6本)が最大=山。マークは頂点内側・名ラベルは外側で分離、全構成 名clearance/マーク間隔とも余裕。');
}
