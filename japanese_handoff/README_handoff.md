# README_handoff — 国語システムのPandora統合

このパッケージは、単独HTMLアプリとして開発した国語（読解）教材システム一式を、Pandoraエコシステム（pandora-project / Vercel + Supabase + GAS）へ統合するためのハンドオフです。

**推奨モデル：Opus**（既存のphoto_intake・grading・Supabaseスキーマを横断し、既存規約を壊さず整合させる必要があるため）

---

## 1. 全体像

国語システムは算数（Pandora）と同じ配布・回収フローを持つよう設計済み：

```
Japanese_story_generator.html   … 本文生成（学年×ジャンル×難易度×構成パターン）
        │  japanese_story_record (JSON・ファイル管理＝シリーズ資産)
        ▼
Japanese_question_generator.html … 設問生成（観点タグ・機械検証・漢字クイズ）
        │  japanese_question_set (JSON・コピペ or ファイル)
        ├──────────────────────────────┐
        ▼                              ▼
Japanese_quiz_template.html      Japanese_print_template.html
（デジタル専用：スタイラス手書き     （印刷用：問題用紙＋QR付き解答用紙
　→ Supabase submissions直送）        ＋layout_data書き出し）
                                        │ 印刷→手書き→写真
                                        ▼
                              photo_intake.html（既存・要接続）
                                        ▼
                              採点UI（国語対応・要新規/拡張）
```

- デジタル専用：配布用HTML書き出し→生徒がタップ＋スタイラス手書き→送信でSupabase直送
- 印刷用：問題用紙（解答欄なし・PDF配布可）＋QR付き解答用紙→photo_intakeで取込→デジタル採点

## 2. 同梱ファイル

