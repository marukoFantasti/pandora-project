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
console.log('=== (0b) r2 紛らわしさ検査: どちらでもない形=どの軸で折っても重なり率(IoU)<85%・点対称でない形=180°回転の重なり率<85%・線対称の形=最良軸で100% ===');
(function () {
  function inside(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
  function centroid(P) { let x = 0, y = 0; P.forEach(p => { x += p[0]; y += p[1]; }); return [x / P.length, y / P.length]; }
  function iou(P, Q) { let a = 0, b = 0; for (let x = -1.1; x <= 1.1; x += 0.02) for (let y = -1.1; y <= 1.1; y += 0.02) { const p = inside(P, x, y), q = inside(Q, x, y); if (p && q) a++; if (p || q) b++; } return b ? a / b : 0; }
  function reflect(P, th, c) { const r = th * Math.PI / 180, cs = Math.cos(2 * r), sn = Math.sin(2 * r); return P.map(p => { const x = p[0] - c[0], y = p[1] - c[1]; return [x * cs + y * sn + c[0], x * sn - y * cs + c[1]]; }); }
  Object.keys(CAT).forEach(id => {
    cases++; const P = FB._geom.ss_outline(id), c = centroid(P), cat = CAT[id];
    let best = 0; for (let th = 0; th < 180; th += 1) best = Math.max(best, iou(P, reflect(P, th, c)));
    const rot = iou(P, P.map(p => [2 * c[0] - p[0], 2 * c[1] - p[1]]));
    if (cat.line && best < 0.999) { bad++; console.log('  ❌ 線対称の形の最良軸重なり<100% ' + id + ' ' + best.toFixed(3)); }
    if (!cat.line && best >= 0.85) { bad++; console.log('  ❌ 紛らわしい(線) ' + id + ' ' + cat.name + ' 最良軸IoU=' + best.toFixed(3)); }
    if (cat.point && rot < 0.999) { bad++; console.log('  ❌ 点対称の形の回転重なり<100% ' + id); }
    if (!cat.point && rot >= 0.85 && !cat.named_only) { bad++; console.log('  ❌ 紛らわしい(点) ' + id + ' ' + cat.name + ' 回転IoU=' + rot.toFixed(3)); }   // named_only(正九角形等)は判別の割当候補外
    // r2②: 一般の四角形=辺長差≥30%・全て非直角(±10°)／一般の台形=直角台形または脚の傾き差≥25°
    if (id === 'quad' || id === 'trap') {
      const n = P.length, L = P.map((p, i) => Math.hypot(P[(i + 1) % n][0] - p[0], P[(i + 1) % n][1] - p[1]));
      const ang = P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]]; return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]))) * 180 / Math.PI; });
      if (id === 'quad' && (Math.max(...L) / Math.min(...L) - 1 < 0.3 || ang.some(a => Math.abs(a - 90) < 10))) { bad++; console.log('  ❌ 一般の四角形が正方形/長方形に見える ' + JSON.stringify(ang.map(a => a.toFixed(0)))); }
      if (id === 'trap') { const legs = [[P[0], P[3]], [P[1], P[2]]].map(([a, b]) => Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI)); const hasRight = ang.some(a => Math.abs(a - 90) < 0.5); if (!hasRight && Math.abs(legs[0] - legs[1]) < 25) { bad++; console.log('  ❌ 一般の台形が等脚に見える 脚角=' + legs.map(x => x.toFixed(0))); } }
    }
  });
  console.log('  ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('=== (1) 悉皆: ' + LED.rows.length + '行 × seed1..100 ===');
LED.rows.forEach(r => {
  for (let s = 1; s <= 100; s++) {
    cases++;
    const fp = { kind: 'shape_set', labels: r.labels, require: r.require, families: r.fam || null, seed: s };
    let a; try { a = FB._shapeSetAudit(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + r.row + ' seed' + s + ' ' + e.message.slice(0, 60)); continue; }
    if (a.dup) { bad++; if (fails++ < 3) console.log('  ❌ 重複 ' + r.row + ' seed' + s); }
    if (a.excl) { bad++; if (fails++ < 3) console.log('  ❌ 同居禁止(等脚台形+台形) ' + r.row + ' seed' + s); }
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
console.log('=== (1b) バンク配線(g06 shape_set 6パターン/15行): 行レコードの正答集合=転記(sheet.answersから再導出)・軸本数 ===');
(function () {
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pattern_bank', 'patterns_g06.json'), 'utf-8'));
  let n = 0;
  Object.keys(bank.shared_lexicon).filter(k => /^symshape_/.test(k)).forEach(k => {
    bank.shared_lexicon[k].forEach(rec => {
      n++; cases++;
      const fp = { kind: 'shape_set', labels: rec.lb, require: rec.rq, families: rec.fm, seed: 11 };
      let a; try { a = FB._shapeSetAudit(fp); } catch (e) { bad++; console.log('  ❌ ' + rec.row + ' 生成失敗 ' + e.message.slice(0, 60)); return; }
      if (a.dup || a.excl || a.shapes.some(x => !x.ok) || a.labels.some(l => !l.ok)) { bad++; console.log('  ❌ ' + rec.row + ' 割当/帰属'); }
      const led = LED.rows.find(r => r.row === rec.row); if (!led) { bad++; console.log('  ❌ 台帳不在 ' + rec.row); return; }
      const ans = led.ask === 'line' ? a.sheet.answers.line : led.ask === 'point' ? a.sheet.answers.point : led.ask === 'both' ? a.sheet.answers.both : null;
      if (ans && ans.join(',') !== led.ans.join(',')) { bad++; console.log('  ❌ ' + rec.row + ' 正答集合 ' + ans.join(',') + ' 転記 ' + led.ans.join(',')); }
      if (ans && !led.ans_text && rec.a !== led.ans.join(',')) { bad++; console.log('  ❌ ' + rec.row + ' レコード答 ' + rec.a); }
      if (led.axes) Object.keys(led.axes).forEach(l => { const sh = a.sheet.shapes.find(x => x.label === l); if (!sh || sh.axes !== led.axes[l]) { bad++; console.log('  ❌ ' + rec.row + ' 軸本数 ' + l); } });
      if (led.ask === 'axes_min' || led.ask === 'axes_max') { const ax = a.sheet.shapes.map(x => x.axes); const tgt = led.ask === 'axes_min' ? Math.min(...ax) : Math.max(...ax); const who = a.sheet.shapes.filter(x => x.axes === tgt).map(x => x.label); if (who.join('') !== led.ans.join('') || String(rec.a).indexOf(tgt + '本') < 0) { bad++; console.log('  ❌ ' + rec.row + ' 最少/最多 ' + who + ' ' + rec.a); } }
    });
  });
  console.log('  行レコード ' + n + ' ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('=== (2) 契約throw ===');
[[{ kind: 'shape_set', labels: ['ア'] }, 'labels不足'], [{ kind: 'shape_set', labels: ['ア', 'イ'], require: { ア: { line: true, point: false, axes: 99 } } }, '満たせない要件'], [{ kind: 'shape_set', labels: ['ア', 'イ'], shapes: [{ label: 'ア', id: 'nope' }, { label: 'イ', id: 'square' }] }, '未知の形']].forEach(([fp, name]) => {
  cases++; let threw = false; try { FB.build(fp); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約: ' + name); }
});
console.log('  契約3種 ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'shape_set: 全' + cases + '照合 一致 ✅(カタログ再計算・悉皆・正答集合再導出・重複/族/軸本数・帰属・決定性・契約)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
