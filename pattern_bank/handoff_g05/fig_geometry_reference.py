# -*- coding: utf-8 -*-
"""C層kind 幾何リファレンス実装(検証済み構成の「正」)。
- JS実装(figure_builder.js)はここに書かれた手順・定数と同一に移植すること。
- geometry_test_vectors.json: 固定パラメータ→主要頂点座標(±0.5px一致でJS合格)。
- c_layer_preview.html: 参考レンダリング(本番描画はJS側。ラベル配置はJSのスキャンが最終決定)。
定数はすべて固定(乱数なし)。env→図は決定的。
"""
import math, json

R = lambda v: round(v, 2)

# ---------- tri_angle: 底辺BC=260px、左内角a1・右内角a2、頂点A=交点。高さ>260で等比縮小 ----------
def tri_angle_geom(a1, a2):
    L = 260.0
    t1, t2 = math.tan(math.radians(a1)), math.tan(math.radians(a2))
    h = L * t1 * t2 / (t1 + t2)
    ax = L * t2 / (t1 + t2)
    scale = min(1.0, 260.0 / h)
    B, C, A = (0, 0), (L * scale, 0), (ax * scale, h * scale)
    return {"B": [R(B[0]), R(B[1])], "C": [R(C[0]), R(C[1])], "A": [R(A[0]), R(A[1])], "scale": R(scale)}

# ---------- tri_angle_iso: 等辺長190px固定、頂角t。頂点上・底辺下 ----------
def tri_angle_iso_geom(t):
    s = 190.0
    half = math.radians(t / 2)
    base = 2 * s * math.sin(half)
    h = s * math.cos(half)
    T = (base / 2, h)      # 頂点(上)。y上向き座標系(SVG変換は描画側)
    Bl, Br = (0, 0), (base, 0)
    return {"T": [R(T[0]), R(T[1])], "BL": [R(Bl[0]), R(Bl[1])], "BR": [R(Br[0]), R(Br[1])],
            "base": R(base), "h": R(h)}

# ---------- quad_angle: AB=180固定・AD適応(固定候補列走査・最短辺>=42px) ----------
AD_CANDIDATES = [150, 170, 130, 190, 110, 210, 100, 90]

def _quad_try(a1, a2, a3, AB, AD):
    A = (0.0, 0.0); B = (AB, 0.0)
    r1 = math.radians(a1)
    D = (AD * math.cos(r1), AD * math.sin(r1))
    ang_da = math.atan2(A[1] - D[1], A[0] - D[0])
    ang_dc = ang_da + math.radians(a3)      # DAから反時計回りにa3(ccw多角形A→B→C→D)
    ang_bc = math.pi - math.radians(a2)     # BAから時計回りにa2
    bx, by = math.cos(ang_bc), math.sin(ang_bc)
    dx, dy = math.cos(ang_dc), math.sin(ang_dc)
    den = bx * (-dy) - by * (-dx)
    if abs(den) < 1e-9: return None
    ex, ey = D[0] - B[0], D[1] - B[1]
    t = (ex * (-dy) - ey * (-dx)) / den
    s = (bx * ey - by * ex) / den
    if t <= 1 or s <= 1: return None
    C = (B[0] + t * bx, B[1] + t * by)
    pts = [A, B, C, D]
    cross = []
    for i in range(4):
        p, q, r = pts[i], pts[(i + 1) % 4], pts[(i + 2) % 4]
        cross.append((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]))
    if not (all(c > 0 for c in cross) or all(c < 0 for c in cross)): return None
    def dist(p, q): return math.hypot(p[0] - q[0], p[1] - q[1])
    edges = [dist(pts[i], pts[(i + 1) % 4]) for i in range(4)]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    if max(xs) - min(xs) > 620 or max(ys) - min(ys) > 540: return None
    return {"pts": pts, "min_edge": min(edges)}

