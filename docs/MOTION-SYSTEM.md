# Motion system

All movement on the site — reveals, parallax, pinned scroll scenes, colour-world transitions, page changes, the intro, the cursor and hover effects — is controlled in the website editor under **Motion** (stored by the server with drafts and versions; `src/config/motion.json` holds the original values). Each section can also set its own motion in its **Motion** tab.

The code lives in `src/platform/motion.js` (settings and presets), `src/lib/gsap.js` (GSAP, ScrollTrigger and the shared media queries) and `src/lib/anim.js` (text entrances). Animation uses GSAP 3 with ScrollTrigger, through `useGSAP` and `gsap.matchMedia()`. Every animation is therefore cleaned up when a page changes, and rebuilt when the screen crosses the desktop breakpoint.

## Rules the system enforces

1. **Text is never distorted.** Words only travel (masked slides) or fade into place, and always end fully solid. No scaling, skewing, outlining, blur or re-tracking of letterforms. `src/lib/anim.js` is the single place text entrances are defined.
2. **Motion can always be switched off.** The `none` preset, a section's own **Motion** setting, or the visitor's *reduce motion* system preference all lead to the **static layout**. Every scene is shown fully composed, with nothing hidden or waiting for scroll.
3. **A section can calm itself down, never override a visitor.** A section set to `dramatic` stays static if the site preset is `none` or the visitor prefers reduced motion (`MotionScope` in `src/platform/motion.js`).

## Global settings

| Setting | Default | Effect |
|---|---|---|
| `preset` | `standard` | `none` · `subtle` · `standard` · `cinematic` · `dramatic` (table below). |
| `speed` | `1` | Multiplies every duration. 1.5 = 50% slower, 0.8 = faster. Applied to GSAP's global clock in `src/platform/boot.js`. |
| `intensity` | `1` | Multiplies travel distance and parallax. 0 = elements fade or cut in place. |
| `respectReducedMotion` | `true` | Visitors whose device asks for reduced motion get the static layout. Keep this on. |

### Presets

| Preset | Enabled | Duration × | Distance × | Parallax × | Stagger × |
|---|---|---|---|---|---|
| `none` | no | 1 | 0 | 0 | 1 |
| `subtle` | yes | 0.85 | 0.5 | 0.5 | 0.8 |
| `standard` (as designed) | yes | 1 | 1 | 1 | 1 |
| `cinematic` | yes | 1.3 | 1.1 | 1.25 | 1.2 |
| `dramatic` | yes | 1.15 | 1.6 | 1.7 | 1.1 |

Developers can change the numbers of a preset, or add a new one, under `presets` in the motion settings (and add its name to the preset lists in `shared/schema.js`).

### Reveal styles

| Group | Setting | Default | Options / meaning |
|---|---|---|---|
| `text` | `reveal` | `as-designed` | `as-designed` keeps each heading's designed entrance (rise, from-left, from-right, per-character, clip). `rise`, `fade` or `none` use one style for all. |
| | `duration`, `stagger` | `1.1`, `0.06` | Seconds. |
| | `triggerPoint` | `top 86%` | When the reveal starts: "the element's top reaches 86% down the screen". |
| `blocks` | `reveal` | `as-designed` | Paragraphs, lists, buttons and cards: `as-designed`, `rise`, `fade`, `none`. |
| | `duration`, `distance`, `triggerPoint` | `1.1`, `64`, `top 88%` | Seconds, pixels of travel, start point. |
| `images` | `reveal` | `as-designed` | `as-designed` (mask wipe with a slow settle from `revealScaleFrom`), `fade`, `none`. |
| | `revealDuration`, `parallax`, `revealScaleFrom`, `triggerPoint` | `1.5`, `1`, `1.18`, `top 86%` | Seconds, parallax strength (0 = off), starting zoom, start point. |
| `scenes` | `scrollLength` | `1` | Multiplies the scroll length of every pinned scene (hero, problem, connected system, selected work). |
| `easing` | `entrance`, `inOut`, `css`, `cssInOut` | `expo.out`, `expo.inOut`, `cubic-bezier(0.16, 1, 0.3, 1)`, `cubic-bezier(0.76, 0, 0.24, 1)` | GSAP ease names, and the CSS curves used for hovers and buttons. |

### Features

| Feature | Default | What it controls |
|---|---|---|
| `introSplash` | on | The U · S · F · L intro on the home page (its words and frequency are in `site.json → intro`). |
| `pageTransitions` | on | The curtain between pages, with the destination page's name and number. |
| `sharedImageTransitions` | on | A clicked case-study or capability image expands into the next page's hero. |
| `sectionTransitions` | `as-designed` | `as-designed` uses each transition's own style. `fade` or `cut` force one style everywhere. |
| `customCursor` | on | The signal glow that follows the pointer (fine pointers only). |
| `magneticButtons` | on | Buttons that lean toward the pointer. |
| `hoverTilt` | on | Images and cards that move under the pointer. |
| `filmGrain` | on | The fine animated grain over the page. |
| `scrollProgressLine` | on | The thin progress line under the navigation. |
| `navigationAutoTheme` | on | The navigation turns dark on white sections at exactly the moment a transition passes under it. |

