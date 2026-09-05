// shape_set_vectors.js — 対称第2便 Kind: shape_set(小図形散布・判別)の関門(設計書§B.1・corr-0030原則)。
// (0) カタログ全形: 線対称/点対称/軸本数を輪郭座標から独立再計算してカタログ値と一致
// (1) 悉皆: 行台帳(fixtures/shape_set_rows.json)×seed1..100 → 割当の真偽表がカタログと一致・転記の正答集合を再導出・同一行の形の重複なし・
//     族(fam)限定・軸本数要件・ラベル帰属・決定性
// (2) 契約throw(labels不足・満たせない要件・未知の形)
// 実行:  node tests/shape_set_vectors.js
'use strict';
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'shape_set_rows.json'), 'utf-8'));
const CAT = FB._geom.ss_catalog;
let bad = 0, cases = 0, fails = 0;
console.log('=== (0) カタログ ' + Object.keys(CAT).length + '形: 対称性の独立再計算 ===');
Object.keys(CAT).forEach(id => { cases++; const s = FB._geom.ss_symmetry(FB._geom.ss_outline(id)), c = CAT[id]; if (s.line !== c.line || s.point !== c.point || (isFinite(c.axes) && s.axes !== c.axes)) { bad++; console.log('  ❌ ' + id + ' cat=' + [c.line, c.point, c.axes] + ' calc=' + [s.line, s.point, s.axes]); } });
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (1) 悉皆: ' + LED.rows.length + '行 × seed1..100 ===');
LED.rows.forEach(r => {
  for (let s = 1; s <= 100; s++) {
    cases++;
    const fp = { kind: 'shape_set', labels: r.labels, require: r.require, families: r.fam || null, seed: s };
    let a; try { a = FB._shapeSetAudit(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + r.row + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
    if (a.dup) { bad++; if (fails++ < 3) console.log('  ❌ 重複 ' + r.row + ' seed' + s); }
    a.shapes.forEach(x => { if (!x.ok) { bad++; if (fails++ < 3) console.log('  ❌ 真偽表 ' + r.row + ' ' + x.id); } if (r.fam && r.fam.indexOf(CAT[x.id].fam) < 0) { bad++; if (fails++ < 3) console.log('  ❌ 族 ' + r.row + ' ' + x.id); } });
    a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ 帰属 ' + r.row + ' seed' + s + ' ' + l.own); } });
    // 正答集合の再導出(座標から再計算した対称性で)
    const by = {}; a.shapes.forEach(x => { by[x.label] = x; });
    let got;
    if (r.ask === 'line') got = r.labels.filter(l => by[l].calc.line);
    else if (r.ask === 'point') got = r.labels.filter(l => by[l].calc.point);
    else if (r.ask === 'both') got = r.labels.filter(l => by[l].calc.line && by[l].calc.point);
    else if (r.ask === 'axes_min' || r.ask === 'axes_max') {
      if (!r.labels.every(l => by[l].calc.line)) { bad++; if (fails++ < 3) console.log('  ❌ 全線対称でない ' + r.row + ' seed' + s); }
      const ax = r.labels.map(l => by[l].calc.axes), tgt = r.ask === 'axes_min' ? Math.min(...ax) : Math.max(...ax);
      got = r.labels.filter(l => by[l].calc.axes === tgt);
      if (by[r.ans[0]].calc.axes !== r.axes[r.ans[0]]) { bad++; if (fails++ < 3) console.log('  ❌ 軸本数 ' + r.row + ' ' + by[r.ans[0]].calc.axes); }
    }
    if (got.join('') !== r.ans.join('')) { bad++; if (fails++ < 3) console.log('  ❌ 正答集合 ' + r.row + ' seed' + s + ' got=' + got.join('') + ' 転記=' + r.ans.join('')); }
    if (r.axes && r.ask === 'line') Object.keys(r.axes).forEach(l => { if (by[l].calc.axes !== r.axes[l]) { bad++; if (fails++ < 3) console.log('  ❌ 軸本数 ' + r.row + ' ' + l + '=' + by[l].calc.axes); } });
    if (FB.build(fp) !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + r.row + ' seed' + s); }
  }
});
console.log('  ' + (LED.rows.length * 100) + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (2) 契約throw ===');
[[{ kind: 'shape_set', labels: ['ア'] }, 'labels不足'], [{ kind: 'shape_set', labels: ['ア', 'イ'], require: { ア: { line: true, point: false, axes: 99 } } }, '満たせない要件'], [{ kind: 'shape_set', labels: ['ア', 'イ'], shapes: [{ label: 'ア', id: 'nope' }, { label: 'イ', id: 'square' }] }, '未知の形']].forEach(([fp, name]) => {
  cases++; let threw = false; try { FB.build(fp); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約: ' + name); }
});
console.log('  契約3種 ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'shape_set: 全' + cases + '照合 一致 ✅(カタログ再計算・悉皆・正答集合再導出・重複/族/軸本数・帰属・決定性・契約)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
