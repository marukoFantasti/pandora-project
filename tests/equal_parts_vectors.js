// equal_parts_vectors.js — 等分図便(裁可o) Kind: equal_parts の関門(設計書§5)。行台帳13図(anchor)+悉皆(3図型×den2..12×num0..den×mode)で、
// 出力SVGから独立再計算: 扇形角=360/den(切れ目線の角度差)・テープ幅=W/den(縦線x)・格子=W/den2×H/den(線位置)・塗り個数=num(num×num2)・
// 塗り面積比=num/den(誤差0)・塗りの連続性(左詰め/12時から時計回り/左下ブロック)・ラベル帰属・等スケール・決定性。
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'equal_parts_rows.json'), 'utf-8'));
let bad = 0, cases = 0, fails = 0;
const EPS = 1e-6;   // 角度の許容は0.01°(SVG座標が小数2桁丸めのため)
function lines(svg) { return [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)].map(m => m.slice(1, 5).map(Number)); }
function norm(a) { a = ((a % 360) + 360) % 360; return a; }
function check(row, fp, tag) {
  cases++; let a, svg; try { a = FB._equalPartsAudit(fp); svg = FB.build(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + row + ' ' + e.message.slice(0, 70)); return; }
  const g = a.geom, den = Number(fp.den), num = Number(fp.num || 0), read = fp.mode !== 'draw';
  if (a.issues.length) { bad++; if (fails++ < 3) console.log('  ❌ issues ' + row + ' ' + a.issues); }
  a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ 帰属 ' + row + ' ' + l.text + '→' + l.nearest); } });
  if (svg !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + row); }
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/), wh = svg.match(/width="([-\d.]+)" height="([-\d.]+)"/);
  if (!vb || !wh || Math.abs(Number(vb[3]) / Number(vb[4]) - Number(wh[1]) / Number(wh[2])) > 0.02) { bad++; if (fails++ < 3) console.log('  ❌ 等スケール ' + row); }
  if (fp.shape === 'circle') {
    const cuts = lines(svg).filter(l => Math.abs(l[0]) < EPS && Math.abs(l[1]) < EPS).map(l => norm(Math.atan2(-l[3], l[2]) * 180 / Math.PI)).sort((x, y) => norm(90 - x) - norm(90 - y));   // 12時から時計回りの順
    if (cuts.length !== den) { bad++; if (fails++ < 3) console.log('  ❌ 切れ目本数 ' + row + ' ' + cuts.length); }
    if (Math.abs(cuts[0] - 90) > 0.01) { bad++; if (fails++ < 3) console.log('  ❌ 12時起点 ' + row + ' ' + cuts[0]); }
    for (let i = 1; i < cuts.length; i++) if (Math.abs(norm(cuts[i - 1] - cuts[i]) - 360 / den) > 0.01) { bad++; if (fails++ < 3) console.log('  ❌ 扇形角 ' + row + ' ' + (cuts[i - 1] - cuts[i])); break; }
    const secs = [...svg.matchAll(/<path d="M 0 0 L ([-\d.]+) ([-\d.]+) A [\d.]+ [\d.]+ 0 \d 1 ([-\d.]+) ([-\d.]+) Z"/g)].map(m => [norm(Math.atan2(-Number(m[2]), Number(m[1])) * 180 / Math.PI), norm(Math.atan2(-Number(m[4]), Number(m[3])) * 180 / Math.PI)]);
    const want = read ? num : 0; if (secs.length !== want) { bad++; if (fails++ < 3) console.log('  ❌ 塗り扇形数 ' + row + ' ' + secs.length + ' vs ' + want); }
    secs.forEach((sc, k) => { const a0 = norm(90 - 360 * k / den), a1 = norm(90 - 360 * (k + 1) / den); if (Math.min(norm(sc[0] - a0), 360 - norm(sc[0] - a0)) > 0.01 || Math.min(norm(sc[1] - a1), 360 - norm(sc[1] - a1)) > 0.01) { bad++; if (fails++ < 3) console.log('  ❌ 時計回り連続 ' + row + ' k=' + k); } });
    if (Math.abs(g.fill_ratio - (read ? num / den : 0)) > EPS) { bad++; console.log('  ❌ 面積比 ' + row); }
  } else {
    const W = g.W, H = g.H, cols = fp.shape === 'tape' ? den : g.cols, rows = fp.shape === 'tape' ? 1 : g.rows;
    const vx = lines(svg).filter(l => Math.abs(l[0] - l[2]) < EPS && Math.abs(l[1]) < EPS && Math.abs(l[3] - H) < EPS).map(l => l[0]).sort((x, y) => x - y);
    const hy = lines(svg).filter(l => Math.abs(l[1] - l[3]) < EPS && Math.abs(l[0]) < EPS && Math.abs(l[2] - W) < EPS).map(l => l[1]).sort((x, y) => x - y);
    if (vx.length !== cols - 1 || vx.some((x, i) => Math.abs(x - W * (i + 1) / cols) > 0.01)) { bad++; if (fails++ < 3) console.log('  ❌ 縦線位置 ' + row + ' ' + JSON.stringify(vx)); }
    if (hy.length !== rows - 1 || hy.some((y, i) => Math.abs(y - H * (i + 1) / rows) > 0.01)) { bad++; if (fails++ < 3) console.log('  ❌ 横線位置 ' + row + ' ' + JSON.stringify(hy)); }
    const rects = [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)" fill="#cfe0fb"/g)].map(m => m.slice(1, 5).map(Number));
    const num2 = fp.den2 != null ? Number(fp.num2 == null ? (num > 0 ? 1 : 0) : fp.num2) : 1;
    const want = read ? (fp.den2 != null ? num * num2 : num) : 0;
    if (rects.length !== want) { bad++; if (fails++ < 3) console.log('  ❌ 塗ります数 ' + row + ' ' + rects.length + ' vs ' + want); }
    rects.forEach(r => { const c = Math.round(r[0] / (W / cols)), rr = Math.round((H - r[1] - r[3]) / (H / rows)); const inBlock = fp.den2 != null ? (rr < num && c < num2) : (c < num); if (!inBlock || Math.abs(r[2] - W / cols) > 0.02 || Math.abs(r[3] - H / rows) > 0.02) { bad++; if (fails++ < 3) console.log('  ❌ 塗りブロック ' + row + ' ' + JSON.stringify(r)); } });
    const area = rects.reduce((s, r) => s + r[2] * r[3], 0) / (W * H), wantRatio = read ? (fp.den2 != null ? num * num2 / (den * Number(fp.den2)) : num / den) : 0;
    if (Math.abs(area - wantRatio) > 1e-3 || Math.abs(g.fill_ratio - (fp.col_unit ? num * num2 / den : wantRatio)) > EPS) { bad++; if (fails++ < 3) console.log('  ❌ 面積比 ' + row + ' ' + area + ' vs ' + wantRatio); }
    if (fp.col_unit && Math.abs(g.fill_ratio - num * num2 / den) > EPS) { bad++; console.log('  ❌ col_unit面積 ' + row); }
  }
}
console.log('=== (1) 行台帳 ' + LED.rows.length + '図(anchor・面積比=転記) ===');
LED.rows.forEach(r => { check(r.row, r.fp); if (r.ratio) { const g = FB._geom.equal_parts(r.fp); if (Math.abs(g.fill_ratio - r.ratio[0] / r.ratio[1]) > EPS) { bad++; console.log('  ❌ 台帳比 ' + r.row + ' ' + g.fill_ratio); } } });
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 悉皆: circle/tape/rect × den2..12 × num0..den × read/draw + rect2方向 den,den2∈2..6 ===');
for (const shape of ['circle', 'tape', 'rect']) for (let den = 2; den <= 12; den++) for (let num = 0; num <= den; num++) for (const mode of ['read', 'draw']) check(shape + den + '/' + num + mode, { kind: 'equal_parts', shape, den, num, mode, unit_label: shape === 'circle' ? undefined : '1m' });
for (let den = 2; den <= 6; den++) for (let den2 = 2; den2 <= 6; den2++) for (let num = 1; num <= den; num++) for (let num2 = 1; num2 <= den2; num2++) check('rect2way' + den + 'x' + den2 + '/' + num + 'x' + num2, { kind: 'equal_parts', shape: 'rect', den, num, den2, num2, mode: 'read', unit_label: '1m²' });
console.log('  ' + cases + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2b) バンク配線(g02 2+g03 1+g06 4): 生成器経由(seed決定化)の図が関門条件を満たし、塗り面積比=答の分数・作図型は答に{den}等分{num}こ分 ===');
(function () {
  const P = require(path.join(__dirname, '..', 'pattern_bank', 'pattern_generator.js'));
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  for (const [g, ids] of [['g02', ['g02_tobun_nuri_01', 'g02_tobun_yomi_01']], ['g03', ['g03_tobun_draw_01']], ['g06', ['g06_frac_x_int_word_01', 'g06_frac_div_int_word_01', 'g06_frac_x_frac_word_01', 'g06_frac_div_frac_word_01']]]) {
    const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pattern_bank', 'patterns_' + g + '.json'), 'utf-8'));
    for (const id of ids) {
      const p = bank.patterns.find(x => x.pattern_id === id); if (!p) { bad++; console.log('  ❌ パターン不在 ' + id); continue; }
      for (let s = 1; s <= 120; s++) {
        const orig = Math.random; Math.random = rng(s * 7919 + id.length); let r; try { r = P.makeProblem(p, null, bank.shared_lexicon); } catch (e) { Math.random = orig; bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + id + ' seed' + s + ' ' + e.message.slice(0, 80)); continue; } finally { Math.random = orig; }
        const b0 = bad; check(id + ' seed' + s, r.figure); const g0 = FB._geom.equal_parts(r.figure), e = r.env, ans = String(r.answer);
        if (id === 'g02_tobun_nuri_01' || id === 'g03_tobun_draw_01') { if (ans.indexOf(e.den1 + '等分した' + e.num1 + 'こ分') < 0 || r.figure.mode !== 'draw') { bad++; if (fails++ < 3) console.log('  ❌ 列挙≠den/num ' + id + ' ' + ans); } }
        else if (id === 'g02_tobun_yomi_01') { if (ans !== '答え ' + e.num1 + '/' + e.den1 || Math.abs(g0.fill_ratio - e.num1 / e.den1) > 1e-9 || gcd(e.num1, e.den1) !== 1) { bad++; if (fails++ < 3) console.log('  ❌ 読み取り答 ' + id + ' ' + ans); } }
        else { const want = id === 'g06_frac_x_int_word_01' ? e.a1 * e.k1 / e.b1 : id === 'g06_frac_div_int_word_01' ? e.a1 / (e.b1 * e.k1) : id === 'g06_frac_x_frac_word_01' ? e.a1 * e.c1 / (e.b1 * e.d1) : e.a1 * e.c1 / (e.b1 * e.d1);
          if (Math.abs(g0.fill_ratio - want) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ 面積比≠答 ' + id + ' ' + g0.fill_ratio + ' vs ' + want); }
          if (id !== 'g06_frac_div_frac_word_01' && Math.abs(want - e.ans / (id === 'g06_frac_x_int_word_01' ? e.b1 : id === 'g06_frac_div_int_word_01' ? e.b1 * e.k1 : e.b1 * e.d1)) > 1e-9) { bad++; if (fails++ < 3) console.log('  ❌ 答≠面積比 ' + id); } }
        if (bad > b0) console.log('     再現情報: ' + id + ' seed=' + s + ' figure=' + JSON.stringify(r.figure));
        if (r.kaisetsu.indexOf('{') >= 0) { bad++; console.log('  ❌ 解説未解決 ' + id); }
      }
    }
  }
  console.log('  ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('=== (3) 契約: 未知shape・den<2・num>den・circleにden2 は例外 ===');
[{ shape: 'tri', den: 3, num: 1 }, { shape: 'circle', den: 1, num: 0 }, { shape: 'tape', den: 4, num: 5 }, { shape: 'circle', den: 4, num: 1, den2: 2 }].forEach(fp => { cases++; let threw = false; try { FB.build(Object.assign({ kind: 'equal_parts' }, fp)); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約違反が通過 ' + JSON.stringify(fp)); } });
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'equal_parts_vectors: GREEN ✅(' + cases + '構成)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
