# -*- coding: utf-8 -*-
"""
パターンバンク PoC ジェネレータ v0.7
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

with open("kyoiku_kanji_g1to3.json", encoding="utf-8") as f:
    _KJ = json.load(f)
KANJI_BY_GRADE = {g: set(chars) for g, chars in _KJ.items()}
DEFAULT_ALLOWED = KANJI_BY_GRADE["g01"] | KANJI_BY_GRADE["g02"]

def allowed_kanji(pattern):
    grades = pattern.get("kanji_policy", {}).get("allowed_grades")
    if not grades:
        return DEFAULT_ALLOWED
    return set().union(*(KANJI_BY_GRADE[g] for g in grades))

SAFE = {"abs": abs, "max": max, "min": min}

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
}

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
    return env, problem, answer

def verify(pattern, env, problem):
    bad = kanji_check(problem, allowed_kanji(pattern))
    # 数量スロットは表示文字列(9cm5mm)経由で数字が出るため、
    # 本文数値の照合は「スロット由来の数値+表示分解値+テンプレ定数1」を許可集合とする
    allowed_nums = set(pattern.get("template_number_constants", []))
    for k, v in env.items():
        if isinstance(v, int) and (k in pattern["slots"] or k in pattern.get("quantity_slots", {})):
            allowed_nums.add(v)
    for k, v in env.items():
        if k.endswith("_disp") or k.endswith("_min") or k in pattern.get("fraction_display", {}):
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
            env, problem, answer = make_problem(p)
            checks, bad = verify(p, env, problem)
            ok = all(checks.values())
            n_pass += ok; n_fail += (not ok)
            flag = "PASS" if ok else f"FAIL {checks} {bad}"
            print("-" * 72)
            print(f" [{flag}] 問題:", problem)
            print("        解答:", answer)
    print("=" * 72)
    print(f"合計: PASS {n_pass} / FAIL {n_fail}")
