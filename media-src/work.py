"""usfl-work.mp4 (+ poster) — an editorial 'journey map': every touchpoint, decision and emotion; a signal moves through it.
Frame 0 is the still image used before the video takes over."""
import sys, os, math, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from lib import *

FPS, SECS = 24, 12
N = FPS * SECS
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/work_frames"
only = float(sys.argv[2]) if len(sys.argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "node_modules") + "/"
MONO = FD + "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"
DISP = FD + "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2"

BG = np.array([16, 20, 26], np.float32) / 255
LANES = [300, 374, 448, 522]
LNAMES = ["CUSTOMER", "EMPLOYEE", "INTERMEDIARY", "SYSTEM"]
XL, XR = 200, 1216
nodes = [(0, 250, 'o'), (0, 352, 'o'), (1, 430, 'o'), (2, 510, 'd'), (2, 600, 'o'), (3, 690, 'o'), (1, 770, 'd'),
         (1, 850, 'o'), (0, 935, 'o'), (2, 1015, 'o'), (3, 1100, 'o'), (0, 1176, 'd')]
extra = [(1, 300, 'o'), (3, 330, 'o'), (3, 470, 'o'), (0, 560, 'o'), (0, 700, 'o'), (2, 800, 'o'), (3, 900, 'o'), (2, 1120, 'o'), (1, 1050, 'o'), (3, 1180, 'o'), (1, 610, 'o'), (2, 300, 'o')]

def bez(p0, p1):
    x0, y0 = p0; x1, y1 = p1
    dx = (x1 - x0)
    t = np.linspace(0, 1, 60)[:, None]
    c = np.array([[x0, y0], [x0 + dx * .55, y0], [x1 - dx * .55, y1], [x1, y1]])
    return ((1 - t) ** 3 * c[0] + 3 * (1 - t) ** 2 * t * c[1] + 3 * (1 - t) * t ** 2 * c[2] + t ** 3 * c[3])

pp = [(n[1], LANES[n[0]]) for n in nodes]
path = np.concatenate([bez(pp[i], pp[i + 1]) for i in range(len(pp) - 1)])
seg = np.linalg.norm(np.diff(path, axis=0), axis=1)
cum = np.concatenate([[0], np.cumsum(seg)])
L = cum[-1]
node_s = [cum[np.argmin(np.linalg.norm(path - np.array(p), axis=1))] for p in pp]

def emo(x):
    return 652 + 20 * np.sin(x / 71.0 + .8) + 12 * np.sin(x / 33.0 + 2.1) + 8 * np.sin(x / 150.0)
ex = np.arange(XL, XR + 1, 2.0)
ey = emo(ex)

def base_img():
    im = Image.new("RGB", (W, H), tuple((BG * 255).astype(int)))
    d = ImageDraw.Draw(im, "RGBA")
    fm = ImageFont.truetype(MONO, 12); fm.set_variation_by_axes([420])
    fmb = ImageFont.truetype(MONO, 11); fmb.set_variation_by_axes([400])
    fd = ImageFont.truetype(DISP, 60); fd.set_variation_by_axes([12, 100, 560]) if False else None
    try:
        fd = ImageFont.truetype(DISP, 60)
        axes = fd.get_variation_axes(); fd.set_variation_by_axes([a['default'] if a['name'] != b'Weight' and a['name'] != 'Weight' else 560 for a in axes])
    except Exception:
        pass
    d.text((64, 46), "JOURNEY MAP  /  ILLUSTRATIVE", font=fm, fill=(170, 179, 188, 255))
    for name, y in zip(LNAMES, LANES):
        d.text((64, y - 7), name, font=fmb, fill=(170, 179, 188, 200))
        d.line([(XL, y), (XR, y)], fill=(255, 255, 255, 26), width=1)
    d.text((64, 634), "EMOTION", font=fmb, fill=(170, 179, 188, 200))
    d.line([(XL, 652), (XR, 652)], fill=(255, 255, 255, 14), width=1)
    d.text((XR - 250, 46), "TOUCHPOINT  ·  DECISION  ·  EMOTION", font=fmb, fill=(170, 179, 188, 150))
    # connectors (dim)
    pts = [tuple(p) for p in path]
    d.line(pts, fill=(255, 255, 255, 46), width=1, joint="curve")
    # secondary connectors from extras to nearest lane path
    for ln, x, k in extra:
        d.line([(x, LANES[ln] - 26), (x, LANES[ln])], fill=(255, 255, 255, 18), width=1)
    for ln, x, k in extra:
        y = LANES[ln]
        d.ellipse([x - 4, y - 4, x + 4, y + 4], outline=(255, 255, 255, 60), fill=(16, 20, 26, 255))
    for ln, x, k in nodes:
        y = LANES[ln]
        if k == 'd':
            d.polygon([(x, y - 9), (x + 9, y), (x, y + 9), (x - 9, y)], outline=(255, 255, 255, 130), fill=(16, 20, 26, 255))
        else:
            d.ellipse([x - 6, y - 6, x + 6, y + 6], outline=(255, 255, 255, 130), fill=(16, 20, 26, 255))
    # emotion curve dim
    d.line([(float(x), float(y)) for x, y in zip(ex, ey)], fill=(255, 255, 255, 70), width=1)
    arr = np.asarray(im).astype(np.float32) / 255
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    def blob(cx, cy, r, col, a):
        return np.exp(-(((xs - cx) ** 2 + (ys - cy) ** 2) / (2 * r * r)))[..., None] * np.array(col, np.float32) * a
    arr = arr + blob(1040, 190, 330, CYAN, .07) + blob(180, 690, 300, LIME, .035) + blob(700, 420, 500, COOL, .02)
    arr = arr * vignette(strength=.55)
    return arr

