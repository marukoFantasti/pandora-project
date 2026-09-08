# 国語 棚卸し（2026-09-07・読み取りのみ・コード変更なし）

- 対象: Japanese_question_generator.html（QG・3445行）／Japanese_story_generator.html（SG・2177行）／pandora_global_generator.html（GG・2674行）／homework/（jio課題ビルダー・未追跡）／japanese_handoff/／tests/・pandora_grading.html・result_view.html・Japanese_quiz_template.html・Japanese_print_template.html。
- 前提の訂正2点: ①GGは「算数＋国語混在」ではなく**国語の本文専用**（算数の語は generation_lessons の subject 列の説明コメント L1919 のみ）。②japanese_handoff/ の JSON は **8ファイル**（トップ3＋samples 5）。「9ファイル」の9件目は見当たらない（.DS_Store のみ）。
- API共通: 3アプリとも Anthropic Messages API をブラウザ直叩き（`anthropic-dangerous-direct-browser-access`・キーは localStorage `japanese_generator_api_key`）。**モデルは全経路 `claude-sonnet-4-6` 固定**（文字列が計7箇所に散在・集中管理定数なし）。structured outputs 不使用（「JSON以外禁止」指示＋手動フェンス除去）。

---

## 1) 生成経路

凡例: 学年=①文章レベル（g1..g6/jhs）／題材=ジャンル（monogatari/setsumei/ronsetsu/zuihitsu）・観点タグ／国内/海外=domestic/global（切替UIなし・レコードの `globalSource` で自動判定）。

