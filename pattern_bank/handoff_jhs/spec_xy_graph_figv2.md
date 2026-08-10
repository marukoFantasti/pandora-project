# 指示書: xy_graph fig_version 2 拡張(jhs B層 c06〜c08用)

対象: figure_builder.js の xy_graph kind 拡張 + fig_geometry_reference.py への負域ベクター追加。
**全て加法設計**。既存の呼び出し(fig_version未指定またはfig_version 1)の出力はバイト不変であること。

## §0 関門(着手前後で全緑を確認・報告に含める)

1. **15基準md5**(g02〜g06の5+jhs10章)完全一致。
2. **標準パリティ8480**通過。
3. **figure_nondestructive**: 既存kind(table/histogram/g04系レンダラ全種)およびxy_graph fig_version 1の
   出力を、代表パラメータ悉皆でハッシュ固定し、本改修前後でバイト一致を機械確認。
4. **geometry_test_vectors ±0.5px照合**: 既存ケース全通過+本仕様§4のfig_version 2ケースを追加して全通過。

## §1 スコープ

- xy_graph に `fig_version: 2` を追加。**fig_version不在は1として扱い、v1経路のコードには一切触れない**
  (分岐追加のみ)。v2は独立の描画関数に実装してよい(v1との共有はマッピング系ユーティリティのみ・
  共有する場合はv1出力バイト不変を§0-3で証明)。
- fig_geometry_reference.py に v2 の期待座標計算(負域込み)を追加し、geometry_test_vectors に
  v2ケースを追加。

## §2 fig_version 2 入力仕様(figure_params)

```json
{
  "kind": "xy_graph",
  "fig_version": 2,
  "view": {
    "xmin": -6, "xmax": 6, "ymin": -6, "ymax": 6,
    "tick_x": 1, "tick_y": 1,
    "grid": true
  },
  "axis_labels": { "x": "x", "y": "y" },
  "elements": [ ... ]
}
```

### view(必須)
- xmin<0<xmax かつ ymin<0<ymax を許す(4象限)。**第1象限のみ(xmin=0, ymin=0)も許容**
  (c08の量グラフ用)。原点には「O」ラベル。
- 軸は矢印付き、x軸右端に axis_labels.x、y軸上端に axis_labels.y を配置。
  axis_labels は任意テキスト(例「x(分)」「y(m)」)。全角括弧・単位を含む文字列をそのまま描画。
- tick_x / tick_y: 目盛間隔(正整数)。目盛数値ラベルは tick 位置に描画。ラベル過密回避のため
  「(xmax−xmin)/tick_x ≦ 16」を入力契約とする(設計側が値域で保証・レンダラはassert)。
- grid: true で薄いグリッド線(tick間隔)。

### elements(配列・描画順=配列順)

| type | パラメータ | 描画 |
|---|---|---|
| `line` | a: [num,den], b: [num,den], label?: string | 直線 y＝ax＋b。view矩形でクリップした2端点を結ぶ |
| `hyperbola` | k: int(≠0), label?: string | 双曲線 y＝k/x。両枝。view内かつ漸近線マージン外を等間隔サンプリングした折れ線近似 |
| `segment` | x1,y1,x2,y2: [num,den], style?: "solid"\|"dashed" | 線分(c08折れ線グラフ用) |
| `point` | x,y: [num,den], label?: string, guides?: "none"\|"x"\|"y"\|"both", show_coords?: bool | 点(黒丸)。guidesで軸への垂線を破線描画。show_coords=trueで「(x，y)」表記を併記 |
| `curve_label` | text: string, x,y: [num,den] | 曲線名ラベル(「①」「②」「ℓ」「m」等)を指定位置に配置 |

- **有理数は [分子, 分母] の整数ペアで受ける**(浮動小数入力禁止)。px変換は
  round((val_num/val_den − min) / (max − min) × 幅) の決定的丸め1回のみ。ゴールデンmd5固定のため、
  中間で環境依存の浮動小数演算連鎖を作らない(乗算順序を固定)。
- line のクリップ: 4辺との交点を有理数で求めてからpx化(端点が枠上に正確に乗ること)。
- hyperbola のサンプリング: 各枝で x方向等間隔・固定サンプル数(実装定数・例えば64)。
  |y|>ymax相当の点は捨てる。サンプル数と間引き規則は決定的であること(md5固定対象)。
