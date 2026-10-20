# Yasdestek - Frontend Architecture

The frontend is a single-page application serving all three roles (admin, psychologist, user) from one codebase, living in `apps/web` inside the monorepo.

## 1. Stack

| Concern | Choice |
|---|---|
| Build tool / dev server | Vite |
| UI framework | Vue 3 (Composition API, `<script setup>`) + TypeScript |
| Routing | Vue Router |
| Server state | TanStack Query (Vue bindings) |
| Client state | `ref`/`reactive` + one session composable (Pinia only if a real need appears) |
| Styling | Tailwind CSS v4 + shadcn-vue (Reka UI primitives), custom theme |
| Forms | vee-validate + zod |
| i18n | vue-i18n - Turkish (default), English, and German |
| Audio recording | Browser MediaRecorder API (no library) |
| Home-screen install | Web manifest, `display: "standalone"` |
| HTTP | Small typed `fetch` wrapper (no axios) |
| Dates | date-fns with TR/EN/DE locales; API timestamps are UTC |
| Unit/component tests | Vitest + Testing Library (Vue) |
| E2E tests | Playwright - added once real end-to-end flows exist |
| Lint / format | ESLint (eslint-plugin-vue) + Prettier |

Rationale for each choice and rejected alternatives: see `FRONTEND_ARCHITECTURE_ESSENTIALS.md`.

## 2. Project Structure

Feature-based organization - each feature folder owns its components, queries, and logic:

```
apps/web/src/
├── app/                  # app frame: router, providers, auth guard, layout shells
├── features/
│   ├── auth/             # login page, session composable, role guard helpers
│   ├── modules/          # module list/detail, text editor, audio recorder, image upload
│   ├── forum/            # group forum: posts, comments, moderation actions
│   ├── psychologist/     # user management, groups, activation, own-module management
│   └── admin/            # psychologist management, global modules, analytics
├── components/           # shared presentational UI (shadcn-vue components land here)
├── lib/                  # api client, i18n setup, utilities
└── types/                # local types; shared contracts come from packages/shared
```

Rules:

- Features may import from `components/`, `lib/`, and `packages/shared` - not from each other. Cross-feature needs move down into `components/` or `lib/`.
- Server data access lives next to its feature as TanStack Query composables (e.g. `features/forum/useForumPosts.ts`).
- Single-file components (`.vue`) with `<script setup lang="ts">`; logic that is not template-bound lives in plain `.ts` composables beside them.

## 3. Routing

```
/login
/app/...            # participant area
/psychologist/...   # psychologist area
/admin/...          # admin area
```

- A single navigation guard reads the session (current user + role) and redirects users who open an area that is not theirs.
- Route-based code splitting per area (dynamic `import()` in route definitions), so participants do not download admin code.
- The guard is UX only - every permission is enforced again by the API.

## 4. State Management

Two kinds of state, handled differently:

- **Server state** (modules, posts, comments, users - anything from the database): TanStack Query. Caching, loading/error states, refetching, and post-mutation invalidation come from the library. Query keys follow `[domain, ...scope]`, e.g. `['forum', groupId, moduleId]`.
- **Client state** (open dialogs, form drafts, recording status): local `ref`/`reactive` inside components, plus one `useSession()` composable for the authenticated user. No global store until a concrete cross-page need appears; Pinia is the designated escape hatch.

## 5. Forms & Validation

- vee-validate for form state; zod schemas for validation via `@vee-validate/zod`.
- Validation schemas for API-bound data live in `packages/shared` and are reused by the backend, so client and server always agree on what valid data is.
- shadcn-vue form components wrap this pair; all forms use the same pattern.

## 6. Styling & Theming

- Tailwind CSS everywhere; shadcn-vue provides accessible primitives (dialogs, dropdowns, forms, toasts) copied into `components/`.
- One custom theme via CSS variables (colors, fonts, radii) defined in `DESIGN_ARCHITECTURE.md` - calm, warm look for the participant area; the same tokens keep admin/psychologist areas consistent.
- Participant area is **mobile-first responsive** (writing and audio recording must work well on phones). Admin and psychologist areas are desktop-first but not broken on mobile.

## 7. Internationalization

- vue-i18n with Turkish as default, plus English and German.
- All UI strings live in translation files from day one - no hardcoded user-facing text in components.
- Module *content* (prompts written by admins/psychologists) is data, not UI - it is stored and displayed as authored, not translated by the app.
- Date formatting follows the active locale via date-fns.

## 8. Home-Screen App (Manifest)

- A web manifest gives the site an app identity: name, icons, theme color, `display: "standalone"` (opens full-screen without browser chrome).
- iOS/Safari: no programmatic install prompt exists - show a one-time hint explaining Share → "Add to Home Screen".
- Android/Chrome: show an install button using the `beforeinstallprompt` event.
- No service worker / offline support in v1. Module writing requires connectivity. This is deliberate scope control; a full PWA can be layered on later.
- Because standalone mode has no browser refresh, error screens must offer a retry action.

## 9. Audio Recording

- `useAudioRecorder` composable in `features/modules/` wrapping MediaRecorder:
  1. Mic permission via `getUserMedia`
  2. Record with visible timer + stop control
  3. Result is a Blob (webm/opus on Chrome/Firefox, mp4/aac on Safari - both accepted)
  4. Preview with `<audio>` before publishing; re-record allowed
  5. Upload the blob on publish like any file
- Permission-denied and unsupported-browser states get explicit UI.

## 10. Error Handling

One pattern app-wide:

- Failed user actions (mutations): toast with a human message, mapped from the API's `{ code, message }`.
- Failed data loads: TanStack Query error states rendered inline with retry.
- Unexpected crashes: `onErrorCaptured` boundary per role area with a retry button.

## 11. Environment & Tooling

- Config via Vite env files: `VITE_API_URL`, etc. No secrets in the frontend - everything shipped to the browser is public by definition.
- In development Vite proxies `/api` to the NestJS server, the same shape Caddy gives in production.
- ESLint (eslint-plugin-vue) + Prettier with standard configs; `vue-tsc` for type-checking templates; CI runs lint, type-check, and tests.

## 12. Testing Strategy

- **Vitest + Testing Library (Vue)** for components and composables. Priority targets: permission-dependent UI (who sees which buttons), form validation, audio recorder state machine, i18n rendering.
- Not tested: static rendering with no logic.
- **Playwright** later, few tests, critical journeys only: login per role, complete a module (text + audio), post and moderate a comment, activate a user.