| 経路名 | 入力（学年・題材・国内/海外） | 出力 | モデル・プロンプト所在 | 呼び出し元 |
|---|---|---|---|---|
| SG `generate` (L1034-1243) | 学年 g1..g6/jhs・ジャンル・難易度(kakunin/renshu/kansei/jissen)・タイトル・段落アウトライン・文体・目標字数・フリガナレベル・学習メモ(Supabase)／domestic | **本文**（ルビ《》込み）＋jhs実戦は後処理で空欄A〜C穿孔（`punchJhsBlanks` L987-1020・非AI） | claude-sonnet-4-6（jhs 4000／他 2000）・プロンプト本体 L1122-1160（部品 L1077/1081/1085/1105-1113/1024-1033/850-858/1643-1650） | ボタン #genBtn（HTML L302）・「作り直す」L349 |
| SG `proposeNextDay` (L1786-1888) | 1日目本文・段落ラベル | 次の日のタイトル＋アウトライン（本文は生成しない） | 同・1500・L1817-1831 | #nextDayBtn（L350） |
| SG `checkFacts` (L1893-1992) | 本文（result/rewrite） | 校閲コメント（非物語は web_search_20250305 ツール付き L1945-1947） | 同・1500・L1913-1938 | HTML L320/L338 |
| SG `aiReviseWithFeedback` (L1994-2117) | 元本文＋AI指摘＋人間指摘＋生成時設定 | **本文の全面リライト** | 同・2000・L2048-2072 | checkFacts が動的挿入するボタン L1983 |
| QG `generateQuestions` (L1128-1379) | story record（grade/genre/difficulty/fullText/wakachi/allowedKanjiList/furiganaTargetKanjiList/jhsMeta.blanks）・観点タグ・設問数3〜6／domestic | 読解**設問＋選択肢＋解答＋解説**（jhsは archetype/char_condition/scoring_criteria 付き） | 同・4000・L1240-1250（部品 L1163/1164/1167/1171/1177-1225/1228） | #genQuestionsBtn（HTML L295） |
| QG `generateQuestionsGlobal` (L1420-1594) | globalSource record（②語彙軸 vocabLevel・③漢字軸 kanjiLevel・①文章軸）／海外 | 帯1読解＋帯3書く練習を1回で同時生成（en_hint付き） | 同・3500・L1441-1477 | generateQuestions の分岐 L1149-1152 |
| QG `generateKanjiQuiz` (L1815-1869) | grade の新出漢字を機械抽出（`getGradeNewKanji` L1794→5字）／domestic | **漢字読みクイズ**5問（ア〜エ選択） | 同・2000・L1820-1834 | generateQuestions L1330（#kanjiQuizCheck）・`generateKanjiQuizOnly` L2470（HTML L298） |
| QG `generateKanjiQuizGlobal` (L1871-1929) | kanjiDiffList（③軸差分）／海外 | 漢字1問（pre1以外は書き取り canvas／pre1は選択） | 同・1200・L1893-1925 | generateQuestionsGlobal L1519 |
| QG `generateVocabQuizGlobal` (L1931-1979) | VOCAB_QUIZ_TYPE_PLAN[②軸]・本文候補語／海外 | **語彙クイズ**1〜2問（meaning/antonym/kana） | 同・1500・L1957-1972 | generateQuestionsGlobal L1528 |
| QG `generateOneVocabQuiz` / `rewriteVocab` (L1981-2025 / L2083-2140) | 型固定・forceWord/avoidWord／修正指示 | 語彙1問の作り直し／設問文リライト | 同・1000 | L2027/L2053/L2222 |
| QG `generateOneWritingTask` / `rewriteWritingTask` (L2232-2271 / L2319-2375) | 候補文・候補語（L1109/L1119）／海外 | **書く練習**1問（trace/copy/fill/compose）／リライト | 同・1200 | L2273/L2297/L2460 |
| QG `regenerateOneExtraction` (L2583-2632) | 失敗理由（_overLimit/_midStop）・学年上限 | 抜き出し1問の作り直し（自動リトライ用） | 同・1000・L2606-2628 | `retryOverLimitExtractions` L2634-2650 |
| QG `regenerateOneForFurigana` (L2671-2700) | 3層ルビルール（L765） | 設問文・選択肢のルビ／配当外漢字の書き直し | 同・1500・L2685-2697 | `retryFuriganaIssues` L2702-2716 |
| QG `regenerateQuestion` / `rewriteQuestion` (L2910-3019 / L3021-3093) | 既存設問の question+answer（重複回避）・観点/形式指定 | 読解1問の作り直し／設問文・選択肢のみリライト | 同・1500・L2955-2977 / L3040-3070 | ボタン L1677/L1702/L1709 |
| QG `generateOneKanjiQuiz` / `rewriteKanji` (L3095-3155 / L3224-3306) | 対象漢字固定・avoidWord | 漢字1問作り直し／リライト | 同・1200・L3121-3153 | L3157/L3185/L3371 |
| GG `generate` (L1316-1588) | 学年 pre1,g1..g6,jhs（LEVELS L435-474）・4軸（①文章 ②語彙 ③漢字 grade/JLPT ④ふりがな）＋分かち書き・ジャンル・難易度／**海外専用**（globalSource:true L1663） | **本文**＋英語サポート（段落要約＋glossary）＋jhs実戦の空欄穿孔（L1269-1302） | 同・jhs 4000／他 2000・L1454-1489（部品 L1370-1437/1306-1315/1129-1138/2087-2094） | #genBtn（HTML L330）・L390 |
| GG `proposeNextDay` (L2230-2332) | 1日目本文 | 次の日タイトル＋アウトライン | 同・1500・L2276 | #nextDayBtn L391 |
| GG `checkFacts` (L2337-2437) | 本文 | 校閲コメント（非物語は web_search） | 同・1500・L2394 | L349/L368 |
| GG `aiReviseWithFeedback` (L2438-2605) | 元本文＋指摘＋生成時設定 | 本文リライト＋英語サポート再生成 | 同・2000・L2500-2540 | checkFacts が挿入 L2427 |
| homework/ build.py | week1.json（手書き JSON・student/week/days/drill/reading/kanji/checklist） | 紙.html／紙.pdf（weasyprint）／デジタル.html／make_audio.sh（macOS say）／録音台本 | **AIなし**（import は html/json/random/re/sys のみ） | `python build.py week1.json`（まるこ手動） |

---

## 2) 静的教材（japanese_handoff/*.json 8ファイル）

