# Architecture

## Overview

One Node.js server does three jobs:

1. **The public website.** Every request gets the built React app plus the *published* content, written into the page, with the right title, description and social tags for that address.
2. **The editor** at `/admin`. This is a separate React app. It edits *drafts* and shows them in a live preview of the real site.
3. **The content API** at `/api`. It handles accounts and sessions, drafts, publishing, versions, media uploads and form messages, stored in SQLite and on disk.

```
                     ┌──────────────────────────── server/ (Express, Node 22) ─────────────────────────────┐
 visitor ──GET /work──► resolveRoute → metaFor → renderShell(dist/index.html + PUBLISHED bundle)            │
                     │                                                                                     │
 editor ──/admin─────► dist/admin/index.html (editor app)                                                  │
        ──/api/*─────► auth (session cookie + CSRF) → Store (docs: draft/published, revisions, versions)    │
        ──iframe─────► /<path>?__preview=1 → renderShell(… DRAFT bundle, mode "preview") + editor bridge     │
                     │                        ▲                                                            │
                     │    SQLite  <DATA_DIR>/site.db          uploads  <DATA_DIR>/media/…  (/media/…)       │
                     └─────────────────────────────────────────────────────────────────────────────────────┘
```

## Stack

| Layer | Choice |
|---|---|
| Server | Node.js 22.13+, Express 5, SQLite (Node's built-in `node:sqlite` — no native add-on to compile), `sharp` for images, `busboy` for uploads |
| Website | React 19, React Router 7, GSAP 3 + ScrollTrigger, Vite 8 build |
| Editor | React 19 app built by the same Vite build (`admin/index.html` → `dist/admin/`) |
| Schema | `shared/schema.js`, one description of every editable field, used by the editor, server and build check |
| Validation | `shared/validate.js`, the same rules in the editor (live), on publish (server) and at build time |

## Folder map

```
server/
  index.js        HTTP server: security headers, API routes, preview, public rendering, sitemap/robots
  db.js           SQLite schema (docs, revisions, versions, users, sessions, media, submissions, audit)
  store.js        drafts, publish, discard, versions, restore, earlier drafts, seed, export
  auth.js         accounts, scrypt passwords, sessions, CSRF, roles
  media.js        uploads (type sniffing, WebP conversion, phone copies, video posters), usage, trash
  html.js         route resolution, per-page meta, HTML shell, sitemap
  cli.js          npm run user:create / user:reset / content:export / content:import
  env.js          .env loader
shared/
  schema.js       every editable field, section type, page template and colour preset
  validate.js     publish-blocking errors and warnings; input sanitising
  bundle.js       documents ⇄ one "bundle" object; readable diffs
admin/index.html  the editor's HTML entry
src/admin/        the editor: views (pages, page editor, collections, settings, media, history, accounts, inbox)
src/preview/      bridge.js — loaded only inside the editor preview: outlines, click-to-select, inline editing
src/platform/     data.js (content at runtime), config.js, content.js, theme.js, motion.js, media.js, seo.js, boot.js
src/sections/     one component per section type + registry.js + Sections.jsx
src/pages/        SectionPage (pages built from sections), CaseStudy, CapabilityDetail, Article, NotFound
src/config/, src/content/   the ORIGINAL content the database is created from on first start
scripts/          check-config.mjs (build check), test-cms.mjs (end-to-end test)
public/           built-in images, films, favicon
media-src/        tools that produced the films and stills (not part of the site)
```

## Data model

Everything the editor changes is a **document**. Each document is stored as JSON with two copies, **draft** and **published**:

| Document key | What |
|---|---|
| `site`, `brand`, `theme`, `motion`, `navigation`, `media`, `system`, `company` | Site-wide settings (one each) |
| `page:<id>` | A page: title, address, visibility, order, SEO and an ordered list of sections |
| `case:<id>`, `capability:<id>`, `insight:<id>` | Collection items, each with its own page |

The tables are:

- `docs(key, draft, published, rev, updated_at, updated_by, published_at)`.
  - `draft = NULL` means "deleted in the draft".
  - `published = NULL` means "new, never published".
  - `rev` gives optimistic locking: a save with a stale `rev` is refused with 409.
- `revisions`: earlier drafts per document. At most one every 3 minutes of autosave, plus one before every delete, discard or restore. The 60 most recent are kept per document.
- `versions`: one full snapshot of the published site per publish, with the list of changed documents and a note.
- `users`, `sessions`: see Security.
- `media`: file facts (path, sizes, dimensions, type, folder, trash). Descriptions, focal points and captions live in the `media` document, so they go through draft → publish like everything else.
- `submissions`: form messages. `audit`: who did what.

**Publishing** runs in one transaction:

1. Validate the draft bundle. Errors stop the publish.
2. Copy `draft → published` for every changed document, and remove documents deleted in the draft.
3. Store a version snapshot.

The public site reads the published bundle, which is cached in memory and cleared on publish, so changes are live on the next request.

**Restoring a version** writes that snapshot into the drafts (keeping a revision of each current draft). Then it either stops, so the editor can review, or publishes straight away.

## How a page is rendered

1. `server/html.js → resolveRoute` maps the address to one of: a page (by `path`), a case study, capability or insight (by prefix + `slug`), a redirect (`site.redirects`, legacy `/case-studies/…`), or "missing" (404).
2. `metaFor` builds the title, description, canonical address, robots and Open Graph tags from the page's SEO fields and the site defaults.
3. `renderShell` writes the meta tags into `dist/index.html`, and adds `window.__SITE_DATA__` (the bundle, safely escaped) and `window.__SITE_MODE__`. Every inline script gets the request's CSP nonce.
4. In the browser, `src/platform/data.js` reads `__SITE_DATA__`. `config.js` and `content.js` build the objects every component uses. If there is no server (a static export), the JSON files in `src/config` and `src/content` are used instead.
5. `App.jsx` creates routes from the pages. `SectionPage` renders `Sections`, which looks each section type up in `sections/registry.js`, and wraps each section with its motion scope, device visibility and an error boundary.

## The editor preview

The editor shows the real site in an iframe at `/<path>?__preview=1`. For signed-in users the server renders the **draft** bundle, with `__SITE_MODE__ = "preview"`, `noindex`, and no intro. In preview mode `src/preview/bridge.js` loads and:

- matches the draft content against the page, and tags each matching element with its field path (for example `sections.3.lines`);
- outlines things on hover. A click sends `select` to the editor, which opens the field. A double-click turns the text into an editable box and sends `inline-commit` when done;
- keeps the scroll position when the editor reloads the preview after a save.

Messages use `postMessage` restricted to the same origin.

## Security

- **Passwords:** scrypt (N=16384, r=8, p=1) with a per-user salt. The minimum length is 10. Five failed sign-ins lock that email and IP combination with an increasing delay.
- **Sessions:** a 32-byte random token in an `HttpOnly`, `SameSite=Lax` (and `Secure` in production) cookie. Only its SHA-256 is stored. Sessions expire after 14 days and are revoked on password reset or account disable.
- **CSRF:** every change request must send the session's token in `X-CSRF-Token`.
- **Roles:** checked on the server for every request.
  - `owner`: everything.
  - `admin`: publish, restore, delete media, inbox, site-wide settings.
  - `editor`: drafts and uploads only.
- **Input:** documents are sanitised on save (script URLs removed, control characters stripped, sizes capped, prototype keys dropped). Content is rendered by React as text, never as HTML.
- **Uploads:** the file type is detected from the file's bytes. Images are re-encoded (removing metadata and any hidden payload). SVG and HTML uploads are refused. Size limits apply.
- **Headers:** a Content-Security-Policy with a per-request nonce, `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy`, HSTS in production, and `noindex` on the editor and previews.
- **Forms:** a hidden spam-trap field, per-IP rate limiting (5 per 10 minutes), and server-side validation against the published form definition.

## Extending

See `docs/DEVELOPER-GUIDE.md`. Adding a section type, field, page template or colour preset needs no change to the editor: it reads `shared/schema.js`.
