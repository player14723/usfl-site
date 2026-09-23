# Media guide

This guide covers photographs and images: where they live, how they are registered, how to prepare new ones, and the rules for using them. Videos and moving stills are covered in `docs/CINEMATIC-GUIDE.md`.

## Where images live

| Location | What |
|---|---|
| `public/images/` | The site's images. Each has a full-size file (`name.webp`) and a half-width phone version (`name-sm.webp`). |
| `<DATA_DIR>/media/` (served as `/media/…`) | Images and videos uploaded in the editor. Images are re-encoded to WebP in two sizes. |
| `public/images/source/image-01.webp` | Image 01, the source frame of the hero film (kept for reference and as the film's fallback). |
| `public/images/og.jpg` | The social sharing image (1200 × 630). |
| Editor → **Media library** | Description, focal point, fit, caption and the *Illustrative* flag for each image (stored in the draft/published “media” settings; `src/config/media.json` holds the originals). |

## How an image reference works

Anywhere a page or content file asks for an image, you can give either:

- a **file path**: `/images/cap-growth.webp`, `/images/uploads/team.jpg`, or a full `https://…` address; or
- a **library name**: `cap-growth`.

`src/platform/media.js` → `resolveImage()` looks the reference up in the media library by name and by path. If it finds it, the library supplies the phone version (`srcSmall`), the description, focal point, fit, caption and *Illustrative* tag. A section can still override the description or focal point for its own use. A path that is not in the library is used as-is. An empty reference renders nothing, never a broken image.

## The library (default configuration)

| Name | Used for | Focal point | Illustrative |
|---|---|---|---|
| `problem-a`, `problem-b`, `problem-c` | Home → Problem scene (three fragments of one street crossing) | centre | no |
| `cap-experience` | Experience capability | 50% 72% | no |
| `cap-intelligence` | Intelligence capability | 50% 30% | no |
| `cap-technology` | Technology capability | 50% 46% | no |
| `cap-growth` | Growth capability | 62% 58% | no |
| `case-insurance`, `case-insurance-b` | Insurance case study | centre | yes |
| `case-yep`, `case-yep-b` | Yep case study | centre | yes |
| `case-advisors`, `case-advisors-b` | Advisors case study | centre | yes |
| `insight-klaviyo`, `insight-ltv`, `insight-behavioral` | Insight articles | centre | yes |
| `about-a` | About page hero | 50% 45% | no |
| `about-b` | About page | centre | yes |
| `contact-a` | The call-to-action image on every page | 50% 44% | no |
| `paper-a`, `paper-b` | Home → Proof (`paper-a`) and Why (`paper-b`); Contact section (`paper-a`) | centre | yes |

**Illustrative** marks images that are compositions rather than documentary photographs (for example the case-study artwork, which is not client material). These images carry a small *Illustrative* label so no one mistakes them for client work. Photographs of people are *not* tagged. **Before launch, confirm USFL holds usage rights for every photograph, and that none of the people shown is presented as the USFL team or a client.**

## Adding or replacing an image

**In the editor:** **Media library** → drop files onto the upload area (or click an image on a page, or use **Replace** on any image field). The server checks the file really is an image, removes hidden metadata, converts it to WebP at up to 2400 px wide and makes a half-width phone copy. Then, in the Media library, click the image to write its **Description (alt text)**, set the **focal point**, a **Caption** and **Mark as illustrative** if it is artwork. These apply wherever the image is used.

**Built-in images** (the files that ship with the site in `public/images/`) appear in the library too, under “Site images”. They cannot be deleted, but they can be replaced wherever they are used.

**By hand (developers):** new built-in images can still be added to `public/images/` as `<name>.webp` + `<name>-sm.webp` (half width); they are listed in the library the next time the server starts. `media-src/photos.py` shows how the supplied photographs were converted (resize with Lanczos, WebP at quality 82, plus the `-sm` twin).

## Size and format targets

| Use | Shape | Minimum size | Target file size |
|---|---|---|---|
| Page hero (inner pages) | 4:5 portrait | 1400 × 1750 | < 400 KB |
| Capability / case-study hero | 4:5 or 3:4 | 1400 × 1750 | < 450 KB |
| Full-width band | 16:9 | 1920 × 1080 | < 500 KB |
| Card / list thumbnail | 4:3 or 1:1 | 900 px wide | < 200 KB |
| Social sharing image | 1.91:1 | 1200 × 630 (JPG) | < 300 KB |

WebP is preferred. JPG and PNG work. Keep text out of images: text in the page stays sharp, translatable and readable by screen readers.

## Focal point and fit

- **Focal point** (`position`) is a CSS `object-position`: `50% 50%` is the centre, `50% 25%` keeps the upper part in frame, and `70% 50%` keeps the right side. Frames are cropped differently on phones and desktops, so set the point on the subject, not the composition.
- **Fit** is `cover` (fill the frame, crop the edges) or `contain` (show the whole image; the frame's background shows around it).

## Alt text

Describe what the picture shows in one sentence, as you would to someone on the phone. For example: *"Looking straight up between glass and stone towers to a clear blue sky."* Do not start with "Image of". Leave it empty only for purely decorative images. Decorative fragments, such as the three Problem-scene shards, are already hidden from screen readers.

## Performance

- Every image has `loading="lazy"` except the hero poster, which is preloaded.
- Uploaded files are served with long-lived caching (their addresses never change).
- Phones download the `-sm` version through `srcset`.
- Keep the total weight of any single page's images under about 3 MB.

## Rules

- Use only images USFL owns or is licensed to use.
- Do not present illustrative artwork as client work. Keep the *Illustrative* tag on compositions.
- Do not show a real person as a USFL employee, client or testimonial author unless they are one and have agreed.
- Do not put invented logos, awards or client names into images.
