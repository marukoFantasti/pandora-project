// graph_choice_vectors.js — graph_choice便(裁可q) Kind: graph_choice の関門(設計書§3)。行台帳2行×seed1..100: 割当(4面とも折れ線・正答面=時間軸群・非正答面=種類別群・題材重複なし)・
// 記号帰属(最近傍パネル)・パネル非重なり・等スケール・決定性・答え集合の再導出=転記(edge_set正規形)。出力SVGからも折れ線4面(棒なし)を独立に照合。(2b)バンク配線(あれば)。
'use strict';
require('./_seeded').install();   // 台帳原則: 関門内の乱択はseed付き(corr-0042)
const fs = require('fs'), path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
const P = require(path.join(__dirname, '..', 'pattern_bank', 'pattern_generator.js'));
const LED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'graph_choice_rows.json'), 'utf-8'));
let bad = 0, cases = 0, fails = 0;
function check(row, fp, wantAns) {
  cases++; let a, svg; try { a = FB._graphChoiceAudit(fp); svg = FB.build(fp); } catch (e) { bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 ' + row + ' ' + e.message.slice(0, 80)); return null; }
  if (a.issues.length) { bad++; if (fails++ < 3) console.log('  ❌ issues ' + row + ' ' + a.issues); }
  a.labels.forEach(l => { if (!l.ok) { bad++; if (fails++ < 3) console.log('  ❌ 帰属 ' + row + ' ' + l.text + '→' + l.nearest); } });
  const derived = P.normEdgeSet(a.derived_answer.join(',')), want = P.normEdgeSet(wantAns.join(','));
  if (derived !== want) { bad++; if (fails++ < 3) console.log('  ❌ 答え集合 ' + row + ' ' + derived + ' vs ' + want); }
  // 自己差し戻し反映: 4面とも折れ線(SVGのpolyline=4・棒rectなし)・正答面=時間軸群の題材・非正答面=種類別群の題材(fp側の群定義から独立に照合)
  const nLine = (svg.match(/<polyline /g) || []).length, nBars = (svg.match(/<rect x="[-\d.]+" y="[-\d.]+" width="[-\d.]+" height="[-\d.]+" fill="#cfe0fb"/g) || []).length;
  if (nLine !== 4 || nBars !== 0) { bad++; if (fails++ < 3) console.log('  ❌ 4面折れ線 ' + row + ' polyline=' + nLine + ' bars=' + nBars); }
  a.panels.forEach(p => { const inAns = wantAns.indexOf(p.label) >= 0, t = inAns ? fp.time_topics[p.topic_idx] : fp.kind_topics[p.topic_idx]; if (!t || t.title !== p.title || p.kind !== 'line') { bad++; if (fails++ < 3) console.log('  ❌ 題材群 ' + row + ' ' + p.label + ' ' + p.title); } });
  if (svg !== FB.build(fp)) { bad++; console.log('  ❌ 非決定 ' + row); }
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/), wh = svg.match(/width="([-\d.]+)" height="([-\d.]+)"/);
  if (!vb || !wh || Math.abs(Number(vb[3]) / Number(vb[4]) - Number(wh[1]) / Number(wh[2])) > 0.02) { bad++; if (fails++ < 3) console.log('  ❌ 等スケール ' + row); }
  return a;
}
console.log('=== (1) 悉皆: 2行 × seed1..100 ===');
LED.rows.forEach(r => { for (let s = 1; s <= 100; s++) check(r.row + ' seed' + s, { kind: 'graph_choice', labels: r.labels, answer: r.answer, time_topics: LED.time_topics, kind_topics: LED.kind_topics, seed: s }, r.answer); });
console.log('  ' + cases + '構成 ' + (bad === 0 ? '✅' : '❌'));
console.log('=== (1b) 単調題材(trend=up)は昇順 ===');
(function () { for (let s = 1; s <= 100; s++) { const fp = { kind: 'graph_choice', labels: ['ア', 'イ', 'ウ', 'エ'], answer: ['ア', 'ウ', 'エ'], time_topics: LED.time_topics, kind_topics: LED.kind_topics, seed: s }; const g = FB._geom.graph_choice(fp); cases++;
  g.panels.forEach(p => { if (p.topic.trend === 'up') for (let i = 1; i < p.ys.length; i++) if (p.ys[i] <= p.ys[i - 1]) { bad++; if (fails++ < 3) console.log('  ❌ 非昇順 seed' + s + ' ' + p.topic.title + ' ' + p.ys); break; } }); }
  console.log('  ' + (bad === 0 ? '✅' : '❌')); })();
console.log('=== (2b) バンク配線(g04 graph_choice): 生成器経由(seed決定化)で答=転記記号集合 ===');
(function () {
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pattern_bank', 'patterns_g04.json'), 'utf-8'));
  const p = bank.patterns.find(x => x.pattern_id === 'g04_graph_choice_01'); if (!p) { console.log('  (未配線=スキップ)'); return; }
  const { mulberry32 } = require('./_seeded');
  for (let s = 1; s <= 200; s++) {
    const orig = Math.random; Math.random = mulberry32(s * 7919); let r; try { r = P.makeProblem(p, null, bank.shared_lexicon); } catch (e) { Math.random = orig; bad++; if (fails++ < 3) console.log('  ❌ 生成失敗 seed' + s + ' ' + e.message.slice(0, 80)); continue; } finally { Math.random = orig; }
    const b0 = bad, a = check('bank seed' + s, r.figure, r.figure.answer); if (!a) continue;
    if (String(r.answer).indexOf(r.env.A1_edges) < 0 || P.normEdgeSet(r.figure.answer.join(',')) !== r.env.A1) { bad++; if (fails++ < 3) console.log('  ❌ 答≠図の正答 seed' + s + ' ' + r.answer + ' / ' + r.env.A1); }
    if (bad > b0) console.log('     再現情報: seed=' + s + ' env=' + JSON.stringify({ j1: r.env.j1, sd1: r.env.sd1 }));
    if (r.kaisetsu.indexOf('{') >= 0) { bad++; console.log('  ❌ 解説未解決'); }
  }
  console.log('  ' + (bad === 0 ? '✅' : '❌'));
})();
console.log('=== (3) 契約: labels≠4・answer範囲外・題材不足 は例外 ===');
[{ labels: ['ア', 'イ', 'ウ'], answer: ['ア'] }, { labels: ['ア', 'イ', 'ウ', 'エ'], answer: ['オ'] }, { labels: ['ア', 'イ', 'ウ', 'エ'], answer: ['ア', 'イ', 'ウ', 'エ'] }, { labels: ['ア', 'イ', 'ウ', 'エ'], answer: ['ア'], kind_topics: LED.kind_topics.slice(0, 2) }].forEach(fp => { cases++; let threw = false; try { FB.build(Object.assign({ kind: 'graph_choice', time_topics: LED.time_topics, kind_topics: LED.kind_topics, seed: 1 }, fp)); } catch (e) { threw = true; } if (!threw) { bad++; console.log('  ❌ 契約違反が通過 ' + JSON.stringify(fp.answer)); } });
console.log('  ' + (bad === 0 ? '✅' : '❌'));
console.log('\n' + (bad === 0 ? 'graph_choice_vectors: GREEN ✅(' + cases + '構成)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
