# Design system

The site's look is defined by **tokens**: named values for colour, type, spacing, layout, borders and breakpoints. They are edited in the website editor under **Colours, type & spacing** and stored, with drafts and version history, by the website server. `src/config/theme.json` holds the original values the database was created from.

At start-up `src/platform/theme.js` turns every token into a CSS custom property on `:root` (in a `<style id="site-theme">` tag). Every component reads those variables, so changing a token changes the whole site. The same defaults are also written in `src/styles/index.css` (`:root { … }`), so the site still renders correctly if `theme.json` is missing a value.

The values below are the **approved design** — the default configuration. The editor also offers them as the **USFL Signal (current)** colour preset, so they can always be re-applied in one step.

## Principles the tokens protect

- **Two colour worlds.** A near-black dark world (`ink`, `ink2`, `ink3`) and a pure white light world (`paper` = `#FFFFFF`). Pages alternate between them through transition scenes. Sections choose a world with **Colour world** (`dark`, `dark2`, `light`).
- **One accent, used sparingly.** The signal lime (`accent`) on dark, and its darker green twin (`accentOnLight`) wherever lime would be unreadable on white. `accent2` (cool cyan) is a secondary highlight.
- **One display face, one text face, one italic, one mono.** Headlines use the display face; words wrapped in `*asterisks*` switch to the italic serif; labels use the mono face at small, tracked, uppercase sizes.
- **Text is always solid.** Text colours are opaque, and the motion system only moves or fades text into place. It never outlines, blurs, stretches or leaves it translucent.

## Colours

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `ink` | Dark background | `#080A0D` | `--ink` |
| `ink2` | Dark background (secondary) | `#10141A` | `--ink2` |
| `ink3` | Dark background (menus, curtains) | `#161C23` | `--ink3` |
| `paper` | Light background | `#FFFFFF` | `--paper` |
| `textOnDark` | Text on dark | `#F3F6F8` | `--light` |
| `mutedOnDark` | Secondary text on dark | `#AAB3BC` | `--dim` |
| `faintOnDark` | Decorative numbers on dark | `#5D6873` | `--faint-on-dark` |
| `textOnLight` | Text on light | `#080A0D` | `--text-on-light` |
| `mutedOnLight` | Secondary text on light | `#4C5660` | `--muted-on-light` |
| `faintOnLight` | Decorative text on light | `#8A939C` | `--faint-on-light` |
| `recedeOnLight` | Receding text on light (hover) | `#B9C0C7` | `--recede-on-light` |
| `accent` | Accent (signal) | `#C8FF3D` | `--signal` |
| `accentOnLight` | Accent on light backgrounds | `#4A7300` | `--signal-ink` |
| `accent2` | Second accent | `#B8F7FF` | `--cool` |
| `buttonBackground` | Button | `#C8FF3D` | `--btn-bg` |
| `buttonText` | Button text | `#080A0D` | `--btn-fg` |
| `buttonHoverBackground` | Button hover | `#F3F6F8` | `--btn-hover` |
| `buttonOnLightBackground` | Button on light sections | `#080A0D` | `--btn-light-bg` |
| `buttonOnLightText` | Button text on light sections | `#F3F6F8` | `--btn-light-fg` |
| `buttonOnLightHoverBackground` | Button hover on light sections | `#4A7300` | `--btn-light-hover` |
| `hairlineOnDark` | Hairlines on dark | `#FFFFFF` | `--line-dark` |
| `hairlineOnLight` | Hairlines on light | `#080A0D` | `--line-light` |
| `decorOnDark` | Background words on dark | `#0F1318` | `--decor-dark` |
| `decorOnLight` | Background words on light | `#F1F3F5` | `--decor-light` |
| `overlay` | Video / image overlay | `#080A0D` | `--overlay` |
| `selectionBackground` | Text selection | `#C8FF3D` | `--sel-bg` |
| `selectionText` | Selected text | `#080A0D` | `--sel-fg` |
| `focusOnDark` | Focus ring on dark | `#C8FF3D` | `--focus-dark` |
| `focusOnLight` | Focus ring on light | `#080A0D` | `--focus-light` |

### Contrast protection

`src/platform/theme.js` checks these pairs every time the site starts, and the editor checks them before every publish (they appear under **Worth a look**):

