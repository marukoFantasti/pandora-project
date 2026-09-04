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

### 2026-08-21 c13第3波(G-4b 合同条件識別choice3 3追補・選択式の本番デビュー・D-2)
- c13にchoice3の3パターン(jouken_sss/sas/asa)をD-2 append(6→9)。まるこ検収済み(G-4b目視3枚合格)。congruent_pair mark_scheme(sss/sas/asa)+answer_domain choice3。答=固定記号ア/イ/ウ(answer_formula定数1/2/3・fmt_choice表示)。経路A初の選択式・初の自動採点型。
- 旧md5 ea3af757(6) → **新md5 c1814bc2**(9)。golden PASS 27/27。既存6セクション byte一致(D-2不変証明)。
- **choice機構**: バンクは answer_domain "choice3"宣言+answer_template {X_choice}のみ。generatorが computed_slot X→{X}_choice(fmt_choice・1→ア/2→イ/3→ウ)を自動生成(JS/Python両・parity照合)。恒等=番号一致・corr-0007記号透過(ア/イ/ウは数値トークン非混入)。
- **mark_scheme**(G-4a資産の構成替え): sss=対応3辺チョン1/2/3本 / sas=2辺チョン+間の角に等角弧 / asa=1辺チョン+両端角に等角弧2種。角度値は全plain=マークだけで条件判定。大小非依存(バンク小文字sss)。
- clearance悉皆(corr-0020・確定値域[45,100]): 3構成×55組=違反0。名clearance+マーク-名間隔(SSS46.8/SAS25.2/ASA23.6px・ASA最密)。
- kanji: 本文「両端」の「端」は教育漢字g1-6外→allowed_extra:"端"を3パターンに追加(錐/軸と同型)。
- **furigana(furigana_patch_g4b)**: lexicon 5語(条件/組/角/両端/正し)+counter「組」(3組=さんくみ)+増補1語(記号=きごう・設問定型文の取りこぼし・まるこ検収)。3コピー同期・残存漢字0。
- **tags正規化**: pandora_main の生成出力 tags:[]固定 → entry.pattern.tags を付与。バンクtags→submission→採点analytics観点別集計(合同条件/choice3)へ接続(バンク初のtags使用)。

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

### 2026-08-21 c14第4波(G-4b Phase2 位置関係edge_set 3追補・G-4b完了便・D-2)
- c14に位置関係3パターン(nejire/heikou_hen/suichoku)をD-2 append(12→15)。まるこ検収済み(Fable生成の実ファイルは angle_g1_preview_03_unknown_x.svg に誤名で保存されていたのを正名に復旧、svgはgit HEADへ復元=作業ツリー残骸も解消)。全AB基準・edge_rel('AB',skew/parallel/perp)・図可変(621組)答固定のchoice3同型統制設計。
- 旧md5 2ff88dbd(12)→**新md5 83401fee**(15)。golden PASS 45/45。既存12 byte一致(D-2成立)。
- **edge_set機構**: バンクは answer_domain "edge_set"宣言+answer_template {X_edges}のみ。answer_formula=edge_rel('AB',rel)が直方体トポロジから正規化集合を機械導出(寸法非依存)。generatorが computed_slot X→{X}_edges(fmt_edge_set・「辺CG、辺DH…」)を自動生成(JS/Python両・parity)。恒等=集合一致・corr-0007記号透過。答: ねじれ{CG,DH,EH,FG}/平行{CD,EF,GH}/垂直{AD,AE,BC,BF}。
- **書式突合(正規化層)**: figure_params の vertex_labels(配列)→頂点名描画・show_dims:false→寸法ラベル抑制・highlight_edge:"AB"→基準辺赤太線。既存prismはフラグ不在でバイト不変(gated)。REL_ALIASに'perp'→'intersect'追加(両engine)。
- clearance悉皆(実構成621組×3): show_dims:false=寸法非表示は寸法込み621組より疎=安全側。頂点名8のみで違反0再確認。
- **furigana(furigana_patch_g4b2)**: lexicon 2語(位置→いち/垂直→すいちょく)。corr-0024 3部悉皆(本文+設問指示文)で全3文GREEN(交=まじ・直方体=ちょくほうたい既収)。3コピー同期・残存漢字0。
- kanji: 垂/置は教育漢字g1-6内(垂=小6・置=小4)→allowed_extra不要。tags=[edge_set,位置関係]で観点別集計接続。

### 2026-08-22 g01バッチ1(小学第2波P-1・計算系+文章題新型11追補・D-2)
- g01に11パターンをD-2 append(12→23)。まるこ検収済み(2026-08-22)。0加減2(c07)・なん十/なん十なん計算4(c08)・3つの数混合1(c03既存単元)・文章題新型4(求大/求小/おなじかずずつ/求補・c06_u03〜u05)。
- 旧md5 ce14a1aa(12)→**新md5 307f9e77**(23)。golden PASS 69/69。既存12セクション byte一致(D-2成立)。バンクファイルは外科的append(既存部バイト不変・shared_lexiconコンパクト書式保全)。
- **answer_domain補填**: 0加減2パターンは答0が学習内容(0の性質)→any_int宣言(素材はデフォルトpositive_intで golden FAIL 3 を関門が捕捉・エ機構既存)。構成上負は不可能。
- **corr-0007例外**: g01_add_zero_01/g01_sub_zero_01 を SELECTION_ANSWER(説明を0の性質へ拡張)で登録。例外総数 75→**77**・gate残差0。
- **unit_id突合**: c07/c08新設・c03_u01/c06_u03は既存単元への同居(意味整合確認)。参照側との対応は g01_unit_mapping.md 新設(17単元全対応・偽一致問題の管理台帳)。
- かな検査: 11×200=2200標本 漢字混入0。恒等検算23パターン(識別子11追加・69000本)。rationale 391→402・integrity 402・pairs_design 402。furigana_coverage 402パターン残存0(g01=全かなで新規流入なし確認)。
- 配信OFF継続(BANK_FILES登録済み・DEPLOY_EXCLUDE_UNIT_PREFIXES=['g01_']維持)。パリティ 235×40=9400一致。

### 2026-08-22 g01バッチ2(P-1第二波・かずの表現+ならびかた8追補・D-2)
- g01に8パターンをD-2 append(23→31)。まるこ検収済み(2026-08-22)。位の構成/分解(c04_u04)・100超の構成/大小(c09_u01)・前後/連続穴埋め/とび(c10_u01)。外科的append(既存部バイト不変)。
- 旧md5 307f9e77(23)→**新md5 e0e3786a**(31)。golden PASS 93/93。既存23 byte一致(D-2成立)。
- **num_seq本番デビュー3パターン**(kurai_bunkai=位の分解・seq_ana=連続穴埋め・seq_tobi=とび。指示書の「2パターン」は素材実装で3に拡充)。verify=先頭要素(x1/s1+2/s1+2k1)+ハーネス全要素照合(enumeration分担)。助数詞混在形「{x1}こ、ばらが {y1}こ」は採点側の「Nの」修飾定数除去で2値抽出=実地7標本PASS(同形文○/値のみ○/逆順×/10混入×)。
- **choice_int正規化層**: batch2書式 type:"choice_int" を既存 {type:"int",choice_int:true} 機構へ吸収(両engine1行)。k1∈{2,5,10}受理・制約(≤120)適用確認。
- **corr-0007例外**: g01_kurabe_ookii_01 を SELECTION_ANSWER(kurabe族3件目)。例外総数 77→**78**・gate残差0。
- unit_id: c04_u04/c09_u01/c10_u01 新設→g01_unit_mapping.md 追記。かな検査1600標本漢字0。
- rationale 402→410・integrity 410・pairs_design 410・furigana 410残存0。恒等検算31パターン93000本(num_seq系は全要素恒等込み)。パリティ全一致・全30関門PASS。配信OFF継続。

