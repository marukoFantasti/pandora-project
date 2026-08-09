# Pandora g06 第1波(A層) ハンドオフ文書

作成: 2026-08-09 / 対象: Claude Code実装セッション+まるこ検収

## 1. 成果物と検証状態

| ファイル | 内容 | 検証 |
|---|---|---|
| patterns_g06.json | A層51パターン(schema v0.9) | 51×200=10,200問ストレステスト クリーン |
| rationale_g06.json | 51エントリ(brief+7区画、rationale v1.0準拠) | pattern_id完全一致検証済 |
| kyoiku_kanji_g1to6.json | g06配当191字追加(総計1026字) | 字数・学年間排他・総数検証済 |
| golden_g05_baseline.txt | g05基準線 PASS 210/FAIL 0 | md5: e103da9141a041e6af7b2d59639bda4a |

**ゴールデン関門**: 生成器は完全無変更(dec1/dec3/reduce系/lcm/maxすべてv0.9既存と判明)。よってg02〜g05差分ゼロは自明に成立。バンク追加のみのデプロイ。

**単元カバレッジ**: c02文字と式8 / c03分数乗除13 / c04速さと割合9 / c05比9 / c11比例反比例6 / c06縮尺3 / c12場合の数3。

**設計上の許容事項**(ストレステストで確認・rationale exclusionsに記載):
- g06_baai_narabe_01は本質的に4異なり(n∈{3,4}×文脈2)。
- 選択肢限定7パターンは異なり数が選択肢数で頭打ち(多様性下限6で判定)。
- 除算系3パターンに商<5の上界制約を追加済(過大帯分数の除外)。

## 2. 検収ポイント(まるこ)

1. **g06配当191字リスト**: Claude知識由来のため目視検収を推奨(kyoiku_kanji_g1to6.jsonのg06キー)。字数191・排他・総数1026は機械検証済だが、個別字の正誤は未照合。
2. **display_canon**: 量=帯分数(reduced_mixed・g05一貫)、倍・比の値=仮分数(reduced_fraction・g05_frac_bai_01継承)+整数落ち除外。この正準で問題なければ確定。
3. **立式系の採点**(moji_shiki / prop_shiki / inv_shiki): 経路Aは文字列完全一致。可換表記(4×x等)は不正判定される。第1波は正準形固定とし、検収UIでの許容登録機能を積みタスクに置いた。
4. **しき様式**: shukuzu_to_realのしき「8×25000=(cm)」の中間単位表記が許容か。

## 3. B層設計(既存kind流用・小拡張)

### 3.1 circle拡張 → fig_version 2(c08円の面積)
- 現行circle kindに追加: `radius_label`(半径線+ラベル描画)、`sector`("full" | "half" | "quarter")。
- fig_version 2として追加(v1は無指定デフォルト=既存挙動、後方互換)。
- パターン: 面積(r提示)・逆算(面積→r、平方数制約)・半円/四分円面積・円周(直径/半径)。円周率3.14はdec2乗算=面積・周長とも百分率整数スケールで整数演算に閉じる(例: r²×314→dec2表示)。
- 制約: r∈2〜10、半円/四分円は面積が.5刻みで閉じる組に限定。

### 3.2 table kind流用(c11_u01比例の表・c07_u01度数分布表)
- 既存table kindのまま: 比例表(x行/y行、空欄1箇所を問う)、度数分布表(階級×度数、最頻階級・合計を問う)。
- 比例表パターンはproportion_semantics/find_k・find_yのB層版として意味カテゴリを共有。
- 度数分布の元データはスロット生成の架空データのみ(D4ハイジーン)。

### 3.3 prism新kind(c09角柱の体積)
- 三角柱・四角柱の見取図。パラメータ: `base_kind`("tri" | "rect")、底面寸法、高さ、ラベル。
- cuboidの平行投影描画を流用し底面だけ差し替える実装が最短。cuboid横長寄せ制約(積みタスク)と同時に対応推奨。
- パターン: 体積=底面積×高さ(2段)、逆算(体積・底面積→高さ)。

## 4. C層設計(新kind・Code実装対象)

| kind | 単元 | パラメータ案 | 要点 |
|---|---|---|---|
| sym_polygon | c01対称 | shape(既定形状id)、axis表示有無、mode(line/point) | 線対称/点対称の判定・対称軸本数。頂点座標は形状idごとに固定表、回転/反転はtransform |
| similar_pair | c06拡大縮小 | base多角形、ratio(2,3,1/2)、対応辺ラベル | 2図形並置。対応辺の長さを問う。座標は整数格子に閉じる |
| dot_plot | c07_u01 | values配列(スロット生成)、軸範囲 | ドットプロット。最頻値・中央値・平均。データは架空生成のみ(D4) |
| histogram | c07_u02 | 階級幅、度数配列 | 柱状。最頻階級・特定階級の度数・以上未満の読み |
| xy_graph | c11_u03/u06 | mode(prop/inv)、k、格子範囲、読み取り点 | 比例直線/反比例曲線。グラフ読み(x→y)。反比例は整数格子点のみ強調 |

共通方針: 全kindともfigure_paramsは本文と同一env解決(既存規約)、SVG出力はfigure_builder.jsに追加、fig_geometry_reference.pyに幾何テストベクター追加(g05と同じ検証様式)。

## 5. Code実装タスク(順序案)

1. patterns_g06.json + kyoiku_kanji_g1to6.json を本番リポジトリへ配置、pattern_generator.js(JS側)でg06スモーク→ストレステスト再現(シード20260809・200問/パターン)。
2. ゴールデン: g02〜g05既存出力の差分ゼロ確認(生成器無変更なので形式確認)→ g06出力をゴールデンに追加登録。
3. 経路A配線: g06をLethe/出題UIの学年選択に追加。dec1/dec3表示の採点正規化(「2km」vs「2.0km」)をJS側で確認。
4. B層: circle fig_version 2 → table流用パターン → prism(cuboid横長寄せと同時)。
5. C層: 上表の順(sym_polygon→similar_pair→xy_graph→dot_plot→histogram)。各kindごとに幾何テストベクター先行。
6. rationale_g06.jsonをpandora2ディレクトリへ。訓練ペア抽出スクリプトはid参照directivesを全文展開すること(rationale_g06.json notesに明記済)。

## 6. 残課題・第2波候補(rationale exclusionsから集約)

- 比例判定問題(比例する/しない)=文脈セット設計後。
- 帯分数×帯分数、小数÷分数、かっこ付き逆算、比の縮小方向逆算、3者配分、出会い場所、m単位縮尺、2人固定順列、3つ選ぶ組み合わせ。
- 検収UI(corrections/pedagogy入力面)+立式可換表記の許容登録。
- corrections_log.json: 本セッション人間訂正なし(記録対象なし・既存追記型ファイルに変更なし)。
