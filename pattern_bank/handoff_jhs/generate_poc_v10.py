# -*- coding: utf-8 -*-
"""
パターンバンク PoC ジェネレータ v1.0
v0.9 + jhs(中学数学)対応（すべて加法設計＝新フィールド未宣言・新ヘルパ未参照の既存
g02〜g06 バンクは挙動不変＝ゴールデン差分ゼロが設計的に自明。詳細は
handoff_jhs/v1_0_spec_jhs.md）。
  - answer_domain(パターン最上位キー): 無宣言/"positive_int"→ans>0(既定)、
    "any_int"→任意整数、"nonzero_int"→ans≠0。verify返却キー名は answer_positive を
    維持し意味を「宣言ドメイン内か」に拡張（テストハーネス互換）。既存バンクは全て無宣言。
  - verify の負数対応: nums_from_slots の許可集合にスロット値 v と abs(v) の両方を加える
    （本文「−6」は \\d+ 抽出で 6 になり、許可集合の −6 と必ず不一致になるため）。
    既存バンクは全て正値=abs(v)==v で挙動不変。
  - SAFEヘルパ8種追加(全て整数演算+文字列結合のみ・math不使用・JS 1:1移植):
    fmt_signed / fmt_coef / fmt_coefj / fmt_termj / sgn_str / sqrt_coef / sqrt_rad / fmt_sqrt。
    マイナス記号は U+2212(−)、連結の＋は U+FF0B。FORMATTERS に "signed": fmt_signed を追加。
  - 負域スロット([-9,-1]形式・choicesの負値)を許容(randrange対応済)。JS randRange との
    負域マッピング一致を sample_domain ベクター(helpers_test_vectors.json)で照合。
  - self-check: `python3 generate_poc_v10.py --vectors helpers_test_vectors.json` で
    Python側ヘルパ等価性を確認（JS側は tests/pattern_bank_vectors.js）。
--- 以下 v0.9 ---
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
# --vectors モード(ヘルパ等価性 self-check)ではバンク/漢字を読まない。通常起動
# (argv[1]=バンクファイル)では v0.9 と完全同一に読み込む＝ゴールデン挙動不変。
_VECTOR_MODE = len(sys.argv) > 1 and sys.argv[1] == "--vectors"
if not _VECTOR_MODE:
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

# ===== v1.0 追加ヘルパ（jhs中学数学・符号/係数/平方根の整形。すべて整数演算+文字列結合
#        のみ・math不使用＝JS実装(pattern_generator.js)と同一手順で言語間挙動差なし。
#        マイナスは U+2212(−)、連結の＋は U+FF0B。既存6学年バンクは未参照＝非干渉。
#        等価性は helpers_test_vectors.json のシード非依存ベクターで両実装照合） =====
_MINUS = "−"   # −
_PLUSJ = "＋"   # ＋

def fmt_signed(n):
    """符号付き整数表示。n≥0→str(n)、n<0→"−"+str(-n)。マイナスは U+2212。"""
    n = int(n)
    return str(n) if n >= 0 else _MINUS + str(-n)

def fmt_coef(n):
    """先頭項の係数: 1→""、−1→"−"、他→fmt_signed(n)。（例: fmt_coef(-1)="−"）"""
    n = int(n)
    if n == 1:
        return ""
    if n == -1:
        return _MINUS
    return fmt_signed(n)

def fmt_coefj(n):
    """連結項の係数: 1→"＋"、−1→"−"、n>1→"＋"+n、n<−1→"−"+|n|。
    注: fmt_coefj(0)は未定義扱い（"＋0"を返さない）。変数項が消えるケースは
    バンク側で制約分割して回避する設計規約（仕様書§3）。"""
    n = int(n)
    if n == 1:
        return _PLUSJ
    if n == -1:
        return _MINUS
    if n > 1:
        return _PLUSJ + str(n)
    if n < -1:
        return _MINUS + str(-n)
    return ""   # n==0: 未定義扱い（バンクは制約分割で到達しない）

def fmt_termj(n):
    """連結定数項: 0→""、n>0→"＋"+n、n<0→"−"+|n|。（例: fmt_termj(-49)="−49"）"""
    n = int(n)
    if n == 0:
        return ""
    return _PLUSJ + str(n) if n > 0 else _MINUS + str(-n)

def sgn_str(n):
    """符号のみ: n<0→"−"、それ以外→""（負分数の符号前置用）。"""
    return _MINUS if int(n) < 0 else ""

def _sqrt_decomp(n):
    """|n|=k²·m（m平方因数なし）へ分解し (k, m) を返す。d=2から d·d≦残り の反復で
    d² を割り尽くす（math不使用・Euclid反復文化と同一整数演算）。"""
    m = abs(int(n))
    k = 1
    d = 2
    while d * d <= m:
        while m % (d * d) == 0:
            m //= d * d
            k *= d
        d += 1
    return k, m

def sqrt_coef(n):
    """√n の係数 k（|n|=k²·m 分解の k）。（例: sqrt_coef(48)=4）"""
    return _sqrt_decomp(n)[0]

def sqrt_rad(n):
    """√n の根号内 m（|n|=k²·m 分解の m）。（例: sqrt_rad(48)=3）"""
    return _sqrt_decomp(n)[1]

def fmt_sqrt(n):
    """符号込み√表示: 0→"0"、|n|=k²m で m==1→fmt_signed(±k)、k==1→[−]"√m"、
    他→[−]"k√m"。（例: fmt_sqrt(-80)="−4√5"、fmt_sqrt(9)="3"、fmt_sqrt(5)="√5"）"""
    n = int(n)
    if n == 0:
        return "0"
    neg = n < 0
    k, m = _sqrt_decomp(n)
    if m == 1:
        return fmt_signed(-k if neg else k)
    sign = _MINUS if neg else ""
    if k == 1:
        return f"{sign}√{m}"
    return f"{sign}{k}√{m}"

SAFE.update({"fmt_signed": fmt_signed, "fmt_coef": fmt_coef, "fmt_coefj": fmt_coefj,
             "fmt_termj": fmt_termj, "sgn_str": sgn_str,
             "sqrt_coef": sqrt_coef, "sqrt_rad": sqrt_rad, "fmt_sqrt": fmt_sqrt})

# ===== S-1 追加ヘルパ（pi_coef機構・sqrt族の横展開。係数のみ整数演算・π記号は表示層＝
#        ゼロ浮動小数。JS(pattern_generator.js fmtPi/fmtPiFrac)と1:1移植・等価性ベクター照合） =====
def fmt_pi(c):
    """整数係数×π: 0→"0"、1→"π"、−1→"−π"、他→fmt_signed(c)+"π"。（36→"36π"）"""
    c = int(c)
    if c == 0:
        return "0"
    if c == 1:
        return "π"
    if c == -1:
        return _MINUS + "π"
    return fmt_signed(c) + "π"

def fmt_pi_frac(num, den):
    """分数係数×π（円錐1/3・球4/3対応）: (num/den)を約分し den==1→fmt_pi(num)、他→"[−](p/q)π"。
    （32,3→"(32/3)π"、12,1→"12π"、8,4→"2π"）"""
    num = int(num); den = int(den)
    if den < 0:
        num, den = -num, -den
    g = gcd(abs(num), den) or 1
    num //= g; den //= g
    if num == 0:
        return "0"
    if den == 1:
        return fmt_pi(num)
    sign = _MINUS if num < 0 else ""
    return f"{sign}({abs(num)}/{den})π"

SAFE.update({"fmt_pi": fmt_pi, "fmt_pi_frac": fmt_pi_frac})

def sample_domain(lo, hi, step=1):
    """スロット range=[lo,hi](step) の到達可能値ドメインを "件数:先頭:末尾" で返す
    （負域含む JS randRange との一致照合用。JS randRange と同一の値マッピング:
    n=floor((hi-lo)/step)+1、値[k]=lo+step·k）。整数列の同一性は (件数,先頭,末尾,step)
    で決まるため、負域サンプリングの言語間一致をシード非依存で照合できる。"""
    lo, hi, step = int(lo), int(hi), int(step)
    n = (hi - lo) // step + 1
    last = lo + step * (n - 1)
    return f"{n}:{lo}:{last}"

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
    # --- v1.0追加（jhs符号付き整数。既存6学年は未参照＝非干渉） ---
    "signed": fmt_signed,
    # --- B層c09追加（相対度数 dec2fix。スケール100整数→固定2桁・末尾ゼロ保持） ---
    "dec2fix": lambda b: fmt_dec2fix(b),
}

def fmt_dec(b, scale):
    """固定小数点整形（v0.9）。b=スケール整数。末尾ゼロ省略: (1200,100)→'12', (1230,100)→'12.3'"""
    b, scale = int(b), int(scale)
    whole, frac = divmod(b, scale)
    width = len(str(scale)) - 1
    s = str(frac).zfill(width).rstrip("0")
    return f"{whole}.{s}" if s else str(whole)

def fmt_dec2fix(b):
    """相対度数の固定2桁表記（B層c09）。スケール100整数→末尾ゼロを保持: 30→'0.30'、100→'1.00'、
    44→'0.44'、250→'2.50'。dec2(末尾ゼロ省略)との違いは常に小数第2位まで表示する点。非負前提。"""
    b = int(b)
    whole, frac = divmod(b, 100)
    return f"{whole}.{frac:02d}"

SAFE.update({"dec2fix": fmt_dec2fix})

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
    # S-3 正規化層: pi_coef系は computed_slot X → {X}_pi 表示(fmt_pi / fmt_pi_frac(_,3))を自動生成。
    # (バンクは answer_domain 宣言 + answer_template {X_pi} を書くだけ=表示層をここで吸収)
    _pidom = pattern.get("answer_domain", "")
    if _pidom in ("pi_coef", "pi_coef_frac3"):
        for _n in pattern.get("computed_slots", {}):
            if isinstance(env.get(_n), int):
                env[f"{_n}_pi"] = fmt_pi(env[_n]) if _pidom == "pi_coef" else fmt_pi_frac(env[_n], 3)
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
        if isinstance(v, int) and (k in pattern["slots"] or k in pattern.get("quantity_slots", {}) or k in pattern.get("computed_slots", {})):
            # v1.0: 負スロット値対応。本文「−6」は \d+ 抽出で 6 になるため、v と abs(v)
            # の両方を許可集合に加える（既存バンクは全て正値=abs(v)==v で非干渉）。
            allowed_nums.add(v)
            allowed_nums.add(abs(v))
    for k, v in env.items():
        if (k.endswith("_disp") or k.endswith("_min")
                or k in pattern.get("fraction_display", {})
                or k in pattern.get("mixed_display", {})
                or k in pattern.get("reduced_fraction_display", {})
                or k in pattern.get("reduced_mixed_display", {})):
            allowed_nums |= {int(x) for x in re.findall(r"\d+", str(v))}
    text_nums = {int(x) for x in re.findall(r"\d+", problem)}
    # v1.0: answer_domain（無宣言/"positive_int"→ans>0、"any_int"→任意、"nonzero_int"→≠0）。
    # 返却キー名 answer_positive は維持し「宣言ドメイン内か」に意味拡張（ハーネス互換）。
    dom = pattern.get("answer_domain", "positive_int")
    a = env["ans"]
    if dom == "any_int":
        in_domain = True
    elif dom == "nonzero_int":
        in_domain = a != 0
    elif dom in ("pi_coef", "pi_coef_frac3"):  # S-1/S-3: π係数(ans=係数・表示fmt_pi/fmt_pi_frac(_,3))。正。
        in_domain = a > 0
    else:  # positive_int（既定・既存バンク全て）
        in_domain = a > 0
    return {"kanji_ok": not bad,
            "nums_from_slots": text_nums <= allowed_nums,
            "answer_positive": in_domain}, bad

def _run_vectors(path):
    """helpers_test_vectors.json の全ベクターを Python 側ヘルパに通し、期待値と照合。
    JS 側ランナー(tests/pattern_bank_vectors.js)と同一ベクター・同一期待値で両実装一致を担保。"""
    with open(path, encoding="utf-8") as f:
        vec = json.load(f)
    impl = {"gcd": gcd, "lcm": lcm, "reduce_num": reduce_num, "reduce_den": reduce_den,
            "fmt_dec": fmt_dec, "fmt_percent_pm": fmt_percent_pm, "fmt_buai_pm": fmt_buai_pm,
            "fmt_mixed": fmt_mixed, "fmt_fraction": fmt_fraction, "round_half_up": round_half_up,
            "fmt_signed": fmt_signed, "fmt_coef": fmt_coef, "fmt_coefj": fmt_coefj,
            "fmt_termj": fmt_termj, "sgn_str": sgn_str, "sqrt_coef": sqrt_coef,
            "sqrt_rad": sqrt_rad, "fmt_sqrt": fmt_sqrt, "sample_domain": sample_domain,
            "fmt_pi": fmt_pi, "fmt_pi_frac": fmt_pi_frac,
            "dec2fix": fmt_dec2fix}
    bad = total = covered = 0
    skipped = []
    for name, cases in vec.items():
        if name == "comment":
            continue
        if name == "expr_arith":
            covered += 1
            for (expr, e), want in cases:
                total += 1
                try:
                    got = eval(expr, SAFE, dict(e))
                except Exception as ex:
                    got = "ERR:" + str(ex)
                if str(got) != str(want):
                    print("VEC-FAIL expr_arith", repr(expr), "=>", repr(got), "want", repr(want)); bad += 1
            continue
        if name not in impl:
            skipped.append(name); continue
        covered += 1
        for args, want in cases:
            total += 1
            got = impl[name](*args)
            if str(got) != str(want):
                print("VEC-FAIL", name, repr(args), "=>", repr(got), "want", repr(want)); bad += 1
    if skipped:
        print("ERROR: 実装が見つからないベクター名:", ", ".join(skipped)); return 2
    print(f"ベクター群 {covered} 種 / 総ケース {total} 件")
    print("等価性ベクター(Python側): 全件一致 ✅" if bad == 0 else f"{bad}件不一致 ❌")
    return 0 if bad == 0 else 1

if __name__ == "__main__":
    if _VECTOR_MODE:
        sys.exit(_run_vectors(sys.argv[2] if len(sys.argv) > 2 else "helpers_test_vectors.json"))
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