def quad_angle_geom(a1, a2, a3):
    best, best_m = None, -1
    for AD in AD_CANDIDATES:
        r = _quad_try(a1, a2, a3, 180.0, AD)
        if r is not None and r["min_edge"] >= 42:
            best = r; break
        if r is not None and r["min_edge"] > best_m:
            best, best_m = r, r["min_edge"]
    A, B, C, D = best["pts"]
    return {"A": [R(A[0]), R(A[1])], "B": [R(B[0]), R(B[1])],
            "C": [R(C[0]), R(C[1])], "D": [R(D[0]), R(D[1])],
            "min_edge": R(best["min_edge"])}

# ---------- para_area: 底辺b・高さh・傾きslant。単位長スケール=min(260/b, 170/h, 24) ----------
def para_area_geom(b, h, slant):
    sc = min(260.0 / b, 170.0 / h, 24.0)
    B_, H_ = b * sc, h * sc
    off = H_ / math.tan(math.radians(slant))
    A = (0, 0); Bp = (B_, 0); Cp = (B_ + off, H_); D = (off, H_)
    foot_x = off                    # 高さ点線: D から真下 (foot=(off,0))
    return {"A": [0, 0], "B": [R(B_), 0], "C": [R(B_ + off), R(H_)], "D": [R(off), R(H_)],
            "foot": [R(foot_x), 0], "scale": R(sc)}

# ---------- trap_area: 上底a・下底b・高さh・offset_ratio(千分率) ----------
def trap_area_geom(a, b, h, or_pm):
    sc = min(260.0 / b, 170.0 / h, 24.0)
    A_, B_, H_ = a * sc, b * sc, h * sc
    off = (B_ - A_) * or_pm / 1000.0
    P1 = (0, 0); P2 = (B_, 0); P3 = (off + A_, H_); P4 = (off, H_)
    foot_x = off + A_ * 0.5         # 高さ点線: 上辺中点から真下
    return {"P1": [0, 0], "P2": [R(B_), 0], "P3": [R(off + A_), R(H_)], "P4": [R(off), R(H_)],
            "h_top": [R(foot_x), R(H_)], "h_foot": [R(foot_x), 0], "scale": R(sc)}

# ---------- rhombus_area: 対角線d1(横)・d2(たて)。中心原点 ----------
def rhombus_area_geom(d1, d2):
    sc = min(240.0 / max(d1, d2), 22.0)
    hx, hy = d1 * sc / 2, d2 * sc / 2
    return {"Lp": [R(-hx), 0], "Rp": [R(hx), 0], "Tp": [0, R(hy)], "Bp": [0, R(-hy)], "scale": R(sc)}

# ---------- circle: 半径px=90固定。diameter=中心を通る水平線 / radius=中心→右 ----------
def circle_geom(given):
    r = 90.0
    if given == "diameter":
        return {"c": [0, 0], "r_px": r, "line": [[-r, 0], [r, 0]]}
    return {"c": [0, 0], "r_px": r, "line": [[0, 0], [r, 0]]}

# ---------- cuboid: キャビネット投影(奥行1/2・45°)。前面 w×h、奥行d ----------
def cuboid_geom(w, d, h):
    sc = min(180.0 / w, 150.0 / h, 110.0 / d, 20.0)
    W, H, D = w * sc, h * sc, d * sc * 0.5
    ox, oy = D * math.cos(math.radians(45)), D * math.sin(math.radians(45))
    # 前面: F1(0,0) F2(W,0) F3(W,H) F4(0,H)  背面: 各+ (ox, oy)
    return {"F": [[0, 0], [R(W), 0], [R(W), R(H)], [0, R(H)]],
            "off": [R(ox), R(oy)], "scale": R(sc)}

# ---------- circle fig_version 2: sector(full/half/quarter)+radius_label。半径px=90固定 ----------
def circle_v2_geom(sector):
    r = 90.0
    spans = {"full": (0, 360), "half": (0, 180), "quarter": (0, 90)}
    rang = {"full": 30, "half": 90, "quarter": 45}
    sp = spans.get(sector, spans["full"])
    cuts = []
    if sector == "half": cuts = [[[r, 0], [-r, 0]]]
    elif sector == "quarter": cuts = [[[0, 0], [r, 0]], [[0, 0], [0, r]]]
    ra = math.radians(rang.get(sector, 30))
    return {"c": [0, 0], "r_px": r, "arc": [sp[0], sp[1]], "cuts": cuts,
            "rlabel_end": [R(r * math.cos(ra)), R(r * math.sin(ra))]}

