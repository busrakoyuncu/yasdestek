# Backend Architecture - Essentials: Why These Choices

Companion to `BACKEND_ARCHITECTURE.md`. For each decision: what we picked, why, and why not the alternatives.

## NestJS, not Express

**Chosen:** NestJS.

**Why:** this product's core complexity is authorization - roles, an activation chain, ownership rules. NestJS gives those a designated home (guards, `@Roles()` metadata, modules per domain) and enforces consistent structure across the whole API. It also fits the learning goal: this project exercises exactly what NestJS is best at.

**Why not Express:** with Express, the architecture is whatever the developer improvises - every "where does this check live?" decision must be made and re-made consistently across ~40 endpoints. Express teaches fundamentals with less magic, but the cost lands on the most security-critical part of this app.

## PostgreSQL, not MongoDB/MySQL

**Chosen:** PostgreSQL.

**Why:** the domain is deeply relational - users belong to psychologists and groups, modules are assigned to groups, responses tie users×modules, comments hang off responses. Ownership checks are relational queries. Postgres gives integrity (foreign keys, constraints) natively and is the default of the Node ecosystem.

**Why not MongoDB:** the relations and integrity would have to be hand-built in application code - actively worse here. **Why not MySQL:** nothing wrong, but no advantage, and tooling (Prisma included) leans Postgres.

## Prisma, not Drizzle/TypeORM

**Chosen:** Prisma.

**Why:** one readable schema file that doubles as data-model documentation, generated migrations, fully typed queries (mistakes become compile errors), Prisma Studio for inspecting data, first-class NestJS integration pattern, best-in-class docs for a first backend.

**Why not Drizzle:** solid, but assumes more SQL fluency; fine choice, just not the learning-curve-optimal one. **Why not TypeORM:** what old NestJS tutorials use - aging, quirky, weaker type safety. Beware when googling.

## MinIO, not paid object storage / plain disk / DB blobs

**Chosen:** MinIO in Docker (dev and prod), files never in Postgres.

**Why:** zero cost was a hard constraint. MinIO speaks the same S3 API as every cloud storage service, so the code is written once - outgrowing the droplet later means changing env vars, not code. The database stores only metadata + storage keys.

**Why not DO Spaces:** the better managed option (~$5/mo, durability handled) but violates the no-cost constraint. **Why not plain disk folders:** works, but no S3 API - migrating later means rewriting file code. **Why not DB blobs:** bloats and slows the database; nobody does this deliberately.

**Accepted risk, mitigated:** one machine holds the only copy of irreplaceable data (voice recordings, grief narratives) → nightly backup cron is non-optional, offsite copy (e.g. Cloudflare R2 free tier, needs card on file) strongly recommended.

## Cookie sessions, not JWT

**Chosen:** httpOnly secure session cookies; sessions in a Postgres table.

**Why - the decisive reason:** deactivation must be instant. Sessions: delete the row, next request fails. JWT: the token in the browser stays valid until expiry - the server holds nothing to revoke; every workaround (blocklists, refresh rotation) reintroduces server-side state, i.e. sessions with extra steps. Also: httpOnly cookies are unreadable by JavaScript (XSS-resistant), and the app is one API + one domain + browser-only - JWT's statelessness solves a problem this architecture doesn't have.

**Why JWT feels standard but isn't here:** it dominates tutorials, mobile APIs, microservices, and third-party auth providers. For a same-domain browser app, sessions are the textbook (and OWASP-aligned) choice - Django, Rails, Laravel, Spring all default to them.

**Why sessions in Postgres, not Redis:** at this scale a table is plenty; Redis is another moving part with no current payoff. Swapping later is contained in one module.

## argon2, not bcrypt/plaintext

**Chosen:** argon2 hashes only - for initial, changed, and reset passwords alike.

**Why:** current best-practice password hash (memory-hard, GPU-resistant), maintained Node package. bcrypt is the acceptable fallback, not the first choice. Plaintext or reversible encryption is never on the table.

## No email in the system

**Chosen:** no email addresses stored; password resets flow up the hierarchy (psychologist → their users, admin → psychologists, server command → admin). Initial passwords are generated (never typed by the creator), shown once, and `mustChangePassword` forces a change at first login.

**Why:** accounts are provisioned top-down, so the hierarchy already is the recovery channel. The thesis deliberately used nicknames for anonymity - storing less personal data is a feature for a grief platform, and it eliminates email infrastructure entirely.

**Why generated initial passwords:** creator-typed passwords converge on `123456`; generation + forced change means after first login only the user knows their password.

## REST, not GraphQL/tRPC

**Chosen:** plain REST with JSON.

**Why:** predictable resource URLs, universal tooling, NestJS's native shape.

**Why not GraphQL:** built for many clients with divergent data needs; one SPA doesn't have that problem, and it adds a query language, resolver layer, and caching complexity. **Why not tRPC:** impressive DX but couples frontend and backend tightly and bypasses the REST knowledge worth learning here.

## Shared zod validation

**Chosen:** request schemas live in `packages/shared`; one NestJS validation pipe applies them; the React forms use the identical schemas.

**Why:** one source of truth for "what is valid data" - client and server cannot drift. This was the main reason `packages/shared` exists.

## Files through the API, MinIO internal-only

**Chosen:** uploads and downloads both pass through the API; MinIO is unreachable from the internet.

**Why:** the files are private health-adjacent data - a recording may only be heard by its group, their psychologist, and admins. Routing playback through `GET /files/:id` puts the ownership check in front of every byte. Keeping MinIO internal removes an entire attack surface.

**Why not presigned URLs:** they shine at scale by offloading traffic, but cost the permission checkpoint and add complexity - wrong trade at this size. Revisit only if file traffic ever becomes a real load problem.

## One `User` table for all roles

**Chosen:** single table + `role` enum; participants carry `psychologistId` and `groupId`.

**Why:** all roles share login, sessions, and authorship (comments, responses reference one author type). Separate tables would triplicate auth logic and complicate every relation for zero benefit.

## Modules assigned to groups, not individuals

**Chosen:** `GroupModule` - a psychologist assigns a module to a group; all members receive it.

**Why:** matches the intervention itself (the thesis ran groups through modules in sync, one per session) and keeps forums coherent (forum = group × module; nobody sees a forum for a module they don't have). Less management burden for psychologists. Individual pacing has an escape hatch: a group of one.

## Soft delete with visible placeholder

**Chosen:** moderated comments/responses keep their rows (`deletedAt`, `deletedById`); the UI shows "Bu yorum psikolog tarafından silindi". Hard delete is a separate explicit admin action for privacy requests.

**Why:** moderation disputes need the record; accidental deletes need undo; and the visible placeholder keeps group trust - content vanishing silently breeds suspicion in a therapeutic group. True erasure stays available for "delete my data" requests, where it is the correct behavior.