### 2026-08-22 g01バッチ3(P-1完了便・序数/時刻/くらべ/かたち/かずしらべ12追補・D-2)
- g01に12パターンをD-2 append(31→43)。まるこ検収済み(2026-08-22・Fable素材受領標準の初適用便)。序数2(c11)・時刻2(c12)・くらべ語答え4(c13)・かたち3(c14)・かずしらべ1(c15)。
- 旧md5 e0e3786a(31)→**新md5 a08f0cef**(43)。golden PASS 129/129。既存31 byte一致(D-2成立)。shared_lexicon新キー2本(solid_face/iroita_kosei)も外科append=既存キー・既存出力不変を同時証明。素材の格納位置は_meta_append.shared_lexicon_additions(受領検証で発見・仕様どおり本体へ配置)。
- **word_choice機構本番デビュー7パターン**(choice3様式の語版): answer_domain "word_choice"=内部番号int・ans→{W1_word}を正規化層で自動生成(word_map宣言/またはdisplay_swap位置解決)。語は表示層専用=既存comparison流儀と整合。
- **A2 word_map重複修正**: kurabe系3(nagasa/kasa/hirosa)をword_map色語のみ+テンプレ「の」除去(「あかいの テープ」文法回避で「{W1_word} テープ」形へ)。**ichibanにも同型重複を発見**(指示の想定と相違)→同修正。kazushirabe/utsushi/nakamaは重複なし確認。
- **A3 display_swap層**: {"slot==int":{表示名:参照slot}}の条件束縛を両engineに実装(nakamaの前後入替=位置暗記排除)。
- **from拡張(スロット名添字)**: "solid_face[c1].field"形(添字=宣言スロットの抽選値・answer_formulaが添字参照)を両engineのfrom解決器へ追加(1文字匿名添字と共存・既存バンク非干渉)。
- **pyTernary(入れ子条件式)**: 既存翻訳器が単層のみだったため括弧対応の再帰翻訳へ拡張(ichiban/kazushirabeの2段ネスト対応・単層出力は従来と同一=パリティ全一致で非干渉実証)。
- 採点: wordChoiceMatch実装(完全一致+前方一致で名詞接尾省略「あかい」を吸収・空白/全角ゆれ吸収・数値答は非適用)。実地9標本PASS。
- かな検査2400標本漢字0。rationale 410→**422**・integrity 422・pairs_design 422・furigana 422残存0。恒等検算43パターン129000本。全30関門+パリティ+corr-0007 gate PASS。配信OFF継続。

### 2026-08-22 clock_face kind実装(小学第2波・実需起点第1号)+g01配信ON
- **clock_face**(時計文字盤・読み専用): 真円文字盤(<circle>=構造的真円・corr-0019/0022の要素種別切り分けに整合)+数字1〜12(円周r=71・手動label box=針とのclearance対象)+分目盛60(5分毎長目盛1.8/短1)+針2本(短針=太4.6×長36/長針=細2.2×長56=描き分け明確)。
- 針角度決定式: 短針=30h+0.5m度・長針=6m度(12時=0度・時計回り)。契約h∈[1,12]・m∈[0,59]でthrow。乱数なし=シード非依存。
- **corr-0020悉皆**: バンク想定3構成((i)正時12・(ii)半12・(iii)何分5刻み10値×12=120)=144組・違反0。min(minText 15.5・minSeg 4.9@1:50)——数字r71/長針56の間隙設計で「針が数字を横切る」配置を全時刻で回避。
- 幾何ベクター: tests/clock_face_vectors.js=161照合(角度式↔実描画独立照合±0.5px・数字12座標・目盛60本数・真円・viewport(モバイル幅≤260)・契約4種・シード)全PASS。
- 目視素材3枚: clock_g01_preview_{seiji(3:00),han(7:30),nanpun(2:35)}.svg(まるこ目視用)。バンク(バッチ4: 正時/半/何分よみ3パターン)は目視後Fable側。
- **g01配信ON**(まるこ裁可2026-08-22): DEPLOY_EXCLUDE_UNIT_PREFIXES ['g01_']→[]。⚡g01点灯(除外述語false化スモーク・inline JS構文OK・全関門併走31/31)。P-1完了43パターンが経路A可視に。

### 2026-08-22 g01バッチ4(時計よみ3追補・P-1真の完成・D-2)
- g01に時計よみ3パターンをD-2 append(43→46)。まるこ検収済み。正時/はん(any_int・答={h1}じ/{h1}じはん)・なんじなんぷん(num_seq・答={h1}じ{m1}ふん・m1=choice_int 5刻み0,30除く=clock_faceスキャン構成(iii)と一致)。図=clock_face(実需起点第1号のバンク化)。
- 旧md5 a08f0cef(43)→**新md5 3677308f**(46)。golden PASS 138/138。既存43 byte一致(D-2成立)。
- unit_id: c12_u02新設(文字盤よみ)→g01_unit_mapping.md追記(参照c43/c44)。
- num_seq採点実地(じ/ふん混在形): 同形○/数値のみ○/漢字表記「2時35分」○/逆順×/不足×・正時はん(1値)は非発火=手動フロー。図レンダ600標本不良0・かな検査漢字0。
- rationale 422→**425**・integrity 425(g01 46/46・図あり3)・pairs_design 425・furigana 425残存0。恒等検算46パターン138000本。全31関門PASS。
- **P-1真の完成: g01=46パターン**(テキスト系43+clock_face図あり3)。

### 2026-08-22 g06 P-3a第一便(表族6追補・表族開幕・D-2)
- g06に表族6パターンをD-2 append(71→77)。まるこ検収済み。1行表(値読み/最大/最小/差/合計・1+4列)+2次元表(セル読み・1+3列×2行)。shared_lexicon 2キー(shirabe_1row 5題材/shirabe_2d 2題材・D4ハイジーン=架空しらべテーマ・単位は人/さつ統制)を外科append。
- 旧md5 3545261e(71)→**新md5 bd369536**(77)。golden PASS 231/231。既存71 byte一致(D-2成立)。
- **様式整合**: 読み系しきなし「答え {ans}{unit1}」=既存g06読み系(dotplot_mode/hist_read)のしきなし様式と一致・unit直書き→lexicon参照化のみ(正規化不要)。計算系(sa/gokei)は「しき…答え」=dosuu系と同一。
- **corr-0007例外**: hyo_max/hyo_min(指示分)+**hyo_2d_yomi(gate実走で検出**: ans=セル値が本文定数2と衝突する91/900・答=指定セル読みの学習内容=同型)を SELECTION_ANSWER 登録。例外総数 78→**81**(指示想定80+検出1)・gate残差0。
- **rationale正規化**: 素材のインラインdirectives(方針転換/D4表題材統制/max語答え在庫)をg06流儀のbank_directives表へ移設(D6/D7/D8新設・検収文は無改変)+entry側はid参照化。integrity 77/77。
- ai条件式(3段ネストternary)=pyTernary対応済み・受理確認。{unit1}参照=lexicon駆動。レンジ(v2-15/u,w2-12)は調査カテゴリ「人数系」域内。clearance=実証域内(1+4列・caption≤12字)のため追加スキャン不要→table_scan自動対象で99/99再確認。
- **furigana増補5語**(犬=いぬ/小鳥=ことり/春=はる/夏=なつ/冬=ふゆ・2d題材語・まるこ検収)→3コピー同期・431パターン残存0。
- rationale 425→**431**・integrity 431・pairs_design 431。全31関門+パリティPASS。

### 2026-08-22 circle v2小改修(直径/半径線ラベル)+複合円調査(P-3a第二便)
- **circle v2 mode**(diameter/radius): 中心通過の水平弦(直径)/中心→円周(半径)の実線+「{value}cm」を線下に配置。全数値スロット参照・真円(<circle> r=90維持=corr-0019)・ラベルは線segにown束縛。既存 radius_label(30°)とは別経路=新フィールドmodeで既存v2(area系4・radius_label)バイト不変。
- **corr-0020悉皆**: (i)直径d2-20 (ii)半径r1-10=29組・違反0。描画寸法固定(値=ラベル文字のみ変化)・min(円周内側余裕23.2px・中心点間隔5.5px)。目視2枚合格。
- ベクター: tests/circle_line_vectors.js=33照合(中心通過y=0・端点±r/中心・真円r90・ラベル対rim/中心間隔・シード)。全32関門PASS・既存circle系golden不変(g05 d11f4ea3・g06 bd369536・figure_nondestructive)。
- 目視素材2枚: circle_g05_preview_{diameter(12cm),radius(5cm)}.svg。バンク(円周・面積の図付き第一波)は目視後Fable側。
- **B調査(円面積35問)**: 基本16(v2既存充足=先行可)/複合19(色部分8・ドーナツ5・半円組合せ4・正方形と円2)=composite_circle kind 1つ(外形×内側円×塗りmode)で覆える見込み。寸法与件は半径17/直径9主体。
- **B5: 3.14書式=既存機構で充足**: af=×314(整数演算)+answer_unit_system:"dec2"(÷100・小数第2位)。浮動小数を答えに使わない確立様式(g05円周・g06面積の実書式)。複合円も本書式踏襲で新機構不要。

