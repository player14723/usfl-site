# Cinematic guide

A **cinematic** is any moving picture on the site: a video file, or a still photograph with a slow camera move. Each one is registered once in the editor under **Films & cinematics** and placed by name in any section with a **Cinematic** field: *Home hero*, *Connected system*, *Selected work* (lead), *Video / image feature*, *Full-screen media*, and a case study's **Cinematic (optional)**.

The component that plays them is `src/components/ui/Cinematic.jsx`. Video playback is handled by `src/components/ui/CinematicVideo.jsx`. Settings are normalised by `src/platform/media.js → resolveCinematic()`.

## The cinematics in the default configuration

| Name | Type | Playback | Where | What it is |
|---|---|---|---|---|
| `hero-plunge` | video | `once-after-intro` | Home hero | **Image 01 brought to life.** One continuous camera move: from high orbit, past the descending craft, through the cloud deck, down to the city, settling on the central hub. |
| `system-loop` | video | `loop` | Home → Connected system | A luminous ribbon looping through space with six nodes and a travelling signal (illustrative). |
| `work-loop` | video | `loop` | Home → Selected work lead; Insurance case study | Illustrative journey map with a signal travelling through touchpoints (illustrative, not client artwork). |
| `towers-rise` | still | `loop` (yoyo) | Not placed by default | An example still-image cinematic: a slow rise into the *Technology* towers photograph. |

## Fields

| Field | Meaning (the editor shows a plain-language label for each) |
|---|---|
| `id` (Name) | How sections refer to it. Lowercase with hyphens. |
| `enabled` | Off = the poster (or source image) is shown instead, so layouts never break. |
| `type` | `video` (files) or `still` (camera move on an image, no file needed). |
| `label` (Description for screen readers) | What the film shows. Read out in place of the video. |
| `src`, `webm` | Desktop video: MP4 (H.264) required, WebM (VP9) optional and preferred by browsers that support it. |
| `mobileSrc`, `mobileWebm` | Phone versions (about 720 px wide). Used on screens narrower than 768 px and on data-saver connections. |
| `poster` | The first frame, shown instantly and whenever the video cannot play. |
| `posterReducedMotion` | The still shown when motion is off (for the hero, the final settled frame). |
| `sourceImage` | The still the film was made from. Used as a last fallback, and as the picture for `still` type. |
| `playback` | `loop` · `once` (plays once when it enters the screen) · `once-after-intro` (plays once as the home-page intro hands over) · `manual` (only when a scene starts it). |
| `muted` | Keep `true`. Browsers only autoplay muted video. |
| `playbackRate` | 1 = normal, 0.8 = slower. |
| `position`, `fit` | Focal point and `cover` / `contain`, as for images. |
| `overlay` | 1 = the section's legibility scrim is drawn over the film, 0 = none. |
| `still` | For `type: "still"`: `from` and `to` (`scale`, `x` %, `y` %), `duration` (s), `ease` (a GSAP ease), `repeat` (`yoyo` back-and-forth, `loop` restart, `once` a single pass). |

## Fallback chain

In every case the layout stays intact and no broken video frame is shown:

