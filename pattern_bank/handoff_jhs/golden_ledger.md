# jhs ゴールデン基準md5 台帳

基準md5(章単位ゴールデンのmd5)の**更新は本台帳への記録を必須手続**とする。
新規章は初回md5を、既存章の更新は「更新理由・旧md5・新md5・不変証明」を記録する。

## 更新履歴

### 2026-08-12 c18 基準md5更新(B層追補2パターンのappend)
- 章: jhs_c18(二次関数 y=ax²)
- 更新理由: B層追補 jhs_c18_taiou_01 / jhs_c18_taiou_02(数表版)を既存patterns配列末尾へappend(加法・既存要素/順序無改変)
- 旧md5: 3a382c22332e2115b785591360337c08 (5パターン)
- 新md5: 5bda8385c99a77f55577a12edb75e7cd (7パターン)
- 不変証明: 既存5パターン(table_01/val_01/range_01/range_02/rate_01)の個別goldenセクションが
  append前後でバイト一致(固定シード・既存パターンが配列先で先行処理=RNG列不変)。ID/unit_id衝突なし。

### 2026-08-12 g04 バンク変更(corr-0007トリアージ裁可)・基準md5は不変
- 章: g04(小4)
- 変更理由: corr-0007トリアージ裁可(2026-08-12)。転記退化排除の制約を4パターンに追加:
  g04_box_add_01(b1!=2*a1)・g04_box_mult_01(b1!=a1*a1)・g04_div_int_01(商≠除数)・g04_div_bai_01(a1!=b1*b1)。
  jhs B層で確立の同値変形(b≠2a・b≠a²)の低学年適用=「1から共通」実証第1号。
- 旧md5: 45650beb6b6c3f9e03c0035f272973d3
- 新md5: 45650beb6b6c3f9e03c0035f272973d3 (★不変)
- 不変の理由: 追加制約が排除するのは稀な退化ケースで、固定シード3本golden run には
  元々出現しない値。よって golden はバイト不変(24パターン全セクション一致)、
  制約効果は広域分布(corr-0007検査で box_mult/div_bai/box_add/div_int が19/14/2/4→0)にのみ現れる。
- 検証: verify 300×24=7200 verifyFail 0 / corr-0007 v2 レポートで g04 非例外検出 0(例外2件のみ)。

### 2026-08-12 7バンク配線(corr-0007トリアージ裁可・統一遡及フェーズ③)
- 理由: corr-0007トリアージ裁可(2026-08-12)。同値変形の型カタログ(a≠2b/n≠b²/商≠除数/2段導出/端点座標 等)で真リーク・紛れを排除する制約を追加。修正は制約追加のみ(テンプレ・スロット・図は不変=構造diff実証)。verify 各300本×パターンで verifyFail 0(計66000本)。パリティ全一致。
- c06/c07/c17 は本番配信中バンク=デプロイ込み。
- 新旧md5(cut8):

| 章 | 旧md5 | 新md5 | 制約追加 | 備考 |
|---|---|---|---|---|
| g02 | e064fc27 | e064fc27 | 7 | ★md5不変(排除する退化ケースが固定シード3本goldenに未出現=g04同型) |
| g03 | 2ebc0b05 | 6e5cd3b0 | 16 | |
| g05 | e103da91 | d11f4ea3 | 12 | lcm_word_clockは制約でなく例外に編入(§2)・他11 |
| g06 | 85ac6607 | de487d1d | 10 | |
| jhs_c06 | 96966626 | 00ba3cf0 | 4 | B層自己検出穴(bunsho_02/inv_02)含む・配信中 |
| jhs_c07 | 0a5e475b | b6746602 | 3 | 配信中 |
| jhs_c17 | 542beeb2 | 1df8cea7 | 3 | 配信中 |

