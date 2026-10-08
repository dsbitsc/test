"""Trace the flat orthographic renders (vector/png/*.png) into layered SVGs and build a turnaround sheet.

Usage:  node render step (see README) -> python3 vectorize.py
"""
import re, sys, pathlib
import vtracer
from PIL import Image

ROOT = pathlib.Path(__file__).parent / "vector"
VIEWS = [("threeq", "3/4"), ("side", "Seite"), ("front", "Front"), ("back", "Hinten"), ("top", "Oben")]
PALETTE = [("Fell Navy", "#15173f"), ("Gelb", "#ffc61a"), ("Creme", "#fff0c8"), ("Schwarz", "#07070d")]

def crop_png(name):
    im = Image.open(ROOT / "png" / f"{name}.png").convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    pad = 24
    box = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, im.width), min(bbox[3] + pad, im.height))
    out = ROOT / "png" / f"{name}_crop.png"
    im.crop(box).save(out)
    return out, box

def trace(name):
    src, _ = crop_png(name)
    dst = ROOT / f"gopi-{name}.svg"
    vtracer.convert_image_to_svg_py(
        str(src), str(dst),
        colormode="color", hierarchical="stacked", mode="spline",
        filter_speckle=6, color_precision=6, layer_difference=14,
        corner_threshold=55, length_threshold=4.0, max_iterations=10,
        splice_threshold=45, path_precision=3,
    )
    return dst

def inner(svg_path):
    txt = svg_path.read_text()
    m = re.search(r"<svg[^>]*width=\"(\d+)\"[^>]*height=\"(\d+)\"[^>]*>(.*)</svg>", txt, re.S)
    w, h, body = int(m.group(1)), int(m.group(2)), m.group(3)
    return w, h, body

def main():
    cells = []
    for name, label in VIEWS:
        svg = trace(name)
        w, h, body = inner(svg)
        cells.append((name, label, w, h, body))
        print(name, w, h, svg.stat().st_size // 1024, "KB")
    # sheet: 3 columns x 2 rows, each cell 1000x1100 units
    CW, CH, M = 1000, 1100, 40
    cols, rows = 3, 2
    W, H = cols * CW + M * 2, rows * CH + M * 2 + 160
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
             f'<rect width="{W}" height="{H}" fill="#fff6dc"/>',
             f'<text x="{M}" y="{M+50}" font-family="Helvetica, Arial, sans-serif" font-size="46" font-weight="700" fill="#15173f">GOPI  Character Turnaround</text>',
             f'<text x="{M}" y="{M+90}" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#15173f">Vektor-Referenz fuer Pluesch, Merch, Print und Animation</text>']
    for i, (name, label, w, h, body) in enumerate(cells):
        cx, cy = M + (i % cols) * CW, M + 160 + (i // cols) * CH
        s = min((CW - 60) / w, (CH - 120) / h)
        ox, oy = cx + (CW - w * s) / 2, cy + 20
        parts.append(f'<g transform="translate({ox:.1f},{oy:.1f}) scale({s:.4f})">{body}</g>')
        parts.append(f'<text x="{cx+CW/2}" y="{cy+CH-50}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#15173f">{label}</text>')
    # palette swatches in the free 6th cell
    px, py = M + 2 * CW + 60, M + 160 + CH + 120
    parts.append(f'<text x="{px}" y="{py}" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#15173f">Farben</text>')
    for k, (lab, hexv) in enumerate(PALETTE):
        y = py + 40 + k * 120
        parts.append(f'<rect x="{px}" y="{y}" width="90" height="90" rx="14" fill="{hexv}" stroke="#15173f" stroke-opacity=".25"/>')
        parts.append(f'<text x="{px+120}" y="{y+40}" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#15173f">{lab}</text>')
        parts.append(f'<text x="{px+120}" y="{y+76}" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#15173f" fill-opacity=".7">{hexv}</text>')
    parts.append("</svg>")
    (ROOT / "gopi-turnaround.svg").write_text("\n".join(parts))
    print("sheet written")

if __name__ == "__main__":
    main()
