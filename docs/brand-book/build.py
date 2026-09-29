#!/usr/bin/env python3
"""Generates brand-book.html — the BrandingOS brand guidelines, rendered to PDF by render.mjs.

Grayscale only. Type: Funnel Display / Funnel Sans / Doto. Logo artwork is read
from landingpage/src/assets/brand so the book always carries the real files.
"""
import math, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
BRAND = ROOT / "landingpage/src/assets/brand"
OUT = pathlib.Path(__file__).resolve().parent / "brand-book.html"


def svg(name, cls=""):
    s = (BRAND / name).read_text()
    s = re.sub(r"<\?xml[^>]*\?>", "", s).strip()
    s = re.sub(r'\s(id|data-name)="[^"]*"', "", s)
    return s.replace("<svg ", f'<svg class="{cls}" fill="currentColor" ', 1)


MARK = lambda c="": svg("logo-icon.svg", c)
WORD = lambda c="": svg("wordmark.svg", c)
LOCK = lambda c="": svg("lockup.svg", c)

# ---------------------------------------------------------------- colour
COLOURS = [
    ("Core Black", "#0B0B0B", "Structure. Type, marks, dark grounds."),
    ("Warm White", "#F7F6F3", "Space. The default page."),
    ("Pure White", "#FFFFFF", "Activation. Cards, fields, focus."),
]
NEUTRALS = [
    ("100", "#EFEEE8", "Surfaces"),
    ("200", "#E6E4DD", "Dividers"),
    ("300", "#C9C5BC", "Muted marks"),
    ("400", "#8A877E", "Secondary text"),
    ("500", "#55534C", "Body text"),
    ("600", "#2C2B27", "Dark surfaces"),
]


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def cmyk(h):
    r, g, b = (v / 255 for v in rgb(h))
    k = 1 - max(r, g, b)
    if k >= 1:
        return (0, 0, 0, 100)
    c, m, y = ((1 - v - k) / (1 - k) for v in (r, g, b))
    return tuple(round(v * 100) for v in (c, m, y, k))


def lum(h):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def spec(h):
    r, g, b = rgb(h)
    c, m, y, k = cmyk(h)
    return (f"<div class='spec'><span>HEX</span>{h}</div>"
            f"<div class='spec'><span>RGB</span>{r} {g} {b}</div>"
            f"<div class='spec'><span>CMYK</span>{c} {m} {y} {k}</div>")


