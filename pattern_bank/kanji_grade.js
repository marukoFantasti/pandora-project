// kanji_grade.js — 学年別配当漢字表(言い換え便§3-3・裁可p)。generate_poc_v10.py の allowed_kanji/kanji_check と1:1。
// 表: handoff_jhs/kyoiku_kanji_g1to6_jhs.json(g01〜g06=教育漢字・jhs=常用漢字追加分)。パターンの kanji_policy.allowed_grades(列挙学年の和集合)+allowed_extra(専門用語の個別許可)。
// 使い方: const K=require('./kanji_grade'); K.check(text, K.allowedFor(pattern)) → 配当外の漢字配列(空=合格)
'use strict';
const fs = require('fs'), path = require('path');
const TABLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'handoff_jhs', 'kyoiku_kanji_g1to6_jhs.json'), 'utf-8'));
const BY_GRADE = {}; Object.keys(TABLE).forEach(g => { BY_GRADE[g] = new Set(TABLE[g]); });
const DEFAULT_ALLOWED = new Set([...BY_GRADE.g01, ...BY_GRADE.g02]);
function allowedFor(pattern) {
  const kp = (pattern && pattern.kanji_policy) || {}, grades = kp.allowed_grades;
  const base = (!grades || !grades.length) ? new Set(DEFAULT_ALLOWED) : new Set([].concat(...grades.map(g => [...(BY_GRADE[g] || [])])));
  [...(kp.allowed_extra || '')].forEach(c => base.add(c));
  return base;
}
function check(text, allowed) { return [...String(text == null ? '' : text)].filter(c => c >= '一' && c <= '鿿' && !allowed.has(c)); }
function cumulative(grade) { const order = ['g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'jhs']; const out = new Set(); for (const g of order) { (TABLE[g] || []).forEach(c => out.add(c)); if (g === grade) break; } return out; }
module.exports = { TABLE, BY_GRADE, allowedFor, check, cumulative };
