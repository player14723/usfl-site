"""Editorial stills — illustrative compositions (contour · halftone · glass · lattice · ribbon · journey).
All ILLUSTRATIVE: none of these pretend to be client photography. Outputs WebP (+ -sm) into ../public/images."""
import sys, os, math, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from lib import *

OUT = "../public/images"
os.makedirs(OUT, exist_ok=True)
PAPER = np.array([245, 245, 242], np.float32) / 255
INKC = np.array([8, 10, 13], np.float32) / 255
GREEN = np.array([74, 115, 0], np.float32) / 255
FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "node_modules") + "/"
DISP = FD + "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2"
MONO = FD + "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"


def vg(fld, amp, X, Y, tf=0.0):
    Xf, Yf = X.reshape(-1), Y.reshape(-1)
    arg = 2 * np.pi * (np.outer(Xf, fld.K[:, 0]) + np.outer(Yf, fld.K[:, 1])) + (2 * np.pi * fld.om * tf + fld.ph)
    s = np.sin(arg) @ (fld.amp * amp)
    c = np.cos(arg) * (fld.amp * amp * 2 * np.pi)
    return s, c @ fld.K[:, 0], c @ fld.K[:, 1]


def vig_(w, h, s=.5):
    return vignette(w, h, strength=s)


def contour(w, h, seed, light=False, spacing=.05, focus=(.65, .45), band=True, big=(.55, 1.6), bandc=None):
    fld = Field(seed, n=6, kmin=big[0], kmax=big[1]); det = Field(seed + 50, n=6, kmin=2.6, kmax=5.5)
    X, Y = grid(w, h)
    a, ax, ay = vg(fld, 1.0, X, Y); b, bx, by = vg(det, .13, X, Y)
    psi = (a + b).reshape(h, w); gx = (ax + bx).reshape(h, w); gy = (ay + by).reshape(h, w)
    f = psi / spacing
    g = np.sqrt(gx * gx + gy * gy) / spacing / h + 1e-6
    lvl = np.round(f); d = np.abs(f - lvl) / g
    idx = (lvl.astype(np.int32) % 5 == 0)
    scale = h / 720.0
    hw = np.where(idx, 1.05, .55) * scale
    line = np.clip(hw + .5 - d, 0, 1)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    rad = np.sqrt(((xs / w - focus[0])) ** 2 * (w / h) ** 2 + (ys / h - focus[1]) ** 2)
    env = (0.18 + 0.82 * np.exp(-rad * 1.9)).astype(np.float32)
    bandm = np.exp(-((lvl - (rng(seed).uniform(-6, 6))) / 2.2) ** 2) if band else 0
    if light:
        base = PAPER[None, None].copy() * np.ones((h, w, 3), np.float32)
        ink = INKC * (line * env * np.where(idx, .55, .3))[..., None]
        gr = (bandc if bandc is not None else GREEN) * (line * bandm * .95)[..., None] if band else 0
        img = base * (1 - (line * env * np.where(idx, .55, .3))[..., None] * .9)
        if band: img = img * (1 - (line * bandm)[..., None]) + GREEN * (line * bandm)[..., None]
        img = img * vig_(w, h, .12) + grain((h, w), seed, .008)
        return img
    bg = np.ones((h, w, 3), np.float32) * INK + np.array([.010, .022, .030], np.float32) * np.exp(-rad * 2.4)[..., None]
    img = bg + COOL * (line * env * np.where(idx, .55, .26))[..., None]
    if band: img = img + (bandc if bandc is not None else LIME) * (line * bandm * 1.1)[..., None]
    lights = np.clip(img - bg, 0, None)
    img = bg + lights + bloom(lights, ((2.2 * scale, .5), (8 * scale, .5), (26 * scale, .4))) * .55
    img = tonemap(img, 1.25) * vig_(w, h, .6) + grain((h, w), seed, .010)
    return img


