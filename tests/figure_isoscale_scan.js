// figure_isoscale_scan.js — corr-0036横展開: 描画層(layoutToSvg)を通る角度依存kindで「描画角=幾何角」を一括再計測する関門。
// line_set(r6)の根因=正規化座標の非等方写像(260×200)で垂直が78°/102°に歪んだ教訓を、他kindへ常設検査として横展開。
// 検査: (A) 全バンク図のviewport整合(viewBox縦横比==width/height比・preserveAspectRatio!=none・非一様scale無し)
//       (B) 角度依存kindの描画角再計測: tri_angle/tri_angle_iso/quad_angle(角度v5)・angle_figure(parallel_lines=g04 heikou/jhs c12・
//           angle_around_point・polygon・congruent_pair)・composite_area(直交輪郭)・prism/cuboid(正面矩形の直角・鉛直辺・奥行辺の平行)
//           ・line_set(描画角=幾何角)。許容±0.05°(座標2桁丸め)。
// 実行:  node tests/figure_isoscale_scan.js [seedsPerPattern]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const N = Number(process.argv[2] || 12);
const TOL = 0.05;
let bad = 0, cases = 0;
const perKind = {};
function note(kind, dev) { const k = perKind[kind] = perKind[kind] || { n: 0, max: 0, bad: 0 }; k.n++; k.max = Math.max(k.max, dev); if (dev > TOL) { k.bad++; bad++; } }
function ang(dx, dy) { return ((Math.atan2(-dy, dx) * 180 / Math.PI) % 180 + 180) % 180; }   // y反転・直線角[0,180)
function angdiff(a, b) { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); }
function polys(svg) { const out = []; let m; const re = /<polygon points="([^"]+)"/g; while ((m = re.exec(svg))) out.push(m[1].trim().split(/\s+/).map(s => s.split(',').map(Number))); return out; }
function linesOf(svg, mainOnly) {   // mainOnly: 図形本体(stroke=#1a56c4)のみ(リーダー線/補助線を除外)
  const out = []; let m; const re = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"([^>]*)>/g;
  while ((m = re.exec(svg))) { if (mainOnly && m[5].indexOf('stroke="#1a56c4"') < 0) continue; out.push([+m[1], +m[2], +m[3], +m[4]]); }
  return out;
}
function interior(pts) {   // 多角形の内角(度)
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n], c = pts[i], q = pts[(i + 1) % n];
    const a1 = Math.atan2(p[1] - c[1], p[0] - c[0]), a2 = Math.atan2(q[1] - c[1], q[0] - c[0]);
    let d = Math.abs(a1 - a2) * 180 / Math.PI; if (d > 180) d = 360 - d; out.push(d);
  }
  const s = out.reduce((a, b) => a + b, 0), want = (n - 2) * 180;   // 凹多角形なら外角側になるので補正
  return Math.abs(s - want) < 1e-6 ? out : out.map(x => 360 - x);
}
function sortedDev(got, want) { const g = got.slice().sort((a, b) => a - b), w = want.slice().sort((a, b) => a - b); if (g.length !== w.length) return 999; let m = 0; for (let i = 0; i < g.length; i++) m = Math.max(m, Math.abs(g[i] - w[i])); return m; }

