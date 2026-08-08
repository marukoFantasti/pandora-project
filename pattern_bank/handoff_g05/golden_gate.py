# -*- coding: utf-8 -*-
"""ゴールデン関門: 2つの生成器バージョンを同一バンク・同一シード(スクリプト内固定)で
実行し、標準出力のバイト一致を検証する。マージ前に g02/g03/g04 の3バンクで全通過が必須。

使い方(リポジトリのルートで):
  python golden_gate.py generate_poc_v08.py generate_poc_v09.py patterns_g02.json
  python golden_gate.py generate_poc_v08.py generate_poc_v09.py patterns_g03.json
  python golden_gate.py generate_poc_v08.py generate_poc_v09.py patterns_g04.json
3つとも「差分ゼロ」で v0.9 のマージ関門通過。
(漢字ファイルは両者とも省略時既定の kyoiku_kanji_g1to4.json を使うため引数不要。
 生成器はシードを内部固定しているので、同一シード実行はコマンド同型で保証される。)
"""
import subprocess, sys, hashlib

def run(gen, bank):
    r = subprocess.run([sys.executable, gen, bank], capture_output=True)
    if r.returncode != 0:
        print(f"[ERROR] {gen} が異常終了:\n{r.stderr.decode('utf-8', 'replace')[:2000]}")
        sys.exit(2)
    return r.stdout

def main():
    if len(sys.argv) != 4:
        print(__doc__); sys.exit(1)
    old_gen, new_gen, bank = sys.argv[1], sys.argv[2], sys.argv[3]
    out_old, out_new = run(old_gen, bank), run(new_gen, bank)
    h_old = hashlib.md5(out_old).hexdigest()
    h_new = hashlib.md5(out_new).hexdigest()
    print(f"{old_gen}: {h_old}")
    print(f"{new_gen}: {h_new}")
    if out_old == out_new:
        print(f"★ GOLDEN GATE ({bank}): 差分ゼロ")
        sys.exit(0)
    # 最初の差分行を提示
    a, b = out_old.decode("utf-8", "replace").splitlines(), out_new.decode("utf-8", "replace").splitlines()
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            print(f"✗ 差分あり (最初の差分: {i + 1}行目)\n  old: {x}\n  new: {y}")
            break
    else:
        print(f"✗ 差分あり (行数不一致: {len(a)} vs {len(b)})")
    sys.exit(1)

if __name__ == "__main__":
    main()
