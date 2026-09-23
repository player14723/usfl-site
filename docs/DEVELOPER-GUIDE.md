# Developer guide

## Requirements

- Node.js **22.13 or newer** (uses the built-in `node:sqlite`) and npm 10+
- Optional: `ffmpeg` on the server, to make poster frames for uploaded videos automatically
- For the media tools only: Python 3.10+ with `numpy`, `opencv-python` and `Pillow`, plus `ffmpeg`

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Server + live-reloading site on http://localhost:5173, editor on http://localhost:5173/admin |
| `npm run build` | Content check, then build the site and the editor into `dist/` |
| `npm start` | Production server (serves `dist/`; run `npm run build` first) |
| `npm test` | End-to-end test of drafts, publishing, versions, roles, media and forms against a throw-away database |
| `npm run check` | Validate `src/config` + `src/content` (the seed content) |
| `npm run user:create -- <email> [owner\|admin\|editor] [name]` | Create an account and print a one-time password |
| `npm run user:reset -- <email>` | Print a new one-time password |
| `npm run content:export [-- draft]` | Write the published (or draft) content back to `src/config` + `src/content` |
| `npm run content:import` | Load `src/config` + `src/content` into the **draft** (review and publish in the editor) |
| `npm run build:static` | A static, read-only copy (hash routing, no editor, no forms) in `dist-static/` |

On first start the server creates `DATA_DIR` (default `./data`), seeds the database from `src/config` and `src/content`, and records that as version 1. If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set and no accounts exist, it creates the owner. Otherwise use `npm run user:create`.

## Ground rules

1. **The editor is the source of truth for content.** `src/config` and `src/content` are the seed only. Use `content:export` to bring live content back into Git, and `content:import` to push file edits into the draft.
2. **Components never import content JSON.** Read through `src/platform/*`: `SITE`, `BRAND`, `NAV`, `THEME`, `MOTION`, `PAGES`, `CASES`, `CAPABILITIES`, `INSIGHTS`, `SYSTEM`, `resolveImage`, `resolveCinematic`.
3. **Colours and type come from CSS variables** (`var(--ink)`, `var(--font-display)`). For alpha colours, use `color-mix(in srgb, var(--x) N%, transparent)`.
4. **Every animation respects `useMotion()`**, lives in `useGSAP` + `gsap.matchMedia()`, and has a `.motion-off` static state (see `docs/MOTION-SYSTEM.md`). Text only slides or fades, and always ends solid.
5. **Nothing invented.** No placeholder statistics, testimonials, logos or contact details. Empty optional fields render nothing.
6. **Keep schema and components in step.** `npm run check` fails if a section type exists in one but not the other.

## Adding a section type

Example: a "quote" section.

**1. Component:** `src/sections/Quote.jsx`

```jsx
import { ScrollText } from '../components/ui/Reveal'

/** QUOTE — one attributed quotation. Only publish real, approved quotes. */
export default function Quote({ sid = 'quote', theme = 'dark', text = '', name = '', role = '' }) {
  if (!text) return null
  return (
    <section data-theme={theme} className="section" aria-labelledby={`${sid}-q`}
      style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,160px)) 0' }}>
      <div className="wrap">
        <ScrollText as="blockquote" id={`${sid}-q`} kind="up" className="display display-lg" text={text} style={{ margin: 0, maxWidth: '20ch' }} />
        {name && <p className="mono dim" style={{ marginTop: 32 }}>{name}{role ? ` · ${role}` : ''}</p>}
      </div>
    </section>
  )
}
```

Accept `sid` and `theme`, set `data-theme` (the navigation colour follows it), scale padding with `var(--section-space)`, and return `null` when required content is missing.

**2. Register it:** `src/sections/registry.js`

```js
import Quote from './Quote'
quote: { component: Quote, label: 'Quote' },
```

**3. Describe it for the editor:** add an entry to `SECTION_TYPES` in `shared/schema.js`

```js
{
  type: 'quote', label: 'Quote', category: 'Content', description: 'One attributed quotation.',
  fields: [theme('dark'), f.textarea('text', 'Quote'), f.text('name', 'Name'), f.text('role', 'Role')],
  defaults: { theme: 'dark', text: '' },
},
```