| ファイル | 役割 | 状態 |
|---|---|---|
| Japanese_story_generator.html | 本文生成。パターンバンク・学年別漢字制限・分かち書き（小1）・筋書き/事実チェック・AI＋人間指摘リライト・学習メモ・シリーズ管理（生徒ID/日数/続き読込） | 完成・動作確認済 |
| Japanese_question_generator.html | 設問生成。観点タグ（UNIT_BANK）・structure_type自動判定・抜き出し字数の機械検証補正・漢字クイズ（配当差分から機械選定） | 完成・動作確認済 |
| Japanese_quiz_template.html | デジタル解答テンプレ。配布用HTML自己書き出し・手書きcanvas・送信 | 完成。Supabase接続情報がプレースホルダー（未接続時はJSON DLにフォールバック） |
| Japanese_print_template.html | 印刷テンプレ。実測ベース自動組版・QR（Pandora互換）・layout_data書き出し | 完成・動作確認済 |
| samples/*.json | 下記5形式のサンプル | — |

## 3. データ形式（samples/参照）

1. **japanese_story_record**（v2）… 本文＋生成条件＋studentId/dayNumber。ファイル名規約 `story_{studentId}_{title}_day{N}.json`。シリーズ（連日ストーリー）の参照元资産なのでファイル管理が正式ルート。
2. **japanese_question_set**（v1）… 設問＋解答＋観点タグ（kanten）＋形式（type）。抜き出し問題は `_actualCount`（機械計測字数・スペース除外/句読点含む）と `_verified`（本文照合結果）を持つ。`kanjiQuiz` は `kanjiQuizDigitalOnly: true`（印刷版に載せない）。
3. **submission payload** … 算数と同一テーブル（submissions）前提。`subject: "japanese"`、`source: "japanese_quiz_web"`。problems[]は選択式=student_choice、手書き=answer_canvas（PNG dataURL）。kanji[]は選択式なので `correct` を送信時に自動判定済み。**student_nameはnull固定**（Lethe APIでstudent_idから引く規約）。
4. **japanese_answer_sheet_layout** … 解答欄の実測mm座標（A4・ページ左上原点）。QR位置・quiet_zone含む。answer_sheetsテーブルのlayout_data相当。
5. **japanese_generator_lessons** … 学習メモ（人間の校閲指摘の蓄積）。text＋grade（null=全学年共通）。

**【画面間の自動持ち回り（localStorage）とファイルの役割分担】** 4アプリは同一オリジンのlocalStorage（`japanese_latest_story_record` / `japanese_latest_question_set` / `japanese_latest_student`、いずれも`{savedAt,data}`ラッパー・最新1件のみ）で直近の作業データを自動持ち回りし、次画面で提案バナー／生徒プリセレクトを出す。これは「**直近の連続作業の高速化**」が目的であり、上記のファイル書き出し／読み込み（story_recordのシリーズ管理等）は引き続き「**シリーズ資産の正式な保存**」という役割で、位置づけは不変。24時間より古い持ち回りデータは提案しない。配布用HTML（生徒が開く側）ではこの仕組みを発火させない。

## 4. 統合タスク（推奨順）

### A. Supabase結線（quiz_template）
- `__SUPABASE_URL__` / `__SUPABASE_ANON_KEY__` を既存設定で注入
- submissionsテーブルが subject:"japanese" のペイロードを受けられるか確認（スキーマ上はJSONBなら変更不要のはず）
- assignmentsテーブルへの国語assignment登録フロー（現状、テンプレ側でassignment_idを自動生成しているが、正式にはassignments作成→配布の順に揃える）
- RLS方針は既存の算数と同一に

### B. photo_intake接続（print_template）
- QRペイロードは既存と完全互換：`{"assignment_id","student_id","page","total_pages"}`、誤り訂正H、25mm、quiet zone 2.5mm、qrcode-generator（MIT）インライン同梱
- layout_dataをanswer_sheetsテーブルへ登録する導線を追加（print_template側からPOST、または書き出しJSONを管理画面から登録）
- photo_intake側がsubject分岐（math/japanese）で切り出し・保存できるか確認

### C. 採点UI（国語対応）
- 選択式・漢字クイズ：自動採点可能（送信データに正答が同梱）
- 抜き出し：answer_canvasの手書きと正答文字列の照合。まず人間採点UI＋正答表示。将来はOCR照合
- 記述式：人間採点が基本。AI採点補助（模範解答＋観点タグをプロンプトに渡す）はオプションで
- 弱点分析：problems[].kanten（観点）× type（形式）× 正誤 をresultsに保存し、既存の夜間集計（updatePandoraSummary相当）を国語軸（観点タグ別・形式別正答率）に拡張。「抜き出しに弱い」「気持ちに弱い」を可視化するのが目的

### D. 学習メモのSupabase移行
- 現状localStorage（キー: japanese_generator_lessons）。テーブル例：`generation_lessons(id, subject, grade, text, created_at)`
- 思想はPandoraのquality_criteriaと同じ（人間の校閲知見をプロンプトへ還流）。算数側でも同じ仕組みを使えるようsubject列を持たせる
- story_generator側の読み書きをSupabaseに切替（エクスポートJSONが移行シード）
- 200件超で棚卸しアラートの仕様は維持

### E. リポジトリ配置・デプロイ
- pandora-project（Vercel自動デプロイ）へ配置。localStorageキーは `japanese_generator_api_key` / `japanese_generator_imode` / `japanese_generator_lessons`（3アプリで共有）
- 内蔵AI呼び出しは全て claude-sonnet-4-6（コスト効率優先。記述式の質を上げたい場合のみOpus切替を検討）

### F. pandora_main.html のUI変更（まるこ指定）
- 現在の「課題生成」タブを **「算数課題生成」** にリネーム
- **「国語課題生成」** タブを新設し、クリックで Japanese_story_generator.html へ遷移させる（同一リポジトリ配置後の相対パスでリンク。フローの入口は文章生成なのでstory_generatorが正）
- タブの見た目・挙動は既存タブと統一すること

## 5. 必ず守る規約（CLAUDE.md準拠）

- **student_nameをQR・ペイロードに含めない**。student_idからLethe API（getStudents）で解決
- **【マスターミラー同期は別レイヤー】** 上記「QR・提出ペイロードに名前を持たせない」規約と、`students`テーブルへの名前登録は**別の関心事**。Letheがマスター名簿、Supabase `students` はFK担保のための従属ミラー。`assignments.student_id`→`students.id`（text型・`S-XXXX`）のFKがあるため、課題/提出を作る前に`students`へUPSERTして生徒行を用意する。これは提出データの匿名性規約とは無関係の「マスター→ミラー同期」であり、名前はこのミラー登録のためだけに使う（QR・submission_dataには依然として入れない）。実装場所：quiz_template（送信前）／print_template（answer_sheets登録時）／photo_intake（取込保存前）の3経路。UPSERTは`on_conflict=id`＋`Prefer: resolution=ignore-duplicates`で「無ければ挿入・あれば触らない」（先生が整えたLethe正式名を上書きしない）。名前が取れない手入力フォールバック時は`(未登録)`プレースホルダーで通す。
- **QRは誤り訂正H・25mm・quiet zone 2.5mm**。ライブラリはCDN禁止・インライン同梱
- **印刷は@page margin:0、.page（210×297mm＋padding）で余白を一元管理**。二重管理はページ増殖バグを招く（実証済みの教訓）
- 外部データ（漢字配当表等）はアプリ内埋め込み（CSP回避）。kyoiku_kanji相当のKANJI_CUMULATIVEは各アプリに同梱済み
- 小1のみ分かち書き（文節ごと全角スペース・句読点直後は入れない）。本文・設問文とも適用

## 6. 実装済みの機械検証（変更時に壊さないこと）

- 抜き出し字数：AIに数えさせない。JSが解答文字列を実測（スペース除外・句読点含む）し、設問文の「〜字」（漢数字/算用数字）を置換補正。本文への一字一句照合も実施（_verified）
- 漢字クイズの出題漢字：KANJI_CUMULATIVEの学年差分からJSがランダム選定（AI選定禁止）。出題語に対象漢字が含まれるかも機械照合
- structure_type：学年×ジャンル×難易度から自動判定（確認/練習=single、小2完成=独立2文章、小3〜6物語完成=前後編split、その他完成=独立2文章）

## 7. 未実装・バックログ（統合後の課題）

1. **structure_type=split系の実運用**：現状は警告表示のみで、単一文章として設問生成。独立2文章（2レコード読込）と前後編split（①を引き継いだ②の連続生成）は未実装
2. **縦書き対応**：writing-mode縦組み＋縦書きマス目。横書きで機能を通した後の専用課題
3. **OCRフォールバック**（QR失敗→OCR→手動）：算数側の既存バックログと共通
4. **抜き出しマス目の多ページ折返し検証**：20字超で要実機確認
5. **保護者マイページ連携**（Lethe構想）：採点結果の置き場所はLLM学習との兼ね合い含め要議論（既存メモ通り）

## 8. 動作確認手順（統合後の受入テスト）

0. pandora_main.htmlのタブが「算数課題生成」「国語課題生成」になっており、国語タブからJapanese_story_generator.htmlへ遷移できること
1. story_generatorで小2物語を生成→day1レコード書き出し→再読込→「次の日の話を提案」→day2生成（シリーズ一周）
2. question_generatorでレコード読込→観点タグ選択→設問4問＋漢字クイズ生成→抜き出しに「✓本文照合済」が付くこと
3. quiz_template配布用HTMLで手書き解答→送信→submissionsに subject:"japanese" で1行入ること→kanji[].correctが正しいこと
4. print_templateで両方印刷（Chrome・余白「なし」）→QRをphoto_intakeで読取→assignment_id/student_id/pageが解決されること
5. 採点UIで観点タグ別・形式別の正誤が保存され、集計に反映されること
