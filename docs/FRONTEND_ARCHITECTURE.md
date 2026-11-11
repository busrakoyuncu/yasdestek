# Yasdestek - Frontend Architecture

The frontend is a single-page application serving all three roles (admin, psychologist, user) from one codebase, living in `apps/web` inside the monorepo.

## 1. Stack

| Concern | Choice |
|---|---|
| Build tool / dev server | Vite |
| UI library | React + TypeScript |
| Routing | React Router |
| Server state | TanStack Query |
| Client state | React `useState` + context (Zustand only if a real need appears) |
| Styling | Tailwind CSS + shadcn/ui, custom theme |
| Forms | react-hook-form + zod |
| i18n | react-i18next - Turkish (default), English, and German |
| Audio recording | Browser MediaRecorder API (no library) |
| Home-screen install | Web manifest, `display: "standalone"` |
| HTTP | Small typed `fetch` wrapper (no axios) |
| Dates | date-fns with TR/EN/DE locales; API timestamps are UTC |
| Unit/component tests | Vitest + React Testing Library |
| E2E tests | Playwright - added once real end-to-end flows exist |
| Lint / format | ESLint + Prettier |

Rationale for each choice and rejected alternatives: see `FRONTEND_ARCHITECTURE_ESSENTIALS.md`.

## 2. Project Structure

Feature-based organization - each feature folder owns its components, queries, and logic:

```
apps/web/src/
├── app/                  # app frame: router, layout shells, placeholder home
├── features/
│   ├── welcome/          # landing page: forest image, firefly canvas, Continue
│   ├── auth/             # login page, session query, role home map
│   ├── modules/          # module list/detail, text editor, audio recorder, image upload
│   ├── forum/            # group forum: posts, comments, moderation actions
│   ├── psychologist/     # user management, groups, activation, own-module management
│   └── admin/            # psychologist management, global modules, analytics
├── components/           # shared UI: LanguageSwitch, PageLoading, FireflySpinner, shadcn primitives under ui/
├── lib/                  # api client, i18n setup, query client, error messages, cn
├── locales/              # tr.json (source of truth), en.json, de.json
├── test/                 # vitest setup and the renderApp helper
└── types/                # local types; shared contracts come from packages/shared
```

Rules:

- Features may import from `components/`, `lib/`, and `packages/shared` - not from each other. Cross-feature needs move down into `components/` or `lib/`.
- Server data access lives next to its feature as TanStack Query hooks (e.g. `features/forum/useForumPosts.ts`).
- Section 13 describes what one feature folder contains and how its pieces fit.

## 3. Routing

```
/                   # welcome: the forest with fireflies and a Continue button (public)
/login              # sign in (public; a signed-in visitor is sent to their area)
/change-password    # forced on first sign-in and after a reset
/app/...            # participant area
/psychologist/...   # psychologist area
/admin/...          # admin area
```

- The welcome page is a door, not marketing (public pages are a non-goal in the PRD). It has no copy beyond the greeting.
- A single guard component reads the session (current user + role) and redirects users who open an area that is not theirs. Until the areas exist, one placeholder answers every signed-in route.
- Route-based code splitting per area, so participants do not download admin code.
- The guard is UX only - every permission is enforced again by the API.

## 4. State Management

Two kinds of state, handled differently:

- **Server state** (modules, posts, comments, users - anything from the database): TanStack Query. Caching, loading/error states, refetching, and post-mutation invalidation come from the library. Query keys follow `[domain, ...scope]`, e.g. `['forum', groupId, moduleId]`.
- **Client state** (open dialogs, form drafts, recording status): local `useState`, plus one context for the authenticated session. No global store until a concrete cross-page need appears; Zustand is the designated escape hatch.

## 5. Forms & Validation

- react-hook-form for form state; zod schemas for validation via `zodResolver`.
- Validation schemas for API-bound data live in `packages/shared` and are reused by the backend, so client and server always agree on what valid data is.
- shadcn/ui form components wrap this pair; all forms use the same pattern.

## 6. Styling & Theming

- Tailwind CSS everywhere; shadcn/ui provides accessible primitives (dialogs, dropdowns, forms, toasts) copied into `components/`.
- One custom theme via CSS variables (colors, fonts, radii) defined in `DESIGN_ARCHITECTURE.md` - a quiet, misty look for the participant area; the same tokens keep admin/psychologist areas consistent. Tailwind v4 is configured in CSS: the `@theme inline` block in `style.css` turns each variable into a utility class.
- Dark mode is a class, not a media query: `.dark` on `<html>` for the app areas (toggle to come), `.dark` on the page root for the always-night forest pages. See the design doc for the alias rule that makes a scoped `.dark` work.
- Participant area is **mobile-first responsive** (writing and audio recording must work well on phones). Admin and psychologist areas are desktop-first but not broken on mobile.

## 7. Internationalization

- react-i18next with Turkish as default, plus English and German. Language is picked in this order: the saved choice in local storage, then the browser language if it is one of the three, then Turkish. The `LanguageSwitch` dropdown changes it and saves it.
- All UI strings live in translation files from day one - no hardcoded user-facing text in components. Keys are grouped per feature (`auth.login.title`, `welcome.continue`); interpolation uses i18next's `{{name}}` form. `tr.json` is the source of truth; the other two files mirror its keys.
- Validation messages: zod's issues for required, too short, too long, and invalid format are mapped to `validation.*` keys through zod's global `customError`, so every form shows the same short translated messages without per-field work; anything else falls through to zod's own locale messages. A custom rule in a shared schema names its own key in `params.key` (the password case rule uses `passwordCase`), and the same mapping translates it.
- Module *content* (prompts written by admins/psychologists) is data, not UI - it is stored and displayed as authored, not translated by the app.
- Date formatting follows the active locale via date-fns.

