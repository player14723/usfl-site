# 2x super-resolution of the two panels of Image 01 (EDSR), tiled to bound memory.
import cv2, numpy as np, sys, time
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel('/tmp/EDSR_x2.pb'); sr.setModel('edsr', 2)
def up(src, dst, T=320, P=12):
    im = cv2.imread(src); h, w = im.shape[:2]
    out = np.zeros((h*2, w*2, 3), np.uint8)
    t=time.time()
    for y in range(0, h, T):
        for x in range(0, w, T):
            y0, x0 = max(0, y-P), max(0, x-P); y1, x1 = min(h, y+T+P), min(w, x+T+P)
            r = sr.upsample(im[y0:y1, x0:x1])
            oy, ox = (y-y0)*2, (x-x0)*2
            th, tw = min(T, h-y)*2, min(T, w-x)*2
            out[y*2:y*2+th, x*2:x*2+tw] = r[oy:oy+th, ox:ox+tw]
    cv2.imwrite(dst, out); print(dst, out.shape, round(time.time()-t,1), flush=True)
up(sys.argv[1], sys.argv[2])
