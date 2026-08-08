// table kind 全域機械スキャン（figure_kinds_design_g05.md の受け入れ条件 (a)(b)(c)）。
//
// pattern_bank/patterns_g0*.json の kind:"table" figure_params を走査し、値スロットを
// 幅の異なるサンプル群（1〜4桁・小数・"…"・混在）で解決した各バリアントについて、
//   (a) セル境界はみ出し = 0px
//   (b) 隣接テキスト間距離 ≥ 10px
//   (c) 行列対応の意味判定（各ボディ行の値数 == ヘッダ列数）
//   + 全テキストが表領域内（viewBox収容）
// を検証し、合格率を報告する。合格率100%が受け入れ条件。
//
// 実行:  node tests/pattern_bank_table_scan.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB = require(path.join(ROOT, 'pattern_bank', 'figure_builder.js'));

const bankFiles = fs.readdirSync(path.join(ROOT, 'pattern_bank'))
  .filter(f => /^patterns_g\d\d\.json$/.test(f))
  .map(f => path.join(ROOT, 'pattern_bank', f));

// {slot} を env で解決（figure中は文字列/数値が届く前提の簡易resolver）
function resolve(fp, env) {
  if (Array.isArray(fp)) return fp.map(v => resolve(v, env));
  if (fp && typeof fp === 'object') { const o = {}; for (const k in fp) o[k] = resolve(fp[k], env); return o; }
  if (typeof fp === 'string') { const m = fp.match(/^\{(\w+)\}$/); if (m && env[m[1]] !== undefined) return env[m[1]]; }
  return fp;
}
// figure_params 内の {slot} 名を収集
function slotNames(fp, set) {
  if (Array.isArray(fp)) fp.forEach(v => slotNames(v, set));
  else if (fp && typeof fp === 'object') for (const k in fp) slotNames(fp[k], set);
  else if (typeof fp === 'string') { const m = fp.match(/^\{(\w+)\}$/); if (m) set.add(m[1]); }
  return set;
}

// 幅ストレス集合（各列幅の最小〜最大を突く）
const STRESS = ['1', '22', '333', '4444', '12.5', '…'];

const tables = [];
for (const file of bankFiles) {
  const bank = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const p of (bank.patterns || [])) {
    const fp = p.figure_params;
    if (fp && fp.kind === 'table') tables.push({ file: path.basename(file), id: p.id || p.pattern_id || '(no-id)', fp });
  }
}
if (!tables.length) { console.log('kind:table のパターンは 0 件（対象なし）'); process.exit(0); }

let variants = 0, fail = 0;
for (const t of tables) {
  const slots = [...slotNames(t.fp, new Set())];
  // バリアント: 全スロット一律=各ストレス値、＋ 混在（スロット毎に順繰り）
  const cases = STRESS.map(s => { const e = {}; slots.forEach(k => e[k] = s); return e; });
  const mixed = {}; slots.forEach((k, i) => mixed[k] = STRESS[i % STRESS.length]); cases.push(mixed);
  for (const env of cases) {
    variants++;
    const r = resolve(t.fp, env);
    const svg = FB.build(r);
    const sc = FB._tableMinClearance(r);
    const ok = sc.overflow <= 0.01 && sc.minGap >= 10 && sc.semOk && sc.contained && /^<svg/.test(svg);
    if (!ok) { fail++; console.log(`FAIL ${t.file} ${t.id}`, JSON.stringify(sc), 'env=', JSON.stringify(env)); }
  }
}
const pass = variants - fail;
console.log(`table パターン ${tables.length} 件 × 幅ストレス${STRESS.length + 1}通り = ${variants} バリアント`);
tables.forEach(t => console.log(`  - ${t.file} ${t.id}`));
console.log(`全域スキャン合格率: ${pass}/${variants} = ${(100 * pass / variants).toFixed(1)}%  ${fail === 0 ? '✅' : '❌'}`);
process.exit(fail === 0 ? 0 : 1);
