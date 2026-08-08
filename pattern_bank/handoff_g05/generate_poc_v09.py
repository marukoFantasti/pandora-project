# -*- coding: utf-8 -*-
"""
パターンバンク PoC ジェネレータ v0.9
v0.8 + 小5対応（すべて既存 g02/g03/g04 に非干渉＝新フィールドを使うパターンだけで発火。
乱数消費列は不変: 追加はすべて「サンプリング後の整形/検証」か「未参照の辞書キー追加」のみ）
  - gcd/lcm/reduce_num/reduce_den: 整数演算のみ（Euclid反復。math.gcd不使用＝JS移植と同一手順）。
    SAFEに追加。シード非依存の等価性ベクター helpers_test_vectors.json で Python/JS 両実装を照合。
  - FORMATTERS に dec2/dec3（固定小数点スケール100/1000。末尾ゼロ省略: 1200→"12"）、
    percent_pm（千分率→百分率表記 1150→"115%", 25→"2.5%"）、
    buai_pm（千分率→歩合表記 356→"3割5分6厘"）を追加。
    割合の内部表現は千分率整数（厘=0.1%まで整数で閉じる）。
  - reduced_fraction_display / reduced_mixed_display: gcdで約分してから
    fmt_fraction / fmt_mixed で整形（異分母分数の加減・約分単元用）。
  - 漢字ファイルを argv[2] で差し替え可能に（省略時は従来どおり kyoiku_kanji_g1to4.json
    ＝既存挙動不変。g05実行時は kyoiku_kanji_g1to5.json を指定）。
--- 以下 v0.8 ---
v0.7 + 小4対応（すべて既存 g02/g03 に非干渉＝新フィールドを使うパターンだけで発火）
  - がい数: round_half_up(n, place)（四捨五入・整数演算のみ。浮動小数点round禁止）と
    round_range_lower/upper_excl（「四捨五入して X になる整数範囲」の以上/未満）。SAFEに追加。
  - 帯分数: fmt_mixed(num,den)（"aとb/c"。b=0で整数落ち・a=0で真分数）。mixed_display 機構。
  - figure_params: kind+スロット参照。make_problem が env で解決して出力（採点は数値照合のまま）。
    ★図と本文は同一 env から駆動されるため、図中数値と問題文の食い違いが構造的に起きない。
  - answer_structure に round_range（がい数の範囲解答「X以上Y未満」）を追加（comparison と同格）。
--- 以下 v0.7 ---
v0.6 + 小3対応
  - 配当漢字を kyoiku_kanji_g1to3.json (MEXT2017/fnshr/kyo-kan CC0) から読込、
    パターンの kanji_policy.allowed_grades に従い検証
  - FORMATTERS に km_m / kg_g を追加(fmt_compound factor=1000)
  - fmt_fraction を追加(同分母分数・セッション2で使用)
  - context_set 機構: レキシコンの文脈セット(ceil/floor等)を選び、
    format_fields をスロット値で事前整形して ctx_* として注入
  - answer_formula / computed_slots / constraints で // と % を解禁(evalが元々対応)
  - 内部表現: 最小単位の整数(mm / dL / 分 / 0時からの分)
  - 表示整形: unit_system 別関数。0の下位単位は省略(90mm→"9cm")
  - 各quantityスロット q に対し {q}_disp(整形済み文字列) を自動生成
  - 答えは answer_formula(整数演算) → answer_unit_system で整形 → {ans_disp}
"""
import json, random, re

import sys
BANK_FILE = sys.argv[1] if len(sys.argv) > 1 else "patterns_g03.json"
with open(BANK_FILE, encoding="utf-8") as f:
    bank = json.load(f)
LEX = bank["shared_lexicon"]

KANJI_FILE = sys.argv[2] if len(sys.argv) > 2 else "kyoiku_kanji_g1to4.json"
with open(KANJI_FILE, encoding="utf-8") as f:
    _KJ = json.load(f)
