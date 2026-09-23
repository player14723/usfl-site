"""Supplied USFL photography → site stills (WebP + half-width -sm twins).
Run from the project root: python3 media-src/photos.py"""
from PIL import Image, ImageOps
S = 'media-src/source/'
OUT = 'public/images/'

def save(im, name, w):
    im = im.convert('RGB')
    h = round(im.height * w / im.width)
    big = im.resize((w, h), Image.LANCZOS)
    big.save(OUT + name + '.webp', 'WEBP', quality=82, method=6)
    big.resize((w // 2, h // 2), Image.LANCZOS).save(OUT + name + '-sm.webp', 'WEBP', quality=80, method=6)
    print(name, big.size)

def load(f):
    return ImageOps.exif_transpose(Image.open(S + f))

# Experience — a hand across a table of lit screens (the signal green, in the world)
save(load('ce0610b0-image.jpg'), 'cap-experience', 1400)
# Intelligence — two people reading a machine, taking notes: evidence before opinion
save(load('f34015ff-image.jpg'), 'cap-intelligence', 1400)
# About — looking up between towers: ambition, scale, one clear line of sight
save(load('7887fbe4-image.jpg'), 'about-a', 1500)
# Contact / final CTA — the handshake over a working table
save(load('9b219128-image.jpg'), 'contact-a', 1400)

# Problem — ONE crossing, cut into three fragments that the scene scatters and then re-aligns.
# The slice widths are in the same 27 : 12 : 38 proportion (with 2-unit gaps) as the aligned row,
# so when the fragments land they read as one continuous picture.
cw = load('e24c8068-image.jpg')            # 4896 × 3264
band = cw.crop((0, 696, 4896, 2096))       # the horizontal crossing, with room above and below
u = 4896 / 81                               # one row unit (vw) in source pixels
xs = [(0, 27), (29, 41), (43, 81)]
for n, (a, b) in zip('abc', xs):
    sl = band.crop((round(a * u), 0, round(b * u), band.height))
    save(sl, f'problem-{n}', round(sl.width * 0.6))

# Technology — looking up between towers: the infrastructure everything else is built on
save(load('technology-towers.jpg'), 'cap-technology', 1600)
# Growth — a rising candlestick chart on a tablet in front of live dashboards
save(load('growth-chart.jpg'), 'cap-growth', 1400)