| Foreground | Background | Minimum |
|---|---|---|
| `textOnDark` | `ink`, `ink2` | 4.5 : 1 |
| `mutedOnDark` | `ink` | 4.5 : 1 |
| `textOnLight` | `paper` | 4.5 : 1 |
| `mutedOnLight` | `paper` | 4.5 : 1 |
| `buttonText` | `buttonBackground` | 4.5 : 1 |
| `buttonOnLightText` | `buttonOnLightBackground` | 4.5 : 1 |
| `selectionText` | `selectionBackground` | 4.5 : 1 |
| `accentOnLight` | `paper` | 3 : 1 (large text, lines, focus) |
| `accent`, `accent2` | `ink` | 3 : 1 |
| `focusOnDark` | `ink` | 3 : 1 |
| `focusOnLight` | `paper` | 3 : 1 |

If a pair fails, the site uses white or black (whichever reads better) for that foreground instead, and the build prints a warning such as:

```
warning theme.json: accent on ink is 1.14:1 (needs 3:1) — the site will substitute a readable colour
```

Default contrast ratios: text on dark 18.3 : 1, text on white 19.8 : 1, secondary text on white 7.5 : 1, lime on ink 16.8 : 1, accent green on white 5.6 : 1.

### Alpha colours

Hairlines, glows and overlays use `color-mix(in srgb, <colour> N%, transparent)`, so they follow the colour tokens automatically. Their strengths are separate tokens:

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `hairlineOnDark` | Hairline strength on dark (0–1) | `0.14` | `--line-dark` |
| `hairlineOnLight` | Hairline strength on light (0–1) | `0.14` | `--line-light` |
| `videoOverlay` | Video overlay (0 = off, 1 = as designed) | `1` | `--overlay-strength` |
| `grain` | Film grain (0–0.2) | `0.055` | `--grain-opacity` |
| `glow` | Signal glow (0–1) | `0.45` | — |

## Typography

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `displayFont` | Headline font | `"Bricolage Grotesque Variable", "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif` | `--font-display` |
| `bodyFont` | Body font | `"Instrument Sans Variable", "Instrument Sans", ui-sans-serif, system-ui, sans-serif` | `--font-sans` |
| `serifFont` | Italic accent font | `"Instrument Serif", ui-serif, Georgia, serif` | `--font-serif` |
| `monoFont` | Label font | `"Geist Mono Variable", "Geist Mono", ui-monospace, monospace` | `--font-mono` |
| `fontStylesheets` | Extra font stylesheets | `[]` | — |
| `displayWeight` | Headline weight | `600` | `--display-weight` |
| `displayWidth` | Headline width | `92%` | `--display-width` |
| `displayLetterSpacing` | Headline letter-spacing | `-0.034em` | `--display-ls` |
| `displayLineHeight` | Headline line-height | `0.93` | `--display-lh` |
| `sizeXXL` | Size XXL | `clamp(3.4rem, 12.6vw, 14.5rem)` | `--fs-xxl` |
| `sizeXL` | Size XL | `clamp(2.8rem, 8.4vw, 9.6rem)` | `--fs-xl` |
| `sizeLG` | Size L | `clamp(2.4rem, 5.9vw, 6.6rem)` | `--fs-lg` |
| `sizeMD` | Size M | `clamp(1.95rem, 3.9vw, 4.2rem)` | `--fs-md` |
| `sizeSM` | Size S | `clamp(1.45rem, 2.2vw, 2.3rem)` | `--fs-sm` |
| `bodyWeight` | Body weight | `400` | `--body-weight` |
| `bodySize` | Body size | `17px` | `--body-size` |
| `bodyLineHeight` | Body line-height | `1.6` | `--body-lh` |
| `leadSize` | Lead size | `clamp(1.08rem, 1.36vw, 1.36rem)` | `--lead-size` |
| `leadLineHeight` | Lead line-height | `1.46` | `--lead-lh` |
| `leadMaxWidth` | Lead max width | `42ch` | `--lead-max` |
| `bodyCopySize` | Long-text size | `clamp(1rem, 1.08vw, 1.12rem)` | `--copy-size` |
| `bodyCopyLineHeight` | Long-text line-height | `1.66` | `--copy-lh` |
| `bodyCopyMaxWidth` | Long-text max width | `62ch` | `--copy-max` |
| `eyebrowSize` | Label size | `0.72rem` | `--eyebrow-size` |
| `eyebrowLetterSpacing` | Label letter-spacing | `0.14em` | `--eyebrow-ls` |
| `eyebrowCase` | Label casing | `uppercase` | `--eyebrow-case` |
| `eyebrowWeight` | Label weight | `450` | `--eyebrow-weight` |
| `navSize` | Navigation size | `0.74rem` | `--nav-size` |
| `buttonSize` | Button text size | `0.74rem` | `--btn-size` |
| `buttonLetterSpacing` | Button letter-spacing | `0.14em` | `--btn-ls` |
| `buttonCase` | Button casing | `uppercase` | `--btn-case` |
| `buttonWeight` | Button weight | `500` | `--btn-weight` |

