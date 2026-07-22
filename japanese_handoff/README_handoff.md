# README_handoff — Pandora国語 中学帯（jhs）データ統合

## 目的
既存の国語教材生成システム（Japanese_story_generator.html / Japanese_question_generator.html / Japanese_quiz_template.html、小1〜6対応済み）に中学帯（jhs・中1〜3共通の単一帯）を追加する。本パッケージは、市販問題集の**構造分析から抽象化した独自データ**（単元・出題規則・構成パターン）であり、原典の本文・設問文は含まない。生成される文章・設問はすべてオリジナルであること（原典の文章の複製・改変生成は行わない）。

## 同梱ファイル
| ファイル | 内容 |
|---|---|
| unit_bank_jhs.json | 読解11単元（観点タグ・スキル・根拠ゾーン）＋強化学習/入試対策の補助カテゴリ |
| question_guidelines_jhs.json | 確認/練習/実戦の出題規則、字数ルール、採点基準9コード、記述問題アーキタイプw1〜w9 |
| pattern_bank_jhs.json | ジャンル別構成パターン10種＋難易度スケーリング |
| jhs_kokugo_analysis_log.md | 分析根拠ログ（設計判断の背景資料） |
| test_vectors.md | 統合後の検証観点 |

## 統合方針（重要な設計判断）
1. **難易度体系**：小学＝確認/練習/完成、中学＝確認/練習/実戦。**実戦は完成の改名ではない**。structure_typeは3難易度とも `single_long_text`（分割形式なし）。既存の structure_type enum に `single_long_text` が無ければ追加し、小学「完成」の分割ロジックは jhs では発火させない。
2. **フィールド名の整合**：既存の小学版 UNIT_BANK / QUESTION_GUIDELINES / PATTERN_BANK のキー名（unit_id, observation_tags, structure_type 等）に本JSONの命名を合わせて調整してよい。意味の変更は不可。
3. **Supabase payload**：既存の `subject: "japanese"` をそのまま使用し、`grade` 相当のフィールドに `"jhs"` を渡す（小学の g01〜g06 と同列の帯コード）。QRフォーマット・submissions テーブルは変更なし。
4. **採点（Layer 2.5 連携）**：記述の自動採点プロンプトは question_guidelines_jhs.json の scoring_criteria_codes を二層で適用する——①内容要素チェック（Cコード：要素が揃えば表現が違っても可・要素単位の部分点）→②形式チェック（A/B/D/H：文末・キーワード・字数・書き出しは機械的に判定可能なので正規表現＋文字数カウントで先に落とす）。字数カウントは句読点・符号込み、「以内」は上限の8割未満を不可とする。
5. **文章生成（Layer 2 / Qwen3）**：pattern_bank の paragraph_plan を骨子としてプロンプト化。jissen では空欄A〜C（接続語 or キーワード）を生成後に後処理で穿孔する方式を推奨（生成時に空欄を書かせると品質が落ちるため、完成文→空欄化の2段階）。
6. **出典表記**：生成文には架空筆者名『架空作品名』を付す。実在の県名を使った〈◯◯ 改〉表記は誤認を招くため使用しない（省略またはダミー表記）。
7. **文学ジャンルの固有仕様**：narrative の jissen は lead_box（前書き枠）必須、注釈は設問部冒頭に配置、締め問題は w9（当事者視点条件記述）を優先。expository の締めは w4/w5 系の統合記述。
8. **強化学習カテゴリ**：通常単元とは別モードとして実装（短文2題/ページ＋ポイント図解＋採点ルール注記）。初期リリースでは通常単元11章を優先し、強化学習モードはフェーズ2でよい。

## 実装優先順位（提案）
1. unit_bank / question_guidelines / pattern_bank の読み込みと既存スキーマへのマッピング
2. jissen の expository 1パターン（jhs_exp_01）でE2E生成 → 印刷レイアウト確認（@page margin:0 の既存教訓を踏襲）
3. narrative（lead_box対応）→ essay
4. 採点コードの Layer2.5 組み込み
5. 強化学習モード（フェーズ2）

## 未決事項（実装時に相談）
- 帯コードの表記：`jhs` で統一するか `g07` 系の連番にするか（既存Excelは Pandora_jhs.xlsx なので `jhs` 推奨）
- 実戦の本文文字数上限とA4印刷1ページの収まり（行数表示の実装と絡む）
- 入試対策・入試実戦テスト相当の「総合パッケージ」モードをどう扱うか（初期スコープ外を提案）
