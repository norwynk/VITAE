"""OSW stop-motion launch film.

Renders a 15 s, 1080x1920 stop-motion video from the two OSW flyers in ./source,
with a synthesized soundtrack (see sound.py). Animation is shot "on ones" at 12 fps
with per-frame hand jitter, light flicker and paper grain, then encoded at 24 fps.

    python3 render.py            # -> osw-stop-motion.mp4
    python3 render.py --stills   # also dumps key frames to ./stills
"""
import hashlib
import math
import os
import subprocess
import sys
from functools import lru_cache

import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import sound

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
FPS = 12
TOTAL = 180  # 15 s

INK = (22, 20, 18, 255)
GOLD = (156, 116, 72, 255)
GREY = (70, 66, 62, 255)
BG_TOP = np.array([247, 243, 237], np.float32)
BG_BOT = np.array([236, 229, 219], np.float32)

def ffmpeg_bin():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    import imageio_ffmpeg  # pip install imageio-ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


EVENTS = []  # (kind, frame) collected for the soundtrack


def ev(kind, frame):
    EVENTS.append((kind, frame))


# ---------------------------------------------------------------- utilities
def font(name, size):
    return ImageFont.truetype(os.path.join(HERE, "fonts", name + ".ttf"), size)


def rnd(*key):
    """Deterministic pseudo-random in [-1, 1] for a key (stable across runs)."""
    h = hashlib.md5(repr(key).encode()).digest()
    return int.from_bytes(h[:4], "little") / 2**31 - 1.0


@lru_cache(maxsize=None)
def text_img(s, fname, size, color, tracking=0):
    """Text on a metric box (advance width x ascent+descent) so glyphs share a baseline
    and centring by the image centre spaces them by advance, not ink bounds."""
    f = font(fname, size)
    widths = [f.getlength(c) for c in s] if tracking else None
    adv = sum(widths) + tracking * (len(s) - 1) if tracking else f.getlength(s)
    asc, desc = f.getmetrics()
    pad = size // 3  # room for italic overhang; symmetric so the centre stays put
    im = Image.new("RGBA", (round(adv) + 2 * pad, asc + desc), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if tracking:
        x = pad
        for c, w in zip(s, widths):
            d.text((x, 0), c, font=f, fill=color)
            x += w + tracking
    else:
        d.text((pad, 0), s, font=f, fill=color)
    return im


def fit_size(s, fname, size, max_w):
    while font(fname, size).getlength(s) > max_w and size > 10:
        size -= 2
    return size


def place(canvas, img, cx, cy, scale=1.0, rot=0.0, key=None, frame=0, jit=1.0, alpha=1.0):
    """Composite img centred at (cx, cy) with per-frame hand jitter."""
    if key is not None:
        cx += rnd(key, frame, "x") * 2.2 * jit
        cy += rnd(key, frame, "y") * 2.2 * jit
        rot += rnd(key, frame, "r") * 0.35 * jit
    if scale != 1.0:
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    if abs(rot) > 0.01:
        img = img.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1.0:
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda a: int(a * alpha)))
    canvas.alpha_composite(img, (round(cx - img.width / 2), round(cy - img.height / 2)))


def steps(local, seq):
    """Keyframed stop-motion: seq[i] is the pose at local frame i, holding the last."""
    if local < 0:
        return None
    return seq[min(local, len(seq) - 1)]


# ------------------------------------------------------------------ assets
SRC_A = Image.open(os.path.join(HERE, "source", "flyer-test-plan-deliver.webp")).convert("RGB")
SRC_B = Image.open(os.path.join(HERE, "source", "flyer-perimenopause.webp")).convert("RGB")
CROPS = {
    "box": (SRC_A, (330, 850, 820, 1225)),
    "mood": (SRC_A, (255, 1005, 405, 1235)),
    "prog": (SRC_A, (645, 1055, 778, 1262)),
    "oest": (SRC_A, (778, 1055, 908, 1262)),
    "test": (SRC_A, (905, 1050, 1040, 1258)),
    "pouch": (SRC_A, (0, 975, 340, 1235)),
    "scene": (SRC_A, (0, 845, 1055, 1300)),
    "woman": (SRC_B, (120, 520, 1010, 1250)),
    "pen": (SRC_B, (60, 1115, 600, 1225)),
}


