const FB = require("../figure_builder.js");
const fs = require("fs");
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

// --- table 流用確認 ---
const prop = {fig_version:1, kind:"table", caption:"ともなって変わる量",
  col_header:["1","2","3","4","5"],
  rows:[{label:"x（個）", values:["1","2","3","4","5"]},
        {label:"y（円）", values:["80","160","□","320","400"]}]};
const freq = {fig_version:1, kind:"table", caption:"通学時間の記録",
  col_header:["階級（分）","度数（人）"],
  rows:[{label:"a", values:["0以上10未満","4"]},
        {label:"b", values:["10以上20未満","9"]},
        {label:"c", values:["20以上30未満","6"]},
        {label:"d", values:["合計","19"]}]};
[["比例表(空欄□)", prop], ["度数分布表", freq]].forEach(([n,fp])=>{
  const sc = FB._tableMinClearance(fp);
  console.log("  table流用 "+n+": overflow="+sc.overflow+" minGap="+sc.minGap.toFixed(1)+" semOk="+sc.semOk+((sc.overflow<=0.01&&sc.minGap>=10&&sc.semOk)?" ✅":" ⚠️"));
});

// --- サンプルシート variants ---
const cards = [];
function card(title, fp){
  cards.push('<div class="card"><h3>'+esc(title)+'</h3><div class="fig">'+FB.build(fp)+'</div></div>');
}
// circle v2 × 6
[["full","半径ラベル有",true],["full","半径ラベル無",false],["half","半径ラベル有",true],["half","半径ラベル無",false],["quarter","半径ラベル有",true],["quarter","半径ラベル無",false]].forEach(function(c){
  card("circle v2 / "+c[0]+" / "+c[1], {fig_version:2,kind:"circle",sector:c[0],radius_label:c[2],value:c[0]==="quarter"?10:(c[0]==="half"?8:6),unit:"cm"});
});
// prism × 2
card("prism / rect底面 (w6 d4 h8)", {fig_version:1,kind:"prism",base_kind:"rect",w:6,d:4,height:8,unit:"cm"});
card("prism / tri底面 (base8 baseH5 h7)", {fig_version:1,kind:"prism",base_kind:"tri",base:8,base_height:5,height:7,unit:"cm"});
// cuboid 現行（横長寄せ前）: 横長・縦長・立方体
card("cuboid 現行 (w8 d10 h6 / 横長寄せ未実装)", {fig_version:1,kind:"cuboid",w:8,d:10,h:6,unit:"cm"});
card("cuboid 現行 (w4 d6 h10 縦長 / 横長寄せ検討対象)", {fig_version:1,kind:"cuboid",w:4,d:6,h:10,unit:"cm"});
// table 流用
card("table流用 / 比例表(空欄□)", prop);
card("table流用 / 度数分布表", freq);

const html = '<!doctype html><meta charset="utf-8"><title>B層図形 サンプルシート</title>'+
 '<style>body{font-family:sans-serif;background:#f6f7f9;margin:14px;color:#222}h1{font-size:16px}h2{font-size:12px;color:#666;font-weight:400}'+
 '.card{display:inline-block;vertical-align:top;width:250px;min-height:220px;background:#fff;border:1px solid #ddd;border-radius:8px;margin:6px;padding:10px}'+
 '.card h3{font-size:12px;margin:0 0 6px}.fig{text-align:center}.fig svg{max-width:100%;height:auto}</style>'+
 '<h1>B層図形基盤 サンプルシート（目視レビュー用）</h1>'+
 '<h2>circle fig_version 2 (sector×radius_label 6形) / prism (rect・tri) / cuboid現行(横長寄せ未実装) / table流用(比例・度数分布)</h2>'+
 cards.join("");
const out = "/Users/ishimaru_atsushi/pandora-project/pattern_bank/handoff_g06/b_layer_preview.html";
fs.writeFileSync(out, html);
console.log("サンプルシート:", out, "("+cards.length+"カード, SVG "+(html.match(/<svg/g)||[]).length+")");
