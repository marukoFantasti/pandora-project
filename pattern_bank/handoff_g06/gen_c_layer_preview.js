// C層(第5弾)5kind 目視レビュー用プレビュー。node pattern_bank/handoff_g06/gen_c_layer_preview.js
'use strict';
const path = require('path'); const fs = require('fs');
const FB = require(path.join(__dirname, '..', 'figure_builder.js'));
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
const cards = [];
function card(title, fp) { cards.push('<div class="card"><h3>' + esc(title) + '</h3><div class="fig">' + FB.build(fp) + '</div></div>'); }
function sect(t) { cards.push('<div style="width:100%;font-weight:bold;font-size:13px;margin:10px 0 2px">' + esc(t) + '</div>'); }

sect('① sym_polygon — 線/点対称 × axis有無');
card('square / line / axis有', { fig_version: 1, kind: 'sym_polygon', shape: 'square', mode: 'line', axis: true });
card('square / line / axis無(判定用)', { fig_version: 1, kind: 'sym_polygon', shape: 'square', mode: 'line', axis: false });
card('reg_pentagon / line / axis有(5軸)', { fig_version: 1, kind: 'sym_polygon', shape: 'reg_pentagon', mode: 'line', axis: true });
card('reg_hexagon / line / axis有(6軸)', { fig_version: 1, kind: 'sym_polygon', shape: 'reg_hexagon', mode: 'line', axis: true });
card('equi_tri / line / axis有(3軸)', { fig_version: 1, kind: 'sym_polygon', shape: 'equi_tri', mode: 'line', axis: true });
card('iso_tri / line / axis有(1軸)', { fig_version: 1, kind: 'sym_polygon', shape: 'iso_tri', mode: 'line', axis: true });
card('parallelogram / point / axis有(点対称中心)', { fig_version: 1, kind: 'sym_polygon', shape: 'parallelogram', mode: 'point', axis: true });
card('parallelogram / point / axis無', { fig_version: 1, kind: 'sym_polygon', shape: 'parallelogram', mode: 'point', axis: false });

sect('② similar_pair — 拡大/縮小');
card('right_tri ×2 (拡大)', { fig_version: 1, kind: 'similar_pair', base_shape: 'right_tri', ratio: 2, base_label: 4, scaled_label: 8, unit: 'cm' });
card('right_tri ×3 (拡大)', { fig_version: 1, kind: 'similar_pair', base_shape: 'right_tri', ratio: 3, base_label: 4, scaled_label: 12, unit: 'cm' });
card('rect ×1/2 (縮小)', { fig_version: 1, kind: 'similar_pair', base_shape: 'rect', ratio: 0.5, base_label: 8, scaled_label: 4, unit: 'cm' });

sect('③ xy_graph — prop/inv');
card('prop y=2x (読点(3,6))', { fig_version: 1, kind: 'xy_graph', mode: 'prop', k: 2, xmax: 6, ymax: 6, mark: [3, 6] });
card('inv y=12/x (整数格子点強調)', { fig_version: 1, kind: 'xy_graph', mode: 'inv', k: 12, xmax: 6, ymax: 6 });

sect('④ dot_plot / ⑤ histogram');
card('dot_plot values=[2,3,3,4,4,4,5,6]', { fig_version: 1, kind: 'dot_plot', values: [2, 3, 3, 4, 4, 4, 5, 6], min: 0, max: 8 });
card('histogram 階級幅5 度数[3,7,5,2] (x0=10)', { fig_version: 1, kind: 'histogram', class_width: 5, x0: 10, freqs: [3, 7, 5, 2] });

const html = '<!doctype html><meta charset="utf-8"><title>C層(第5弾)5kind プレビュー</title>' +
  '<style>body{font-family:sans-serif;background:#f6f7f9;margin:14px;color:#222}h1{font-size:16px}' +
  '.card{display:inline-block;vertical-align:top;width:230px;min-height:200px;background:#fff;border:1px solid #ddd;border-radius:8px;margin:6px;padding:10px}' +
  '.card h3{font-size:11px;margin:0 0 6px}.fig{text-align:center}.fig svg{max-width:100%;height:auto}</style>' +
  '<h1>C層(第5弾) sym_polygon / similar_pair / xy_graph / dot_plot / histogram プレビュー</h1>' + cards.join('');
const out = path.join(__dirname, 'c_layer_preview.html');
fs.writeFileSync(out, html);
console.log('生成:', out, '(' + (html.match(/<svg/g) || []).length + ' SVG)');
