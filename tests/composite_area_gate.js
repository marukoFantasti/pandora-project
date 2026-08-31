// composite_area_gate.js — P5-3 §2.4 検算ゲート(新設・必須)。
// (1) 正規化fixture(c10_u02かぎ型行): 外形面積−Σ(切欠き面積) == answer由来の期待面積値 を全verify行でassert。
//     1件でも不一致なら関門RED。struct_only/skip行は件数報告のみ(検算対象外マーク)。
// (2) バンク悉皆: 全patterns_g*.jsonのcomposite_area図パターンについて、生成標本の答え(答えマーカー以降の
//     数値)と図パラメータ由来面積の一致をassert(将来の配線行を自動監視。現0件でも走る)。
//
// 実行:  node tests/composite_area_gate.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
let bad = 0;

console.log('=== (1) fixture検算(外形−Σ切欠き == 期待面積) ===');
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'composite_area_p53_rows.json'), 'utf-8'));
let nv = 0, ns = 0, nk = 0;
for (const row of fx.rows) {
  if (row.skip) { nk++; continue; }
  if (!row.verify) { ns++; continue; }
  nv++;
  const g = FB._geom.composite_area(row.fp);
  if (g.area !== row.expected_area) { bad++; console.log('  ❌ ' + row.id + ': 図面積' + g.area + ' ≠ 期待' + row.expected_area); }
  const svg = FB.build(row.fp);
  if (!svg || svg.indexOf('undefined') >= 0) { bad++; console.log('  ❌ ' + row.id + ': レンダ不正'); }
}
console.log('  検算対象 ' + nv + '行 / 構造のみ(検算対象外) ' + ns + ' / skip ' + nk + ' ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (2) バンク悉皆(composite_area図パターンの答え照合・各20標本) ===');
const files = fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(f => /^patterns_(g\d\d|jhs_c\d\d)\.json$/.test(f)).sort();
let npat = 0;
const NUM = /\d+(?:\.\d+)?/g;
for (const f of files) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', f), 'utf-8'));
  for (const p of bank.patterns) {
    const fp0 = p.figure_params || {};
    if (fp0.kind !== 'composite_area' && fp0.type !== 'composite_area') continue;
    npat++;
    for (let k = 0; k < 20; k++) {
      let r;
      try { r = P.makeProblem(p, null, bank.shared_lexicon || {}); } catch (e) { bad++; console.log('  ❌ ' + p.pattern_id + ' 生成失敗: ' + e.message); break; }
      // 図パラメータをenvで解決した実引数から面積を導出
      const fpr = JSON.parse(JSON.stringify(fp0).replace(/"\{(\w+)\}"/g, (m, k2) => JSON.stringify(r.env[k2])));
      let g;
      try { g = FB._geom.composite_area(fpr); } catch (e) { bad++; console.log('  ❌ ' + p.pattern_id + ' 図契約: ' + e.message); break; }
      const tail = String(r.answer).split(/答え|こたえ/).pop();
      const nums = (tail.match(NUM) || []).map(Number);
      if (!nums.includes(g.area)) { bad++; console.log('  ❌ ' + p.pattern_id + ': 図面積' + g.area + ' が答えに無い(' + tail.trim().slice(0, 30) + ')'); break; }
    }
  }
}
console.log('  対象パターン ' + npat + '件 ' + (bad === 0 ? '✅' : '❌'));

console.log('\n' + (bad === 0 ? 'composite_area検算ゲート: GREEN ✅(fixture ' + nv + '検算 + バンク' + npat + 'パターン)' : '❌ ' + bad + '件 → 関門RED'));
process.exit(bad === 0 ? 0 : 1);