# ---------------------------------------------------------------- pixel digits
DIGITS = {
    "0": ["00100", "01010", "10001", "10001", "10001", "01010", "00100"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
}


def pixel_number(n, cell=24, gap=6):
    out, x0 = [], 0
    for d in n:
        for r, row in enumerate(DIGITS[d]):
            for c, on in enumerate(row):
                if on == "1":
                    out.append(f"<rect x='{x0 + c * cell}' y='{r * cell}' width='{cell - gap}' height='{cell - gap}'/>")
        x0 += 6 * cell
    w, h = x0 - cell, 7 * cell
    return f"<svg class='pixnum' viewBox='0 0 {w} {h}' width='{w}' height='{h}' fill='currentColor'>{''.join(out)}</svg>"


# ---------------------------------------------------------------- halftone matter
def halftone(kind, size=300, step=10, color="#F7F6F3"):
    dots = []
    n = size // step
    for i in range(n):
        for j in range(n):
            x, y = (i + .5) * step, (j + .5) * step
            u, v = x / size - .5, y / size - .5
            if kind == "sphere":
                d = math.hypot(u, v)
                if d > .38:
                    continue
                z = math.sqrt(max(0, .38 ** 2 - d * d)) / .38
                t = max(0, z * .75 + (-u - v) * .9)
            elif kind == "field":
                t = (math.sin(u * 9 + math.sin(v * 7) * 1.6) + math.sin(v * 11 + u * 4) + 2) / 4
                t = max(0, t - .25) * 1.4
            elif kind == "ring":
                d = math.hypot(u, v)
                t = max(0, 1 - abs(d - .3) * 9)
            else:  # gradient
                t = x / size
            r = min(step * .48, step * .5 * t)
            if r > .35:
                dots.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{r:.2f}'/>")
    return f"<svg viewBox='0 0 {size} {size}' fill='{color}' class='ht'>{''.join(dots)}</svg>"


# ---------------------------------------------------------------- construction geometry
DOT_R = 11.13
CTR = 56.505
NODES = [(78.34, 11.13), (101.88, 34.67), (101.88, 78.33), (78.34, 101.88),
         (34.68, 101.88), (11.13, 78.33), (11.13, 34.67), (34.68, 11.13)]
RING = math.hypot(NODES[0][0] - CTR, NODES[0][1] - CTR)


def construction():
    s = 3.2
    p = 30
    W = 113.01 * s + 2 * p
    o = lambda v: v * s + p
    g = [f"<svg viewBox='0 0 {W:.0f} {W:.0f}' class='cons'>"]
    g.append(f"<circle cx='{o(CTR)}' cy='{o(CTR)}' r='{RING * s:.1f}' class='guide'/>")
    g.append(f"<circle cx='{o(CTR)}' cy='{o(CTR)}' r='{(RING + DOT_R) * s:.1f}' class='guide faint'/>")
    for x, y in NODES:
        g.append(f"<line x1='{o(CTR)}' y1='{o(CTR)}' x2='{o(x)}' y2='{o(y)}' class='ray'/>")
    for x, y in NODES + [(CTR, CTR)]:
        g.append(f"<circle cx='{o(x)}' cy='{o(y)}' r='{DOT_R * s:.1f}' class='node'/>")
    # dot = x measure
    x0 = o(CTR) - DOT_R * s
    g.append(f"<line x1='{x0}' y1='{o(CTR) + DOT_R * s + 14}' x2='{x0 + 2 * DOT_R * s}' y2='{o(CTR) + DOT_R * s + 14}' class='dim'/>")
    g.append(f"<text x='{o(CTR)}' y='{o(CTR) + DOT_R * s + 30}' text-anchor='middle'>x</text>")
    g.append("</svg>")
    return "".join(g)


# ---------------------------------------------------------------- page chrome
PAGES = []


def page(label, chapter, body, theme="light", cls=""):
    PAGES.append((label, chapter, body, theme, cls))


def render_pages():
    total = len(PAGES)
    out = []
    for i, (label, chapter, body, theme, cls) in enumerate(PAGES, 1):
        out.append(f"""
<section class="page {theme} {cls}">
  <header><span>{i:02d} / {total:02d}</span><span>{label} <i class="dot"></i></span></header>
  <div class="body">{body}</div>
  <footer><span>BrandingOS · Brand Guidelines</span><span>{chapter}</span></footer>
</section>""")
    return "".join(out)


def divider(num, title, sub, pages):
    page(f"Chapter {num}", pages, f"""
<div class="divider">
  {pixel_number(num)}
  <div class="divider-text"><h1>{title}</h1><p>{sub}</p></div>
</div>""", "dark")


# ================================================================ CONTENT
page("Brand Guidelines · 2026", "Confidential", f"""
<div class="cover">
  <div class="cover-lockup">{MARK('m')}{WORD('w')}</div>
  <div class="cover-meta">
    <p class="lead">The operating system for modern brands.</p>
    <p class="mono dim">Brand guidelines<br>Edition 01 · 2026</p>
  </div>
</div>
<div class="cover-foot mono">One core. Infinite formations.</div>
""", "dark", "is-cover")

CHAPTERS = [("01", "Logo", "04–10"), ("02", "Colour", "11–14"), ("03", "Typography", "15–18"),
            ("04", "Graphic System", "19–23"), ("05", "Applications", "24–28"), ("06", "Voice", "29–31")]
rows = "".join(f"<div class='toc-row'><span class='mono dim'>{n}</span><h2>{t}</h2><span class='mono dim'>{p}</span></div>"
               for n, t, p in CHAPTERS)
page("Contents", "Contents", f"""
<div class="toc">
  <div class="toc-list">{rows}</div>
  <aside class="toc-aside">
    <div class="toc-art">{halftone('field', 300, 9)}<span class="mono">Formation 001</span></div>
    <p>This book holds the rules that keep BrandingOS recognisable in every place it appears — what must stay fixed, and what is free to move.</p>
  </aside>
</div>""")

page("Essence", "Introduction", """
<div class="split">
  <div>
    <h1 class="xl">One Core.<br><span class="grey">Infinite Formations.</span></h1>
  </div>
</div>
<div class="grid3 essence">
  <div><p class="mono dim">What we are</p><p>An operating system for brands. One place where strategy, identity, voice and assets stay connected.</p></div>
  <div><p class="mono dim">What we believe</p><p>A brand is not a logo. It is a system of decisions — and systems are what let creativity scale.</p></div>
  <div><p class="mono dim">How we look</p><p>Black, white and grey. Structure outside, freedom inside. The only colour on screen belongs to our customers.</p></div>
</div>""", "dark")

# ---- 01 LOGO
divider("01", "Logo", "Nine nodes. One core. The mark is the system at rest.", "04–10")

page("Primary Lockup", "Chapter 01 · Logo", f"""
<div class="hero-logo">{LOCK('lockup')}</div>
<div class="grid3 notes">
  <div><p class="mono dim">Logomark</p><p>Nine nodes — eight modules held in orbit around a single core.</p></div>
  <div><p class="mono dim">Logotype</p><p>Custom-drawn in the spirit of Funnel Display. “OS” sits at the same weight; it is part of the name, not a suffix.</p></div>
  <div><p class="mono dim">Use</p><p>The horizontal lockup is the default. Use it wherever it fits before reaching for a variant.</p></div>
</div>""")

page("Logomark Anatomy", "Chapter 01 · Logo", f"""
<div class="split">
  <div>
    <h2 class="l">Built from<br>one unit.</h2>
    <p class="body-copy">Every measurement comes from <b>x</b>, the diameter of a single node. The core sits at the exact centre; the eight modules sit on one ring around it, grouped in pairs.</p>
    <div class="facts">
      <div><span class="mono dim">Node</span><b>1x</b></div>
      <div><span class="mono dim">Ring radius</span><b>{RING / (2 * DOT_R):.2f}x</b></div>
      <div><span class="mono dim">Mark width</span><b>{113.01 / (2 * DOT_R):.2f}x</b></div>
      <div><span class="mono dim">Nodes</span><b>8 + 1</b></div>
    </div>
  </div>
  <div class="center">{construction()}</div>
</div>""")

page("Clear Space & Size", "Chapter 01 · Logo", f"""
<h2 class="l">Give it room to hold.</h2>
<div class="grid2 top">
  <div class="panel clear">
    <div class="clear-box">{LOCK('lockup')}</div>
    <p class="mono dim cap">Clear space = 1x on every side, where x is one node</p>
  </div>
  <div class="panel sizes">
    <div class="size-row"><div class="sz" style="width:96px">{LOCK()}</div><p><b>Lockup</b><br><span class="dim">Min. 96 px · 25 mm</span></p></div>
    <div class="size-row"><div class="sz" style="width:24px">{MARK()}</div><p><b>Logomark</b><br><span class="dim">Min. 16 px · 6 mm</span></p></div>
    <div class="size-row"><div class="sz" style="width:160px">{WORD()}</div><p><b>Logotype alone</b><br><span class="dim">Min. 72 px · 20 mm</span></p></div>
  </div>
</div>""")

page("Variants", "Chapter 01 · Logo", f"""
<h2 class="l">Four arrangements. One identity.</h2>
<div class="grid4 variants">
  <div class="panel v"><div class="vart">{LOCK()}</div><p class="mono dim">A · Horizontal — default</p></div>
  <div class="panel v"><div class="vart stack">{MARK('m')}{WORD('w')}</div><p class="mono dim">B · Stacked — square formats</p></div>
  <div class="panel v"><div class="vart solo">{MARK()}</div><p class="mono dim">C · Logomark — icons, avatars</p></div>
  <div class="panel v"><div class="vart">{WORD()}</div><p class="mono dim">D · Logotype — editorial, legal</p></div>
</div>""")

page("Colour Versions", "Chapter 01 · Logo", f"""
<h2 class="l">Black or white. Nothing else.</h2>
<div class="grid4 grounds">
  <div class="g" style="background:#F7F6F3;color:#0B0B0B">{MARK()}<p class="mono">Black on Warm White · primary</p></div>
  <div class="g" style="background:#0B0B0B;color:#F7F6F3">{MARK()}<p class="mono">Warm White on Black · primary</p></div>
  <div class="g" style="background:#8A877E;color:#0B0B0B">{MARK()}<p class="mono">Black on Neutral 400</p></div>
  <div class="g img" style="color:#F7F6F3">{halftone('field', 300, 8, '#55534C')}{MARK('over')}<p class="mono">White over image · check contrast</p></div>
</div>""")

MISUSE = [
    ("Don't add colour", "<div class='x-art'>" + MARK() + "<span class='swatch-x'></span></div>"),
    ("Don't rotate or skew", f"<div class='x-art' style='transform:rotate(-18deg) skewX(12deg)'>{MARK()}</div>"),
    ("Don't rearrange the nodes", "<div class='x-art'><svg viewBox='0 0 113 113' fill='currentColor'>" +
     "".join(f"<circle cx='{x}' cy='{y}' r='11.13'/>" for x, y in [(20, 20), (56, 14), (95, 30), (30, 60), (70, 52), (98, 80), (16, 98), (56, 96), (84, 104)]) + "</svg></div>"),
    ("Don't add effects", f"<div class='x-art' style='filter:drop-shadow(6px 8px 6px rgba(0,0,0,.45))'>{MARK()}</div>"),
    ("Don't outline", "<div class='x-art'><svg viewBox='0 0 113 113' fill='none' stroke='currentColor' stroke-width='2.5'>" +
     "".join(f"<circle cx='{x}' cy='{y}' r='10'/>" for x, y in NODES + [(CTR, CTR)]) + "</svg></div>"),
    ("Don't stretch", f"<div class='x-art' style='transform:scaleX(1.6)'>{MARK()}</div>"),
]
cells = "".join(f"<div class='panel mis'>{art}<p><i class='no'>✕</i>{t}</p></div>" for t, art in MISUSE)
page("Misuse", "Chapter 01 · Logo", f"""
<h2 class="l">The core never bends.</h2>
<div class="grid3 misuse">{cells}</div>""")

# ---- 02 COLOUR
divider("02", "Colour", "We have no colour on purpose. Neutrality is a position.", "11–14")

found = "".join(
    f"<div class='sw' style='background:{h};color:{'#F7F6F3' if lum(h) < .2 else '#0B0B0B'}'>"
    f"<div><b>{n}</b><p>{d}</p></div><div class='specs'>{spec(h)}</div></div>" for n, h, d in COLOURS)
page("Foundation", "Chapter 02 · Colour", f"""
<div class="split narrow">
  <div>
    <h2 class="l">Function<br>over name.</h2>
    <p class="body-copy">BrandingOS is black, white and grey. Colour belongs to the brands that live inside it — an operating system with its own colour would compete with every brand it holds.</p>
    <p class="body-copy strong">The only colour on the screen should be yours.</p>
  </div>
  <div class="found">{found}</div>
</div>""")

neut = "".join(
    f"<div class='nrow' style='background:{h};color:{'#F7F6F3' if lum(h) < .2 else '#0B0B0B'}'>"
    f"<span class='mono'>{k}</span><b>{d}</b><span class='mono'>{h}</span><span class='mono'>RGB {' '.join(map(str, rgb(h)))}</span>"
    f"<span class='mono'>CMYK {' '.join(map(str, cmyk(h)))}</span></div>" for k, h, d in NEUTRALS)
page("Neutral Scale", "Chapter 02 · Colour", f"""
<div class="split narrow">
  <div>
    <h2 class="l">Six greys.<br>No hue, ever.</h2>
    <p class="body-copy">The neutral scale is warm by a few degrees, so the page reads as paper rather than screen. Each step has a job — pick by function, not by taste.</p>
  </div>
  <div class="neutrals">{neut}</div>
</div>""")

PAIRS = [("#0B0B0B", "#F7F6F3"), ("#F7F6F3", "#0B0B0B"), ("#55534C", "#F7F6F3"),
         ("#8A877E", "#0B0B0B"), ("#C9C5BC", "#2C2B27"), ("#8A877E", "#F7F6F3")]
pairs = "".join(
    f"<div class='pair' style='background:{bg};color:{fg}'><b>Aa</b><span class='mono'>{contrast(fg, bg):.1f}:1 · "
    f"{'AAA' if contrast(fg, bg) >= 7 else 'AA' if contrast(fg, bg) >= 4.5 else 'AA Large' if contrast(fg, bg) >= 3 else 'Decorative only'}</span></div>"
    for fg, bg in PAIRS)
page("Proportion & Contrast", "Chapter 02 · Colour", f"""
<h2 class="l">Mostly space. Some structure. A little grey.</h2>
<div class="ratio">
  <div style="flex:60;background:#F7F6F3;color:#0B0B0B"><b>60%</b><span class="mono">Warm White</span></div>
  <div style="flex:30;background:#0B0B0B;color:#F7F6F3"><b>30%</b><span class="mono">Core Black</span></div>
  <div style="flex:10;background:#8A877E;color:#0B0B0B"><b>10%</b><span class="mono">Neutrals</span></div>
</div>
<div class="grid6 pairs">{pairs}</div>""")

# ---- 03 TYPE
divider("03", "Typography", "Structure outside. Freedom inside.", "15–18")

page("Typefaces", "Chapter 03 · Typography", """
<div class="grid3 faces">
  <div class="face"><p class="mono dim">Display</p><div class="spec-big fd">Aa</div><h3>Funnel Display</h3><p class="dim">Headlines, statements, the logotype's voice. Bold 700, tight tracking −4%.</p><p class="glyphs fd">ABCDEFGHIJKLM<br>abcdefghijklm<br>0123456789</p></div>
  <div class="face"><p class="mono dim">Text</p><div class="spec-big fs">Aa</div><h3>Funnel Sans</h3><p class="dim">Body, interface, captions. Regular 400 at 1.45 line height; Italic 300 for editorial asides.</p><p class="glyphs fs">ABCDEFGHIJKLM<br>abcdefghijklm<br>0123456789</p></div>
  <div class="face"><p class="mono dim">Technical</p><div class="spec-big dt">Aa</div><h3>Doto</h3><p class="dim">Dot-matrix labels, page numbers, states. Uppercase, tracking +20%. Never for sentences.</p><p class="glyphs dt">ABCDEFGHIJKLM<br>abcdefghijklm<br>0123456789</p></div>
</div>""")

SCALE = [("Display", "fd", 88, "One Core.", "Funnel Display 700 · 88/0.95 · −4%"),
         ("Heading 1", "fd", 56, "Every brand begins here.", "Funnel Display 700 · 56/1.0 · −3%"),
         ("Heading 2", "fd", 36, "A system of decisions.", "Funnel Display 700 · 36/1.1 · −2%"),
         ("Body L", "fs", 22, "Build, manage and evolve your brand from one core.", "Funnel Sans 400 · 22/1.45"),
         ("Body", "fs", 16, "Strategy shapes voice. Voice shapes content. Identity shapes experience.", "Funnel Sans 400 · 16/1.5"),
         ("Label", "dt", 14, "NODE 05 · STILL STATE", "Doto 700 · 14 · +20% · uppercase")]
scale = "".join(f"<div class='srow'><span class='mono dim'>{n}</span><p class='{c}' style='font-size:{s}px'>{t}</p><span class='mono dim'>{m}</span></div>"
                for n, c, s, t, m in SCALE)
page("Type Scale", "Chapter 03 · Typography", f"<div class='scale'>{scale}</div>")

page("Type Expression", "Chapter 03 · Typography", """
<div class="expr">
  <p class="fd e1">ONE CORE.</p>
  <p class="fd e2">FORM</p>
  <p class="fd e3">FORMATION</p>
  <p class="dt e4">FORMATIONS</p>
</div>
<div class="grid3 rules">
  <div><p class="mono dim">Do</p><p>Set headlines in sentence case, tight, and end them with a full stop. They are statements.</p></div>
  <div><p class="mono dim">Do</p><p>Use grey on the second line to show hierarchy inside one thought.</p></div>
  <div><p class="mono dim">Don't</p><p>Mix more than two weights on a page, or set body text in Doto.</p></div>
</div>""", "dark")

# ---- 04 GRAPHIC SYSTEM
divider("04", "Graphic System", "Grid, dot, formation and matter.", "19–23")

cols = "".join("<div></div>" for _ in range(12))
page("Grid · 12 Col", "Chapter 04 · Graphic System", f"""
<div class="gridviz">{cols}</div>
<div class="split grid-copy">
  <div>
    <h2 class="l">A system<br>needs structure.</h2>
    <p class="body-copy">Everything sits on a 12-column grid. Typography obeys it; expression is allowed to challenge it. Structure is what makes deviation legible.</p>
  </div>
  <div class="facts right">
    <div><span class="mono dim">Columns</span><b>12</b></div>
    <div><span class="mono dim">Margin</span><b>64 px</b></div>
    <div><span class="mono dim">Gutter</span><b>24 px</b></div>
    <div><span class="mono dim">Base unit</span><b>4 px</b></div>
  </div>
</div>""", "light", "gridpage")

page("The Dot", "Chapter 04 · Graphic System", """
<div class="split">
  <div>
    <h2 class="l">A dot always<br>means something.</h2>
    <p class="body-copy">A dot marks a node, a state, a selection or a signal. Never use dots simply to make something feel branded.</p>
    <div class="dotwords mono"><span>Connection</span><span>Node</span><span>State</span><span>Input</span><span>Selection</span><span>Output</span><span>Signal</span><span>Formation</span></div>
  </div>
  <div class="grid2 top">
    <div class="panel dotok"><p class="mono dim">Meaningful</p><div class="states"><p><i class="s on"></i>Active workspace</p><p><i class="s"></i>Draft, not published</p><p><i class="s half"></i>In review</p></div></div>
    <div class="panel dotno"><p class="mono dim">Decorative</p><div class="deco"></div><p class="dim small">Pattern with nothing to say.</p></div>
  </div>
</div>""")

page("Formations", "Chapter 04 · Graphic System", f"""
<h2 class="l">Form is temporary. Logic is permanent.</h2>
<div class="grid3 forms">
  <div class="panel f dark">{MARK()}<p class="mono">F01 · Still</p></div>
  <div class="panel f dark">{halftone('ring', 300, 10)}<p class="mono">F02 · Orbit</p></div>
  <div class="panel f dark">{halftone('sphere', 300, 8)}<p class="mono">F03 · Volume</p></div>
  <div class="panel f dark">{halftone('field', 300, 8)}<p class="mono">F04 · Field</p></div>
  <div class="panel f dark">{halftone('gradient', 300, 12)}<p class="mono">F05 · Signal</p></div>
  <div class="panel f dark"><p class="dt big-dt">OS</p><p class="mono">F06 · Type mask</p></div>
</div>""")

page("Imagery", "Chapter 04 · Graphic System", f"""
<div class="split">
  <div>
    <h2 class="l">Brand matter.</h2>
    <p class="body-copy">Images are monochrome, grained and halftoned — matter, not stock. They show material, depth and movement, never people pretending to work.</p>
    <div class="dolist"><p><b>Use</b> halftone, grain, macro texture, soft volume, deep blacks.</p><p><b>Avoid</b> colour photography, stock scenes, gradients with hue, glossy 3D.</p></div>
  </div>
  <div class="grid2 top imgs">
    <div class="im">{halftone('sphere', 300, 7)}</div>
    <div class="im">{halftone('field', 300, 7)}</div>
    <div class="im">{halftone('ring', 300, 7)}</div>
    <div class="im solid"><div class="orb"></div></div>
  </div>
</div>""", "dark")

# ---- 05 APPLICATIONS
divider("05", "Applications", "Product, print, social, web. The proof.", "24–28")

page("Stationery", "Chapter 05 · Applications", f"""
<div class="stationery">
  <div class="card front">{MARK('m')}<p class="mono">brandingos.ai</p></div>
  <div class="card back"><div><b>Name Surname</b><p class="dim">Role</p></div><div class="mono small">hello@brandingos.ai<br>brandingos.ai</div>{LOCK('cl')}</div>
  <div class="letter">
    <div class="lh">{LOCK()}<span class="mono dim">30 · 09 · 2026</span></div>
    <div class="lines"><b>Re: Your brand core</b><i></i><i></i><i class="short"></i><i></i><i></i><i class="shorter"></i></div>
    <div class="lf mono dim">BrandingOS · One core. Infinite formations.</div>
  </div>
</div>
<p class="mono dim cap">Business card 85 × 55 mm · Letterhead A4 · Warm White stock, black print</p>""")

page("App Icon & Avatar", "Chapter 05 · Applications", f"""
<h2 class="l">The mark at its smallest.</h2>
<div class="icons">
  <div class="ic"><div class="appicon">{MARK()}</div><p class="mono dim">App icon · 1024</p></div>
  <div class="ic"><div class="appicon light">{MARK()}</div><p class="mono dim">Light variant</p></div>
  <div class="ic"><div class="avatar">{MARK()}</div><p class="mono dim">Social avatar</p></div>
  <div class="ic fav"><div class="favs"><span style="width:64px;height:64px">{MARK()}</span><span style="width:32px;height:32px">{MARK()}</span><span style="width:16px;height:16px">{MARK()}</span></div><p class="mono dim">Favicon · 64 / 32 / 16</p></div>
</div>
<div class="loader"><div class="lm">{MARK()}</div><p class="body-copy">The mark is also the product's loader: the ring fades in sequence while the core holds. At rest it turns slowly — it is never replaced by a generic spinner.</p></div>""")

page("Social", "Chapter 05 · Applications", f"""
<h2 class="l">Consistency without repetition.</h2>
<div class="posts">
  <div class="post dk"><p class="fd pt">A brand is not a logo.</p></div>
  <div class="post lt">{MARK('pm')}</div>
  <div class="post im">{halftone('sphere', 300, 8)}</div>
  <div class="post wh"><p class="mono dim">Principle 03</p><p class="fs pt2">Consistency without repetition.</p></div>
  <div class="post dk"><p class="dt pt3">SAME CORE<br>NEW FORM</p></div>
</div>
<p class="mono dim cap">Three modes — system, formation, expression. One brand.</p>""")

page("Web", "Chapter 05 · Applications", f"""
<div class="browser">
  <div class="bar"><i></i><i></i><i></i><span class="mono">brandingos.ai</span></div>
  <div class="site">
    <nav>{LOCK('nl')}<span class="mono dim">Product</span><span class="mono dim">System</span><span class="mono dim">Studio</span><span class="mono dim">Pricing</span><b class="btn">Build your core</b></nav>
    <div class="herosite">
      <div><h1 class="fd">Your brand,<br>operating as<br>one system.</h1><p class="dim">Build, manage and evolve your entire brand from one intelligent core.</p><div class="ctas"><b class="btn">Build your Brand Core</b><b class="btn ghost">See how it works</b></div></div>
      <div class="heroart">{halftone('sphere', 300, 7)}</div>
    </div>
  </div>
</div>""", "dark")

# ---- 06 VOICE
divider("06", "Voice", "Calm, clear, structural. We sound like the system we build.", "29–31")

page("Principles", "Chapter 06 · Voice", """
<div class="principles">
  <div><span class="mono dim">01</span><h2>Clarity over noise.</h2><p class="dim">Say the thing. One idea per sentence.</p></div>
  <div><span class="mono dim">02</span><h2>Systems enable creativity.</h2><p class="dim">Rules are how freedom scales, not what limits it.</p></div>
  <div><span class="mono dim">03</span><h2>Consistency without repetition.</h2><p class="dim">Same core, new words. Never a template voice.</p></div>
  <div><span class="mono dim">04</span><h2>Evolution without dilution.</h2><p class="dim">Change the form. Keep the meaning.</p></div>
  <div><span class="mono dim">05</span><h2>Human judgment at the Core.</h2><p class="dim">AI assists. People decide. We say so.</p></div>
</div>""")

EX = [("Welcome back!! Ready to supercharge your brand today?", "Welcome back. Your brand core is in sync."),
      ("Oops! Something went wrong. Please try again later.", "We couldn't save that change. Nothing was lost — try again."),
      ("Unleash limitless creativity with our AI-powered magic!", "Generate on-brand designs from your own colours, type and logo."),
      ("Revolutionary all-in-one branding solution.", "One place for everything your brand is.")]
ex = "".join(f"<div class='ex'><p class='bad'>{a}</p><p class='good'>{b}</p></div>" for a, b in EX)
page("Writing", "Chapter 06 · Voice", f"""
<div class="exhead"><span class="mono dim">We don't write</span><span class="mono">We write</span></div>
<div class="examples">{ex}</div>""")

page("End", "Thank you", f"""
<div class="closing">
  <div class="cover-lockup small">{MARK('m')}{WORD('w')}</div>
  <p class="dim">The operating system for modern brands.</p>
</div>
<div class="cover-foot mono">One core. Infinite formations.</div>""", "dark", "is-cover")

# ================================================================ CSS
CSS = r"""
@page { size: 1440px 810px; margin: 0; }
*{box-sizing:border-box;margin:0;padding:0}
:root{--black:#0B0B0B;--white:#F7F6F3;--pure:#fff;--n100:#EFEEE8;--n200:#E6E4DD;--n300:#C9C5BC;--n400:#8A877E;--n500:#55534C;--n600:#2C2B27}
html,body{background:#1e1e1e}
body{font-family:'Funnel Sans',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1440px;height:810px;position:relative;overflow:hidden;page-break-after:always;break-after:page;padding:40px 48px;display:flex;flex-direction:column}
.page.light{background-color:var(--white);color:var(--black);background-image:radial-gradient(circle,rgba(11,11,11,.09) 1px,transparent 1.2px);background-size:22px 22px}
.page.dark{background-color:#0E0E0E;color:var(--white);background-image:radial-gradient(circle,rgba(247,246,243,.06) 1px,transparent 1.2px),radial-gradient(ellipse at 20% 30%,#1a1a19 0%,#0b0b0b 70%);background-size:22px 22px,100% 100%}
header,footer{font-family:'Doto',monospace;font-weight:700;font-size:13px;letter-spacing:.2em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
header{padding-bottom:14px;border-bottom:1px solid rgba(128,128,128,.25);opacity:.8}
footer{padding-top:14px;border-top:1px solid rgba(128,128,128,.25);opacity:.45;margin-top:auto}
.is-cover header,.is-cover footer{border:0}.is-cover footer span:first-child{visibility:hidden}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;margin-left:8px;vertical-align:1px}
.body{flex:1;padding:36px 0 24px;display:flex;flex-direction:column;min-height:0}
.mono{font-family:'Doto',monospace;font-weight:700;letter-spacing:.18em;text-transform:uppercase;font-size:13px}
.dim{opacity:.55}.small{font-size:13px}
.fd{font-family:'Funnel Display',sans-serif;font-weight:700;letter-spacing:-.035em}
.fs{font-family:'Funnel Sans',sans-serif}.dt{font-family:'Doto',monospace;font-weight:800}
h1,h2,h3{font-family:'Funnel Display',sans-serif;font-weight:700;letter-spacing:-.035em;line-height:1}
h2.l{font-size:52px;margin-bottom:28px}
h1.xl{font-size:104px;line-height:.95}
.grey{color:var(--n400)}
p{font-size:17px;line-height:1.5}
.body-copy{font-size:19px;line-height:1.5;max-width:470px;margin-top:22px;opacity:.75}
.body-copy.strong{opacity:1}
.split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;flex:1}
.split.narrow{grid-template-columns:.8fr 1.2fr}
.center{display:flex;justify-content:center}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.grid6{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.panel{border:1px solid rgba(128,128,128,.3);padding:20px;position:relative}
.light .panel{background:rgba(255,255,255,.45)}
.cap{margin-top:16px}
/* cover */
.cover{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px}
.cover-lockup{display:flex;align-items:center;gap:34px;color:var(--white)}
.cover-lockup .m{height:118px;width:auto}.cover-lockup .w{height:92px;width:auto;margin-top:6px}
.cover-lockup.small .m{height:84px}.cover-lockup.small .w{height:66px}
.cover-meta{display:flex;gap:80px;padding-left:152px}
.lead{font-size:22px;opacity:.85;max-width:320px}
.cover-foot{position:absolute;left:48px;bottom:44px;opacity:.4}
.closing{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
.closing p{font-size:20px}
/* toc */
.toc{display:grid;grid-template-columns:1fr 330px;gap:60px;flex:1;align-items:center}
.toc-row{display:grid;grid-template-columns:60px 1fr auto;align-items:baseline;border-bottom:1px solid rgba(11,11,11,.14);padding:15px 0}
.toc-row h2{font-size:44px}
.toc-art{background:var(--black);aspect-ratio:1.25;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.toc-art .ht{width:120%;opacity:.9}.toc-art span{position:absolute;left:14px;bottom:12px;color:var(--white);opacity:.7}
.toc-aside p{margin-top:18px;font-size:16px;opacity:.7}
.essence{margin-top:auto}.essence p:not(.mono){margin-top:10px;opacity:.8}
/* divider */
.divider{flex:1;display:flex;justify-content:space-between;align-items:center}
.pixnum{height:210px;width:auto;color:var(--white)}
.divider-text{text-align:right;max-width:560px}
.divider-text h1{font-size:88px}.divider-text p{margin-top:18px;font-size:19px;opacity:.6}
/* logo */
.hero-logo{flex:1;display:flex;align-items:center;justify-content:center}
.hero-logo .lockup{width:760px;height:auto}
.notes p:not(.mono),.rules p:not(.mono){margin-top:10px;opacity:.75}
.cons{width:430px;height:430px}
.cons .guide{fill:none;stroke:var(--black);stroke-dasharray:4 5;stroke-width:1;opacity:.45}
.cons .guide.faint{opacity:.2}
.cons .ray{stroke:var(--black);stroke-width:1;opacity:.35}
.cons .node{fill:var(--black)}
.cons .dim{stroke:var(--black);stroke-width:1.2}
.cons text{font-family:'Doto';font-weight:800;font-size:18px;fill:var(--black)}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:18px 40px;margin-top:36px;max-width:460px}
.facts div{border-top:1px solid rgba(128,128,128,.35);padding-top:10px;display:flex;flex-direction:column;gap:6px}
.facts b{font-family:'Funnel Display';font-size:34px;letter-spacing:-.03em}
.facts.right{justify-self:end;width:460px}
.top{align-items:stretch;flex:1}
.clear{display:flex;flex-direction:column;justify-content:center;align-items:center}
.clear-box{padding:26px;outline:1px dashed rgba(11,11,11,.5);background:repeating-linear-gradient(45deg,rgba(11,11,11,.05) 0 6px,transparent 6px 12px);position:relative}
.clear-box .lockup{width:440px;display:block;background:var(--white)}
.sizes{display:flex;flex-direction:column;justify-content:space-around}
.size-row{display:grid;grid-template-columns:200px 1fr;align-items:center;gap:20px;border-bottom:1px solid rgba(128,128,128,.2);padding:18px 0}
.size-row:last-child{border:0}.sz svg{width:100%;height:auto;display:block}
.variants{flex:1}.v{display:flex;flex-direction:column;justify-content:space-between}
.vart{flex:1;display:flex;align-items:center;justify-content:center;padding:10px}
.vart svg{width:100%;height:auto}.vart.solo svg{width:46%}
.vart.stack{flex-direction:column;gap:18px}.vart.stack .m{width:30%}.vart.stack .w{width:78%}
.grounds{flex:1}.g{display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:24px;position:relative;overflow:hidden}
.g>svg{width:42%;margin:auto}.g p{align-self:flex-start;opacity:.75;position:relative;font-size:12px}
.g.img{background:#141414}.g.img .ht{position:absolute;inset:0;width:100%;height:100%;opacity:.9}
.g.img .over{position:relative;z-index:1}
.misuse{flex:1;grid-template-rows:1fr 1fr}
.mis{display:flex;flex-direction:column;justify-content:space-between;align-items:center}
.x-art{width:110px;height:110px;margin:auto;position:relative;color:var(--black)}.x-art svg{width:100%;height:100%}
.swatch-x{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 7px,rgba(11,11,11,.18) 7px 9px);mix-blend-mode:multiply;border:1.5px dashed var(--black);border-radius:50%}
.mis p{align-self:flex-start;font-size:15px}.no{font-style:normal;display:inline-block;width:22px;height:22px;border-radius:50%;background:var(--black);color:var(--white);text-align:center;line-height:22px;font-size:12px;margin-right:10px}
/* colour */
.found{display:grid;grid-template-rows:1.3fr 1fr 1fr;height:100%;border:1px solid rgba(11,11,11,.14)}
.sw{display:flex;justify-content:space-between;align-items:flex-end;padding:20px 24px}
.sw b{font-family:'Funnel Display';font-size:30px;letter-spacing:-.03em}.sw p{opacity:.65;font-size:15px;margin-top:4px}
.specs{display:flex;flex-direction:column;gap:4px;text-align:right}
.spec{font-family:'Doto';font-weight:700;font-size:13px;letter-spacing:.14em}.spec span{opacity:.5;margin-right:10px}
.neutrals{display:flex;flex-direction:column;height:100%}
.nrow{flex:1;display:grid;grid-template-columns:60px 1fr 110px 150px 170px;align-items:center;padding:0 22px}
.nrow b{font-weight:500;font-size:18px}.nrow .mono{font-size:12px;opacity:.8}
.ratio{display:flex;height:220px;border:1px solid rgba(11,11,11,.14)}
.ratio div{display:flex;flex-direction:column;justify-content:space-between;padding:20px}
.ratio b{font-family:'Funnel Display';font-size:44px;letter-spacing:-.03em}
.pairs{margin-top:22px;flex:1}.pair{display:flex;flex-direction:column;justify-content:space-between;padding:18px;border:1px solid rgba(11,11,11,.1)}
.pair b{font-family:'Funnel Display';font-size:64px;letter-spacing:-.03em}.pair .mono{font-size:11px}
/* type */
.faces{flex:1}.face{border-top:1px solid rgba(11,11,11,.2);padding-top:14px;display:flex;flex-direction:column;gap:10px}
.spec-big{font-size:150px;line-height:1}.spec-big.fd{font-family:'Funnel Display';font-weight:700;letter-spacing:-.04em}
.spec-big.fs{font-family:'Funnel Sans';font-weight:400}.spec-big.dt{font-family:'Doto';font-weight:800}
.face h3{font-size:30px}.face p.dim{font-size:15px;max-width:360px}
.glyphs{font-size:22px;line-height:1.35;margin-top:auto}.glyphs.fd{font-weight:600;letter-spacing:-.02em}
.scale{display:flex;flex-direction:column;justify-content:space-between;flex:1}
.srow{display:grid;grid-template-columns:140px 1fr 330px;align-items:center;border-bottom:1px solid rgba(11,11,11,.12);padding:10px 0;gap:20px}
.srow p{line-height:1.05;white-space:nowrap;overflow:hidden}.srow .mono{font-size:11px}
.expr{flex:1;display:flex;flex-direction:column;justify-content:center}
.expr p{line-height:1}.e1{font-size:96px}.e2{font-size:84px;font-weight:300 !important;color:var(--n400)}.e3{font-size:76px;letter-spacing:.14em !important;color:var(--n300)}.e4{font-size:72px;letter-spacing:.06em}
.rules{border-top:1px solid rgba(247,246,243,.15);padding-top:22px}
/* graphic */
.gridpage .body{position:relative}
.gridviz{position:absolute;inset:0 0 0 0;display:grid;grid-template-columns:repeat(12,1fr);gap:24px;pointer-events:none}
.gridviz div{background:rgba(11,11,11,.045);border-left:1px solid rgba(11,11,11,.08);border-right:1px solid rgba(11,11,11,.08)}
.grid-copy{position:relative}
.dotwords{display:grid;grid-template-columns:1fr 1fr;gap:12px 40px;margin-top:40px;font-size:16px;max-width:420px}
.dotok,.dotno{display:flex;flex-direction:column}
.states{margin:auto 0;display:flex;flex-direction:column;gap:16px}.states p{display:flex;align-items:center;gap:12px}
.s{width:11px;height:11px;border-radius:50%;border:1.5px solid var(--black);display:inline-block}.s.on{background:var(--black)}.s.half{background:linear-gradient(90deg,var(--black) 50%,transparent 50%)}
.deco{flex:1;margin:20px 0;background-image:radial-gradient(circle,rgba(11,11,11,.45) 2px,transparent 2.4px);background-size:16px 16px;opacity:.7}
.forms{flex:1;min-height:0;grid-template-rows:repeat(2,minmax(0,1fr))}.f.dark .ht{max-height:88%;width:auto !important;height:88%}
.f.dark{background:#0E0E0E;color:var(--white);display:flex;align-items:center;justify-content:center;overflow:hidden;border:0}
.f.dark>svg{width:44%;height:auto}.f.dark .ht{width:78%}
.f p.mono{position:absolute;left:16px;bottom:12px;opacity:.6;font-size:11px}
.big-dt{font-size:150px;letter-spacing:.02em}
.dolist{margin-top:30px;display:flex;flex-direction:column;gap:12px;max-width:470px}.dolist p{opacity:.8}
.imgs{grid-template-rows:repeat(2,minmax(0,1fr));height:600px;align-self:center}.im .ht{height:100%;width:auto !important}
.im{background:#070707;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(247,246,243,.08)}.im .ht{width:100%}
.orb{width:62%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 34% 30%,#6b6963 0%,#2a2926 40%,#0b0b0b 72%);box-shadow:inset 0 0 0 1px rgba(247,246,243,.18)}
/* applications */
.stationery{flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:34px;align-items:center}
.card{aspect-ratio:85/55;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 20px 40px -18px rgba(0,0,0,.35)}
.card.front{background:var(--black);color:var(--white);align-items:center;justify-content:center;position:relative}
.card.front .m{width:64px}.card.front p{position:absolute;bottom:16px;left:20px;font-size:10px;opacity:.6}
.card.back{background:var(--pure);color:var(--black);position:relative}.card.back b{font-size:18px}.card.back .small{font-size:10px;letter-spacing:.14em}
.card.back .cl{position:absolute;right:20px;top:22px;width:110px}
.letter{background:var(--pure);aspect-ratio:210/297;height:560px;justify-self:center;padding:30px;display:flex;flex-direction:column;box-shadow:0 20px 40px -18px rgba(0,0,0,.35)}
.lh{display:flex;justify-content:space-between;align-items:center}.lh svg{width:140px}.lh .mono{font-size:9px}
.lines{margin-top:60px;display:flex;flex-direction:column;gap:11px}.lines b{font-size:13px;margin-bottom:8px}
.lines i{height:5px;background:var(--n200);display:block}.lines i.short{width:70%}.lines i.shorter{width:40%}
.lf{margin-top:auto;font-size:8px}
.icons{display:flex;gap:40px;align-items:flex-end;margin:auto 0}
.ic{display:flex;flex-direction:column;align-items:center;gap:14px}
.appicon{width:180px;height:180px;border-radius:40px;background:var(--black);color:var(--white);display:flex;align-items:center;justify-content:center}
.appicon svg{width:48%}.appicon.light{background:var(--pure);color:var(--black);border:1px solid var(--n200)}
.avatar{width:180px;height:180px;border-radius:50%;background:var(--black);color:var(--white);display:flex;align-items:center;justify-content:center}.avatar svg{width:44%}
.favs{display:flex;gap:26px;align-items:flex-end;height:180px}.favs span{display:block;color:var(--black)}.favs svg{width:100%;height:100%}
.loader{margin-top:auto;display:flex;align-items:center;gap:30px;border-top:1px solid rgba(11,11,11,.14);padding-top:22px}
.lm{width:70px;height:70px}.lm svg{width:100%}.loader .body-copy{margin:0;max-width:760px;font-size:17px}
.posts{flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:16px;align-items:center}
.post{aspect-ratio:4/5;padding:20px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;position:relative}
.post.dk{background:var(--black);color:var(--white)}.post.lt{background:var(--n200);align-items:center;justify-content:center}
.post.wh{background:var(--pure);justify-content:space-between}.post.im{background:#0B0B0B;align-items:center;justify-content:center}
.post .pm{width:52%}.post .ht{width:120%}
.pt{font-size:30px;line-height:1.02}.pt2{font-size:22px;line-height:1.2}.pt3{font-size:26px;letter-spacing:.08em;opacity:.8}
.browser{flex:1;border:1px solid rgba(247,246,243,.18);display:flex;flex-direction:column;background:#0A0A0A}
.bar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(247,246,243,.1)}
.bar i{width:10px;height:10px;border-radius:50%;background:var(--n600)}.bar span{margin-left:20px;font-size:11px;opacity:.6}
.site{flex:1;display:flex;flex-direction:column;padding:0 36px}
.site nav{display:flex;align-items:center;gap:30px;padding:18px 0;border-bottom:1px solid rgba(247,246,243,.1)}
.site nav .nl{width:150px;margin-right:auto;color:var(--white)}.site nav .mono{font-size:11px}
.btn{font-weight:500;font-size:14px;background:var(--white);color:var(--black);padding:11px 18px;display:inline-block}
.btn.ghost{background:transparent;color:var(--white);border:1px solid rgba(247,246,243,.5)}
.herosite{flex:1;display:grid;grid-template-columns:1.1fr 1fr;align-items:center}
.herosite h1{font-size:68px;line-height:.98}.herosite p{margin:20px 0 26px;font-size:18px;max-width:420px}
.ctas{display:flex;gap:12px}.heroart{display:flex;justify-content:center}.heroart .ht{width:78%}
/* voice */
.principles{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.principles div{display:grid;grid-template-columns:60px 1fr 440px;align-items:baseline;border-bottom:1px solid rgba(11,11,11,.14);padding-bottom:14px}
.principles h2{font-size:42px}
.exhead{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding-bottom:14px;border-bottom:1px solid rgba(11,11,11,.2)}
.examples{flex:1;display:flex;flex-direction:column;justify-content:space-around}
.ex{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.bad{font-size:20px;color:var(--n400);text-decoration:line-through;text-decoration-thickness:1px}
.good{font-family:'Funnel Display';font-weight:700;font-size:28px;letter-spacing:-.025em;line-height:1.15}
"""

HTML = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>BrandingOS — Brand Guidelines</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Doto:wght@400;700;800&family=Funnel+Display:wght@300;400;600;700;800&family=Funnel+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&display=block" rel="stylesheet">
<style>{CSS}</style></head><body>{render_pages()}</body></html>"""

OUT.write_text(HTML)
print(f"wrote {OUT} · {len(PAGES)} pages")