# ---------- prism: cuboidの平行投影(奥行1/2・45°)を流用し底面を差替。rect(w,d)/tri(base,base_height)を高さhで上方押出 ----------
def prism_geom(base_kind, a, b, h):
    c45, s45 = math.cos(math.radians(45)), math.sin(math.radians(45))
    if base_kind == "rect":
        w, d = a, b
        sc = min(180.0 / w, 150.0 / h, 110.0 / d, 20.0)
        W, H, D = w * sc, h * sc, d * sc * 0.5
        ox, oy = D * c45, D * s45
        base = [[0, 0], [W, 0], [W + ox, oy], [ox, oy]]
    else:
        bb, th = a, b
        sc = min(180.0 / bb, 150.0 / h, 110.0 / max(th, 1), 20.0)
        B, H, TH = bb * sc, h * sc, th * sc * 0.5
        ox, oy = TH * c45, TH * s45
        base = [[0, 0], [B, 0], [B / 2 + ox, oy]]
    top = [[p[0], p[1] + H] for p in base]
    return {"base": [[R(x), R(y)] for x, y in base], "top": [[R(x), R(y)] for x, y in top],
            "off": [R(ox), R(oy)], "scale": R(sc)}

# ---------- C層(第5弾) sym_polygon/similar_pair/xy_graph/dot_plot/histogram ----------
def _regular_poly(n, r):
    return [[r * math.cos(math.radians(90 + 360 * i / n)), r * math.sin(math.radians(90 + 360 * i / n))] for i in range(n)]
SYM = {
    "square": {"verts": [[-40, -40], [40, -40], [40, 40], [-40, 40]], "n_axes": 4},
    "rect": {"verts": [[-50, -30], [50, -30], [50, 30], [-50, 30]], "n_axes": 2},
    "parallelogram": {"verts": [[-45, -25], [25, -25], [45, 25], [-25, 25]], "n_axes": 0},
    "iso_tri": {"verts": [[-38, -28], [38, -28], [0, 44]], "n_axes": 1},
    "equi_tri": {"regular": 3}, "reg_pentagon": {"regular": 5}, "reg_hexagon": {"regular": 6},
}
def sym_polygon_geom(shape):
    sh = SYM.get(shape, SYM["square"])
    if sh.get("regular"):
        n = sh["regular"]; verts = _regular_poly(n, 45); n_axes = n
    else:
        verts = sh["verts"]; n_axes = sh["n_axes"]
    return {"verts": [[R(x), R(y)] for x, y in verts], "center": [0, 0], "n_axes": n_axes}
SIM_BASES = {"right_tri": [[0, 0], [40, 0], [0, 30]], "tri": [[0, 0], [50, 0], [15, 35]],
             "rect": [[0, 0], [40, 0], [40, 30], [0, 30]], "lshape": [[0, 0], [40, 0], [40, 20], [20, 20], [20, 40], [0, 40]]}
def similar_pair_geom(base_shape, ratio):
    base = SIM_BASES.get(base_shape, SIM_BASES["right_tri"])
    scaled = [[p[0] * ratio, p[1] * ratio] for p in base]
    bw = max(p[0] for p in base)
    return {"base": [[R(x), R(y)] for x, y in base], "scaled": [[R(x), R(y)] for x, y in scaled], "base_off": [0, 0], "scaled_off": [R(bw + 40), 0]}
