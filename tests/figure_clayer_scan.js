// C層kind 全域スキャン検収（受け入れテスト b）＋ 決定性（c）。
// バンクの図つきC層パターンを実ジェネレータで多シード生成し、各 figure_params を
// figure_builder で build → _<kind>MinClearance で検査する。合格条件:
//   (a) テキスト間 ≥10px  (b) 非自要素線分 ≥4px  (c) 意味判定 semBad=0
// を全バリアントで満たすこと（合格率100%）。あわせて同一 figure_params の2回buildが
// バイト一致すること（決定性）を確認する。
//
// 不合格が出た場合は (a1,a2,a3)/(b1,h1,ar) 等の組合せを表示（builderで図形を歪めず、
// バンク制約強化で対処する運用のため）。
//
// 実行:  node tests/figure_clayer_scan.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pattern_bank', 'pattern_generator.js'));
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));

const CKINDS = new Set(['tri_angle', 'tri_angle_iso', 'quad_angle', 'para_area', 'tri_area', 'trap_area', 'rhombus_area', 'circle', 'cuboid']);
function clName(k) { return '_' + k.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }) + 'MinClearance'; }
const SEEDS = Number(process.argv[2] || 800);   // パターンごとの試行数

// 走査対象: デプロイ実体バンク（将来学年もC層kindを使えば自動対象化）
const bankFiles = fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(function (f) { return /^patterns_g\d\d\.json$/.test(f); });
let figured = [];
bankFiles.forEach(function (bf) {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', bf), 'utf-8'));
  const lex = bank.shared_lexicon || {};
  (bank.patterns || []).forEach(function (p) {
    if (p.figure_params && CKINDS.has(p.figure_params.kind)) figured.push({ file: bf, p: p, lex: lex });
  });
});
if (!figured.length) { console.log('C層図つきパターンなし'); process.exit(0); }

let totalV = 0; const perKind = {}; const fails = [];
let detBad = 0;
figured.forEach(function (job) {
  const kind = job.p.figure_params.kind, cl = FB[clName(kind)];
  perKind[kind] = perKind[kind] || { n: 0, f: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let r;
    try { r = P.makeProblem(job.p, null, job.lex); } catch (e) { fails.push([kind, 'GEN:' + e.message]); break; }
    const fig = r.figure; totalV++; perKind[kind].n++;
    const sc = cl(fig);
    if (!(sc.minText >= 10 && sc.minSeg >= 4 && sc.semBad === 0 && (sc.strongBad || 0) === 0)) {
      perKind[kind].f++;
      if (fails.length < 25) fails.push([kind, JSON.stringify(sc), JSON.stringify(fig).replace(/"/g, '')]);
    }
    if (FB.build(fig) !== FB.build(fig)) detBad++;   // 決定性
  }
});
const kindsOrder = ['tri_angle', 'tri_angle_iso', 'quad_angle', 'para_area', 'tri_area', 'trap_area', 'rhombus_area', 'circle', 'cuboid'];
kindsOrder.forEach(function (k) { if (perKind[k]) console.log('  ' + k.padEnd(16) + ': ' + (perKind[k].n - perKind[k].f) + '/' + perKind[k].n + (perKind[k].f ? '  ❌' : '  ✅')); });
const tf = Object.values(perKind).reduce(function (a, x) { return a + x.f; }, 0);
console.log('全域スキャン: ' + figured.length + 'パターン × ' + SEEDS + 'シード = ' + totalV + 'バリアント → ' + (tf === 0 ? '9kind 100% ✅' : (100 * (totalV - tf) / totalV).toFixed(2) + '% ❌'));
console.log('決定性(同一params→build2回バイト一致): ' + (detBad === 0 ? '✅' : detBad + '件不一致 ❌'));
if (fails.length) { console.log('--- 不合格の組合せ（バンク制約強化で対処）---'); fails.slice(0, 25).forEach(function (f) { console.log('   ', f.join(' | ')); }); }
process.exit(tf === 0 && detBad === 0 && !fails.some(function (f) { return String(f[1] || '').indexOf('GEN:') === 0; }) ? 0 : 1);