@lru_cache(maxsize=None)
def card(name, width, radius=26, border=10):
    """A photo print: rounded, warm-white border, soft contact shadow."""
    src, box = CROPS[name]
    im = src.crop(box)
    iw = width - 2 * border
    ih = round(im.height * iw / im.width)
    im = im.resize((iw, ih), Image.LANCZOS)
    cw, ch = width, ih + 2 * border
    pad = 60
    out = Image.new("RGBA", (cw + 2 * pad, ch + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("L", out.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((pad + 6, pad + 18, pad + cw - 6, pad + ch + 10), radius, fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    out.putalpha(sh)
    out = Image.merge("RGBA", (*Image.new("RGB", out.size, (60, 45, 30)).split(), sh))
    body = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle((0, 0, cw - 1, ch - 1), radius, fill=(252, 250, 246, 255))
    mask = Image.new("L", (iw, ih), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, iw - 1, ih - 1), max(4, radius - border), fill=255)
    body.paste(im, (border, border), mask)
    out.alpha_composite(body, (pad, pad))
    return out


@lru_cache(maxsize=None)
def pill(s):
    t = text_img(s, "bodoni500", 44, INK)
    pw, ph = t.width + 64, t.height + 40
    pad = 30
    out = Image.new("RGBA", (pw + 2 * pad, ph + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("L", out.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((pad + 4, pad + 10, pad + pw - 4, pad + ph + 6), ph // 2, fill=80)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    out = Image.merge("RGBA", (*Image.new("RGB", out.size, (60, 45, 30)).split(), sh))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((pad, pad, pad + pw, pad + ph), ph // 2, fill=(252, 250, 246, 255),
                        outline=(156, 116, 72, 120), width=2)
    out.alpha_composite(t, (pad + 32, pad + (ph - t.height) // 2))
    return out


def leaf_shadow():
    """Blurred foliage shadow, like the window light in the flyers."""
    im = Image.new("L", (W + 200, H + 200), 0)
    d = ImageDraw.Draw(im)
    rng = np.random.default_rng(7)
    for bx, by, ang in [(1150, 120, 200), (1100, 700, 190), (-40, 1500, 330)]:
        for i in range(26):
            t = i / 25
            a = math.radians(ang + rng.uniform(-8, 8))
            x = bx + math.cos(a) * 700 * t
            y = by + math.sin(a) * 700 * t + 60 * math.sin(t * 5)
            side = 1 if i % 2 else -1
            la = a + side * math.radians(rng.uniform(40, 70))
            lx, ly = x + math.cos(la) * 70, y + math.sin(la) * 70
            pts = []
            for k in range(20):
                u = k / 19 * math.pi * 2
                r1, r2 = 70, 22
                px, py = math.cos(u) * r1, math.sin(u) * r2
                pts.append((lx + px * math.cos(la) - py * math.sin(la), ly + px * math.sin(la) + py * math.cos(la)))
            d.polygon(pts, fill=255)
            d.line([(x, y), (lx, ly)], fill=255, width=4)
    im = im.filter(ImageFilter.GaussianBlur(26))
    return np.asarray(im, np.float32) / 255.0


LEAF = leaf_shadow()
_yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
BASE = BG_TOP * (1 - _yy) + BG_BOT * _yy
BASE = np.broadcast_to(BASE, (H, W, 3)).copy()
_xx = np.linspace(-1, 1, W, dtype=np.float32)[None, :]
_vy = np.linspace(-1, 1, H, dtype=np.float32)[:, None]
VIGNETTE = (1 - 0.10 * (_xx**2 + _vy**2) ** 1.2)[..., None]
# a soft warm key light from the upper right
KEY = (1 + 0.035 * np.exp(-(((_xx - 0.6) ** 2) / 0.6 + ((_vy + 0.7) ** 2) / 0.5)))[..., None]


def background(frame):
    ox = 100 + int(rnd("leaf", frame // 2, "x") * 5) + frame // 6
    oy = 100 + int(rnd("leaf", frame // 2, "y") * 5)
    leaf = LEAF[oy:oy + H, ox:ox + W][..., None]
    return BASE * (1 - 0.075 * leaf) * VIGNETTE * KEY


def finish(rgb, frame):
    """Light flicker + boiling paper grain, the tell of real stop motion."""
    rng = np.random.default_rng(1000 + frame)
    flick = 1 + rng.normal(0, 0.006)
    grain = rng.normal(0, 3.2, (H // 2, W // 2)).astype(np.float32)
    grain = np.repeat(np.repeat(grain, 2, 0), 2, 1)[..., None]
    return np.clip(rgb * flick + grain, 0, 255).astype(np.uint8)


# ----------------------------------------------------------------- drawing
def draw_logo(c, lf, cy, big=260, key="logo", speed=3):
    """OSW wordmark, letters dropped in one at a time."""
    f = font("bodoni500", big)
    letters = "OSW"
    widths = [f.getlength(ch) for ch in letters]
    kern = 0.05 * big
    total = sum(widths) + kern * 2
    x = W / 2 - total / 2
    drop = [-150, 26, -8, 0]
    for i, ch in enumerate(letters):
        t0 = 1 + i * speed
        p = steps(lf - t0, drop)
        if p is not None:
            if lf == t0:
                ev("tap", FRAME[0])
            place(c, text_img(ch, "bodoni500", big, INK), x + widths[i] / 2, cy + p, key=(key, i), frame=FRAME[0])
        x += widths[i] + kern
    return 1 + 3 * speed


def draw_tracked_typein(c, lf, s, fname, size, color, cx, cy, t0, per_frame, tracking, key):
    n = int(max(0, lf - t0 + 1) * per_frame)
    if n <= 0:
        return
    full = text_img(s, fname, size, color, tracking)
    if n < len(s):
        part = text_img(s[:n], fname, size, color, tracking)
        # left-align the partial string to where the full string will sit
        place(c, part, cx - full.width / 2 + part.width / 2, cy + (full.height - part.height) / 2 * 0,
              key=key, frame=FRAME[0], jit=0.6)
        if (lf - t0) % 2 == 0:
            ev("tick", FRAME[0])
    else:
        place(c, full, cx, cy, key=key, frame=FRAME[0], jit=0.6)


def hairline(c, lf, cy, t0, width, color=GOLD, n=5):
    k = steps(lf - t0, [i / n for i in range(1, n + 1)])
    if k is None:
        return
    w = width * k
    d = ImageDraw.Draw(c)
    d.line([(W / 2 - w / 2, cy), (W / 2 + w / 2, cy)], fill=color, width=2)


def stamp(c, img, cx, cy, lf, t0, key, rot=0.0):
    p = steps(lf - t0, [1.22, 0.96, 1.01, 1.0])
    if p is None:
        return
    if lf == t0:
        ev("tap", FRAME[0])
    place(c, img, cx, cy, scale=p, rot=rot, key=key, frame=FRAME[0])


def word_line(c, lf, words, fname, size, color, cy, t0, gap_frames, key, space=None):
    """Lay words of one line down one at a time, each stamped into place."""
    f = font(fname, size)
    space = space if space is not None else f.getlength(" ")
    imgs = [text_img(w, fname, size, color) for w in words]
    advs = [f.getlength(w) for w in words]
    total = sum(advs) + space * (len(words) - 1)
    x = W / 2 - total / 2
    for i, im in enumerate(imgs):
        stamp(c, im, x + advs[i] / 2, cy, lf, t0 + i * gap_frames, (key, i))
        x += advs[i] + space


def circle_draw(c, lf, cx, cy, r, t0, color=GOLD, width=3):
    ang = steps(lf - t0, [70, 160, 250, 330, 360])
    if ang is None:
        return
    d = ImageDraw.Draw(c)
    j = rnd("circ", cx, cy, FRAME[0]) * 1.2
    d.arc((cx - r + j, cy - r, cx + r + j, cy + r), -90, -90 + ang, fill=color, width=width)


def icon(c, lf, kind, cx, cy, s, t0):
    """Line icons from the flyer (drop, document, box), drawn stroke by stroke."""
    n = lf - t0 + 1
    if n <= 0:
        return
    d = ImageDraw.Draw(c)
    col, w = GOLD, 4
    segs = []
    if kind == "drop":
        pts = []
        for k in range(41):
            u = k / 40 * 2 * math.pi
            x = math.sin(u) * (1 - math.cos(u)) * 0.5
            y = -math.cos(u)
            pts.append((cx + x * s * 0.9, cy + y * s * 0.62 + s * 0.05))
        per = 10
        for i in range(4):
            segs.append(pts[i * per:(i + 1) * per + 1])
        segs.append([(cx - s * 0.2, cy + s * 0.2), (cx - s * 0.12, cy + s * 0.4)])
    elif kind == "doc":
        x0, y0, x1, y1 = cx - s * 0.42, cy - s * 0.55, cx + s * 0.42, cy + s * 0.55
        fo = s * 0.22
        segs.append([(x0, y0), (x1 - fo, y0), (x1, y0 + fo), (x1, y1)])
        segs.append([(x1, y1), (x0, y1), (x0, y0)])
        segs.append([(x1 - fo, y0), (x1 - fo, y0 + fo), (x1, y0 + fo)])
        for k in range(4):
            yy = y0 + s * (0.36 + k * 0.17)
            segs.append([(x0 + s * 0.16, yy), (x1 - s * 0.16 - (s * 0.2 if k == 3 else 0), yy)])
    elif kind == "box":
        a = s * 0.5
        top = [(cx, cy - a * 0.95), (cx + a, cy - a * 0.45), (cx, cy + a * 0.05), (cx - a, cy - a * 0.45), (cx, cy - a * 0.95)]
        segs.append(top)
        segs.append([(cx - a, cy - a * 0.45), (cx - a, cy + a * 0.6), (cx, cy + a * 1.1), (cx + a, cy + a * 0.6), (cx + a, cy - a * 0.45)])
        segs.append([(cx, cy + a * 0.05), (cx, cy + a * 1.1)])
        segs.append([(cx - a * 0.5, cy - a * 0.7), (cx + a * 0.5, cy - a * 0.2), (cx + a * 0.5, cy + a * 0.15)])
    for sg in segs[:n * 2]:
        jx = rnd("ic", kind, FRAME[0], "x") * 0.9
        d.line([(x + jx, y) for x, y in sg], fill=col, width=w, joint="curve")


def wrap(s, fname, size, max_w):
    f = font(fname, size)
    lines, cur = [], ""
    for word in s.split():
        t = (cur + " " + word).strip()
        if f.getlength(t) > max_w and cur:
            lines.append(cur)
            cur = word
        else:
            cur = t
    lines.append(cur)
    return lines


def caption(c, lf, s, cy, t0, key, size=40, color=GREY):
    lines = wrap(s, "bodoni400", size, 900)
    for i, ln in enumerate(lines):
        p = steps(lf - t0 - i, [18, 4, 0])
        if p is None:
            continue
        if lf - t0 - i == 0:
            ev("tick", FRAME[0])
        place(c, text_img(ln, "bodoni400", size, color), W / 2, cy + i * size * 1.35 + p,
              key=(key, i), frame=FRAME[0], jit=0.5)


def card_in(c, lf, name, width, path, key, onion=True):
    """Hand-placed print: keyed path of (x, y, rot); onion-skin ghosts while moving."""
    k = lf
    if k < 0:
        return
    img = card(name, width)
    if onion and 0 < k < len(path):
        for g, a in ((2, 0.10), (1, 0.22)):
            if k - g >= 0:
                x, y, r = path[k - g]
                place(c, img, x, y, rot=r, alpha=a)
    x, y, r = path[min(k, len(path) - 1)]
    if k == len(path) - 1:
        ev("place", FRAME[0])
    elif k == 0:
        ev("swish", FRAME[0])
    place(c, img, x, y, rot=r, key=key, frame=FRAME[0])


# ------------------------------------------------------------------ scenes
# frame ranges; every boundary lands on an eighth note (4 frames at 90 bpm)
S1, S2, S3, S4, S5, S6 = (0, 20), (20, 48), (48, 76), (76, 136), (136, 156), (156, 180)


def scene1(c, lf):
    draw_logo(c, lf, 860)
    hairline(c, lf, 1000, 9, 560)
    draw_tracked_typein(c, lf, "ONE STOP WELLNESS", "mont400", 40, INK, W / 2, 1060, 10, 3, 9, "s1tag")


def scene2(c, lf):
    hs = fit_size("YOU’RE NOT LOSING", "bodoni600", 120, 960)
    word_line(c, lf, ["YOU’RE", "NOT", "LOSING"], "bodoni600", hs, INK, 620, 1, 2, "l1")
    word_line(c, lf, ["YOUR", "MIND."], "bodoni600", hs, INK, 745, 7, 2, "l2")
    word_line(c, lf, ["IT", "COULD", "BE"], "bodoni600", hs, INK, 900, 12, 1, "l3")
    s = "PERIMENOPAUSE."
    size = fit_size(s, "bodoni500i", 150, 980)
    n = min(len(s), 2 * (lf - 16 + 1))
    if n > 0:
        # reveal the kerned word two letters a frame behind a wipe slanted with the italic
        full = text_img(s, "bodoni500i", size, GOLD)
        asc, desc = font("bodoni500i", size).getmetrics()
        xcut = size // 3 + font("bodoni500i", size).getlength(s[:n]) + (0 if n < len(s) else size)
        sl = math.tan(math.radians(14))
        mask = Image.new("L", full.size, 0)
        ImageDraw.Draw(mask).polygon([(0, 0), (xcut + sl * asc, 0), (xcut - sl * desc, full.height), (0, full.height)], fill=255)
        part = full.copy()
        part.putalpha(Image.fromarray(np.minimum(np.asarray(full.getchannel("A")), np.asarray(mask))))
        pulse = steps(lf - 16 - (len(s) + 1) // 2 + 1, [1.03, 0.995, 1.0]) or 1.0
        if n < len(s):
            pulse = 1.0
            ev("tap", FRAME[0])
        place(c, part, W / 2, 1075, scale=pulse, key="peri", frame=FRAME[0], jit=0.8)
    if lf == 16:
        ev("thump", FRAME[0])
    hairline(c, lf, 1200, 23, 220)


def scene3(c, lf):
    path = [(540, 2150, -9), (540, 1600, -6), (540, 1150, -3), (540, 930, -0.5), (540, 955, -1.8), (540, 950, -1.4)]
    card_in(c, lf, "woman", 900, path, "woman")
    tags = [("Brain fog.", 250, 440, -4), ("Mood swings.", 800, 520, 3), ("Anxiety.", 220, 1360, 3),
            ("Poor sleep.", 820, 1420, -3), ("Low libido.", 520, 1560, 1.5)]
    for i, (s, x, y, r) in enumerate(tags):
        p = steps(lf - (7 + i * 2), [0.55, 1.12, 0.96, 1.0])
        if p is not None:
            if lf == 7 + i * 2:
                ev("pop", FRAME[0])
            place(c, pill(s), x, y, scale=p, rot=r, key=("tag", i), frame=FRAME[0])
    p = steps(lf - 19, [30, 6, 0])
    if p is not None:
        if lf == 19:
            ev("tick", FRAME[0])
        place(c, text_img("We come to you.", "bodoni400i", 66, GOLD), W / 2, 1745 + p, key="wcty", frame=FRAME[0])


BEATS = [
    ("01", "drop", "TEST.", INK, "bodoni600",
     "We draw blood and send it to the lab to see what your hormones are really doing."),
    ("02", "doc", "PLAN.", GOLD, "bodoni600i",
     "A bespoke plan built from your results — supplements and proper hormone replacement therapy."),
    ("03", "box", "DELIVER.", INK, "bodoni600",
     "Treatment and supplements delivered monthly, so you stay supported without the guesswork."),
]


def scene4(c, lf):
    b = min(lf // 20, 2)
    bl = lf - b * 20
    num, ic, word, col, fname, cap = BEATS[b]
    circle_draw(c, bl, 540, 250, 40, 0, width=2)
    if bl >= 1:
        place(c, text_img(num, "bodoni400", 38, GOLD), 540, 250, key=("num", b), frame=FRAME[0], jit=0.5)
    circle_draw(c, bl, 540, 400, 78, 1)
    icon(c, bl, ic, 540, 400, 70, 2)
    size = fit_size(word, fname, 190, 960)
    stamp(c, text_img(word, fname, size, col), W / 2, 590, bl, 3, ("word", b))
    if bl == 3:
        ev("thump", FRAME[0])
    caption(c, bl, cap, 730, 6, ("cap", b))
    if b == 0:
        path = [(1500, 1250, 8), (1150, 1240, 5), (800, 1250, 2), (560, 1245, -0.5), (540, 1250, -1.2), (540, 1248, -1)]
        card_in(c, bl - 4, "box", 800, path, "boxc")
    elif b == 1:
        items = [("mood", 150), ("prog", 245), ("oest", 245), ("test", 245)]
        xs = [150, 400, 660, 920]
        for i, (n, _) in enumerate(items):
            r = rnd("bot", i) * 3.5
            y0 = 1270 + (i % 2) * 30
            path = [(xs[i], -260, r * 3), (xs[i], y0 - 160, r * 1.5), (xs[i], y0 + 18, r), (xs[i], y0, r)]
            card_in(c, bl - 4 - i * 2, n, 240, path, ("bot", i), onion=False)
    else:
        path = [(-400, 1150, -6), (40, 1150, -4), (330, 1150, -2), (370, 1152, -3), (365, 1150, -2.6)]
        card_in(c, bl - 4, "pouch", 560, path, "pouchc")
        path = [(1600, 1520, 5), (1100, 1510, 3), (700, 1505, 1), (620, 1500, 1.8), (625, 1500, 1.5)]
        card_in(c, bl - 7, "pen", 820, path, "penc")


def scene5(c, lf):
    words = [("TEST.", "bodoni600", INK), ("PLAN.", "bodoni600i", GOLD), ("DELIVER.", "bodoni600", INK)]
    size = fit_size("TEST. PLAN. DELIVER.", "bodoni600", 124, 900)
    imgs = [text_img(w, f, size, col) for w, f, col in words]
    advs = [font(f, size).getlength(w) for w, f, col in words]
    gap = font("bodoni600", size).getlength(" ")
    total = sum(advs) + gap * 2
    x = W / 2 - total / 2
    for i, im in enumerate(imgs):
        stamp(c, im, x + advs[i] / 2, 560, lf, 1 + i * 2, ("s5w", i))
        x += advs[i] + gap
    p = steps(lf - 8, [24, 5, 0])
    if p is not None:
        if lf == 8:
            ev("tick", FRAME[0])
        place(c, text_img("A clearer way through perimenopause.", "bodoni400", 54, INK), W / 2, 690 + p,
              key="s5sub", frame=FRAME[0], jit=0.5)
    path = [(540, 1240, 0, 0.72), (540, 1230, 0, 0.9), (540, 1220, 0, 1.03), (540, 1220, 0, 0.995), (540, 1220, 0, 1.0)]
    k = lf - 3
    if k >= 0:
        x_, y_, r_, s_ = path[min(k, len(path) - 1)]
        if k == 0:
            ev("swish", FRAME[0])
        if k == len(path) - 1:
            ev("place", FRAME[0])
        place(c, card("scene", 1000, radius=30, border=12), x_, y_, scale=s_, rot=r_ - 0.6, key="scene", frame=FRAME[0])


def scene6(c, lf):
    draw_logo(c, lf, 780, big=280, key="logo2", speed=2)
    if lf == 7:
        ev("chime", FRAME[0])
    draw_tracked_typein(c, lf, "ONE STOP WELLNESS", "mont400", 42, INK, W / 2, 965, 6, 6, 10, "s6tag")
    hairline(c, lf, 1030, 7, 600, n=3)
    p = steps(lf - 9, [16, 3, 0])
    if p is not None:
        place(c, text_img("Peptides & hormone pathways.", "bodoni400", 44, GREY), W / 2, 1090 + p, key="pep", frame=FRAME[0], jit=0.5)
    p = steps(lf - 11, [16, 3, 0])
    if p is not None:
        if lf == 11:
            ev("tick", FRAME[0])
        place(c, text_img("We come to you.", "bodoni400i", 66, GOLD), W / 2, 1240 + p, key="wcty2", frame=FRAME[0])
    draw_tracked_typein(c, lf, "A PHILOSOPHY OF BECOMING.", "mont400", 28, GOLD, W / 2, 1690, 13, 6, 14, "phil")
    hairline(c, lf, 1650, 13, 380, n=3)
    p = steps(lf - 16, [10, 0])
    if p is not None:
        place(c, text_img("Individual assessment may be required before starting.", "bodoni400", 28, GREY),
              W / 2, 1770 + p, key="disc", frame=FRAME[0], jit=0.4)


SCENES = [(S1, scene1), (S2, scene2), (S3, scene3), (S4, scene4), (S5, scene5), (S6, scene6)]
FRAME = [0]
# the last two frames of a scene lift the whole set off-camera (a hand clearing the table)
EXIT = [(-40, 0.0), (-420, 0.0)]


def render_frame(f):
    FRAME[0] = f
    bg = background(f)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for (a, b), fn in SCENES:
        if a <= f < b:
            lf = f - a
            # beat changes inside the three-step section also clear the table
            sub_end = b
            if fn is scene4:
                sub_end = a + (min(lf // 20, 2) + 1) * 20
            fn(layer, lf)
            if fn is not scene6 and f >= sub_end - 2:
                dy = EXIT[f - (sub_end - 2)][0]
                if f == sub_end - 2:
                    ev("whoosh", f)
                moved = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                moved.alpha_composite(layer.crop((0, max(0, -dy), W, H)), (0, 0))
                layer = moved
    rgb = bg.astype(np.float32)
    arr = np.asarray(layer, np.float32)
    al = arr[..., 3:4] / 255.0
    rgb = rgb * (1 - al) + arr[..., :3] * al
    return finish(rgb, f)


def main():
    stills = "--stills" in sys.argv
    out_video = os.path.join(HERE, "osw-stop-motion.mp4")
    silent = os.path.join(HERE, ".video_only.mp4")
    wav = os.path.join(HERE, ".soundtrack.wav")
    if stills:
        os.makedirs(os.path.join(HERE, "stills"), exist_ok=True)
    ff = subprocess.Popen(
        [ffmpeg_bin(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-framerate", str(FPS), "-i", "-", "-vf", "fps=24", "-c:v", "libx264", "-preset", "slow",
         "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", silent],
        stdin=subprocess.PIPE)
    for f in range(TOTAL):
        fr = render_frame(f)
        ff.stdin.write(fr.tobytes())
        if stills and f % 4 == 0:
            Image.fromarray(fr).resize((W // 3, H // 3)).save(os.path.join(HERE, "stills", f"f{f:03d}.png"))
    ff.stdin.close()
    ff.wait()
    events = sorted(set(EVENTS), key=lambda e: e[1])
    sound.render(wav, TOTAL / FPS, [(k, fr / FPS) for k, fr in events])
    subprocess.run([ffmpeg_bin(), "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", out_video], check=True)
    os.remove(silent)
    os.remove(wav)
    print("wrote", out_video, "events:", len(events))


if __name__ == "__main__":
    main()