- 新基準(20260812時点・全19本): g02 e064fc27 / g03 6e5cd3b0 / g04 45650beb / g05 d11f4ea3 /
  g06 de487d1d / jhs_c01 4c39abce / c02 feed610d / c03 6d8e6ede / c04 b9137f9b / c05 3a8a488e /
  c06 00ba3cf0 / c07 b6746602 / c08 8c1197f7 / c09 7bdf4082 / c10 9427e7a3 / c15 79d3ad90 /
  c16 2d8f37b7 / c17 1df8cea7 / c18 5bda8385。

### 2026-08-12 バッチ2 6バンク配線(corr-0007トリアージ・統一遡及フェーズ④Part A)
- 理由: corr-0007トリアージ裁可(2026-08-12)。B制約117本(パターン33件)を6バンクへ追加。制約追加のみ(構造diff実証)。verify 各300本 fail0(計19500本)・パリティ全通過。全て本番配信中(pandora_main BANK_FILESにc01-c18登録)=デプロイ込み。
- pending 33件を全消し込み→corr0007_batch2_pending.json 撤去(存在チェックのみへ切替)。固定シード関門は非例外・非pending残差0で厳格緑。

| 章 | 旧md5 | 新md5 | 制約変更pat |
|---|---|---|---|
| jhs_c01 | 4c39abce | 76dbe64c | 13 |
| jhs_c02 | feed610d | 082b2c3f | 7 |
| jhs_c04 | b9137f9b | b221d05f | 6 |
| jhs_c05 | 3a8a488e | a571bf63 | 3 |
| jhs_c15 | 79d3ad90 | a1e38dba | 3 |
| jhs_c18 | 5bda8385 | 5bda8385 | 1(★md5不変=g04同型・退化ケース3本golden未出現) |

### 2026-08-12 g01配線(基準md5 20本目・配信OFF・統一遡及フェーズ④Part B)
- g01(小1・加法/減法12パターン)を配置。まるこ検収済み(2026-08-12)。
- **配信OFF**: pandora_main.html の BANK_FILES に登録(fetchして本番配信・パリティ/関門で網羅)しつつ、
  DEPLOY_EXCLUDE_UNIT_PREFIXES=['g01_'] で PATTERN_UNIT_INDEX/allPatterns から除外→⚡自動点灯・経路A不可視。
  除外リスト空なら現挙動バイト不変(既存19バンクのindex/allPatterns一致を実証)。需要時は接頭辞1行削除で解除。
- 基準md5 20本目: g01 = ce14a1aa (golden PASS)。パリティ +12パターン×40(g01含め全224×40=8960サンプル一致)。
- 恒等検算: tests/pattern_bank_g01_identity.js 全12パターン合格(36000本)。かな検査 漢字0(2400本)。
  corr-0007「こたえ」マーカー動作確認(答え="こたえ N"→tail正)。
- 例外: g01_kurabe_01 を SELECTION_ANSWER(新設・答＝提示値の選択が学習内容=大小比較)で登録。jhs_c07_jiku_01と同性質。
- 20本目の基準md5一覧に g01 ce14a1aa を追加(他19本は前掲の新基準)。

### 2026-08-12 バッチ3 3バンク配線+C保留解消・例外純化(統一遡及フェーズ⑤)
- C保留3件を制約で解消: g05_heikin_reverse_01((a1*d1)%1000!=a1)・g06_graph_prop_read_01(k1!=1=k=2のみ)・
  jhs_c07_niten_01(rule nt_y2b2)。制約追加のみ(構造diff実証)・verify 各300本fail0・パリティ一致。g05/c07配信中=デプロイ込み。
- 例外リスト純化: HOLD_REDESIGN(暫定)3件と理由コード自体を撤去→例外75件・9種(全て恒久正当・provisional 0)。
- niten_01は制約後もv2.1固定シード残差0(生検出186/400は「2点」リテラル定数=v2.1で正しく除外)。

