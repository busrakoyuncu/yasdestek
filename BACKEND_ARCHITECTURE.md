# Yasdestek — Backend Architecture

The backend is a single REST API in `apps/api`, serving all three roles. It owns every security decision — the frontend's guards are UX only.

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime / language | Node.js + TypeScript |
| Framework | NestJS |
| Database | PostgreSQL |
| ORM / migrations | Prisma |
| File storage | MinIO (S3-compatible, Docker), internal-only |
| Auth | Cookie-based sessions (httpOnly, secure), stored in Postgres |
| Password hashing | argon2 |
| Validation | zod schemas shared with the frontend via `packages/shared` |
| Rate limiting | NestJS throttler (login endpoint) |
| Tests | Vitest (unit) + supertest (endpoint/permission tests) |
| Logging | NestJS logger, structured request/error logs |

Rationale and rejected alternatives: see `BACKEND_ARCHITECTURE_ESSENTIALS.md`.

## 2. Project Structure

NestJS modules mirror the domain:

```
apps/api/src/
├── auth/          # login/logout, session guard, password change/reset
├── users/         # account creation, activation, hierarchy rules
├── groups/        # groups under psychologists, membership
├── modules/       # base/global/psychologist-scoped modules, group assignment
├── responses/     # module responses (text + media), publish state
├── forum/         # group×module forum reads, comments, moderation
├── files/         # upload/download through the API, MinIO client
├── analytics/     # admin views: psychologists → users → progress
├── prisma/        # PrismaService
└── common/        # guards, exception filter, zod validation pipe
```

## 3. Data Model

One `User` table for all roles.

- **User** — `role` (`admin` | `psychologist` | `user`), `username` (unique), `passwordHash`, `active` (default false), `mustChangePassword`, `psychologistId?` (owner, for participants), `groupId?` (for participants).
- **Group** — name, `psychologistId`.
- **Module** — title, `description` (welcome/purpose text), `rules` (module-specific expectations — required at creation), `questions` (ordered list of guided questions), order, `isBase`, `createdById`; scope derives from creator: base/admin → global, psychologist → visible only to their own users.
- **ContentPage** — slug + content for editable platform pages; seeded with `general-rules` ("Genel Kurallar"), admin-editable, readable by all roles.
- **GroupModule** — assignment of a module to a group (modules are assigned group-level, not per user).
- **Response** — one per user per module: text, published state, timestamps, `deletedAt?`.
- **MediaFile** — MinIO storage key, mime, size, `responseId`, `uploaderId`.
- **Comment** — text, `authorId`, `responseId`, `deletedAt?`, `deletedById?`. Comments attach to responses only — single-level threading, no comments on comments. The forum feed is the group's responses each with its comments nested beneath.
- **Message** — `senderId`, `recipientId`, body, `readAt?`, timestamps. Private user↔psychologist messaging: one continuous thread per pair; a user may only message their own psychologist and vice versa (ownership enforced like everything else).
- **Session** — id, `userId`, expiry.

### Soft delete

Moderated comments and removed responses keep their rows (`deletedAt`, `deletedById`). The forum renders a placeholder ("Bu yorum danışman tarafından silinmiştir") instead of the content. Hard delete exists only as an explicit admin action for privacy requests (user leaving the program).

## 4. Authentication

- **Sessions, not JWT.** Login verifies argon2 hash → creates a row in `Session` → sets an httpOnly, secure, sameSite cookie carrying only the session id. Every request resolves cookie → session → user.
- **Deactivation is immediate:** deactivating an account deletes its sessions in the same operation; the next request is rejected.
- **Passwords:**
  - Accounts are provisioned top-down; the creation flow **generates** a random password shown once to the creator.
  - `mustChangePassword` is set on creation and on every reset; the user is forced to set their own password at next login. Only argon2 hashes are ever stored.
  - **No email in the system.** Forgotten passwords flow up the hierarchy: psychologist resets their users, admin resets psychologists, admin recovery via server-side command.
- **Login rate limiting** per IP via the NestJS throttler.

## 5. Authorization — three layers

1. **Session guard (global):** valid session + `active` user, else 401.
2. **Roles guard (per endpoint):** declarative `@Roles(...)` metadata; wrong role → 403.
3. **Ownership (in services):** role alone never grants access to a *specific* record. Rules:
   - Psychologist ↔ user actions require `user.psychologistId === me.id`.
   - Comment moderation requires the comment's group to belong to me (or admin).
   - Participants read only their own group's forum and edit only their own response.

**House rule:** ownership conditions live *inside the Prisma query* (`where: { id, psychologistId: me.id }`), so "not found" and "not yours" are the same 404 and the check cannot be forgotten separately. Permission tests (supertest) explicitly attempt cross-ownership access and expect failure.

## 6. API Design

REST, JSON, cookie auth. Representative endpoints:

```
POST   /auth/login | /auth/logout | /auth/change-password
POST   /users                     # admin→psychologist, psychologist/admin→user
POST   /users/:id/activate | /users/:id/deactivate | /users/:id/reset-password
CRUD   /groups                    # psychologist scope
POST   /groups/:id/modules        # assign module to group (GroupModule)
CRUD   /modules                   # admin: global; psychologist: own-scoped
GET    /modules/mine              # participant: modules of my group
PUT    /modules/:id/response      # create/update my response
GET    /groups/:id/forum/:moduleId
POST   /responses/:id/comments
DELETE /comments/:id              # soft delete, moderation
POST   /files    GET /files/:id   # media, permission-checked
GET    /analytics/...             # admin
GET    /pages/:slug               # e.g. general-rules (all roles)
PUT    /pages/:slug               # admin
GET    /messages                  # psychologist: inbox (threads + unread); user: own thread
GET    /messages/:userId          # psychologist: thread with one of their users
POST   /messages                  # send within an allowed pair; marks read via PATCH /messages/:id/read
```

- **Validation:** every body/query is validated by the shared zod schema through one reusable validation pipe. Frontend forms and API validate with identical rules.
- **Error shape:** one exception filter emits `{ code, message }` consistently; the frontend maps `code` to translated messages.

## 7. File Handling

- **Upload:** browser → API (`multipart`), API checks permissions and limits, streams to MinIO, writes `MediaFile` row. Limits: images ≤ 10MB (jpeg/png/webp/heic), audio ≤ 50MB (webm/opus, mp4/aac — Safari records aac).
- **Download:** browser → `GET /files/:id` → API runs the ownership/group check → streams from MinIO. Range requests supported for audio scrubbing.
- **MinIO is never exposed publicly** — only the API talks to it. No presigned URLs in v1.

## 8. Seeding

`prisma db seed` creates, idempotently:

1. The first admin account (credentials from env, `mustChangePassword` set).
2. The 6 base modules with the Turkish prompt texts from the thesis (Appendix M), marked `isBase`, split into description/questions fields.
3. The `general-rules` content page with initial interaction rules.

## 9. Operations Notes

- Runs on the existing DigitalOcean droplet alongside Postgres and MinIO (deployment details in the system-design doc).
- **Nightly backup cron:** `pg_dump` + MinIO data directory into a dated archive; offsite copy (free tier object storage or manual pull) strongly recommended — media and narratives are irreplaceable.
- Config via env vars only; no secrets in the repo.

## 10. Testing Strategy

- **Unit (Vitest):** service logic — activation chain, password flows, module scoping.
- **Endpoint (supertest):** highest-value tests are adversarial permission tests: wrong role on every endpoint, cross-psychologist ownership attempts, deactivated-session rejection, inactive-user login.
- Seeded test database per run; tests cover the soft-delete placeholder behavior.
