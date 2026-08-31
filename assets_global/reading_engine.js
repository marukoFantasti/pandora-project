// reading_engine.js — pandora_global算数編 表示層 読み合成エンジン(決定的・ゼロAI・依存ライブラリなし)。
// 入力: 表示文字列。出力2モード: toRuby(《》中間表現) / toHiragana(全ひらがな化)。
// 処理順(counter_reading_table _meta / furigana_lexicon _meta.matching_rules 正準):
//   (1) 数値+単位の結合形(負数・小数・分数・帯分数・複名数)を規則表で読み化
//   (2) 残り漢字語を furigana_lexicon の最長一致で読み化
//   (3) 残存漢字があれば例外を投げる(握りつぶし禁止)
// createEngine(lexicon, counterTable) で辞書を注入。Nodeでは loadDefault() が handoff_jhs から読む。
'use strict';

function createEngine(lexicon, counterTable) {
  const SURF = lexicon.surfaces || lexicon;
  const NC = counterTable.numeral_components;
  const COUNTERS = counterTable.counters;
  const SP = counterTable.special_notations;
  // 単位キーを長い順(cm と m, 時間 と 時 の衝突回避)
  const UNIT_KEYS = Object.keys(COUNTERS).sort((a, b) => b.length - a.length);
  // lexicon表層を長い順(最長一致)
  const SURF_KEYS = Object.keys(SURF).sort((a, b) => b.length - a.length);
  const KANJI = /[一-鿿々]/;
  const P_MUTATE = { 'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ' };

  function entryOf(unit) { let e = COUNTERS[unit]; if (e && e.alias_of) e = COUNTERS[e.alias_of]; return e; }

  // 裸の数(<10000中心。万以上は簡易対応)
  function readNumber(n) {
    n = Math.trunc(Math.abs(n));
    if (n === 0) return NC.digits['0'];
    if (n >= 1000000000000) { const cho = Math.floor(n / 1000000000000); const rem = n % 1000000000000; return readNumber(cho) + 'ちょう' + (rem ? readNumber(rem) : ''); }
    if (n >= 100000000) { const oku = Math.floor(n / 100000000); const rem = n % 100000000; return readNumber(oku) + 'おく' + (rem ? readNumber(rem) : ''); }
    if (n >= 10000) { const man = Math.floor(n / 10000); const rem = n % 10000; return readNumber(man) + 'まん' + (rem ? readNumber(rem) : ''); }
    let s = '';
    const th = Math.floor(n / 1000) % 10, h = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10;
    if (th) s += NC.thousands[String(th)];
    if (h) s += NC.hundreds[String(h)];
    if (t) s += NC.tens_prefix[String(t)] + NC.ten_base;
    if (o) s += NC.digits[String(o)];
    return s;
  }

  // N + 助数詞
  function readCounter(n, unit) {
    const e = entryOf(unit);
    if (!e) throw new Error('未知の単位: ' + unit);
    n = Math.trunc(n);
    if (e.range_guard) { const m = e.range_guard.match(/(\d+)〜(\d+)/); if (m && (n < +m[1] || n > +m[2])) throw new Error('range_guard違反 ' + unit + '=' + n + ' (' + e.range_guard + ')'); }
    if (e.mutation_free) return readNumber(n) + e.base;
    const dr = e.digit_readings;
    if (!dr) return readNumber(n) + e.base;
    if (n >= 1 && n <= 10 && dr[String(n)]) return dr[String(n)];
    const num0 = k => (k ? readNumber(k) : '');                   // 上位部0は空(れい前置を防ぐ)
    const o = n % 10;
    if (o !== 0) return num0(n - o) + dr[String(o)];              // 末尾=一の位
    if (n % 100 !== 0) {                                          // 末尾=十の位
      const hundredsPart = n - (n % 100), t = (n % 100) / 10;
      return num0(hundredsPart) + NC.tens_prefix[String(t)] + dr['10'];
    }
    // 末尾=百(以上)の位
    const h = Math.floor((n % 1000) / 100), thPart = n - (n % 1000);
    if (n === 100 && e.hundreds_1) return e.hundreds_1;
    if (e.hundreds_1 && /っ[ぱ-ぽ]/.test(e.hundreds_1) && h) {     // p系変音(300本=さんびゃっぽん)
      let hr = NC.hundreds[String(h)]; if (/く$/.test(hr)) hr = hr.slice(0, -1) + 'っ';
      const pb = (P_MUTATE[e.base[0]] || e.base[0]) + e.base.slice(1);
      return num0(thPart) + hr + pb;
    }
    return readNumber(n) + e.base;                                // 非変音の百
  }

  // 数値表記(小数/分数/帯分数/負数)を読み化。読めれば {reading}, 読めなければ null。
  function readDecimalDigits(fr) { return fr.split('').map(d => NC.digits[d]).join(''); }
  function readNumericLiteral(numStr) {
    // numStr は数値リテラル本体(符号なし)。小数 or 整数。
    const dm = numStr.match(/^(\d+)\.(\d+)$/);
    if (dm) return readNumber(+dm[1]) + (SP.decimal_point.reading || 'てん') + readDecimalDigits(dm[2]);
    if (/^\d+$/.test(numStr)) return readNumber(+numStr);
    return null;
  }

  // lexicon: 読みは表層の漢字部に対応。かなはそのまま。単一漢字連を読みで置換。
  function applyReading(surface, reading) {
    if (!KANJI.test(surface)) return surface;
    // 漢字連が複数の表層(例: 何分の一)は読みが中間かな込みの全表層読み=全体置換
    if ((surface.match(/[一-鿿々]+/g) || []).length > 1) return reading;
    return surface.replace(/[一-鿿々]+/, reading);
  }
  // 数値+単位や何+単位の group ruby(漢字を含むときのみ)
  function groupRuby(orig, hira) { return KANJI.test(orig) ? orig + '《' + hira + '》' : orig; }

  // メイン: 左から走査。emit(orig, hira, ruby)。hira=全ひらがな化 / ruby=ルビ注釈形。
  // opts.buai=true: 文脈ヒント(unit_system=歩合)。裸の{n}分も ぶ(局所の隣接規則で拾えない分をPhase1.5 #5対応)。
  function scan(text, emit, opts) {
    opts = opts || {};
    const s = String(text); let i = 0;
    const BUAI = SP.buai_composite || null;
    while (i < s.length) {
      const rest = s.slice(i);
      // (歩合の複合規則) 一般の数値+単位より先。分が割/厘と同一結合列で隣接共起する場合のみ 分=ぶ。
      if (BUAI) {
        const bm = rest.match(/^((?:\d+[割分厘])+)/);
        if (bm && /分/.test(bm[1]) && /[割厘]/.test(bm[1])) {
          let h = ''; bm[1].match(/\d+[割分厘]/g).forEach(seg => { h += readNumber(+seg.slice(0, -1)) + BUAI.readings[seg.slice(-1)]; });
          emit(bm[1], h, groupRuby(bm[1], h)); i += bm[1].length; continue;
        }
      }
      let m = rest.match(/^(\d+)と(\d+)\/(\d+)/);                  // 帯分数
      if (m) { const h = readNumber(+m[1]) + 'と' + readNumber(+m[3]) + 'ぶんの' + readNumber(+m[2]); emit(m[0], h, m[0]); i += m[0].length; continue; }
      m = rest.match(/^(\d+)\/(\d+)/);                             // 分数
      if (m) { const h = readNumber(+m[2]) + 'ぶんの' + readNumber(+m[1]); emit(m[0], h, m[0]); i += m[0].length; continue; }
      m = rest.match(/^[−\-](\d+(?:\.\d+)?)/);                    // 負数(+単位)
      if (m) {
        let j = i + m[0].length, unit = '';
        for (const u of UNIT_KEYS) { if (s.slice(j, j + u.length) === u) { unit = u; break; } }
        const neg = SP.negative.prefix || 'マイナス';
        let hira = neg + readNumericLiteral(m[1]);
        if (unit) { const nv = m[1]; hira = neg + (Number.isInteger(+nv) ? readCounter(+nv, unit) : readNumericLiteral(nv) + entryOf(unit).base); j += unit.length; }
        const orig = s.slice(i, j); emit(orig, hira, groupRuby(orig, hira)); i = j; continue;
      }
      if (rest[0] === '何') {                                     // 何+単位(question形)
        let unit = '';
        for (const u of UNIT_KEYS) { if (s.slice(i + 1, i + 1 + u.length) === u) { unit = u; break; } }
        // 最長一致優先: lexicon表層が「何+単位」より長く一致するときはlexiconに譲る(例: 何分の一=なんぶんのいち)
        let longerSurf = false;
        if (unit) { for (const key of SURF_KEYS) { if (key.length > 1 + unit.length && rest.slice(0, key.length) === key) { longerSurf = true; break; } if (key.length <= 1 + unit.length) break; } }
        if (unit && !longerSurf) { const e = entryOf(unit), hira = e.question || ('なん' + (e.base || '')); emit('何' + unit, hira, '何' + unit + '《' + hira + '》'); i += 1 + unit.length; continue; }
      }
      m = rest.match(/^(\d+(?:\.\d+)?)/);                          // 数値(+単位)
      if (m) {
        const numStr = m[1]; let j = i + numStr.length, unit = '';
        for (const u of UNIT_KEYS) { if (s.slice(j, j + u.length) === u) { unit = u; break; } }
        if (unit) {
          const e = entryOf(unit);
          // 文脈ヒント: 歩合系(opts.buai)では裸の{n}分も ぶ(隣接規則で拾えない単独分の大域補正)
          let hira;
          if (opts.buai && unit === '分' && BUAI && Number.isInteger(+numStr)) hira = readNumber(+numStr) + BUAI.readings['分'];
          else hira = Number.isInteger(+numStr) ? readCounter(+numStr, unit) : readNumericLiteral(numStr) + e.base;
          const orig = numStr + unit; emit(orig, hira, groupRuby(orig, hira)); i = j + unit.length; continue;
        }
        emit(numStr, readNumericLiteral(numStr), numStr); i = j; continue;   // 裸の数(ルビなし)
      }
      let matched = null;                                         // lexicon 最長一致
      for (const key of SURF_KEYS) { if (rest.slice(0, key.length) === key) { matched = key; break; } }
      if (matched) {
        const raw = SURF[matched];
        const multiRun = (matched.match(/[一-鿿々]+/g) || []).length > 1;   // 全表層読み=グループルビ
        const ruby = multiRun ? matched + '《' + raw + '》' : matched.replace(/([一-鿿々]+)/, '$1《' + raw + '》');
        emit(matched, applyReading(matched, raw), ruby); i += matched.length; continue;
      }
      if (KANJI.test(s[i])) throw new Error('残存漢字: "' + s[i] + '" @ …' + s.slice(Math.max(0, i - 6), i + 4));
      emit(s[i], s[i], s[i]); i++;                                // かな・記号・英字
    }
  }

  function toHiragana(text, opts) { let o = ''; scan(text, (orig, hira) => { o += hira; }, opts); return o; }
  function toRuby(text, opts) { let o = ''; scan(text, (orig, hira, ruby) => { o += ruby; }, opts); return o; }
  return { toHiragana, toRuby, readNumber, readCounter, _scan: scan };
}

function loadDefault() {
  const fs = require('fs'); const path = require('path');
  const HJ = path.join(__dirname, 'handoff_jhs');
  const lex = JSON.parse(fs.readFileSync(path.join(HJ, 'furigana_lexicon.json'), 'utf-8'));
  const ct = JSON.parse(fs.readFileSync(path.join(HJ, 'counter_reading_table.json'), 'utf-8'));
  return createEngine(lex, ct);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createEngine, loadDefault };
else if (typeof window !== 'undefined') window.ReadingEngine = { createEngine };   // ブラウザ大域(表示層)