### 2026-08-22 g06 P-3a第三便(円まわりの長さ2追補・sector×mode新組合せ・D-2)
- g06に円周長2パターンをD-2 append(77→79)。まるこ検収済み。半円のまわり(弧+直径・sector:half+mode:diameter=新組合せ)・四分円のまわり(弧+半径2本・sector:quarter+radius_label)。lexicon追加なし。
- 旧md5 bd369536(77)→**新md5 2bb79492**(79)。golden PASS 237/237。既存77 byte一致(D-2成立)。
- **tnc正規化**: 素材tnc([2]/[2,4])は3.14の3・14が欠落しnums_from_slots全FAIL→既存circle_area_01流儀([3,14]+ステップ定数)へ正規化([3,14,2]/[3,14,2,4])。100/100通過。
- **3.14書式**: af=×257(半円=πd/2+d=2.57d)・×357(四分円=2πr/4+2r=3.57r)+answer_unit_system:"dec2"(÷100)。既存円周流儀踏襲・af独立検算一致(20cm→51.4/r3→10.71)。
- sector:half+mode:diameter は circle v2の直径線描画が半円塗り(polygon)と共存(目視: 弧+直径一体・18cm線下)。描画不良0(半円はpolygon塗りでrim<circle>非保持=正常)。
- **furigana増補**: 四分円→しぶんえん(半円=はんえん既収・まるこ検収)→3コピー同期・433パターン残存0。
- rationale正規化: インラインdirective→bank_directives D9(検収文無改変・id参照)。rationale 431→**433**・integrity 433(g06 79/79)・pairs_design 433。全32関門+パリティPASS。

### 2026-08-22 g05 P-3a第四便+P-3b第一便(円周拡張2+面積逆算4・まとめ配線・D-2)
- g05に6パターンをD-2 append(70→76・2便まとめ)。まるこ検収済み。【P-3a4】円周→半径(逆算2段)・円周の文章題(花だん)。【P-3b1】面積逆算4(平行四辺形/三角形の底辺・台形の高さ・ひし形の対角線)。全図なし(テキスト完結)。lexicon追加なし。
- 旧md5 d11f4ea3(70)→**新md5 d2c262c0**(76)。golden PASS 228/228。既存70 byte一致(D-2成立)。
- **tnc正規化**(P-3a4のみ): 素材tnc([2]/[])は3.14の[3,14]欠落→既存circle流儀へ正規化([3,14,2]/[3,14])。P-3b1は3.14非使用=正規化不要。
- **3.14書式**: 円周文章題 af=d1*314+aus:dec2(既存円周流儀)。逆算半径は c_len1(=r1*628)提示→÷3.14→÷2の2段(_disp自動生成で入力値の小数表示)。af独立検算一致。
- **面積逆算(P-3b1)**: af=S1//h1・S1*2//h1・S1*2//(a1+b1)・S1*2//d1。整数保証(% == 0)+範囲cap+転記回避(S1*2 != h1*h1等)完備=既存逆算族流儀。60本verify fail0。
- **rationale統合**: g05はインラインdirectives流儀(bank_directives無し)=素材そのまま統合(g06のような正規化不要)。rationale 433→**439**・integrity 439(g05 76/76)・pairs_design 439。
- **furigana増補4語**(上底→じょうてい/下底→かてい/対角線→たいかくせん/一方→いっぽう・まるこ検収)→3コピー同期・439残存0。
- スモーク4問・全32関門+パリティPASS。

### 2026-08-22 composite_circle kind実装(複合円19問の受け皿)+furigana自己走査道具(P-3a最終便)
- **composite_circle**(複合円求積の共通機構): 4構成=(a)square_minus_circle(正方形−内接円・辺=直径)・(b)circle_minus_circle(同心ドーナツ)・(c)half_pair(半環)・(d)circle_in_circle_side(大円−横並び小円2)。塗り#cfe0fb(求積対象)/白抜き(除外)。真円=<circle>(a/b/d)+<path A R R>(c半円)=corr-0019準拠。寸法=半径/直径線(第二便mode流用)+正方形辺。全数値スロット参照・整合違反(R≤r・2r>R・s≤0)はthrow=正面積保証。
- **corr-0020悉皆**: 4構成×寸法域(正方形s2-20・環/半環R3-12×r<R・横並び2r≤R)=154組・違反0・min(minText 19.0/minSeg 5.0@donut R10r3)。
- ベクター: composite_circle_vectors.js=167照合(描画要素数・真円rx==ry・内接/同心整合・正面積契約throw5種・ラベル・シード)。全33関門PASS。既存circle系golden不変(g05 d2c262c0/g06 2bb79492/figure_nondestructive)。
- 目視素材4枚: composite_circle_preview_{a_sq_minus_circle,b_donut,c_half_pair,d_circle_in_side}.svg。バンク(複合面積のg06追補約4)は目視後Fable側。
- **furigana自己走査道具(恒久修正)**: handoff_jhs/furigana_registered.txt新設(表層形412語・読み不要・更新日2026-08-22)。以後配線ごとに更新し報告に日付記載=Fableが納品前自己走査で突合(まるこ経由受け渡しは初回のみ)。

### 2026-08-22 g06 複合面積4パターン配線(P-3a完了便・表族+円族完了)
- **g06 79→83**: composite_circle kind(0f04461)本使用。g06_comp_{sq_circle(正方形−内接円)/donut(同心ドーナツ)/half_ring(半環)/two_circles(大円−横並び小円2)}_01。3.14=×314/×157整数演算+answer_unit_system:dec2(既存円面積流儀)。
- **golden md5: g06 2bb79492 → b83b53f0**(既存79件は出力バイト完全不変=D-2 append/prefix一致・追加は末尾4パターン12標本のみ・PASS 237→249 FAIL 0)。g05 d2c262c0 不変。
- **clearance**: 4パターンの有効スロット全95組(sq9/donut43/half25/two18)を実描画+_compositeCircleMinClearanceで確認・違反0・域内min(minText 19.0/minSeg 5.0@donut R10r3)=composite_circle既存154組スキャン域内。
- **rationale/integrity/pairs 439→443**(検証OK): g06 rationale 79→83・bank_directives D10(複合面積は全構成で本文寸法明示=まるこ半環目視所見)/D11(furigana自己走査新手順)追加。inline directives→D-id参照へ正規化(load_g06互換)。
- **furigana**: 自己走査第1号で欠落3語(中心/色/部分)を納品前検出→furigana_patch同梱受領→3コピー同期(handoff/assets_global/pg-lex)+registered.txt 412→415。差戻し往復ゼロ。
- **corrections_log**: corr-0025(図で語れないなら文で語る=複合図形の与件は本文)・corr-0026(反復差戻しは上流自己走査へ前倒し)追記。全33関門PASS。

### 2026-08-30 g02 P4-1配線(筆算9+数の構成5)21→35
- **g02 21→35**: P-4第一便=最大バケツ(筆算315atom+数構成域)。g02_calc_{add_2d_nc/add_2d_c/add_to3d/add_3d2d/sub_2d_nb/sub_2d_b/sub_3d2d/tens_add/tens_sub}_01+g02_kaz_{kosei_1000/bunkai_1000/kosei_10000/kurabe/tobi}_01。位スロット合成(g01_add_tensone手筋のg02全域版)=くり上下を桁制約で構造保証。
- **golden md5: g02 e064fc27 → 7309bb49**(既存21件出力バイト完全不変=D-2 prefix一致・PASS 63→105 FAIL 0)。g05/g06不変。
- **unit_id仮採番(g02_p4_*)→参照突合**: c05/c06/c21/c22/c08/c09/c23/c18/c16/c41/c42へ実採番(単元名一致確認済)。
- **sub_3d2d ①②分離判断**: overridesは置換のみ(effective_constraints)→基底にborrow_shape①(D1≦B1∧A1<C1=十の位のみくり下がり・138−56型)を持たせ、c24をconstraints_replaceで②(D1>B1∧A1−1<C1=連続くり下がり・132−74型)に差し替え。両経路200標本で制約全成立を実証。
- **kurabe転記例外5件目**: g02_kaz_kurabe_01をSELECTION_ANSWER登録(g01_kurabe/ookii・g06_hyo_max/min前例)。corr-0007 gate残差0。
- **ドリル様式整合**: 指示文「次の計算」→「つぎの計算」(次=g03配当・g02はかな正準)。答え様式「答え {ans}」=g01「こたえ {ans}」のg02版で整合。
- **num_seq採点拡張**: numSeqNorm修飾剥がしを「Nの」→「Nの/Nを」へ(bunkaiの「100を3こ」対応・正答/生徒答へ対称適用)。エンジン側normNumSeqは1:1のまま非改変。
- **rationale/pairs 443→457**(検証OK): g02 master=inline directives流儀・figure:null慣行=素材無修正統合。furigana欠落0(自己走査・registered 415語のまま)。全33関門PASS。

