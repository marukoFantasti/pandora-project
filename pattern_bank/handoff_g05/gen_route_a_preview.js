// g05 経路A配線 目視レビュー用プレビュー生成（配信除外域の検証資材）。
// pandora_main.html の generateQuizViaPattern と同一ロジック（makeProblem→figure_params解決）で
// C層9kind + table + rect_area を各1問生成し、answer_sheet_print_template 相当の描画
// （<div class="box-figure"> + FigureBuilder.build）で1枚のHTMLにまとめる。
//
// 実行:  node pattern_bank/handoff_g05/gen_route_a_preview.js
//   → pattern_bank/handoff_g05/g05_route_a_preview.html を出力（毎回サンプルは再抽選）。
'use strict';
const fs = require('fs');
const path = require('path');
const PB = path.join(__dirname, '..');
const P = require(path.join(PB, 'pattern_generator.js'));
const FB = require(path.join(PB, 'figure_builder.js'));
const bank = JSON.parse(fs.readFileSync(path.join(PB, 'patterns_g05.json'), 'utf-8'));
const lex = bank.shared_lexicon || {};

const KINDS = ['tri_angle', 'tri_angle_iso', 'quad_angle', 'para_area', 'tri_area', 'trap_area', 'rhombus_area', 'circle', 'cuboid', 'table', 'rect_area'];
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const cards = [];
KINDS.forEach(function (kind) {
  const p = bank.patterns.find(function (x) { return x.figure_params && x.figure_params.kind === kind; });
  if (!p) { cards.push('<div class="card"><h3>' + kind + '</h3><p>g05に該当パターンなし</p></div>'); return; }
  let r = null;
  for (let t = 0; t < 80 && !r; t++) { try { r = P.makeProblem(p, null, lex); } catch (e) { r = null; } }
  // answer_sheet_print_template 相当の figure 描画
  const figHtml = (r.figure && typeof FB.build === 'function') ? '<div class="box-figure">' + FB.build(r.figure) + '</div>' : '<p style="color:#c00">figure_params なし</p>';
  cards.push(
    '<div class="card">' +
    '<h3>' + esc(kind) + '　<span class="meta">' + esc(p.id || p.pattern_id) + ' / ' + esc(p.unit_id) + '</span></h3>' +
    '<div class="q">' + esc(r.problem) + '</div>' +
    figHtml +
    '<div class="a">答え: ' + esc(r.answer) + '</div>' +
    '</div>'
  );
});

// 実証カット: 高さ点線ラベルの ≥12px クリアランスを見るため、高さ11〜13(2桁)を含むサンプルを
// para/tri_area/trap で各1枚（同一パイプラインで height が2桁になるまで再抽選）。
const proof = [];
['para_area', 'tri_area', 'trap_area'].forEach(function (kind) {
  const p = bank.patterns.find(function (x) { return x.figure_params && x.figure_params.kind === kind; });
  if (!p) return;
  let r = null;
  for (let t = 0; t < 4000 && !r; t++) { try { const rr = P.makeProblem(p, null, lex); if (rr.figure && Number(rr.figure.height) >= 11) r = rr; } catch (e) { } }
  if (!r) { try { r = P.makeProblem(p, null, lex); } catch (e) { r = null; } }
  if (!r) return;
  proof.push(
    '<div class="card" style="border-color:#C0392B">' +
    '<h3>' + esc(kind) + '（高さ' + esc(r.figure.height) + '・実証）　<span class="meta">' + esc(p.unit_id) + '</span></h3>' +
    '<div class="q">' + esc(r.problem) + '</div>' +
    '<div class="box-figure">' + FB.build(r.figure) + '</div>' +
    '<div class="a">答え: ' + esc(r.answer) + '</div>' +
    '</div>'
  );
});

const html =
  '<!doctype html><meta charset="utf-8"><title>g05 経路A配線 図形プレビュー</title>' +
  '<style>body{font-family:sans-serif;background:#f7f7f9;margin:16px;color:#222}' +
  'h1{font-size:16px}h2{font-size:12px;color:#666;font-weight:400}' +
  '.card{display:inline-block;vertical-align:top;width:300px;min-height:260px;background:#fff;border:1px solid #ddd;' +
  'border-radius:8px;margin:6px;padding:10px}.card h3{font-size:13px;margin:0 0 6px}.card .meta{font-size:10px;color:#999;font-weight:400}' +
  '.q{font-size:12px;margin:2px 0 8px;min-height:32px}.a{font-size:11px;color:#1a56c4;margin-top:6px}' +
  '.box-figure{margin:4px 0;text-align:center}.box-figure svg{max-width:100%;height:auto}</style>' +
  '<h1>g05 経路A配線 図形プレビュー（C層9kind + table + rect_area）</h1>' +
  '<h2>generateQuizViaPattern と同一ロジックで生成した figure_params を、印刷解答用紙相当の描画で表示。目視レビュー用。</h2>' +
  cards.join('') +
  (proof.length ? '<h1 style="margin-top:16px">高さ11〜13の実証カット（高さラベルの点線からの≥12pxクリアランス）</h1>' + proof.join('') : '');

const out = path.join(__dirname, 'g05_route_a_preview.html');
fs.writeFileSync(out, html);
console.log('生成:', out, '(' + cards.length + 'カード)');
