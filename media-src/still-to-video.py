"""
Still image → cinematic video file.

Turns any photograph into a short camera move (push-in, pull-out, pan, rise, drift) and encodes it for the web:
desktop MP4 + WebM, mobile MP4 + WebM and a poster JPG, ready to register in src/config/media.json → cinematics.

The move uses the SAME settings as a "still" cinematic in media.json ({ from: {scale, x, y}, to: {...}, duration, ease }),
so you can try a move in the browser first (type "still"), then bake it into a video file with this tool when you want
a file that plays everywhere (email previews, social, slower phones).

Nothing is invented: every frame is the original photograph, scaled and moved. No new objects, faces or text.

    python3 media-src/still-to-video.py public/images/cap-technology.webp towers-rise
    python3 media-src/still-to-video.py photo.jpg launch --preset push-in --duration 8
    python3 media-src/still-to-video.py photo.jpg launch --move '{"from":{"scale":1,"x":0,"y":4},"to":{"scale":1.2,"x":0,"y":-4}}'
    python3 media-src/still-to-video.py photo.jpg launch --loop          # plays forward then back (seamless loop)

Output (in public/videos/):  <name>.mp4  <name>.webm  <name>-mobile.mp4  <name>-mobile.webm  posters/<name>.jpg
Needs: python3 with numpy + opencv-python, and ffmpeg on the PATH.
"""
import argparse, json, math, os, subprocess, sys
import numpy as np
import cv2

PRESETS = {
    # scale = zoom (1 = the whole frame), x / y = offset of the frame centre in % of the image (negative = left / up)
    'push-in':  {'from': {'scale': 1.0, 'x': 0, 'y': 0}, 'to': {'scale': 1.18, 'x': 0, 'y': 0}},
    'pull-out': {'from': {'scale': 1.22, 'x': 0, 'y': 0}, 'to': {'scale': 1.0, 'x': 0, 'y': 0}},
    'pan-left': {'from': {'scale': 1.2, 'x': 6, 'y': 0}, 'to': {'scale': 1.2, 'x': -6, 'y': 0}},
    'pan-right': {'from': {'scale': 1.2, 'x': -6, 'y': 0}, 'to': {'scale': 1.2, 'x': 6, 'y': 0}},
    'rise':     {'from': {'scale': 1.08, 'x': 0, 'y': 4}, 'to': {'scale': 1.2, 'x': 0, 'y': -4}},
    'drift':    {'from': {'scale': 1.1, 'x': -2, 'y': 1}, 'to': {'scale': 1.16, 'x': 2, 'y': -1}},
}
EASES = {
    'linear': lambda t: t,
    'sine.inOut': lambda t: 0.5 - 0.5 * math.cos(math.pi * t),
    'power2.inOut': lambda t: 2 * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 2 / 2,
    'expo.out': lambda t: 1 if t >= 1 else 1 - 2 ** (-10 * t),
}