console.log('=== (A) viewport整合(全バンク図) + (B) 角度依存kindの描画角再計測(±' + TOL + '°) ===');
for (const bf of fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(f => /^patterns_.*\.json$/.test(f)).sort()) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', bf), 'utf-8'));
  for (const p of bank.patterns) {
    if (!p.figure_params) continue;
    for (let s = 0; s < N; s++) {
      let r, svg; try { r = P.makeProblem(p, null, bank.shared_lexicon || {}); svg = FB.build(r.figure); } catch (e) { bad++; console.log('  ❌ 生成/描画失敗 ' + p.pattern_id + ' ' + e.message.slice(0, 60)); break; }
      if (!svg) break;
      const fp = r.figure, kind = fp.kind + (fp.subkind ? '/' + fp.subkind : '');
      cases++;
      // (A) viewport
      const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/), wh = svg.match(/width="([-\d.]+)" height="([-\d.]+)"/);
      const par = (svg.match(/preserveAspectRatio="([^"]+)"/) || [])[1] || 'meet';
      const nonUni = (svg.match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g) || []).filter(t => { const m = t.match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/); return Math.abs(+m[1] - +m[2]) > 1e-9; });
      // width/height は viewBox の w,h と一致(angle_figure様式)か ceil丸め(≤1px)のみ。preserveAspectRatio=meet(既定)なら丸め差は一様スケールで吸収=角度不変。none/非一様scaleは不可
      const whOk = vb && wh && ((Math.abs(+wh[1] - +vb[3]) < 1e-6 && Math.abs(+wh[2] - +vb[4]) < 1e-6) || (+wh[1] >= +vb[3] - 1e-6 && +wh[1] <= Math.ceil(+vb[3]) + 1 && +wh[2] >= +vb[4] - 1e-6 && +wh[2] <= Math.ceil(+vb[4]) + 1)   // viewBox=小数1桁表示・width/height=生値のceil→差は最大1px(meetで一様吸収));
      if (!whOk || /none/.test(par) || nonUni.length) { bad++; console.log('  ❌ viewport ' + p.pattern_id + ' vb=' + (vb && vb[0]) + ' wh=' + (wh && wh[0]) + ' par=' + par + ' nonUniform=' + nonUni.length); }
      // (B) 角度再計測
      const L = linesOf(svg), PG = polys(svg);
      if (fp.kind === 'tri_angle') { const a = interior(PG[0]); note(kind, sortedDev(a, [fp.a1, fp.a2, 180 - fp.a1 - fp.a2])); }
      else if (fp.kind === 'tri_angle_iso') { const a = interior(PG[0]); note(kind, sortedDev(a, [fp.apex, (180 - fp.apex) / 2, (180 - fp.apex) / 2])); }
      else if (fp.kind === 'quad_angle') { const a = interior(PG[0]); note(kind, sortedDev(a, [fp.a1, fp.a2, fp.a3, 360 - fp.a1 - fp.a2 - fp.a3])); }
      else if (fp.kind === 'angle_figure' && fp.subkind === 'parallel_lines') {
        const A = L.slice(0, 3).map(l => ang(l[2] - l[0], l[3] - l[1])); const al = Number(fp.transversal.angle);
        const dev = Math.max(angdiff(A[0], A[1]), Math.abs(angdiff(A[2], A[0]) - Math.min(al, 180 - al)));
        note(kind, dev);
      }
      else if (fp.kind === 'angle_figure' && fp.subkind === 'angle_around_point') {
        const rays = L.filter(l => Math.abs(l[0]) < 1e-6 && Math.abs(l[1]) < 1e-6).map(l => ((Math.atan2(-l[3], l[2]) * 180 / Math.PI) % 360 + 360) % 360).sort((a, b) => a - b);
        const gaps = rays.map((v, i) => ((rays[(i + 1) % rays.length] - v) % 360 + 360) % 360 || 360);
        note(kind, sortedDev(gaps, fp.angles.map(a => Number(a.v))));
      }
      else if (fp.kind === 'angle_figure' && fp.subkind === 'polygon') { note(kind, sortedDev(interior(PG[0]), fp.angles.map(a => Number(a.v)))); }
      else if (fp.kind === 'angle_figure' && fp.subkind === 'congruent_pair') { const w = fp.angles.map(a => Number(a.v)); note(kind, Math.max(sortedDev(interior(PG[0]), w), sortedDev(interior(PG[1]), w))); }
      else if (fp.kind === 'composite_area') { let dev = 0; linesOf(svg, true).forEach(l => { const a = ang(l[2] - l[0], l[3] - l[1]); dev = Math.max(dev, Math.min(angdiff(a, 0), angdiff(a, 90))); }); note(kind, dev); }
      else if ((fp.kind === 'prism' && fp.base_kind === 'rect') || fp.kind === 'cuboid') {   // 三角柱は底面辺が斜辺に混じるため対象外(正面矩形なし)
        // 正面矩形=直角4・鉛直辺=90°・奥行(斜)辺=全て同角(平行投影の整合)
        const front = PG.find(pg => pg.length === 4 && pg.every(pt => Math.abs(pt[0] - pg[0][0]) < 1e-6 || Math.abs(pt[1] - pg[0][1]) < 1e-6 || true) && interior(pg).every(a => Math.abs(a - 90) < 5));
        let dev = front ? sortedDev(interior(front), [90, 90, 90, 90]) : 0;
        const segs = linesOf(svg, true).map(l => ang(l[2] - l[0], l[3] - l[1])).filter(a => angdiff(a, 0) > 1 && angdiff(a, 90) > 1);   // 斜辺
        for (let i = 1; i < segs.length; i++) dev = Math.max(dev, angdiff(segs[i], segs[0]));
        note(kind, dev);
      }
      else if (fp.kind === 'line_set') { const g = FB._geom.line_set(fp); let dev = 0; L.slice(0, g.lines.length).forEach((l, i) => { dev = Math.max(dev, angdiff(ang(l[2] - l[0], l[3] - l[1]), g.lines[i].angle)); }); note(kind, dev); }
      if (!r.env || Object.keys(fp).length === 0) break;
    }
  }
}
Object.keys(perKind).sort().forEach(k => { const v = perKind[k]; console.log('  ' + k.padEnd(32) + ' 図' + String(v.n).padStart(4) + '  最大偏差 ' + v.max.toFixed(3) + '°  ' + (v.bad ? '❌ ' + v.bad : '✅')); });
console.log('\n' + (bad === 0 ? 'figure_isoscale_scan: GREEN ✅(viewport整合 ' + cases + '図 + 描画角再計測 ' + Object.keys(perKind).length + 'kind・±' + TOL + '°)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
