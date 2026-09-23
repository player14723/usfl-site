// USFL wordmark geometry. Monoline glyphs (stroke 12, butt caps, miter joins) drawn on a 0..92 grid.
// Upper: U S F L   Lower: u s f l   — the four initials are Usable · Solutions · For · Life.
export const SW = 12

export const UPPER = [
  { ch: 'U', w: 80, d: 'M7 2 V54 C7 79 22 90 40 90 C58 90 73 79 73 54 V2' },
  { ch: 'S', w: 80, d: 'M70 22 C68 9 56 2 40 2 C22 2 10 11 10 25 C10 39 24 43 40 46 C58 50 71 55 71 68 C71 82 58 90 40 90 C21 90 9 81 8 67' },
  { ch: 'F', w: 68, d: 'M62 2 H8 V90 M8 44 H52' },
  { ch: 'L', w: 68, d: 'M8 2 V90 H62' },
]

export const LOWER = [
  { ch: 'u', w: 66, d: 'M8 36 V66 C8 82 20 90 34 90 C48 90 58 82 58 66 M58 36 V90' },
  { ch: 's', w: 62, d: 'M52 48 C50 40 43 36 33 36 C21 36 13 41 13 50 C13 59 22 62 33 64 C45 66 54 69 54 78 C54 87 45 90 33 90 C21 90 13 86 10 79' },
  { ch: 'f', w: 52, d: 'M26 90 V26 C26 10 34 2 50 5 M8 38 H46' },
  { ch: 'l', w: 28, d: 'M14 2 V90' },
]

export const WORDS = ['Usable', 'Solutions', 'For', 'Life']

// signal colours of the four initials: U signal · S cool · F inversion · L signal
export const INITIAL_COLORS = ['#C8FF3D', '#B8F7FF', '#F3F6F8', '#C8FF3D']

export function layout(glyphs, gap) {
  let x = 0
  return glyphs.map((g) => {
    const out = { ...g, x }
    x += g.w + gap
    return out
  })
}
export const UPPER_L = layout(UPPER, 24) // total ≈ 368
export const LOWER_L = layout(LOWER, 24) // total ≈ 280
export const widthOf = (l) => l[l.length - 1].x + l[l.length - 1].w
