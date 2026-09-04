// edge_set_vectors.js — G-4b Phase2 multi_symbol(edge_set)機構 + 直方体辺関係導出のベクター照合。
// (1) 辺関係表: 全12辺×基準の平行/交わる(垂直)/ねじれを、生成器と独立な軸オラクルで全数照合。
// (2) 正規化(FB=BF・順不同・重複・区切りゆれ) / fmt_edge_set / edge_rel別名(平行/ねじれ/垂直)。
// (3) 図(prism vertex_names)整合: 頂点名A-H描画・基準辺強調が名頂点を結ぶ・シード非依存。
// 乱数なし=シード非依存。
//
// 実行:  node tests/edge_set_vectors.js
'use strict';
const path = require('path');
const P = require(path.join(__dirname, '..', 'pattern_bank', 'pattern_generator.js'));
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));
let bad = 0, cases = 0;

// ---- 独立オラクル(生成器と別実装): 各辺を軸(x/y/z)と頂点対で定義。関係を軸・頂点共有から独立判定 ----
const EDGES = ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH'];
const AXIS = { AB: 'x', CD: 'x', EF: 'x', GH: 'x', DA: 'y', BC: 'y', HE: 'y', FG: 'y', AE: 'z', BF: 'z', CG: 'z', DH: 'z' };
function norm(e) { const a = e[0], b = e[1]; return a < b ? a + b : b + a; }
function axisOf(e) { return AXIS[norm(e) === e ? e : e[1] + e[0]] || AXIS[e] || AXIS[norm(e)]; }
function share(e1, e2) { return e1[0] === e2[0] || e1[0] === e2[1] || e1[1] === e2[0] || e1[1] === e2[1]; }
function oracleRel(base, other) {   // 生成器を使わない独立判定
  if (norm(base) === norm(other)) return 'same';
  if (share(base, other)) return 'intersect';           // 頂点共有=交わる(直方体では垂直)
  if (axisOf(base) === axisOf(other)) return 'parallel'; // 同軸・非共有=平行
  return 'skew';                                         // 異軸・非共有=ねじれ
}
function oracleTable(base) {
  const o = { parallel: [], intersect: [], skew: [] };
  EDGES.forEach(e => { const r = oracleRel(base, e); if (o[r]) o[r].push(norm(e)); });
  o.parallel.sort(); o.intersect.sort(); o.skew.sort();
  return o;
}

console.log('=== (1) 辺関係表 全12辺×基準 独立オラクル照合(平行3/交わる4/ねじれ4・分割) ===');
EDGES.forEach(base => {
  const g = P.cuboidEdgeRelation(base), o = oracleTable(base);
  let e = 0; cases++;
  ['parallel', 'intersect', 'skew'].forEach(k => { if (g[k].join(',') !== o[k].join(',')) { e++; console.log('  ❌ ' + base + '.' + k + ' 生成=' + g[k] + ' 期待=' + o[k]); } });
  // 構造不変量: 3/4/4・分割(基準含め12辺を過不足なく)
  if (g.parallel.length !== 3 || g.intersect.length !== 4 || g.skew.length !== 4) { e++; console.log('  ❌ ' + base + ' 個数' + g.parallel.length + '/' + g.intersect.length + '/' + g.skew.length); }
  const union = g.parallel.concat(g.intersect, g.skew, [norm(base)]).sort();
  if (union.join(',') !== EDGES.map(norm).sort().join(',')) { e++; console.log('  ❌ ' + base + ' 分割不整合'); }
  bad += e;
});
console.log('  12基準辺すべて独立オラクル一致 ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (2) edge_rel別名 / 正規化 / fmt ===');
// edge_rel の英名/和名別名一致
[['AB', 'skew', 'ねじれ'], ['AB', 'parallel', '平行'], ['AB', 'intersect', '垂直'], ['CG', 'skew', 'ねじれ']].forEach(t => {
  cases++; const en = P.edgeRel(t[0], t[1]), ja = P.edgeRel(t[0], t[2]);
  if (en !== ja || en === '') { bad++; console.log('  ❌ edge_rel別名 ' + JSON.stringify(t) + ' en=' + en + ' ja=' + ja); }
});
// 正規化: FB=BF・順不同・重複・区切り
[['辺FB、辺GC 辺HE', 'BF,CG,EH'], ['CG,DH,EH,FG', 'CG,DH,EH,FG'], ['FB FB BF', 'BF'], ['辺DH,辺CG', 'CG,DH'], ['', ''], ['辺AB', 'AB']].forEach(t => {
  cases++; const got = P.normEdgeSet(t[0]); if (got !== t[1]) { bad++; console.log('  ❌ norm(' + t[0] + ')=' + got + ' 期待' + t[1]); }
});
// fmt: 辺接頭・読点区切り・内部順=辞書順
[['CG,DH,EH,FG', '辺CG、辺DH、辺EH、辺FG'], ['FB', '辺BF'], ['GC,AB', '辺AB、辺CG'], ['', '']].forEach(t => {
  cases++; const got = P.fmtEdgeSet(t[0]); if (got !== t[1]) { bad++; console.log('  ❌ fmt(' + t[0] + ')=' + got + ' 期待' + t[1]); }
  if (/\d/.test(got)) { bad++; console.log('  ❌ fmt(' + t[0] + ') 数字トークン混入(corr-0007)'); }
});
console.log('  別名/正規化/fmt/記号透過 ' + (bad === 0 ? '✅' : '❌' + bad));