| ファイル | 学年 | 設問型・内容 | 件数 | 最終更新 | 検収記録 |
|---|---|---|---|---|---|
| unit_bank_jhs.json | jhs（中1〜3共通帯） | 読解単元（観点タグ4・スキル4・根拠ゾーン）＋補助カテゴリ（強化学習 writing_drill 7・入試対策 mixed_package） | 単元11（u01-u05 説明・u06-u09 物語・u10-u11 随筆）＋補助2 | 2026-08-04 | **なし**（meta は version 0.1.0 のみ） |
| question_guidelines_jhs.json | jhs | 難易度別出題規則（確認4-5問/練習5-8/実戦5-6＋40〜70字記述必須）・字数ルール・採点コードA〜I・記述アーキタイプw1〜w9・既定組合せ | 難易度3／採点コード9／アーキタイプ9／組合せ6 | 2026-07-19 | なし |
| pattern_bank_jhs.json | jhs | ジャンル別構成パターン（paragraph_plan 4段・question_hooks 3）＋難易度スケーリング | パターン10（exp5/nar3/ess2）／scaling 3 | 2026-07-19 | なし |
| samples/sample_story_record.json | （小学想定） | story record 見本（**version:1**・現行 SG/GG は version:2） | outlines 4 | 2026-07-16 | なし |
| samples/sample_question_set.json | — | question set 見本（選択3問＋漢字クイズ1・`_verified` フラグ） | 設問3＋漢字1 | 2026-07-16 | なし（`_verified` は生成器の機械フラグ） |
| samples/sample_answer_sheet_layout.json | — | 答案用紙レイアウト（QR・fields座標） | fields 3 | 2026-07-16 | なし |
| samples/sample_submission_payload.json | — | submissions payload 見本（subject:japanese・problems2・kanji1） | — | 2026-07-16 | なし |
| samples/sample_lessons_export.json | — | 学習メモ export 見本 | lessons 2 | 2026-07-16 | なし |

- 付随md: README_handoff.md（統合方針8・優先順位5・未決事項3）、test_vectors.md（検証観点7節**30項目すべて未チェック**）、jhs_kokugo_analysis_log.md（分析根拠・2026-08-04）。
- **実行時にこれらの JSON を読むコードは無い**。QG/SG はコメントで出典を引く（QG L340/L370・SG L673）だけで、内容は HTML 内の UNIT_BANK.jhs（QG L342-360）・JHS_QUESTION_SPEC（QG L632-737）・PATTERN_BANK.jhs（SG L676-772）に**手写し**されている。手写し先との drift を検出する関門は無い（D10 の hyoki_rules_drift 相当が無い）。
- homework/week1.json（2026-09-04・手書き）: days3・drill(rows3×6+pairs3)・reading5文・kanji3文・checklist4・aims4。seg=`[表記,よみ]` 配列でルビを表現。未追跡（`git log -- homework/` 空・.gitignore に homework/site/）。

---

## 3) 設問型カタログ