### 2026-08-30 g02 P4-2配線(時こく2+単位5+図形3+はこ1+九九2+分数1+表1)35→49
- **g02 35→49**: 素材15中、g02_jikan_conv_01は既存time_conv_hmin_to_min(c03)と問文・方向・値域とも実質重複=受領検証で検出→まるこ裁可で除外・在庫へ(corr-0027: 以後の受領検証報告に次便設計学年の既存一覧同梱を常設)。
- **golden md5: g02 7309bb49 → c01c598c**(既存35件バイト不変・PASS 105→147 FAIL 0)。unit_id実採番: c02/c04/c14/c20/c44/c27/c28/c48/c37/c51/c01。
- **lexicon 4キー追加**: zukei_defs/zukei_yoso/hako_yoso(交付)+shirabe_1row(g06から継承コピー=g03 actors前例・共用可判定)。
- **FORMATTERS宣言正準化**: answer_domain→answer_unit_system(clock/cm_mm/L_dL/m_cm)。frac_unitは非実在→slash正準「1/{n1}」(g03 ans_frac流儀・ぶんの読み正)。fun_goは本文に午前明示(clock接頭と整合)。
- **関門捕捉と修正**: 辺(g04)/面(g03)=allowed_extra(furigana完備)・zukei_defsの3本/4本=tnc宣言・hyo_yomi本文かな正規化(表/結果/整理=配当外)・指示文つぎ正準。
- **読み機構修正(corr-0028・目検1周で検出)**: ①counter表に分後/時間後/mm追加(N分後=ふんあと誤読・mm未定義) ②reading_engine最長一致優先(何分の一が何分=なんぷんに食われる)+複数漢字連表層の全体置換 ③lexicon増補「分け=わ」(ぶんけた誤読・まるこ裁可)。各2〜3コピー同期(handoff/pg-ct/pg-engine/assets_global)・固定ベクター23→28で封印。**以後の配線は新規本文の読み目検1周を標準手順化**(coverage関門は誤読を検知できない)。
- **転記例外7件登録**: fun_go/naga_add/naga_sub/kasa_add/kasa_sub=COMPOUND_UNIT_PRESERVE・kuku_kimari=SELECTION_ANSWER・bunsu_teigi=FRAC_PRESERVE。corr-0007 gate残差0。
- **furigana**: パッチ2語(何分の一/面)+増補1語(分け)=3コピー同期・registered 415→418。rationale/pairs 457→471(検証OK・jikan_conv除外)。全33関門PASS。

### 2026-08-30 g03 P4-3配線(筆算8+大きい数4+小数4)26→42
- **g03 26→42**: g03初のP-4便。g02 P4-1様式(位スロット合成・束計算)の上位展開。
- **golden md5: g03 6e5cd3b0 → 51f56ad6**(既存26件バイト不変・PASS 78→126 FAIL 0)。
- **受領検証の捕捉**: ①pattern_id衝突: 新dec_add_01が既存(文章題)と衝突→dec_add/sub_calc_01へ改名(g06 _calc/_word前例) ②dec1_L=非実在FORMATTER→aus dec1+テンプレL(既存dec資産突合) ③dec_add/sub_calcのslot _disp参照→quantity_slots(dec1内部整数)へ正準化 ④kurai_digit=位の数字0可→answer_domain any_int(g01 0加減前例) ⑤0.1リテラル→tnc[0,1](3.14=[3,14]前例) ⑥位=g04配当→allowed_extra(辺/面前例)。
- **kurai_digit条件式受理**: 4段ネスト三項(pyTernary)両エンジン受理・8桁位取り合成。lexicon kurai_names 4件追加。
- **実物レンジ二段**: 設計域は全単元で参照の入口サブセット=妥当。参照側の上位難度(億の位・3けた×2けた・大きい小数和)は在庫として記録(P4-4以降)。
- **furigana**: パッチ4語(一万/十万/百万/千万の位=複合表層方針)3コピー同期・registered 418→422。読み目検1周=全16正常(減算のマイナス読みは既存規約)。
- **転記gate残差0**(新規例外なし=素材のno_transcribe設計が完備)。rationale/pairs 471→487(検証OK・改名キーで統合)。全33関門PASS。

### 2026-08-30 g03 P4-4配線(わり算2+きまり3+時間復活3+円球3+表2+三角形2)42→57・P-4完結
- **g03 42→57**: P-4完結便。時間の計算=裁可(a)復活(c03へ3パターン・h_min/経過)。円球は図なし先行分(半径↔直径・球の箱詰め)。
- **golden md5: g03 51f56ad6 → f2c050f4**(既存42件バイト不変・PASS 126→171 FAIL 0)。
- **受領検証の捕捉**: ①as「remainder」素形式→**compound_remainder**(div_amari_fukubun流儀突合。逆算スロット合成P=ab+rで余り構造保証はドリル新設計) ②ad h_min→aus正準化2件 ③径=g04→allowed_extra3件・辺=sankaku2件(+定義文2/3=tnc) ④結果→けっか(g02前例) ⑤g03側shared_lexiconにshirabe_1row継承コピー(g02経由) ⑥time_keika転記退化(経過分=開始分: 60+m2=2m1)を制約化=corr-0007悉皆列挙の実践。
- **転記例外3登録**: kimari_koukan/zero/zoubun=SELECTION_ANSWER(交換法則の答=かけられる数・0の性質・束のきまり=g01_add_zero/g02_kuku_kimari前例)。gate残差0。
- **cross-grade注記**: g03_time_conv_min_to_hminはg02_time_conv_min_to_hminと同形だが別学年単元(スパイラル)=バンクは学年別出題のため正当(P4-2のjikan_conv=同一学年内重複とは区別)。
- 読み目検1周=15全正常(直径=ちょっけい・二等辺・商とも正)。rationale/pairs 487→502(検証OK)。全33関門PASS。
- **P-4完結・被覆率再計測**(単元所属ベース・調査時50%→**88%**): g01 329/332(99%・P-1完成/図3行残)・g02 231/325(71%)・g03 405/445(91%)・g04 213/339(63%)・g05 495/522(95%)・g06 1021/1102(93%)。残余: g02 15単元94行(たしかめ・はかり方・あらわし方系=P-4圏外の小骨格群)・g03 3単元40行(きまりとり用・ぼうグラフ・大きい数のり用)・図依存群。※g01_unit_mapping.mdにバッチ3行の追記漏れあり(挙動影響なし・次便で整備)。

### 2026-08-31 g04 P5-1配線(小数しくみ4+角3+時計角2+面積2+大きい数2+順序1)24→37
- **g04 24→37**: P5-1(テキスト完結+部分収録残)。素材14中、gaisu_shishaは既存gaisu_round_01の真部分集合=**重複自動除外**(裁可不要運用の初適用)。junjo_kakko(a+(b−c))と kaz_tanigo(兆億域)は既存order/bignum_writeと構造別=採用。
- **golden md5: g04 45650beb → ad524756**(既存24件バイト不変・PASS 72→111 FAIL 0)。lexicon 3キー(dec_kurai_names/big_kurai_names/men_units)。
- **受理正準化**: quantity_slotsハイブリッド形(slots+qs stub)は生成器受理不可(sample_slot_valueがbase_range必須)→qs一本化2件(dec2/dec1)。**桁直書き合成**(3.407・12桁)は本文token(407/12桁全体)をcomputed宣言(F1/N1)で受理=新手筋確立。dec_atsume=aus dec2化・針=allowed_extra2件・junjo_kakko転記2制約(a≠c・a+b≠2c)追加でgate残差0。
- **読み目検の検出と修正(corr-0028運用)**: ①readNumber億/兆拡張(12〜14桁の正読・2エンジンコピー) ②m²/cm²/km² counter追加(へいほう読み・複合キー無衝突) ③**a/haはcounter登録禁止**(jhs文字式3a汚染)→men_unitsカタカナ表記へ正規化=corr-0029 ④lexicon増補2語(回る=まわ・の間の=あいだ・裁可済)。固定ベクター28→35封印・3コピー同期(assets_global/pg-ct/pg-engine/pg-lex)。
- **furigana**: パッチ11語+増補2語=registered 422→435。rationale/pairs 502→515(検証OK・shisha除外)。全33関門PASS。
- **g04被覆率更新: 63%→76%**(単元27/37・問題259/339)。次: P5-2(図なし先行73問≈18p→91%見込)。

