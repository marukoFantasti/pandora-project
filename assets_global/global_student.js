// global_student.js — 海外(グローバル)生徒/レコード判定の共有述語。算数・国語で同一定義を使う。
// Phase 0 C-6採用: mode==='overseas' ∨ globalSource===true ∨ vocabLevel存在。
// レコードは submission 行 または submission_data のどちらに旗があっても拾えるよう両方を見る(寛容)。
'use strict';
function isGlobalStudent(record, data) {
  var r = record || {}, d = data || {};
  return r.mode === 'overseas' || d.mode === 'overseas'
    || r.globalSource === true || d.globalSource === true
    || r.vocabLevel != null || d.vocabLevel != null;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { isGlobalStudent };
else if (typeof window !== 'undefined') window.isGlobalStudent = isGlobalStudent;