| 設問型 | 生成する経路 | 関門・機械検査が検査していること | 検査していないもの |
|---|---|---|---|
| 選択（読解） | QG generateQuestions（domestic）／generateQuestionsGlobal／regenerateQuestion・rewriteQuestion | 設問文・選択肢のルビ付け忘れ/付けすぎ件数・配当外漢字（`verifyQuestionFurigana` L787-822・global は allowedKanjiList、domestic は furiganaTargetKanjiList が無い旧レコードでは**スキップ** L800）。D10 未囲みラベル（global 一括のみ L1567-1570） | **選択肢の個数**（maxChoices はプロンプト指示のみ・length 検査なし）・**正答∈選択肢**の照合・選択肢の重複/同義・正答と解説の妥当性・観点タグの充足 |
| 抜き出し／抜き出し穴埋め | QG generateQuestions／Global／regenerateOneExtraction | **本文照合**（stripRuby＋空白除去で includes→`_verified`）・実測字数（句読点含む）・**学年別上限**（EXTRACTION_MAX_CHARS L831: pre1:6/g1-2:10/g3-4:15/g5-6:20・**jhs 上限なし**）・**中止形ガード**（L865 `(たくて|くて|ていて|なくて|ないで|んで|ながら)$`・穴埋めは対象外）・設問文「〜字」の実測値への自動書換（L921-928）・正答の完全一致/包含の重複検出（L2860-2884）。自動リトライ各1回（字数/中止形→L2634・ルビ→L2702） | 記述式・選択式には未適用。tests/ には抜き出し照合のベクターが無い（japanese_nondestructive は endsWithMidForm の7文字列だけ） |
| 記述（小学） | QG generateQuestions | （なし。ルビ検査のみ） | 模範解答の字数・文末形式・解説の妥当性 |
| 記述（jhs） | QG generateQuestions（archetype w1〜w9・採点コードA〜I付与 `attachJhsScoring` L947-962） | 字数条件（inai=上限の80〜100%・range=範囲内 `verifyJhsCharLimits` L964-989）・「（句読点も字数に含める。）」の自動追記 | **scoring_criteria は採点側で未消費**（pandora_grading/result_view/templates に出現0）＝Layer2.5 未実装 |
| 空欄補充（jhs実戦・接続語） | SG/GG punchJhsBlanks（非AI）→QG が blanks を素材に | 穿孔失敗の警告のみ | answer_key の整合・空欄数 |
| 漢字読み（選択・domestic） | QG generateKanjiQuiz／generateOneKanjiQuiz | `word` に `kanji` を含むか（`_verified`） | **読みの正誤**（furigana_lexicon は国語で未使用・reading_engine 未接続）・選択肢の妥当性 |
| 漢字書き取り（海外・canvas） | QG generateKanjiQuizGlobal | 同上 | 同上（採点は画像目視） |
| 語彙（meaning/antonym/kana・海外） | QG generateVocabQuizGlobal／generateOneVocabQuiz | `word` が本文中に存在するか | 反対語・意味・かな変換の正しさ |
| 書く練習（trace/copy/fill/compose・海外） | QG generateOneWritingTask 系 | copy/trace=本文の部分文字列か・fill=answer_word と「（　）」の存在（L1380-1397） | **compose は無検証**・en_hint の内容 |
| ゃゅょ穴うめ／○つけ／なぞり書き／よみ結び／ふりがな書き／音声（homework） | build.py（非AI・cloze L29-31・kanji_pairs L40-46 は week番号 seed で再現） | build.py に assert/schema 検査なし。split_audio.py の VAD 区間数≠行数で停止（L57-61）のみ | JSON の妥当性全般・D10（build.py 未接続=台帳 L464「まるこ側で1行接続」）・音声IDの位置依存（挿入で r3 がずれる） |

---

## 4) 関門一覧（国語に効くもの）