KANJI_BY_GRADE = {g: set(chars) for g, chars in _KJ.items()}
DEFAULT_ALLOWED = KANJI_BY_GRADE["g01"] | KANJI_BY_GRADE["g02"]

def allowed_kanji(pattern):
    kp = pattern.get("kanji_policy", {})
    grades = kp.get("allowed_grades")
    base = DEFAULT_ALLOWED if not grades else set().union(*(KANJI_BY_GRADE[g] for g in grades))
    # allowed_extra(v0.8): 配当外だが当該学年の教科書で（ふりがな付きで）用いる専門用語の字を
    # 個別に許可する（例: 四捨五入の「捨」=g6、仮分数の「仮」=g5）。既存2学年は未使用＝非干渉。
    extra = set(kp.get("allowed_extra", ""))
    return base | extra

# ===== v0.8 追加ヘルパ（すべて整数演算・言語間挙動差なし。既存2学年は未参照＝非干渉）=====
def round_half_up(n, place):
    """四捨五入して place の位まで（place=1000で千の位まで）。整数演算のみ（浮動小数点round禁止）。"""
    n, place = int(n), int(place)
    q, r = divmod(n, place)
    if r * 2 >= place:   # 端数がちょうど半分以上なら切り上げ（5は切り上げ）
        q += 1
    return q * place

def round_range_lower(x, place):
    """四捨五入して x になる整数範囲の下限（以上）。x は place の倍数前提。"""
    return int(x) - int(place) // 2

def round_range_upper_excl(x, place):
    """同・上限（未満）。以下表記が要る場合は upper_excl-1 を使う。"""
    return int(x) + int(place) // 2

SAFE = {"abs": abs, "max": max, "min": min,
        "round_half_up": round_half_up,
        "round_range_lower": round_range_lower,
        "round_range_upper_excl": round_range_upper_excl}

# ===== v0.9 追加ヘルパ（すべて整数演算・Euclid反復。math.gcd不使用＝JS実装と同一手順で
#        言語間挙動差なし。等価性は helpers_test_vectors.json のシード非依存ベクターで照合。
#        既存3学年バンクは未参照＝非干渉） =====
def gcd(a, b):
    """最大公約数（Euclid反復・正整数前提）。"""
    a, b = int(a), int(b)
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    """最小公倍数。オーバーフロー回避のため先に割る（JS実装と同一順序）。"""
    a, b = int(a), int(b)
    return a // gcd(a, b) * b

def reduce_num(num, den):
    """約分後の分子。"""
    return int(num) // gcd(num, den)

def reduce_den(num, den):
    """約分後の分母。"""
    return int(den) // gcd(num, den)

SAFE.update({"gcd": gcd, "lcm": lcm,
             "reduce_num": reduce_num, "reduce_den": reduce_den})

def fmt_mixed(num, den):
    """帯分数表記。num==0→"0"、割り切れ→整数、whole==0→真分数"rem/den"、他→"aとb/c"（g03分数表記と一貫）。"""
    num, den = int(num), int(den)
    if num == 0:
        return "0"
    whole, rem = divmod(num, den)
    if rem == 0:
        return str(whole)
    if whole == 0:
        return f"{rem}/{den}"
    return f"{whole}と{rem}/{den}"

def resolve_figure_params(fp, env):
    """figure_params の "{slot}" を env で解決（本文と同一envなので図中数値と問題文が食い違わない）。"""
    if isinstance(fp, dict):
        return {k: resolve_figure_params(v, env) for k, v in fp.items()}
    if isinstance(fp, list):
        return [resolve_figure_params(v, env) for v in fp]
    if isinstance(fp, str):
        m = re.fullmatch(r"\{(\w+)\}", fp)
        if m and m.group(1) in env:
            return env[m.group(1)]
    return fp

