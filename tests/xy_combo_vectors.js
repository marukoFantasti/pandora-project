// xy_combo_vectors.js — line_bar_combo(裁可e) xy_graph mode=combo の関門。出力SVGから独立再計算: 右軸=1-2-5自動刻み(hi2=max切り上げ・目盛≦10本)・
// 棒の高さpx=値の線形写像(右軸)・折れ線の点px=値の線形写像(左軸)・極値の一意性(折れ線max/min・棒max)・棒minの同値月集合・等スケール・決定性。
// anchor(転記答: 8月29度/1月15度/7月250mm/3・11・12月10mm)+悉皆(seed付き合成系列)+(2b)バンク配線(あれば)。
'use strict';
require('./_seeded').install();   // 台帳原則: 関門内の乱択はseed付き(corr-0042)
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'xy_combo_rows.json'), 'utf-8'));
let bad = 0, cases = 0, fails = 0;
const PL_W = 264, PL_H = 190;
function nice(span) { const c = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]; for (const v of c) if (span / v <= 10) return v; return 5000; }
function check(row, fp, wantAns) {
  cases++; let a, svg; try { a = FB._xyComboAudit(fp); svg = FB.build(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + row + ' ' + e.message.slice(0, 80)); return null; }
  const g = a.geom, by = fp.bars[0].y.map(Number), ly = fp.series[0].y.map(Number), n = ly.length;
  const mx = Math.max(...by), t2 = nice(mx), hi2 = Math.ceil(mx / t2) * t2;
  if (g.tick2 !== t2 || g.hi2 !== hi2 || hi2 / t2 > 10 || ![1, 2, 5].includes(t2 / Math.pow(10, Math.floor(Math.log10(t2))))) { bad++; if (fails++ < 3) console.log('  ❌ 右軸刻み ' + row + ' ' + g.tick2 + '/' + g.hi2); }
  const rects = [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)" fill="#cfe0fb" stroke="#1a56c4" stroke-width="1"\/>/g)].map(m => m.slice(1, 5).map(Number));
  if (rects.length !== n) { bad++; if (fails++ < 3) console.log('  ❌ 棒本数 ' + row + ' ' + rects.length); }
  rects.forEach((r, i) => { const wantH = by[i] / hi2 * PL_H, cx = (i + 0.5) * PL_W / n; if (Math.abs(r[3] - wantH) > 0.02 || Math.abs(r[0] + r[2] / 2 - cx) > 0.02 || Math.abs(r[1] + r[3] - PL_H) > 0.02) { bad++; if (fails++ < 3) console.log('  ❌ 棒px ' + row + ' i=' + i); } });
  const pl = svg.match(/<polyline points="([^"]+)" fill="none" stroke="#C0392B"/); const pts = pl ? pl[1].split(' ').map(p => p.split(',').map(Number)) : [];
  if (pts.length !== n) { bad++; if (fails++ < 3) console.log('  ❌ 折れ線点数 ' + row); }
  pts.forEach((p, i) => { const wy = PL_H - (ly[i] - g.lo) / (g.hi - g.lo) * PL_H, wx = (i + 0.5) * PL_W / n; if (Math.abs(p[1] - wy) > 0.06 || Math.abs(p[0] - wx) > 0.06) { bad++; if (fails++ < 3) console.log('  ❌ 折れ線px ' + row + ' i=' + i); } });
  if (!(a.unique.line_max && a.unique.line_min && a.unique.bar_max)) { bad++; if (fails++ < 3) console.log('  ❌ 極値非一意 ' + row + ' ' + JSON.stringify(a.unique)); }
  if (wantAns) {
    const W = wantAns; if (a.line_max !== W.line_max[0] || ly[a.line_max] !== W.line_max[1] || a.line_min !== W.line_min[0] || ly[a.line_min] !== W.line_min[1] || a.bar_max !== W.bar_max[0] || by[a.bar_max] !== W.bar_max[1] || JSON.stringify(a.bar_mins) !== JSON.stringify(W.bar_mins[0]) || by[a.bar_mins[0]] !== W.bar_mins[1]) { bad++; console.log('  ❌ 極値≠転記答 ' + row + ' ' + JSON.stringify([a.line_max, a.line_min, a.bar_max, a.bar_mins])); }
  }
  if (svg !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + row); }
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/), wh = svg.match(/width="([-\d.]+)" height="([-\d.]+)"/);
  if (!vb || !wh || Math.abs(Number(vb[3]) / Number(vb[4]) - Number(wh[1]) / Number(wh[2])) > 0.02) { bad++; if (fails++ < 3) console.log('  ❌ 等スケール ' + row); }
  return a;
}
console.log('=== (1) anchor: 転記の極値4点 ===');
LED.rows.forEach(r => check(r.row, r.fp, r.ans)); console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 悉皆: 合成系列 seed1..300(極値4点固定・他月乱択・右軸最大値を 60〜2400 で振って1-2-5刻みを網羅) ===');
const base = LED.rows[0].fp;
for (let s = 1; s <= 300; s++) {
  const fp = JSON.parse(JSON.stringify(base)); const scale = [1, 2, 4, 10, 0.25, 0.5][s % 6];
  const ly = fp.series[0].y, by = fp.bars[0].y;
  [2, 4, 8, 10].forEach(i => { ly[i] = ly[i] + Math.floor(Math.random() * 3) - 1; });                  // 3/5/9/11月±1(極値月は固定)
  [1, 3, 4, 5, 7, 8, 9].forEach(i => { by[i] = Math.round((by[i] + Math.floor(Math.random() * 41) - 20) * scale); }); // 非極値月±20→scale
  [0, 2, 6, 10, 11].forEach(i => { by[i] = Math.round(by[i] * scale); });
  const mn = Math.min(...by.filter((_, i) => ![2, 10, 11].includes(i))), mx = Math.max(...by.filter((_, i) => i !== 6));
  if (!(by[6] > mx && by[2] < mn)) continue;   // 合成が極値条件を満たす構成のみ(パターン側は制約で保証)
  check('synth seed' + s, fp, { line_max: [7, ly[7]], line_min: [0, ly[0]], bar_max: [6, by[6]], bar_mins: [[2, 10, 11], by[2]] });
}
console.log('  ' + cases + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2b) バンク配線(g04 line_bar): 生成器経由(seed決定化)で極値=答の文字列 ===');
(function () {
  const P = require(path.join(__dirname, '..', 'pattern_bank', 'pattern_generator.js'));
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pattern_bank', 'patterns_g04.json'), 'utf-8'));
  const p = bank.patterns.find(x => x.pattern_id === 'g04_line_bar_kion_01'); if (!p) { console.log('  (未配線=スキップ)'); return; }
  const { mulberry32 } = require('./_seeded');
  for (let s = 1; s <= 200; s++) {
    const orig = Math.random; Math.random = mulberry32(s * 7919); let r; try { r = P.makeProblem(p, null, bank.shared_lexicon); } catch (e) { Math.random = orig; bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 seed' + s + ' ' + e.message.slice(0, 80)); continue; } finally { Math.random = orig; }
    const b0 = bad, a = check('bank seed' + s, r.figure); if (!a) continue;
    const ly = r.figure.series[0].y.map(Number), by = r.figure.bars[0].y.map(Number), xl = r.figure.x_labels, ans = String(r.answer);
    const want = ['(1) ' + xl[a.line_max] + '、' + ly[a.line_max] + '度', '(2) ' + xl[a.line_min] + '、' + ly[a.line_min] + '度', '(3) ' + xl[a.bar_max] + '、' + by[a.bar_max] + 'mm', '(4) ' + a.bar_mins.map(i => xl[i]).join('と') + '、' + by[a.bar_mins[0]] + 'mm'];
    want.forEach(w => { if (ans.indexOf(w) < 0) { bad++; if (fails++ < 3) console.log('  ❌ 答≠極値 seed' + s + ' ' + w + ' / ' + ans); } });
    if (bad > b0) console.log('     再現情報: seed=' + s + ' series=' + JSON.stringify(ly) + ' bars=' + JSON.stringify(by));
  }
  console.log('  ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('=== (3) 契約: 系列数≠1・長さ不一致・棒max≦0・負の棒 は例外 ===');
[{ series: [], bars: [{ y: [1, 2] }], x_labels: ['a', 'b'] }, { series: [{ y: [1, 2, 3] }], bars: [{ y: [1, 2] }], x_labels: ['a', 'b'] }, { series: [{ y: [1, 2] }], bars: [{ y: [0, 0] }], x_labels: ['a', 'b'] }, { series: [{ y: [1, 2] }], bars: [{ y: [-1, 2] }], x_labels: ['a', 'b'] }].forEach(fp => { cases++; let threw = false; try { FB.build(Object.assign({ kind: 'xy_graph', mode: 'combo' }, fp)); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約違反が通過 ' + JSON.stringify(fp)); } });
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'xy_combo_vectors: GREEN ✅(' + cases + '構成)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
