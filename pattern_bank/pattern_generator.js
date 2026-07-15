// ============================================================
// Pandora パターンバンク ジェネレータ（JS移植版）
// generate_poc_v06.py の1:1移植。挙動を変えないこと。
// ブラウザ<script>読み込みとNode.js(require)の両方で動作する。
// ============================================================
(function (root) {
  'use strict';

  // ---- 学年配当漢字（小1・小2）。generate_poc_v06.pyのG01/G02と同一 ----
  var G01 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
  var G02 = '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';
  var ALLOWED = {};
  (G01 + G02).split('').forEach(function (c) { ALLOWED[c] = true; });

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
    raw_min: function (b) { return String(b); }
  };

  function kanjiCheck(text) {
    var bad = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var code = ch.codePointAt(0);
      if (code >= 0x4e00 && code <= 0x9fff && !ALLOWED[ch]) bad.push(ch);
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
  function pyExprToJs(expr) {
    var out = expr.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/);
    if (out) expr = '(' + out[2] + ') ? (' + out[1] + ') : (' + out[3] + ')';
    return expr
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!');
  }
  function evalExpr(expr, env) {
    var keys = Object.keys(env);
    var vals = keys.map(function (k) { return env[k]; });
    var jsExpr = pyExprToJs(expr);
    // eslint-disable-next-line no-new-func
    var fn = new Function('abs', 'max', 'min', keys.join(','), 'return (' + jsExpr + ');');
    return fn.apply(null, [Math.abs, Math.max, Math.min].concat(vals));
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
      if (slots[k].type === 'int') numeric[k] = slots[k];
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

    if (names.indexOf('actor') !== -1) {
      env.actor = randChoice(lex.actors);
    }
    if (names.indexOf('actor_c') !== -1) {
      var three = randSample(lex.actors, 3);
      env.actor_a = three[0]; env.actor_b = three[1]; env.actor_c = three[2];
    } else if (names.indexOf('actor_a') !== -1) {
      var pair = randChoice(lex.actor_pairs);
      env.actor_a = pair[0]; env.actor_b = pair[1];
    }

    if (names.indexOf('container') !== -1) {
      var cs = randChoice(filteredContainerSets(pattern, lex, unitId));
      ['container', 'cont_counter', 'object', 'counter', 'verb_on', 'exist'].forEach(function (k) {
        if (cs.hasOwnProperty(k)) env[k] = cs[k];
      });
    } else if (names.indexOf('object') !== -1) {
      var objPool = filteredObjectCounterPairs(pattern, lex, unitId);
      if (names.indexOf('attr_a') !== -1) {
        // このパターンはattr_a/bも使う（例: 求補）。属性の型
        // （color/size）に一切合致しないobjectは、大きい/小さい・赤い/青い
        // 等の組み合わせが不自然になるため候補から棄却する。
        objPool = objPool.filter(function (o) {
          var types = o.attr_types || [];
          return lex.attribute_pairs.some(function (ap) { return types.indexOf(ap.type) !== -1; });
        });
      }
      var p = randChoice(objPool);
      env.object = p.object;
      env.counter = p.counter;
      env.verb_use = p.verb_use || 'つかいました';
    }

    if (names.indexOf('attr_a') !== -1) {
      // 属性ペアの型フィルタ: (1) lexicon_filters.attribute_pairs.include_types
      // があれば最優先（例: 求差は色属性のみ）。(2) 無ければ、直前に選んだ
      // objectのattr_typesに合致する型のみ使う（例: おり紙→color限定で
      // 「大きいおり紙」のような不自然な組み合わせを避ける）。
      // (3) objectを使わないパターン（テープ等テンプレート内固定語）で
      // フィルタも無ければ、attribute_pairs全体から選ぶ（従来通り）。
      var allowedTypes = null;
      var lf = effectiveLexiconFilters(pattern, unitId);
      if ((lf.attribute_pairs || {}).include_types) {
        allowedTypes = lf.attribute_pairs.include_types;
      } else if (env.object) {
        var ocp = lex.object_counter_pairs.filter(function (o) { return o.object === env.object; })[0];
        if (ocp && ocp.attr_types) allowedTypes = ocp.attr_types;
      }
      var apPool = allowedTypes
        ? lex.attribute_pairs.filter(function (ap) { return allowedTypes.indexOf(ap.type) !== -1; })
        : lex.attribute_pairs;
      var ap = randChoice(apPool);
      env.attr_a = ap.pair[0]; env.attr_b = ap.pair[1];
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

  function makeProblem(pattern, unitId, lex) {
    var env = buildEnv(pattern, unitId, lex);
    var tmpl = randChoice(pattern.sentence_templates);
    var problem = formatTemplate(tmpl, env);
    var answer = formatTemplate(pattern.answer_template, env);
    return { env: env, problem: problem, answer: answer };
  }

  // ---- 検証（漢字/本文数値の由来/答えの正値性） ----
  function verify(pattern, env, problem) {
    var bad = kanjiCheck(problem);

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
      if (k.slice(-5) === '_disp' || k.slice(-4) === '_min') {
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
