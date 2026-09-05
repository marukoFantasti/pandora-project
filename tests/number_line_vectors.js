// number_line_vectors.js — 数直線便(裁可n) Kind: number_line の関門(設計書§5)。行台帳12図×seed100(markers乱択: 目盛上の点・記号順保存・隣接≥2小目盛):
// 目盛座標=値の線形写像を独立再計算(誤差0)・矢印x=値の写像(誤差0)・記号帰属(最近傍=担当矢印)・間隔・数値ラベル非重なり・等スケール(viewBox==width/height)・決定性。
// anchor(転記値)で表示文字列=転記答・compare行は値の大きい順の記号列=転記答。
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'number_line_rows.json'), 'utf-8'));
let bad = 0, cases = 0, fails = 0;
function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function W() { return 300; }
function check(row, fp, s) {
  cases++; let a; try { a = FB._numberLineAudit(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + row + ' seed' + s + ' ' + e.message.slice(0, 70)); return null; }
  const min = Number(fp.min), max = Number(fp.max);
  a.ticks.forEach(t => { const x = (t.v - min) / (max - min) * W(); if (Math.abs(x - t.x) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ 目盛座標 ' + row + ' ' + t.v); } });
  a.markers.forEach(m => { const x = (m.value - min) / (max - min) * W(); if (Math.abs(x - m.x) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ 矢印座標 ' + row + ' ' + m.label); } });
  if (a.issues.length) { bad++; if (fails++ < 3) console.log('  ❌ issues ' + row + ' seed' + s + ' ' + a.issues); }
  a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ 帰属 ' + row + ' seed' + s + ' ' + l.text + '→' + l.nearest); } });
  const svg = FB.build(fp); if (svg !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + row); }
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/), wh = svg.match(/width="([-\d.]+)" height="([-\d.]+)"/);
  if (!vb || !wh || Math.abs(Number(vb[3]) / Number(vb[4]) - Number(wh[1]) / Number(wh[2])) > 0.02) { bad++; if (fails++ < 3) console.log('  ❌ 等スケール ' + row); }
  return a;
}
console.log('=== (1) anchor: 転記値の表示文字列=転記答・compare行の大きい順記号列 ===');
LED.rows.forEach(r => {
  const a = check(r.row, r.fp, 0); if (!a) return;
  a.fmt.forEach((f, i) => { if (f !== r.ans[i]) { bad++; console.log('  ❌ 表示≠転記 ' + r.row + ' ' + f + ' vs ' + r.ans[i]); } });
  if (r.order_desc && r.mode === 'compare') { const o = a.markers.slice().sort((p, q) => q.value - p.value).map(m => m.label).join('、'); if (o !== r.order_desc) { bad++; console.log('  ❌ 大きい順 ' + r.row + ' ' + o); } }
  if (r.order_desc && r.mode === 'draw') { const o = a.markers.slice().sort((p, q) => q.value - p.value).map(m => m.label).join('、'); if (o !== r.order_desc) { bad++; console.log('  ❌ 大きい順(draw) ' + r.row + ' ' + o); } }
});
console.log('  ' + LED.rows.length + '図 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 悉皆: ' + LED.rows.length + '図 × seed1..100(markers乱択・順保存・間隔≥2小目盛) ===');
LED.rows.forEach(r => {
  const g0 = FB._geom.number_line(r.fp), n = g0.nMinor, m = r.fp.markers.length;
  for (let s = 1; s <= 100; s++) {
    const R = rng(s * 7919 + r.row.length); let ks;
    for (let tries = 0; tries < 200; tries++) { ks = []; for (let i = 0; i < m; i++) ks.push(Math.floor(R() * (n + 1))); const srt = ks.slice().sort((a, b) => a - b); if (srt.every((k, i) => i === 0 || k - srt[i - 1] >= 2)) break; ks = null; }
    if (!ks) continue;
    // 記号の並び順保存: anchorの値順位をそのまま乱択値の順位に写す
    const rank = r.fp.markers.map((mk, i) => i).sort((i, j) => r.fp.markers[i].value - r.fp.markers[j].value); const srt = ks.slice().sort((a, b) => a - b);
    const fp = JSON.parse(JSON.stringify(r.fp)); rank.forEach((idx, pos) => { fp.markers[idx].value = Number((g0.min + srt[pos] * g0.minor).toFixed(9)); });
    check(r.row, fp, s);
  }
});
console.log('  ' + cases + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (3) 契約: 範囲外marker・目盛上にないmarker・刻み不整合は例外 ===');
[{ min: 0, max: 10, major: 5, minor: 1, markers: [{ label: 'ア', value: 11 }] }, { min: 0, max: 10, major: 5, minor: 1, markers: [{ label: 'ア', value: 2.5 }] }, { min: 0, max: 10, major: 5, minor: 3, markers: [] }].forEach(fp => { cases++; let threw = false; try { FB.build(Object.assign({ kind: 'number_line', system: 'int' }, fp)); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約違反が通過 ' + JSON.stringify(fp)); } });
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'number_line_vectors: GREEN ✅(' + cases + '構成)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