- label の配置規則: point は右上オフセット既定、ただし点が view 右端/上端の近傍(実装定数マージン)
  なら左下側へ反転。決定的であること。
- 全角座標表記: show_coords の括弧・カンマは「(」「，」「)」(バンク正準の全角読点系)。

### 入力契約(レンダラはassert・保証は設計側の値域制約)
- 全 point / segment端点 / curve_label は view 内(境界含む)。
- line は view と必ず交わる(クリップ結果が2点)。
- hyperbola は |k| ≦ (xmax−1)×(ymax−1) 目安(枝がview内に十分現れる)…設計側制約。レンダラ側は
  「サンプル残数≧2/枝」をassert。

## §3 v1との関係

- v1の既存機能(現行の第1象限系・既存グレードで使用中の全機能)には触れない。
- v2で v1 と同名の見た目要素(軸・目盛)が重複実装になっても許容(非破壊優先)。共通化リファクタは
  本指示のスコープ外(やらない)。

## §4 geometry_test_vectors 追加ケース(±0.5px)

fig_geometry_reference.py に v2 期待値計算を実装し、最低以下をカバー:

1. **4象限マッピング**: view(−6..6, −6..6)で (±5, ±5) 4点のpx座標(全符号組合せ)。
2. **原点とO ラベル位置**: (0,0) のpx。
3. **lineクリップ**: a=[−2,1], b=[1,1](y＝−2x＋1)の view(−6..6,−6..6) クリップ2端点。
   端点が有理数交点経由で枠上に乗ること。
4. **line分数傾き**: a=[1,2], b=[−3,1] の任意view内格子点1つ(例 x=4 → y=−1)のpx。
5. **hyperbola**: k=6 で (2,3)・(−2,−3)・(6,1) のpx(サンプル点でなく解析点でよい=曲線近傍±0.5px
   ではなく「この座標のpx変換」を照合)。
6. **segment**: 第1象限量グラフ view(0..40, 0..3000, tick_x=5, tick_y=500) で
   (0,0)→(9,18)相当の任意端点2つのpx(非等方スケール検証)。
7. **非対称view**: view(−4..8, −6..2) で (0,0)(=原点が中央でない)のpx。

## §5 完了報告様式

- §0関門4種の結果(md5一覧・パリティ数・nondestructiveハッシュ照合結果・test_vectors通過数)。
- v2実装の実装定数一覧(サンプル数・ラベルマージン等)。
- 代表SVG 6枚の目視用出力: ①4象限+比例直線+点ラベル ②双曲線k>0+点 ③双曲線k<0
  ④y＝ax＋b(分数傾き)+切片点 ⑤2直線+交点+curve_label ℓ/m ⑥第1象限量グラフ+segment折れ線。
- 未決事項・仕様逸脱があれば逸脱理由を明記(勝手に仕様を拡張しない)。

## §6 検収確定事項(Fable検収 2026-08-10・実装反映済)

fig_version 2 実装(figure_builder.js / fig_geometry_reference.py)の検収合格に伴い、以下を確定仕様とする。

- **§2 丸め規則の確定**: px変換の丸めは `floor(v+0.5)`(round-half-up)に**確定**。
  Python `round()` の銀行家丸め(偶数丸め)は JS `Math.round` と .5 で食い違うため**不可**。
  両言語同一手順・決定的丸め1回でmd5安定と±0.5px照合を両立する。
- **§2 実装定数の確定**: プロット寸法 W/H＝**240px**(xmin→xmax / ymin→ymax、非等方)、
  双曲線サンプル数＝**64/枝**、点ラベル既定オフセット＝**8px**(右上)、
  ラベル反転マージン＝**1 view単位**(右端/上端近傍で左下反転)、軸矢印＝6px・目盛マーク＝4px。
- **§2 入力契約の補強**: 目盛数の上限は `(max−min)/tick ≦ 16`(レンダラassert)を維持。
  ただし可読性のため**設計側の推奨値域は ≦12**(値域制約設計で保証する)。
- **§4 中域ベクター追加**: §4-6 の第1象限非等方viewに中域点 `(9, 1800)`→px`(54, 96)` を追加
  (端点 (0,0)→(0,240) / (9,18)→(54,239) は維持)。y軸方向の非等方スケールを中域でも照合。