def halftone(w, h, seed, light=False, sp=None):
    r = rng(seed)
    sp = sp or max(12, int(h / 60))
    fld = Field(seed, n=5, kmin=.4, kmax=1.3)
    X, Y = grid(w, h)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    v = vg(fld, 1.0, X, Y)[0].reshape(h, w)
    fall = np.exp(-(((xs / w - .68) * (w / h)) ** 2 + (ys / h - .42) ** 2) * 2.2)
    field = np.clip(.5 + .55 * v, 0, 1) * (.25 + .75 * fall)
    # a lit path: sine band crossing the field
    px = xs / w
    path = h * (.62 + .17 * np.sin(px * 5.2 + seed) + .05 * np.sin(px * 13 + 1))
    onp = np.exp(-((ys - path) / (h * .025)) ** 2) * (px > .12) * (px < .9)
    SSc = 2
    ms = np.zeros((h * SSc, w * SSc), np.uint8); ml = np.zeros_like(ms)
    for gy in range(sp // 2, h, sp):
        for gx in range(sp // 2, w, sp):
            val = field[gy, gx]
            rr = (sp * .48) * (val ** .8)
            if rr < .5: continue
            tgt = ml if onp[gy, gx] > .5 else ms
            cv2.circle(tgt, (gx * SSc, gy * SSc), int(rr * SSc), 255, -1, cv2.LINE_AA)
    ms = cv2.resize(ms, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    ml = cv2.resize(ml, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    if light:
        img = PAPER * np.ones((h, w, 3), np.float32)
        img = img * (1 - ms[..., None] * .92) + INKC * ms[..., None] * .92
        img = img * (1 - ml[..., None]) + GREEN * ml[..., None]
        return img * vig_(w, h, .1) + grain((h, w), seed, .008)
    bg = np.ones((h, w, 3), np.float32) * INK + np.array([.012, .02, .026], np.float32) * fall[..., None]
    lights = COOL * ms[..., None] * .8 + LIME * ml[..., None] * 1.2
    img = bg + lights + bloom(lights, ((3, .4), (12, .4), (34, .35))) * .5
    return tonemap(img, 1.15) * vig_(w, h, .55) + grain((h, w), seed, .010)


def glass(w, h, seed, tint=(0, 1, 0)):
    r = rng(seed)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.ones((h, w, 3), np.float32) * INK
    cols = [CYAN * .6, np.array([.10, .25, .42], np.float32), LIME * .35, np.array([.35, .5, .6], np.float32), np.array([.06, .14, .2], np.float32)]
    for i in range(7):
        cx, cy = r.uniform(0, w), r.uniform(0, h); rad = r.uniform(.14, .42) * h
        c = cols[i % len(cols)] * r.uniform(.25, .7)
        img += np.exp(-(((xs - cx) ** 2 + (ys - cy) ** 2) / (2 * rad * rad)))[..., None] * c * .55
    # long glass edges: thin bright diagonals with chromatic split
    lines = np.zeros((h, w, 3), np.float32)
    for i in range(4):
        x0 = r.uniform(-.1, 1.1) * w; ang = r.uniform(-.55, -.25)
        for ch, off in enumerate((-3, 0, 3)):
            m = np.zeros((h * 2, w * 2), np.uint8)
            cv2.line(m, (int((x0 + off) * 2), 0), (int((x0 + off + math.tan(ang) * h * -1) * 2), h * 2), int(r.uniform(90, 255)), 2, cv2.LINE_AA)
            lines[..., ch] += cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255 * (.5 if ch != 1 else .8)
    lines *= np.array([.9, 1.0, 1.0], np.float32)
    img = img + lines * .5 + bloom(lines, ((6, .5), (24, .6), (70, .5))) * .8
    img = tonemap(img, 1.35) * vig_(w, h, .6) + grain((h, w), seed, .012)
    return img



def arcs(w, h, seed, center=(1.05, .55)):
    r = rng(seed); SSc = 2
    cx, cy = w * center[0], h * center[1]
    mw = np.zeros((h * SSc, w * SSc), np.uint8); ml = np.zeros_like(mw); mn = np.zeros_like(mw)
    base = h * .16
    step = h * .0135
    lit = set(r.choice(np.arange(8, 58), 4, replace=False).tolist())
    sc = h / 720.0
    for k in range(64):
        rad = base + k * step * (1 + k * .012)
        a0 = r.uniform(0, 360); span = r.uniform(70, 330)
        tgt = ml if k in lit else mw
        val = 255 if k in lit else int(r.uniform(50, 150))
        cv2.ellipse(tgt, (int(cx * SSc), int(cy * SSc)), (int(rad * SSc), int(rad * SSc)), 0, a0, a0 + span, val, max(1, int(SSc * (1.6 if k in lit else 1) * sc)), cv2.LINE_AA)
        if k % 6 == 0 or k in lit:
            for j in range(int(r.integers(1, 3))):
                ang = math.radians(a0 + r.uniform(0, span))
                px, py = cx + rad * math.cos(ang), cy + rad * math.sin(ang)
                cv2.circle(mn, (int(px * SSc), int(py * SSc)), int((3 + 3 * (k in lit)) * SSc * sc), 255, -1, cv2.LINE_AA)
    f = lambda m: cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    mw, ml, mn = f(mw), f(ml), f(mn)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    rad = np.sqrt(((xs - cx) / h) ** 2 + ((ys - cy) / h) ** 2)
    bg = np.ones((h, w, 3), np.float32) * INK + np.array([.012, .026, .034], np.float32) * np.exp(-((rad - .5) / .35) ** 2)[..., None]
    lights = COOL * mw[..., None] * .5 + LIME * ml[..., None] * 1.0 + LIME * mn[..., None] * 1.3
    img = bg + lights + bloom(lights, ((2 * sc, .5), (9 * sc, .5), (30 * sc, .45))) * .6
    return tonemap(img, 1.2) * vig_(w, h, .55) + grain((h, w), seed, .010)


def planes(w, h, seed):
    r = rng(seed)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    bg = np.ones((h, w, 3), np.float32) * INK + np.array([.014, .028, .038], np.float32) * np.exp(-(((xs / w - .55) * 1.4) ** 2 + ((ys / h - .5)) ** 2) * 3)[..., None]
    img = bg.copy()
    n = 6
    specs = []
    for i in range(n):
        pw = r.uniform(.28, .52) * w; ph = r.uniform(.22, .42) * h
        specs.append(dict(x=r.uniform(.05, .95) * w - pw / 2, y=r.uniform(.08, .92) * h - ph / 2, w=pw, h=ph, z=r.uniform(0, 1)))
    specs.sort(key=lambda s: s['z'])
    sc = h / 720.0
    for i, s_ in enumerate(specs):
        m = np.zeros((h * 2, w * 2), np.uint8)
        rr = int(18 * 2 * sc)
        x0, y0, x1, y1 = [int(v * 2) for v in (s_['x'], s_['y'], s_['x'] + s_['w'], s_['y'] + s_['h'])]
        cv2.rectangle(m, (x0 + rr, y0), (x1 - rr, y1), 255, -1); cv2.rectangle(m, (x0, y0 + rr), (x1, y1 - rr), 255, -1)
        for cx_, cy_ in ((x0 + rr, y0 + rr), (x1 - rr, y0 + rr), (x0 + rr, y1 - rr), (x1 - rr, y1 - rr)):
            cv2.circle(m, (cx_, cy_), rr, 255, -1, cv2.LINE_AA)
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        edge = m - cv2.erode(m, np.ones((3, 3), np.uint8))
        blur_s = (1 - s_['z']) * 5 * sc
        col = [COOL, np.array([.35, .55, .75], np.float32), LIME * .9][i % 3] if i != n - 2 else LIME
        grad = np.clip(1 - (ys - s_['y']) / max(s_['h'], 1), 0, 1)
        fill = (m * (.05 + .12 * grad))[..., None] * col
        e = (edge * (.35 + .5 * s_['z']))[..., None] * col
        layer = fill + e
        if blur_s > .6: layer = blur(layer, blur_s)
        img = img * (1 - m[..., None] * .35) + layer * 1.4
        # a little "interface" content: a few bars
        for b in range(3):
            by = s_['y'] + s_['h'] * (.22 + .18 * b)
            bx0 = s_['x'] + s_['w'] * .1; bx1 = bx0 + s_['w'] * r.uniform(.25, .7)
            bar = np.zeros((h, w), np.float32)
            cv2.line(bar, (int(bx0), int(by)), (int(bx1), int(by)), 1.0, max(1, int(2 * sc)), cv2.LINE_AA)
            bar = blur(bar, blur_s * .7 + .3) if blur_s > .6 else bar
            img += bar[..., None] * col * (.25 + .3 * s_['z'])
    lights = np.clip(img - bg, 0, None)
    img = bg + lights + bloom(lights, ((4 * sc, .4), (18 * sc, .45), (50 * sc, .35))) * .5
    return tonemap(img, 1.3) * vig_(w, h, .6) + grain((h, w), seed, .011)


def lattice(w, h, seed):
    r = rng(seed); SSc = 2
    hy = h * .40
    ms = np.zeros((h * SSc, w * SSc), np.uint8); ml = np.zeros_like(ms); mn = np.zeros_like(ms)
    vp = (w * .58, hy)
    # rays
    for i in range(-40, 41):
        x = w * .58 + i * w * .09
        cv2.line(ms, (int(vp[0] * SSc), int(vp[1] * SSc)), (int(x * SSc * 2.2 - vp[0] * SSc * 1.2), h * SSc), 70, 1, cv2.LINE_AA)
    # horizontals with perspective spacing
    k = 0
    y = hy + 6
    step = 10
    while y < h:
        cv2.line(ms, (0, int(y * SSc)), (w * SSc, int(y * SSc)), int(30 + 90 * (y - hy) / (h - hy)), 1, cv2.LINE_AA)
        step *= 1.22; y += step
    # nodes on a few rays/rows, chained into a path
    pts = []
    for j in range(11):
        t = j / 10
        yy = hy + (h - hy) * (.06 + .86 * t ** 1.3)
        xx = vp[0] + (r.uniform(-1, 1) * .42 + math.sin(t * 3.2 + seed) * .3) * (yy - hy) * 1.6
        pts.append((xx, yy))
    for a, b in zip(pts, pts[1:]):
        cv2.line(ml, (int(a[0] * SSc), int(a[1] * SSc)), (int(b[0] * SSc), int(b[1] * SSc)), 230, 2, cv2.LINE_AA)
    for i, (xx, yy) in enumerate(pts):
        s = 3 + 9 * ((yy - hy) / (h - hy))
        cv2.circle(mn, (int(xx * SSc), int(yy * SSc)), int(s * SSc), 255, -1, cv2.LINE_AA)
        cv2.circle(ms, (int(xx * SSc), int(yy * SSc)), int(s * 2.4 * SSc), 120, 1, cv2.LINE_AA)
    f = lambda m: cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    ms, ml, mn = f(ms), f(ml), f(mn)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    horizon = np.exp(-((ys - hy) / (h * .09)) ** 2) * np.exp(-((xs - w * .58) / (w * .5)) ** 2)
    bg = np.ones((h, w, 3), np.float32) * INK + np.array([.02, .045, .055], np.float32) * horizon[..., None] * 1.4
    lights = COOL * ms[..., None] * .55 + LIME * ml[..., None] * .9 + LIME * mn[..., None] * 1.3
    img = bg + lights + bloom(lights, ((2, .5), (9, .5), (32, .45))) * .6
    return tonemap(img, 1.2) * vig_(w, h, .6) + grain((h, w), seed, .010)


def ribbon(w, h, seed=3, ang=.6, tilt=.35, size=.34, cx=.55, cy=.5, lime_bias=1.0):
    r = rng(seed)
    NS_, NW = 2600, 26
    s = np.linspace(0, 2 * np.pi, NS_, endpoint=False)
    P = np.stack([np.sin(s) + 2 * np.sin(2 * s), np.cos(s) - 2 * np.cos(2 * s), -np.sin(3 * s)], -1)
    T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    ref = np.stack([np.zeros_like(s), np.zeros_like(s), np.ones_like(s)], -1)
    Nn = np.cross(T, ref); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9
    B = np.cross(T, Nn); tw = s * 1.5
    Nt = Nn * np.cos(tw)[:, None] + B * np.sin(tw)[:, None]
    u = np.linspace(-1, 1, NW)
    pts = (P[:, None, :] + .34 * Nt[:, None, :] * u[None, :, None]).reshape(-1, 3) + r.normal(0, .012, (NS_ * NW, 3))
    sidx = np.repeat(s, NW)
    normal = np.repeat(np.cross(T, Nt), NW, axis=0)
    lime_w = np.clip(np.cos(sidx - 4.0) * .9 + .1, 0, 1) ** 2 * lime_bias
    cyan_w = np.clip(np.cos(sidx - 1.0) * .9 + .1, 0, 1) ** 2
    col = (COOL[None] * .8 + LIME[None] * lime_w[:, None] * .9 + CYAN[None] * cyan_w[:, None] * .3).astype(np.float32)
    F, D = h * size * 3.4, 9.0
    ca, sa = math.cos(ang), math.sin(ang); ct, st = math.cos(tilt), math.sin(tilt)
    x = pts[:, 0] * ca + pts[:, 2] * sa; z = -pts[:, 0] * sa + pts[:, 2] * ca
    y = pts[:, 1] * ct - z * st; z = pts[:, 1] * st + z * ct
    k = F / (D - z)
    sx, sy = w * cx + x * k, h * cy + y * k
    depth = np.clip((z + 3.2) / 6.4, 0, 1)
    nz = -normal[:, 0] * sa + normal[:, 2] * ca
    fres = .35 + .65 * (1 - np.abs(nz)) ** 1.5
    I = (.10 + .32 * fres) * (.35 + .9 * depth)
    cw = col * I[:, None]
    xi, yi = sx.astype(np.int32), sy.astype(np.int32)
    near = depth > .5
    sc = h / 720.0
    ln = splat((h, w), xi[near], yi[near], cw[near]); lf = splat((h, w), xi[~near], yi[~near], cw[~near])
    lights = blur(ln, .7 * sc) * 1.35 + blur(lf, 1.6 * sc) * 1.6
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    rad = np.sqrt(((xs / w - cx)) ** 2 * (w / h) ** 2 + (ys / h - cy) ** 2)
    bg = np.ones((h, w, 3), np.float32) * INK + np.array([.012, .024, .03], np.float32) * np.exp(-rad * 3.0)[..., None]
    img = bg + lights + bloom(lights * .8, ((3 * sc, .35), (12 * sc, .4), (34 * sc, .4))) * 1.0
    return tonemap(img, 1.3) * vig_(w, h, .6) + grain((h, w), seed, .009)


def save(name, arr, sm=True, quality=80):
    a = to8(arr)
    im = Image.fromarray(a)
    im.save(f"{OUT}/{name}.webp", quality=quality, method=6)
    if sm:
        w, h = im.size
        im.resize((w // 2, h // 2), Image.LANCZOS).save(f"{OUT}/{name}-sm.webp", quality=quality, method=6)
    print("saved", name, im.size, os.path.getsize(f"{OUT}/{name}.webp") // 1024, "KB", flush=True)


def journey_still(w, h, tf):
    import work
    fr = work.frame(tf)
    return cv2.resize(fr, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255


def og():
    base = ribbon(1200, 630, seed=3, ang=.9, tilt=.3, size=.36, cx=.72, cy=.5)
    im = Image.fromarray(to8(base)); d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype(DISP, 84); f2 = ImageFont.truetype(MONO, 20)
    d.text((70, 210), "usfl", font=f1, fill=(243, 246, 248))
    d.text((72, 320), "USABLE SOLUTIONS FOR LIFE", font=f2, fill=(200, 255, 61))
    d.text((72, 360), "South Africa's only Klaviyo Gold Partner", font=f2, fill=(170, 179, 188))
    im.save(f"{OUT}/og.jpg", quality=86)


JOBS = {
    "problem-a": lambda: halftone(1600, 1000, 4),
    "problem-b": lambda: arcs(1000, 1300, 8, center=(1.1, .5)),
    "problem-c": lambda: contour(1600, 1000, 12, spacing=.045),
    "cap-experience": lambda: planes(1200, 1500, 21),
    "cap-intelligence": lambda: contour(1800, 1200, 33, focus=(.55, .5)),
    "cap-technology": lambda: lattice(1800, 1200, 5),
    "cap-growth": lambda: ribbon(1200, 1500, seed=3, ang=1.7, tilt=.5, size=.42, cx=.5, cy=.5),
    "case-insurance": lambda: journey_still(1920, 1080, .60),
    "case-insurance-b": lambda: ribbon(1800, 1200, seed=3, ang=2.6, tilt=.2, size=.36, cx=.5),
    "case-yep": lambda: halftone(1920, 1080, 9),
    "case-yep-b": lambda: contour(1800, 1200, 41, bandc=LIME, spacing=.04),
    "case-advisors": lambda: lattice(1920, 1080, 17),
    "case-advisors-b": lambda: planes(1800, 1200, 44),
    "insight-klaviyo": lambda: ribbon(1600, 1000, seed=3, ang=.2, tilt=.5, size=.38, cx=.62),
    "insight-ltv": lambda: halftone(1600, 1000, 15, light=True),
    "insight-behavioral": lambda: contour(1600, 1000, 27, light=True, focus=(.5, .5)),
    "about-a": lambda: contour(1920, 1200, 51, spacing=.055, focus=(.4, .5)),
    "about-b": lambda: arcs(1600, 1000, 61, center=(.2, 1.1)),
    "contact-a": lambda: ribbon(1920, 1200, seed=3, ang=3.4, tilt=.3, size=.4, cx=.65, lime_bias=1.4),
    "paper-a": lambda: contour(1800, 1200, 71, light=True, spacing=.05, focus=(.7, .5)),
    "paper-b": lambda: halftone(1600, 1000, 81, light=True),
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(JOBS)
    for n in names:
        save(n, JOBS[n]())
    if not sys.argv[1:] or "og" in sys.argv[1:]:
        og(); print("og saved")