The four font families are bundled with the site (`@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/geist-mono`, imported at the top of `src/styles/index.css`), so no third-party font service is contacted by default. To use a different font, add its stylesheet URL to `fontStylesheets` and name the family in the font token. Always end the stack with a generic fallback (`sans-serif`, `serif`, `monospace`).

### Type classes

| Class | Size token | Used for |
|---|---|---|
| `.display.display-xxl` | `--fs-xxl` | Home hero headline |
| `.display.display-xl` | `--fs-xl` | Page heroes, footer heading |
| `.display.display-lg` | `--fs-lg` | Section headings, transition statements |
| `.display.display-md` | `--fs-md` | Case-study titles, sub-headings |
| `.display.display-sm` | `--fs-sm` | Card and list titles |
| `.serif` | `--font-serif` | Words wrapped in `*asterisks*` |
| `.lead` | `--lead-size` | Intro paragraphs |
| `.body-copy` | `--copy-size` | Long text |
| `.mono` | `--eyebrow-size` | Eyebrows, labels, meta |

## Spacing

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `gutter` | Page side padding | `clamp(20px, 4.2vw, 72px)` | `--gutter` |
| `sectionScale` | Section spacing (1 = as designed) | `1` | `--section-space` |
| `navHeight` | Navigation height | `76px` | `--nav-h` |
| `buttonHeight` | Button height | `48px` | `--btn-h` |
| `buttonPaddingX` | Button side padding | `26px` | `--btn-px` |
| `gridGap` | Grid gap | `24px` | `--grid-gap` |

Each section's vertical padding is written as `calc(var(--section-space) * clamp(…))`. That means `sectionScale` scales every section at once, and a single section's **Spacing** control (`small` 0.55×, `large` 1.4×, `none` 0×, `flush-top`) scales just that one. The rules are in `src/styles/index.css` under `.sec[data-spacing=…]`.

## Layout

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `maxWidth` | Maximum content width | `1920px` | `--max-w` |
| `heroImageAspect` | Default hero image proportion | `4/5` | — |

## Borders and corners

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `hairlineWidth` | Hairline width | `1px` | `--hair-w` |
| `buttonRadius` | Button corners | `999px` | `--radius-btn` |
| `tagRadius` | Tag corners | `99px` | `--radius-tag` |
| `mediaRadius` | Media corners | `4px` | `--radius-media` |
| `cardRadius` | Card corners | `2px` | `--radius-card` |

## Breakpoints

| Key | Editor label | Default | CSS variable |
|---|---|---|---|
| `desktop` | Desktop layout from (px) | `900` | — |

The breakpoint is a developer setting (it is compiled into the stylesheet), so it is not in the editor: change `breakpoints.desktop` in `src/config/theme.json` and rebuild. The site has one structural breakpoint: below it, layouts stack, scroll scenes switch to their phone choreography and the menu becomes a full-screen overlay. Component styles are written at `900px`. The `site-breakpoints` plugin in `vite.config.js` rewrites `min-width: 900px` and `max-width: 899px` media queries to the configured value at build time, and `src/lib/gsap.js` reads the same value for the JavaScript choreography. Some components also use minor, local breakpoints (for example 700px and 1100px card grids). These are not tokens.

QA sizes: 375, 390, 768, 1024, 1280, 1440 and 1920 px wide.

## Branding

**Branding** in the editor holds the logo (`wordmark`, the animated "usfl" with four signal ticks, or `image` with separate files for dark and light backgrounds), the tick colours, the large footer mark, favicon, browser theme colour and social sharing image. `src/components/Logo.jsx` renders it.

## Changing the look safely

1. Change one group at a time (colours, then type, then spacing).
2. Watch the contrast number next to each text colour in the editor (4.5 : 1 or more is good for body text).
3. Look at a dark section, a light section, a transition, a button hover and a focused link (press Tab) at phone and desktop widths.
4. Keep the table above as the reference configuration.