### 2026-08-31 g04 P5-2配線(c05性質5+面積4+角度3+立体3+小数あまり1)37→53
- **g04 37→53**: 図なし先行波。重複検査=除外0(rect_area_m=m²単位域・sq_gyaku=平方逆算・kaku_add/sub=記法ドリルとも既存と構造別を確認)。
- **golden md5: g04 ad524756 → 33ae6859**(既存37件バイト不変・PASS 111→159 FAIL 0)。lexicon 2キー(shikaku_defs交付+**chokuho_yoso=素材参照欠落を受領検証で検出しg02 hako_yoso継承で補完**・頂点=漢字表記)。
- **edge_set正準化**: chokuho垂直/平行の固定答テキストを**edge_rel導出**(jhs c14 nejire流儀=af/computed E1/{E1_edges}表示/prism base_kind+w,d,h+highlight_edge)へ正準化——幾何正当性をエンジン保証・採点はedgeSetMatch完全一致流用。固定答はエンジン照合で正しかったが導出形が正(図寸法可変・スキャン域vol_cap≦500踏襲)。
- **小数あまり様式(裁可b)**: dec_div_amariのqs stub→r1=真quantity(dec1)+N1=computed+**aus dec1でN1_disp自動生成**(computed×ausの既存機構=エンジン無変更)。159.4÷9=17あまり6.4。
- **転記例外2登録**(想定3→実2): heishi_hen/taikaku=SELECTION_ANSWER(平行四辺形の対辺/対角=本文値保存が学習内容)。rinkakuはal≠90制約で残差なし。gate残差0。
- **読み修正**: °記号=counter追加(alias_of 度・2コピー)・「ひし形=がた」増補(裁可済・registered 438)。**「〜形」族一括点検(まるこ指示・予防措置): 12語全正読**=ひし形のみが欠落だった。固定ベクター35→39封印。
- rationale/pairs 515→531(検証OK)。全33関門PASS。**g04被覆率: 76%→86%**(単元31/37・問題291/339)。残: c02グラフ族25行+c13変わり方7行+c10_u02求め方6行+部分残=P5-3(図依存)。

### 2026-08-31 P5-3第1便: xy_graph折れ線モード+composite_area新設+検算ゲート(kind受け皿便)
- **指示書**: P5-3_実装指示書_第1便_r2.md(Fable設計・まるこ検収済・追補A cuts一般化)。棚卸し16行=Fable見込みと完全一致(line_graph6+draw1+double3+かぎ型6)・c02_u03は既存table kindで受容可判定(第2便=配線のみ・まるこ承認)。
- **Kind A(xy_graph mode:polyline)**: v1/v2非破壊の独立分岐。1〜2系列・1-2-5自動目盛(6〜10)・非ゼロ下端の省略波線・draw:true作図用・実線●/破線○+凡例(グレースケール)・日本語ハードコード0(§3.1)・ガード5種throw。17照合関門。
- **Kind B(composite_area)**: cuts一般化(角4/辺+offset/hole・1〜3個)。輪郭線分合成・直角マーク(内側判定)・ラベル=ボイド内自辺隣接/対角分離/小ボイド開口部外側(ownMin)/小hole中心振り分け。契約6種throw=正面積保証。1972照合(clearance悉皆1960組違反0・minText10.2/minSeg6.6)。
- **検算ゲート(§2.4新設・先行実装)**: composite_area_gate.js=①fixture検算(c10_u02正規化4行: 外形−Σ切欠き==answer面積・全一致)+②バンク悉皆(composite_area図パターンの答え照合・現0件でも常走=将来配線の自動監視)。
- **c10_u02正規化結果**: 検算可4小問(L字2=分割加算式から外形−切欠きへ変換・くりぬき2)・寸法欠落3行(転記が解式/答のみ=構造分類のみ: hole/コの字/複合)・skip1行((a+b)²−正方形3個=辺が一意に定まらず・追補A.2想定≦1行に合致)。
- **関門33→36**(xy_polyline_vectors/composite_area_vectors/composite_area_gate)・全GREEN。golden不変(g04 33ae6859/g05 d2c262c0/g06 b83b53f0)。furigana追加0(§4=表示文字列は全てバンク由来)。目視素材7枚(p53_*.svg)。バンク+rationaleはFable次便(composite_circle前例)。コミット3分割(§5-3): xy_graph拡張/composite_area新設/ゲート登録。

### 2026-09-01 P5-3検収差し戻し対応(composite_area・corr-0030)
- **直角マーク**: 向き固定(対角4方向プローブ)を廃止→**頂点の2辺方向ベクトルが張る90°扇形の内側**に描画(辺接続グラフから導出・凸=図形内/凹=開口側/穴=穴内へ自動一致)。頂点キー丸めと端点生floatの混在で直交フィルタが誤爆するバグも修正(丸め整合)。
- **寸法ラベル**: 「開口部前」積み置きスロット廃止→**担当辺の中点に垂直オフセットで帰属配置**(外形辺=外側・切欠き辺=開口内・穴辺=穴内)。in-void条件=幅/深さ両軸(帰属の幾何保証)・2枚同居=ボイド最小辺≥64px・不足辺のみ**外置き+破線リーダー**。
- **関門2項追加**: ラベル帰属検査(最近傍辺=担当辺・リーダー例外)+マーク向き検査(中心∈90°扇形)。composite_area_vectors **1972→23724照合**(帰属7870/マーク13882・clearance悉皆1960組違反0)。全36関門GREEN・golden3学年不変(g04 33ae6859/g05 d2c262c0/g06 b83b53f0)。
- 面積系4枚(L字/コの字/くりぬき/複合)を同名再出力→まるこ再目視待ち。折れ線3枚は合格済(第2便折れ線配線は並行可)。corr-0030登録(描画規則と検査規則を同じ幾何導出から生やす)。

### 2026-09-01 P5-3再差し戻し対応(リーダー線様式・corr-0031)
- **リーダーr3**: 長破線+垂直延長経路(寸法線と誤読)を廃止→**起点=担当辺中点(小丸●)・45°斜め外向き(bbox脱出最短象限)・実線細線・長さ=出口+8pxキャップ**。リーダー先ラベルは長梯子candsで並走2本を分離。
- **帰属検査に追加**: リーダー起点=担当辺中点±ε・長さ≦キャップ・45°象限(auditが独立再計算)。composite_area_vectors **23724→26672照合**・全36関門GREEN・golden3学年不変。
- 該当3素材(lshape/koji/multi)を同名再出力→まるこ再目視。holeはリーダー非使用で対象外。corr-0031(線種は意味資源——新補助要素には未使用様式+起点明示記号)。

### 2026-09-01 g04 P5-3第2便配線(折れ線10+composite_area2)53→65・被覆86→92%
- **転写便**: 設計書(裁可f済)+rationale本文(Fableネイティブ)のrepo様式転写(委任=転写のみ)。裁可3点: 転写先=(b)pedagogy静的転写+「例: 」例示化 / furiganaパッチ10語+時刻両表記併存 / u01_003シフト対象外・y_range同幅シフト・波線自動。
- **golden md5: g04 33ae6859 → cfcb5516**(既存53件バイト不変・PASS 159→195 FAIL 0)。
- **区間テンプレート判定=可**: 行別制約が区間位置を固定→静的文字列answer(SELECTION_ANSWER落ち行ゼロ)。
- **可変化の実装**: 系列平行移動s1(+y_range同幅・波線自動)/u01_009=Σ56保存の補償スロット/u01_003・u02_005=anchor固定(裁可3)。多小問は①②③形式(丸数字=corr-0007の数字token非発生)。
- **エンジン微修正**: y目盛の添字ループ+ラベル丸め(0.1刻み対策・整数出力不変)・xラベルのピッチ不足時フォント縮小(下限7・§1.3-6)。u02_005のy目盛は0.1指定→過密回避で主目盛0.5(報告事項)。
- **カット3件(A.3)**: u01_009(3)/u02_003(1)/u02_005(1)の「かきなさい」小問=text/answer両除去+番号詰め。
- **furigana**: 走査表10語+本文転写語彙パッチ第2波19語+counter「月」(暦月digit読み)=registered 448→467。coverage 543パターン/32580標本 残存0。転記例外+1(line_draw=表の値の写し=作図)。
- rationale転写12(pedagogy=逐語+例: 3文・text/by/date形式)。pairs 531→543(検証OK)。全36関門GREEN。
- **台帳メモ**: ①kind裁可(e)候補: kaisetsu_template(生徒向け解説の実行時レンダ=製品機能)・line_bar_combo・line_graph_choice ②編集方針課題: 「時こく/時刻」表記統一の是非(現状両表記併存・golden g02/g03不変維持) ③素材交付依頼(設計書§3): かぎ型寸法欠落3行の寸法転記待ち。

