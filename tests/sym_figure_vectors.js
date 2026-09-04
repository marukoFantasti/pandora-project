// sym_figure_vectors.js — 対称第1便 Kind: sym_figure の関門(設計書§1.5・corr-0030原則=描画と同じ幾何から独立再計算)。
// (1) 悉皆: 行台帳(fixtures/sym_figure_rows.json)の図形構造(sym,n,k,regular,grid)×seed1..100 → 幾何ガード(対称性・単純多角形・辺方向0/45/90・
//     内角{90,135,270}・格子域・最小サイズ)を独立再計算、写像 i→(k−i)/(i+n/2) を転記ペア(x→ans)と照合、ラベル帰属、決定性
// (2) 契約throw(n不足・labels不一致・点対称n奇数・anchor違反)
// 実行:  node tests/sym_figure_vectors.js
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sym_figure_rows.json'), 'utf-8'));
const L = 'ABCDEFGHIJKLMN';
let bad = 0, cases = 0, fails = 0;
function mod(a, n) { return ((a % n) + n) % n; }
function mapIdx(n, sym, k, i) { return sym === 'point' ? mod(i + n / 2, n) : mod(k - i, n); }
function orient(a, b, c) { return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])); }
function onSeg(a, b, p) { return orient(a, b, p) === 0 && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]); }
function touch(a, b, c, d) { const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b); if (o1 !== o2 && o3 !== o4 && o1 && o2 && o3 && o4) return true; return onSeg(a, b, c) || onSeg(a, b, d) || onSeg(c, d, a) || onSeg(c, d, b); }
function interior(V) { const n = V.length; let area = 0; for (let i = 0; i < n; i++) { const p = V[i], q = V[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; } const ccw = area > 0; return V.map((c, i) => { const p = V[(i - 1 + n) % n], q = V[(i + 1) % n]; let ang = (Math.atan2(q[1] - c[1], q[0] - c[0]) - Math.atan2(p[1] - c[1], p[0] - c[0])) * 180 / Math.PI; ang = ((ang % 360) + 360) % 360; return Math.round((ccw ? 360 - ang : ang) * 1000) / 1000; }); }
// 構造ごとに1回(同一図形共有行=grp)
const structs = {};
LED.rows.forEach(r => { const key = [r.sym, r.n, r.k, !!r.regular, !!r.grid].join('|'); (structs[key] = structs[key] || { r: r, rows: [] }).rows.push(r); });
console.log('=== (1) 悉皆: ' + Object.keys(structs).length + '構造 × seed1..100(正多角形は固定) ===');
Object.values(structs).forEach(({ r, rows }) => {
  const seeds = r.regular ? [1] : Array.from({ length: 100 }, (_, i) => i + 1);
  for (const s of seeds) {
    cases++;
    const fp = { kind: 'sym_figure', sym: r.sym, n: r.n, k: r.k, labels: L.slice(0, r.n).split(''), grid: !!r.grid, regular: !!r.regular, seed: s };
    let a; try { a = FB._symFigureAudit(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + r.grp + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
    if (a.issues.length) { bad++; if (fails++ < 3) console.log('  ❌ issues ' + r.grp + ' seed' + s + ' ' + a.issues.slice(0, 3)); }
    a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ 帰属 ' + r.grp + ' seed' + s + ' ' + l.own + '→' + l.nearest); } });
    const V = a.V, n = r.n;
    // 独立再計算: 対称性(厳密/正多角形は1e-6)・辺方向・内角・単純・サイズ
    for (let i = 0; i < n; i++) {
      const j = mapIdx(n, r.sym, r.k, i), im = r.sym === 'point' ? [-V[i][0], -V[i][1]] : [-V[i][0], V[i][1]];
      if (Math.hypot(V[j][0] - im[0], V[j][1] - im[1]) > (r.regular ? 1e-6 : 0)) { bad++; if (fails++ < 3) console.log('  ❌ 対称性 ' + r.grp + ' seed' + s + ' i=' + i); }
      if (!r.regular) {
        const q = V[(i + 1) % n], dx = q[0] - V[i][0], dy = q[1] - V[i][1];
        if (!((dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && (dx || dy))) { bad++; if (fails++ < 3) console.log('  ❌ 辺方向 ' + r.grp + ' seed' + s); }
        if (!Number.isInteger(V[i][0]) || !Number.isInteger(V[i][1]) || Math.abs(V[i][0]) > 6 || Math.abs(V[i][1]) > 6) { bad++; if (fails++ < 3) console.log('  ❌ 格子域 ' + r.grp + ' seed' + s); }
      }
    }
    if (!r.regular) {
      interior(V).forEach((ang, i) => { if (![90, 135, 270].includes(ang)) { bad++; if (fails++ < 3) console.log('  ❌ 内角 ' + r.grp + ' seed' + s + ' v' + i + '=' + ang); } });
      for (let e1 = 0; e1 < n; e1++) for (let e2 = e1 + 1; e2 < n; e2++) { if (e2 === e1 + 1 || (e1 === 0 && e2 === n - 1)) continue; if (touch(V[e1], V[(e1 + 1) % n], V[e2], V[(e2 + 1) % n])) { bad++; if (fails++ < 3) console.log('  ❌ 自己交差 ' + r.grp + ' seed' + s); } }
      const xs = V.map(v => v[0]), ys = V.map(v => v[1]);
      if (Math.max(...xs) - Math.min(...xs) < 4 || Math.max(...ys) - Math.min(...ys) < 4) { bad++; if (fails++ < 3) console.log('  ❌ 最小サイズ ' + r.grp + ' seed' + s); }
    }
    // 写像と転記ペア: 行群の全行で x→ans を独立式で照合(辺は両端の集合)
    rows.forEach(row => {
      if (!row.x || ['perp', 'len_diff', 'len', 'cut', 'perp_len'].includes(row.ask)) return;
      const M = c => L[mapIdx(n, r.sym, r.k, L.indexOf(c))];
      if (row.ask === 'hen') { const got = row.x.split('').map(M).sort().join(''), want = row.ans.split('').sort().join(''); if (got !== want) { bad++; console.log('  ❌ 写像(辺) ' + row.row + ' ' + row.x + '→' + got + ' 転記' + row.ans); } }
      else { const got = M(row.x); if (got !== row.ans) { bad++; console.log('  ❌ 写像 ' + row.row + ' ' + row.x + '→' + got + ' 転記' + row.ans); } }
      if (a.map[row.x[0]] !== M(row.x[0])) { bad++; console.log('  ❌ audit.map不一致 ' + row.row); }
    });
    // 軸との関係(perp): 対応点を結ぶ直線は軸に垂直(=y座標一致) / 長さ: 対応点間距離は中心を通る
    rows.forEach(row => {
      if (row.ask === 'perp' && !r.regular) { const i1 = L.indexOf(row.x[0]), i2 = L.indexOf(row.x[1]); if (mapIdx(n, 'line', r.k, i1) !== i2 || V[i1][1] !== V[i2][1]) { bad++; console.log('  ❌ 垂直関係 ' + row.row); } }
      if (row.ask === 'len' && r.sym === 'point') { const i1 = L.indexOf(row.x[0]), i2 = L.indexOf(row.x[1]); if (mapIdx(n, 'point', 0, i1) !== i2 || V[i1][0] + V[i2][0] !== 0 || V[i1][1] + V[i2][1] !== 0) { bad++; console.log('  ❌ 中心対称距離 ' + row.row); } }
    });
    if (FB.build(fp) !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + r.grp + ' seed' + s); }
  }
});
console.log('  ' + cases + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (1b) バンク配線(g06 sym_figure 13パターン): 行レコードの写像=答・anchor行の数値答=座標×1目盛cm ===');
(function () {
  const P = require(path.join(__dirname, '..', 'pattern_bank', 'pattern_generator.js'));
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pattern_bank', 'patterns_g06.json'), 'utf-8'));
  let nrow = 0, nanchor = 0;
  Object.keys(bank.shared_lexicon).filter(k => /^symrows_/.test(k)).forEach(k => {
    bank.shared_lexicon[k].forEach(rec => {
      nrow++; cases++;
      const fp = { kind: 'sym_figure', sym: rec.sy, n: rec.n, k: rec.k, labels: rec.lb, grid: rec.gr, regular: rec.rg, vertices: rec.vt, extra_points: rec.ex, half: rec.hf, seed: 7 };
      let a; try { a = FB._symFigureAudit(fp); } catch (e) { bad++; console.log('  ❌ ' + rec.row + ' 生成失敗 ' + e.message.slice(0, 60)); return; }
      if (a.issues.length || a.labels.some(l => !l.ok)) { bad++; console.log('  ❌ ' + rec.row + ' issues/帰属 ' + a.issues.slice(0, 2)); }
      const M = c => a.map[c];
      if (rec.y !== undefined && rec.x && rec.x.length === 1 && M(rec.x) !== rec.y) { bad++; console.log('  ❌ ' + rec.row + ' 写像 ' + rec.x + '→' + M(rec.x) + ' 転記' + rec.y); }
      if (rec.e !== undefined && rec.x.split('').map(M).sort().join('') !== rec.e) { bad++; console.log('  ❌ ' + rec.row + ' 辺写像 ' + rec.x + '→' + rec.x.split('').map(M).join('') + ' 転記' + rec.e); }
      if (rec.a && /^直線O([A-N])$/.test(rec.a)) { const q = rec.q.match(/直線O([A-N])/); if (q && M(q[1]) !== rec.a.slice(-1)) { bad++; console.log('  ❌ ' + rec.row + ' 直線O対応 ' + q[1] + '→' + M(q[1])); } }
      if (rec.a && /^角([A-N])$/.test(rec.a)) { const q = rec.q.match(/角([A-N])と/); if (q && M(q[1]) !== rec.a.slice(-1)) { bad++; console.log('  ❌ ' + rec.row + ' 等しい角 ' + q[1] + '→' + M(q[1])); } }
      if (rec.vt) {   // anchor固定: 数値答を座標から再計算
        nanchor++;
        const cell = rec.cc || 1, d = (p1, p2) => a.dist(p1, p2) * cell;
        if (rec.d !== undefined && /直線([A-N])([A-N])と直線([A-N])([A-N])/.test(rec.q)) { const m = rec.q.match(/直線([A-N])([A-N])と直線([A-N])([A-N])/); const l1 = d(m[1], m[2]), l2 = d(m[3], m[4]); const longer = l2 > l1 ? m[3] + m[4] : m[1] + m[2]; if (Math.abs(l2 - l1) !== rec.d || rec.a.indexOf('直線' + longer) < 0) { bad++; console.log('  ❌ ' + rec.row + ' 長さ差 ' + l1 + '/' + l2 + ' 転記' + rec.a); } }
        else if (rec.d !== undefined && /直線([A-N])([A-N])の長さ/.test(rec.q)) { const m = rec.q.match(/直線([A-N])([A-N])の長さ/); if (d(m[1], m[2]) !== rec.d) { bad++; console.log('  ❌ ' + rec.row + ' 長さ ' + d(m[1], m[2]) + ' 転記' + rec.d); } }
        if (rec.a === '垂直' && /直線([A-N])([A-N])は対称の軸/.test(rec.q)) { const m = rec.q.match(/直線([A-N])([A-N])は/); const i1 = a.labels.length ? null : null; const V = a.V, L = 'ABCDEFGHIJKLMN'; if (V[L.indexOf(m[1])][1] !== V[L.indexOf(m[2])][1]) { bad++; console.log('  ❌ ' + rec.row + ' 軸と垂直でない'); } }
      }
      // 生成器経由(makeProblem)でも figure が同じ写像を持つ
      const pid = 'g06_' + k.replace(/^symrows_/, '') + '_01', pat = bank.patterns.find(x => x.pattern_id === pid);
      if (!pat) { bad++; console.log('  ❌ パターン不在 ' + pid); }
    });
  });
  console.log('  行レコード ' + nrow + '(anchor ' + nanchor + ') ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('=== (2) 契約throw ===');
[[{ kind: 'sym_figure', sym: 'line', n: 2, k: 0, labels: ['A', 'B'] }, 'n不足'], [{ kind: 'sym_figure', sym: 'line', n: 8, k: 0, labels: ['A'] }, 'labels不一致'], [{ kind: 'sym_figure', sym: 'point', n: 9, k: 0, labels: L.slice(0, 9).split('') }, '点対称n奇数'],
 [{ kind: 'sym_figure', sym: 'line', n: 4, k: 0, labels: ['A', 'B', 'C', 'D'], vertices: [[0, 3], [2, 0], [0, -3], [-1, 0]] }, 'anchor非対称']].forEach(([fp, name]) => {
  cases++; let threw = false; try { FB.build(fp); } catch (e) { threw = true; }
  if (!threw) { bad++; console.log('  ❌ 契約: ' + name + ' がthrowしない'); }
});
console.log('  契約4種 ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'sym_figure: 全' + cases + '照合 一致 ✅(悉皆・写像=転記ペア・幾何ガード独立再計算・帰属・決定性・契約)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
