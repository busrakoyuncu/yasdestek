# System Architecture — Essentials: Why These Choices

Companion to `SYSTEM_ARCHITECTURE.md`. For each decision: what we picked, why, and why not the alternatives.

## Docker (and what it even is)

**Chosen:** Postgres, MinIO, and the API each run in a Docker container; `docker-compose.yml` defines them all.

**What it is:** Docker runs a program in a sealed, self-contained box (container) holding the program plus everything it needs, isolated from the host machine. Containers are disposable — delete and recreate in seconds; persistent data lives in **volumes** (storage bolted to the host that survives container rebuilds).

**Why:**
- **Identical everywhere.** The Postgres container on the laptop is the same on the droplet — kills "works on my machine" for infrastructure.
- **Clean machine.** Nothing installed system-wide; wiping or upgrading a service is delete-and-recreate, not uninstall-and-pray.
- **One-command infrastructure.** `docker compose up` starts everything, wired together, on any machine with Docker.

**Why not installing Postgres/MinIO directly on the droplet:** works, but upgrades, conflicts, and server rebuilds become manual archaeology; and dev machines would each need their own hand-installed copies.

**Why not Kubernetes / managed container platforms:** built for fleets of servers and teams; one droplet + one compose file is the right size, and the paid managed options violate the zero-cost constraint.

## Caddy, not nginx

**Chosen:** Caddy as the reverse proxy — the single public entrance serving the SPA's static files and forwarding `/api/*` to NestJS.

**Why a reverse proxy at all (any setup needs one):** the built frontend is static files, the API is a process on an internal port; one public address must route to both, and something must speak HTTPS on 443. This is independent of the monorepo — code organization and traffic routing are unrelated decisions.

**Why Caddy:** automatic HTTPS. It obtains and renews Let's Encrypt certificates by itself, forever — with nginx that's a separate tool (certbot) plus renewal timers to set up and monitor. Caddy's config is ~10 lines to nginx's ~50. For a solo operator, fewer moving parts in the security-critical path wins.

**Why not nginx:** more powerful and more standard, but its power is knobs this project never turns, and manual certificate plumbing is a real recurring failure point.

## One domain, API under `/api`

**Chosen:** frontend and API share `yasdestek.com` — `/` and `/api` — single origin.

**Why:** session cookies work with zero cross-origin configuration and production needs no CORS at all. The "login works locally but breaks in prod" class of bugs lives almost entirely in CORS/cookie-domain settings; a single origin deletes the category. Also: one DNS record, one certificate.

**Why not `api.yasdestek.com`:** buys nothing here and reintroduces exactly that configuration. Subdomains earn their keep with separate teams or separate infrastructure — neither applies.

## Postgres and MinIO never public

**Chosen:** only Caddy listens on public ports; database and file storage are reachable solely by the API over the internal Docker network.

**Why:** every public port is attack surface. Databases and storage exposed to the internet are the top cause of leaked-data incidents — and this app holds grief narratives. The API is the single, permission-checked gateway to everything.

## deploy.sh first, GitHub Actions later

**Chosen:** a hand-run deploy script (SSH → pull → build → compose up → migrate); CI automation added only once deploys are routine.

**Why:** the script *is* the documentation of how deployment works, and the operator learns every step — decisive when something breaks in production. Automating a process you don't yet understand hides failures behind a robot.

**Why not CI from day one:** it automates a process that doesn't exist yet; premature. Adding Actions later is wrapping a known-good script, near-zero risk.

**Why not paid PaaS (Vercel/Render/Fly):** genuinely easier, but violates the zero-cost constraint and teaches nothing about the server already being paid for.

## Secrets in a droplet-only .env

**Chosen:** all secrets live in `.env` on the droplet; git carries only `.env.example` with dummy values.

**Why:** git is a photocopier with perfect memory — a secret committed once lives in history forever, and leaked repo = leaked production. The example file keeps the *shape* documented without the values.

## Nightly backups from day one

**Chosen:** 03:00 cron — `pg_dump` + MinIO media archive, dated, rolling window; offsite copy strongly recommended (free: R2 free tier or manual pull).

**Why:** the droplet is a single point of failure holding irreplaceable human writing and voices. A backup on the same disk protects against mistakes and corruption; only an offsite copy protects against the machine dying. Shipping this with the *first* deploy, not later, because "later" historically means "after the first loss".

## What we deliberately don't run

- **Redis** — sessions sit in a Postgres table at this scale; one fewer resident.
- **Load balancer / CDN / second server** — group-based grief support is small-scale by nature; complexity is added when reality demands it, not in anticipation.