BASE = base_img()
SS = 2

def frame(tf):
    fade = 1.0
    if tf > .90: fade = max(0, 1 - (tf - .90) / .09)
    if tf < .03: fade = tf / .03 if False else 1.0
    prog = np.clip((tf - .08) / .80, 0, 1)
    prog = prog * prog * (3 - 2 * prog)
    u = prog * L
    ml = np.zeros((H * SS, W * SS), np.uint8)   # lime mask
    mw = np.zeros((H * SS, W * SS), np.uint8)   # white mask
    def P(p): return (int(p[0] * SS), int(p[1] * SS))
    if prog > 0:
        # trail along the path
        i1 = int(np.searchsorted(cum, u))
        i0 = int(np.searchsorted(cum, max(0, u - 230)))
        for i in range(i0, min(i1, len(path) - 1)):
            a = (cum[i] - (u - 230)) / 230
            cv2.line(ml, P(path[i]), P(path[i + 1]), int(255 * a * a * fade), max(2, int(2.0 * SS * .7)), cv2.LINE_AA)
        head = path[min(i1, len(path) - 1)]
        cv2.circle(ml, P(head), int(5 * SS), int(255 * fade), -1, cv2.LINE_AA)
        cv2.circle(mw, P(head), int(2.5 * SS), int(255 * fade), -1, cv2.LINE_AA)
        cv2.line(ml, P((head[0], head[1] + 8)), P((head[0], emo(head[0]) - 6)), int(70 * fade), 1, cv2.LINE_AA)
        # emotion curve lit up to signal
        xs_ = ex[ex <= head[0]]
        if len(xs_) > 1:
            pts = np.stack([xs_, emo(xs_)], 1)
            for j in range(len(pts) - 1):
                a = np.clip(1 - (head[0] - pts[j][0]) / 420, .25, 1)
                cv2.line(ml, P(pts[j]), P(pts[j + 1]), int(235 * a * fade), int(1.6 * SS), cv2.LINE_AA)
            cv2.circle(ml, P(pts[-1]), int(4 * SS), int(255 * fade), -1, cv2.LINE_AA)
        # nodes
        for (ln, x, k), s_ in zip(nodes, node_s):
            y = LANES[ln]
            if u >= s_:
                g = math.exp(-(u - s_) / 210) * fade
                rad = 6 + 14 * (1 - math.exp(-(u - s_) / 30))
                cv2.circle(ml, P((x, y)), int(6.5 * SS), int(255 * g), -1, cv2.LINE_AA)
                cv2.circle(ml, P((x, y)), int(rad * SS), int(160 * g * math.exp(-(u - s_) / 60)), 1, cv2.LINE_AA)
    ml = cv2.resize(ml, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    mw = cv2.resize(mw, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    lime = LIME * ml[..., None] * 1.15
    lights = lime + mw[..., None]
    lights = tonemap(lights + bloom(lights, ((3, .5), (10, .6), (30, .5))) * .7, 1.1)
    img = np.clip(BASE + lights, 0, 1)
    img += grain(img.shape, int(tf * 1e6) % 9999, .008)
    return to8(img)

def job(i):
    cv2.imwrite(os.path.join(OUT, f"{i+1:04d}.png"), frame(i / N)[..., ::-1]); return i
if __name__ == "__main__":
    if only is not None:
        cv2.imwrite(os.path.join(OUT, "still.png"), frame(only)[..., ::-1]); sys.exit()
    from multiprocessing import Pool
    with Pool(2) as p:
        list(p.imap_unordered(job, range(N), chunksize=6))
    print("frames", N)
