// approx_solid_vectors.js — 概形第2便 Kind: approx_solid の関門(設計書§2.3)。行台帳×seed100: シルエット面積比[0.92,1.08]・内外はみ出し・自己交差なし・
// ラベル距離≦18px・体積=転記答・決定性 + 円柱の契約(体積式・描画要素)
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'approx_solid_rows.json'), 'utf-8'));
let bad = 0, cases = 0, fails = 0;
function area(P) { let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } return Math.abs(A) / 2; }
function inside(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
function inter(a, b, c, d) { const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]); if (Math.abs(den) < 1e-12) return false; const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den, u = -((a[0] - b[0]) * (a[1] - c[1]) - (a[1] - b[1]) * (a[0] - c[0])) / den; return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9; }
console.log('=== (1) 悉皆: ' + LED.rows.length + '行 × seed1..100 ===');
LED.rows.forEach(r => {
  for (let s = 1; s <= 100; s++) {
    cases++; const fp = { kind: 'approx_solid', base: r.base, dims: r.dims, unit: r.unit, outline: { seed: s } };
    let a; try { a = FB._approxSolidAudit(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + r.row + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
    if (a.issues.length) { bad++; if (fails++ < 3) console.log('  ❌ issues ' + r.row + ' seed' + s + ' ' + a.issues); }
    a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ ラベル距離 ' + r.row + ' seed' + s + ' ' + l.text + ' ' + l.dOwn.toFixed(1)); } });
    const ratio = area(a.pts) / area(a.poly); if (ratio < 0.92 || ratio > 1.08) { bad++; if (fails++ < 3) console.log('  ❌ 面積比 ' + r.row + ' ' + ratio.toFixed(3)); }
    let cross = false; const P = a.pts; for (let i = 0; i < P.length && !cross; i++) for (let j = i + 2; j < P.length; j++) { if (i === 0 && j === P.length - 1) continue; if (inter(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) { cross = true; break; } }
    if (cross) { bad++; if (fails++ < 3) console.log('  ❌ 自己交差 ' + r.row); }
    let inN = 0, outN = 0; P.forEach(p => { if (inside(a.poly, p[0], p[1])) inN++; else outN++; }); if (inN < 3 || outN < 3) { bad++; if (fails++ < 3) console.log('  ❌ 内外はみ出し ' + r.row + ' seed' + s); }
    const vol = r.base === 'cuboid' ? r.dims.w * r.dims.d * r.dims.h : r.dims.r * r.dims.r * 3.14 * r.dims.h;
    if (Math.abs(vol - r.ans) > 1e-9 || Math.abs(a.volume - r.ans) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ 体積≠転記 ' + r.row + ' ' + vol + '/' + a.volume + ' vs ' + r.ans); }
    if (FB.build(fp) !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + r.row); }
  }
});
console.log('  ' + (LED.rows.length * 100) + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 円柱の契約(体積式・描画要素・面積比) ===');
(function () { cases++; const fp = { kind: 'approx_solid', base: 'cylinder', dims: { r: 5, h: 8 }, unit: 'cm', outline: { seed: 7 } }; const a = FB._approxSolidAudit(fp), svg = FB.build(fp);
  if (Math.abs(a.volume - 5 * 5 * 3.14 * 8) > 1e-9 || a.issues.length || !/<ellipse/.test(svg) || a.labels.some(l => !l.ok)) { bad++; console.log('  ❌ 円柱 ' + JSON.stringify([a.volume, a.issues])); }
  cases++; let threw = false; try { FB.build({ kind: 'approx_solid', base: 'cone', dims: { r: 1, h: 1 } }); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約: 未知base'); }
  console.log('  ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('\n' + (bad === 0 ? 'approx_solid: 全' + cases + '照合 一致 ✅(悉皆・面積比/内外/自己交差・ラベル距離・体積=転記・決定性・円柱契約)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