console.log('=== (3) 図(prism vertex_names)整合: 頂点名A-H・基準辺強調=名頂点結線・シード非依存 ===');
function labelPos(svg) {   // {A:[x,y],...}
  const out = {}; let m; const re = /<text x="([-\d.]+)" y="([-\d.]+)"[^>]*>([A-H])<\/text>/g;
  while ((m = re.exec(svg))) out[m[3]] = [+m[1], +m[2]];
  return out;
}
function highlightSeg(svg) {   // 赤太線(基準辺強調)の両端
  const m = svg.match(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#C0392B" stroke-width="3.4"/);
  return m ? [[+m[1], +m[2]], [+m[3], +m[4]]] : null;
}
[['AB', 5, 3, 4], ['CG', 8, 5, 6], ['EF', 12, 8, 10], ['AE', 10, 4, 8], ['BC', 6, 6, 6]].forEach(t => {
  cases++; let e = 0;
  const fp = { kind: 'prism', base_kind: 'rect', w: t[1], d: t[2], height: t[3], unit: 'cm', vertex_names: true, highlight_edge: t[0] };
  const svg = FB.build(fp), L = labelPos(svg), seg = highlightSeg(svg);
  if (Object.keys(L).length !== 8) e++;                                   // 8頂点名すべて描画
  if (svg.indexOf('undefined') >= 0) e++;
  if (FB.build(fp) !== svg) e++;                                          // シード非依存
  // 基準辺強調が、名頂点 base[0],base[1] の近傍を結ぶ(頂点名と幾何の一致)
  const v0 = L[t[0][0]], v1 = L[t[0][1]];
  if (!seg || !v0 || !v1) e++;
  else {
    // seg端点が {v0,v1} にそれぞれ最も近い(ラベルは頂点からオフセットされるので相対照合)
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const d00 = near(seg[0], v0) + near(seg[1], v1), d01 = near(seg[0], v1) + near(seg[1], v0);
    // 強調辺の端が、対応する頂点ラベルへ他ラベルより近い(結線=名頂点対)
    const others = Object.keys(L).filter(k => k !== t[0][0] && k !== t[0][1]);
    const minOther = Math.min.apply(null, [].concat(...seg.map(s => others.map(k => near(s, L[k])))));
    const endMax = Math.max(near(seg[0], Math.min(d00, d01) === d00 ? v0 : v1), near(seg[1], Math.min(d00, d01) === d00 ? v1 : v0));
    if (endMax > minOther) e++;   // 強調辺の端は基準辺の2頂点ラベルに(他ラベルより)近接
  }
  if (e) { bad += e; console.log('  ❌ 基準' + t[0] + ' w' + t[1] + 'd' + t[2] + 'h' + t[3] + ' (' + e + ')'); }
});
console.log('  図整合(8名・強調=名頂点結線・シード非依存) ' + (bad === 0 ? '✅' : '❌'));

console.log('=== (4) clearance悉皆(corr-0020): 頂点名8+寸法ラベル・c14 prism rect安全域(w3-12/d3-10/h4-15・V≤500) ===');
(function () {
  function rng(lo, hi) { const a = []; for (let v = lo; v <= hi; v++) a.push(v); return a; }
  let n = 0, viol = 0, drawBad = 0, minMT = 1e9, minSeg = 1e9;
  for (const w of rng(3, 12)) for (const d of rng(3, 10)) for (const h of rng(4, 15)) {
    if (w * d * h > 500) continue;
    n++;
    const fp = { kind: 'prism', base_kind: 'rect', w: w, d: d, height: h, unit: 'cm', vertex_names: true, highlight_edge: 'AB' };
    let svg; try { svg = FB.build(fp); } catch (e) { drawBad++; continue; }
    if (!svg || svg.indexOf('undefined') >= 0 || (svg.match(/<text[^>]*>[A-H]<\/text>/g) || []).length !== 8) drawBad++;
    const cl = FB._prismMinClearance(fp);
    if (cl.minText < minMT) minMT = cl.minText; if (cl.minSeg < minSeg) minSeg = cl.minSeg;
    if (cl.minText < 10 || cl.minSeg < 4 || cl.semBad > 0) { viol++; if (viol <= 4) console.log('  ❌ w' + w + 'd' + d + 'h' + h + ' minText=' + cl.minText.toFixed(2) + ' minSeg=' + cl.minSeg.toFixed(2) + ' semBad=' + cl.semBad); }
  }
  cases += n;
  if (viol || drawBad) bad += viol + drawBad;
  console.log('  受理組 ' + n + ' / 描画不良 ' + drawBad + ' / clearance違反 ' + viol + ' / min(minText ' + minMT.toFixed(1) + ', minSeg ' + minSeg.toFixed(1) + ') ' + (viol === 0 && drawBad === 0 ? '✅' : '❌'));
})();

console.log('=== (5) e-2 カタカナ単記号拡張: 既存辺ペア採点の全件不変(凍結オラクル) + 3実装一致(JS/採点HTML/Python) ===');
(function () {
  const fs = require('fs');
  const ROOT = path.join(__dirname, '..');
  // 凍結オラクル=拡張前の正規化(頂点2字のみ)。拡張後は「辺が1つも無い文字列」でしか挙動が変わらないことを悉皆で照合。
  function frozenNorm(s) {
    if (s == null) return '';
    const m = String(s).match(/[A-H][A-H]/g) || [], set = {};
    m.forEach(e => { const a = e.charAt(0), b = e.charAt(1); set[a < b ? a + b : b + a] = 1; });
    return Object.keys(set).sort().join(',');
  }
  function frozenFmt(s) { return frozenNorm(s).split(',').filter(x => x).map(e => '辺' + e).join('、'); }
  // 採点HTML(pandora_grading.html)の edgeSetNorm を抽出して同一挙動を照合(テスト用再実装はドリフトするため実体を使う。HTML側は入力を大文字化=既存挙動)
  const html = fs.readFileSync(path.join(ROOT, 'pandora_grading.html'), 'utf-8');
  const m0 = html.match(/function edgeSetNorm\(s\) \{[\s\S]*?\n\}/);
  if (!m0) { bad++; console.log('  ❌ pandora_grading.html edgeSetNorm 抽出不可'); return; }
  const gradingNorm = new Function('return (' + m0[0] + ')')();
  // コーパス: 既存edge_set正答(全バンク・辺2字系)×表記ゆれ + 生徒答ゆれ + カタカナ系(拡張域)
  const corpus = [], kataBank = [];
  fs.readdirSync(path.join(ROOT, 'pattern_bank')).filter(f => /^patterns_.*\.json$/.test(f)).forEach(f => {
    const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pattern_bank', f), 'utf-8'));
    bank.patterns.forEach(p => {
      if (p.answer_domain !== 'edge_set') return;
      for (let sd = 1; sd <= 5; sd++) {
        let r; try { r = P.makeProblem(p, null, bank.shared_lexicon || {}); } catch (e) { return; }
        const ans = r.answer || r.answer_text || JSON.stringify(r);
        if (!/[A-H][A-H]/.test(String(ans))) { kataBank.push(String(ans), String(r.env.ans)); continue; }   // e-2カタカナ型(拡張域)は3実装一致のみ
        corpus.push(String(ans));
        const fm = P.fmtEdgeSet(r.ans !== undefined ? String(r.ans) : String(ans));
        corpus.push(fm, fm.replace(/辺/g, ''), fm.replace(/、/g, ' '), fm.split('、').reverse().join(','), fm.replace(/([A-H])([A-H])/g, '$2$1'));
      }
    });
  });
  const variants = ['辺FB、辺GC 辺HE', 'CG,DH,EH,FG', 'FB FB BF', '辺DH,辺CG', '', '辺AB', 'ab', 'AB CD ef', '辺AB と 辺CD', 'AE,AD,BF,BC', '辺BC、辺BF、辺AD、辺AE', 'ABCD', 'A B', 'AZ', 'ネジレ AB', '辺AB、ケ'];
  const kata = ['カ、ケ', 'ケ カ', '直線オと直線ク', 'ウ、エ、ウ', 'ア', 'コ,ク', 'カとケです', 'カ・ケ'];
  kataBank.forEach(s => { cases++; if (gradingNorm(s) !== P.normEdgeSet(String(s).toUpperCase())) { bad++; console.log('  ❌ カタカナ型バンク答 採点HTML不一致: ' + s); } });
  let n = 0, inv = 0, par = 0;
  corpus.concat(variants).forEach(s => {
    n++; cases++;
    if (frozenNorm(s) !== P.normEdgeSet(s) || frozenFmt(s) !== P.fmtEdgeSet(s)) { inv++; bad++; if (inv <= 3) console.log('  ❌ 既存不変違反: ' + JSON.stringify(s) + ' 凍結=' + frozenNorm(s) + ' 現=' + P.normEdgeSet(s)); }
    if (gradingNorm(s) !== P.normEdgeSet(String(s).toUpperCase())) { par++; bad++; if (par <= 3) console.log('  ❌ 採点HTML不一致: ' + JSON.stringify(s)); }
  });
  // 既存正答に対する採点判定(一致/不一致)も凍結オラクルと同一
  corpus.forEach(s => { corpus.slice(0, 40).forEach(t => { cases++; if ((frozenNorm(s) === frozenNorm(t)) !== (P.normEdgeSet(s) === P.normEdgeSet(t))) { bad++; inv++; } }); });
  // カタカナ拡張域: 期待値+3実装一致
  const expect = { 'カ、ケ': 'カ,ケ', 'ケ カ': 'カ,ケ', '直線オと直線ク': 'オ,ク', 'ウ、エ、ウ': 'ウ,エ', 'ア': 'ア', 'コ,ク': 'ク,コ', 'カとケです': 'カ,ケ', 'カ・ケ': 'カ,ケ' };
  kata.forEach(s => { cases++; if (P.normEdgeSet(s) !== expect[s] || gradingNorm(s) !== expect[s]) { bad++; console.log('  ❌ カタカナ ' + s + ' → ' + P.normEdgeSet(s) + '/' + gradingNorm(s)); } });
  cases++; if (P.fmtEdgeSet('ケ カ') !== 'カ、ケ' || P.fmtEdgeSet('辺AB、ケ') !== '辺AB') { bad++; console.log('  ❌ fmt カタカナ/混在'); }
  // Python(generate_poc_v10.py)の norm_edge_set/fmt_edge_set と同一(コーパス+カタカナ全件)
  const { execFileSync } = require('child_process');
  const all = corpus.concat(variants, kata, kataBank);
  const py = 'import sys,json\nsys.argv=["x","--vectors"]\nsys.path.insert(0,"pattern_bank/handoff_jhs")\nimport importlib.util\nsp=importlib.util.spec_from_file_location("g","pattern_bank/handoff_jhs/generate_poc_v10.py")\ng=importlib.util.module_from_spec(sp)\nsp.loader.exec_module(g)\nxs=json.load(sys.stdin)\nprint(json.dumps([[g.norm_edge_set(x),g.fmt_edge_set(x)] for x in xs]))';
  let pyOut; try { pyOut = JSON.parse(execFileSync('python3', ['-c', py], { cwd: ROOT, input: JSON.stringify(all) }).toString()); } catch (e) { bad++; console.log('  ❌ Python照合 実行不可: ' + e.message.slice(0, 80)); pyOut = null; }
  let pyBad = 0;
  if (pyOut) all.forEach((s, i) => { cases++; if (pyOut[i][0] !== P.normEdgeSet(s) || pyOut[i][1] !== P.fmtEdgeSet(s)) { pyBad++; bad++; if (pyBad <= 3) console.log('  ❌ Python不一致 ' + JSON.stringify(s) + ' py=' + pyOut[i][0]); } });
  console.log('  コーパス ' + n + '件(既存edge_set正答由来 ' + corpus.length + ' + ゆれ ' + variants.length + ') 既存不変違反 ' + inv + ' / 採点HTML不一致 ' + par + ' / Python不一致 ' + pyBad + ' / カタカナ ' + kata.length + '+バンク' + kataBank.length + '件 ' + (inv === 0 && par === 0 && pyBad === 0 ? '✅' : '❌'));
})();

console.log('\n' + (bad === 0 ? 'edge_set/辺関係ベクター: 全' + cases + '照合 一致 ✅(関係表12×独立オラクル・正規化・fmt・記号透過・図頂点整合・8頂点名clearance悉皆・シード非依存・e-2既存不変+3実装一致)' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
