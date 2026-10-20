# Yasdestek - Backend Architecture

The backend is a single REST API in `apps/api`, serving all three roles. It owns every security decision - the frontend's guards are UX only.

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime / language | Node.js + TypeScript |
| Framework | NestJS |
| Database | PostgreSQL |
| ORM / migrations | Prisma |
| File storage | Garage (S3-compatible, Docker) through the AWS SDK S3 client, internal-only |
| Auth | Cookie-based sessions (httpOnly, secure), stored in Postgres |
| Password hashing | argon2 |
| Validation | zod schemas shared with the frontend via `packages/shared` |
| Rate limiting | NestJS throttler (login endpoint) |
| Tests | Jest (unit) + supertest (endpoint/permission tests) |
| Logging | NestJS logger, structured request/error logs |

Rationale and rejected alternatives: see `BACKEND_ARCHITECTURE_ESSENTIALS.md`.

## 2. Project Structure

NestJS modules mirror the domain:

```
apps/api/src/
├── auth/          # login/logout/me, session guard, password change, rate limit
├── users/         # account creation, activation, reset, hard delete, hierarchy rules
├── groups/        # groups under psychologists, membership
├── modules/       # base/global/psychologist-scoped modules, group assignment
├── pages/         # editable content pages (general-rules)
├── responses/     # a participant's own response per module, publish state
├── files/         # upload/download/delete through the API
├── forum/         # group×module forum reads, comments, moderation
├── messages/      # participant↔psychologist threads, inbox, read marks
├── analytics/     # admin views: psychologists → users → progress
├── storage/       # the only S3 client (global module)
├── prisma/        # PrismaService (global module)
├── common/        # exception filter, zod validation pipe, roles guard, current user, password generator
├── scripts/       # reset-password recovery command
└── generated/     # Prisma client, gitignored, rebuilt on install
```

Every feature folder has a `*.service.ts` with the rules and a thin `*.controller.ts`. Shared zod schemas live in `packages/shared` and are compiled to CommonJS so both apps load them.

## 3. Data Model

One `User` table for all roles.

- **User** - `role` (`admin` | `psychologist` | `user`), `username` (unique), `passwordHash`, `active` (default false), `mustChangePassword`, `psychologistId?` (owner, for participants), `groupId?` (for participants).
- **Group** - name, `psychologistId`.
- **Module** - title, `description` (welcome/purpose text), `rules` (module-specific expectations - required at creation), `questions` (ordered list of guided questions), order, `isBase`, `createdById`; scope derives from creator: base/admin → global, psychologist → visible only to their own users.
- **ContentPage** - slug + content for editable platform pages; seeded with `general-rules` ("Genel Kurallar"), admin-editable, readable by all roles.
- **GroupModule** - assignment of a module to a group (modules are assigned group-level, not per user).
- **Response** - one per user per module: text, published state, timestamps, `deletedAt?`.
- **MediaFile** - object storage key, mime, size, `responseId`, `uploaderId`.
- **Comment** - text, `authorId`, `responseId`, `deletedAt?`, `deletedById?`. Comments attach to responses only - single-level threading, no comments on comments. The forum feed is the group's responses each with its comments nested beneath.
- **Message** - `senderId`, `recipientId`, body, `readAt?`, timestamps. Private user↔psychologist messaging: one continuous thread per pair; a user may only message their own psychologist and vice versa (ownership enforced like everything else).
- **Session** - id, `userId`, expiry.

### Soft delete

Moderated comments keep their rows (`deletedAt`, `deletedById`). The forum sends them with `text` and `author` set to null, and the frontend renders the placeholder ("Bu yorum danışman tarafından silinmiştir"). `Response.deletedAt` exists in the schema but no route sets it in v1.

Hard delete exists only as an explicit admin action for privacy requests: `DELETE /users/:id` erases a participant with their comments, the comments on their posts, files, responses, messages, and sessions in one transaction, then removes their Garage objects. Psychologists are deactivated, never erased.

## 4. Authentication