All features switch off automatically when motion is off.

## Per-section motion

Every section has a **Motion** setting (`"motion": "inherit"` in its data). Set it to a preset for that section only. `src/sections/Sections.jsx` wraps the section in `<MotionScope preset="…">`. Components read the result with `useMotion()`:

```js
const m = useMotion()
if (!m.enabled) return            // static layout
gsap.to(el, { y: m.dist(40), duration: m.dur(1.2), stagger: m.stagger(0.08) })
```

With `"motion": "none"` the section wrapper gets the `motion-off` class, so the section's static CSS applies to it alone.

## Static layouts (`.motion-off`)

When motion is off for the whole site, `src/platform/boot.js` adds `motion-off` to `<html>`. Components hold their static styling in `.motion-off …` rules next to their other styles. For example, `src/sections/Problem.jsx` turns its pinned beats into stacked paragraphs, and `src/sections/LivingSystem.jsx` shows every system stage in order with the loop video above. The hero shows the composed frame (video window and headline). Transitions show the destination colour world with the statement. Videos that are set to play once show their `posterReducedMotion` still.

## Section transitions

A transition is a pinned scene in which one colour world replaces the other through a shaped mask, while its statement inverts exactly along the mask edge. The component is `src/components/ui/SectionTransition.jsx`.

| Style | Description |
|---|---|
| `circle` | A circle grows from `origin` ([x, y], 0–1) with a signal ring on its edge. |
| `diagonal` | A diagonal wipe from the top-left, with a travelling edge line. |
| `rise` | The new world rises from the bottom edge. |
| `shutter` | Eight vertical bars close in sequence. |
| `hbars` | Eight horizontal bars sweep across. |
| `fade` | A scrubbed cross-fade. |
| `cut` | No pinned scene: the statement sits on the destination colour as a normal section. |

**Default configuration** (keep this as the reference):

| Page | Section | Style | From → to | Length |
|---|---|---|---|---|
| Home | `t-signal` | circle | dark → light | 210vh |
| Home | `t-relationship` | diagonal | light → dark | 210vh |
| Home | `t-infrastructure` | rise | dark → light | 200vh |
| Home | `t-craft` | shutter | light → dark | 200vh |
| Home | `t-fit` | circle | dark → light | 200vh |
| Home | `t-intent` | hbars | light → dark | 200vh |
| Work | `t-cases` | rise | dark → light | 170vh |
| Work | `t-your-turn` | diagonal | light → dark | 160vh |
| Capabilities | `t-caps` | circle | dark → light | 170vh |
| Capabilities | `t-begin` | shutter | light → dark | 160vh |
| About | `t-who` | circle | dark → light | 180vh |
| About | `t-name` | diagonal | light → dark | 170vh |
| Insights | `t-read` | diagonal | dark → light | 160vh |
| Contact | `t-talk` | circle | dark → light | 160vh |

The navigation colour flips at the exact scroll position where the incoming world reaches the navigation bar. This is calculated per style inside the component.

## The scroll scenes

| Scene | Component | Pinned length (at scrollLength 1) | Notes |
|---|---|---|---|
| Hero | `src/sections/Hero.jsx` | 250vh | The film opens full-bleed, closes into a window as the headline arrives, then plunges back to full-bleed on scroll. The film starts when the intro hands over (`playback: once-after-intro`). |
| Problem | `src/sections/Problem.jsx` | 108vh per beat | Beats replace one another. Three image fragments re-align into one picture at the end. |
| Connected system | `src/sections/LivingSystem.jsx` | Adapts to the number of stages | Each stage from **Connected system** in the editor takes a turn in the frame, with the progress rail below. |
| Selected work | `src/sections/SelectedWork.jsx` | 480vh | The lead case study's film opens, then the supporting pair. |

On phones (below the breakpoint) each scene has its own simpler choreography, set up in the same `gsap.matchMedia()` block with the `desktop` condition false.

## Adding motion to a new component

1. `const m = useMotion()`; return early (static) when `!m.enabled`.
2. Build inside `useGSAP(() => { const mm = gsap.matchMedia(); mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => { … }) }, { scope: root })`.
3. Scale values with `m.dur()`, `m.dist()`, `m.stagger()` and `m.parallax()`.
4. Use `textIn()` / `textHide()` from `src/lib/anim.js` for text, or the `ScrollText` and `ScrollReveal` components from `src/components/ui/Reveal.jsx`.
5. Add `.motion-off` rules so the component reads well when static.
