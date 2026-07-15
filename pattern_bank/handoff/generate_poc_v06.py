# -*- coding: utf-8 -*-
"""
パターンバンク PoC ジェネレータ v0.5
v0.4 + quantity_slots(複名数・時刻)対応
  - 内部表現: 最小単位の整数(mm / dL / 分 / 0時からの分)
  - 表示整形: unit_system 別関数。0の下位単位は省略(90mm→"9cm")
  - 各quantityスロット q に対し {q}_disp(整形済み文字列) を自動生成
  - 答えは answer_formula(整数演算) → answer_unit_system で整形 → {ans_disp}
"""
import json, random, re

with open("patterns_g02.json", encoding="utf-8") as f:
    bank = json.load(f)
LEX = bank["shared_lexicon"]

G01 = set("一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六")
G02 = set("引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話")
ALLOWED = G01 | G02
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
}

def kanji_check(t):
    return [c for c in t if '\u4e00' <= c <= '\u9fff' and c not in ALLOWED]

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
    numeric = {k: sp for k, sp in slots.items() if sp.get("type") == "int"}
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
    if "actor" in names:
        env["actor"] = random.choice(LEX["actors"])
    if "actor_c" in names:
        env["actor_a"], env["actor_b"], env["actor_c"] = random.sample(LEX["actors"], 3)
    elif "actor_a" in names:
        env["actor_a"], env["actor_b"] = random.choice(LEX["actor_pairs"])
    if "container" in names:
        cs = random.choice(filtered_container_sets(pattern))
        env.update({k: cs[k] for k in
                    ("container", "cont_counter", "object", "counter", "verb_on", "exist")
                    if k in cs})
    elif "object" in names:
        p = random.choice(LEX["object_counter_pairs"])
        env.update({"object": p["object"], "counter": p["counter"],
                    "verb_use": p.get("verb_use", "つかいました")})
    if "attr_a" in names:
        env["attr_a"], env["attr_b"] = random.choice(LEX["attribute_pairs"])
    # 派生スロット(数値・文字列とも参照可)
    for name, spec in pattern.get("computed_slots", {}).items():
        env[name] = eval(spec["formula"], SAFE, dict(env))
    # 答え(整数)
    env["ans"] = eval(pattern["answer_formula"], SAFE,
                      {k: v for k, v in env.items() if isinstance(v, int)})
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
    bad = kanji_check(problem)
    # 数量スロットは表示文字列(9cm5mm)経由で数字が出るため、
    # 本文数値の照合は「スロット由来の数値+表示分解値+テンプレ定数1」を許可集合とする
    allowed_nums = set(pattern.get("template_number_constants", []))
    for k, v in env.items():
        if isinstance(v, int) and (k in pattern["slots"] or k in pattern.get("quantity_slots", {})):
            allowed_nums.add(v)
    for k, v in env.items():
        if k.endswith("_disp") or k.endswith("_min"):
            allowed_nums |= {int(x) for x in re.findall(r"\d+", str(v))}
    text_nums = {int(x) for x in re.findall(r"\d+", problem)}
    return {"kanji_ok": not bad,
            "nums_from_slots": text_nums <= allowed_nums,
            "answer_positive": env["ans"] > 0}, bad

if __name__ == "__main__":
    random.seed(20260714)
    for p in bank["patterns"]:
        if not (p["pattern_id"].startswith("g02_meas") or p["pattern_id"].startswith("g02_time")):
            continue
        print("=" * 72)
        print(f"{p['semantic_category']}  ({p['pattern_id']})")
        for _ in range(3):
            env, problem, answer = make_problem(p)
            checks, bad = verify(p, env, problem)
            flag = "PASS" if all(checks.values()) else f"FAIL {checks} {bad}"
            print("-" * 72)
            print(f" [{flag}] 問題:", problem)
            print("        解答:", answer)
