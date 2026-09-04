// hyoki_rules.js — 共通表記規則層(D10 表記規則)。算数・数学バンク / 国語教材 / homeworkビルダー(jio課題) の各経路が同じ検査を使う。
// 規則1(ひらがな記号の「」規則・まるこ 2026-09-04): 角や点のひらがな1字ラベル(あ・い・う…)は本文・正解表示・解説の全箇所で「」で囲む。
//   図中ラベルは対象外・カタカナ記号は現状維持。reading_engine は「X」を読み対象外(不変)として通す。
// 検査: findUnbracketedLabels(text, figLabels) → 未囲み出現の配列(空=合格)。
//   強文脈: ラベル+(角|点|直線) / ラベル+の(角|点|直線) — 直前が語の一部(ひらがな/カタカナ/漢字)でない、または助詞「の」(「図のあの角度」型)
//   弱文脈: ラベル+と+ラベル / 度 / 区切り / 行末 — 直前が語の一部でないときのみ、かつ figLabels(図ラベル所持)のラベルに限る
// Python同等実装: hyoki_rules.py(1:1)。生成HTMLへのインライン複製は tests/hyoki_rules_drift.js で本ファイルと同一性を検査。
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.HyokiRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LABELS = 'あいうえおかきくけこ';
  var RE = new RegExp('(^|[^ぁ-んァ-ン一-鿿「]|の)([' + LABELS + '])(?=(角|点|直線)|の(角|点|直線))|(^|[^ぁ-んァ-ン一-鿿「])([' + LABELS + '])(?=と[' + LABELS + ']|度|[、 ]|$)', 'gm');
  function findUnbracketedLabels(text, figLabels) {
    var out = [], t = String(text == null ? '' : text), m; RE.lastIndex = 0;
    var has = {}; (figLabels || []).forEach(function (c) { has[c] = true; });
    while ((m = RE.exec(t))) {
      var lab = m[2] || m[5], strong = !!m[2];
      if (!strong && !has[lab]) continue;
      out.push({ label: lab, index: m.index, context: t.slice(Math.max(0, m.index - 6), m.index + 10) });
    }
    return out;
  }
  // 生成HTML(standalone・assets非ロード)へのインライン複製の正典。HTML側は「// >>> hyoki_rules inline」〜「// <<< hyoki_rules inline」の
  // 間にこの文字列をそのまま置く(tests/hyoki_rules_drift.js が同一性と挙動一致を検査)。
  var INLINE_SNIPPET = [
    "var HYOKI_LABELS='" + LABELS + "';",
    "var HYOKI_RE=new RegExp(" + JSON.stringify(RE.source) + ",'gm');",
    "function hyokiFindUnbracketedLabels(text,figLabels){var out=[],t=String(text==null?'':text),m;HYOKI_RE.lastIndex=0;var has={};(figLabels||[]).forEach(function(c){has[c]=true;});",
    "while((m=HYOKI_RE.exec(t))){var lab=m[2]||m[5],strong=!!m[2];if(!strong&&!has[lab])continue;out.push({label:lab,index:m.index,context:t.slice(Math.max(0,m.index-6),m.index+10)});}return out;}"
  ].join('\n');
  return { LABELS: LABELS, RE: RE, findUnbracketedLabels: findUnbracketedLabels, INLINE_SNIPPET: INLINE_SNIPPET, VERSION: 'D10-1' };
});
