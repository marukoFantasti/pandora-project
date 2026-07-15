# パターンバンク方式 — Claude Code 持ち込みパッケージ

作成日: 2026-07-14（設計セッション: このパッケージの全ファイルは同日のFableチャットで設計・検証済み）
配置先の想定: `pandora-project` リポジトリに `pattern_bank/` として追加

## パッケージ内容

```
handoff/
├── README_handoff.md                 ← 本書
├── checkConsistency_retirement_plan.md ← 棚卸し設計書（タスク0の突き合わせ指示を含む）
├── patterns_g02.json                 ← 骨格バンク v0.6（21パターン・33バリアント）
├── generate_poc_v06.py               ← リファレンス実装（Python・決定論・移植元）
├── themes/
│   ├── default_school_v1.json        ← デフォルトテーマ（骨格テンプレート継承）
│   └── usarin_tanukichi_v1.json      ← サンプルテーマ（スキーマ検証済み・2パターン分のみ）
└── test_vectors/
    ├── formatter_tests.json          ← 整形関数の等価性検証（境界ケース網羅）
    ├── constraint_tests.json         ← 制約式の等価性検証（660ケース・pass/fail混在）
    └── sample_outputs.txt            ← 参照出力（目視検品用・全バリアント2問ずつ）
```

## 実装済みの品質実績（Python PoC）

- 33,000問（33バリアント×1000）ストレステストで欠陥ゼロ
- 欠陥カテゴリ1・2・3・6・7・8はコードによる構造保証、4は機械照合、5はテンプレート登録時検品に集約済み
- ランタイムAI呼び出しゼロ（生成は純粋な決定論処理）

## タスク一覧（順番厳守）

### タスク0: checkConsistency() 突き合わせ【コード変更なし】
`checkConsistency_retirement_plan.md` §4 のプロンプトをそのまま実行。
基準1〜11の実文言とマッピング表を突き合わせ、齟齬があれば報告のみ。
**齟齬の内容次第で以降のタスクの前提が変わるため、必ず最初に実施。**

### タスク1: JS移植
`generate_poc_v06.py` を `pattern_generator.js` としてブラウザJSに移植。

移植対象の関数（挙動を1:1で保つこと）:
- `FORMATTERS`（cm_mm / m_cm / L_dL / h_min / clock / raw_min）— 0の下位単位省略規則を含む
- `effective_slots` / `effective_constraints`（unit_range_overrides の range・choices・constraints_replace 適用）
- `sample_numeric`（棄却法・max_tries 3000・充足不能時は例外＝バンク設計バグとして扱う）
- `build_env`（語彙スロット解決: actor / actor_a,b / actor_c(3人重複なし) / container_sets(filter対応) / object_counter_pairs / attribute_pairs、computed_slots、answer_formula、_disp 自動生成）
- `make_problem` / `verify`（template_number_constants 対応の数値照合を含む）

注意点:
- 制約式は `eval` で評価している。JSでは `new Function` か安全な式評価器を使う。式はバンクJSON内で管理する信頼済みデータだが、`abs/max/min` のみ許可のホワイトリスト方針は維持すること
- Python の `random.randrange(lo, hi+1, step)` の step 対応を忘れない（t_start の5分きざみ）
- 乱数はシード互換不要（テストベクタは乱数非依存で設計してある）

### タスク2: 等価性検証
1. `formatter_tests.json` — 全ケースで expected と一致（完全一致必須）
2. `constraint_tests.json` — 660ケースの env に対し、rule ごとの真偽が expected と一致（完全一致必須）
3. JS側で全33バリアント×1000問のストレステスト — verify() 3項目の失敗ゼロ
4. `sample_outputs.txt` と同品質の出力が出ることを目視確認（まるこ検品）

**1〜3が全て通るまでタスク3に進まない。**

### タスク3: pandora_main.html 組み込み
- 生成モード分岐: 選択された unit_id に対応するパターンが patterns_g02.json にあればパターン生成、無ければ従来のAI生成＋checkConsistency()（従来経路は無変更）
- テーマ解決: 生徒の theme_id → themes/*.json 読み込み。解決順は default_school_v1.json 内の resolution_rule に従う（themed_templates[pattern_id] 優先、無ければ pattern.sentence_templates）。theme_id 未設定の生徒は default_school_v1
- ログ: `[patternGen]` プレフィックス（`[checkConsistency]` と区別）
- verify() FAIL時の挙動: ユーザー向け再生成促しではなく、コンソールエラー＋その問題をスキップして再サンプリング（発火＝実装バグの信号）
- 静的アセット配置: patterns_g02.json / themes/ は fetch で読む静的ファイルとしてリポジトリに置く（Supabase不要）

### タスク4: medium難度バリエーション【軽作業・ついで】
constraints_replace を使い、以下を追加:
- 複名数の繰り上がりあり（2L6dL+4dL=3L 型）: no_dl_carry を carry_required 系に差し替えた unit override または difficulty override
- ※午前/午後またぎの時刻計算は formatter の正午表記（午後0時）対応が先に必要（formatter_tests.json の known_limitation 参照）。今回はスコープ外とし、TODOコメントのみ残す

### スコープ外（今回やらない）
- Lethe側の theme_id 列追加（次回、Lethe側セッションで実施。それまで全生徒 default_school_v1 で動く）
- 時計読み取り(c02)・アレイ図(c47)のSVG連携
- 他学年のパターンバンク

## Fableセッションへの持ち帰り事項
- タスク0で見つかった齟齬（あれば）
- タスク2-4の目視検品で見つかった日本語の不自然さ（テンプレート修正はバンクJSON側で行い、修正内容を記録）