- **Sessions, not JWT.** Login verifies the argon2 hash → creates a row in `Session` (30 days) → sets an httpOnly, sameSite=lax cookie `sid` carrying only the session id (`secure` in production). Every request resolves cookie → session → user. The cookie is not signed: the id is a random UUID, so there is nothing to tamper with.
- **Deactivation is immediate:** deactivating an account deletes its sessions in the same transaction; the next request is rejected. Password changes and resets end every other session too.
- **Passwords:**
  - Accounts are provisioned top-down; the creation flow **generates** a 12-character password from an unambiguous alphabet, shown once to the creator.
  - `mustChangePassword` is set on creation and on every reset. The session guard then allows only `/auth/change-password`, `/auth/logout`, and `/auth/me` (routes marked `@AllowPasswordChangePending()`); everything else answers 403 `PASSWORD_CHANGE_REQUIRED`. Only argon2 hashes are ever stored.
  - **No email in the system.** Forgotten passwords flow up the hierarchy: psychologist resets their users, admin resets psychologists, admin recovery via `pnpm --filter api reset-password <username>` on the server (`node dist/scripts/reset-password.js` in production).
- **Login errors:** unknown username and wrong password both answer 401 `INVALID_CREDENTIALS`; an inactive account answers 401 `ACCOUNT_INACTIVE` only after the password checks out.
- **Login rate limiting:** 10 attempts per IP per minute via the NestJS throttler, 429 `TOO_MANY_REQUESTS`. Express trusts one proxy hop so the IP behind Caddy is the client's.

## 5. Authorization - three layers

1. **Session guard (global):** valid session + `active` user, else 401.
2. **Roles guard (per endpoint):** declarative `@Roles(...)` metadata; wrong role → 403.
3. **Ownership (in services):** role alone never grants access to a *specific* record. Each service has a small function that turns the caller into a Prisma `where` filter, spread into every query. The rules:
   - Accounts: admins manage every non-admin account; psychologists manage their own participants.
   - Groups: psychologists own theirs; admins read all and may delete.
   - Modules: base and admin-created modules are global; psychologist-created ones are visible to that psychologist and their groups only; participants see what is assigned to their group. Admins edit global modules, psychologists their own.
   - Responses: a participant writes only to modules assigned to their group, and only their own response.
   - Files: readable by the uploader, their psychologist, admins, and group mates once the response is published.
   - Forum: readable by the group's members, its psychologist, and admins; only members comment; the group's psychologist or an admin moderates.
   - Messages: a participant reaches only their psychologist, a psychologist only their participants.

**House rule:** ownership conditions live *inside the Prisma query* (`where: { id, psychologistId: me.id }`), so "not found" and "not yours" are the same 404 and the check cannot be forgotten separately. Permission tests (supertest) explicitly attempt cross-ownership access and expect failure.

## 6. API Design

REST, JSON, cookie auth. Every endpoint, with who may call it (A admin, P psychologist, U participant):

```
POST   /auth/login                          public, rate limited
POST   /auth/logout | /auth/change-password | GET /auth/me   any role, also while a password change is pending

POST   /users                               A→psychologist or participant, P→own participant; returns the account + temporary password once
GET    /users                               A: every non-admin, P: own participants
POST   /users/:id/activate | /deactivate | /reset-password    A, P (own)
DELETE /users/:id                           A, participants only: privacy erasure

POST   /groups  PATCH /groups/:id           P
GET    /groups  GET /groups/:id             A, P (own)
DELETE /groups/:id                          A, P (own); members keep their accounts and content
POST   /groups/:id/members                  P: add own participant (moves them if in another group)
DELETE /groups/:id/members/:userId          P

GET    /modules  GET /modules/:id           any role, scoped by visibility (participants: assigned to my group, in order)
POST   /modules  PATCH /modules/:id  DELETE /modules/:id     A (global), P (own); base modules and modules with responses cannot be deleted
POST   /groups/:groupId/modules             P: assign a visible module to an own group (idempotent)
DELETE /groups/:groupId/modules/:moduleId   P

GET    /pages/:slug                         any role
PUT    /pages/:slug                         A, existing slugs only

GET    /modules/:moduleId/response          U: my response with its files
PUT    /modules/:moduleId/response          U: create or update, { text, published }

POST   /files                               U: multipart { file, moduleId }; creates my draft if missing
GET    /files/:id                           permission-checked stream, byte ranges (206/416)
DELETE /files/:id                           U: uploader only

GET    /groups/:groupId/forum/:moduleId     members, their psychologist, A
POST   /responses/:id/comments              U: members of the author's group, published responses only
DELETE /comments/:id                        P (own groups), A: soft delete

GET    /messages                            U: my thread; P: inbox (participants + unread counts)
GET    /messages/:userId                    P: thread with one participant
POST   /messages                            U: to my psychologist; P: { recipientId } must be an own participant
PATCH  /messages/:id/read                   recipient only

GET    /analytics/psychologists             A
GET    /analytics/users/:id                 A: assigned modules with status not_started | in_progress | completed
```

