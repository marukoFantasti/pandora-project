// ============================================================
// Pandora パターンバンク ジェネレータ（JS移植版）
// generate_poc_v06.py の1:1移植。挙動を変えないこと。
// ブラウザ<script>読み込みとNode.js(require)の両方で動作する。
// ============================================================
(function (root) {
  'use strict';

  // ---- 学年配当漢字。generate_poc_v07.py + kyoiku_kanji_g1to3.json(MEXT2017)と同一 ----
  // G01/G02 は generate_poc_v06/07 と同一。G03 は kyoiku_kanji_g1to3.json の g03(200字)。
  var G01 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
  var G02 = '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';
  var G03 = '丁世両主乗予事仕他代住使係倍全具写列助勉動勝化区医去反取受号向君味命和品員商問坂央始委守安定実客宮宿寒対局屋岸島州帳平幸度庫庭式役待急息悪悲想意感所打投拾持指放整旅族昔昭暑暗曲有服期板柱根植業様横橋次歯死氷決油波注泳洋流消深温港湖湯漢炭物球由申界畑病発登皮皿相県真着短研礼神祭福秒究章童笛第筆等箱級終緑練羊美習者育苦荷落葉薬血表詩調談豆負起路身転軽農返追送速進遊運部都配酒重鉄銀開院陽階集面題飲館駅鼻';
  var G04 = '愛案以衣位茨印英栄媛塩岡億加果貨課芽賀改械害街各覚潟完官管関観願岐希季旗器機議求泣給挙漁共協鏡競極熊訓軍郡群径景芸欠結建健験固功好香候康佐差菜最埼材崎昨札刷察参産散残氏司試児治滋辞鹿失借種周祝順初松笑唱焼照城縄臣信井成省清静席積折節説浅戦選然争倉巣束側続卒孫帯隊達単置仲沖兆低底的典伝徒努灯働特徳栃奈梨熱念敗梅博阪飯飛必票標不夫付府阜富副兵別辺変便包法望牧末満未民無約勇要養浴利陸良料量輪類令冷例連老労録';
  // G05: kyoiku_kanji_g1to5.json の g05(193字, MEXT2017)。data/kyoiku_kanji.json['5']と一致。
  var G05 = '圧囲移因永営衛易益液演応往桜可仮価河過快解格確額刊幹慣眼紀基寄規喜技義逆久旧救居許境均禁句型経潔件険検限現減故個護効厚耕航鉱構興講告混査再災妻採際在財罪殺雑酸賛士支史志枝師資飼示似識質舎謝授修述術準序招証象賞条状常情織職制性政勢精製税責績接設絶祖素総造像増則測属率損貸態団断築貯張停提程適統堂銅導得毒独任燃能破犯判版比肥非費備評貧布婦武復複仏粉編弁保墓報豊防貿暴脈務夢迷綿輸余容略留領歴';
  // G06: kyoiku_kanji_g1to6.json の g06(191字, MEXT2017)。data/kyoiku_kanji.json['6']と集合一致（順序は出典差・照合は集合）。
  var G06 = '胃異遺域宇映延沿恩我灰拡革閣割株干巻看簡危机貴揮疑吸供胸郷勤筋系敬警劇激穴券絹権憲源厳己呼誤后孝皇紅降鋼刻穀骨困砂座済裁策冊蚕至私姿視詞誌磁射捨尺若樹収宗就衆従縦縮熟純処署諸除承将傷障蒸針仁垂推寸盛聖誠舌宣専泉洗染銭善奏窓創装層操蔵臓存尊退宅担探誕段暖値宙忠著庁頂腸潮賃痛敵展討党糖届難乳認納脳派拝背肺俳班晩否批秘俵腹奮並陛閉片補暮宝訪亡忘棒枚幕密盟模訳郵優預幼欲翌乱卵覧裏律臨朗論';
  // JHS: kyoiku_kanji_g1to6_jhs.json の jhs(1110字=常用2136−教育1026)。教育漢字と重複ゼロ。
  // 常用漢字ベース(方針A)。allowed_grades に "jhs" を含むjhsパターンのみ参照＝既存6学年は非干渉。
  // 文字集合は Python 側 kanji file の jhs キーと一致（charsetパリティで照合）。
  var JHS = '丈与且丘丙串丹丼乏乙乞乾亀了互亜享亭介仙仰企伎伏伐伯伴伸伺但佳併侍依侮侯侵侶促俊俗俸俺倒倣倫倹偉偏偵偶偽傍傑傘催傲債傾僅僕僚僧儀儒償充克免兼冒冗冠冥冶凄准凍凝凡凶凸凹刃刈刑到刹刺削剖剛剣剤剥剰劣励劾勃勅勘募勧勲勾匂匠匹匿升卑卓占即却卸厄厘又及双叔叙叫召叱吉吏吐吟含吹呂呈呉呪咲咽哀哲哺唄唆唇唐唯唾啓喉喚喝喩喪喫嗅嗣嘆嘱嘲噴嚇囚圏坊坑坪垣埋執培堀堅堆堕堤堪塀塁塊塑塔塗塚塞塡塾墜墨墳墾壁壇壊壌壮壱奇奉契奔奥奨奪奴如妃妄妊妖妙妥妨妬姓姫姻威娘娠娯婆婚婿媒嫁嫉嫌嫡嬢孔孤宛宜宰宴宵寂寛寝寡寧審寮寿封尉尋尚尻尼尽尾尿屈履屯岬岳峠峡峰崇崖崩嵐巡巧巨巾帆帝帥帽幅幣幻幽幾床庶庸廃廉廊廷弄弊弐弔弥弦弧弾彙彩彫彰影彼征徐御循微徴徹忌忍忙怒怖怠怨怪恋恐恒恣恥恨恭恵悔悟悠患悦悩悼惑惜惧惨惰愁愉愚慄慈慌慎慕慢慨慮慰慶憂憎憤憧憩憬憶憾懇懐懲懸戒戚戯戴戻房扇扉払扱扶抄把抑抗抜択披抱抵抹押抽拉拍拐拒拓拘拙拠括拭拳拶拷挑挟挨挫振挿捉捕捗捜据捻掃掌排掘掛控措掲描揚換握援揺搬搭携搾摂摘摩摯撃撤撮撲擁擦擬攻敏敢敷斉斎斑斗斜斤斥斬施旋既旦旨旬旺昆昇昧是普晶暁暇暦暫曇曖更曹曽替朕朱朴朽杉杯析枕枠枢枯架柄某柔柳柵柿栓核栽桁桃桑桟梗棄棋棚棟棺椅椎楷楼概槽欄欧欺款歓歳殉殊殖殴殻殿毀氾汁汎汗汚江汰沃沈沙没沢沸沼況泊泌泡泥泰洞津洪浄浜浦浪浮浸涙涯涼淑淡淫添渇渉渋渓渡渦湧湾湿溝溶溺滅滑滝滞滴漂漆漏漠漫漬漸潜潤潰澄濁濃濫濯瀬炉炊炎為烈焦煎煙煩煮燥爆爪爵爽牙牲犠狂狙狩狭猛猟猫献猶猿獄獣獲玄玩珍珠琴瑠璃璧環璽瓦瓶甘甚甲畏畔畜畝畳畿疎疫疲疾症痕痘痢痩痴瘍療癒癖皆盆盗監盤盲盾眉眠眺睡督睦瞬瞭瞳矛矯砕砲硝硫硬碁碑磨礁礎祈祉祥禅禍秀租秩称稚稲稼稽稿穂穏穫突窃窒窟窮窯竜端符筒箇箋箸範篤簿籍籠粋粒粗粘粛粧糧糾紋紛紡索紫累紳紹紺絞絡継維綱網綻緊緒締緩緯緻縁縛縫繁繊繕繭繰缶罰罵罷羅羞羨翁翻翼耐耗聴肌肖肘肝股肢肩肪肯胆胎胞胴脂脅脇脊脚脱腎腐腕腫腰腺膚膜膝膨膳臆臭致臼舗舞舟般舶舷艇艦艶芋芝芯芳苗苛茂茎荒荘菊菌菓華萎葛葬蓄蓋蔑蔽薄薦薪薫藍藤藩藻虎虐虚虜虞虹蚊蛇蛍蛮蜂蜜融衝衡衰衷袋袖被裂裕裸裾褐褒襟襲覆覇触訂訃託訟訴診詐詔詠詣詮詰該詳誇誉誓誘誰請諦諧諭諮諾謀謁謄謎謙謡謹譜譲豚豪貌貞貢販貪貫貼賂賄賊賓賜賠賢賦賭購贈赦赴超越趣距跡跳践踊踏踪蹴躍軌軒軟軸較載輝輩轄辛辣辱込迅迎迫迭逃透逐逓途逝逮逸遂遅遇遍違遜遡遣遭遮遵遷避還那邦邪邸郊郎郭酌酎酔酢酪酬酵酷醒醜醸采釈釜釣鈍鈴鉛鉢銃銘鋭鋳錠錦錬錮錯鍋鍛鍵鎌鎖鎮鐘鑑閑閥閲闇闘阻附陣陥陪陰陳陵陶隅隆随隔隙隠隣隷隻雄雅雇雌離雰零雷需震霊霜霧露靴韓韻響頃項須頑頒頓頰頻頼顎顕顧飢飽飾餅餌餓駄駆駐駒騎騒騰驚骸髄髪鬱鬼魂魅魔鮮鯨鶏鶴麓麗麺麻黙鼓齢';
  var KANJI_BY_GRADE = { g01: G01, g02: G02, g03: G03, g04: G04, g05: G05, g06: G06, jhs: JHS };
  function buildKanjiSet(str) { var s = {}; str.split('').forEach(function (c) { s[c] = true; }); return s; }
  // kanji_policy.allowed_grades が無いパターンの既定は g01|g02（v0.7 DEFAULT_ALLOWED と同一）。
  var DEFAULT_ALLOWED = buildKanjiSet(G01 + G02);
  function allowedKanji(pattern) {
    var kp = pattern.kanji_policy || {};
    var grades = kp.allowed_grades;
    var s = (!grades || !grades.length) ? Object.assign({}, DEFAULT_ALLOWED)
      : buildKanjiSet(grades.map(function (g) { return KANJI_BY_GRADE[g] || ''; }).join(''));
    // allowed_extra(v0.8): 配当外だが当該学年の教科書で用いる専門用語の字を個別許可（例:捨/仮）。
    (kp.allowed_extra || '').split('').forEach(function (c) { s[c] = true; });
    return s;
  }

  // ---- 単位系と整形（0の下位単位は省略） ----
  function fmtCompound(base, factor, bigU, smallU) {
    var big = Math.floor(base / factor), small = base % factor;
    if (big && small) return '' + big + bigU + small + smallU;
    if (big) return '' + big + bigU;
    return '' + small + smallU;
  }
  function fmtClock(base) {
    var ampm = base < 720 ? '午前' : '午後';
    var h = Math.floor(base / 60) % 12;
    if (h === 0) h = 12;
    var m = base % 60;
    return m ? (ampm + h + '時' + m + '分') : (ampm + h + '時');
  }
  // ---- v0.9 追加ヘルパ（整数演算・Euclid反復。generate_poc_v09.py と1:1移植。
  //      math.gcd不使用＝JS実装と同一手順で言語間挙動差なし。等価性は
  //      helpers_test_vectors.json のシード非依存ベクターで両実装照合。
  //      既存3学年バンクは未参照＝非干渉）。 ----
  function gcdInt(a, b) {
    a = Math.trunc(a); b = Math.trunc(b);
    while (b !== 0) { var t = a % b; a = b; b = t; }
    return a;
  }
  function lcmInt(a, b) {
    a = Math.trunc(a); b = Math.trunc(b);
    return Math.trunc(a / gcdInt(a, b)) * b;   // 先に割る（Python実装と同一順序）
  }
  function reduceNum(num, den) { return Math.trunc(num / gcdInt(num, den)); }
  function reduceDen(num, den) { return Math.trunc(den / gcdInt(num, den)); }
  // 固定小数点整形。末尾ゼロ省略: (1200,100)→"12", (1230,100)→"12.3"。b>=0前提（千分率・小数）。
  function fmtDec(b, scale) {
    b = Math.trunc(b); scale = Math.trunc(scale);
    var whole = Math.trunc(b / scale), frac = b % scale;
    var width = String(scale).length - 1;
    var s = String(frac).padStart(width, '0').replace(/0+$/, '');
    return s ? (whole + '.' + s) : String(whole);
  }
  // 相対度数 固定2桁（B層c09）。スケール100整数→末尾ゼロ保持: 30→"0.30", 100→"1.00", 44→"0.44"。
  // generate_poc_v10.py fmt_dec2fix と1:1。dec2(末尾ゼロ省略)と異なり常に小数第2位まで。非負前提。
  function fmtDec2fix(b) {
    b = Math.trunc(b);
    var whole = Math.trunc(b / 100), frac = b % 100;
    return whole + '.' + String(frac).padStart(2, '0');
  }
  // 千分率整数→百分率表記。1150→"115%", 25→"2.5%", 5→"0.5%"。
  function fmtPercentPm(p) {
    p = Math.trunc(p);
    return p % 10 === 0 ? (Math.trunc(p / 10) + '%') : (Math.trunc(p / 10) + '.' + (p % 10) + '%');
  }
  // 千分率整数→歩合表記。356→"3割5分6厘"。0の位は省略: 350→"3割5分", 300→"3割"。
  function fmtBuaiPm(p) {
    p = Math.trunc(p);
    var wari = Math.trunc(p / 100), rest = p % 100;
    var bu = Math.trunc(rest / 10), rin = rest % 10;
    var out = '';
    if (wari) out += wari + '割';
    if (bu) out += bu + '分';
    if (rin) out += rin + '厘';
    return out || '0';
  }

  var FORMATTERS = {
    cm_mm: function (b) { return fmtCompound(b, 10, 'cm', 'mm'); },
    m_cm: function (b) { return fmtCompound(b, 100, 'm', 'cm'); },
    L_dL: function (b) { return fmtCompound(b, 10, 'L', 'dL'); },
    h_min: function (b) { return fmtCompound(b, 60, '時間', '分'); },
    clock: fmtClock,
    raw_min: function (b) { return String(b); },
    // v0.7 追加（generate_poc_v07.py と同一）
    km_m: function (b) { return fmtCompound(b, 1000, 'km', 'm'); },
    kg_g: function (b) { return fmtCompound(b, 1000, 'kg', 'g'); },
    L_mL: function (b) { return fmtCompound(b, 1000, 'L', 'mL'); },
    m_cm100: function (b) { return fmtCompound(b, 100, 'm', 'cm'); },
    dec1: function (b) {
      var i = Math.floor(b / 10), f = b % 10;
      return f ? ('' + i + '.' + f) : ('' + i);
    },
    // v0.9 追加（既存3学年は未参照＝非干渉）
    dec2: function (b) { return fmtDec(b, 100); },
    dec3: function (b) { return fmtDec(b, 1000); },
    percent_pm: function (p) { return fmtPercentPm(p); },
    buai_pm: function (p) { return fmtBuaiPm(p); },
    // v1.0 追加（jhs符号付き整数。既存6学年は未参照＝非干渉。fmtSigned は関数宣言で巻き上げ済み）
    signed: function (b) { return fmtSigned(b); },
    // B層c09追加（相対度数 固定2桁・末尾ゼロ保持）
    dec2fix: function (b) { return fmtDec2fix(b); }
  };

  // 同分母分数の整形（generate_poc_v07.py fmt_fraction と同一）。num==den→"1"、num==0→"0"。
  function fmtFraction(num, den) {
    if (num === 0) return '0';
    if (num === den) return '1';
    return '' + num + '/' + den;
  }

  // 帯分数表記（generate_poc_v08.py fmt_mixed と同一）。num==0→"0"、割り切れ→整数、
  // whole==0→真分数、他→"aとb/c"（g03分数表記と一貫）。
  function fmtMixed(num, den) {
    num = Math.trunc(num); den = Math.trunc(den);
    if (num === 0) return '0';
    var whole = Math.trunc(num / den), rem = num % den;
    if (rem === 0) return '' + whole;
    if (whole === 0) return '' + rem + '/' + den;
    return '' + whole + 'と' + rem + '/' + den;
  }

  // ---- v1.0 追加ヘルパ（jhs中学数学・符号/係数/平方根の整形。generate_poc_v10.py と
  //      1:1移植。整数演算+文字列結合のみ・math不使用＝言語間挙動差なし。マイナスは
  //      U+2212(−)、連結の＋は U+FF0B。既存6学年バンクは未参照＝非干渉。等価性は
  //      helpers_test_vectors.json のシード非依存ベクターで両実装照合）。 ----
  var MINUS = '−';   // U+2212
  var PLUSJ = '＋';   // U+FF0B
  // 符号付き整数表示。n≥0→str(n)、n<0→"−"+str(-n)。
  function fmtSigned(n) {
    n = Math.trunc(n);
    return n >= 0 ? String(n) : MINUS + String(-n);
  }
  // 先頭項の係数: 1→""、−1→"−"、他→fmtSigned(n)。（例: fmtCoef(-1)="−"）
  function fmtCoef(n) {
    n = Math.trunc(n);
    if (n === 1) return '';
    if (n === -1) return MINUS;
    return fmtSigned(n);
  }
  // 連結項の係数: 1→"＋"、−1→"−"、n>1→"＋"+n、n<−1→"−"+|n|。fmtCoefj(0)は未定義扱い
  // （"＋0"を返さない。変数項が消えるケースはバンク側で制約分割して回避＝仕様書§3）。
  function fmtCoefj(n) {
    n = Math.trunc(n);
    if (n === 1) return PLUSJ;
    if (n === -1) return MINUS;
    if (n > 1) return PLUSJ + String(n);
    if (n < -1) return MINUS + String(-n);
    return '';   // n===0: 未定義扱い（バンクは制約分割で到達しない）
  }
  // 連結定数項: 0→""、n>0→"＋"+n、n<0→"−"+|n|。（例: fmtTermj(-49)="−49"）
  function fmtTermj(n) {
    n = Math.trunc(n);
    if (n === 0) return '';
    return n > 0 ? PLUSJ + String(n) : MINUS + String(-n);
  }
  // 符号のみ: n<0→"−"、それ以外→""（負分数の符号前置用）。
  function sgnStr(n) { return Math.trunc(n) < 0 ? MINUS : ''; }
  // |n|=k²·m（m平方因数なし）へ分解し [k, m] を返す（d=2から d·d≦残り の反復）。
  function sqrtDecomp(n) {
    var m = Math.abs(Math.trunc(n)), k = 1, d = 2;
    while (d * d <= m) {
      while (m % (d * d) === 0) { m = Math.trunc(m / (d * d)); k *= d; }
      d += 1;
    }
    return [k, m];
  }
  function sqrtCoef(n) { return sqrtDecomp(n)[0]; }   // √n の係数 k（例: sqrtCoef(48)=4）
  function sqrtRad(n) { return sqrtDecomp(n)[1]; }    // √n の根号内 m（例: sqrtRad(48)=3）
  // 符号込み√表示: 0→"0"、|n|=k²m で m==1→fmtSigned(±k)、k==1→[−]"√m"、他→[−]"k√m"。
  function fmtSqrt(n) {
    n = Math.trunc(n);
    if (n === 0) return '0';
    var neg = n < 0, dec = sqrtDecomp(n), k = dec[0], m = dec[1];
    if (m === 1) return fmtSigned(neg ? -k : k);
    var sign = neg ? MINUS : '';
    return k === 1 ? (sign + '√' + m) : (sign + k + '√' + m);
  }
  // π係数の整形（pi_coef機構・sqrt族の横展開）。係数のみ整数演算・π記号は表示層（ゼロ浮動小数）。
  // 整数係数: 0→"0"、1→"π"、−1→"−π"、他→fmtSigned(c)+"π"。（36→"36π"）
  function fmtPi(c) {
    c = Math.trunc(c);
    if (c === 0) return '0';
    if (c === 1) return 'π';
    if (c === -1) return MINUS + 'π';
    return fmtSigned(c) + 'π';
  }
  // 分数係数×π（円錐1/3・球4/3対応）: (num/den)を約分し den==1→fmtPi(num)、他→"[−](p/q)π"。
  function fmtPiFrac(num, den) {
    num = Math.trunc(num); den = Math.trunc(den);
    if (den < 0) { num = -num; den = -den; }
    var g = gcdInt(Math.abs(num), den) || 1;
    num = Math.trunc(num / g); den = Math.trunc(den / g);
    if (num === 0) return '0';
    if (den === 1) return fmtPi(num);
    return (num < 0 ? MINUS : '') + '(' + Math.abs(num) + '/' + den + ')π';
  }
  // スロット range=[lo,hi](step) の到達可能値ドメインを "件数:先頭:末尾" で返す
  // （負域含む Python randrange とのマッピング一致照合用。randRange と同一: n=floor((hi-lo)/step)+1）。
  function sampleDomain(lo, hi, step) {
    lo = Math.trunc(lo); hi = Math.trunc(hi); step = Math.trunc(step || 1);
    var n = Math.floor((hi - lo) / step) + 1;
    var last = lo + step * (n - 1);
    return n + ':' + lo + ':' + last;
  }

  // がい数（v0.8）: 整数演算のみ（浮動小数点round禁止・言語間挙動差なし）。
  function roundHalfUp(n, place) {
    n = Math.trunc(n); place = Math.trunc(place);
    var q = Math.floor(n / place), r = n - q * place;
    if (r * 2 >= place) q += 1;
    return q * place;
  }
  function roundRangeLower(x, place) { return Math.trunc(x) - Math.trunc(Math.trunc(place) / 2); }
  function roundRangeUpperExcl(x, place) { return Math.trunc(x) + Math.trunc(Math.trunc(place) / 2); }

  function kanjiCheck(text, allowed) {
    var bad = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var code = ch.codePointAt(0);
      if (code >= 0x4e00 && code <= 0x9fff && !allowed[ch]) bad.push(ch);
    }
    return bad;
  }

  // ---- 乱数ユーティリティ（Pythonのrandom.choice/sample/randrange相当） ----
  function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randSample(arr, k) {
    var pool = arr.slice(), out = [];
    for (var i = 0; i < k && pool.length; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  }
  function randRange(lo, hi, step) {
    step = step || 1;
    var n = Math.floor((hi - lo) / step) + 1;
    return lo + step * Math.floor(Math.random() * n);
  }

  // ---- 安全な式評価（abs/max/minのみ許可のホワイトリスト） ----
  // バンクJSONの制約式（value_constraints.expr）・computed_slots式（formula）・
  // answer_formulaはPython構文が正であり、JS側（evalExpr）が読み込み時に翻訳する。
  // 対応構文は以下のみ:
  //   - and / or / not（単語境界 \b 付きで置換。識別子内の部分一致（例: grand
  //     内のand）は変換対象にしない）→ JSの && / || / !
  //   - 条件式 "A if C else B"（求差パターンのwinner導出等で使用）→ JSの "C ? A : B"
  //   - abs / max / min（evalExprの引数としてホワイトリスト許可）
  // これ以外のPython構文（**, //, リスト内包表記等）をバンクJSONに書いてはならない。
  // 未対応構文が混入した場合、JSの構文エラーとして即座に失敗する（サイレントな
  // 誤動作にはならない）。
  // Python の * / // % は同順位・左結合。素朴な atom-pair 置換だと "A * B // C" を
  // "A * Math.floor(B/C)" と誤訳する（Pythonは "(A*B)//C"）。そこで括弧を内側から畳み込み、
  // 各乗除連鎖を左結合で fold して等価変換する:
  //   // → Math.floor((左)/(右)) / % → pymod((左),(右)) / *・/ は素の JS 演算（左結合同一）
  // 除数は常に正（10/100/1000/60/n>0）を前提。pymod は被除数が負でも Python 準拠（(q1-q2)%10等）。
  // 1つの乗除連鎖 atom(op atom)* を左から fold（op ∈ { * / // % }）。// % が無ければ素通し。
  function foldMulChain(s) {
    var atom = '(?:\\w+\\x01\\d+\\x01|\\x01\\d+\\x01|[\\w.]+)';   // 関数呼出(名+token)/括弧(token)/識別子・数値
    var mulop = '(?:\\/\\/|[*\\/%])';                             // // を / より先に
    var chain = new RegExp(atom + '(?:\\s*' + mulop + '\\s*' + atom + ')*', 'g');
    var tokRe = new RegExp(atom + '|\\/\\/|[*\\/%]', 'g');
    return s.replace(chain, function (m) {
      if (m.indexOf('//') < 0 && m.indexOf('%') < 0) return m;   // // も % も無ければ変換不要
      var t = m.match(tokRe), acc = t[0];
      for (var i = 1; i < t.length; i += 2) {
        var op = t[i], r = t[i + 1];
        if (op === '//') acc = 'Math.floor((' + acc + ')/(' + r + '))';
        else if (op === '%') acc = 'pymod((' + acc + '),(' + r + '))';
        else acc = acc + op + r;   // * or /（左結合はJSと同一）
      }
      return acc;
    });
  }
  // 括弧を最内から token 退避 → 中身を fold → 上位を fold → token 復元（入れ子対応）。
  // JSでは // が行コメントになるため new Function 前に必ず潰す。
  function translateArith(expr) {
    var stash = [], paren = /\([^()]*\)/, m;
    while ((m = paren.exec(expr))) {
      var inner = foldMulChain(m[0].slice(1, -1));
      stash.push('(' + inner + ')');
      expr = expr.slice(0, m.index) + '\x01' + (stash.length - 1) + '\x01' + expr.slice(m.index + m[0].length);
    }
    expr = foldMulChain(expr);
    var changed = true;
    while (changed) {
      changed = false;
      expr = expr.replace(/\x01(\d+)\x01/g, function (_, i) { changed = true; return stash[+i]; });
    }
    return expr;
  }

  // Python の連鎖比較 a <= b <= c を (a <= b) && (b <= c) に展開（トップレベルの比較演算子が
  // 2個以上のときのみ）。括弧内（深さ>0）の比較は対象外。and/or/not 変換前に実行する。
  function expandChainedComparison(expr) {
    // トップレベル（深さ0）に and/or があれば、比較演算子が複数あっても連鎖比較ではなく
    // 論理結合（例: "(q1%10)>0 and (q2%10)>0"）。この場合は展開しない（各比較はJSでそのまま可）。
    // Python の連鎖比較 "a<=b<=c" は比較演算子の間に論理演算子を挟まない、という性質を使う。
    var d = 0;
    for (var p = 0; p < expr.length; p++) {
      var c0 = expr[p];
      if (c0 === '(') d++;
      else if (c0 === ')') d--;
      else if (d === 0 && /[a-zA-Z_]/.test(c0)) {
        var word = expr.slice(p).match(/^[a-zA-Z_]\w*/)[0];
        if (word === 'and' || word === 'or') return expr;
        p += word.length - 1;
      }
    }
    var ops = [];  // {pos, len, op}
    var depth = 0;
    for (var i = 0; i < expr.length; i++) {
      var ch = expr[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0) {
        var two = expr.substr(i, 2);
        if (two === '<=' || two === '>=' || two === '==' || two === '!=') { ops.push({ pos: i, len: 2, op: two }); i++; }
        else if (ch === '<' || ch === '>') { ops.push({ pos: i, len: 1, op: ch }); }
      }
    }
    if (ops.length < 2) return expr;
    var operands = [];
    var start = 0;
    for (var j = 0; j < ops.length; j++) {
      operands.push(expr.slice(start, ops[j].pos).trim());
      start = ops[j].pos + ops[j].len;
    }
    operands.push(expr.slice(start).trim());
    var parts = [];
    for (var k = 0; k < ops.length; k++) {
      parts.push('(' + operands[k] + ' ' + ops[k].op + ' ' + operands[k + 1] + ')');
    }
    return parts.join(' && ');
  }

  function pyExprToJs(expr) {
    var out = expr.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/);
    if (out) expr = '(' + out[2] + ') ? (' + out[1] + ') : (' + out[3] + ')';
    expr = translateArith(expr);
    expr = expandChainedComparison(expr);
    return expr
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!');
  }
  // Python互換の剰余（除数>0で常に非負）。translateMod が生成する pymod の実体。
  function pymod(a, b) { return ((a % b) + b) % b; }
  function evalExpr(expr, env) {
    var keys = Object.keys(env);
    var vals = keys.map(function (k) { return env[k]; });
    var jsExpr = pyExprToJs(expr);
    // eslint-disable-next-line no-new-func
    // v0.9: SAFE に追加された gcd/lcm/reduce_num/reduce_den をホワイトリストに追加。
    // v1.0: 符号/係数/平方根ヘルパ(fmt_signed 等)を追加。value_constraints/computed_slots/
    // answer_formula から Python 名で参照される（jhs frac_add_01 の sgn_str、enum_01 の
    // fmt_signed が初出＝文字列を返す computed_slots）。pyExprToJs（構文翻訳器）は変更せず
    // 許可関数を増やすだけ（abs/max/min と同格）。既存バンクは未参照＝非干渉。
    var fn = new Function('abs', 'max', 'min', 'pymod', 'round_half_up', 'round_range_lower', 'round_range_upper_excl',
      'gcd', 'lcm', 'reduce_num', 'reduce_den',
      'fmt_signed', 'fmt_coef', 'fmt_coefj', 'fmt_termj', 'sgn_str', 'sqrt_coef', 'sqrt_rad', 'fmt_sqrt', 'fmt_pi', 'fmt_pi_frac', 'dec2fix',
      keys.join(','), 'return (' + jsExpr + ');');
    return fn.apply(null, [Math.abs, Math.max, Math.min, pymod, roundHalfUp, roundRangeLower, roundRangeUpperExcl,
      gcdInt, lcmInt, reduceNum, reduceDen,
      fmtSigned, fmtCoef, fmtCoefj, fmtTermj, sgnStr, sqrtCoef, sqrtRad, fmtSqrt, fmtPi, fmtPiFrac, fmtDec2fix].concat(vals));
  }

  // ---- スロット解決 ----
  function effectiveSlots(pattern, unitId) {
    var slots = {};
    Object.keys(pattern.slots || {}).forEach(function (k) {
      slots[k] = Object.assign({}, pattern.slots[k]);
    });
    var ov = ((pattern.unit_range_overrides || {})[unitId || ''] || {});
    Object.keys(ov).forEach(function (k) {
      var spec = ov[k];
      if (slots.hasOwnProperty(k) && spec && typeof spec === 'object' && !Array.isArray(spec)) {
        Object.assign(slots[k], spec);
      }
    });
    return slots;
  }

  function effectiveConstraints(pattern, unitId) {
    var ov = ((pattern.unit_range_overrides || {})[unitId || ''] || {});
    var repl = ov.constraints_replace || {};
    return (pattern.value_constraints || []).map(function (c) {
      return repl[c.rule] ? Object.assign({}, c, repl[c.rule]) : c;
    });
  }

  // unit_range_overrides[unitId].lexicon_filters があればそれを優先、
  // 無ければパターン直下のlexicon_filters、どちらも無ければ空オブジェクト。
  // （override側があるかどうかで丸ごと差し替え。深いマージはしない）
  function effectiveLexiconFilters(pattern, unitId) {
    var ov = ((pattern.unit_range_overrides || {})[unitId || ''] || {});
    return ov.lexicon_filters || pattern.lexicon_filters || {};
  }

  function filteredContainerSets(pattern, lex, unitId) {
    var sets = lex.container_sets;
    var f = effectiveLexiconFilters(pattern, unitId).container_sets || {};
    if (f.exclude_if) {
      var ex = f.exclude_if;
      sets = sets.filter(function (s) {
        return !Object.keys(ex).every(function (k) { return s[k] === ex[k]; });
      });
    }
    return sets;
  }

  function filteredObjectCounterPairs(pattern, lex, unitId) {
    var pairs = lex.object_counter_pairs;
    var f = effectiveLexiconFilters(pattern, unitId).object_counter_pairs || {};
    if (f.include_objects) {
      var inc = f.include_objects;
      pairs = pairs.filter(function (p) { return inc.indexOf(p.object) !== -1; });
    }
    return pairs;
  }

  function sampleSlotValue(spec) {
    if (spec.choices) return randChoice(spec.choices);
    var range = spec.base_range || spec.range;
    var step = spec.step || 1;
    return randRange(range[0], range[1], step);
  }

  // ---- 数値サンプリング（棄却法） ----
  function sampleNumeric(pattern, unitId, maxTries) {
    maxTries = maxTries || 3000;
    var slots = effectiveSlots(pattern, unitId);
    var numeric = {};
    Object.keys(slots).forEach(function (k) {
      if (slots[k].type === 'int' || slots[k].choice_int) numeric[k] = slots[k];
    });
    var quants = pattern.quantity_slots || {};
    var constraints = effectiveConstraints(pattern, unitId);
    for (var t = 0; t < maxTries; t++) {
      var env = {};
      Object.keys(numeric).forEach(function (k) { env[k] = sampleSlotValue(numeric[k]); });
      Object.keys(quants).forEach(function (k) { env[k] = sampleSlotValue(quants[k]); });
      var ok = constraints.every(function (c) { return evalExpr(c.expr, env); });
      if (ok) return env;
    }
    throw new Error(pattern.pattern_id + ' (unit=' + (unitId || '') + '): 制約充足不能（バンク設計エラー）');
  }

  // ---- 語彙スロット解決・派生スロット・答え・表示整形 ----
  function buildEnv(pattern, unitId, lex) {
    var env = Object.assign({}, sampleNumeric(pattern, unitId));
    var names = Object.keys(pattern.slots || {});

    // --- 汎用レキシコン束縛（generate_poc_v07.py build_env と同一）---
    // from形式: "set[j].field"(辞書) / "set[i][0]"(リストペア) / "set" / "set(distinct)"
    // 同一インデックス変数を共有するスロットは同じアイテムから取る。
    // attribute_pairs は dict形状のため list_groups では解決せず、下の attr_a/b 専用処理に迂回。
    var dictGroups = {}, listGroups = {}, simple = {}, distinct = [];
    Object.keys(pattern.slots || {}).forEach(function (name) {
      var f = (pattern.slots[name] || {}).from;
      if (!f) return;
      var m = f.match(/^(\w+)\[(\w)\]\.(\w+)$/);
      if (m) { (dictGroups[m[1] + ' ' + m[2]] = dictGroups[m[1] + ' ' + m[2]] || { set: m[1], fields: {} }).fields[name] = m[3]; return; }
      m = f.match(/^(\w+)\[(\w)\]\[(\d+)\]$/);
      if (m) {
        if (m[1] !== 'attribute_pairs') {
          (listGroups[m[1] + ' ' + m[2]] = listGroups[m[1] + ' ' + m[2]] || { set: m[1], fields: {} }).fields[name] = parseInt(m[3], 10);
        }
        return;
      }
      m = f.match(/^(\w+)\(distinct\)$/);
      if (m) { distinct.push([name, m[1]]); return; }
      simple[name] = f;
    });

    var objectBinding = null;  // attr整合で object を棄却・再抽選する場合に使う
    Object.keys(dictGroups).forEach(function (key) {
      var g = dictGroups[key];
      var item = (g.set === 'container_sets')
        ? randChoice(filteredContainerSets(pattern, lex, unitId))
        : randChoice(lex[g.set]);
      Object.keys(g.fields).forEach(function (slotName) {
        env[slotName] = item.hasOwnProperty(g.fields[slotName]) ? item[g.fields[slotName]] : '';
      });
      if (g.set === 'object_counter_pairs') objectBinding = g;
    });
    Object.keys(listGroups).forEach(function (key) {
      var g = listGroups[key];
      var item = randChoice(lex[g.set]);
      Object.keys(g.fields).forEach(function (slotName) { env[slotName] = item[g.fields[slotName]]; });
    });
    Object.keys(simple).forEach(function (slotName) { env[slotName] = randChoice(lex[simple[slotName]]); });
    distinct.forEach(function (pairSN) {
      var slotName = pairSN[0], setName = pairSN[1];
      var used = {};
      Object.keys(env).forEach(function (k) { if (typeof env[k] === 'string') used[env[k]] = true; });
      var pool = lex[setName].filter(function (x) { return !used[x]; });
      if (!pool.length) pool = lex[setName];
      env[slotName] = randChoice(pool);
    });
    // 文字列choicesスロット（型指定なし・from指定なし）
    Object.keys(pattern.slots || {}).forEach(function (name) {
      var spec = pattern.slots[name] || {};
      if (!env.hasOwnProperty(name) && spec.choices && spec.type !== 'int') env[name] = randChoice(spec.choices);
    });

    // --- g02互換の特殊ケース（fromで解決済みならスキップ）---
    if (names.indexOf('actor') !== -1 && !env.hasOwnProperty('actor')) {
      env.actor = randChoice(lex.actors);
    }
    if (names.indexOf('actor_c') !== -1 && !env.hasOwnProperty('actor_c')) {
      var three = randSample(lex.actors, 3);
      env.actor_a = three[0]; env.actor_b = three[1]; env.actor_c = three[2];
    } else if (names.indexOf('actor_a') !== -1 && !env.hasOwnProperty('actor_a')) {
      var pr = randChoice(lex.actor_pairs);
      env.actor_a = pr[0]; env.actor_b = pr[1];
    }
    if (names.indexOf('attr_a') !== -1 && !env.hasOwnProperty('attr_a')) {
      // attribute_pairs は dict形状 {"pair":[a,b],"type":...}。属性ペアの型フィルタ:
      //  (1) lexicon_filters.attribute_pairs.include_types があれば最優先（例:求差は色のみ）。
      //  (2) 無ければ選択済み object の attr_types に合致する型のみ（「大きいおり紙」回避）。
      //      合致ゼロなら object を棄却して再抽選。(3) どちらも無ければ全体から選ぶ。
      var lf = effectiveLexiconFilters(pattern, unitId);
      var inc = (lf.attribute_pairs || {}).include_types || null;
      var allowedTypesOf = function () {
        if (inc) return inc;
        if (env.object) {
          var ocp = lex.object_counter_pairs.filter(function (o) { return o.object === env.object; })[0];
          if (ocp && ocp.attr_types) return ocp.attr_types;
        }
        return null;
      };
      var poolOf = function (types) {
        return types ? lex.attribute_pairs.filter(function (ap) { return types.indexOf(ap.type) !== -1; }) : lex.attribute_pairs;
      };
      var types = allowedTypesOf();
      var apPool = poolOf(types);
      var tries = 0;
      while (!apPool.length && !inc && objectBinding && env.object && tries < 3000) {
        var it = randChoice(lex[objectBinding.set]);
        Object.keys(objectBinding.fields).forEach(function (slotName) {
          env[slotName] = it.hasOwnProperty(objectBinding.fields[slotName]) ? it[objectBinding.fields[slotName]] : '';
        });
        types = allowedTypesOf(); apPool = poolOf(types); tries++;
      }
      var ap = randChoice(apPool);
      env.attr_a = ap.pair[0]; env.attr_b = ap.pair[1];
    }
    if (names.indexOf('verb_use') !== -1 && !env.verb_use) env.verb_use = 'つかいました';

    // context_set: 文脈セットを1つ選び、format_fields をスロット値で整形して ctx_* に注入
    var cs = pattern.context_set;
    if (cs) {
      var ctx = randChoice(lex[cs.from]);
      var fmtFields = cs.format_fields || [];
      cs.fields.forEach(function (fname) {
        var v = ctx[fname];
        env['ctx_' + fname] = (fmtFields.indexOf(fname) !== -1) ? formatTemplate(v, env) : v;
      });
    }

    // 派生スロット（数値・文字列とも参照可）
    Object.keys(pattern.computed_slots || {}).forEach(function (name) {
      var cs = pattern.computed_slots[name];
      // js_formatter(v0.9): [フォーマッタ名, 参照スロット]。Python は formula を eval するが、
      // JS の式エバリュエータ（pyExprToJs）は str()/zfill/rstrip 相当を持たず、かつ凍結方針。
      // そこで同値の表示フォーマッタ（例 dec3）へルーティングする。Python formula と
      // FORMATTERS[fmt] の等価性は tests のドリフト防止テストが参照元 choices 全値で悉皆照合。
      if (cs.js_formatter) {
        env[name] = FORMATTERS[cs.js_formatter[0]](env[cs.js_formatter[1]]);
      } else {
        env[name] = evalExpr(cs.formula, env);
      }
    });

    // 答え（整数値のみをformulaに渡す＝Pythonのisinstance(v,int)フィルタと同義）
    var intEnv = {};
    Object.keys(env).forEach(function (k) {
      if (typeof env[k] === 'number' && Number.isInteger(env[k])) intEnv[k] = env[k];
    });
    env.ans = evalExpr(pattern.answer_formula, intEnv);

    // fraction_display: {表示名: [分子スロット名, 分母スロット名]} → 整形文字列を注入
    var fd = pattern.fraction_display || {};
    Object.keys(fd).forEach(function (dispName) {
      env[dispName] = fmtFraction(env[fd[dispName][0]], env[fd[dispName][1]]);
    });
    // mixed_display(v0.8): 帯分数表記を注入
    var md = pattern.mixed_display || {};
    Object.keys(md).forEach(function (dispName) {
      env[dispName] = fmtMixed(env[md[dispName][0]], env[md[dispName][1]]);
    });
    // reduced_fraction_display(v0.9): gcdで約分してから分数整形（真分数・仮分数そのまま）
    var rfd = pattern.reduced_fraction_display || {};
    Object.keys(rfd).forEach(function (dispName) {
      var rn = env[rfd[dispName][0]], rdd = env[rfd[dispName][1]];
      env[dispName] = fmtFraction(reduceNum(rn, rdd), reduceDen(rn, rdd));
    });
    // reduced_mixed_display(v0.9): gcdで約分してから帯分数整形
    var rmd = pattern.reduced_mixed_display || {};
    Object.keys(rmd).forEach(function (dispName) {
      var mn = env[rmd[dispName][0]], mdn = env[rmd[dispName][1]];
      env[dispName] = fmtMixed(reduceNum(mn, mdn), reduceDen(mn, mdn));
    });

    // 数量スロットの表示文字列を自動生成
    var quants = pattern.quantity_slots || {};
    Object.keys(quants).forEach(function (name) {
      env[name + '_disp'] = FORMATTERS[quants[name].unit_system](env[name]);
      if (quants[name].unit_system === 'h_min' || quants[name].unit_system === 'raw_min') {
        env[name + '_min'] = env[name];
      }
    });

    // computed_slotsのうち数量系（big/small等）もanswer_unit_systemで整形
    var aus = pattern.answer_unit_system;
    if (aus) {
      env.ans_disp = FORMATTERS[aus](env.ans);
      Object.keys(pattern.computed_slots || {}).forEach(function (name) {
        if (typeof env[name] === 'number' && Number.isInteger(env[name])) {
          env[name + '_disp'] = FORMATTERS[aus](env[name]);
        }
      });
    }
    return env;
  }

  // ---- テンプレート充填（Pythonのstr.format(**env)相当） ----
  function formatTemplate(tmpl, env) {
    return tmpl.replace(/\{(\w+)\}/g, function (m, name) {
      if (!Object.prototype.hasOwnProperty.call(env, name)) {
        throw new Error('未定義のプレースホルダ: {' + name + '}');
      }
      return String(env[name]);
    });
  }

  // figure_params(v0.8): "{slot}" を env で解決（本文と同一env→図中数値と問題文が食い違わない）。
  function resolveFigureParams(fp, env) {
    if (Array.isArray(fp)) return fp.map(function (v) { return resolveFigureParams(v, env); });
    if (fp && typeof fp === 'object') {
      var o = {};
      Object.keys(fp).forEach(function (k) { o[k] = resolveFigureParams(fp[k], env); });
      return o;
    }
    if (typeof fp === 'string') {
      var m = fp.match(/^\{(\w+)\}$/);
      if (m && Object.prototype.hasOwnProperty.call(env, m[1])) return env[m[1]];
    }
    return fp;
  }

  function makeProblem(pattern, unitId, lex) {
    var env = buildEnv(pattern, unitId, lex);
    var tmpl = randChoice(pattern.sentence_templates);
    var problem = formatTemplate(tmpl, env);
    var answer = formatTemplate(pattern.answer_template, env);
    var figure = pattern.figure_params ? resolveFigureParams(pattern.figure_params, env) : null;
    return { env: env, problem: problem, answer: answer, figure: figure };
  }

  // ---- 検証（漢字/本文数値の由来/答えの正値性） ----
  function verify(pattern, env, problem) {
    var bad = kanjiCheck(problem, allowedKanji(pattern));

    var fdKeys = pattern.fraction_display || {};
    var mdKeys = pattern.mixed_display || {};
    var rfdKeys = pattern.reduced_fraction_display || {};
    var rmdKeys = pattern.reduced_mixed_display || {};
    var allowedNums = {};
    (pattern.template_number_constants || []).forEach(function (n) { allowedNums[n] = true; });
    Object.keys(env).forEach(function (k) {
      var v = env[k];
      if (typeof v === 'number' && Number.isInteger(v) &&
        (Object.prototype.hasOwnProperty.call(pattern.slots || {}, k) ||
          Object.prototype.hasOwnProperty.call(pattern.quantity_slots || {}, k))) {
        // v1.0: 負スロット値対応。本文「−6」は \d+ 抽出で 6 になるため v と abs(v) の
        // 両方を許可（既存バンクは全て正値=abs(v)==v で非干渉）。
        allowedNums[v] = true;
        allowedNums[Math.abs(v)] = true;
      }
    });
    Object.keys(env).forEach(function (k) {
      if (k.slice(-5) === '_disp' || k.slice(-4) === '_min' ||
        Object.prototype.hasOwnProperty.call(fdKeys, k) ||
        Object.prototype.hasOwnProperty.call(mdKeys, k) ||
        Object.prototype.hasOwnProperty.call(rfdKeys, k) ||
        Object.prototype.hasOwnProperty.call(rmdKeys, k)) {
        var matches = String(env[k]).match(/\d+/g) || [];
        matches.forEach(function (m) { allowedNums[parseInt(m, 10)] = true; });
      }
    });
    var textNums = (problem.match(/\d+/g) || []).map(function (x) { return parseInt(x, 10); });
    var numsFromSlots = textNums.every(function (n) { return Object.prototype.hasOwnProperty.call(allowedNums, n); });

    // v1.0: answer_domain（無宣言/"positive_int"→ans>0、"any_int"→任意、"nonzero_int"→≠0）。
    // 返却キー名 answer_positive は維持し「宣言ドメイン内か」に意味拡張（ハーネス互換）。
    var dom = pattern.answer_domain || 'positive_int';
    var a = env.ans, inDomain;
    if (dom === 'any_int') inDomain = true;
    else if (dom === 'nonzero_int') inDomain = a !== 0;
    else if (dom === 'pi_coef') inDomain = a > 0;   // S-1: π係数（ans=係数・表示fmt_pi(ans)）。正。
    else inDomain = a > 0;   // positive_int（既定・既存バンク全て）

    return {
      checks: {
        kanji_ok: bad.length === 0,
        nums_from_slots: numsFromSlots,
        answer_positive: inDomain
      },
      bad: bad
    };
  }

  // ============================================================
  // 経路C（テンプレート登録時）専用ユーティリティ。ランタイムでは呼ばない。
  // checkConsistency_retirement_plan.md §6.1 ⑤⑥に対応。
  // ============================================================
  function lintTemplates(pattern) {
    var issues = [];

    // ⑤ 文末が問い（疑問文・指示文）の形になっているか
    // 「か。」は「ですか/ますか/でしょうか/ましたか」等をすべて包含する
    // 一般形として判定する（動詞活用まで個別に列挙しない）。
    var endingRe = /(か|なさい|ください|ましょう)。?$/;
    (pattern.sentence_templates || []).forEach(function (tmpl, i) {
      if (!endingRe.test(tmpl.trim())) {
        issues.push('sentence_templates[' + i + ']が疑問文・指示文の形で終わっていません: "' + tmpl + '"');
      }
    });

    // ⑥ プレースホルダのホワイトリスト照合
    var allowed = {};
    Object.keys(pattern.slots || {}).forEach(function (k) { allowed[k] = true; });
    Object.keys(pattern.quantity_slots || {}).forEach(function (k) {
      allowed[k] = true; // 生値そのもの（raw_min等、整形不要な場合に直接参照される）
      allowed[k + '_disp'] = true;
      allowed[k + '_min'] = true;
    });
    // 語彙解決（buildEnv）で追加されうるスロット名
    [
      'actor', 'actor_a', 'actor_b', 'actor_c',
      'container', 'cont_counter', 'object', 'counter', 'verb_on', 'exist', 'verb_use',
      'attr_a', 'attr_b'
    ].forEach(function (k) { allowed[k] = true; });

    // 答え・computed_slots由来の値は本文（sentence_templates）に書いてはいけない
    var forbidden = { ans: true, ans_disp: true };
    Object.keys(pattern.computed_slots || {}).forEach(function (name) {
      forbidden[name] = true;
      forbidden[name + '_disp'] = true;
    });

    (pattern.sentence_templates || []).forEach(function (tmpl, i) {
      var placeholders = tmpl.match(/\{(\w+)\}/g) || [];
      placeholders.forEach(function (ph) {
        var name = ph.slice(1, -1);
        if (forbidden[name]) {
          issues.push('sentence_templates[' + i + ']に答え・派生値のプレースホルダ{' + name + '}が含まれています（本文に答えを書いてはいけません）');
        } else if (!allowed[name]) {
          issues.push('sentence_templates[' + i + ']に未宣言のプレースホルダ{' + name + '}が含まれています（宣言済みスロットのみ許可）');
        }
      });
    });

    return { ok: issues.length === 0, issues: issues };
  }

  var PatternGen = {
    FORMATTERS: FORMATTERS,
    fmtFraction: fmtFraction,
    fmtMixed: fmtMixed,
    // v0.9 ヘルパ（helpers_test_vectors.json ランナー・ドリフト防止テスト用に公開）
    gcdInt: gcdInt,
    lcmInt: lcmInt,
    reduceNum: reduceNum,
    reduceDen: reduceDen,
    fmtDec: fmtDec,
    fmtPercentPm: fmtPercentPm,
    fmtBuaiPm: fmtBuaiPm,
    roundHalfUp: roundHalfUp,
    roundRangeLower: roundRangeLower,
    roundRangeUpperExcl: roundRangeUpperExcl,
    // v1.0 ヘルパ（helpers_test_vectors.json ランナー用に公開）
    fmtSigned: fmtSigned,
    fmtCoef: fmtCoef,
    fmtCoefj: fmtCoefj,
    fmtTermj: fmtTermj,
    sgnStr: sgnStr,
    sqrtCoef: sqrtCoef,
    sqrtRad: sqrtRad,
    fmtSqrt: fmtSqrt,
    fmtPi: fmtPi,
    fmtPiFrac: fmtPiFrac,
    fmtDec2fix: fmtDec2fix,
    sampleDomain: sampleDomain,
    resolveFigureParams: resolveFigureParams,
    allowedKanji: allowedKanji,
    kanjiCheck: kanjiCheck,
    effectiveSlots: effectiveSlots,
    effectiveConstraints: effectiveConstraints,
    filteredContainerSets: filteredContainerSets,
    filteredObjectCounterPairs: filteredObjectCounterPairs,
    effectiveLexiconFilters: effectiveLexiconFilters,
    sampleNumeric: sampleNumeric,
    buildEnv: buildEnv,
    formatTemplate: formatTemplate,
    makeProblem: makeProblem,
    verify: verify,
    lintTemplates: lintTemplates,
    // テスト用に公開
    evalExpr: evalExpr,
    randChoice: randChoice,
    randSample: randSample,
    randRange: randRange
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternGen;
  } else {
    root.PatternGen = PatternGen;
  }
})(typeof window !== 'undefined' ? window : globalThis);
