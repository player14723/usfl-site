"""Shared helpers for the USFL procedural media generators (numpy + OpenCV)."""
import numpy as np, cv2, subprocess, os, math

W, H = 1280, 720
ASP = W / H
INK = np.array([8, 10, 13], np.float32) / 255
LIME = np.array([200, 255, 61], np.float32) / 255
CYAN = np.array([184, 247, 255], np.float32) / 255
COOL = np.array([205, 225, 240], np.float32) / 255


def rng(seed):
    return np.random.default_rng(seed)


class Field:
    """Smooth scalar potential from random Fourier features. With integer omegas the field
    is exactly periodic in t (t in loop-fractions 0..1), so anything driven by it can loop."""

    def __init__(self, seed, n=10, kmin=0.9, kmax=4.2, tw=1):
        r = rng(seed)
        ang = r.uniform(0, 2 * np.pi, n)
        k = r.uniform(kmin, kmax, n)
        self.K = np.stack([np.cos(ang) * k, np.sin(ang) * k], 1).astype(np.float32)
        self.ph = r.uniform(0, 2 * np.pi, n).astype(np.float32)
        self.om = (r.integers(1, 3, n) * np.where(r.random(n) < .5, 1, -1) * tw).astype(np.float32)
        a = (1 / k) ** 1.1
        self.amp = (a / a.sum()).astype(np.float32)

    def grad(self, x, y, t):
        arg = 2 * np.pi * (np.outer(x, self.K[:, 0]) + np.outer(y, self.K[:, 1])) + (2 * np.pi * self.om * t + self.ph)
        c = np.cos(arg) * (self.amp * 2 * np.pi)
        return c @ self.K[:, 0], c @ self.K[:, 1]

    def value(self, x, y, t=0.0):
        arg = 2 * np.pi * (np.outer(x, self.K[:, 0]) + np.outer(y, self.K[:, 1])) + (2 * np.pi * self.om * t + self.ph)
        return np.sin(arg) @ self.amp


def grid(w=W, h=H):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    return xs / h, ys / h  # x in [0,asp], y in [0,1]


def blur(img, s):
    return cv2.GaussianBlur(img, (0, 0), s)


def bloom(img, weights=((2, .35), (7, .45), (22, .55))):
    out = img.copy()
    for s, w in weights:
        out += blur(img, s) * w
    return out


def tonemap(x, gain=1.0):
    return 1 - np.exp(-np.maximum(x, 0) * gain)


def vignette(w=W, h=H, power=1.6, strength=.55):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xs - w / 2) / (w / 2)) ** 2 + ((ys - h / 2) / (h / 2)) ** 2) / 1.42
    return (1 - strength * np.clip(d, 0, 1) ** power)[..., None]


def grain(shape, seed, amt=0.018):
    r = rng(seed)
    g = r.normal(0, 1, shape[:2]).astype(np.float32)
    return (g * amt)[..., None]


def to8(img):
    return (np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)


def splat(shape, xi, yi, weights_rgb):
    """Accumulate coloured points into an (h,w,3) float32 buffer with bincount (fast)."""
    h, w = shape
    m = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
    idx = (yi[m] * w + xi[m]).astype(np.int64)
    out = np.zeros((h, w, 3), np.float32)
    for c in range(3):
        out[..., c] = np.bincount(idx, weights=weights_rgb[m, c], minlength=w * h).reshape(h, w)
    return out


def encode(frames_dir, out, fps=24, crf=27, scale=None, preset="slow"):
    vf = f"scale={scale}:flags=lanczos," if scale else ""
    vf += "format=yuv420p"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(frames_dir, "%04d.png"),
                    "-vf", vf, "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-profile:v", "high",
                    "-movflags", "+faststart", "-an", out], check=True)