def xy_graph_geom(mode, k, xmax, ymax):
    U = min(260 // xmax, 260 // ymax, 30); curve = []; lattice = []
    if mode == "prop":
        curve = [[0, 0], [xmax, min(k * xmax, ymax)]]
    else:
        xTop = k / ymax; curve.append([xTop, ymax])
        x0 = math.ceil(xTop * 4) / 4; x = x0
        while x <= xmax + 1e-9:
            curve.append([x, k / x]); x += 0.25
        if abs(curve[-1][0] - xmax) > 1e-6: curve.append([xmax, k / xmax])
        for xi in range(1, xmax + 1):
            yi = k / xi
            if abs(yi - round(yi)) < 1e-9 and yi <= ymax: lattice.append([xi, round(yi)])
    # ベクター照合: 端点(ends)+整数格子点(lattice)の代表点（curve全点は描画用でJS側のみ保持）
    return {"unit": U, "W": xmax * U, "H": ymax * U,
            "ends": [[R(curve[0][0]), R(curve[0][1])], [R(curve[-1][0]), R(curve[-1][1])]],
            "lattice": [[a, b] for a, b in lattice]}
# ---------- xy_graph fig_version 2: 4象限view→プロット局所px(0..W,0..H, y下向き)。 ----------
# 有理数[num,den]入力を決定的丸め1回でpx化。W/H=プロット定数。JS(figure_builder.js)と同一手順。
# 丸めは round-half-up(floor(v+0.5))で両言語一致(Pythonのbanker's rounding非依存)。
_V2_W = 240   # プロット幅px(xmin→xmax)
_V2_H = 240   # プロット高px(ymin→ymax)
def _v2round(v):
    return math.floor(v + 0.5)
def xy_graph_v2_px(xmin, xmax, ymin, ymax, xnum, xden, ynum, yden):
    """点[xnum/xden, ynum/yden]のプロット局所px。非等方スケール(x,y独立)。決定的丸め1回。"""
    px = _v2round((xnum - xmin * xden) * _V2_W / (xden * (xmax - xmin)))
    py = _v2round((ymax * yden - ynum) * _V2_H / (yden * (ymax - ymin)))
    return [px, py]
def xy_graph_v2_clip(xmin, xmax, ymin, ymax, an, ad, bn, bd):
    """直線 y=(an/ad)x+(bn/bd) をview矩形でクリップした2端点のpx。有理数交点経由→px→(px_x,px_y)昇順。"""
    cand = []   # (xnum,xden,ynum,yden)
    for xe in (xmin, xmax):                       # 左右辺: y=(an*xe*bd+bn*ad)/(ad*bd)
        yn, yd = an * xe * bd + bn * ad, ad * bd
        if yd < 0: yn, yd = -yn, -yd
        if ymin * yd <= yn <= ymax * yd: cand.append((xe, 1, yn, yd))
    if an != 0:
        for ye in (ymin, ymax):                   # 上下辺: x=((ye*bd-bn)*ad)/(bd*an)
            xn, xd = (ye * bd - bn) * ad, bd * an
            if xd < 0: xn, xd = -xn, -xd
            if xmin * xd <= xn <= xmax * xd: cand.append((xn, xd, ye, 1))
    seen, pts = set(), []
    for (xn, xd, yn, yd) in cand:
        p = tuple(xy_graph_v2_px(xmin, xmax, ymin, ymax, xn, xd, yn, yd))
        if p not in seen: seen.add(p); pts.append(list(p))
    pts.sort(key=lambda p: (p[0], p[1]))
    return {"ends": [pts[0], pts[1]]}              # レンダラ側でサンプル残数≧2をassert

def dot_plot_geom(mn, mx, values):
    U = min(280 // (mx - mn), 26); count = {}; dots = []
    for v in values:
        count[v] = count.get(v, 0) + 1
        dots.append([(v - mn) * U, 12 + (count[v] - 1) * 12])
    return {"unit": U, "axis": [[0, 0], [(mx - mn) * U, 0]], "dots": [[R(x), R(y)] for x, y in dots]}
def histogram_geom(class_width, x0, freqs):
    maxF = max(freqs); barW = min(300 // len(freqs), 44); U = min(150 // max(maxF, 1), 22)
    return {"barW": barW, "unit": U, "bars": [{"x": i * barW, "y": 0, "w": barW, "h": f * U, "f": f} for i, f in enumerate(freqs)]}

GEOMS = {
    "tri_angle": (tri_angle_geom, [(25, 40), (60, 60), (75, 75), (100, 45), (30, 115), (115, 30), (50, 90), (65, 35)]),
    "circle_v2": (circle_v2_geom, [("full",), ("half",), ("quarter",)]),
    "prism": (prism_geom, [("rect", 6, 4, 8), ("rect", 10, 3, 5), ("tri", 8, 5, 7), ("tri", 6, 4, 6)]),
    "sym_polygon": (sym_polygon_geom, [("square",), ("rect",), ("parallelogram",), ("iso_tri",), ("equi_tri",), ("reg_pentagon",), ("reg_hexagon",)]),
    "similar_pair": (similar_pair_geom, [("right_tri", 2), ("right_tri", 3), ("rect", 2), ("tri", 0.5)]),
    "xy_graph": (xy_graph_geom, [("prop", 2, 6, 6), ("inv", 12, 6, 6), ("prop", 1, 8, 8), ("inv", 6, 6, 6)]),
    "dot_plot": (dot_plot_geom, [(0, 8, [2, 3, 3, 4, 4, 4, 5, 6]), (0, 10, [1, 5, 5, 9])]),
    "histogram": (histogram_geom, [(5, 10, [3, 7, 5, 2]), (10, 0, [2, 4, 6, 3, 1])]),
    "tri_angle_iso": (tri_angle_iso_geom, [(30,), (60,), (90,), (120,), (44,), (100,)]),
    "quad_angle": (quad_angle_geom, [(90, 90, 90), (65, 97, 73), (125, 65, 65), (80, 110, 95), (65, 125, 65), (100, 100, 95), (65, 65, 105), (120, 70, 90)]),
    "para_area": (para_area_geom, [(12, 7, 65), (6, 4, 75), (16, 12, 60), (9, 6, 70)]),
    "trap_area": (trap_area_geom, [(4, 8, 3, 350), (2, 6, 5, 200), (9, 14, 10, 500), (5, 9, 6, 350)]),
    "rhombus_area": (rhombus_area_geom, [(12, 6), (4, 10), (16, 8), (6, 14)]),
    "circle": (circle_geom, [("diameter",), ("radius",)]),
    "cuboid": (cuboid_geom, [(8, 10, 6), (5, 3, 6), (10, 10, 10), (12, 3, 4)]),
    # xy_graph fig_version 2(§4): 点マッピング(4象限/原点/分数傾き格子点/双曲線解析点/非等方/非対称view)
    "xy_graph_v2_px": (xy_graph_v2_px, [
        (-6, 6, -6, 6, 5, 1, 5, 1), (-6, 6, -6, 6, 5, 1, -5, 1),     # §4-1 (±5,±5)
        (-6, 6, -6, 6, -5, 1, 5, 1), (-6, 6, -6, 6, -5, 1, -5, 1),
        (-6, 6, -6, 6, 0, 1, 0, 1),                                   # §4-2 原点
        (-6, 6, -6, 6, 4, 1, -1, 1),                                  # §4-4 分数傾き格子点 x=4→y=-1
        (-6, 6, -6, 6, 2, 1, 3, 1), (-6, 6, -6, 6, -2, 1, -3, 1), (-6, 6, -6, 6, 6, 1, 1, 1),  # §4-5 双曲線k=6解析点
        (0, 40, 0, 3000, 0, 1, 0, 1), (0, 40, 0, 3000, 9, 1, 18, 1), (0, 40, 0, 3000, 9, 1, 1800, 1),  # §4-6 第1象限非等方(端+中域)
        (-4, 8, -6, 2, 0, 1, 0, 1),                                   # §4-7 非対称view原点
    ]),
    # §4-3 lineクリップ: y=-2x+1 の view(-6..6,-6..6) 2端点
    "xy_graph_v2_clip": (xy_graph_v2_clip, [(-6, 6, -6, 6, -2, 1, 1, 1)]),
}

def make_vectors():
    out = {"comment": "C層kind 幾何等価性ベクター。JS実装は同一パラメータで各座標±0.5px一致で合格。座標系はy上向き(SVG変換は描画側の責務)、原点は各kindのローカル原点。"}
    for kind, (fn, cases) in GEOMS.items():
        out[kind] = [{"params": list(c), "expect": fn(*c)} for c in cases]
    json.dump(out, open("geometry_test_vectors.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n = sum(len(c) for _, c in GEOMS.values())
    print(f"geometry_test_vectors.json: {len(GEOMS)} kinds / {n} cases")

# ---------- 参考レンダリング(レビュー用HTML。本番はJS側) ----------
def _poly(pts, H=340, dx=60, dy=40):
    return " ".join(f"{dx + p[0]:.1f},{H - dy - p[1]:.1f}" for p in pts)

def preview():
    S = []
    def block(title, inner, w=430, h=360):
        S.append(f'<div class="card"><h3>{title}</h3><svg viewBox="0 0 {w} {h}" width="{w}" height="{h}">{inner}</svg></div>')
    st = 'fill="#eef4ff" stroke="#1a56c4" stroke-width="2"'
    dash = 'stroke="#c0392b" stroke-width="1.6" stroke-dasharray="5,4"'
    txt = 'font-size="15" fill="#333" text-anchor="middle"'

    g = tri_angle_geom(50, 90)
    B, C, A = g["B"], g["C"], g["A"]
    inner = f'<polygon points="{_poly([B, C, A])}" {st}/>'
    for p, t, col in [(B, "50°", "#1D9E75"), (C, "90°", "#1D9E75"), (A, "あ", "#C0392B")]:
        inner += f'<text x="{60 + p[0]:.0f}" y="{300 - p[1] + (26 if p[1] < 5 else -14):.0f}" {txt} fill="{col}">{t}</text>'
    block("tri_angle (a1=50, a2=90 → あ=40°)", inner)

    g = tri_angle_iso_geom(44)
    inner = f'<polygon points="{_poly([g["BL"], g["BR"], g["T"]])}" {st}/>'
    inner += f'<text x="{60 + g["T"][0]:.0f}" y="{300 - g["T"][1] - 12:.0f}" {txt}>44°</text>'
    inner += f'<text x="{60 + g["BL"][0] + 22:.0f}" y="{300 - 18:.0f}" {txt} fill="#C0392B">あ</text>'
    block("tri_angle_iso (頂角44° → 底角68°)", inner)

    g = quad_angle_geom(65, 97, 73)
    pts = [g["A"], g["B"], g["C"], g["D"]]
    inner = f'<polygon points="{_poly(pts)}" {st}/>'
    for p, t, col in [(g["A"], "65°", "#1D9E75"), (g["B"], "97°", "#1D9E75"), (g["D"], "73°", "#1D9E75"), (g["C"], "あ", "#C0392B")]:
        inner += f'<text x="{60 + p[0]:.0f}" y="{300 - p[1] + (24 if p[1] < 5 else -12):.0f}" {txt} fill="{col}">{t}</text>'
    block(f'quad_angle (65/97/73 → あ=125°・適応AD・最短辺{g["min_edge"]}px)', inner)

    g = para_area_geom(12, 7, 65)
    pts = [g["A"], g["B"], g["C"], g["D"]]
    inner = f'<polygon points="{_poly(pts)}" {st}/>'
    inner += f'<line x1="{60 + g["D"][0]:.0f}" y1="{300 - g["D"][1]:.0f}" x2="{60 + g["foot"][0]:.0f}" y2="300" {dash}/>'
    fx = 60 + g["foot"][0]
    inner += f'<path d="M {fx:.0f} 292 h 8 v 8" fill="none" stroke="#C0392B" stroke-width="1.4"/>'
    inner += f'<text x="{60 + g["B"][0] / 2:.0f}" y="322" {txt}>12cm</text>'
    inner += f'<text x="{60 + g["D"][0] + 24:.0f}" y="{300 - g["D"][1] / 2:.0f}" {txt}>7cm</text>'
    block("para_area (底辺12・高さ7・slant65°)", inner)

    g = trap_area_geom(4, 8, 3, 350)
    pts = [g["P1"], g["P2"], g["P3"], g["P4"]]
    inner = f'<polygon points="{_poly(pts)}" {st}/>'
    inner += f'<line x1="{60 + g["h_top"][0]:.0f}" y1="{300 - g["h_top"][1]:.0f}" x2="{60 + g["h_foot"][0]:.0f}" y2="300" {dash}/>'
    inner += f'<text x="{60 + (g["P4"][0] + g["P3"][0]) / 2:.0f}" y="{300 - g["P4"][1] - 10:.0f}" {txt}>4cm</text>'
    inner += f'<text x="{60 + g["P2"][0] / 2:.0f}" y="322" {txt}>8cm</text>'
    inner += f'<text x="{60 + g["h_top"][0] + 24:.0f}" y="{300 - g["h_top"][1] / 2:.0f}" {txt}>3cm</text>'
    block("trap_area (上底4・下底8・高さ3)", inner)

    g = rhombus_area_geom(12, 6)
    pts = [g["Lp"], g["Tp"], g["Rp"], g["Bp"]]
    inner = f'<polygon points="{_poly(pts, dx=220, dy=160)}" {st}/>'
    inner += f'<line x1="{220 + g["Lp"][0]:.0f}" y1="180" x2="{220 + g["Rp"][0]:.0f}" y2="180" {dash}/>'
    inner += f'<line x1="220" y1="{180 - g["Tp"][1]:.0f}" x2="220" y2="{180 + g["Tp"][1]:.0f}" {dash}/>'
    inner += f'<text x="255" y="198" {txt}>12cm</text><text x="248" y="{180 - g["Tp"][1] + 24:.0f}" {txt}>6cm</text>'
    block("rhombus_area (対角線12×6)", inner)

    inner = '<circle cx="215" cy="170" r="90" fill="#eef4ff" stroke="#1a56c4" stroke-width="2"/>'
    inner += '<circle cx="215" cy="170" r="2.4" fill="#1a56c4"/>'
    inner += f'<line x1="125" y1="170" x2="305" y2="170" stroke="#1a56c4" stroke-width="1.6"/>'
    inner += f'<text x="215" y="158" {txt}>15cm</text>'
    block("circle (given=diameter, 15cm)", inner)

    g = cuboid_geom(8, 10, 6)
    F = g["F"]; ox, oy = g["off"]
    Bk = [[p[0] + ox, p[1] + oy] for p in F]
    inner = f'<polygon points="{_poly(F)}" {st}/>'
    inner += f'<polygon points="{_poly([F[1], Bk[1], Bk[2], F[2]])}" fill="#dce8fb" stroke="#1a56c4" stroke-width="2"/>'
    inner += f'<polygon points="{_poly([F[3], F[2], Bk[2], Bk[3]])}" fill="#e6effd" stroke="#1a56c4" stroke-width="2"/>'
    for a, b in [(Bk[0], Bk[1]), (Bk[0], Bk[3]), (Bk[0], F[0])]:
        inner += f'<line x1="{60 + a[0]:.0f}" y1="{300 - a[1]:.0f}" x2="{60 + b[0]:.0f}" y2="{300 - b[1]:.0f}" stroke="#1a56c4" stroke-width="1.4" stroke-dasharray="4,4"/>'
    inner += f'<text x="{60 + F[1][0] / 2:.0f}" y="322" {txt}>8cm</text>'
    inner += f'<text x="{40:.0f}" y="{300 - F[2][1] / 2:.0f}" {txt}>6cm</text>'
    inner += f'<text x="{60 + F[1][0] + ox / 2 + 16:.0f}" y="{300 - oy / 2 + 14:.0f}" {txt}>10cm</text>'
    block("cuboid (たて10・横8・高さ6)", inner)

    html = ('<!doctype html><meta charset="utf-8"><title>C層kind 参考レンダリング</title>'
            '<style>body{font-family:sans-serif;background:#fafafa}.card{display:inline-block;'
            'background:#fff;border:1px solid #ddd;border-radius:8px;margin:8px;padding:8px}'
            'h3{font-size:13px;margin:2px 4px 6px}</style>'
            '<h2>C層kind 参考レンダリング(幾何リファレンス実装による。本番描画・ラベル最終配置はJS側)</h2>'
            + "".join(S))
    open("c_layer_preview.html", "w", encoding="utf-8").write(html)
    print("c_layer_preview.html 出力")

if __name__ == "__main__":
    make_vectors()
    preview()
