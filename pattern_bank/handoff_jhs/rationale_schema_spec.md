# design_rationale 仕様書 — Pandora2 訓練データ層 v1.0

旧 quality_criteria(Layer1/Layer2構造の問題採点基準・実体未記入のまま退役)に代わり、
パターンバンクの上に**設計判断の訓練データ層**を新設する。目標モデルは「問題を書くAI」ではなく
「**指示に従ってバンクを書くAI**」。人間(まるこ・アイ)の指示と訂正が学習に乗ることを構造で保証する。

## 1. 三層のデータと置き場所

| ファイル | 内容 | 配置 |
|---|---|---|
| patterns_gXX.json | パターン本体(現行のまま・不変) | 配信(公開) |
| rationale_gXX.json | design_rationale(pattern_idキーのサイドカー) | リポジトリ内・配信除外 |
| corrections_log.json | 人間訂正レコード(全学年共通・追記型) | リポジトリ内・配信除外 |

ハイジーン規約は公開バンクと同一を全ファイルに適用(教材名・実物ID・実物数値の転記禁止)。
ローカル学習でも規約を分岐させない。

## 2. 訓練ペアの構造(1パターン=1ペア)

```
brief(入力: 設計依頼書) → rationale(中間: 設計判断) → pattern(出力: バンクJSONそのまま)
```

### brief スキーマ
- grade / unit_id / unit_name
- semantic_territory: 意味領域の一言(例「割合・逆算」「異分母分数の加法」)
- number_domain: 数域(整数 / dec1 / dec2 / 千分率 / 分数 …)
- answer_structure: single / comparison / round_range
- figure: なし / kind名
- step_count: 1 / 2
- **directives[]: 人間の設計指示。各 {text, by, date}**

directives が本仕様の要。「答えは整数のみ」「第3用法は独立カテゴリで難度管理」「逆算重視で厚く」
のような指示を入力側に置いて学習させることで、**指示が効くモデル**になる(空なら自律設計を学ぶ)。
ゴールド標本の directives には、実セッションでまるこが発した指示を出所つきで転記する。

## 3. design_rationale スキーマ(7区画・日本語・計10〜20行目安)

1. **source_features** — 単元のどの特徴が設計を駆動したか(抽象・実物非引用)
2. **representation** — 内部表現の選択と理由(スケール整数・千分率・clock分…)
3. **constructive_guarantees** — 割り切れ・成立性の構成的保証の組み方(設計文化の核)
4. **semantic_position** — 意味カテゴリ体系内の位置(第3用法・逆算・2段…)
5. **exclusions** — 除外した自明・退化ケースと理由(負例信号。value_constraintsのwhyと対応)
6. **figure_notes** — 図がある場合のみ: 値域と描画可能性・ラベル分離の関係
7. **pedagogy** — **人間の声の転記先**。AIの推測を書かない。まるこ・アイの発言・検収観点を
   {text, by, date} で記録。空であることが正常(人間が語ったときだけ埋まる)。

## 4. 訂正ループ(人間が確実に指示を送れる経路)

人間の訂正は必ず corrections_log.json に1レコード追加する。運用: Fable/Codeが訂正を受けた
セッションのクローズ時に記録(記録漏れはクローズ条件違反とする)。

### correction レコード
- id / date / by(marko・アイ)
- scope: 対象(pattern_id / kind / 全域規約 のいずれか)
- observed: 何が起きていたか(誤りの状態)
- instruction: **人間の指示(原文に近い形で)**
- resolution: どう直したか(採用した設計)
- generalization: 一般化された教訓(次の設計に効く形の一文)

### 学習・検索への接続(両方に乗る)
- **FT(修正ペア)**: `(誤り状態の要約 + instruction) → resolution` を revision 訓練ペアとして
  自動整形。「間違いを指摘されたら直せるモデル」を明示的に学習させる。
- **FT(本則)**: generalization は該当kindや領域の rationale(exclusions/figure_notes)にも
  反映し、以後の設計ペア自体を正す。
- **RAG**: corrections と rationale を文書単位で索引化(メタデータ: grade/unit/kind/区画)。
  Pandora2運用時、新規設計の前に類似単元・同一kindの過去判断と訂正を必ず検索して文脈に入れる。
  → 人間の指示は「学習済み重み」と「検索で届く文書」の二重経路で将来の生成に効く。

## 5. 生成・検収フロー(役割固定)

1. brief作成(人間 or AI下書き→人間確認。directivesは人間のみ記入可)
2. AI がrationale+patternを設計
3. 機械検収(verify・ストレス・描画可能性悉皆・ハイジーン)
4. **人間検収(最終採用は必ず人間)**。訂正が出れば corrections_log に記録→②へ戻る
5. 採用パターンとrationaleを確定、訓練ペアに追加

現行のFable⇄まるこの運用をそのままモデルに引き継ぐ構図。モデルはFableの席に座り、
まるこの席(スコープ確認・目視・最終採用)は不変。

## 6. 遡及と今後

- g05: ゴールド標本8件を本セッションで手書き(型空間を張る選定)。残り62件は形式安定後に
  AI下書き→まるこ検収で遡及。
- g02〜g04: 同上(優先度低。g05の遡及で手順を確立してから)。
- g06以降: バンク設計と同時にネイティブ記述(briefを設計セッションの冒頭成果物にする)。
- 抽出: make_training_pairs.py が pairs_design.jsonl / pairs_revision.jsonl / rag_docs.jsonl を
  機械生成(スキーマ検証込み)。学習実行は全学年完了後(既定方針どおり)。
