# pandora_global 算数編 仕様書 v1.0（確定版・実装準拠）

**リリース**: pandora-global-math-v1 / **確定日**: 2026-08-18（まるこ目視全PASS 2026-08-14）
**前提文書**: pandora_global_japanese_spec.md v1.0（story編）・question編仕様書
**対象**: 算数バンク全資産（g01〜g06 + jhs14章 = 356パターン）の海外・継承語学習者向け配信
**実装**: 表示層後処理（`assets_global/`）。バンク/生成器/figure_builder/golden/md5 は1バイトも非接触。

---

## §0 基本方針（確定）

**数学ロジックは国内海外共通。変わるのは日本語の言語層のみ。**

- **表示層後処理方式**。バンクJSON・生成器（generate_poc_v10系）・figure_builder・golden基準md5（20本）・パリティ・照合表は**1バイトも触らない**。スロット展開済みの本文・答え文字列に、表示直前に言語変換を適用する。
- **ゼロAIコール**: 変換は全て辞書照合＋規則表による決定的機械処理。実行時AI呼び出しなし・シード再現性無傷。
- **レコード駆動の自動切替**（国語版思想）: 生徒レコードがpandora_global由来ならglobalモード、国内は従来動作。手動トグルなし・モードバッジ常時表示。
- **国内バイト不変が絶対条件**。専用の非破壊ハーネスで機械保証。

## §1 4軸の算数へのマッピング（確定）

| 軸 | 算数での適用 | 実装 |
|---|---|---|
| ③漢字レベル | **主軸**。本文・しき・答えの漢字を読み化 | `furigana_lexicon.json`（381表層）で最長一致。読みは漢字部対応・かな残し |
| ④フリガナレベル | **主軸**。ルビ付与モード | `readingSupport`='ruby'（全付与・既定）/'kana'（ひらがな化）/'off'。《》→`<ruby>` |
| ②語彙文法レベル | **従属軸**（§1.1） | 変換対象にしない。運用ガイド（`README_operation.md`）でのみ参照 |
| ①文章レベル | **N/A** | 適用しない |

### §1.1 語彙文法レベルを変換しない理由【裁可① 確定】
算数用語（あわせて・のこり・道のり…）は教科の学習内容そのもので、そのまま教える（言い換えると算数が壊れる）。支援はふりがな・TTSで行う。レキシコン語はバンク設計で日常語に統制済み。→ 語彙差替えは行わず、②軸は運用ガイドの目安にのみ使う。

## §2 変換の適用箇所（確定）

- 問題本文（スロット展開後の完成文字列）・しき三点セット・答え文。
- 単位・助数詞の読み（§3.2）。
- **図（SVG）内テキストは v1 対象外**【裁可② 確定】。実態は悉皆調査済み: figure_builder の漢字リテラルは3件（全てエラーメッセージ＝生徒非露出）、figure_params内の露出は**異なり48文字列**（jhs_c09統計表ヘッダ23・g05表14中心）。**v1.1でSVGテキスト後処理を追加予定**。
- UIラベル（`正解：`等）は未ルビ（仕様・v1）。

## §3 読み辞書サイドカー（規約5の写像）

### §3.1 furigana_lexicon.json（381表層・配信）
本文・答え・全レキシコンに出現する漢字語→読みの対照表。**悉皆inventory＋網羅ハーネスで欠落0を関門化**。
- ⚠️ 教訓: 静的テンプレ抽出だけでは**実行時フォーマッタ合成出力**（clock=午前/午後、歩合=割分厘）を取りこぼす。網羅ハーネスは**実レンダ標本**（makeProblem出力）で組む（Phase1でRED3件を検出→辞書パッチで解消。corrections_log corr-0017）。