def frame(img, W, H, scale, x, y):
    """Crop a W:H window from img at zoom `scale`, centred (x%, y%) from the middle, resized to W×H (sub-pixel exact)."""
    ih, iw = img.shape[:2]
    base = min(iw / W, ih / H)             # the largest W:H window that fits
    cw, ch = W * base / scale, H * base / scale
    cx = iw / 2 + x / 100 * iw
    cy = ih / 2 + y / 100 * ih
    cx = min(max(cx, cw / 2), iw - cw / 2)  # never show outside the photograph
    cy = min(max(cy, ch / 2), ih - ch / 2)
    sx = cw / W
    M = np.float32([[sx, 0, cx - cw / 2], [0, sx, cy - ch / 2]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)


def encode(frames, out, W, H, fps, fmt, crf):
    args = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-', '-an']
    if fmt == 'mp4':
        args += ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    else:
        args += ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(crf + 10), '-row-mt', '1', '-pix_fmt', 'yuv420p']
    p = subprocess.Popen(args + [out], stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(f.tobytes())
    p.stdin.close()
    if p.wait() != 0:
        sys.exit(f'ffmpeg failed writing {out}')


def main():
    ap = argparse.ArgumentParser(description='Turn a still image into a web-ready cinematic video.')
    ap.add_argument('image', help='the photograph (jpg, png or webp)')
    ap.add_argument('name', help='output name, e.g. "towers-rise" → public/videos/towers-rise.mp4')
    ap.add_argument('--preset', default='push-in', choices=sorted(PRESETS))
    ap.add_argument('--move', help='a custom move as JSON: {"from":{scale,x,y},"to":{scale,x,y}} (overrides --preset)')
    ap.add_argument('--duration', type=float, default=10, help='seconds (default 10)')
    ap.add_argument('--ease', default='sine.inOut', choices=sorted(EASES))
    ap.add_argument('--loop', action='store_true', help='forward then back, so the video loops without a jump')
    ap.add_argument('--fps', type=int, default=25)
    ap.add_argument('--size', default='1920x1080', help='desktop size, default 1920x1080 (use 1080x1350 for portrait)')
    ap.add_argument('--mobile-width', type=int, default=720)
    ap.add_argument('--crf', type=int, default=23, help='quality: lower = better and larger (18–28)')
    ap.add_argument('--out', default='public/videos')
    a = ap.parse_args()

    img = cv2.imread(a.image, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f'Could not read {a.image}')
    move = json.loads(a.move) if a.move else PRESETS[a.preset]
    f0, f1 = {'scale': 1, 'x': 0, 'y': 0, **move.get('from', {})}, {'scale': 1, 'x': 0, 'y': 0, **move.get('to', {})}
    W, H = (int(v) for v in a.size.lower().split('x'))
    n = max(2, round(a.duration * a.fps))
    ease = EASES[a.ease]

    def frames(w, h):
        for i in range(n):
            t = i / (n - 1)
            if a.loop:
                t = 1 - abs(2 * t - 1)       # 0 → 1 → 0
            e = ease(t)
            yield frame(img, w, h, *(f0[k] + (f1[k] - f0[k]) * e for k in ('scale', 'x', 'y')))

    os.makedirs(os.path.join(a.out, 'posters'), exist_ok=True)
    mw = a.mobile_width
    mh = round(mw * H / W / 2) * 2
    base = os.path.join(a.out, a.name)
    for w, h, suffix, crf in ((W, H, '', a.crf), (mw, mh, '-mobile', a.crf + 3)):
        for fmt in ('mp4', 'webm'):
            encode(frames(w, h), f'{base}{suffix}.{fmt}', w, h, a.fps, fmt, crf)
            print('wrote', f'{base}{suffix}.{fmt}')
    poster = os.path.join(a.out, 'posters', f'{a.name}.jpg')
    cv2.imwrite(poster, frame(img, W, H, f0['scale'], f0['x'], f0['y']), [cv2.IMWRITE_JPEG_QUALITY, 84])
    print('wrote', poster)
    web = lambda p: '/' + os.path.relpath(p, 'public').replace(os.sep, '/') if p.startswith('public') else p
    print('\nAdd this to src/config/media.json → "cinematics" (or add it in the editor under Settings → Media):')
    print(json.dumps({
        'id': a.name, 'enabled': True, 'type': 'video', 'label': 'Describe what the video shows, for screen readers',
        'src': web(base + '.mp4'), 'webm': web(base + '.webm'), 'mobileSrc': web(base + '-mobile.mp4'), 'mobileWebm': web(base + '-mobile.webm'),
        'poster': web(poster), 'sourceImage': web(a.image), 'playback': 'loop', 'muted': True, 'playbackRate': 1,
        'position': '50% 50%', 'fit': 'cover', 'overlay': 1,
    }, indent=2))


if __name__ == '__main__':
    main()