That is all. The **Add section** gallery, the inspector form (with Content, Layout, Media and Motion tabs taken from each field's `group`), click-to-edit in the preview, validation and the build check all pick it up.

Field types: `text`, `textarea`, `markup` (text with *italic* support), `toggle`, `number`, `select`, `color`, `image`, `video`, `cinematic`, `ref` (a case, capability, insight or stage, optionally `multiple`), `lines`, `link`, `object`, `list`, `typed` (a list of mixed block types) and `devices`. Options: `hint`, `default`, `group` (`content` · `layout` · `media` · `motion` · `form` · `section`), `min` / `max` / `step`, `itemLabel` (lists), `asStrings` (a list of plain values), `open` (objects), `required`.

## Adding a page template, colour preset or field

- **Page template:** add to `PAGE_TEMPLATES` in `shared/schema.js`: `{ id, label, description, sections: ['page-hero', …] }`.
- **Colour preset:** add to `THEME_PRESETS`.
- **A new site-wide setting:** add the field to the relevant `SETTINGS` entry, then read it in the component through `src/platform/config.js`.

## Adding a collection (e.g. Team)

1. Add to `COLLECTIONS` in `shared/schema.js`.
2. Add the kind to `COLLECTION_OF` / `KIND_OF` in `shared/bundle.js`.
3. Add a loader in `src/platform/content.js`, a template page in `src/pages/`, and a route in `src/App.jsx` (plus its prefix in `site.routes`).
4. Add the route to `server/html.js → resolveRoute`.
5. Add a list and item editor route in `src/admin/main.jsx` (the generic `CollectionView` and `ItemEditor` work for any kind), plus a sidebar link in `src/admin/components/Shell.jsx`.
6. Add validation to `shared/validate.js` if needed.

## API (used by the editor)

All `/api` responses are JSON. Every change request needs the session cookie and the `X-CSRF-Token` header.

| Method & path | Who | Purpose |
|---|---|---|
| `GET/POST/DELETE /api/session` | anyone | Current session, sign in, sign out |
| `POST /api/account/password` | signed in | Change own password |
| `GET /api/site?stage=draft\|published` | signed in | The whole bundle |
| `GET /api/docs` · `GET /api/docs/:key` | signed in | Document list with status · one document (draft, published, rev) |
| `PUT /api/docs/:key` `{ data, rev }` | editor+ (settings: admin+) | Save a draft |
| `POST /api/docs` `{ kind, id, data }` · `DELETE /api/docs/:key` | editor+ | Create · delete in draft |
| `POST /api/docs/:key/discard` | editor+ | Back to published |
| `GET /api/docs/:key/revisions` · `POST …/revisions/:id/restore` | editor+ | Earlier drafts |
| `GET /api/changes` · `GET /api/validate` | signed in | What would be published · checks |
| `POST /api/publish` `{ note }` · `POST /api/discard` | admin+ | Publish all · discard all |
| `GET /api/versions` · `POST /api/versions/:id/restore` `{ publish }` | admin+ to restore | History |
| `GET/POST /api/media` · `PATCH/DELETE /api/media/:id` · `…/restore` · `…/purge` · `…/usage` · `…/poster` | editor+ (delete: admin+) | Media library |
| `GET/POST/PATCH/DELETE /api/users…` · `POST /api/users/:id/password` | owner | Accounts |
| `GET/PATCH/DELETE /api/inbox…` | admin+ | Form messages |
| `POST /api/forms/:sectionId` | public | Contact form (rate-limited) |

## Testing checklist

1. `npm run check`, `npm run build` and `npm test` all pass.
2. `npm start`, then open each page at 375, 390, 768, 1024, 1280, 1440 and 1920 px wide: no horizontal scroll, no console errors.
3. Emulate `prefers-reduced-motion: reduce`: every page reads fully, with nothing hidden.
4. Keyboard only: navigation, mobile menu (Esc closes), forms and the editor's dialogs.
5. In the editor:
   - edit text on the page and in the panel;
   - replace an image;
   - add, move and hide a section;
   - publish, then check the live site;
   - restore the previous version.

## Licences

Third-party packages keep their own licences (`node_modules/<package>/LICENSE`). GSAP is used under its standard no-charge licence. The fonts (Bricolage Grotesque, Instrument Sans, Instrument Serif, Geist Mono) are under the SIL Open Font License 1.1. `sharp` (Apache-2.0) bundles libvips (LGPL-3.0).
