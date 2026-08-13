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
        for p in r["pedagogy"]:
            assert set(p) >= {"text", "by", "date"}, f"{pid} pedagogy形式不正(人間の声はby必須)"
        hygiene(g, pid)

def main():
    bank = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "patterns_g05_c.json", encoding="utf-8"))
    # rationale_g05_gold.json は g05全70パターン完全版(_metaつき)。_meta等の予約キー(_接頭辞)は処理対象外。
    gold = {k: v for k, v in json.load(open("rationale_g05_gold.json", encoding="utf-8")).items() if not k.startswith("_")}
    corrections = json.load(open("corrections_log.json", encoding="utf-8"))
    patterns = {p["pattern_id"]: p for p in bank["patterns"]}
    validate_gold(gold, set(patterns))
    for c in corrections:
        assert set(c) >= {"id", "date", "by", "scope", "observed", "instruction",
                          "resolution", "generalization"}, f"correction形式不正: {c.get('id')}"
        hygiene(c, c["id"])

    # ① 設計ペア: brief(+人間directives) と rationale → pattern
    with open("pairs_design.jsonl", "w", encoding="utf-8") as f:
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
