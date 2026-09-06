// _seeded.js — 台帳原則(corr-0042受理・2026-09-06): 関門内の乱択は必ずseed付き。Math.random を seed付き mulberry32 に差し替え、
// 実行ごとに同じ乱択列を再現できるようにする(失敗時は各関門が pattern_id/env を出力する)。seed は環境変数 GATE_SEED で上書き可(既定 20260906)。
'use strict';
function mulberry32(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function install(seed) {
  const s = Number(process.env.GATE_SEED || seed || 20260906);
  Math.random = mulberry32(s);
  console.log('[乱数seed=' + s + ' (GATE_SEED で変更可・失敗再現用)]');
  return s;
}
module.exports = { install, mulberry32 };