- **Validation:** every body is validated by the shared zod schema through one reusable validation pipe (`@Body(new ZodValidationPipe(schema))`). Unknown keys are dropped. Frontend forms validate with identical rules.
- **Error shape:** one exception filter emits `{ code, message }` consistently; the frontend maps `code` to translated messages. Codes derive from the HTTP status (`NOT_FOUND`, `FORBIDDEN`, ...) unless a route sets a specific one (`VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`, `USERNAME_TAKEN`, `PSYCHOLOGIST_REQUIRED`, `BASE_MODULE`, `MODULE_IN_USE`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, `FILE_REQUIRED`, `RANGE_NOT_SATISFIABLE`, `RECIPIENT_REQUIRED`, `TOO_MANY_REQUESTS`). Unexpected errors are logged and answered with a generic 500.
- **Postman:** `apps/api/postman/yasdestek.postman_collection.json` holds every request above with example bodies.

## 7. File Handling

- **Upload:** browser → API (`multipart`, held in memory by multer up to the largest limit) → type and size checked against the rules in `packages/shared` (images ≤ 10MB jpeg/png/webp/heic, audio ≤ 50MB webm/opus, mp4/aac - Safari records aac) → object written to Garage under `responses/<responseId>/<uuid>` → `MediaFile` row. Object first, row second, so a failed write never leaves a row pointing at nothing. The participant's draft response is created if they upload before writing any text.
- **Download:** browser → `GET /files/:id` → API runs the permission query → streams from Garage with `Content-Type`, `Content-Length`, `Accept-Ranges`. `Range: bytes=start-end` answers 206 with `Content-Range`; a start past the end answers 416.
- **Delete:** uploader only; row first, then the object. A leftover object is harmless, a dangling row is not.
- **Garage is never exposed publicly** - only `StorageService` talks to it, and the storage key never leaves the API. No presigned URLs in v1. The bucket is created on startup if missing.

## 8. Seeding

`prisma db seed` creates, idempotently:

1. The first admin account (`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from env, active, `mustChangePassword` set). An existing admin is left untouched; use the reset-password command to recover it.
2. The 6 base modules, marked `isBase`, from `prisma/base-modules.ts`. The texts there are placeholders until the Turkish prompt texts from the thesis (Appendix M) are pasted in.
3. The `general-rules` content page with initial interaction rules.

Existing rows are never overwritten, so admin edits survive a re-seed.

## 9. Operations Notes

- Runs on the existing DigitalOcean droplet alongside Postgres and Garage (deployment details in the system-design doc).
- **Nightly backup cron:** `pg_dump` + Garage data directory into a dated archive; offsite copy (free tier object storage or manual pull) strongly recommended - media and narratives are irreplaceable.
- Config via env vars only; no secrets in the repo.

## 10. Testing Strategy

- **Unit (Jest):** every service has a spec with Prisma mocked - activation chain, password flows, scoping filters per role, soft-delete placeholder, file rules, status derivation.
- **Endpoint (supertest):** one e2e file per feature, built around adversarial permission tests: wrong role on every endpoint, cross-psychologist and cross-group attempts (expected 404), deactivated-session rejection, inactive-user login, the forced password change, the rate limit. Files run against the real Garage container.
- **Test database:** the e2e global setup (`test/global-setup.ts`) derives `<db>_test` from `DATABASE_URL`, drops and recreates it, runs `prisma migrate deploy` and the seed, and points every worker at it. Dev data is never touched. Each e2e file prefixes the accounts it creates and deletes them afterwards.
- **Running:** `pnpm test` and `pnpm test:e2e` from the repo root; e2e needs `docker compose up -d`. ts-jest compiles tests through `tsconfig.spec.json` (CommonJS) so Jest can load the generated Prisma client.
- **CI:** `.github/workflows/ci.yml` runs build, lint (zero warnings), Prettier, type-check, unit and e2e tests on every pull request and push to `main`, with a Postgres service and a Garage container.
