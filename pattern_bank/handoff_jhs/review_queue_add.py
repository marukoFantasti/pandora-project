#!/usr/bin/env python3
"""検収台帳(tests/fixtures/review_queue.json)への追記ツール(まるこ指示 2026-09-06)。§3-3/§5報告のたびにCodeが呼ぶ。
使い方: python3 review_queue_add.py --kind 図 --target graph_choice --check "時間の軸か種類かが図だけで分かるか" --by まるこ --batch graph_choice便
       python3 review_queue_add.py --kind 読み --target 棒 --check "ぼう: 気温、[棒]が降水量" --by アイ --batch line_bar_combo便
       python3 review_queue_add.py --set-status <id> 済|×
種類=問題文(新パターンid)／図(新kind・描画変更+目視ポイント)／読み(1字=字ごと・多字語=便単位で語リスト)。状態=未/済/×。見る人=まるこ/アイ。配布=未配布/配布済(v8)=既配布分/配布済+配布日=まるこの指示でFableがシート出力時に記入(--distribute)(Fableのシート生成は『未・未配布』からの差分)。"""
import json, sys, argparse, datetime, os
QP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tests', 'fixtures', 'review_queue.json')
def load():
    with open(QP, encoding='utf-8') as f: return json.load(f)
def save(q):
    with open(QP, 'w', encoding='utf-8') as f: json.dump(q, f, ensure_ascii=False, indent=1); f.write('\n')
def add(kind, target, check, by, batch, status='未', dist='未配布'):
    q = load(); ids = {e['id'] for e in q['entries']}
    key = f"{kind}:{target}"
    for e in q['entries']:
        if e['種類'] == kind and e['対象'] == target and e['状態'] == '未':
            e['見るべきこと'] = check; e['追加した便'] = batch; save(q); return e['id']
    n = 1
    while f"rq-{n:04d}" in ids: n += 1
    e = {"id": f"rq-{n:04d}", "種類": kind, "対象": target, "見るべきこと": check, "状態": status, "見る人": by, "追加した便": batch, "追加日": datetime.date.today().isoformat(), "配布": dist, "配布日": ""}
    q['entries'].append(e); save(q); return e['id']
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--kind'); ap.add_argument('--target'); ap.add_argument('--check'); ap.add_argument('--by', default='アイ'); ap.add_argument('--batch'); ap.add_argument('--set-status', nargs=2, metavar=('ID', 'STATUS')); ap.add_argument('--distribute', nargs=2, metavar=('ID', 'DATE'), help='配布済にして配布日を記入'); ap.add_argument('--dist', default='未配布', help='未配布(既定)/配布済')
    a = ap.parse_args()
    if a.set_status:
        q = load(); hit = [e for e in q['entries'] if e['id'] == a.set_status[0]]
        if not hit or a.set_status[1] not in ('未', '済', '×'): sys.exit('id/状態が不正')
        hit[0]['状態'] = a.set_status[1]; save(q); print('updated', a.set_status[0]); sys.exit(0)
    if a.distribute:
        q = load(); hit = [e for e in q['entries'] if e['id'] == a.distribute[0]]
        if not hit: sys.exit('idが不正')
        hit[0]['配布'] = '配布済'; hit[0]['配布日'] = a.distribute[1]; save(q); print('distributed', a.distribute[0]); sys.exit(0)
    if not (a.kind and a.target and a.check and a.batch): sys.exit(ap.format_help())
    print('added', add(a.kind, a.target, a.check, a.by, a.batch, dist=a.dist))
