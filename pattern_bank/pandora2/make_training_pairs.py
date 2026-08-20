# -*- coding: utf-8 -*-
"""make_training_pairs.py — rationale/correctionsから訓練データ3系統を機械生成。
  pairs_design.jsonl   : brief+rationale → pattern(設計ペア)
  pairs_revision.jsonl : 誤り状態+人間指示 → 修正(訂正ペア)
  rag_docs.jsonl       : rationale・correctionsの検索文書(メタデータ付き)
スキーマ検証・ハイジーン検査込み。学習実行は全学年完了後(本スクリプトは器の整備)。
"""
import json, sys

RATIONALE_KEYS = ["source_features", "representation", "constructive_guarantees",
                  "semantic_position", "exclusions", "figure_notes", "pedagogy"]
BRIEF_KEYS = ["semantic_territory", "number_domain", "answer_structure", "figure",
              "step_count", "directives"]
NG_WORDS = ["ウィンパス", "winpass", "ref_g05", "reference_problems"]

def hygiene(obj, where):
    raw = json.dumps(obj, ensure_ascii=False).lower()
    hits = [w for w in NG_WORDS if w.lower() in raw]
    assert not hits, f"ハイジーン違反 {where}: {hits}"

def validate_gold(gold, bank_ids):
    for pid, g in gold.items():
        assert pid in bank_ids, f"バンクに存在しないpattern_id: {pid}"
        b, r = g["brief"], g["rationale"]
        missing = [k for k in BRIEF_KEYS if k not in b]
        assert not missing, f"{pid} brief欠落: {missing}"
        missing = [k for k in RATIONALE_KEYS if k not in r]
        assert not missing, f"{pid} rationale欠落: {missing}"
        for d in b["directives"]:
            assert set(d) >= {"text", "by", "date"}, f"{pid} directive形式不正"
        # pedagogy: 人間の声の配列は各要素 {text,by,date} 必須。
        # ただし設計ノート文字列形式(g06流儀=AI設計要約・by無し)も許容(配列のみby検査)。
        if isinstance(r["pedagogy"], list):
            for p in r["pedagogy"]:
                assert set(p) >= {"text", "by", "date"}, f"{pid} pedagogy形式不正(人間の声はby必須)"
        hygiene(g, pid)

# 対象学年 → (バンク, rationale正準ファイル)。rationaleは_meta付き完全版(_接頭辞キーは処理対象外)。
# g05はゴールド由来の命名(rationale_g05_gold.json)、g02〜g04は無印。以後の遡及学年はここに追記。
GRADES = [
    ("g02", "../patterns_g02.json", "rationale_g02.json"),
    ("g03", "../patterns_g03.json", "rationale_g03.json"),
    ("g04", "../patterns_g04.json", "rationale_g04.json"),
    ("g05", "../patterns_g05.json", "rationale_g05_gold.json"),
]

def load_gold(rnpath):
    return {k: v for k, v in json.load(open(rnpath, encoding="utf-8")).items() if not k.startswith("_")}

JHS_CHAPTERS = ["c01","c02","c03","c04","c05","c06","c07","c08","c09","c10","c12","c13","c15","c16","c17","c18"]

def resolve_directives_ref(brief, shared):
    # jhs brief は directives_ref(_shared参照)。訓練ペア用に実directivesへ解決(格納ファイルは参照のまま保全)。
    if "directives" in brief:
        return brief
    ref = brief.get("directives_ref")
    b = {k: v for k, v in brief.items() if k != "directives_ref"}
    cur = shared
    if ref:
        for p in ref.replace("_shared.", "").split("."):
            cur = cur.get(p) if isinstance(cur, dict) else None
    b["directives"] = cur if isinstance(cur, list) else []
    return b

def load_jhs():
    # rationale_jhs.json(132・ネスト形・_shared付) + 14章バンク集約。directives_refを解決してg05系と同形に。
    raw = json.load(open("rationale_jhs.json", encoding="utf-8"))
    shared = raw.get("_shared", {})
    gold = {}
    for k, v in raw.items():
        if k.startswith("_"):
            continue
        gold[k] = {"brief": resolve_directives_ref(v["brief"], shared), "rationale": v["rationale"]}
    patterns = {}
    for c in JHS_CHAPTERS:
        bank = json.load(open("../patterns_jhs_%s.json" % c, encoding="utf-8"))
        for p in bank["patterns"]:
            patterns[p["pattern_id"]] = p
    return gold, patterns

def load_g01():
    # g01: jhs型フラット→ネスト済(_shared/directives_ref)。jhsと同じ二層解決。配信OFFだがrationaleは訓練有効。
    raw = json.load(open("rationale_g01.json", encoding="utf-8"))
    shared = raw.get("_shared", {})
    gold = {}
    for k, v in raw.items():
        if k.startswith("_"):
            continue
        gold[k] = {"brief": resolve_directives_ref(v["brief"], shared), "rationale": v["rationale"]}
    patterns = {p["pattern_id"]: p for p in json.load(open("../patterns_g01.json", encoding="utf-8"))["patterns"]}
    return gold, patterns