### §3.2 counter_reading_table.json（32種・数詞+助数詞の規則表）
「3本=さんぼん」「1本=いっぽん」等の連濁・促音を規則表化（数詞成分表 numeral_components ×助数詞 digit_readings、末尾成分変音・百/千合成）。small_notations: 小数・分数・帯分数・負数。
- **歩合の二段設計【Phase1.5】**: `buai_composite`（割/分/厘）で **分=ぶ**（時間ふんと別）。判定は二段:
  1. **局所（隣接規則）**: `{a}割{b}分{c}厘` とその部分列（割分/分厘）を一般の数値+単位より先に照合し、割/厘と隣接共起する分のみ ぶ。
  2. **大域（文脈ヒント）**: 割/厘を伴わない**裸の{n}分**は隣接規則で拾えないため、パターンの `unit_system`（=`answer_unit_system`、歩合は`buai_pm`）を表示層へ伝搬し `opts.buai` で 分=ぶ を強制。
  対照: `6分` ヒントなし→ろっぷん（時間）/ ヒントあり→ろくぶ（歩合）。

### §3.3 ひらがな化モード
レベル外漢字でなく本文全体をかな化（`mode:'kana'`）。同辞書で機械可能。TTS音源にも使う。

## §4 実装アーキテクチャ（確定）

- **`assets_global/`（配信対象）**: `reading_engine.js`（合成エンジン）・`math_display.js`（`processMathText(text,opts)`）・`global_student.js`（共有述語）・辞書2本。出所は `handoff_jhs/`（.vercelignore除外）、**配信コピー==出所のドリフト検査**あり。
- **海外判定（共有述語）** `isGlobalStudent(record,data)` = `mode==='overseas' ∨ globalSource===true ∨ vocabLevel存在`。算数・国語で同一。
- **post-processor** `processMathText(text, {mode, unitSystem})`: 処理順=（1）数値+単位（負数/小数/分数/帯分数/複名数・歩合二段）→（2）残り漢字を lexicon 最長一致→（3）残存漢字は例外（握りつぶし禁止）。
- **result_view.html【Phase2】**: 描画は無変更のまま、**海外時のみ描画後に engine+辞書を遅延ロード**して本文/答えへ適用（国内は isGlobalStudent=false でロード不発火＝バイト不変）。既定ruby・`readingSupport`優先・モードバッジ。
- **生成student quiz【v1.0.1】**: `templates/student_quiz_overseas_template.html` に engine+辞書+math_display+global_student を**完全インライン**（自己完結・外部依存/デプロイURL不要）。決定的ruby（`dangerouslySetInnerHTML`）・TTSはkana音源。engine不可時はAI手書き（q.jp/q.reading）へフォールバック。**国内テンプレは無改変**。`unit_system` は route-A生成出力へ付与（バンク非改変）。

## §5 運用ガイド表（パートナー向け）
→ `assets_global/README_operation.md` に分離（v1 仮置き2行・運用で較正）。

## §6 スコープ外（v1.1+ 在庫）
- 図内SVGテキストの変換（§2・48文字列・統計表ヘッダ中心）。
- UIラベルのルビ（§2）。
- en_hintサイドカー（パターン単位固定英訳356件）。
- kanji_level連動の readingSupport 自動較正（運用データ後）。
- 分かち書き（形態素なしでは不可・ふりがな+TTSで代替）。

## §7 検証・関門（全PASS・リリース確定）
1. **国内非破壊**: `math_display_nondestructive`（ドリフト0・isGlobalStudent国内false/海外true・国内表示凍結・国内テンプレmd5凍結）・`japanese_nondestructive`。
2. **辞書網羅**: `furigana_coverage`（全356パターン×実レンダ標本 残存漢字0・固定ベクター23件）。
3. **恒久関門**: 基準md5 20本・パリティ・jhs/g01恒等・図照合・corr-0007 gate・rationale_integrity(356) 全PASS。
4. **まるこ目視**（2026-08-14 全PASS）: 生成quiz実ランタイム・result_view・国内対照・豪州実ケース1本。

---

## 裁可ポイント（3点・確定）
1. **§1.1 算数用語は変換しない**（語彙文法軸は運用ガイドのみ・支援はふりがな/TTS）— 確定。
2. **§2 図内SVGテキストはv1対象外**（実態悉皆済み・48文字列・v1.1対応予定）— 確定。
3. **§4 en_hintはv1スコープ外**（v1.1在庫）— 確定。
