"""
USFL hero video — IMAGE 01 brought to life.

One continuous camera move built only from the supplied frame (no new objects, no re-imagined city):
  orbit  → the camera leaves high orbit and dives past the descending craft into the cloud deck
  clouds → procedural cloud layers rush past the lens (the only synthetic element, and it is weather)
  city   → the same metropolis from IMAGE 01 resolves beneath the clouds; the camera settles on the
           central technology hub, the roads carrying slow pulses of golden light toward it.

Sources: media-src/source/orbit2x.png, city2x.png — 2× EDSR upscales of the two panels of IMAGE 01
(see upscale.py). Frames are piped straight to ffmpeg; nothing large touches the disk.

    python3 media-src/plunge.py            # → media-src/out/plunge_master.mp4 (+ posters)
"""
import math, os, subprocess, sys
import numpy as np, cv2

W, H, FPS, DUR = 1600, 900, 25, 10.0
SRC = 'media-src/source/'
OUT = 'media-src/out/'
os.makedirs(OUT, exist_ok=True)
PREVIEW = '--preview' in sys.argv

orbit = cv2.imread(os.environ.get('ORBIT', SRC + 'orbit2x.png')).astype(np.float32) / 255
city = cv2.imread(os.environ.get('CITY', SRC + 'city2x.png')).astype(np.float32) / 255
OH, OW = orbit.shape[:2]
CH, CW = city.shape[:2]

# ---------- helpers ----------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a))
def smooth(x): return x * x * (3 - 2 * x)
def ease_in(x, p=2.4): return x ** p
def ease_out_expo(x): return 1 if x >= 1 else 1 - 2 ** (-10 * x)
def ease_io(x): return 0.5 - 0.5 * math.cos(math.pi * x)

def view(img, cx, cy, h, interp=cv2.INTER_LANCZOS4):
    """Render a 16:9 window of height h (source px) centred on (cx, cy) at W×H — float precision, no jitter."""
    ih, iw = img.shape[:2]
    h = min(h, ih, iw * 9 / 16)
    w = h * 16 / 9
    cx = clamp(cx, w / 2, iw - w / 2); cy = clamp(cy, h / 2, ih - h / 2)
    s = W / w
    M = np.float32([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]])
    return cv2.warpAffine(img, M, (W, H), flags=interp, borderMode=cv2.BORDER_REFLECT), M

# ---------- camera paths ----------
# ORBIT (source: orbit2x, 2240×1050). The craft sits at ≈(1112, 800).
O_START = (1116, 525, 1050)          # whole panel height — horizon, craft, cloud deck
O_END = (1450, 930, 260)             # into the cloud tops beside the craft — the camera passes it, never hits it
T_O = (0.0, 3.55)
def cam_orbit(t):
    x = ease_in(seg(t, *T_O), 2.3)
    cy = O_START[1] + (O_END[1] - O_START[1]) * ease_io(seg(t, 0.3, 3.55))
    h = O_START[2] * (O_END[2] / O_START[2]) ** x          # exponential zoom = constant-feeling acceleration
    cx = O_START[0] + (O_END[0] - O_START[0]) * ease_io(seg(t, 0.4, 3.45))
    return cx, cy, h

# CITY (source: city2x, 4120×2132). The hub centre is ≈(2060, 1200).
C_START = (2060, 1066, 2132)
C_END = (2062, 1170, 1230)
T_C = (3.35, DUR)
def cam_city(t):
    u = seg(t, *T_C)
    x = 1 - (1 - u) ** 3                                    # arrives fast out of the cloud, settles through the end
    h = C_START[2] * (C_END[2] / C_START[2]) ** x
    cy = C_START[1] + (C_END[1] - C_START[1]) * x
    cx = C_START[0] + (C_END[0] - C_START[0]) * x
    return cx, cy, h

def shot(img, cam, t, blur_n):
    """Render with a 180° shutter: average sub-frames across half a frame interval (motion blur on the dive)."""
    if blur_n <= 1:
        f, M = view(img, *cam(t)); return f, M
    acc = None
    for k in range(blur_n):
        tt = t + (k / (blur_n - 1) - 0.5) * (0.5 / FPS)
        f, M = view(img, *cam(tt), interp=cv2.INTER_CUBIC)
        acc = f if acc is None else acc + f
    _, M = view(img, *cam(t))
    return acc / blur_n, M

