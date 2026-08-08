// =====================================================================
// v0.9 JS移植ドラフト — pattern_generator.js / figure_builder.js への統合用
// 本番リポジトリの既存規約(rect_area/angle_sum実装・fig_version機構)に合わせて
// 取り込むこと。アルゴリズムは generate_poc_v09.py と手順単位で同一
// (math.gcd等の組込みは使わず、Euclid反復・整数演算のみ=言語間挙動差なし)。
// 等価性は helpers_test_vectors.json の固定ベクターで両実装を照合する。
// =====================================================================

// ---------- pattern_generator.js へ追加するヘルパ ----------
function gcdInt(a, b) {
  a = Math.trunc(a); b = Math.trunc(b);
  while (b !== 0) { const t = a % b; a = b; b = t; }
  return a;
}
function lcmInt(a, b) {
  a = Math.trunc(a); b = Math.trunc(b);
  return Math.trunc(a / gcdInt(a, b)) * b;   // 先に割る(Python実装と同一順序)
}
function reduceNum(num, den) { return Math.trunc(num / gcdInt(num, den)); }
function reduceDen(num, den) { return Math.trunc(den / gcdInt(num, den)); }

function fmtDec(b, scale) {   // 固定小数点。末尾ゼロ省略: (1200,100)→"12", (1230,100)→"12.3"
  b = Math.trunc(b); scale = Math.trunc(scale);
  const whole = Math.trunc(b / scale), frac = b % scale;
  const width = String(scale).length - 1;
  const s = String(frac).padStart(width, "0").replace(/0+$/, "");
  return s ? `${whole}.${s}` : String(whole);
}
function fmtPercentPm(p) {    // 千分率整数→百分率: 1150→"115%", 25→"2.5%"
  p = Math.trunc(p);
  return p % 10 === 0 ? `${Math.trunc(p / 10)}%` : `${Math.trunc(p / 10)}.${p % 10}%`;
}
function fmtBuaiPm(p) {       // 千分率整数→歩合: 356→"3割5分6厘"。0の位は省略
  p = Math.trunc(p);
  const wari = Math.trunc(p / 100), rest = p % 100;
  const bu = Math.trunc(rest / 10), rin = rest % 10;
  let out = "";
  if (wari) out += `${wari}割`;
  if (bu)   out += `${bu}分`;
  if (rin)  out += `${rin}厘`;
  return out || "0";
}

// FORMATTERS 相当のディスパッチに追加:
//   dec2: b => fmtDec(b, 100),  dec3: b => fmtDec(b, 1000),
//   percent_pm: fmtPercentPm,   buai_pm: fmtBuaiPm
//
// reduced_fraction_display / reduced_mixed_display の解決(mixed_display の直後に追加):
//   for (const [disp, [nk, dk]] of Object.entries(pattern.reduced_fraction_display ?? {})) {
//     env[disp] = fmtFraction(reduceNum(env[nk], env[dk]), reduceDen(env[nk], env[dk]));
//   }
//   for (const [disp, [nk, dk]] of Object.entries(pattern.reduced_mixed_display ?? {})) {
//     env[disp] = fmtMixed(reduceNum(env[nk], env[dk]), reduceDen(env[nk], env[dk]));
//   }
//
// ★ computed_slots の文字列条件式(例: 偶数/奇数判定、千分率→小数文字列 p_dec)は
//   Python側が eval の三項式で生成している。JS側の式エバリュエータで同型に解釈できるか
//   確認し、できない場合は下記の専用ヘルパで置換すること(バンク側は変更しない方針なら
//   エバリュエータに str()/zfill/rstrip 相当を足す):
function pmToDecStr(p) {      // p_dec 用: 千分率→小数文字列 250→"0.25", 1150→"1.15"
  return fmtDec(Math.trunc(p), 1000);
}

// ---------- figure_builder.js へ追加する kind: "table" (fig_version 1) ----------
// params 形状(すべて本文と同一 env で解決済みの文字列が届く):
//   { fig_version: 1, kind: "table", caption: "…",
//     col_header: ["月曜日", …], rows: [{ label: "入館者数（人）", values: ["120", …] }, …] }
//
// 配置原則(angle_sum で確立した原則の table への写像):
//   1. ラベル束縛 — 見出し文字列は自セルに、値文字列は自セルに束縛。セルの外に出さない。
//   2. 可動自由度はフォントサイズと列幅のみ(angle_sum の「半径・フォントのみ」に対応)。
//      行高・罫線・セル対応は固定で動かさない。
//   3. 全域機械スキャン — 描画後に全テキストノードの外接矩形を走査し、
//      (a) セル境界からのはみ出し 0px、(b) 隣接テキストとの距離 ≥ 10px、
//      (c) 意味判定: 値がヘッダ列と同数・行labelと同段にあること、を検証。
//      違反時はフォント縮小→列幅拡大の順で再試行し、収束しなければ生成を棄却する
//      (angle_sum の 距離10px+意味判定 スキャンと同格)。
function drawTable(svg, params, layout) {
  const cols = params.col_header.length;
  const rows = params.rows.length;
  // 列幅は「最長セル文字列の実測幅 + パディング」で決め、全列同幅にはしない。
  // caption は表上部中央。単位は label 側に含める(値セルには数値のみ)。
  // …(既存 figure_builder.js の SVG ユーティリティに合わせて実装)…
}

// ---------- 等価性ベクター・ランナー(JS側) ----------
// node vectors_runner.js helpers_test_vectors.json
// Python側ランナーと同一ベクター全件一致で合格。
const IMPL = {
  gcd: gcdInt, lcm: lcmInt, reduce_num: reduceNum, reduce_den: reduceDen,
  fmt_dec: fmtDec, fmt_percent_pm: fmtPercentPm, fmt_buai_pm: fmtBuaiPm,
  // fmt_mixed / fmt_fraction / round_half_up は既存実装を束ねてここに登録する
};
if (typeof require !== "undefined" && require.main === module) {
  const fs = require("fs");
  const vec = JSON.parse(fs.readFileSync(process.argv[2] ?? "helpers_test_vectors.json", "utf-8"));
  let bad = 0;
  for (const [name, cases] of Object.entries(vec)) {
    if (name === "comment" || !IMPL[name]) continue;
    for (const [args, want] of cases) {
      const got = IMPL[name](...args);
      if (String(got) !== String(want)) { console.log("VEC-FAIL", name, args, got, want); bad++; }
    }
  }
  console.log(bad === 0 ? "等価性ベクター(JS側): 全件一致" : `${bad}件不一致`);
}
