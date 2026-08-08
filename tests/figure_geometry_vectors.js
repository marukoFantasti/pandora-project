// C層kind 幾何ベクター検収（受け入れテスト a）。
// figure_builder.js の幾何関数(FB._geom)を geometry_test_vectors.json の
// 固定パラメータ→期待座標に照合し、各数値が ±0.5px 一致することを確認する。
// 幾何は fig_geometry_reference.py が「正」。ベクターは値域外パラメータを含みうるが、
// 幾何関数の等価性検査としては有効（実装差の検出が目的）。
//
// 実行:  node tests/figure_geometry_vectors.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const vec = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', 'handoff_g05', 'geometry_test_vectors.json'), 'utf-8'));
const G = FB._geom;

let total = 0, bad = 0, kinds = 0;
function near(a, b) { return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 0.5; }
function walk(exp, got, ctx) {
  if (Array.isArray(exp)) { exp.forEach(function (e, i) { walk(e, got && got[i], ctx + '[' + i + ']'); }); return; }
  if (exp && typeof exp === 'object') { for (const k in exp) walk(exp[k], got && got[k], ctx + '.' + k); return; }
  if (typeof exp === 'number') { total++; if (!near(exp, got)) { bad++; if (bad <= 15) console.log('  MISMATCH', ctx, 'exp', exp, 'got', got); } }
}
for (const kind in vec) {
  if (kind === 'comment') continue;
  if (typeof G[kind] !== 'function') { console.error('ERROR: 幾何関数なし', kind); process.exit(2); }
  kinds++;
  vec[kind].forEach(function (c, ci) { walk(c.expect, G[kind].apply(null, c.params), kind + '#' + ci + '(' + c.params + ')'); });
}
console.log('幾何ベクター: ' + kinds + ' kind / ' + total + ' 数値 / 不一致 ' + bad + (bad === 0 ? '  全一致(±0.5px) ✅' : '  ❌'));
process.exit(bad === 0 ? 0 : 1);