### 2026-09-02 u02_005補助目盛0.1復活(まるこ確認対応)+第2波19語検収クローズ
- 確認結果: 主目盛0.5化で補助目盛は1/2固定(0.25刻み)となり**0.1刻みは非残存**だった→`y_minor`フィールド新設(補助刻み指定・主位置は重複描画せず・未指定時は従来1/2挙動=既存出力バイト不変)。u02_005へy_minor:0.1適用(主0.5維持)。
- golden不変(cfcb5516=図パラメータはgolden外)・ベクター+1封印(補助24本=31位置−主7)・全36関門GREEN。目視用に体温実図をp53_polyline_taion.svgで出力(同名対象が存在しなかったため新名・報告)。
- furiganaパッチ第2波19語=まるこ検収承認・クローズ。

### 2026-09-02 g04 P5-3第3便配線(表族9=c02_u03)65→74・被覆92→95%
- **転写便**: 第3便設計書(裁可g済・設計+rationale同梱)。kind裁可不要(table受容承認済)・配線のみ。009=skip(選択肢文未転記=素材待ち台帳・寸法欠落3行と同枠)。
- **golden md5: g04 cfcb5516 → fbe0a7e1**(既存65件バイト不変・PASS 195→222 FAIL 0)。
- **転写所見**: 007=anchor固定(転記実在値)・最大系=一意性制約+位置固定で静的答(001行max/004行列二重max)・003/006=211系(003可変・006=補償スロットで総計保存)・空欄=□セル+行優先値列挙(多小問混在のためnum_seq自動採点は適用外=教師採点主・単問化時の在庫)。マーカーは丸数字小問と衝突回避で「あ」(設計書①指定から置換)。004③答は組読み弁別で「1くみ」表記。
- **読み修正(目検検出)**: ①counter「年生」新設(4年生=よねんせい) ②**人のgt10複合読み**(211人=にひゃくじゅういちにん——digit_readings_gt10機構をエンジン新設・1人/2人=ひとり/ふたり維持) ③人=にん→**ひと**(単独文脈・counter経路は不変) ④1組=ひとくみ(ペア)/1くみ=いちくみ(クラス)の弁別 ⑤lexicon増補: 好き/地/借り/問題+走査19語。registered 467→490。固定ベクター39→47封印。
- **table_scan捕捉**: col_header先頭の空セルはg06流儀と不一致(semOk=values数==header数)→9図から除去し183/183=100%。
- rationale転写9(pedagogy=設計書4種の逐語+例示化・text/by/date)。pairs 543→552(検証OK)。転記例外+1(hyo_nyujo=表整理の写し)。全36関門GREEN。
- **c05_u01/c13素材充足度**(まるこ依頼): 本文§3-3報告に詳細。c05=図依存主(組合せ記号ア〜コの図が本体・テキスト成立2行のみ)・c13=良好(式・表の転記が厚く、グラフ3行を除く4行は配線可能な厚み)。

### 2026-09-02 u02_005検収クローズ(まるこ目視OK)
- p53_polyline_taion.svg(主目盛0.5+補助0.1)目視合格。y_minor対応・第2波19語パッチとあわせP5-3第2便の差し戻し・確認事項は全クローズ。

### 2026-09-02 第3便クローズ+c05_u01の裁可(e)候補化
- P5-3第3便=まるこ受理・クローズ(マーカー「あ」置換・「1くみ」表記とも承認)。
- **kind裁可(e)候補台帳へ追加**: 「平行線図kind」(c05_u01=直線ア〜コの垂直平行組合せ選択6行+平行線と交わる角2行の受け皿)。既存候補: kaisetsu_template・line_bar_combo・line_graph_choice。**裁可(e)議題書はc13便完了後にFable起草**。
- 次便=c13(変わり方)4行(配線のみ相当)。棚卸し先出しは7行全文引用付き(Fable側ワークブック読解がc13に届かないため・グラフ読み3行のpolyline受容可否判定込み)。

### 2026-09-02 g04 P5-3第4便配線(c13変わり方7行)74→81・被覆95→97%
- **転写便**: 第4便設計書(裁可h済)。table+□式4行(単価/まわり長/だん数/個数スロット可変・式=構造文字列)+polyline3行(row2/4=点再設計で各1答保存1答再生成・row6=両答厳密保存)。
- **golden md5: g04 fbe0a7e1 → a9459076**(既存74件バイト不変・PASS 222→243 FAIL 0)。
- **固定ベクター2枚**(だん積み/ようじ例示・目視素材)+**p53_static_assets.js新設(関門37番目)**: 例示図md5封印+polyline3行の保存答再導出assert(直線性・外挿・x切片・差/交点/大小逆転)。
- 読み目検: 上げ=あ・個数=こすう・火=ひ増補(registered 493)。dai式答=FORMULA_TRANSCRIBE例外(立式)。rationale転写7(pedagogy=設計書5種逐語)。pairs 552→559(検証OK)。全37関門GREEN。
- **c13被覆で単元36/37・97%**。残余=c02_u03の009+かぎ型3行(素材待ち)+c05_u01(裁可(e)平行線図kind)。

### 2026-09-03 g04 e-1配線(平行線と角)81→82・被覆97→100%(単元37/37)
- **裁可(e)案A e-1**: c05_u01の角度2行(55°/60°系)をal1スロット(35-145 step5・90除外=jhs前例)の1パターンで被覆。**jhs c12 parallel_linesのkind改修ゼロ下位展開**(angle_figure subkind・あ=known label/い=補角computed/う=同位角)。v整合はkind契約(隣接和180/対頂相等/平行輸送)が全標本検査。
- **golden md5: g04 a9459076 → 175e908b**(既存81件バイト不変・PASS 243→246 FAIL 0)。う=同位角相等の転記=SELECTION_ANSWER(jhs doui裁可済類型)。読み目検✅(まじわって/かくど)。rationale+1・pairs 559→560(検証OK)。全37関門GREEN。
- **g04被覆100%到達(単元37/37・問題339/339=単元所属ベース)**。行レベル残余=c05_u01の選択6行+作図系+135°行・素材待ち4行。
- e-2棚卸し+在庫4種内訳=§3-3報告に添付。e-9(kaisetsu_template)は独立便・e-7/8は台帳保留。

### 2026-09-03 e-2受け皿: line_set kind新設+関門(裁可i・目視待ち)
- **line_set**(直線散布・垂直/平行組合せ選択): labels(バンク由来記号)+pairs(正答ペア=転記保存)+seed→**合成規則(§1.2)を決定的乱択(mulberry32)+増分配置(要素ごと局所リトライ)で生成**。lines[]明示も受理(anchor固定)。幾何ガード=キャンバス内(余白0.06)・正答ペア角度(平行<0.5°/垂直|Δ−90|<0.5°)・非正答余白[12°,78°]・垂直ペア交点あり・交点端寄り(≥0.08)/三重交点(≥0.05)なし・**ラベル余地(ラベル端の他線分距離≥0.12)**。ラベル端=余地の大きい側を幾何導出(描画と検査で同一導出=corr-0030原則)。
- **関門38番目 line_set_vectors.js**: 3行構成×seed200=600構成の悉皆(角度差/包含/交点/ラベル帰属/決定性)+契約4種。全GREEN(合成失敗0・帰属違反0)。既存golden3学年不変。
- スモーク3枚 p53_lineset_row{0,3,7}.svg(選択3行のanchor配置)→まるこ目視待ち。目視後: 選択3行+row4配線(edge_set採点のカタカナ記号拡張・rationale・ふりがな)。
- **台帳**: row5(垂直組合せ+作図・答未転記)・row1/row8(三角定規作図)=**域外(d)**。row4答(1)=辺AB補正(裁可i-2)。**在庫順位=対称→概形→数直線→等分**。e-9 kaisetsu_template=e-2完了直後の独立便(対称受け皿と同時コミットしない)。

### 2026-09-04 line_set生成規則修正(まるこ目視条件①〜④)+再出力
- ①交差最小化: 平行ペア線=他線と非交差(端側4帯配置)・各線の交差相手≦2・垂直ペア同士=非交差かつ交点離間≥0.3(lsValidateへ追加=合成/描画/関門で同一導出)。②線分長0.40域([0.36,0.44])。③row7の「コ」は転記答(3)平行ク・コの正答ペア構成員=ダミー無し(6本=全て構成員)で現状維持・報告。④関門に交差数上限(≦2)を追加し悉皆再検査=600構成・交差相手max1・帰属違反0・GREEN。
- 再出力3枚(同名)→まるこ再目視待ち。