1. Motion off (site preset `none`, section motion `none`, or the visitor prefers reduced motion) → `posterReducedMotion`, else `poster`.
2. Cinematic disabled, missing or unknown → `poster`, else `sourceImage`, else nothing (the section's background shows).
3. The browser cannot autoplay (low-power mode, data saver) → the poster stays visible.
4. Narrow screen (< 768 px) or data saver → `mobileWebm` / `mobileSrc` if set, else the desktop files.

## Image 01 and the hero film

**Source:** Image 01 is kept at `public/images/source/image-01.webp`. It is a single frame in two panels: an orbital view with a descending craft above a cloud deck, and a night city whose roads carry golden light toward a central hub.

**Principle:** the film is built only from that frame. There are no new objects, no re-imagined city and no added text. The only synthetic elements are weather (procedural cloud layers during the descent) and light (slow pulses travelling along the city's existing golden roads toward the hub).

**Pipeline** (all scripts in `media-src/`, run from the project root):

1. **Separate and upscale the panels.** `media-src/source/orbit.png` and `city.png` are the two panels cropped from Image 01. `python3 media-src/upscale.py <in.png> <out.png>` makes the 2× versions (`orbit2x.png`, `city2x.png`) with OpenCV's EDSR super-resolution model. Download `EDSR_x2.pb` from the OpenCV contrib model zoo to `/tmp/EDSR_x2.pb` first.
2. **Render.** `python3 media-src/plunge.py` writes `media-src/out/plunge_master.mp4` (1600 × 900, 25 fps, 10 s, near-lossless). `python3 media-src/plunge.py --preview` writes ten stills instead, for checking the timing quickly.
3. **Encode for the web.** `bash media-src/encode-web.sh media-src/out/plunge_master.mp4 usfl-hero` writes `public/videos/usfl-hero.mp4`, `.webm`, `-mobile.mp4`, `-mobile.webm`, `posters/usfl-hero.jpg` (first frame) and `posters/usfl-hero-end.jpg` (last frame).

`bash media-src/build_videos.sh` runs steps 2–3 for the hero and re-renders the two loops.

**The timeline** (seconds, set in `media-src/plunge.py`):

| Time | Shot | Parameters |
|---|---|---|
| 0.0 – 3.55 | Orbit: the camera leaves high orbit and dives past the craft into the cloud tops | `O_START`, `O_END`, `T_O`, `cam_orbit()` (exponential zoom, so the acceleration feels constant) |
| ~1.6 – 5.2 | Clouds rush past the lens | `LAYERS`, `clouds_over()`, `cloud_layer()` |
| 3.35 – 10.0 | City: arrives fast out of the cloud and settles on the hub | `C_START`, `C_END`, `T_C`, `cam_city()` |
| 4.2 → | The roads' light wakes and pulses toward the hub | `city_light()` |
| 4.0 – 8.6 | Rack focus onto the hub, then vignette | `finish()` |

To change the length, edit `DUR` and the `T_O` and `T_C` windows together. To change where the camera lands, edit `C_END` (x, y, and view height in source pixels).

**How it plays on the site:** the hero opens full-bleed. When the intro finishes, the film starts (`once-after-intro`) while the frame closes into a window beside the headline. Scrolling plunges the window back to full-bleed and slowly scales the film. The film holds on its last frame; it does not loop. With motion off, the composed frame shows `usfl-hero-end.jpg`.

## Making a new cinematic

### Option A: a still with a camera move (no video file)

In **Films & cinematics** → **Add cinematic**, choose **Kind → Photo with a camera move**, pick the **Source photo** and set **From** and **To**. In data terms that is:

```json
{ "id": "towers-rise", "enabled": true, "type": "still",
  "label": "Looking straight up between glass and stone towers to a clear blue sky",
  "sourceImage": "/images/cap-technology.webp", "poster": "/images/cap-technology.webp",
  "position": "50% 46%", "fit": "cover", "overlay": 0, "playback": "loop",
  "still": { "from": { "scale": 1.0, "x": 0, "y": 3 }, "to": { "scale": 1.18, "x": 0, "y": -3 },
             "duration": 14, "ease": "sine.inOut", "repeat": "yoyo" } }
```

This renders in the browser with GSAP (a transform on the image, so it stays sharp). It stays still when motion is off.

### Option B: bake a still into a video file

For a file that plays anywhere (or to share on social), use the still-to-video tool:

```bash
python3 media-src/still-to-video.py public/images/cap-technology.webp towers-rise --preset rise --duration 10 --loop
```

- Presets: `push-in`, `pull-out`, `pan-left`, `pan-right`, `rise`, `drift`, or `--move '{"from":{…},"to":{…}}'` using the same shape as `still` above.
- Options: `--duration`, `--ease` (`linear`, `sine.inOut`, `power2.inOut`, `expo.out`), `--loop` (forward then back, seamless), `--fps`, `--size 1920x1080` (use `1080x1350` for portrait), `--crf` (quality), `--out`.
- Output: `public/videos/<name>.mp4`, `.webm`, `-mobile.mp4`, `-mobile.webm` and `posters/<name>.jpg`. Upload them in the Media library (or leave them in `public/videos/` for a developer deploy) and add a film in **Films & cinematics**. The script also prints the equivalent data entry.
- Requirements: Python 3 with `numpy` and `opencv-python`, plus `ffmpeg`. A 10-second 1080p clip takes a few minutes, because all four encodes are made.

Every frame is the original photograph, scaled and moved with sub-pixel accuracy. Nothing is invented.

### Option C: a produced film

Export a master (MP4 or MOV, at least 1600 px wide, no audio needed), then:

```bash
bash media-src/encode-web.sh path/to/master.mp4 my-film
```

then upload the four files and the poster in the **Media library** and add a film in **Films & cinematics** that uses them. (Alternatively, copy the files into `public/videos/` — they then appear in the library as built-in files after the next server start.)

## Specifications

| | Desktop | Phone |
|---|---|---|
| Width | 1600–1920 px | 720 px |
| Codec | H.264 High (MP4) + VP9 (WebM) | H.264 Main + VP9 |
| Frame rate | 24–25 fps | same |
| Length | 6–14 s (loops: make the first and last frame match, or use `--loop`) | same |
| File size | aim < 4 MB | aim < 1.5 MB |
| Audio | none | none |
| Poster | JPG of the first frame | same file |

## Rules

- Films must be built from footage or images USFL has rights to.
- Keep films free of text. Headlines belong in the page.
- Mark illustrative films as such in their `label` and in any caption.
- Always fill in `label` (the screen-reader description).
