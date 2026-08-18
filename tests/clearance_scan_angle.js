// clearance_scan_angle.js — angle_figure族 共通の悉皆clearanceスキャナ(乱数不使用・G-1〜G-4再利用)。
// 与えられた値域の全組合せについて figure_builder で図を生成し、
//   (1) ラベル衝突: minText < minGap(既定10px)
//   (2) 図枠はみ出し: 自動フィットviewBoxが nominal を超過(=配置が異常肥大した退化組の代理指標)
// を機械検査し、違反組を列挙する。scan(cases, opts) は {total, violations[]} を返す(G-2以降が流用)。
//
// 実行:  node tests/clearance_scan_angle.js   (仮値域=2直線/3直線 の実装検証スキャン)
'use strict';
const path = require('path');
const FB = require(path.join(__dirname, '..', 'pattern_bank', 'figure_builder.js'));

// cases: [{label, fp}]。clearanceFn: fp->{minText,...}。opts: {minGap, nominal}
function scan(cases, opts) {
  opts = opts || {};
  const minGap = opts.minGap != null ? opts.minGap : 10;
  const nominal = opts.nominal != null ? opts.nominal : 280;
  const clearanceFn = opts.clearanceFn || (fp => FB._angleFigureMinClearance(fp));
  const violations = [];
  for (const c of cases) {
    let cl, svg, vb, overflow = 0, err = null;
    try {
      cl = clearanceFn(c.fp);
      svg = FB.build(c.fp);
      const m = svg.match(/viewBox="[^ ]+ [^ ]+ ([\d.]+) ([\d.]+)"/);
      if (m) { const w = +m[1], h = +m[2]; overflow = Math.max(0, w - nominal, h - nominal); }
    } catch (e) { err = e.message; }
    const bad = err || cl.minText < minGap || overflow > 0;
    if (bad) violations.push({ label: c.label, minText: cl ? +cl.minText.toFixed(2) : null, minSeg: cl ? +cl.minSeg.toFixed(2) : null, overflow: +overflow.toFixed(1), err: err });
  }
  return { total: cases.length, violations: violations };
}

// ---- 仮値域のケース生成(実装検証用・正式値域はバンク設計時にFableが実物と突合) ----
function around(angles) { return { kind: 'angle_figure', subkind: 'angle_around_point', angles: angles }; }
// 2直線交差: 交差角 a∈[30,150] step5。4角=[a, 180-a(未知∠x), a, 180-a]
function cases2lines() {
  const cs = [];
  for (let a = 30; a <= 150; a += 5) {
    cs.push({ label: '2直線 a=' + a, fp: around([{ v: a, role: 'known', label: a + '°' }, { v: 180 - a, role: 'unknown', label: '∠x' }, { v: a, role: 'plain' }, { v: 180 - a, role: 'plain' }]) });
  }
  return cs;
}
// 3直線: 3隙間 g1,g2,g3(各≥20・和180) step5。6角=[g1,g2(未知),g3, g1,g2,g3]
function cases3lines() {
  const cs = [];
  for (let g1 = 20; g1 <= 140; g1 += 5)
    for (let g2 = 20; g2 <= 140; g2 += 5) {
      const g3 = 180 - g1 - g2; if (g3 < 20) continue;
      cs.push({ label: '3直線 ' + g1 + '/' + g2 + '/' + g3, fp: around([
        { v: g1, role: 'known', label: g1 + '°' }, { v: g2, role: 'unknown', label: '∠x' }, { v: g3, role: 'plain' },
        { v: g1, role: 'plain' }, { v: g2, role: 'plain' }, { v: g3, role: 'plain' }]) });
    }
  return cs;
}

module.exports = { scan, cases2lines, cases3lines, around };

if (require.main === module) {
  for (const [name, cs] of [['2直線交差(30〜150°/5°刻み)', cases2lines()], ['3直線(各隙間≥20°・和180)', cases3lines()]]) {
    const r = scan(cs);
    console.log('=== ' + name + ' ===');
    console.log('  組合せ ' + r.total + ' / 違反 ' + r.violations.length + (r.violations.length ? ':' : ' ✅(違反0)'));
    r.violations.slice(0, 12).forEach(v => console.log('    ❌ ' + v.label + ' minText=' + v.minText + ' overflow=' + v.overflow + (v.err ? ' err=' + v.err : '')));
  }
}
