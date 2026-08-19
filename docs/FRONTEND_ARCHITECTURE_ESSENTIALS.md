# Frontend Architecture — Essentials: Why These Choices

Companion to `FRONTEND_ARCHITECTURE.md`. For each decision: what we picked, why, and why not the alternatives.

## One website, not a separate admin app

**Chosen:** a single SPA with three role-based areas (`/app`, `/psychologist`, `/admin`).

**Why:** all roles share auth, the API, and much of the UI (a psychologist moderating a forum sees roughly what participants see). One app = one deploy, one component library, no duplicated login flow. The thesis website worked the same way — one site, elevated powers per account.

**Why not separate apps:** that split pays off when separate teams own them or the security domains are genuinely different. Neither applies. Admin code reaching participants' browsers is handled by route-based code splitting, and security lives in the API regardless.

## Vite, not Next.js

**Chosen:** Vite SPA.

**Why:** the whole product sits behind a login — no SEO, no public content. Vite is simpler (fewer concepts, no server/client component split), fast, and pairs natively with Vitest.

**Why not Next.js:** its core strengths (SSR, SEO, public pages) go unused here, while its complexity is carried everywhere. Future marketing pages ("What is Yasdestek") will be a separate small site in the monorepo — the classic app/marketing split (Notion, Linear, Slack) — so nothing built now is thrown away.

## TanStack Query + local state, not Redux

**Chosen:** TanStack Query for server data; `useState` + one session context for client state; Zustand only if a real cross-page client-state need appears.

**Why:** ~90% of this app's state is server data (modules, posts, comments, users), whose hard problems are caching, refetching, and loading/error handling — exactly what TanStack Query does out of the box. Remaining client state is tiny.

**Why not Redux:** using it for server data means hand-writing caching and loading flags that TanStack Query provides free. The ceremony buys nothing at this app's size.

**Why not Zustand now:** adding it later is a 20-minute job; adding it early invites putting things in a global store that belong local.

## Tailwind + shadcn/ui, not a component library or plain CSS

**Chosen:** Tailwind CSS with shadcn/ui primitives copied into the repo, one CSS-variable theme.

**Why:** the app has two moods — form/table-heavy admin areas (shadcn hands over accessible dialogs, dropdowns, forms) and an emotional participant area needing a custom, calm look (free Tailwind styling on the same design tokens). shadcn is unstyled enough not to fight the custom feel, and since its code lives in the repo, restyling is editing our own files. Note: shadcn is *built on* Tailwind — they are one system, not competing options.

**Why not MUI/Ant/Mantine:** everything looks like the library and overriding it is a constant fight — wrong for the participant-facing surface.

**Why not plain CSS/CSS Modules:** hand-building accessible dialogs, focus traps, and keyboard navigation is expensive and error-prone; consistency relies on discipline instead of a system.

## react-hook-form + zod

**Chosen:** react-hook-form for form state, zod for validation.

**Why:** one zod schema gives validation, TypeScript types for free, and — decisive point — lives in `packages/shared` so the API validates with the identical rules. Client and server can never disagree on what valid data is. shadcn's form components are built around exactly this pair.

**Why not hand-rolled validation / yup:** hand-rolling duplicates rules on both sides and drifts; yup is the older generation with weaker TypeScript inference.

## react-i18next from day one

**Chosen:** react-i18next, Turkish default + English.

**Why:** the product will ship both languages, and retrofitting i18n means touching every component — the single most expensive thing to add late. Strings live in translation files from the first component.

**Why not skipping i18n:** only defensible for Turkish-only-forever, which was ruled out.

**Boundary:** module content authored by admins/psychologists is data, displayed as written — the app translates its own UI only.

## Web manifest with standalone display, not a full PWA

**Chosen:** manifest + icons, `display: "standalone"`, install hint on iOS, install button on Android. No service worker in v1.

**Why:** the actual requirement is a home-screen icon that opens the app. Standalone wins for users: full screen for writing on phones, no browser chrome mis-taps, launches like an app. A full PWA (offline, background sync) would mean syncing offline-written grief narratives — real complexity with no v1 payoff.

**Why not `display: "browser"`:** address bar and tabs serve users who type URLs and share links; these users tap an icon into a private app.

**Known iOS limit:** Safari has no programmatic install prompt; the guided Share → Add to Home Screen hint is the platform ceiling, not a design choice.

## MediaRecorder API, no recording library

**Chosen:** browser-native MediaRecorder wrapped in one `useAudioRecorder` hook.

**Why:** ~50 lines of code, produces small good-quality files (webm/opus; mp4/aac on Safari), zero dependencies. The hard part of recording UX is design (states, re-record, permission-denied), which no library solves anyway.

**Why not libraries (RecordRTC etc.):** they wrap the same API and mattered when browser support was patchy; it no longer is. Accepting two formats server-side handles the Safari difference.

## Vitest + React Testing Library; Playwright deferred

**Chosen:** Vitest + RTL now; Playwright when real end-to-end flows exist.

**Why Vitest over Jest:** it reuses the Vite config — zero parallel build setup, faster.

**Why RTL:** tests interact the way users do (find button by label, click, assert), so refactors don't break tests that test behavior.

**Why defer Playwright:** E2E tests need a running backend and real flows; writing them first is wasted motion. Few E2E tests, critical journeys only — they are slow and flaky by nature.

**What we deliberately don't test:** static rendering without logic — maintenance cost, zero catch rate. Priority is permission-dependent UI, validation, and the recorder state machine.

## fetch wrapper, not axios

**Chosen:** a small typed wrapper around native `fetch`.

**Why:** interceptors-style needs (auth header, error normalization) fit in ~30 lines; native fetch is universal now.

**Why not axios:** its historical advantages (older-browser support, built-in JSON, interceptors) no longer justify a dependency.

## date-fns

**Chosen:** date-fns, UTC from the API, formatted per active locale.

**Why:** tree-shakeable (bundles only used functions), first-class TR/EN locales, plays well with i18n.

**Why not moment:** legacy, huge, mutable API — its own maintainers point elsewhere. Why not day.js: fine, but date-fns' per-function imports fit better with bundling.

## Feature-based folders, not type-based

**Chosen:** `features/auth`, `features/modules`, `features/forum`, ... each owning its components, queries, and logic.

**Why:** work happens feature-by-feature ("forum commenting") — one folder holds everything relevant. Features stay independent (no cross-feature imports), which keeps boundaries honest as the app grows.

**Why not type-based (`components/`, `hooks/`, `store/` at top level):** every feature change touches many folders, related code scatters, and nothing stops any file importing any other.
