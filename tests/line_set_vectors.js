// line_set_vectors.js — e-2 Kind: line_set(直線散布・垂直/平行組合せ)の関門(設計書§1.4・corr-0030原則・目視条件r2)。
// density難度ノブ(low=交差は垂直ペア内のみ / normal=横断線≥1が平行ペア両方を横切る・非正答交差は角度帯[40°,75°]∪[105°,140°]・
// 非ペア交差相手≦2)。角度帯は幾何(lines)から独立再計算。包含/交点/ラベル帰属/決定性。悉皆域=3行×2density×seed200=1200構成。
//
// 実行:  node tests/line_set_vectors.js
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;
const ROWS = [
  { labels: ['ウ', 'エ', 'オ', 'カ', 'ク', 'ケ'], pairs: { perpendicular: [['カ', 'ケ'], ['ウ', 'エ']], parallel: [['オ', 'ク']] } },
  { labels: ['ウ', 'エ', 'オ', 'カ', 'ク', 'ケ'], pairs: { perpendicular: [['オ', 'ケ'], ['ウ', 'エ']], parallel: [['カ', 'ク']] } },
  { labels: ['ウ', 'エ', 'オ', 'ク', 'ケ', 'コ'], pairs: { perpendicular: [['オ', 'ケ'], ['ウ', 'エ']], parallel: [['ク', 'コ']] } }
];
function fp(row, seed, density) { return Object.assign({ kind: 'line_set', seed: seed, density: density }, row); }
const DEG = Math.PI / 180;
function ends(l) { const r = l.angle * DEG, hx = Math.cos(r) * l.len / 2, hy = Math.sin(r) * l.len / 2; return [[l.cx - hx, l.cy - hy], [l.cx + hx, l.cy + hy]]; }
function inter(a, b) {   // 独立実装の線分交差判定
  const p = ends(a), q = ends(b);
  const [x1, y1] = p[0], [x2, y2] = p[1], [x3, y3] = q[0], [x4, y4] = q[1];
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (Math.abs(den) < 1e-9) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
function angdiff(a, b) { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); }

console.log('=== (1) 悉皆: 3行×{low,normal}×seed1..200 = 角度帯(独立再計算)/包含/交点/横断/帰属/決定性 ===');
let nLbl = 0, fails = 0, maxCross = 0, trNormal = 0, nNormal = 0;
ROWS.forEach(function (row, ri) {
  ['low', 'normal'].forEach(function (den) {
    for (let s = 1; s <= 200; s++) {
      cases++;
      let a, g;
      try { g = FB._geom.line_set(fp(row, s, den)); a = FB._lineSetAudit(fp(row, s, den)); }
      catch (e) { fails++; bad++; if (fails <= 3) console.log('  ❌ ' + den + ' row' + ri + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
      if (a.issues.length) { bad++; if (fails++ <= 3) console.log('  ❌ issues ' + den + ' row' + ri + ' seed' + s + ' ' + a.issues.slice(0, 2)); }
      a.labels.forEach(function (l) { nLbl++; if (!l.ok) { bad++; if (fails++ <= 3) console.log('  ❌ 帰属 ' + den + ' row' + ri + ' seed' + s + ' ' + l.own + '→' + l.nearest); } });
      // 角度帯・交差規則の独立再計算
      const byL = {}; g.lines.forEach(l => { byL[l.label] = l; });
      const perpOf = {}; row.pairs.perpendicular.forEach((p, k) => { perpOf[p[0]] = k; perpOf[p[1]] = k; });
      const paraOf = {}; row.pairs.parallel.forEach((p, k) => { paraOf[p[0]] = k; paraOf[p[1]] = k; });
      const cross = {}; g.lines.forEach(l => { cross[l.label] = 0; });
      for (let i = 0; i < g.lines.length; i++) for (let j = i + 1; j < g.lines.length; j++) {
        const A = g.lines[i], B = g.lines[j], d = angdiff(A.angle, B.angle);
        const samePerp = perpOf[A.label] !== undefined && perpOf[A.label] === perpOf[B.label];
        const samePara = paraOf[A.label] !== undefined && paraOf[A.label] === paraOf[B.label];
        if (samePerp && Math.abs(d - 90) >= 0.5) { bad++; console.log('  ❌ 垂直角 ' + A.label + B.label); }
        if (samePara && d >= 0.5) { bad++; console.log('  ❌ 平行角 ' + A.label + B.label); }
        if (!samePerp && !samePara && !(d >= 12 && d <= 78)) { bad++; if (fails++ <= 3) console.log('  ❌ 余白 ' + den + ' seed' + s + ' ' + A.label + B.label + ' ' + d.toFixed(1)); }
        if (!samePerp && inter(A, B)) {
          cross[A.label]++; cross[B.label]++;
          if (den === 'low') { bad++; if (fails++ <= 3) console.log('  ❌ low交差 seed' + s + ' ' + A.label + B.label); }
          else if (!(d >= 40 && d <= 75)) { bad++; if (fails++ <= 3) console.log('  ❌ 交差角度帯 seed' + s + ' ' + A.label + B.label + ' ' + d.toFixed(1)); }
        }
      }
      Object.keys(cross).forEach(k => { maxCross = Math.max(maxCross, cross[k]); if (cross[k] > 2) { bad++; console.log('  ❌ 交差>2 ' + k); } });
      if (den === 'normal') { nNormal++; if (a.transversals >= 1) trNormal++; else { bad++; if (fails++ <= 3) console.log('  ❌ 横断なし seed' + s); } }
      if (FB.build(fp(row, s, den)) !== FB.build(fp(row, s, den))) { bad++; console.log('  ❌ 非決定 seed' + s); }
    }
  });
});
console.log('  ' + cases + '構成 / ラベル' + nLbl + ' / 非ペア交差相手max' + maxCross + '(上限2) / normal横断≥1: ' + trNormal + '/' + nNormal + ' ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (2) 契約throw(labels不足・明示linesの角度違反・余白違反・キャンバス外) ===');
const b2 = bad;
[
  { kind: 'line_set', labels: ['ア'], pairs: {} },
  { kind: 'line_set', labels: ['ア', 'イ'], pairs: { parallel: [['ア', 'イ']] }, lines: [{ label: 'ア', angle: 20, cx: 0.4, cy: 0.5, len: 0.4 }, { label: 'イ', angle: 25, cx: 0.6, cy: 0.5, len: 0.4 }] },
  { kind: 'line_set', labels: ['ア', 'イ'], pairs: {}, lines: [{ label: 'ア', angle: 20, cx: 0.4, cy: 0.5, len: 0.4 }, { label: 'イ', angle: 25, cx: 0.6, cy: 0.5, len: 0.4 }] },
  { kind: 'line_set', labels: ['ア', 'イ'], pairs: {}, lines: [{ label: 'ア', angle: 0, cx: 0.5, cy: 0.5, len: 1.2 }, { label: 'イ', angle: 60, cx: 0.5, cy: 0.5, len: 0.4 }] }
].forEach(function (o) { cases++; let t = false; try { FB.build(o); } catch (e) { t = true; } if (!t) { bad++; console.log('  ❌ 非throw ' + JSON.stringify(o.labels)); } });
console.log('  契約4種 ' + (bad === b2 ? '✅' : '❌'));

console.log('\n' + (bad === 0 ? 'line_set: 全' + cases + '照合 一致 ✅(悉皆1200+契約4)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
