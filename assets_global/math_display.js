// math_display.js — pandora_global算数編 表示層 post-processor(共有・決定的・ゼロAI)。
// processMathText(text, opts) を提供。result_view / 生成student quiz が同一実装で使う。
//   opts.mode: 'ruby'(《》→<ruby>) | 'kana'(全ひらがな化) | 'off'(無変換)
//   opts.unitSystem: パターンの unit_system/answer_format 由来の文脈ヒント。
//                    歩合系(/歩合|buai/)のとき裸の{n}分=ぶ を強制(Phase1.5 #5・隣接規則は従来先行)。
// 適用範囲は呼び出し側が「問題本文+しき・答え」に限定する。図(SVG)内は非接触(裁可②)。
// ruby は HTML文字列(innerHTML用)、kana は素のひらがな(textContent用)、off は入力そのまま。
'use strict';

function createMathDisplay(lexicon, counterTable, readingEngineFactory) {
  const RE = readingEngineFactory || (typeof require !== 'undefined' ? require('../pattern_bank/reading_engine.js').createEngine
    : (typeof window !== 'undefined' && window.ReadingEngine && window.ReadingEngine.createEngine));
  if (!RE) throw new Error('reading_engine(createEngine) が見つかりません');
  const engine = RE(lexicon, counterTable);

  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // toRuby の 漢字/数字連《よみ》 を <ruby>base<rt>よみ</rt></ruby> へ
  function rubyMarkupToHtml(s) { return s.replace(/([一-鿿々\d０-９]+)《([^》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>'); }
  function isBuai(unitSystem) { return typeof unitSystem === 'string' && /歩合|buai/i.test(unitSystem); }

  // text: 表示文字列。opts.mode/unitSystem。戻り値は mode に応じた文字列。
  function processMathText(text, opts) {
    opts = opts || {};
    const mode = opts.mode || 'ruby';
    if (text == null || mode === 'off') return text == null ? '' : String(text);
    const eopts = { buai: isBuai(opts.unitSystem) };
    if (mode === 'kana') return engine.toHiragana(String(text), eopts);
    // ruby: HTMLエスケープ→ルビ注釈→<ruby>化(既存quiz_templateの escapeHtml→rubyToHtml と同順)
    return rubyMarkupToHtml(engine.toRuby(escapeHtml(String(text)), eopts));
  }
  return { processMathText, _engine: engine };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createMathDisplay };
else if (typeof window !== 'undefined') window.MathDisplay = { createMathDisplay };
