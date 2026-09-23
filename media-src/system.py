"""usfl-system.mp4 — the connected system as a luminous ribbon (trefoil) with six nodes and a travelling signal."""
import sys, os, math, numpy as np, cv2
from lib import *

FPS, SECS = 24, 14
N = FPS * SECS
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/system_frames"
only = float(sys.argv[2]) if len(sys.argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
r = rng(3)

NS_, NW = 2600, 26
s = np.linspace(0, 2 * np.pi, NS_, endpoint=False)
def curve(s):
    x = np.sin(s) + 2 * np.sin(2 * s)
    y = np.cos(s) - 2 * np.cos(2 * s)
    z = -np.sin(3 * s)
    return np.stack([x, y, z], -1)
P = curve(s)
T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
ref = np.stack([np.zeros_like(s), np.zeros_like(s), np.ones_like(s)], -1)
Nn = np.cross(T, ref); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9
B = np.cross(T, Nn)
tw = s * 1.5  # slow twist of the ribbon
Nt = Nn * np.cos(tw)[:, None] + B * np.sin(tw)[:, None]
u = np.linspace(-1, 1, NW)
pts = (P[:, None, :] + .34 * Nt[:, None, :] * u[None, :, None]).reshape(-1, 3)
sidx = np.repeat(s, NW)
uu = np.tile(u, NS_)
pts = pts + r.normal(0, .012, pts.shape)
normal = np.repeat(np.cross(T, Nt), NW, axis=0)
# colour along the path
h = .5 + .5 * np.cos(sidx * 1 - 2.0)
colp = COOL[None] * (1 - h[:, None] * .0)
lime_w = np.clip(np.cos(sidx - 4.0) * .9 + .1, 0, 1) ** 2
cyan_w = np.clip(np.cos(sidx - 1.0) * .9 + .1, 0, 1) ** 2
col = COOL[None] * .8 + LIME[None] * lime_w[:, None] * .9 + CYAN[None] * cyan_w[:, None] * .3
col = col.astype(np.float32)
nodes = curve(np.arange(6) * 2 * np.pi / 6 + .35)

# dust
dust = r.normal(0, 1.6, (5000, 3)).astype(np.float32)
CX, CY, F, D = W * .52, H * .5, 1000., 9.0

def project(p, ang, tilt):
    ca, sa = math.cos(ang), math.sin(ang)
    ct, st = math.cos(tilt), math.sin(tilt)
    x = p[:, 0] * ca + p[:, 2] * sa
    z = -p[:, 0] * sa + p[:, 2] * ca
    y = p[:, 1] * ct - z * st
    z = p[:, 1] * st + z * ct
    k = F * D / (D - z * 1.0)
    return CX + x * k / D * 1.0, CY + y * k / D * 1.0, z

bg = np.ones((H, W, 3), np.float32) * INK
ys_, xs_ = np.mgrid[0:H, 0:W].astype(np.float32)
rad = np.sqrt(((xs_ - CX) / W) ** 2 + ((ys_ - CY) / H) ** 2)
bg += np.array([.012, .024, .03], np.float32) * np.exp(-rad * 3.0)[..., None]
vig = vignette(strength=.6)

def frame(tf):
    ang = 2 * np.pi * tf + .6
    tilt = .35 + .12 * math.sin(2 * np.pi * tf)
    sx, sy, z = project(pts, ang, tilt)
    depth = np.clip((z + 3.2) / 6.4, 0, 1)  # 0 far .. 1 near
    # facing (fresnel)
    ca, sa = math.cos(ang), math.sin(ang)
    nz = -normal[:, 0] * sa + normal[:, 2] * ca
    fres = .35 + .65 * (1 - np.abs(nz)) ** 1.5
    # travelling pulse along s (loops)
    ps = (2 * np.pi * (tf * 2 + .0)) % (2 * np.pi)
    ds = np.abs(((sidx - ps + np.pi) % (2 * np.pi)) - np.pi)
    pulse = np.exp(-(ds / .22) ** 2)
    ps2 = (2 * np.pi * (tf * 2 + .5)) % (2 * np.pi)
    ds2 = np.abs(((sidx - ps2 + np.pi) % (2 * np.pi)) - np.pi)
    pulse += .6 * np.exp(-(ds2 / .16) ** 2)
    I = (.10 + .32 * fres) * (.35 + .9 * depth) * (1 + 7 * pulse)
    cw = col * I[:, None]
    # pulse tints toward lime
    cw = cw + LIME[None] * (pulse * .45 * (.4 + depth))[:, None]
    xi = sx.astype(np.int32); yi = sy.astype(np.int32)
    near = depth > .5
    layer_n = splat((H, W), xi[near], yi[near], cw[near])
    layer_f = splat((H, W), xi[~near], yi[~near], cw[~near])
    dx, dy, dz = project(dust, ang * .5, tilt)
    dd = splat((H, W), dx.astype(np.int32), dy.astype(np.int32), np.tile(COOL[None] * .05, (len(dust), 1)))
    lf = blur(layer_f, 1.6) * 1.6
    ln = blur(layer_n, .7) * 1.35
    lights = ln + lf + dd
    img = bg + lights
    # nodes
    ovl = np.zeros((H, W, 3), np.float32)
    nx, ny, nz_ = project(nodes.astype(np.float32), ang, tilt)
    for i in range(6):
        d_ = np.clip((nz_[i] + 3.2) / 6.4, 0, 1)
        rr = 9 + 9 * d_
        act = np.exp(-((((tf * 6 - i) + 3) % 6 - 3) / .55) ** 2)  # each node flares in turn
        colr = (LIME * act + COOL * (1 - act) * .55) * (.45 + .55 * d_)
        cv2.circle(ovl, (int(nx[i]), int(ny[i])), int(rr), colr.tolist(), 1, cv2.LINE_AA)
        cv2.circle(ovl, (int(nx[i]), int(ny[i])), int(rr * (2.2 + act * 1.2)), (colr * .35).tolist(), 1, cv2.LINE_AA)
        cv2.circle(ovl, (int(nx[i]), int(ny[i])), 3, (colr * 1.6).tolist(), -1, cv2.LINE_AA)
    # perspective orbit rings
    for k, rr in enumerate((3.2, 4.4, 5.6)):
        th = np.linspace(0, 2 * np.pi, 240)
        ring = np.stack([rr * np.cos(th), np.full_like(th, -2.4), rr * np.sin(th)], 1).astype(np.float32)
        rx, ry, _ = project(ring, ang * .3, tilt)
        cv2.polylines(ovl, [np.stack([rx, ry], 1).astype(np.int32)], True, (COOL * .07).tolist(), 1, cv2.LINE_AA)
    img = img + ovl + bloom(ovl * 1.0 + lights * .8, ((3, .35), (12, .4), (34, .4)))
    img = tonemap(img, 1.3) * vig
    img += grain(img.shape, int(tf * 1e6) % 9999, .009)
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
