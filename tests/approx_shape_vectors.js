// approx_shape_vectors.js — 概形第1便 Kind: approx_shape の関門(設計書§B.4・corr-0030原則)。
// 悉皆: 行台帳×seed1..100 → 輪郭(自己交差なし・内外はみ出し・面積比[0.92,1.08]を座標から独立再計算)・みなし面積=転記答・ラベル帰属・決定性。契約throw。
// 実行:  node tests/approx_shape_vectors.js
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'approx_shape_rows.json'), 'utf-8'));
let bad = 0, cases = 0, fails = 0;
function area(P) { let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } return Math.abs(A) / 2; }
function inter(a, b, c, d) { const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]); if (Math.abs(den) < 1e-12) return false; const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den, u = -((a[0] - b[0]) * (a[1] - c[1]) - (a[1] - b[1]) * (a[0] - c[0])) / den; return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9; }
function inside(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
const FORM = { rect: d => d.w * d.h, para: d => d.b * d.h, trap: d => (d.a + d.b) * d.h / 2, tri: d => d.b * d.h / 2, circle: d => d.r * d.r * 3.14 };
console.log('=== (1) 悉皆: ' + LED.rows.length + '行 × seed1..100 ===');
LED.rows.forEach(r => {
  for (let s = 1; s <= 100; s++) {
    cases++;
    const fp = { kind: 'approx_shape', base: r.base, dims: r.dims, unit: r.unit, outline: { seed: s, amp: r.amp } };
    let a; try { a = FB._approxShapeAudit(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + r.row + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
    if (a.issues.length) { bad++; if (fails++ < 3) console.log('  ❌ issues ' + r.row + ' seed' + s + ' ' + a.issues); }
    a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ 帰属 ' + r.row + ' seed' + s + ' ' + l.text + '→' + l.nearest + '(' + l.own + ')'); } });
    // 独立再計算: 面積比・自己交差・内外はみ出し(輪郭点がみなし図形の内側/外側の両方に存在)
    const P = a.pts, baseA = a.circle ? Math.PI * a.circle.R * a.circle.R : area(a.base_poly), ratio = area(P) / baseA;
    if (ratio < 0.92 || ratio > 1.08) { bad++; if (fails++ < 3) console.log('  ❌ 面積比 ' + r.row + ' seed' + s + ' ' + ratio.toFixed(3)); }
    let cross = false; for (let i = 0; i < P.length && !cross; i++) for (let j = i + 2; j < P.length; j++) { if (i === 0 && j === P.length - 1) continue; if (inter(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) { cross = true; break; } }
    if (cross) { bad++; if (fails++ < 3) console.log('  ❌ 自己交差 ' + r.row + ' seed' + s); }
    let inN = 0, outN = 0; P.forEach(p => { const isIn = a.circle ? Math.hypot(p[0] - a.circle.c[0], p[1] - a.circle.c[1]) < a.circle.R : inside(a.base_poly, p[0], p[1]); if (isIn) inN++; else outN++; });
    if (inN < 3 || outN < 3) { bad++; if (fails++ < 3) console.log('  ❌ 内外はみ出し ' + r.row + ' seed' + s + ' in=' + inN + ' out=' + outN); }
    if (!r.static && Math.abs(FORM[r.base](r.dims) - r.ans) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ みなし面積≠転記 ' + r.row + ' ' + FORM[r.base](r.dims) + ' vs ' + r.ans); }
    if (Math.abs(a.area_base - FORM[r.base](r.dims)) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ audit面積 ' + r.row); }
    if (FB.build(fp) !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + r.row + ' seed' + s); }
  }
});
console.log('  ' + (LED.rows.length * 100) + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 契約throw ===');
[[{ kind: 'approx_shape', base: 'hexagon', dims: { r: 3 } }, '未知base']].forEach(([fp, name]) => { cases++; let threw = false; try { FB.build(fp); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約: ' + name); } });
console.log('  契約1種 ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'approx_shape: 全' + cases + '照合 一致 ✅(悉皆・面積比/内外/自己交差の独立再計算・みなし面積=転記・帰属・決定性・契約)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