# ---------- clouds (procedural, the only synthetic element) ----------
rng = np.random.default_rng(7)
def fbm(size, octaves=6, base=4):
    out = np.zeros((size, size), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        n = base * 2 ** o
        layer = cv2.resize(rng.random((n, n)).astype(np.float32), (size, size), interpolation=cv2.INTER_CUBIC)
        out += amp * layer; tot += amp; amp *= 0.52
    out /= tot
    return (out - out.min()) / (out.max() - out.min())
CLOUD_TEX = [fbm(1024) for _ in range(4)]

def cloud_layer(tex, scale, alpha, rot):
    """A sheet of cloud centred on the lens, `scale` growing as the camera passes through it."""
    s = scale * max(W, H) / tex.shape[0] * 1.6
    M = cv2.getRotationMatrix2D((tex.shape[1] / 2, tex.shape[0] / 2), rot, s)
    M[0, 2] += W / 2 - tex.shape[1] / 2; M[1, 2] += H / 2 - tex.shape[0] / 2
    n = cv2.warpAffine(tex, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    dens = np.clip((n - 0.42) / 0.3, 0, 1) ** 1.3                          # wisps, not fog
    shade = 0.80 + 0.2 * np.clip((n - 0.4) / 0.5, 0, 1)                   # sunlit tops, blue-grey bellies
    col = np.dstack([shade * 0.97, shade * 0.95, shade * 0.93])          # BGR — faintly blue-white
    a = (dens * alpha)[..., None]
    return col, a

LAYERS = []  # (birth, life, tex, rot)
for i in range(11):
    LAYERS.append((2.55 + i * 0.13, 0.78, CLOUD_TEX[i % 4], (i * 37) % 360))

def clouds_over(frame, t):
    for birth, life, tex, rot in LAYERS:
        u = (t - birth) / life
        if 0 <= u <= 1:
            scale = 0.55 * (6.5 ** u)                                    # rushing toward and past the lens
            alpha = math.sin(math.pi * u) ** 1.2 * 0.92
            col, a = cloud_layer(tex, scale, alpha, rot + 10 * u)
            frame = frame * (1 - a) + col * a
    # the cloud body itself — a soft luminous haze at the heart of the pass (never a hard white-out)
    hz = math.exp(-((t - 3.5) / 0.3) ** 2) * 0.72
    if hz > 0.003:
        frame = frame * (1 - hz) + np.array([0.93, 0.915, 0.9], np.float32) * hz
    return frame

# ---------- the city's light: slow pulses travelling along the golden roads toward the hub ----------
hsv = cv2.cvtColor((city * 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
gold = ((hsv[..., 0] >= 8) & (hsv[..., 0] <= 28) & (hsv[..., 1] > 90) & (hsv[..., 2] > 150)).astype(np.float32)
gold = cv2.GaussianBlur(gold, (0, 0), 2.0)
cyan = ((hsv[..., 0] >= 82) & (hsv[..., 0] <= 105) & (hsv[..., 1] > 70) & (hsv[..., 2] > 170)).astype(np.float32)
cyan = cv2.GaussianBlur(cyan, (0, 0), 3.0)
yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
dist = np.sqrt((xx - 2060) ** 2 + ((yy - 1200) * 1.7) ** 2)             # elliptical: the plan is foreshortened
del yy, xx

def city_light(frame, M, t):
    g = cv2.warpAffine(gold, M, (W, H), flags=cv2.INTER_LINEAR)
    c = cv2.warpAffine(cyan, M, (W, H), flags=cv2.INTER_LINEAR)
    d = cv2.warpAffine(dist, M, (W, H), flags=cv2.INTER_LINEAR)
    ph = (d / 520.0 + t * 0.55) % 1.0                                     # inward-travelling bands
    pulse = np.exp(-((ph - 0.5) / 0.07) ** 2) * 0.42
    on = seg(t, 4.2, 5.4)                                                 # the light wakes once the clouds clear
    gain = 1 + (g * pulse * on)[..., None] * np.array([0.55, 0.85, 1.0], np.float32)
    breathe = 1 + c * 0.12 * on * (0.5 + 0.5 * math.sin(t * 1.6))
    return frame * gain * breathe[..., None]

# ---------- finishing: focus on the hub, vignette ----------
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
rad = np.sqrt(((gx - W / 2) / (W / 2)) ** 2 + ((gy - H / 2) / (H / 2)) ** 2)
VIGN = (1 - 0.34 * np.clip(rad - 0.35, 0, 1) ** 1.6)[..., None]
EDGE = np.clip((rad - 0.45) / 0.6, 0, 1)[..., None]                       # where the lens falls off

def finish(frame, t, city_amt):
    # rack focus: soft as it emerges from the cloud, the hub pin-sharp as the camera settles
    if city_amt > 0:
        f = seg(t, 4.0, 8.6)
        soft = cv2.GaussianBlur(frame, (0, 0), 1.6)
        sharp = cv2.addWeighted(frame, 1.55, cv2.GaussianBlur(frame, (0, 0), 1.1), -0.55, 0)
        centre = (1 - f) * frame + f * sharp
        edge_amt = EDGE * (0.35 + 0.45 * f)
        frame = centre * (1 - edge_amt) + soft * edge_amt
    return np.clip(frame * VIGN, 0, 1)

# ---------- render ----------
def render(t):
    city_amt = smooth(seg(t, 3.38, 3.72))
    out = None
    if city_amt < 1:
        fast = seg(t, 1.6, 3.55)
        o, _ = shot(orbit, cam_orbit, t, 1 + int(round(6 * fast)))
        out = o
    if city_amt > 0:
        fast = 1 - seg(t, 3.4, 5.2)
        c, M = shot(city, cam_city, t, 1 + int(round(6 * fast)))
        c = city_light(c, M, t)
        out = c if out is None else out * (1 - city_amt) + c * city_amt
    out = clouds_over(out, t)
    return finish(out, t, city_amt)

if __name__ == '__main__':
    frames = int(DUR * FPS)
    if PREVIEW:
        for t in [0.0, 1.5, 2.6, 3.1, 3.5, 3.9, 4.6, 6.0, 8.0, 9.96]:
            cv2.imwrite(f'{OUT}prev_{t:05.2f}.jpg', (render(t) * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
            print('preview', t, flush=True)
        sys.exit()
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv420p', OUT + 'plunge_master.mp4'], stdin=subprocess.PIPE)
    for i in range(frames):
        t = i / FPS
        f = (render(t) * 255 + 0.5).astype(np.uint8)
        ff.stdin.write(f.tobytes())
        if i == 0: cv2.imwrite(OUT + 'first.png', f)
        if i == frames - 1: cv2.imwrite(OUT + 'last.png', f)
        if i % 25 == 0: print('frame', i, flush=True)
    ff.stdin.close(); ff.wait()
    print('done')
