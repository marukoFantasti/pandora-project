// review_queue_integrity.js — 検収台帳(tests/fixtures/review_queue.json)の整合関門: スキーマ(必須欄・列挙値)・id一意・追加日形式。
// 恒久手順: §3-3/§5報告のたびに handoff_jhs/review_queue_add.py で追記(CLAUDE.md)。
'use strict';
const fs = require('fs'), path = require('path');
const q = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'review_queue.json'), 'utf-8'));
let bad = 0; const ids = new Set();
const KIND = ['問題文', '図', '読み'], ST = ['未', '済', '×'], BY = ['まるこ', 'アイ'], DIST = ['未配布', '配布済'];
q.entries.forEach(e => {
  for (const k of ['id', '種類', '対象', '見るべきこと', '状態', '見る人', '追加した便', '追加日', '配布']) if (!(k in e) || e[k] === '') { bad++; console.log('  ❌ 欄欠落 ' + (e.id || '?') + ' ' + k); }
  if (ids.has(e.id)) { bad++; console.log('  ❌ id重複 ' + e.id); } ids.add(e.id);
  if (!KIND.includes(e['種類'])) { bad++; console.log('  ❌ 種類 ' + e.id); }
  if (!ST.includes(e['状態'])) { bad++; console.log('  ❌ 状態 ' + e.id); }
  if (!BY.includes(e['見る人'])) { bad++; console.log('  ❌ 見る人 ' + e.id); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e['追加日'])) { bad++; console.log('  ❌ 追加日 ' + e.id); }
  if (!DIST.includes(e['配布'])) { bad++; console.log('  ❌ 配布 ' + e.id); }
  if (!('配布日' in e) || !(e['配布日'] === '' || /^\d{4}-\d{2}-\d{2}$/.test(e['配布日'])) || (e['配布'] === '配布済') !== (e['配布日'] !== '')) { bad++; console.log('  ❌ 配布日 ' + e.id); }
});
const open = q.entries.filter(e => e['状態'] === '未');
const und = open.filter(e => e['配布'] === '未配布');
console.log('検収台帳: ' + q.entries.length + '件(未 ' + open.length + ' / 未・未配布 ' + und.length + ' [まるこ ' + und.filter(e => e['見る人'] === 'まるこ').length + '・アイ ' + und.filter(e => e['見る人'] === 'アイ').length + '])');
console.log('\n' + (bad === 0 ? 'review_queue_integrity: GREEN ✅' : '❌ ' + bad + '件'));
process.exit(bad === 0 ? 0 : 1);
