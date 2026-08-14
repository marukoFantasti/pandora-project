// rationale整合ハーネス(恒久・遡及学年共通)。
// バンクとrationaleの (1)pattern_id完全一致(過不足0) (2)figure_notes正準:
//   図あり(figure_params有)=設計記録(「図なし」で始まらない非空文字列) /
//   図なし(figure_params無)=「図なし」で始まる理由文字列。null不使用(ゴールド流儀・2026-08-12裁可)。
// を悉皆検証する。
//
// 実行:  node tests/rationale_integrity.js [grade ...]   (既定: 配置済みの全対象)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PB = path.join(ROOT, 'pattern_bank');

// figure_notes正準(ゴールド流儀・null不使用)へ統一済みの学年。既定でここだけ検証する。
// 他学年(jhs各章/g01/g04/g03/g02)は旧null流儀のまま順次統一(§4・一括改修不要)。統一時にここへ追加。
const CANONICAL_GRADES = ['g02', 'g03', 'g04', 'g05'];

// grade -> rationaleファイル候補(既存配置慣行。先に見つかった正準を使う)
function resolveRationale(grade) {
  const cands = [
    path.join(PB, 'pandora2', 'rationale_' + grade + '_gold.json'),
    path.join(PB, 'pandora2', 'rationale_' + grade + '.json'),
    path.join(PB, 'handoff_jhs', 'rationale_' + grade + '_full.json'),
    path.join(PB, 'handoff_jhs', 'rationale_' + grade + '.json'),
  ];
  return cands.find(p => fs.existsSync(p)) || null;
}
// rationaleの2形式(flat pid map / {rationales|entries:[...]}) を pid->entry に正規化
function parseEntries(rn) {
  const arr = Array.isArray(rn.rationales) ? rn.rationales : Array.isArray(rn.entries) ? rn.entries : null;
  if (arr) { const m = {}; arr.forEach(e => { const id = e.pattern_id || e.id; if (id) m[id] = e; }); return m; }
  const m = {}; Object.keys(rn).forEach(k => { if (!k.startsWith('_') && rn[k] && typeof rn[k] === 'object' && !Array.isArray(rn[k])) m[k] = rn[k]; }); return m;
}

// 既定=正準化済み学年。明示引数があればそれを対象(遡及学年の統一作業で使用)。
const grades = process.argv.slice(2).length ? process.argv.slice(2) : CANONICAL_GRADES;
let bad = 0;
for (const grade of grades) {
  const bankPath = path.join(PB, 'patterns_' + grade + '.json');
  const rnPath = resolveRationale(grade);
  if (!fs.existsSync(bankPath)) { console.log('❌ ' + grade + ': バンク不在'); bad++; continue; }
  if (!rnPath) { console.log('⚠️ ' + grade + ': rationale未配置(スキップ)'); continue; }
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
  const rnEntries = parseEntries(JSON.parse(fs.readFileSync(rnPath, 'utf-8')));
  const bankIds = bank.patterns.map(p => p.pattern_id);
  const hasFig = {}; bank.patterns.forEach(p => hasFig[p.pattern_id] = !!p.figure_params);
  const rn = rnEntries;
  const rnIds = Object.keys(rn);
  const bankSet = new Set(bankIds), rnSet = new Set(rnIds);

  // (1) ID完全一致
  const onlyBank = bankIds.filter(id => !rnSet.has(id));
  const onlyRn = rnIds.filter(id => !bankSet.has(id));
  let e = 0;
  if (onlyBank.length) { console.log('  ' + grade + ' rationale欠落: ' + onlyBank.join(',')); e += onlyBank.length; }
  if (onlyRn.length) { console.log('  ' + grade + ' バンク不在rationale: ' + onlyRn.join(',')); e += onlyRn.length; }

  // (2) figure_notes 正準
  let figOk = 0, nofigOk = 0, fnBad = [];
  for (const id of rnIds) {
    if (!bankSet.has(id)) continue;
    const fn = (rn[id].rationale || {}).figure_notes;
    const startsNofig = typeof fn === 'string' && fn.indexOf('図なし') === 0;
    if (fn === null || fn === undefined) { fnBad.push(id + '(null/欠)'); continue; }
    if (hasFig[id]) {
      if (startsNofig || typeof fn !== 'string' || !fn.trim()) fnBad.push(id + '(図ありなのに設計記録でない)');
      else figOk++;
    } else {
      if (!startsNofig) fnBad.push(id + '(図なしなのに「図なし」始まりでない)');
      else nofigOk++;
    }
  }
  if (fnBad.length) { console.log('  ' + grade + ' figure_notes不正: ' + fnBad.slice(0, 8).join(', ') + (fnBad.length > 8 ? ' …' : '')); e += fnBad.length; }
  bad += e;
  console.log('  ' + (e === 0 ? '✅' : '❌') + ' ' + grade.padEnd(8) + ' ID一致 ' + rnIds.length + '/' + bankIds.length +
    ' / figure_notes 図あり' + figOk + '・図なし' + nofigOk + (e ? ' / 不整合' + e : '') + '  [' + path.relative(ROOT, rnPath) + ']');
}
console.log('\n' + (bad === 0 ? 'rationale整合: 全対象合格 ✅' : '❌ ' + bad + '件の不整合'));
process.exit(bad === 0 ? 0 : 1);