| 章 | 旧md5 | 新md5 | 制約変更 |
|---|---|---|---|
| g05 | d11f4ea3 | d11f4ea3 | 1(★md5不変=g04同型) |
| g06 | de487d1d | 3545261e | 1 |
| jhs_c07 | b6746602 | 02ab26f9 | 1 |

### 2026-08-18 c12配線(基準md5 21本目・第2波G-1・angle_figure初の本番章)
- 章: jhs_c12(図形の調べ方) 第2波G-1・4パターン(taicho_01/taicho_02/isshuu_01/mawari_01)。まるこ検収済み(2026-08-14)。
- 新規章のため初回md5を記録。既存20章のmd5は全て不変(新ファイルの追加=既存章の固定シードRNG列に非干渉。
  golden生成は各章バンク単独で seed=20260715 → 章内パターンのみ処理のため他章バイト不変)。
- **基準md5 21本目**: jhs_c12 = ad8f55e1 (golden PASS 12/12・`generate_poc_v10.py ../patterns_jhs_c12.json kyoiku_kanji_g1to6_jhs.json` の全文md5 ad8f55e198b506557ea2013cb27a217a)。
- Part A(mawari_01受理判定): builderは対頂対を持たない任意光線4本(angles4要素・和360)を受理する(4組[90,100,90,80]/[40,140,110,70]/[50,130,60,120]/[40,140,40,140]でbuild成功)。よって4パターン全部配線(mawari_01保留なし・G-1.1追補不要)。
- 受理組数(Fable全域→配線側Code clearanceで確定): taicho_01=24 / taicho_02=24 / isshuu_01=**222**(Fable仮232→隣接2既知ラベルが両方小の6組が10px割れ→制約 a1+a2≥70 で刈り確定・corr-0020) / mawari_01=5,538。図の角の和(180/360)はfigure照合で全域整合。
- ★md5不変(ad8f55e1): isshuu制約 a1+a2≥70 の追加後もgolden(固定シード3本)はバイト不変=g04同型(排除された10組が固定シード列に未出現)。制約効果はfigure照合の悉皆clearanceにのみ現れる(min minText 10.05px・違反0)。
- taicho_01は答=既知(x=a1=対頂角相等)だが問題本文に数値を含まない(既知角は図内のみ)ため corr-0007(本文∩答え)は非検出=例外登録不要(検証済み)。
- 20本目までの基準md5一覧(不変): g01 ce14a1aa / g02 e064fc27 / g03 6e5cd3b0 / g04 45650beb / g05 d11f4ea3 /
  g06 3545261e / jhs_c01 76dbe64c / c02 082b2c3f / c03 6d8e6ede / c04 b221d05f / c05 a571bf63 /
  c06 00ba3cf0 / c07 02ab26f9 / c08 8c1197f7 / c09 7bdf4082 / c10 9427e7a3 / c15 a1e38dba /
  c16 2d8f37b7 / c17 1df8cea7 / c18 5bda8385。**+21本目: c12 ad8f55e1**。

### 2026-08-19 c12第2波 基準md5更新(G-2平行線4パターンをappend・Phase D-2方式)
- 章: jhs_c12。第2波G-2 parallel_lines 4パターン(doui_01/sakka_01/naikaku_01/fukugo_01)を
  既存patterns配列末尾へappend(c18追補と同じD-2方式)。まるこ検収済み(2026-08-15)。c12=4→8パターン。
- 更新理由: G-2 parallel_lines(平行線と角)本番投入。同位角/錯角(相等)・同側内角/複合(計算)の4型。
- 旧md5: ad8f55e1 (4パターン) / 新md5: **78a83d3d** (8パターン)。golden PASS 24/24。
- 不変証明: 既存4パターン(taicho_01/taicho_02/isshuu_01/mawari_01)のgoldenセクションが
  append前後で**バイト一致**(固定シード・既存が配列先で先行処理=RNG列不変・head45行diff無し)。ID/unit_id衝突なし。
