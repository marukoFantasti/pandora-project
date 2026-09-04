"""hyoki_rules.py — 共通表記規則層(D10 表記規則)の Python 実装(hyoki_rules.js と 1:1)。
homeworkビルダー(jio課題・build.py)等の Python 経路から:  from hyoki_rules import find_unbracketed_labels
規則1: ひらがな1字ラベル(あ・い・う…)は本文・正解表示・解説で「」囲み。図中ラベル対象外・カタカナ記号は現状維持。"""
import re
LABELS = "あいうえおかきくけこ"
RE = re.compile(r"(^|[^ぁ-んァ-ン一-鿿「]|の)([" + LABELS + r"])(?=(角|点|直線)|の(角|点|直線))|(^|[^ぁ-んァ-ン一-鿿「])([" + LABELS + r"])(?=と[" + LABELS + r"]|度|[、 ]|$)", re.M)
def find_unbracketed_labels(text, fig_labels=()):
    out = []
    has = set(fig_labels or ())
    for m in RE.finditer(str(text or "")):
        lab = m.group(2) or m.group(5); strong = m.group(2) is not None
        if not strong and lab not in has:
            continue
        out.append({"label": lab, "index": m.start(), "context": text[max(0, m.start() - 6):m.start() + 10]})
    return out
def walk_strings(obj, path=""):
    """JSON構造の全文字列を (path, str) で列挙(静的教材JSONの走査用)"""
    if isinstance(obj, dict):
        for k, v in obj.items(): yield from walk_strings(v, path + "/" + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj): yield from walk_strings(v, path + "[" + str(i) + "]")
    elif isinstance(obj, str):
        yield path, obj
if __name__ == "__main__":
    import json, sys, glob
    bad = 0
    for pat in (sys.argv[1:] or ["homework/*.json"]):
        for f in glob.glob(pat):
            d = json.load(open(f, encoding="utf-8"))
            for p, s in walk_strings(d):
                for h in find_unbracketed_labels(s):
                    bad += 1; print(f"  ❌ {f}{p}: …{h['context']}…")
    print("hyoki_rules: " + ("GREEN ✅" if bad == 0 else f"❌ {bad}件"))
    sys.exit(0 if bad == 0 else 1)