def load_g06():
    # g06: g05系ネスト。brief.directives=id配列→bank_directives(圧縮表)実体解決。step_count欠はバンクから注入。
    raw = json.load(open("rationale_g06.json", encoding="utf-8"))
    table = {d["id"]: d for d in raw.get("bank_directives", [])}
    patterns = {p["pattern_id"]: p for p in json.load(open("../patterns_g06.json", encoding="utf-8"))["patterns"]}
    gold = {}
    for k, v in raw.items():
        if k.startswith("_") or k == "bank_directives":
            continue
        b = dict(v["brief"])
        b["directives"] = [table[i] for i in b.get("directives", []) if i in table]
        if "step_count" not in b and k in patterns:
            b["step_count"] = patterns[k].get("step_count")
        gold[k] = {"brief": b, "rationale": v["rationale"]}
    return gold, patterns

def main():
    corrections = json.load(open("corrections_log.json", encoding="utf-8"))
    for c in corrections:
        assert set(c) >= {"id", "date", "by", "scope", "observed", "instruction",
                          "resolution", "generalization"}, f"correction形式不正: {c.get('id')}"
        hygiene(c, c["id"])

    # 全対象学年をロード・検証(バンクとのID一致・スキーマ・ハイジーン)
    grades = []
    for grade, bankpath, rnpath in GRADES:
        bank = json.load(open(bankpath, encoding="utf-8"))
        gold = load_gold(rnpath)
        patterns = {p["pattern_id"]: p for p in bank["patterns"]}
        validate_gold(gold, set(patterns))
        grades.append((grade, gold, patterns))
    # jhs(14章バンク集約 + rationale_jhs.json・directives_ref解決)
    jhs_gold, jhs_patterns = load_jhs()
    validate_gold(jhs_gold, set(jhs_patterns))
    grades.append(("jhs", jhs_gold, jhs_patterns))
    # g06(bank_directives id解決・step_count注入) / g01(jhs型二層解決・配信OFFだが訓練有効)
    g06_gold, g06_patterns = load_g06()
    validate_gold(g06_gold, set(g06_patterns))
    grades.append(("g06", g06_gold, g06_patterns))
    g01_gold, g01_patterns = load_g01()
    validate_gold(g01_gold, set(g01_patterns))
    grades.append(("g01", g01_gold, g01_patterns))

    # ① 設計ペア: brief(+人間directives) と rationale → pattern (全学年)
    with open("pairs_design.jsonl", "w", encoding="utf-8") as f:
        for grade, gold, patterns in grades:
            for pid, g in gold.items():
                p = patterns[pid]
                brief = {"grade": p["grade"], "unit_id": p["unit_id"], "unit_name": p["unit_name"],
                         **g["brief"]}
                f.write(json.dumps({"task": "design_pattern", "input": brief,
                                    "rationale": g["rationale"], "output": p},
                                   ensure_ascii=False) + "\n")

    # ② 訂正ペア: 誤り状態+人間指示 → 修正と一般化(間違いを指摘されたら直せるモデル)
    with open("pairs_revision.jsonl", "w", encoding="utf-8") as f:
        for c in corrections:
            f.write(json.dumps({"task": "revise_on_instruction",
                                "input": {"scope": c["scope"], "observed": c["observed"],
                                          "instruction": c["instruction"], "by": c["by"]},
                                "output": {"resolution": c["resolution"],
                                           "generalization": c["generalization"]}},
                               ensure_ascii=False) + "\n")

    # ③ RAG文書: 区画単位で索引化(新規設計時に類似単元・同一kindの過去判断を検索して文脈投入)
    with open("rag_docs.jsonl", "w", encoding="utf-8") as f:
        for grade, gold, patterns in grades:
            for pid, g in gold.items():
                p = patterns[pid]
                for key in RATIONALE_KEYS:
                    v = g["rationale"][key]
                    if not v: continue
                    text = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
                    f.write(json.dumps({"doc_type": "rationale", "section": key,
                                        "pattern_id": pid, "grade": p["grade"],
                                        "unit_id": p["unit_id"],
                                        "kind": (p.get("figure_params") or {}).get("kind"),
                                        "text": text}, ensure_ascii=False) + "\n")
        for c in corrections:
            f.write(json.dumps({"doc_type": "correction", "section": "generalization",
                                "scope": c["scope"], "by": c["by"],
                                "text": f"{c['instruction']} → {c['generalization']}"},
                               ensure_ascii=False) + "\n")

    n1 = sum(1 for _ in open("pairs_design.jsonl"))
    n2 = sum(1 for _ in open("pairs_revision.jsonl"))
    n3 = sum(1 for _ in open("rag_docs.jsonl"))
    print(f"検証OK → pairs_design {n1} / pairs_revision {n2} / rag_docs {n3}")

if __name__ == "__main__":
    main()