## 8. Home-Screen App (Manifest)

- A web manifest gives the site an app identity: name, icons, theme color, `display: "standalone"` (opens full-screen without browser chrome).
- iOS/Safari: no programmatic install prompt exists - show a one-time hint explaining Share → "Add to Home Screen".
- Android/Chrome: show an install button using the `beforeinstallprompt` event.
- No service worker / offline support in v1. Module writing requires connectivity. This is deliberate scope control; a full PWA can be layered on later.
- Because standalone mode has no browser refresh, error screens must offer a retry action.

## 9. Audio Recording

- `useAudioRecorder` hook in `features/modules/` wrapping MediaRecorder:
  1. Mic permission via `getUserMedia`
  2. Record with visible timer + stop control
  3. Result is a Blob (webm/opus on Chrome/Firefox, mp4/aac on Safari - both accepted)
  4. Preview with `<audio>` before publishing; re-record allowed
  5. Upload the blob on publish like any file
- Permission-denied and unsupported-browser states get explicit UI.

## 10. Error Handling

One pattern app-wide:

- Failed user actions (mutations): toast with a human message.
- Failed data loads: TanStack Query error states rendered inline with retry.
- Unexpected crashes: React error boundary per role area with a retry button.
- Waiting: a signed-in screen renders `PageLoading` (night background, firefly spinner fading in after 300ms so a fast answer never flashes it) while the session is unknown; the same screen is the fallback while a lazily loaded area downloads. Buttons that start a request disable themselves and change their label; no spinners inside buttons.

## 11. Environment & Tooling

- Config via Vite env files: `VITE_API_URL`, etc. No secrets in the frontend - everything shipped to the browser is public by definition.
- ESLint (flat config: JS and typescript-eslint recommended, react-hooks, react-refresh, prettier last) and Prettier; CI runs lint, format check, type-check, and tests through the root scripts.
- Design checks: the Impeccable detector runs on the dev server before a UI PR (`npx impeccable detect http://localhost:5173/<route>`) and as an editor hook on the developer machine; it is not part of the repo. Screens are captured with headless Chrome through the DevTools protocol with device emulation, because a plain `--window-size` below ~500px is clamped and shows a cropped wider layout.

## 12. Testing Strategy

- **Vitest + React Testing Library** for components and hooks. Priority targets: permission-dependent UI (who sees which buttons), form validation, audio recorder state machine, i18n rendering.
- Tests live next to the file they cover and render through `test/render.tsx`, which mounts the element inside the real query client and a memory router with a catch-all route, so navigation is asserted on the router. The api module is mocked per test file; vendored browser-only code (the firefly canvas) is mocked because jsdom has no canvas. Assertions use roles and the Turkish copy, which the setup file forces.
- Not tested: static rendering with no logic.
- **Playwright** later, few tests, critical journeys only: login per role, complete a module (text + audio), post and moderate a comment, activate a user.

## 13. Building a Feature

The level below folders: what one feature looks like, so the next one looks the same. `features/auth` is the reference.

**Files.** `FooPage.tsx` for a routed screen, `useFoo.ts` for its server data, `FooPage.test.tsx` beside it. Small presentational pieces stay in the feature until a second feature needs them, then move to `components/`. No feature imports another feature.

**Server data.** Queries are declared once with `queryOptions` and keys shaped `[domain, ...scope]` (`['session']`, `['forum', groupId, moduleId]`), then used with `useQuery`. Mutations call the api module and write the result back into the cache (`setQueryData`) when the response is the new truth, or invalidate the key when it is not. A 401 anywhere is handled once, in the query client, which drops the session and returns to login. Components never call `fetch`.

**Forms.** `useForm` with `zodResolver` on a schema from `packages/shared`, never a schema written in the web app for API-bound data. Every input has a `<Label htmlFor>`, `aria-invalid` when it has an error, and its message in a `<p>` below it; a request failure renders in a `role="alert"` with `errorMessage(error)`. The submit button is disabled while the mutation is pending.

**Copy.** Every visible string goes through `t()` under the feature's namespace, added to all three locale files in the same change. Role names follow the glossary in the design doc ("danışman", "counselor", "Begleitung").

**Styling.** Tokens only (`bg-surface`, `text-glow`); no hex in components. shadcn primitives are added with the CLI into `components/ui` and restyled there once, not per usage. A page that needs the night theme puts `dark` on its root and passes `dark` to anything that portals. Participant screens are built phone-first and checked at 390px.

**Navigation and session.** Routes are declared in `app/router.tsx` with `Component`, one line per screen; each role area is one lazily loaded chunk. `homeFor[role]` is the only place that knows where a role lands.

**Tests.** One test per behaviour that can break: validation refusing bad input, the happy path calling the api with the right body and navigating, a known api error rendering its translated message. Rendering alone is not tested.

**Before opening a PR.** `pnpm lint`, `pnpm typecheck`, `pnpm test` from the root; the detector on each changed route; one desktop and one 390px capture looked at, in both themes once the toggle exists.