- pos突合(配線時確認): naikaku_01(上pos2既知+下pos1未知)=同側内角(両内部・同左側・和180)✓ /
  fukugo_01(上pos1既知+下pos0未知)=隣接180→同位角の2段 ✓。builder契約検査(v↔pos角一致)で全域保証。
- clearance悉皆(corr-0020二段・実pos構成×受理24組): doui 42.74 / sakka 18.93 / naikaku 10.45 /
  fukugo 10.14 (min minText・全て違反0)。⚡はc12点灯済みのため維持(BANK_FILES登録済)。
- 基準md5更新: 21本目 c12 = ad8f55e1 → **78a83d3d**(他20章は不変)。

### 2026-08-20 c12第3波(G-3 polygon 3追補・D-2) + c13新設(⚡16章目・基準md5 22本目)
- **c12**: 第3波G-3 polygon 3パターン(tri_naikaku/tri_gaikaku/gokaku_naikaku)をD-2 append(8→11)。
  - 旧md5 78a83d3d(8) → **新md5 56e9ee03**(11)。golden PASS 33/33。既存8セクションはappend前後バイト一致(D-2不変証明)。
  - clearance確定(corr-0020): tri_naikaku仮232→**226**(a1+a2≥65追加。偏平三角形6組=鈍角頂点の未知ラベル底辺寄りsemBadを刈り)。
    golden不変(排除組が固定シード未出現=g04同型)。gaikaku 253/gokaku 2536は仮通り違反0。
- **c13新設(三角形・平行四辺形・jhs2)**: G-3 polygon 4パターン(rt_tri/nitohen_01/nitohen_02/heishi)。まるこ検収済み(2026-08-15)。
  - **基準md5 22本目: c13 = 48af25f9**(golden PASS 12/12)。BANK_FILES登録・⚡c13点灯(16章目)。
  - 単元名: Fable仮「三角形と四角形」→単元マスタ照合で「**三角形・平行四辺形**」に修正(5箇所)。
  - figure_params書式変換(意味不変・builder正規化層): 頂点名列→{name} / external単体obj(vertex名)→配列(at-index) /
    equal_marks(辺名ペア)→marks(辺index) / parallel_marks(辺名ペア)→辺index+平行自動グループ化(>/>>)。
  - clearance確定(corr-0020): heishi仮24→**22**(a1≥40追加。鋭角頂点の既知ラベル底辺寄りsemBad 2組を刈り)。golden不変(g04同型)。
    rt 10/nitohen 9・8は仮通り違反0。
- 基準md5一覧: 21本目 c12=56e9ee03 / **22本目 c13=48af25f9**(他20章不変)。

### 2026-08-20 c13第2波(G-4a congruent_pair 2追補・D-2) 角度図族の完成便
- c13にG-4a合同求角2パターン(goudou_01/goudou_02)をD-2 append(4→6)。まるこ検収済み(2026-08-16・目視2枚合格)。
- 旧md5 48af25f9(4) → **新md5 ea3af757**(6)。golden PASS 18/18。既存4セクション byte一致(D-2不変証明)。
- 書式変換(builder正規化層・G-3方式): left_vertices/right_vertices→left/right.names /
  angles[i]のleft/right role+label_right→left.show/right.show(at-index) / side_ticks配列[1,2,3]→辺別本数。
- clearance悉皆(corr-0020・G-4aスキャン確定域[45,100]採用): goudou_01=受理55・goudou_02=受理46=違反0。
- furigana「合同(ごうどう)」は既存辞書済=欠落なし。angle_figure族(G-1対頂〜G-4a合同)が c12/c13 で本番完成。