### 2026-09-04 line_set生成規則r3(再目視: 易しすぎ)——交差密度の難度ノブ化
- ①平行ペア非交差規則を撤回(normal): 横断線1〜2本が平行ペア両方を横切る配置を許容(片側のみは禁止・normalは横断≥1必須=教科書並み)。②非正答交差は角度帯[40°,75°]∪[105°,140°]で許容(非ペア交差相手≦2維持)。③density=難度ノブ(rei=low=交差は垂直ペア内のみ/conf・練=normal)——バンクではdiff欄に連動。④関門は角度帯・交差規則を幾何(lines)から独立再計算(corr-0030)。
- 実装: geomはサブシード探索(決定的・最大24)で「合成成功+ラベル帰属自己検査」を両立→関門1200構成(3行×2density×seed200)で失敗0・帰属違反0・normal横断≥1=600/600。ラベル方向候補を外向き±35°へ拡張・normalの余地閾値0.08。
- 再出力3枚(row0=low/row3・row7=normal)→まるこ再目視待ち。

### 2026-09-04 line_set生成規則r4(再目視: 垂直ペア必交差が答えを示唆)
- ①normalは垂直ペアの少なくとも1組を**延長型**(実線分非交差・延長交点キャンバス内・延長距離=線分長×[0.3,0.8]=「のばすと直角に交わる」型)に。②他の垂直ペアは交差可・非直角交差の角度帯[40°,75°]維持。③low=交点必須のまま。④関門に延長交点の位置・実線分非交差の独立再計算検査を追加、悉皆域をseed100/density(600構成)へ圧縮(実行90s→約30s)。
- 合成調整: 片側横断禁止(自作規則)を撤回・normalラベル余地0.05(帰属はレイアウト自己検査で担保)・交点端寄り0.06・延長ペアは交点[0.35,0.65]+中心側配置・三重交点近接0.04。棄却ヒストグラムのデバッグフック(_lsStats)を追加。結果: normal=延長型≥1・横断≥1とも全構成・失敗0・帰属0。
- row3/row7再出力→まるこ再目視待ち。

### 2026-09-04 line_set生成規則r5(再目視: 端と端が接して折れ線/角に見える)
- ①任意2線分の端点間距離≥0.10 ②端点から他線分への距離≥0.06(端が他線に乗らない) ③交点端寄り禁止≥0.08を復元——線分関係は「内部で交わる」か「離れている」の二択。④関門に①②の独立再計算検査を追加(seed100/density域=600構成)。
- **合成器の構造変更**: 「横断ペア=交差型」だと相棒(平行線と15〜32°)が帯に食い込み②に必ず抵触(幾何的に両立不能)→**横断線Tを延長型ペアの一員**に(T=急角[58,75]で平行ペア両方を横断・相棒T2は帯の外で延長交点)、第2組は交差型を離して配置。normal平行間隔[0.14,0.18]。結果: normal=失敗0・延長型≥1・横断≥1が全構成・帰属0・8ms/構成。
- 全38関門GREEN・golden不変。row3/row7(+row0)再出力→まるこ再目視待ち。

### 2026-09-04 g04 e-2配線(直線の組合せ選択3行+長方形の辺row4)82→84・c05_u01 行レベル6/10
- **まるこ再目視OK(r5・許容水準)→配線**。`g04_chokusen_kumi_01`=同一フォーマット3行を1パターン(lineset_rows: 転記の正答ペア記号を保存・density=例low/確認・練習normal・seed=sd1∈[1,100]=関門悉皆域)。`g04_chohokei_hen_01`=row4(基準辺4択・答(1)辺AB=裁可i-2補正・(2)は基準辺DCに揃えて転写・図なし=設計書§1.5)。
- **edge_set拡張(カタカナ単記号)**: JS normEdgeSet/fmtEdgeSet・Python norm_edge_set/fmt_edge_set・採点HTML edgeSetNorm の3実装——「頂点2字の辺が1つも無い文字列に限りア〜ンの1字を記号抽出」=辺が1つでもあれば従来どおり。**関門 edge_set_vectors(5)新設: 凍結オラクル(拡張前)と既存edge_set正答コーパス(180件+ゆれ16)で全件不変・採点判定一致・3実装一致(Python含む)・カタカナ域8+バンク**。採点HTMLはanswer_domain==='edge_set'宣言でchoice機構を抑止+辺集合採点へ経路(旧quiz形状は従来どおり)。
- **エンジン最小拡張**: answer_formulaの名前空間にcomputed_slotsの**文字列値**を追加(JS/Python 1:1・parity関門も同準拠)。既存バンクは未参照=非干渉——**golden g05 d2c262c0 / g06 b83b53f0 不変**。
- **golden md5: g04 175e908b → b3f03491**(既存82件バイト不変・PASS 246→252 FAIL 0)。読み目検✅(組み合わせ=くみ+あ・「問い」は未登録のため「次の辺」表現で回避)。rationale+2(directives=まるこ目視指示r2〜r5を転写・pedagogy=設計ノート文字列形式=Fable本文未着)。corrections_log corr-0032〜0035(r2〜r5)。pairs 560→562(検証OK)。corr-0007 gate 残差0。**全38関門GREEN**。
- **台帳**: 多小問(①②③)はans=①のみ=自動採点は単問化時の在庫・教師採点主(表族と同流儀)。次=line_set第2テンプレート小便(seedで型を交互出力・関門共通・まるこ前倒し指示)→e-9 kaisetsu_template独立便→対称第1便。

### 2026-09-04 line_set第2テンプレート(型B)——seedで型を交互出力・関門共通(まるこ前倒し指示)
- **型A**(r5既存)=横断線T∈延長型ペア(相棒T2は帯外で延長交点)/ **型B**(新)=横断線T∈交差型ペア(T=急角[72,75]で平行ペアを横断・相棒T2はTの帯外部分でTの端寄り(端から0.075域)に交わり帯から離れる向きへ・第2組=延長型を帯外に配置)。normalは**seed偶数=A・奇数=B**(fp.templateで明示指定も受理)・lowは単型(横断なし=型の差が無い)。
- 型Bの幾何余地: 端点規則(端点間≥0.10・端→他線≥0.06)とTの端/T2の端の直交配置から交点Xは両端から0.075域が必要→平行間隔を型Bのみ[0.11,0.13]に狭め・T長0.42〜0.44。初版(端から0.04〜0.06)はend_on_lineで全棄却=棄却ヒストグラムで特定して調整。
- **規則(lsValidate)・関門は両型共通**。line_set_vectorsへ型の独立再計算を追加: normal各構成で「横断線が垂直ペア構成員」かつ相棒との実線分交差=型B/非交差=型Aをseed偶奇と照合、A/Bとも出現を必須。600構成GREEN(A150/B150)・5s。**全38関門GREEN・golden不変**(b3f03491: 合成はJS描画層のみ)。
- 型Bプレビュー: p53_lineset_row3_t2.svg / row7_t2.svg(seed23/37=奇数)→まるこ目視待ち。既存row0/3/7(型A)は現状維持。

### 2026-09-04 line_set r6(型B差し戻し: 垂直の組が判別できない)——**根因=非等方描画**+角度帯/交点中央/等スケール関門
- **実測報告**(送付2枚): 幾何角差は両垂直ペアとも90.00°だが、描画写像が260×200(x=260倍・y=200倍)の**非等方**で描画角差=約78°/102°(row3_t2: オ–ケ 102.1°/ウ–エ 78.0°、row7_t2: 同型)。viewBox 296×236=非正方形。**r1〜r5の全プレビューが同条件**(平行は保存されるため平行ペアは無事・垂直のみ歪む)。
- **r6実装**: ④描画を240×240の等スケールへ(viewBox正方形=角度保存)。①横断線角度帯[40,60](型A/B共通) ②交差型垂直ペア=交点が両線分とも両端から≥0.25(lsValidate perp_cross_offcenter・全density) ③非直角交差の角度帯[40,60](cross_band)。型Bは相棒T2がTの帯内部分で十字に交差し平行線の一方のみを[40,50]で横切る構成へ再設計(帯外交差は②と両立不能)。
- **関門**: 等スケール(viewBox縦横比=1・width=height・描画線分角度=幾何角度±0.05°を全600構成)+交点中央の独立再計算+角度帯[40,60]。600構成GREEN(A150/B150・7s)・**全38関門GREEN・golden 3学年不変**(合成/描画はJS層)。corr-0036登録・pairs検証OK。
- 再出力5枚: row3/row7(型A・seed22/36)・row3_t2/row7_t2(型B・seed23/37)・row0(low・等スケール化のため参考)→まるこ再目視待ち。

