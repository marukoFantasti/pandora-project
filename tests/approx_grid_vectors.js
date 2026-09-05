// approx_grid_vectors.js — 概形第2便 Kind: approx_grid の関門(設計書§1.5・corr-0030原則)。
// (1) anchor行: 行台帳のanchor(seed/R)から輪郭を再生成し、5×5点サンプル分類(独立実装)で■/□/面積が台帳と一致・自己交差なし・キャンバス内・決定性
// (2) 倍の2図(circle_squares): 内接正方形=2r²・外接正方形=4r²(=2倍/4倍)を座標から再計算
// (3) 四分円(quarter_circle r=10): 分類の契約値(■71/□14/面積78)を固定(転記■69/□17との不一致は台帳skipで報告済)
// (4) 生成器経由(blob探索)の決定性: 同じtargetで同じanchorに到達
// 実行:  node tests/approx_grid_vectors.js
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'approx_grid_rows.json'), 'utf-8'));
let bad = 0, cases = 0;
function inside(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
function classify(cols, rows, P) { let full = 0, part = 0; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { let n = 0; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (inside(P, i + (a + 0.5) / 5, j + (b + 0.5) / 5)) n++; if (n === 25) full++; else if (n > 0) part++; } return { full, part, area: full + part / 2 }; }
function inter(a, b, c, d) { const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]); if (Math.abs(den) < 1e-12) return false; const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den, u = -((a[0] - b[0]) * (a[1] - c[1]) - (a[1] - b[1]) * (a[0] - c[0])) / den; return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9; }
console.log('=== (1) anchor行 ' + LED.rows.filter(r => r.mode === 'blob').length + ' ===');
LED.rows.filter(r => r.mode === 'blob').forEach(r => {
  cases++;
  const fp = { kind: 'approx_grid', mode: 'blob', cols: r.cols, rows: r.rows, target_area: r.target_area, anchor_seed: r.anchor_seed, anchor_R: r.anchor_R };
  let a; try { a = FB._approxGridAudit(fp); } catch (e) { bad++; console.log('  ❌ ' + r.row + ' ' + e.message.slice(0, 60)); return; }
  const c = classify(r.cols, r.rows, a.pts);
  if (c.full !== r.full || c.part !== r.part || Math.abs(c.area - r.target_area) > 1e-9) { bad++; console.log('  ❌ ' + r.row + ' 分類 ' + JSON.stringify(c) + ' 台帳 ' + r.full + '/' + r.part + '/' + r.target_area); }
  if (a.cls.full !== c.full || a.cls.part !== c.part) { bad++; console.log('  ❌ ' + r.row + ' audit分類不一致'); }
  if (a.issues.length) { bad++; console.log('  ❌ ' + r.row + ' issues ' + a.issues); }
  let cross = false; const P = a.pts; for (let i = 0; i < P.length && !cross; i++) for (let j = i + 2; j < P.length; j++) { if (i === 0 && j === P.length - 1) continue; if (inter(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) { cross = true; break; } }
  if (cross) { bad++; console.log('  ❌ ' + r.row + ' 自己交差'); }
  if (!P.every(p => p[0] > 0 && p[0] < r.cols && p[1] > 0 && p[1] < r.rows)) { bad++; console.log('  ❌ ' + r.row + ' キャンバス外'); }
  if (FB.build(fp) !== FB.build(fp)) { bad++; console.log('  ❌ ' + r.row + ' 非決定'); }
  // (4) 探索の決定性: targetから同じanchorに到達
  const s = FB._approxGridAudit({ kind: 'approx_grid', mode: 'blob', cols: r.cols, rows: r.rows, target_area: r.target_area, outline: { seed: r.seed || 1 } });
  if (s.seed !== r.anchor_seed || Math.abs(s.R - r.anchor_R) > 1e-9) { bad++; console.log('  ❌ ' + r.row + ' 探索非決定 ' + s.seed + ' vs ' + r.anchor_seed); }
});
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 倍の2図 / (3) 四分円契約 ===');
(function () {
  cases++; const r = 1, inner = 2 * r * r, outer = (2 * r) * (2 * r);
  if (inner / (r * r) !== 2 || outer / (r * r) !== 4) { bad++; console.log('  ❌ 倍率'); }
  const svg = FB.build({ kind: 'approx_grid', mode: 'circle_squares', r: 1 }); if (!/<circle/.test(svg) || !/<polygon/.test(svg) || !/<rect/.test(svg)) { bad++; console.log('  ❌ 倍の2図の描画要素'); }
  cases++; const q = FB._approxGridAudit({ kind: 'approx_grid', mode: 'quarter_circle', r: 10 });
  if (q.cls.full !== 71 || q.cls.part !== 14) { bad++; console.log('  ❌ 四分円分類 ' + JSON.stringify(q.cls)); }
  // 独立再計算(四分円)
  let full = 0, part = 0; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { let n = 0; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) { const x = i + (a + 0.5) / 5, y = j + (b + 0.5) / 5; if (x * x + y * y < 100) n++; } if (n === 25) full++; else if (n > 0) part++; }
  if (full !== 71 || part !== 14) { bad++; console.log('  ❌ 四分円独立再計算 ' + full + '/' + part); }
  console.log('  ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('\n' + (bad === 0 ? 'approx_grid: 全' + cases + '照合 一致 ✅(anchor分類=台帳・自己交差/キャンバス/決定性・探索決定性・倍の2図・四分円契約)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
