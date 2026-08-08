// ============================================================
// Pandora パターンバンク ジェネレータ（JS移植版）
// generate_poc_v06.py の1:1移植。挙動を変えないこと。
// ブラウザ<script>読み込みとNode.js(require)の両方で動作する。
// ============================================================
(function (root) {
  'use strict';

  // ---- 学年配当漢字。generate_poc_v07.py + kyoiku_kanji_g1to3.json(MEXT2017)と同一 ----
  // G01/G02 は generate_poc_v06/07 と同一。G03 は kyoiku_kanji_g1to3.json の g03(200字)。
  var G01 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
  var G02 = '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';
  var G03 = '丁世両主乗予事仕他代住使係倍全具写列助勉動勝化区医去反取受号向君味命和品員商問坂央始委守安定実客宮宿寒対局屋岸島州帳平幸度庫庭式役待急息悪悲想意感所打投拾持指放整旅族昔昭暑暗曲有服期板柱根植業様横橋次歯死氷決油波注泳洋流消深温港湖湯漢炭物球由申界畑病発登皮皿相県真着短研礼神祭福秒究章童笛第筆等箱級終緑練羊美習者育苦荷落葉薬血表詩調談豆負起路身転軽農返追送速進遊運部都配酒重鉄銀開院陽階集面題飲館駅鼻';
  var G04 = '愛案以衣位茨印英栄媛塩岡億加果貨課芽賀改械害街各覚潟完官管関観願岐希季旗器機議求泣給挙漁共協鏡競極熊訓軍郡群径景芸欠結建健験固功好香候康佐差菜最埼材崎昨札刷察参産散残氏司試児治滋辞鹿失借種周祝順初松笑唱焼照城縄臣信井成省清静席積折節説浅戦選然争倉巣束側続卒孫帯隊達単置仲沖兆低底的典伝徒努灯働特徳栃奈梨熱念敗梅博阪飯飛必票標不夫付府阜富副兵別辺変便包法望牧末満未民無約勇要養浴利陸良料量輪類令冷例連老労録';
  var KANJI_BY_GRADE = { g01: G01, g02: G02, g03: G03, g04: G04 };
  function buildKanjiSet(str) { var s = {}; str.split('').forEach(function (c) { s[c] = true; }); return s; }
  // kanji_policy.allowed_grades が無いパターンの既定は g01|g02（v0.7 DEFAULT_ALLOWED と同一）。
  var DEFAULT_ALLOWED = buildKanjiSet(G01 + G02);
  function allowedKanji(pattern) {
    var kp = pattern.kanji_policy || {};
    var grades = kp.allowed_grades;
    var s = (!grades || !grades.length) ? Object.assign({}, DEFAULT_ALLOWED)
      : buildKanjiSet(grades.map(function (g) { return KANJI_BY_GRADE[g] || ''; }).join(''));
    // allowed_extra(v0.8): 配当外だが当該学年の教科書で用いる専門用語の字を個別許可（例:捨/仮）。
    (kp.allowed_extra || '').split('').forEach(function (c) { s[c] = true; });
    return s;
  }

  // ---- 単位系と整形（0の下位単位は省略） ----
  function fmtCompound(base, factor, bigU, smallU) {
    var big = Math.floor(base / factor), small = base % factor;
    if (big && small) return '' + big + bigU + small + smallU;
    if (big) return '' + big + bigU;
    return '' + small + smallU;
  }
  function fmtClock(base) {
    var ampm = base < 720 ? '午前' : '午後';
    var h = Math.floor(base / 60) % 12;
    if (h === 0) h = 12;
    var m = base % 60;
    return m ? (ampm + h + '時' + m + '分') : (ampm + h + '時');
  }
  var FORMATTERS = {
    cm_mm: function (b) { return fmtCompound(b, 10, 'cm', 'mm'); },
    m_cm: function (b) { return fmtCompound(b, 100, 'm', 'cm'); },
    L_dL: function (b) { return fmtCompound(b, 10, 'L', 'dL'); },
    h_min: function (b) { return fmtCompound(b, 60, '時間', '分'); },
    clock: fmtClock,
    raw_min: function (b) { return String(b); },
    // v0.7 追加（generate_poc_v07.py と同一）
    km_m: function (b) { return fmtCompound(b, 1000, 'km', 'm'); },
    kg_g: function (b) { return fmtCompound(b, 1000, 'kg', 'g'); },
    L_mL: function (b) { return fmtCompound(b, 1000, 'L', 'mL'); },
    m_cm100: function (b) { return fmtCompound(b, 100, 'm', 'cm'); },
    dec1: function (b) {
      var i = Math.floor(b / 10), f = b % 10;
      return f ? ('' + i + '.' + f) : ('' + i);
    }
  };

  // 同分母分数の整形（generate_poc_v07.py fmt_fraction と同一）。num==den→"1"、num==0→"0"。
  function fmtFraction(num, den) {
    if (num === 0) return '0';
    if (num === den) return '1';
    return '' + num + '/' + den;
  }

  // 帯分数表記（generate_poc_v08.py fmt_mixed と同一）。num==0→"0"、割り切れ→整数、
  // whole==0→真分数、他→"aとb/c"（g03分数表記と一貫）。
  function fmtMixed(num, den) {
    num = Math.trunc(num); den = Math.trunc(den);
    if (num === 0) return '0';
    var whole = Math.trunc(num / den), rem = num % den;
    if (rem === 0) return '' + whole;
    if (whole === 0) return '' + rem + '/' + den;
    return '' + whole + 'と' + rem + '/' + den;
  }

  // がい数（v0.8）: 整数演算のみ（浮動小数点round禁止・言語間挙動差なし）。
  function roundHalfUp(n, place) {
    n = Math.trunc(n); place = Math.trunc(place);
    var q = Math.floor(n / place), r = n - q * place;
    if (r * 2 >= place) q += 1;
    return q * place;
  }
  function roundRangeLower(x, place) { return Math.trunc(x) - Math.trunc(Math.trunc(place) / 2); }
  function roundRangeUpperExcl(x, place) { return Math.trunc(x) + Math.trunc(Math.trunc(place) / 2); }

  function kanjiCheck(text, allowed) {
    var bad = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var code = ch.codePointAt(0);
      if (code >= 0x4e00 && code <= 0x9fff && !allowed[ch]) bad.push(ch);
    }
    return bad;
  }

  // ---- 乱数ユーティリティ（Pythonのrandom.choice/sample/randrange相当） ----
  function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randSample(arr, k) {
    var pool = arr.slice(), out = [];
    for (var i = 0; i < k && pool.length; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  }
  function randRange(lo, hi, step) {
    step = step || 1;
    var n = Math.floor((hi - lo) / step) + 1;
    return lo + step * Math.floor(Math.random() * n);
  }

  // ---- 安全な式評価（abs/max/minのみ許可のホワイトリスト） ----
  // バンクJSONの制約式（value_constraints.expr）・computed_slots式（formula）・
  // answer_formulaはPython構文が正であり、JS側（evalExpr）が読み込み時に翻訳する。
  // 対応構文は以下のみ:
  //   - and / or / not（単語境界 \b 付きで置換。識別子内の部分一致（例: grand
  //     内のand）は変換対象にしない）→ JSの && / || / !
  //   - 条件式 "A if C else B"（求差パターンのwinner導出等で使用）→ JSの "C ? A : B"
  //   - abs / max / min（evalExprの引数としてホワイトリスト許可）
  // これ以外のPython構文（**, //, リスト内包表記等）をバンクJSONに書いてはならない。
  // 未対応構文が混入した場合、JSの構文エラーとして即座に失敗する（サイレントな
  // 誤動作にはならない）。
  // Python の整数除算 // を Math.floor((a)/(b)) に変換。オペランドは atom（識別子・数値・
  // 1段の括弧グループ）のみ（バンクの // 使用箇所はすべてこの形: n1//n2 / (n_a*n_b)//n2 /
  // n1//(a1+a2)）。JSでは // は行コメントになるため、new Function 前に必ず潰す。
  function translateFloorDiv(expr) {
    // atom = 関数呼び出し max(a,b) / 括弧グループ (a+b) / 識別子・数値。1段の入れ子まで対応。
    var atom = '(?:\\w+\\([^()]*\\)|\\([^()]*\\)|\\w+)';
    var re = new RegExp('(' + atom + ')\\s*//\\s*(' + atom + ')');
    var prev = null;
    while (prev !== expr) {  // 複数箇所・入れ子（左辺が既に括弧化）に備え収束まで反復
      prev = expr;
      expr = expr.replace(re, 'Math.floor(($1)/($2))');
    }
    return expr;
  }

  // Python の剰余 % を pymod(a,b) に変換。JS の % は被除数の符号を返す（-28%10=-8）が
  // Python は除数の符号（-28%10=2）。求差系 (q1-q2)%10 等で負の被除数が出るため必須。
  // 除数は常に正（10/100/1000/60/n2>0）を前提とする。オペランドは atom（// と同じ）。
  function translateMod(expr) {
    var atom = '(?:\\w+\\([^()]*\\)|\\([^()]*\\)|\\w+)';
    var re = new RegExp('(' + atom + ')\\s*%\\s*(' + atom + ')');
    var prev = null;
    while (prev !== expr) {
      prev = expr;
      expr = expr.replace(re, 'pymod(($1),($2))');
    }
    return expr;
  }

  // Python の連鎖比較 a <= b <= c を (a <= b) && (b <= c) に展開（トップレベルの比較演算子が
  // 2個以上のときのみ）。括弧内（深さ>0）の比較は対象外。and/or/not 変換前に実行する。
  function expandChainedComparison(expr) {
    // トップレベル（深さ0）に and/or があれば、比較演算子が複数あっても連鎖比較ではなく
    // 論理結合（例: "(q1%10)>0 and (q2%10)>0"）。この場合は展開しない（各比較はJSでそのまま可）。
    // Python の連鎖比較 "a<=b<=c" は比較演算子の間に論理演算子を挟まない、という性質を使う。
    var d = 0;
    for (var p = 0; p < expr.length; p++) {
      var c0 = expr[p];
      if (c0 === '(') d++;
      else if (c0 === ')') d--;
      else if (d === 0 && /[a-zA-Z_]/.test(c0)) {
        var word = expr.slice(p).match(/^[a-zA-Z_]\w*/)[0];
        if (word === 'and' || word === 'or') return expr;
        p += word.length - 1;
      }
    }
    var ops = [];  // {pos, len, op}
    var depth = 0;
    for (var i = 0; i < expr.length; i++) {
      var ch = expr[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0) {
        var two = expr.substr(i, 2);
        if (two === '<=' || two === '>=' || two === '==' || two === '!=') { ops.push({ pos: i, len: 2, op: two }); i++; }
        else if (ch === '<' || ch === '>') { ops.push({ pos: i, len: 1, op: ch }); }
      }
    }
    if (ops.length < 2) return expr;
    var operands = [];
    var start = 0;
    for (var j = 0; j < ops.length; j++) {
      operands.push(expr.slice(start, ops[j].pos).trim());
      start = ops[j].pos + ops[j].len;
    }
    operands.push(expr.slice(start).trim());
    var parts = [];
    for (var k = 0; k < ops.length; k++) {
      parts.push('(' + operands[k] + ' ' + ops[k].op + ' ' + operands[k + 1] + ')');
    }
    return parts.join(' && ');
  }

  function pyExprToJs(expr) {
    var out = expr.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/);
    if (out) expr = '(' + out[2] + ') ? (' + out[1] + ') : (' + out[3] + ')';
    expr = translateFloorDiv(expr);
    expr = translateMod(expr);
    expr = expandChainedComparison(expr);
    return expr
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!');
  }
  // Python互換の剰余（除数>0で常に非負）。translateMod が生成する pymod の実体。
  function pymod(a, b) { return ((a % b) + b) % b; }
  function evalExpr(expr, env) {
    var keys = Object.keys(env);
    var vals = keys.map(function (k) { return env[k]; });
    var jsExpr = pyExprToJs(expr);
    // eslint-disable-next-line no-new-func
    var fn = new Function('abs', 'max', 'min', 'pymod', 'round_half_up', 'round_range_lower', 'round_range_upper_excl',
      keys.join(','), 'return (' + jsExpr + ');');
    return fn.apply(null, [Math.abs, Math.max, Math.min, pymod, roundHalfUp, roundRangeLower, roundRangeUpperExcl].concat(vals));
  }

  // ---- スロット解決 ----
  function effectiveSlots(pattern, unitId) {
    var slots = {};
    Object.keys(pattern.slots || {}).forEach(function (k) {
      slots[k] = Object.assign({}, pattern.slots[k]);
    });
    var ov = ((pattern.unit_range_overrides || {})[unitId || ''] || {});
    Object.keys(ov).forEach(function (k) {
      var spec = ov[k];
      if (slots.hasOwnProperty(k) && spec && typeof spec === 'object' && !Array.isArray(spec)) {
        Object.assign(slots[k], spec);
      }
    });
    return slots;
  }

  function effectiveConstraints(pattern, unitId) {
    var ov = ((pattern.unit_range_overrides || {})[unitId || ''] || {});
    var repl = ov.constraints_replace || {};
    return (pattern.value_constraints || []).map(function (c) {
      return repl[c.rule] ? Object.assign({}, c, repl[c.rule]) : c;
    });
  }

  // unit_range_overrides[unitId].lexicon_filters があればそれを優先、
  // 無ければパターン直下のlexicon_filters、どちらも無ければ空オブジェクト。
  // （override側があるかどうかで丸ごと差し替え。深いマージはしない）
  function effectiveLexiconFilters(pattern, unitId) {
    var ov = ((pattern.unit_range_overrides || {})[unitId || ''] || {});
    return ov.lexicon_filters || pattern.lexicon_filters || {};
  }

  function filteredContainerSets(pattern, lex, unitId) {
    var sets = lex.container_sets;
    var f = effectiveLexiconFilters(pattern, unitId).container_sets || {};
    if (f.exclude_if) {
      var ex = f.exclude_if;
      sets = sets.filter(function (s) {
        return !Object.keys(ex).every(function (k) { return s[k] === ex[k]; });
      });
    }
    return sets;
  }

  function filteredObjectCounterPairs(pattern, lex, unitId) {
    var pairs = lex.object_counter_pairs;
    var f = effectiveLexiconFilters(pattern, unitId).object_counter_pairs || {};
    if (f.include_objects) {
      var inc = f.include_objects;
      pairs = pairs.filter(function (p) { return inc.indexOf(p.object) !== -1; });
    }
    return pairs;
  }

  function sampleSlotValue(spec) {
    if (spec.choices) return randChoice(spec.choices);
    var range = spec.base_range || spec.range;
    var step = spec.step || 1;
    return randRange(range[0], range[1], step);
  }

  // ---- 数値サンプリング（棄却法） ----
  function sampleNumeric(pattern, unitId, maxTries) {
    maxTries = maxTries || 3000;
    var slots = effectiveSlots(pattern, unitId);
    var numeric = {};
    Object.keys(slots).forEach(function (k) {
      if (slots[k].type === 'int' || slots[k].choice_int) numeric[k] = slots[k];
    });
    var quants = pattern.quantity_slots || {};
    var constraints = effectiveConstraints(pattern, unitId);
    for (var t = 0; t < maxTries; t++) {
      var env = {};
      Object.keys(numeric).forEach(function (k) { env[k] = sampleSlotValue(numeric[k]); });
      Object.keys(quants).forEach(function (k) { env[k] = sampleSlotValue(quants[k]); });
      var ok = constraints.every(function (c) { return evalExpr(c.expr, env); });
      if (ok) return env;
    }
    throw new Error(pattern.pattern_id + ' (unit=' + (unitId || '') + '): 制約充足不能（バンク設計エラー）');
  }

  // ---- 語彙スロット解決・派生スロット・答え・表示整形 ----
  function buildEnv(pattern, unitId, lex) {
    var env = Object.assign({}, sampleNumeric(pattern, unitId));
    var names = Object.keys(pattern.slots || {});

    // --- 汎用レキシコン束縛（generate_poc_v07.py build_env と同一）---
    // from形式: "set[j].field"(辞書) / "set[i][0]"(リストペア) / "set" / "set(distinct)"
    // 同一インデックス変数を共有するスロットは同じアイテムから取る。
    // attribute_pairs は dict形状のため list_groups では解決せず、下の attr_a/b 専用処理に迂回。
    var dictGroups = {}, listGroups = {}, simple = {}, distinct = [];
    Object.keys(pattern.slots || {}).forEach(function (name) {
      var f = (pattern.slots[name] || {}).from;
      if (!f) return;
      var m = f.match(/^(\w+)\[(\w)\]\.(\w+)$/);
      if (m) { (dictGroups[m[1] + ' ' + m[2]] = dictGroups[m[1] + ' ' + m[2]] || { set: m[1], fields: {} }).fields[name] = m[3]; return; }
      m = f.match(/^(\w+)\[(\w)\]\[(\d+)\]$/);
      if (m) {
        if (m[1] !== 'attribute_pairs') {
          (listGroups[m[1] + ' ' + m[2]] = listGroups[m[1] + ' ' + m[2]] || { set: m[1], fields: {} }).fields[name] = parseInt(m[3], 10);
        }
        return;
      }
      m = f.match(/^(\w+)\(distinct\)$/);
      if (m) { distinct.push([name, m[1]]); return; }
      simple[name] = f;
    });

    var objectBinding = null;  // attr整合で object を棄却・再抽選する場合に使う
    Object.keys(dictGroups).forEach(function (key) {
      var g = dictGroups[key];
      var item = (g.set === 'container_sets')
        ? randChoice(filteredContainerSets(pattern, lex, unitId))
        : randChoice(lex[g.set]);
      Object.keys(g.fields).forEach(function (slotName) {
        env[slotName] = item.hasOwnProperty(g.fields[slotName]) ? item[g.fields[slotName]] : '';
      });
      if (g.set === 'object_counter_pairs') objectBinding = g;
    });
    Object.keys(listGroups).forEach(function (key) {
      var g = listGroups[key];
      var item = randChoice(lex[g.set]);
      Object.keys(g.fields).forEach(function (slotName) { env[slotName] = item[g.fields[slotName]]; });
    });
    Object.keys(simple).forEach(function (slotName) { env[slotName] = randChoice(lex[simple[slotName]]); });
    distinct.forEach(function (pairSN) {
      var slotName = pairSN[0], setName = pairSN[1];
      var used = {};
      Object.keys(env).forEach(function (k) { if (typeof env[k] === 'string') used[env[k]] = true; });
      var pool = lex[setName].filter(function (x) { return !used[x]; });
      if (!pool.length) pool = lex[setName];
      env[slotName] = randChoice(pool);
    });
    // 文字列choicesスロット（型指定なし・from指定なし）
    Object.keys(pattern.slots || {}).forEach(function (name) {
      var spec = pattern.slots[name] || {};
      if (!env.hasOwnProperty(name) && spec.choices && spec.type !== 'int') env[name] = randChoice(spec.choices);
    });

    // --- g02互換の特殊ケース（fromで解決済みならスキップ）---
    if (names.indexOf('actor') !== -1 && !env.hasOwnProperty('actor')) {
      env.actor = randChoice(lex.actors);
    }
    if (names.indexOf('actor_c') !== -1 && !env.hasOwnProperty('actor_c')) {
      var three = randSample(lex.actors, 3);
      env.actor_a = three[0]; env.actor_b = three[1]; env.actor_c = three[2];
    } else if (names.indexOf('actor_a') !== -1 && !env.hasOwnProperty('actor_a')) {
      var pr = randChoice(lex.actor_pairs);
      env.actor_a = pr[0]; env.actor_b = pr[1];
    }
    if (names.indexOf('attr_a') !== -1 && !env.hasOwnProperty('attr_a')) {
      // attribute_pairs は dict形状 {"pair":[a,b],"type":...}。属性ペアの型フィルタ:
      //  (1) lexicon_filters.attribute_pairs.include_types があれば最優先（例:求差は色のみ）。
      //  (2) 無ければ選択済み object の attr_types に合致する型のみ（「大きいおり紙」回避）。
      //      合致ゼロなら object を棄却して再抽選。(3) どちらも無ければ全体から選ぶ。
      var lf = effectiveLexiconFilters(pattern, unitId);
      var inc = (lf.attribute_pairs || {}).include_types || null;
      var allowedTypesOf = function () {
        if (inc) return inc;
        if (env.object) {
          var ocp = lex.object_counter_pairs.filter(function (o) { return o.object === env.object; })[0];
          if (ocp && ocp.attr_types) return ocp.attr_types;
        }
        return null;
      };
      var poolOf = function (types) {
        return types ? lex.attribute_pairs.filter(function (ap) { return types.indexOf(ap.type) !== -1; }) : lex.attribute_pairs;
      };
      var types = allowedTypesOf();
      var apPool = poolOf(types);
      var tries = 0;
      while (!apPool.length && !inc && objectBinding && env.object && tries < 3000) {
        var it = randChoice(lex[objectBinding.set]);
        Object.keys(objectBinding.fields).forEach(function (slotName) {
          env[slotName] = it.hasOwnProperty(objectBinding.fields[slotName]) ? it[objectBinding.fields[slotName]] : '';
        });
        types = allowedTypesOf(); apPool = poolOf(types); tries++;
      }
      var ap = randChoice(apPool);
      env.attr_a = ap.pair[0]; env.attr_b = ap.pair[1];
    }
    if (names.indexOf('verb_use') !== -1 && !env.verb_use) env.verb_use = 'つかいました';

    // context_set: 文脈セットを1つ選び、format_fields をスロット値で整形して ctx_* に注入
    var cs = pattern.context_set;
    if (cs) {
      var ctx = randChoice(lex[cs.from]);
      var fmtFields = cs.format_fields || [];
      cs.fields.forEach(function (fname) {
        var v = ctx[fname];
        env['ctx_' + fname] = (fmtFields.indexOf(fname) !== -1) ? formatTemplate(v, env) : v;
      });
    }

    // 派生スロット（数値・文字列とも参照可）
    Object.keys(pattern.computed_slots || {}).forEach(function (name) {
      env[name] = evalExpr(pattern.computed_slots[name].formula, env);
    });

    // 答え（整数値のみをformulaに渡す＝Pythonのisinstance(v,int)フィルタと同義）
    var intEnv = {};
    Object.keys(env).forEach(function (k) {
      if (typeof env[k] === 'number' && Number.isInteger(env[k])) intEnv[k] = env[k];
    });
    env.ans = evalExpr(pattern.answer_formula, intEnv);

    // fraction_display: {表示名: [分子スロット名, 分母スロット名]} → 整形文字列を注入
    var fd = pattern.fraction_display || {};
    Object.keys(fd).forEach(function (dispName) {
      env[dispName] = fmtFraction(env[fd[dispName][0]], env[fd[dispName][1]]);
    });
    // mixed_display(v0.8): 帯分数表記を注入
    var md = pattern.mixed_display || {};
    Object.keys(md).forEach(function (dispName) {
      env[dispName] = fmtMixed(env[md[dispName][0]], env[md[dispName][1]]);
    });

    // 数量スロットの表示文字列を自動生成
    var quants = pattern.quantity_slots || {};
    Object.keys(quants).forEach(function (name) {
      env[name + '_disp'] = FORMATTERS[quants[name].unit_system](env[name]);
      if (quants[name].unit_system === 'h_min' || quants[name].unit_system === 'raw_min') {
        env[name + '_min'] = env[name];
      }
    });

    // computed_slotsのうち数量系（big/small等）もanswer_unit_systemで整形
    var aus = pattern.answer_unit_system;
    if (aus) {
      env.ans_disp = FORMATTERS[aus](env.ans);
      Object.keys(pattern.computed_slots || {}).forEach(function (name) {
        if (typeof env[name] === 'number' && Number.isInteger(env[name])) {
          env[name + '_disp'] = FORMATTERS[aus](env[name]);
        }
      });
    }
    return env;
  }

  // ---- テンプレート充填（Pythonのstr.format(**env)相当） ----
  function formatTemplate(tmpl, env) {
    return tmpl.replace(/\{(\w+)\}/g, function (m, name) {
      if (!Object.prototype.hasOwnProperty.call(env, name)) {
        throw new Error('未定義のプレースホルダ: {' + name + '}');
      }
      return String(env[name]);
    });
  }

  // figure_params(v0.8): "{slot}" を env で解決（本文と同一env→図中数値と問題文が食い違わない）。
  function resolveFigureParams(fp, env) {
    if (Array.isArray(fp)) return fp.map(function (v) { return resolveFigureParams(v, env); });
    if (fp && typeof fp === 'object') {
      var o = {};
      Object.keys(fp).forEach(function (k) { o[k] = resolveFigureParams(fp[k], env); });
      return o;
    }
    if (typeof fp === 'string') {
      var m = fp.match(/^\{(\w+)\}$/);
      if (m && Object.prototype.hasOwnProperty.call(env, m[1])) return env[m[1]];
    }
    return fp;
  }

  function makeProblem(pattern, unitId, lex) {
    var env = buildEnv(pattern, unitId, lex);
    var tmpl = randChoice(pattern.sentence_templates);
    var problem = formatTemplate(tmpl, env);
    var answer = formatTemplate(pattern.answer_template, env);
    var figure = pattern.figure_params ? resolveFigureParams(pattern.figure_params, env) : null;
    return { env: env, problem: problem, answer: answer, figure: figure };
  }

  // ---- 検証（漢字/本文数値の由来/答えの正値性） ----
  function verify(pattern, env, problem) {
    var bad = kanjiCheck(problem, allowedKanji(pattern));

    var fdKeys = pattern.fraction_display || {};
    var mdKeys = pattern.mixed_display || {};
    var allowedNums = {};
    (pattern.template_number_constants || []).forEach(function (n) { allowedNums[n] = true; });
    Object.keys(env).forEach(function (k) {
      var v = env[k];
      if (typeof v === 'number' && Number.isInteger(v) &&
        (Object.prototype.hasOwnProperty.call(pattern.slots || {}, k) ||
          Object.prototype.hasOwnProperty.call(pattern.quantity_slots || {}, k))) {
        allowedNums[v] = true;
      }
    });
    Object.keys(env).forEach(function (k) {
      if (k.slice(-5) === '_disp' || k.slice(-4) === '_min' ||
        Object.prototype.hasOwnProperty.call(fdKeys, k) ||
        Object.prototype.hasOwnProperty.call(mdKeys, k)) {
        var matches = String(env[k]).match(/\d+/g) || [];
        matches.forEach(function (m) { allowedNums[parseInt(m, 10)] = true; });
      }
    });
    var textNums = (problem.match(/\d+/g) || []).map(function (x) { return parseInt(x, 10); });
    var numsFromSlots = textNums.every(function (n) { return Object.prototype.hasOwnProperty.call(allowedNums, n); });

    return {
      checks: {
        kanji_ok: bad.length === 0,
        nums_from_slots: numsFromSlots,
        answer_positive: env.ans > 0
      },
      bad: bad
    };
  }

  // ============================================================
  // 経路C（テンプレート登録時）専用ユーティリティ。ランタイムでは呼ばない。
  // checkConsistency_retirement_plan.md §6.1 ⑤⑥に対応。
  // ============================================================
  function lintTemplates(pattern) {
    var issues = [];

    // ⑤ 文末が問い（疑問文・指示文）の形になっているか
    // 「か。」は「ですか/ますか/でしょうか/ましたか」等をすべて包含する
    // 一般形として判定する（動詞活用まで個別に列挙しない）。
    var endingRe = /(か|なさい|ください|ましょう)。?$/;
    (pattern.sentence_templates || []).forEach(function (tmpl, i) {
      if (!endingRe.test(tmpl.trim())) {
        issues.push('sentence_templates[' + i + ']が疑問文・指示文の形で終わっていません: "' + tmpl + '"');
      }
    });

    // ⑥ プレースホルダのホワイトリスト照合
    var allowed = {};
    Object.keys(pattern.slots || {}).forEach(function (k) { allowed[k] = true; });
    Object.keys(pattern.quantity_slots || {}).forEach(function (k) {
      allowed[k] = true; // 生値そのもの（raw_min等、整形不要な場合に直接参照される）
      allowed[k + '_disp'] = true;
      allowed[k + '_min'] = true;
    });
    // 語彙解決（buildEnv）で追加されうるスロット名
    [
      'actor', 'actor_a', 'actor_b', 'actor_c',
      'container', 'cont_counter', 'object', 'counter', 'verb_on', 'exist', 'verb_use',
      'attr_a', 'attr_b'
    ].forEach(function (k) { allowed[k] = true; });

    // 答え・computed_slots由来の値は本文（sentence_templates）に書いてはいけない
    var forbidden = { ans: true, ans_disp: true };
    Object.keys(pattern.computed_slots || {}).forEach(function (name) {
      forbidden[name] = true;
      forbidden[name + '_disp'] = true;
    });

    (pattern.sentence_templates || []).forEach(function (tmpl, i) {
      var placeholders = tmpl.match(/\{(\w+)\}/g) || [];
      placeholders.forEach(function (ph) {
        var name = ph.slice(1, -1);
        if (forbidden[name]) {
          issues.push('sentence_templates[' + i + ']に答え・派生値のプレースホルダ{' + name + '}が含まれています（本文に答えを書いてはいけません）');
        } else if (!allowed[name]) {
          issues.push('sentence_templates[' + i + ']に未宣言のプレースホルダ{' + name + '}が含まれています（宣言済みスロットのみ許可）');
        }
      });
    });

    return { ok: issues.length === 0, issues: issues };
  }

  var PatternGen = {
    FORMATTERS: FORMATTERS,
    fmtFraction: fmtFraction,
    fmtMixed: fmtMixed,
    roundHalfUp: roundHalfUp,
    roundRangeLower: roundRangeLower,
    roundRangeUpperExcl: roundRangeUpperExcl,
    resolveFigureParams: resolveFigureParams,
    allowedKanji: allowedKanji,
    kanjiCheck: kanjiCheck,
    effectiveSlots: effectiveSlots,
    effectiveConstraints: effectiveConstraints,
    filteredContainerSets: filteredContainerSets,
    filteredObjectCounterPairs: filteredObjectCounterPairs,
    effectiveLexiconFilters: effectiveLexiconFilters,
    sampleNumeric: sampleNumeric,
    buildEnv: buildEnv,
    formatTemplate: formatTemplate,
    makeProblem: makeProblem,
    verify: verify,
    lintTemplates: lintTemplates,
    // テスト用に公開
    evalExpr: evalExpr,
    randChoice: randChoice,
    randSample: randSample,
    randRange: randRange
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternGen;
  } else {
    root.PatternGen = PatternGen;
  }
})(typeof window !== 'undefined' ? window : globalThis);