### 2026-09-04 corr-0036横展開: 角度依存kindの「描画角=幾何角」一括再計測(まるこ指示)→歪みなし・関門39常設
- **結果**: 描画層(layoutToSvg)を通る全kindで再計測——角度v5(tri_angle/tri_angle_iso/quad_angle: 多角形内角 vs a1/a2/apex)・angle_figure全subkind(parallel_lines=g04 heikou+jhs c12: 平行角差/横断角 vs al1・angle_around_point: 射線間隔 vs v・polygon/congruent_pair: 内角 vs v)・composite_area(輪郭全辺=0°/90°)・prism(rect)/cuboid(正面矩形の直角・斜辺の平行)・line_set(描画角 vs 幾何角)。**最大偏差≤0.012°(座標2桁丸め由来)=歪みなし**。line_setだけが正規化座標→非等方px写像を独自に持っていた(他kindはpx直計算)。
- **viewport**: 全バンク図で preserveAspectRatio=none/非一様scaleは0。width/heightはviewBoxの生値ceil(≤1px差・meetで一様吸収=角度不変)。angle_figureのみ厳密一致(matchViewportAspect)——全kindへの厳密化は出力バイト変更を伴うため未実施(要望あれば別便)。
- **関門39 tests/figure_isoscale_scan.js**: 上記(A)viewport整合+(B)描画角再計測を全バンク図×seed12で常設(±0.05°)。golden不変(検査のみ)。

### 2026-09-04 line_set r6 再目視OK(まるこ)——型A/Bクローズ
- 5枚(row3/row7=型A・row3_t2/row7_t2=型B・row0=low)目視合格。e-2(配線+第2テンプレート+r6)は全クローズ。次=e-9 kaisetsu_template独立便(仕様書着弾待ち)。

### 2026-09-04 e-9 kaisetsu_template(生徒向け解説の実行時レンダ)——独立便・単独コミット
- **データ側**: パターン新フィールド`kaisetsu`(文字列)。JS makeProblem.kaisetsu / Python make_kaisetsu が sentence_templates と同一リゾルバ(formatTemplate / str.format)で解決・computed文字列も参照可。無いパターンはnull(pedagogyフォールバック禁止)。Python golden出力は kaisetsu ありのパターンのみ「解説:」行を追加(無いパターンはバイト不変を照合済)。
- **表示側(設計判断)**: 生成quiz HTMLは手書きキャンバス提出=自動採点なし(正誤は教師採点後)。よって「採点直後の正誤表示の直下」=**result_view.html(採点結果ページ)**に解説ブロックを実装(正解・不正解とも自動展開・「とじる/ひらく」・既定=開・本文と同フォント/行間・reading_engineでルビ/かな)。搬送: pandora_main(問題JSONに`kaisetsu`同梱+プロンプト2箇所に省略禁止)→quizテンプレート2種のhandleSubmit(`kaisetsu:q.kaisetsu||null`)→submission_data.problems[i].kaisetsu→result_view。**国内テンプレの基準md5を更新**(4cbebc7f→47800226・kaisetsu搬送1行=意図的変更)。
- **初期投入(retrofit)31**: P5-3以降のpedagogy(Fable本文)を逐語移送+slot戻し10文(tsukibetsu/tokuten/kankyaku/comp_lshape/comp_hole/tsurimushi/kanbin/sansu/kawari_dai/heikou_kaku)。comp_lshape/holeへcomputed S1/S2(中間の積)を追加(本文・答え不変)。e-2の2件は設計ノート(Code起草)を接頭辞除去+です調でそのまま投入=Fable差し替え待ち。
- **関門**: kaisetsu_resolve.js新設(関門40: 解決/未解決{}ゼロ・JS=Python 930標本・retrofit完全性・backfill在庫計数)・furigana_coverageに`kaisetsu`包含(残存0)。furiganaパッチ21語(線/急/打/引/先/見/手前/迷/変/例/二次元/両方/決/総数/考/減/注目/側/幅/基準/挙)=3コピー同期・registered 493→517(重複2=折れ線/実線は登録済)。**全40関門GREEN**。
- **golden md5: g04 b3f03491 → 9d909fc0**(解説93行の追加のみ・他行バイト不変)・g05/g06不変。**解説backfill在庫=531パターン**(kaisetsu無し: g01 46/g02 49/g03 57/g04 53/g05 76/g06 83/jhs 187)。
- 目視素材: e9_shot_correct.png / e9_shot_incorrect.png(result_viewをモックデータで描画・海外モード=ルビ)→まるこ目視待ち。

### 2026-09-04 e-9 受理・修正1件(解説位置)+e-2本文差し替え(Fable本文)
- まるこ受理・改変5件承認。**位置修正**: 問題文→生徒の答え→正誤バッジ→解説→先生のコメント の順へ(バッジをヘッダから答えの直後の行へ移動・解説はその直下)。
- e-2の2件(chokusen_kumi/chohokei_hen)をFable本文で差し替え(逐語・{base}=既存規則で{e1})。**golden g04 9d909fc0 → faa09237**(解説2行の差し替えのみ)。全40関門GREEN。スクショ2枚を同名再出力→まるこ再目視待ち。

### 2026-09-04 e-9目視差し戻し2件(表示規則)——正答率帯+ひらがな記号「」規則(D12)+関門41
- **正答率メッセージ帯**: 100=「🌟 素晴らしい！完璧だね！」(新設)／90〜99=「🌟 素晴らしい！ほぼ完璧だね！」／70〜89=「😊 よくできました！」／50〜69=「💪 もう少し復習してみよう」／<50=「📚 一緒に復習しよう！」(他帯は現状維持)。
- **D12 ひらがな記号の「」規則**(bank_directives追記): 角や点のひらがな1字ラベルは本文・正解表示・解説の全箇所で「」囲み(国内・海外共通・図中ラベル対象外・カタカナ記号は現状維持)。**全バンク走査→5パターン一括修正**: g04_angle_sum_01(本文)・g04_heikou_kaku_01(本文・答え・解説)・g05_tri_angle_01/g05_tri_iso_angle_01/g05_quad_angle_01(本文)。
- **関門41 hiragana_label_brackets.js**: 本文/答え/kaisetsuの表示文字列で「未囲みラベル+(角|点|直線)/の(角|点|直線)」(直前が語の一部でない/助詞の)・「未囲みラベル+と+ラベル/度/区切り」(図ラベル所持パターン)の出現ゼロ。契約8件(旧様式検出4・囲み済み/非ラベル非検出4)・11240標本。
- **golden md5: g04 faa09237→b7a48203・g05 d2c262c0→5f6ee326(本文変更分のみ)・g06不変。図golden(figure_params 562件)不変を照合**。corr-0037登録・pairs検証OK。**全41関門GREEN**。スクショ2枚(正解時100%/不正解時)再出力→まるこ目視待ち。

### 2026-09-04 D10 表記規則層(共通)への昇格——ひらがな記号「」規則+reading_engine前処理+全経路接続(関門41拡張・関門42新設)
- **D10_表記規則.md新設**(handoff_jhs・共通表記規則層の恒久記載。リポジトリにD10表記規則文書は存在しなかったため新規作成)。正典実装=`pattern_bank/hyoki_rules.js`(+Python同等 `hyoki_rules.py`)。
- **reading_engine前処理**: 「X」(1字記号: ひらがな/カタカナ/英字)を読み対象外=原文のまま通す(3コピー同期: handoff/assets_global/pg-engine)。固定ベクター+4(51件)。
- **接続先**: ①算数・数学バンク全学年(関門41 hiragana_label_brackets・悉皆) ②国語教材静的JSON(japanese_handoff+samples・同関門41) ③homeworkビルダー(jio課題)=homework/*.json 存在時に同関門41で静的走査+`hyoki_rules.py` CLI(build.pyは未追跡=まるこ側で1行接続) ④実行時AI生成4経路=pandora_main(checkConsistency・警告)/Japanese_question_generator(verifyNotes)/Japanese_story_generator・pandora_global_generator(checkFacts結果に通知)へインライン接続。**関門42 hyoki_rules_drift**: 4経路のインライン==正典・挙動一致・py LABELS一致。
- 全42関門GREEN・run_acceptance JS前処理OK・golden不変(g04 b7a48203/g05 5f6ee326/g06 b83b53f0)。

### 2026-09-05 e-9クローズ(まるこ目視OK・713472d系)+解説backfill棚卸し(g04/g03)+対称第1便棚卸し先出し
- e-9 kaisetsu_template=クローズ。**解説backfill**はg04→g03の順: `kaisetsu_backfill_g04.md`(53パターン)・`kaisetsu_backfill_g03.md`(57)をFable向けに書き出し(1パターン=id・単元・本文テンプレ{slot}・答え式・computed・density/diff(バンク欄なし)・図kind)。
- 対称第1便の棚卸し先出しを `対称第1便_棚卸し先出し.md` に固定(94行=figure51/shapes22/grid18/なし3・設問型8分類・sym_polygon実装範囲・提案順)。設計書(Fable)待ち。