### 2026-08-21 c14新設(空間図形・⚡17章目・基準md5 23本目) 第2ブロックS-1
- c14新設(空間図形・jhs2): 三角柱/四角柱の体積・表面積4パターン(π不要・prism既存kind流用・pi_coefと独立の先行採録)。まるこ検収済み(2026-08-16)。
- **基準md5 23本目: c14 = bbaed877**(golden PASS 12/12)。BANK_FILES登録・⚡c14点灯(17章目)。figure_paramsはprism実書式(height名・全スロット参照)で正書式=正規化不要。
- ⚠️**verify機構の汎化(computed_slots許可)**: sankakuchu_hyomen_01は本文に直角三角形3辺(computed a1/b1/c1=3k/4k/5k)を明示。verify nums_from_slotsのallowed_numsが従来は基底slots+_dispのみでcomputed_slotsを含まず→FAIL。**computed_slotsをallowed_numsに追加(JS/Python両verify・緩和のみ=非後退)**。既存golden md5全不変(c06 00ba3cf0/c15 a1e38dba/c17 1df8cea7で確認)・parity全一致。
- clearance悉皆(prism寸法ラベル・観点=ラベル間≥10/ラベル辺重なり≥4/semBad0): 受理613/621/384/30=違反0(min minText 11.3/min minSeg 6.4)。
- pi_coef機構は先行main反映済(a02d3e2・S-3の前提)。円柱/円錐/球/回転体はS-2/S-3。

### 2026-08-21 c14第2波(S-3 錐円系5追補・π答えの本番デビュー・D-2)
- c14にπ答え5パターンをD-2 append(4→9)。まるこ検収済み。円柱体積/表面積(pi_coef)・円錐体積/球体積(pi_coef_frac3)・四角錐体積(any_int・π不要)。
- 旧md5 bbaed877(4)→**新md5 0f139c0f**(9)。golden PASS 27/27。既存4 byte一致(D-2)。
- **pi_coef正規化層**: バンクは answer_domain(pi_coef/pi_coef_frac3)宣言+answer_template{X_pi}のみ書く。generatorが computed_slot X→{X}_pi(fmt_pi / fmt_pi_frac(_,3))を自動生成(JS/Python両)。表示: 128π/(1372/3)π等。
- **kanji_policy補填**: 円錐/四角錐の「錐」は教育漢字g1-6外→allowed_extra:"錐"を2パターンに追加(既存機構・ふりがな付き専門用語許可)。
- **furigana**: 増補パッチ(円柱/円錐/角錐/球+四角錐/三角錐)適用・3コピー同期・残存漢字0。
- clearance悉皆(prism流儀3観点): 受理91/70/91/8/695=違反0。
- pi_coef_frac3を両dispatch登録(ans>0)。分数分母3はtemplate_number_constants宣言でcorr-0007除外。

### 2026-08-21 c14第3波(S-4 回転体3追補・空間系完了・D-2)
- c14に回転体3パターンをD-2 append(9→12・空間ブロック完了便)。まるこ検収済み。長方形→円柱(pi_coef・πr²h)・直角三角形→円錐(pi_coef_frac3・(1/3)πr²h)・半円→球(pi_coef_frac3・(4/3)πr³)。source図(rotation_source kind)を軸ℓまわり1回転で立体を同定→求積の2段(同定は解法内で必然・名指しはG-4b棚)。
- 旧md5 0f139c0f(9)→**新md5 2ff88dbd**(12)。golden PASS 36/36。既存9(baseline行1-100)byte一致(D-2成立)。
- **kanji_policy補填**: 本文「直線ℓを軸として」の「軸」は教育漢字g1-6外(中学配当)→allowed_extra:"軸"を3パターンに追加(錐と同型・最小宣言方針・ふりがな付き専門用語許可)。
- **furigana(furigana_patch_s4)**: lexicon 3語(回転→かいてん/立体→りったい/半円→はんえん)+counter規則表「回転」(digit_readings いっかいてん〜じゅっかいてん)。counter「回転」は「回」より長い単位=reading_engineのUNIT_KEYS長さ降順ソートで先に照合(最長一致)→「1回転=いっかいてん」実レンダ確認。3コピー同期(handoff/assets_global/海外テンプレpg-lex+pg-ct)・残存漢字0。