# ============ 単位系と整形 ============
def fmt_compound(base, factor, big_u, small_u):
    """複名数整形。0の下位単位は省略: (95,10,cm,mm)→'9cm5mm', 90→'9cm', 5→'5mm'"""
    big, small = base // factor, base % factor
    if big and small: return f"{big}{big_u}{small}{small_u}"
    if big:           return f"{big}{big_u}"
    return f"{small}{small_u}"

def fmt_clock(base):
    """0時からの分 → 午前/午後 h時m分(m=0なら'h時')"""
    ampm = "午前" if base < 720 else "午後"
    h = (base // 60) % 12
    if h == 0: h = 12
    m = base % 60
    return f"{ampm}{h}時{m}分" if m else f"{ampm}{h}時"

FORMATTERS = {
    "cm_mm":  lambda b: fmt_compound(b, 10, "cm", "mm"),
    "m_cm":   lambda b: fmt_compound(b, 100, "m", "cm"),
    "L_dL":   lambda b: fmt_compound(b, 10, "L", "dL"),
    "h_min":  lambda b: fmt_compound(b, 60, "時間", "分"),
    "clock":  fmt_clock,
    "raw_min": lambda b: str(b),
    "km_m":   lambda b: fmt_compound(b, 1000, "km", "m"),
    "kg_g":   lambda b: fmt_compound(b, 1000, "kg", "g"),
    "L_mL":   lambda b: fmt_compound(b, 1000, "L", "mL"),
    "m_cm100": lambda b: fmt_compound(b, 100, "m", "cm"),
    "dec1":   lambda b: f"{b // 10}.{b % 10}" if b % 10 else str(b // 10),
    # --- v0.9追加（既存3学年は未参照＝非干渉） ---
    "dec2":   lambda b: fmt_dec(b, 100),
    "dec3":   lambda b: fmt_dec(b, 1000),
    "percent_pm": lambda p: fmt_percent_pm(p),
    "buai_pm":    lambda p: fmt_buai_pm(p),
}

def fmt_dec(b, scale):
    """固定小数点整形（v0.9）。b=スケール整数。末尾ゼロ省略: (1200,100)→'12', (1230,100)→'12.3'"""
    b, scale = int(b), int(scale)
    whole, frac = divmod(b, scale)
    width = len(str(scale)) - 1
    s = str(frac).zfill(width).rstrip("0")
    return f"{whole}.{s}" if s else str(whole)

def fmt_percent_pm(p):
    """千分率整数→百分率表記（v0.9）。1150→'115%', 25→'2.5%', 5→'0.5%'"""
    p = int(p)
    return f"{p // 10}%" if p % 10 == 0 else f"{p // 10}.{p % 10}%"

def fmt_buai_pm(p):
    """千分率整数→歩合表記（v0.9）。356→'3割5分6厘'。0の位は省略: 350→'3割5分', 300→'3割'"""
    p = int(p)
    wari, rest = divmod(p, 100)
    bu, rin = divmod(rest, 10)
    out = ""
    if wari: out += f"{wari}割"
    if bu:   out += f"{bu}分"
    if rin:  out += f"{rin}厘"
    return out or "0"

def fmt_fraction(num, den):
    """同分母分数の整形(セッション2用)。num==denは1、num==0は0。仮分数はそのまま。"""
    if num == 0: return "0"
    if num == den: return "1"
    return f"{num}/{den}"

def kanji_check(t, allowed):
    return [c for c in t if '\u4e00' <= c <= '\u9fff' and c not in allowed]

def effective_slots(pattern, unit_id=None):
    slots = {k: dict(v) for k, v in pattern["slots"].items()}
    ov = pattern.get("unit_range_overrides", {}).get(unit_id or "", {})
    for k, spec in ov.items():
        if k in slots and isinstance(spec, dict):
            slots[k].update(spec)
    return slots

def filtered_container_sets(pattern):
    sets_ = LEX["container_sets"]
    f = pattern.get("lexicon_filters", {}).get("container_sets", {})
    if "exclude_if" in f:
        sets_ = [s for s in sets_
                 if not all(s.get(k) == v for k, v in f["exclude_if"].items())]
    return sets_

def sample_slot_value(spec):
    if "choices" in spec:
        return random.choice(spec["choices"])
    lo, hi = spec.get("base_range") or spec["range"]
    step = spec.get("step", 1)
    return random.randrange(lo, hi + 1, step)

def effective_constraints(pattern, unit_id=None):
    ov = pattern.get("unit_range_overrides", {}).get(unit_id or "", {})
    repl = ov.get("constraints_replace", {})
    out = []
    for c in pattern["value_constraints"]:
        out.append({**c, **repl[c["rule"]]} if c["rule"] in repl else c)
    return out

def sample_numeric(pattern, unit_id=None, max_tries=3000):
    slots = effective_slots(pattern, unit_id)
    numeric = {k: sp for k, sp in slots.items()
               if sp.get("type") == "int" or sp.get("choice_int")}
    quants = pattern.get("quantity_slots", {})
    constraints = effective_constraints(pattern, unit_id)
    for _ in range(max_tries):
        env = {k: sample_slot_value(sp) for k, sp in numeric.items()}
        env.update({k: sample_slot_value(sp) for k, sp in quants.items()})
        if all(eval(c["expr"], SAFE, dict(env)) for c in constraints):
            return env
    raise RuntimeError(f"{pattern['pattern_id']} (unit={unit_id}): 制約充足不能(バンク設計エラー)")

def build_env(pattern, unit_id=None):
    env = dict(sample_numeric(pattern, unit_id))
    names = pattern["slots"].keys()
    # --- 汎用レキシコン束縛: "from": "set_name[j].field" / "set_name" を解釈 ---
    # 同一セット名の[j]参照は1アイテムを共有(object と counter の対応保証)
    # from形式: "set[j].field"(辞書アイテム) / "set[i][0]"(リストペア) / "set" / "set(distinct)"
    # 同一インデックス変数(j/i/k…)を共有するスロットは同じアイテムから取る
    dict_groups, list_groups, simple, distinct = {}, {}, {}, []
    for name, spec in pattern["slots"].items():
        f = spec.get("from")
        if not f:
            continue
        m = re.match(r"(\w+)\[(\w)\]\.(\w+)$", f)
        if m:
            dict_groups.setdefault((m.group(1), m.group(2)), {})[name] = m.group(3)
            continue
        m = re.match(r"(\w+)\[(\w)\]\[(\d+)\]$", f)
        if m:
            # attribute_pairs は dict形状 {"pair":[a,b],"type":...} のため、汎用list_groups
            # (item[idx])では解決できない(KeyError)。下の attr_a/attr_b 専用処理で
            # dict-aware に解決する(本番JS pattern_generator.js:212-231 を正として写す)。
            # container_sets の exclude_if 特殊ケースと同格の迂回。
            if m.group(1) != "attribute_pairs":
                list_groups.setdefault((m.group(1), m.group(2)), {})[name] = int(m.group(3))
            continue
        m = re.match(r"(\w+)\(distinct\)$", f)
        if m:
            distinct.append((name, m.group(1)))
            continue
        simple[name] = f
    object_binding = None  # attr整合で object を棄却・再抽選する場合に使う (JS 201-204相当)
    for (set_name, _), fields in dict_groups.items():
        item = (random.choice(filtered_container_sets(pattern))
                if set_name == "container_sets" else random.choice(LEX[set_name]))
        for slot_name, field in fields.items():
            env[slot_name] = item.get(field, "")
        if set_name == "object_counter_pairs":
            object_binding = (set_name, fields)
    for (set_name, _), fields in list_groups.items():
        item = random.choice(LEX[set_name])
        for slot_name, idx in fields.items():
            env[slot_name] = item[idx]
    for slot_name, set_name in simple.items():
        env[slot_name] = random.choice(LEX[set_name])
    # distinct: 同一セットから重複なしで引く(既にsimpleで引いた値とも重複回避)
    for slot_name, set_name in distinct:
        used = {v for v in env.values() if isinstance(v, str)}
        pool = [x for x in LEX[set_name] if x not in used] or LEX[set_name]
        env[slot_name] = random.choice(pool)
    # 文字列choicesスロット(型指定なし・from指定なし)をサンプリング
    for name, spec in pattern["slots"].items():
        if name not in env and "choices" in spec and spec.get("type") != "int":
            env[name] = random.choice(spec["choices"])
    # --- g02互換の特殊ケース(fromで解決済みならスキップ) ---
    if "actor_c" in names and "actor_c" not in env:
        env["actor_a"], env["actor_b"], env["actor_c"] = random.sample(LEX["actors"], 3)
    elif "actor_a" in names and "actor_a" not in env:
        env["actor_a"], env["actor_b"] = random.choice(LEX["actor_pairs"])
    if "attr_a" in names and "attr_a" not in env:
        # attribute_pairs は dict形状 {"pair":[a,b],"type":...}。本番JS(pattern_generator.js
        # :212-231)を正として写す。属性ペアの型フィルタ:
        #  (1) lexicon_filters.attribute_pairs.include_types があれば最優先(例:求差は色のみ)。
        #  (2) 無ければ、選択済み object の attr_types に合致する型のみ使う(例:おり紙→color限定で
        #      「大きいおり紙」を避ける)。合致ゼロなら object を棄却して再抽選(JS 201-204のobject
        #      pre-filter相当。現行lexiconでは全objectがcolor/sizeを持ち到達しないが仕様として実装)。
        #  (3) object も include_types も無ければ attribute_pairs 全体から選ぶ。
        lf = pattern.get("lexicon_filters", {})
        inc = (lf.get("attribute_pairs") or {}).get("include_types")

        def _allowed_types():
            if inc:
                return inc
            if env.get("object"):
                ocp = next((o for o in LEX["object_counter_pairs"]
                            if o.get("object") == env["object"]), None)
                if ocp and ocp.get("attr_types"):
                    return ocp["attr_types"]
            return None

        def _pool(types):
            if types is None:
                return LEX["attribute_pairs"]
            return [ap for ap in LEX["attribute_pairs"] if ap["type"] in types]

        types = _allowed_types()
        pool = _pool(types)
        tries = 0
        while (not pool and inc is None and object_binding is not None
               and env.get("object") and tries < 3000):
            set_name, fields = object_binding
            item = random.choice(LEX[set_name])
            for slot_name, field in fields.items():
                env[slot_name] = item.get(field, "")
            types = _allowed_types()
            pool = _pool(types)
            tries += 1
        ap = random.choice(pool)
        env["attr_a"], env["attr_b"] = ap["pair"][0], ap["pair"][1]
    if "verb_use" in names and not env.get("verb_use"):
        env["verb_use"] = "つかいました"
    # context_set: 文脈セットを1つ選び、format_fields をスロット値で整形して ctx_* に注入
    cs = pattern.get("context_set")
    if cs:
        ctx = random.choice(LEX[cs["from"]])
        fmt_fields = set(cs.get("format_fields", []))
        for f_ in cs["fields"]:
            v = ctx[f_]
            env[f"ctx_{f_}"] = v.format(**env) if f_ in fmt_fields else v
    # 派生スロット(数値・文字列とも参照可)
    for name, spec in pattern.get("computed_slots", {}).items():
        env[name] = eval(spec["formula"], SAFE, dict(env))
    # 答え(整数)
    env["ans"] = eval(pattern["answer_formula"], SAFE,
                      {k: v for k, v in env.items() if isinstance(v, int)})
    # fraction_display: {表示名: [分子スロット名, 分母スロット名]} → 整形文字列を注入
    for disp_name, (num_key, den_key) in pattern.get("fraction_display", {}).items():
        env[disp_name] = fmt_fraction(env[num_key], env[den_key])
    # mixed_display(v0.8): {表示名: [分子スロット名, 分母スロット名]} → 帯分数表記を注入
    for disp_name, (num_key, den_key) in pattern.get("mixed_display", {}).items():
        env[disp_name] = fmt_mixed(env[num_key], env[den_key])
    # reduced_fraction_display(v0.9): gcdで約分してから分数整形（真分数・仮分数そのまま）
    for disp_name, (num_key, den_key) in pattern.get("reduced_fraction_display", {}).items():
        n_, d_ = env[num_key], env[den_key]
        env[disp_name] = fmt_fraction(reduce_num(n_, d_), reduce_den(n_, d_))
    # reduced_mixed_display(v0.9): gcdで約分してから帯分数整形
    for disp_name, (num_key, den_key) in pattern.get("reduced_mixed_display", {}).items():
        n_, d_ = env[num_key], env[den_key]
        env[disp_name] = fmt_mixed(reduce_num(n_, d_), reduce_den(n_, d_))
    # 数量スロットの表示文字列を自動生成
    quants = pattern.get("quantity_slots", {})
    for name, spec in quants.items():
        env[f"{name}_disp"] = FORMATTERS[spec["unit_system"]](env[name])
        if spec["unit_system"] in ("h_min", "raw_min"):
            env[f"{name}_min"] = env[name]  # 「80分は〜」のような分表記参照用
    # computed_slots のうち数量系(big/small)も answer_unit_system で整形
    aus = pattern.get("answer_unit_system")
    if aus:
        env["ans_disp"] = FORMATTERS[aus](env["ans"])
        for name in pattern.get("computed_slots", {}):
            if isinstance(env.get(name), int):
                env[f"{name}_disp"] = FORMATTERS[aus](env[name])
    return env

def make_problem(pattern, unit_id=None):
    env = build_env(pattern, unit_id)
    problem = random.choice(pattern["sentence_templates"]).format(**env)
    answer = pattern["answer_template"].format(**env)
    # figure_params(v0.8): あれば env で解決して返す。無ければ None（既存2学年は None＝非干渉）。
    fp = pattern.get("figure_params")
    figure = resolve_figure_params(fp, env) if fp else None
    return env, problem, answer, figure

def verify(pattern, env, problem):
    bad = kanji_check(problem, allowed_kanji(pattern))
    # 数量スロットは表示文字列(9cm5mm)経由で数字が出るため、
    # 本文数値の照合は「スロット由来の数値+表示分解値+テンプレ定数1」を許可集合とする
    allowed_nums = set(pattern.get("template_number_constants", []))
    for k, v in env.items():
        if isinstance(v, int) and (k in pattern["slots"] or k in pattern.get("quantity_slots", {})):
            allowed_nums.add(v)
    for k, v in env.items():
        if (k.endswith("_disp") or k.endswith("_min")
                or k in pattern.get("fraction_display", {})
                or k in pattern.get("mixed_display", {})
                or k in pattern.get("reduced_fraction_display", {})
                or k in pattern.get("reduced_mixed_display", {})):
            allowed_nums |= {int(x) for x in re.findall(r"\d+", str(v))}
    text_nums = {int(x) for x in re.findall(r"\d+", problem)}
    return {"kanji_ok": not bad,
            "nums_from_slots": text_nums <= allowed_nums,
            "answer_positive": env["ans"] > 0}, bad

if __name__ == "__main__":
    random.seed(20260715)
    n_pass = n_fail = 0
    for p in bank["patterns"]:
        print("=" * 72)
        print(f"{p['semantic_category']}  ({p['pattern_id']})")
        for _ in range(3):
            env, problem, answer, _figure = make_problem(p)
            checks, bad = verify(p, env, problem)
            ok = all(checks.values())
            n_pass += ok; n_fail += (not ok)
            flag = "PASS" if ok else f"FAIL {checks} {bad}"
            print("-" * 72)
            print(f" [{flag}] 問題:", problem)
            print("        解答:", answer)
    print("=" * 72)
    print(f"合計: PASS {n_pass} / FAIL {n_fail}")