| 名前 | 検査内容 | 対象経路 | AI生成経路では警告止まりか停止か |
|---|---|---|---|
| tests/japanese_nondestructive.js | SG `verifyFurigana`/`stripRuby`、QG `endsWithMidForm`（7文字列）、quiz_template `summarizeQuestions` の**4値スナップショット**（golden 2026-08-16）。golden 欠落時は現状で**自動再基線化して0終了**（L91-96） | SG/QG/Japanese_quiz_template のソース抽出（実行時ではない） | 実行時には効かない（pre-push のみ） |
| tests/hyoki_rules_drift.js | 4 HTML（pandora_main/QG/SG/GG）のインライン D10 断片が `hyoki_rules.js` INLINE_SNIPPET と**バイト一致**・7ベクター挙動一致・py LABELS 一致 | QG/SG/GG のインライン複製 | コピー忠実性のみ。実行時の D10 検査は **警告のみ**（QG L1541-1543 verifyNotes・SG L1975-1978・GG L2419-2422） |
| tests/hiragana_label_brackets.js | 未囲みひらがな1字ラベル(あ〜こ)ゼロ: 算数バンク＋**japanese_handoff/*.json（samples 含む）**＋homework/*.json（**未追跡のため fresh clone では走査0**） | 国語静的JSON・homework JSON | 静的データのみ。生成出力は対象外 |
| tests/furigana_coverage.js／single_char_contexts.js | 算数編（ヘッダ明記）。furigana_lexicon の残存漢字・1字文脈 | **国語は対象外**（QG/SG/GG は lexicon・reading_engine を参照しない） | — |
| tests/review_queue_integrity.js | 検収台帳スキーマ（教科∈算数/国語 を許容・件数を表示するだけ） | 台帳 | 国語行の存在は要求しない（現状 国語0） |
| （実行時ガード）QG `verifyAndFixExtractions` L873-931 | 抜き出し本文照合・字数・上限・中止形・「〜字」自動書換 | QG domestic/global | **警告＋各1回の自動リトライ**（失敗時は元を保持・生成は常に成功し localStorage 保存 L1355） |
| （実行時）QG `detectDuplicateAnswers` L2860 | 抜き出し正答の重複 | QG | 警告のみ（自動リトライなし L2858） |
| （実行時）QG `verifyQuestionFurigana` L787 | ルビ件数・配当外漢字 | QG | 警告＋リトライ1回（旧 domestic レコードはスキップ） |
| （実行時）QG `verifyJhsCharLimits` L964 | jhs 記述の字数条件 | QG jhs | 警告のみ |
| （実行時）SG `verifyFurigana` L833／GG `verifyFurigana` L1112 | 本文ルビの付け忘れ/付けすぎ件数（読みの正誤は AI 任せ） | SG/GG | 警告のみ・リトライなし |
| （実行時）GG 英語サポート段落数照合 L1548-1556 | enSupport 段落数＝本文段落数 | GG | 警告のみ |
| （実行時・停止）API非200・JSONパース失敗・questions空・global writingTasks<2（QG L1266-1284/L1489）・GG JLPT未ロード（L1361-1364） | — | QG/GG | **停止**（例外→未描画） |
| .githooks/pre-push | tests/*.js 全関門赤なら push 拒否 | リポジトリ全体 | 国語の実行時品質には無関係 |

---

## 5) 既知の不具合・TODO

| # | 所在 | 内容 |
|---|---|---|
| 1 | QG L991-1002 `renderSplitWarning` / L365-389 | 小2〜小6「完成」の split_texts_independent／split_parts_same_story は**1本の本文しか扱えない**（「2文章対応は今後実装予定」「続き生成・2部構成対応は今後実装予定」） |
| 2 | QG L831-832 | jhs の抜き出し字数上限なし（キー未定義でスキップ・「現状維持」） |
| 3 | QG L607-624 QUESTION_GUIDELINES | g2・g3・jhs のエントリ欠落（g5/g6 は setsumei 欠）→ L1163 が空文字・L1237 の汎用文へ暗黙フォールバック |
| 4 | QG L800 | domestic 旧レコード（furiganaTargetKanjiList 無し）は配当外漢字検査を丸ごとスキップ |
| 5 | QG L1175/L1410/L2243・README §4・test_vectors §5 | jhs scoring_criteria（Layer2.5 二層採点）は生成側で付与のみ・**採点側未実装**（pandora_grading に出現0） |
| 6 | QG L315-333/L594/L553-555 | UNIT_BANK g1/g2/g3物語 が `estimated:true`（分析ログからの推定・要検証）。jhs 構造判定も推定 |
| 7 | QG L2813-2816 | 手動編集の再検証が未対応のまま残っていた（フォローアップ監査で是正済み・記録） |
| 8 | QG L1600-1607/L2946-2950/L3117-3120 | global 対応漏れが確認作業で複数回発覚し修正（共有関数の global 分岐・形式が黙って変わる） |
| 9 | SG L404/L2148 | jhs の漢字配当リスト未整備＝漢字使用制限なし（一旦保留）。KANJI_CUMULATIVE に jhs 無し→QG 漢字クイズは jhs で不可（L1818/L2485） |
| 10 | SG L2062 | `aiReviseWithFeedback` が「段落数は4段落のまま維持」を**ハードコード**（パターン3〜5段落・jhs 5〜8段落と食い違う） |
| 11 | SG L2102-2110 | AIリライト後に `hoSaveStory()` が呼ばれず、QG への持ち回り（localStorage）が**古い本文のまま** |
| 12 | SG L1119/L1233 vs L2046 | generate は引数なしで現在の UI 値を読むため、生成中に UI を触ると検証基準がずれる |
| 13 | SG L1643-1650／GG L2090 | 学習メモをプロンプトへ**全件注入**（上限なし・200件で alert のみ・「Pandora統合時に移行予定」） |
| 14 | SG L442-450 | LENGTH_DEFAULTS g2〜g6 が推定値（estimated:true） |
| 15 | GG L1361-1364 | JLPT 配当データ未ロード＝ハードブロック（「実装フェーズ3で対応予定」） |
| 16 | GG L1655-1657 | enSupport は生成時スナップショット・手動編集で desync（スコープ外と明記） |
| 17 | SG L1946／GG L2391 | web_search ツール型が旧版 `web_search_20250305` |
| 18 | pandora_grading.html L871-979 | 国語選択式の自動採点は**先頭1文字比較**のみ（L877-881）。抜き出し/記述は canvas 画像のみ（文字列照合なし）。`calc`（計算ミス）は国語に不適だが状態体系は共通 |
| 19 | pandora_grading.html L1571-1672 | 「AI採点補助」は**数学の答案採点プロンプト**固定（L1594・equation_ok を要求）かつ x-api-key なし＝CLAUDE.md L85 の未実装経路。国語記述の AI 採点は実質不在 |
| 20 | result_view.html | 国語分岐なし（式/答え canvas を常に描画・国語では「式=未記入」表示） |
| 21 | pandora_grading.html L1380-1421 | 国語は results 列を流用（unit_name=観点・chapter_name=形式・diff=学年）＝スキーマ上の意味ずれ |
| 22 | homework/ | 未追跡（git log 空）・build.py に検査なし・D10 未接続・音声 ID が位置依存・publish.sh は `紙.pdf` 不在を `|| true` で黙認（out/week1 の PDF は別名 `ジオくん_課題_20260904.pdf`）・site/hw/week1cd/ が空ディレクトリのまま公開リポジトリにコミット・site/hw/week1/audio/dp.m4a（111666B 18:22）と out/week1/audio/dp.m4a（20705B 17:29）が不一致＝配布側だけ差し替えられ source が追随していない・homework/.env に service_role キー |
| 23 | CLAUDE.md | 国語アプリ4本（QG/SG/GG/quiz・print template）が**記載なし**（「4つのHTML」「テストなし」のまま） |
| 24 | pandora2/corrections_log.json | 国語の訂正が**0件**（中止形ガード a3ea413・「確認指示への対応」1fd5c2d 等は未記録＝CLAUDE.md の必須規約に未準拠） |
| 25 | japanese_handoff/test_vectors.md | 30項目すべて未チェック（統合検証の記録なし） |
| 26 | モデル固定 | `claude-sonnet-4-6` が QG L1261/L1846/L2525・SG L1180/L1841/L1941/L2084・GG 4箇所に散在 |

過去の手直し履歴（git・国語関連の主なもの）: a4d6cf6（抜き出し上限・1問作り直し・重複検出）、a0a8b4a（フリガナ機能・ルビ記法《》・4アプリ）、a3ea413（抜き出しの中止形ガード）、1fd5c2d（漢字クイズ地の文に kanjiLevel・確認指示対応）、8e1d1fe（設問文フリガナ完全実装）、fe6fa75（帯3「視写＋視写」重複解消・isExtraction監査）、24be530（domestic ルビ戦略統一・機械検証・リトライ）、afcc4c2（国語非破壊ハーネス新設）、3932a18（D10 4経路インライン）、313940d（D10-2 同期）、da2a782（著作権ハイジーン・japanese_handoff）、8f25634（grading の japanese 対応）。

---

## 6) 差し替え経路（生成済み1問／1本文の個別再生成・置換）

| 対象 | 手段 | コマンド／操作 | 既配布分への反映 |
|---|---|---|---|
| 読解1問 | **あり**（QG） | UI: 「🔄 この問題だけ作り直す」（L1677）／「この観点で作り直す」（L1702・`regenerateWithKanten`）／「リライト」（L1709・答え不変）／手動編集保存（L1680）。CLI 無し | localStorage `japanese_latest_question_set` を上書きするのみ。**Supabase に設問は保存されない**。配布済み quiz HTML／印刷 PDF は手動で再出力・再配布が必要（自動反映なし） |
| 漢字1問／語彙1問／書く練習1問 | あり（QG） | 同じ漢字で作り直し／別の漢字（L3185）／同型別語／指定語（L2053）／型変更（L2297）／リライト／手動編集 | 同上 |
| 漢字クイズ帯のみ後付け | あり | `generateKanjiQuizOnly`（HTML L298） | 同上 |
| 本文（passage） | **まるごとのみ**（SG/GG） | 「🔄 作り直す」＝`generate()` 再実行／AIリライト `aiReviseWithFeedback`（result/rewrite 両欄を上書き）／`resetRewrite`。**段落単位の再生成は無し**。QG 側には本文差し替え無し | SG の本文は Supabase に保存されない（学習メモ `generation_lessons` のみ）。リライト後は hoSaveStory 未呼出のため QG へ渡る本文が古いまま（#5-11）。配布物は再生成→再配布 |
| jhs 空欄（穿孔） | 機械（非AI） | 生成時のみ。失敗時は「手動で［ A ］を挿入」 | — |
| homework 1問（例: reading 1文・音声1本） | **無し**（全体再ビルドのみ） | `python build.py week1.json` → `bash make_audio.sh`（または split_audio.py）→ `bash publish.sh week1`（site/hw/week1/ を rm -rf→cp→git push）／`python upload.py week1`（Supabase Storage homework/jio/week1/ へ x-upsert） | GitHub Pages は publish.sh の再 push で**全差し替え**、Supabase Storage は upload.py を別途実行しないと更新されない（2経路は独立）。音声 ID は位置依存（挿入で以降がずれる）。既配布 URL: https://marukofantasti.github.io/pandora-quiz-test/hw/week1/ |
| 配布済み quiz/print HTML（GitHub Pages の japanese_quiz_S-0004_*.html・story_S-0005_day1.html 等） | 無し | 生成器で再出力→ site/ へ手動コピー→ git push（手順化されていない） | 手動 |

---

## アイの検収記録が一度もない項目

検収台帳（tests/fixtures/review_queue.json）は 863件すべて教科=算数で、**国語の行は0**。japanese_handoff/・homework/・コード内・台帳・corrections_log のいずれにも国語の検収（検収／レビュー／確認済／アイ）記録は無い。したがって以下は**全項目が未検収**（アイの戻り0）:

1. 生成経路（表1）の全19経路の出力（本文・設問・選択肢・解説・漢字・語彙・書く練習・英語サポート・校閲コメント・リライト）
2. 静的教材（表2）8 JSON＋README／test_vectors（30項目未チェック）／分析ログ
3. 設問型（表3）全10型の設問文・正答・解説・選択肢
4. 読み: 国語本文・設問のルビ《》の**読みの正誤**（機械は件数のみ・lexicon 未使用）、漢字読みクイズの読み、homework の seg ふりがな
5. 図・レイアウト: Japanese_quiz_template／Japanese_print_template の表示（ルビ・帯構成・QR）、homework 紙.html／デジタル.html／PDF
6. 採点・表示: pandora_grading の国語カード（先頭1文字比較・canvas）、result_view の国語表示（国語分岐なし）
7. 配布物: GitHub Pages 上の japanese_quiz_S-0004_*.html・story_S-0005_day1.html・hw/week1（音声12本含む）
8. 台帳・記録: 国語の便・golden・corrections_log 記録が存在しない（記録の仕組み自体が未接続）

（算数側でもアイの「済」は0件・済は graph_choice 図のまるこ1件のみ。）
