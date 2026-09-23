# USFL website

The website of **USFL — Usable Solutions For Life**, together with its own visual editor.

- **The website** is cinematic and scroll-driven, moving between dark and white worlds. The approved design is the default configuration.
- **The editor** is at `/admin`. Sign in, see the real site, and change it:
  - click or double-click anything on the page to edit it;
  - replace images and films, and add, reorder or hide sections;
  - change layouts, create pages, edit the menu and footer;
  - set colours, type and motion;
  - manage case studies and SEO.

  Everything is saved as a **draft** and only reaches visitors when someone presses **Publish**. Every published version is kept and can be restored.

## Quick start

```bash
npm install
cp .env.example .env          # set ADMIN_EMAIL and ADMIN_PASSWORD
npm run dev                   # http://localhost:5173  ·  editor: http://localhost:5173/admin
```

Production:

```bash
npm run build
npm start                     # http://localhost:3000   (or use the Dockerfile)
npm test                      # end-to-end test of drafts, publishing, versions, roles, media and forms
```

Requires Node.js 22.13+. Content, uploads and accounts live in `DATA_DIR` (default `./data`): back it up.

## Documentation

| Document | For |
|---|---|
| [`docs/CLIENT-OWNER-MANUAL.md`](docs/CLIENT-OWNER-MANUAL.md) | **Start here.** Using the editor: your first 10 edits, how-to guides for every task, roles, troubleshooting. |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Hosting (Docker or Node), HTTPS, first sign-in, backups, updates, rollback. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the server, editor, preview and public site fit together; data model; security. |
| [`docs/DEVELOPER-GUIDE.md`](docs/DEVELOPER-GUIDE.md) | Commands, conventions, adding section types, templates, fields and collections; the API. |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Design tokens and their default values, contrast protection. |
| [`docs/MOTION-SYSTEM.md`](docs/MOTION-SYSTEM.md) | Motion presets, effects, transitions, scroll scenes, reduced motion. |
| [`docs/MEDIA-GUIDE.md`](docs/MEDIA-GUIDE.md) | Images: uploading, descriptions, focal points, sizes, rules. |
| [`docs/CINEMATIC-GUIDE.md`](docs/CINEMATIC-GUIDE.md) | Films: fallbacks, the Image 01 hero film, turning photos into films. |

## Before launch

- **Accounts:** create real accounts and remove `ADMIN_PASSWORD` from the environment.
- **Contact details:** the site shows none until real ones are entered under **Site settings & SEO → Contact**. Form messages arrive in the editor's **Inbox**.
- **Photography rights:** confirm usage rights for every photograph, and that no person shown is presented as the USFL team or a client.
- **Claims:** confirm any new client name, result, statistic, award or quote before publishing it.
- **Backups:** schedule backups of `DATA_DIR` (see `docs/DEPLOYMENT.md`).

## Stack

Node.js 22 (built-in SQLite) · Express 5 · React 19 · React Router 7 · GSAP 3 · Vite 8 · sharp. Fonts: Bricolage Grotesque, Instrument Sans, Instrument Serif, Geist Mono (SIL Open Font License). Third-party packages keep their own licences.
