# Deployment

The website and its editor run as **one Node.js server** with a small database and an uploads folder. They need:

- a host that runs a long-lived Node.js 22.13+ process, or a Docker container;
- **persistent storage** for `DATA_DIR` (the database, uploads and version history). About 1 GB is plenty to start with.
- **HTTPS** in front of it. Most hosts provide this.

Static-only hosts (plain Netlify or Vercel static sites, S3) cannot run the editor, because the editor needs the server. For a read-only copy there, see "Static copy" at the end.

## 1. Settings (environment variables)

Copy `.env.example` to `.env` (or set the variables in your host's dashboard):

| Variable | Needed | Meaning |
|---|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first start | Creates the owner account if there are none. Remove the password afterwards (it is stored hashed). |
| `DATA_DIR` | yes | Folder for the database, uploads and versions, on a persistent disk (e.g. `/data`) |
| `PORT` | host-dependent | Default 3000 |
| `SITE_ORIGIN` | recommended | e.g. `https://usfl.co.za` (canonical links, sitemap, link previews) |
| `TRUST_PROXY` | behind a proxy | `1` when a proxy or load balancer terminates HTTPS (almost always) |
| `FORM_WEBHOOK_URL` | optional | Also forward contact-form messages to this `https://` webhook |

## 2. Option A: Docker (any VPS, Render, Railway, Fly.io, DigitalOcean App Platform…)

```bash
docker build -t usfl-site .
docker run -d --name usfl-site -p 3000:3000 --env-file .env -v usfl-data:/data --restart unless-stopped usfl-site
```

Or `docker compose up -d` with the included `docker-compose.yml`. The image builds the site, keeps only production dependencies, installs `ffmpeg` (for video posters), runs as a non-root user, stores data in the `/data` volume, and has a health check.

On a platform service, point it at the repository, choose **Dockerfile**, attach a **persistent disk mounted at `/data`**, set the variables above, and add your domain.

## 3. Option B: Node directly (VPS with PM2 or systemd)

```bash
git clone <repository> usfl-site && cd usfl-site
npm ci
npm run build
cp .env.example .env      # fill it in
npm start                 # or: pm2 start npm --name usfl-site -- start
```

Put Nginx (or Caddy) in front for HTTPS:

```nginx
server {
  server_name usfl.co.za;
  client_max_body_size 400m;              # video uploads
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  # listen 443 ssl; … (certbot adds these)
}
```

Set `TRUST_PROXY=1` so sign-in cookies and rate limits see the real visitor.

## 4. First sign-in

1. Open `https://<domain>/admin` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. (Or run `npm run user:create -- you@company.com owner` on the server, which prints a one-time password.)
2. Remove `ADMIN_PASSWORD` from the environment.
3. Under **Accounts**, add everyone else with the right role.
4. Under **Site settings & SEO**, check **Live website address** and the contact details.

## 5. Updating the code

Content lives in the database, so deploying new code never overwrites what editors have published.

```bash
git pull && npm ci && npm run build && pm2 restart usfl-site      # or rebuild the Docker image
```

If a code change adds new fields, they appear in the editor with their defaults. `npm run content:export` writes the current live content back into `src/config` and `src/content`, so developers can commit a snapshot.

## 6. Backups

Everything is in `DATA_DIR`:

- `site.db` holds content, drafts, versions, accounts and messages;
- `media/` holds uploads.

Back up both, for example nightly:

```bash
sqlite3 /data/site.db ".backup '/backups/site-$(date +%F).db'"   # consistent copy while running
tar czf /backups/media-$(date +%F).tgz -C /data media
```

(Most platform disks also offer snapshots.) To restore, stop the server, put the files back, and start it.

Inside the editor, **History & versions** already keeps every published version of the site. Backups protect against losing the disk itself.

## 7. Security notes

- Always serve over HTTPS. Sign-in cookies are marked `Secure` in production.
- The editor lives at `/admin`. It is `noindex`, and every change is checked for a signed-in account, the right role and a CSRF token.
- Keep Node.js and dependencies up to date (`npm audit`, then rebuild).
- Give people the lowest role they need. **Editor** cannot publish.

## 8. Rolling back

- **Content:** editor → **History & versions** → **Restore & publish** (instant).
- **Code:** deploy the previous Git commit or Docker image. Content is unaffected.

## Static copy (optional)

`npm run build:static` makes a read-only copy of the site in `dist-static/` from the JSON in `src/config` + `src/content`. It uses `/#/` addresses and needs no server, but it has no editor and no contact form. Run `npm run content:export` first so it reflects what is live.
