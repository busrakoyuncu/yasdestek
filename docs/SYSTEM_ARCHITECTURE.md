# Yasdestek - System Architecture

How the monorepo's parts run in production on the existing DigitalOcean droplet, and how code gets there. Zero-cost constraint: no paid services; everything below is free software on the droplet we already have.

## 1. Big Picture

```
                              DigitalOcean Droplet
                    ┌──────────────────────────────────────┐
  yasdestek.com ───▶│  Caddy  (reverse proxy, auto-HTTPS)  │
   (443, HTTPS)     │   ├── /        → built SPA (static)  │
                    │   └── /api/*   → api container :3000 │
                    │                                      │
                    │  Docker Compose:                     │
                    │   ├── api       (NestJS)             │
                    │   ├── postgres  (volume: db data)    │
                    │   └── minio     (volume: media)      │
                    │                                      │
                    │  cron (03:00): pg_dump + media dir   │
                    │  .env (secrets, never in git)        │
                    └──────────────────────────────────────┘
```

- **Postgres and MinIO are never exposed to the internet** - they're reachable only by the API on the internal Docker network. The only public entrance is Caddy on 80/443.
- Port 80 exists only to redirect to 443 (Caddy does this by default).

## 2. Caddy (reverse proxy)

- Serves the built frontend (`apps/web/dist`) as static files at `/`.
- Proxies `/api/*` to the NestJS container.
- **Automatic HTTPS**: obtains and renews Let's Encrypt certificates itself - no certbot, no renewal cron.
- Config is a ~10-line `Caddyfile`, versioned in the repo.

## 3. One Domain

Frontend and API share `yasdestek.com` (`/` and `/api`). Single origin means:

- Session cookies work with no cross-origin configuration.
- No CORS setup in production at all.
- One certificate, one DNS record (A record → droplet IP).

Future marketing site: takes over `/` when it exists, app moves under a path or subdomain - decided then, nothing now depends on it.

## 4. Docker Compose

Production `docker-compose.yml` runs three services:

| Service | Image | State |
|---|---|---|
| `api` | built from `apps/api` Dockerfile | stateless |
| `postgres` | official postgres | named volume `pgdata` |
| `minio` | official minio | named volume `media` |

- Caddy runs on the host (or as a fourth compose service - decided at setup; host install is simplest).
- **Volumes** hold all state; containers are disposable and rebuilt on every deploy.
- Local development uses the same compose idea: postgres + minio in Docker, while `api` and `web` run directly (`pnpm dev`) for hot reload. Dev and prod differ in dressing, not shape.

## 5. Configuration & Secrets

- All secrets (Postgres password, session secret, MinIO keys, seed admin credentials) live in a `.env` file **on the droplet only**; `.env.example` in git documents the required keys with dummy values.
- The web build gets its config (`VITE_API_URL=/api`) at build time; nothing secret ships to the browser.

## 6. Deployment

**Stage 1 (start here): `deploy.sh`** - run from the developer machine:

1. SSH to the droplet
2. `git pull` the monorepo
3. Build the web app (static files → Caddy's serve directory)
4. Build the api image, `docker compose up -d`
5. Run Prisma migrations (`prisma migrate deploy`)

One command, every step visible and understandable.

**Stage 2 (later): GitHub Actions** - the same steps triggered by push to `main`, added once manual deploys feel routine. Automation of a trusted process, not a new system.

## 7. Backups (night guard)

Nightly cron on the droplet (03:00):

1. `pg_dump` the database
2. Archive the MinIO media volume
3. Pack both into a dated archive, keep a rolling window (e.g. 14 days)
4. **Offsite copy strongly recommended** - the archive alone still lives on the same disk it protects. Free option: Cloudflare R2 free tier (10GB, S3-compatible; requires card on file) or periodic manual pull to a local machine.

Grief narratives and voice recordings are irreplaceable; the backup job ships with the first deploy, not "later".

## 8. What We Deliberately Don't Run

- **nginx** - Caddy took the job (auto-HTTPS, minimal config).
- **Redis** - sessions live in Postgres at this scale.
- **Kubernetes / managed containers** - one droplet, one compose file is the right size.
- **CDN, load balancer, multiple servers** - group-based grief support is inherently small-scale; revisit only if reality demands it.
