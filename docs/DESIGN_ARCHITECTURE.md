# Yasdestek — Design Architecture

Visual direction: **calm autumn**. Warm, muted, unhurried — evolved from the original thesis site's nature-calm feel (foggy landscape, soft greens) into a deliberate token system. Users arrive grieving; the interface should feel like a quiet, warm room, never like a productivity dashboard.

Live preview (light + dark, real fonts, sample UI): https://claude.ai/code/artifact/5da641f4-ab73-4fc2-bf34-de8966e72dd1

## 1. Color Tokens

Implemented as CSS variables consumed by Tailwind/shadcn; components never hardcode hex values.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` | `#FAF6F0` | `#191410` | page ground |
| `surface` | `#F1E9DE` | `#241D17` | cards, sidebar, ghost buttons |
| `surface-raised` | `#FFFDFA` | `#201A14` | comments, letters, modals |
| `border` | `#E5DACB` | `#332A22` | hairlines, card borders |
| `primary` | `#A0522D` | `#C97B4F` | buttons, links, active states |
| `secondary` | `#7A7C58` | `#9FA173` | tags, subtle accents |
| `text` | `#2B2118` | `#EFE7DC` | body text, headings |
| `text-secondary` | `#4A3F35` | `#CBBFAF` | card body text |
| `muted` | `#6E6259` | `#A89A8C` | timestamps, hints, placeholders |
| `danger` | `#B3392F` | `#CF5B4E` | delete, deactivate |

Rules:

- **Never pure black or pure white.** Text is espresso on cream (light) and soft cream on dark espresso (dark) — warmth survives both modes.
- Dark mode is **the same warmth at night**, not an inversion: accents brighten (`primary` `#A0522D 
→ #C97B4F`) so they stay visible on dark ground; backgrounds stay warm-toned, never neutral gray or `#000`.
- `danger` is visually distinct from `primary` rust — destructive actions must never look like ordinary primary actions.

## 2. Theme Behavior

- Default follows the device (`prefers-color-scheme`); a manual light/dark toggle overrides it, stored per user.
- Both themes are first-class: every screen is checked in both before shipping.

## 3. Typography

Three faces, assigned by **content role** — all self-hosted (no runtime Google CDN), all OFL-licensed, all loaded with `latin` + `latin-ext` subsets (Turkish ğ, ş, İ, ç, ö, ü verified):

| Face | Role | Weights |
|---|---|---|
| **Google Sans** | UI: headings, buttons, labels, module content & rules | 400 / 500 / 700 |
| **Nunito Sans** | Everything users write: responses, comments | 400 / 600 / 700 |
| **Playwrite DE LA** | Letters only (Module 3 display *and* input) | 400 |

Rules:

- Playwrite DE LA is the **plain variant — never the "Guides" variant** (that one renders school-notebook guide lines).
- Playwrite is decorative: minimum size 18px, generous line-height (~2), never used for UI, body text, or anything long outside the letter context.
- System font stacks declared as fallbacks behind all three.
- Body text ~16px base; line length capped near 65–70ch in reading contexts (module content, responses).

**Licenses:** all three fonts are SIL OFL — commercial use and self-hosting permitted, no UI attribution required (license files ship with the font assets in the repo).

## 4. Shape & Elevation

- **Rounded everywhere**: soft radii (roughly Tailwind `rounded-xl`–`rounded-2xl` for cards/modals, full pill for buttons and tags). No sharp corners — softness is a deliberate emotional choice for this audience.
- **Shadows only on overlays** (modals, dropdowns, toasts): soft, warm-tinted, low-contrast. Everything else sits flat on the cream/espresso layers, separated by `surface` steps and hairline borders.

## 5. Spacing & Layout

- Tailwind's default spacing scale, used as-is.
- The participant area breathes: one primary thing per screen (the prompt, the writing area, the forum), no dense multi-column layouts.
- Admin/psychologist areas may be denser (tables, lists) but use the same tokens, radii, and type — one product, two tempos.

## 6. Accessibility Baseline

- WCAG AA contrast for text on all token pairings, both themes.
- Visible focus rings (primary-colored) on all interactive elements.
- Touch targets ≥ 44px in the mobile participant area.
- `prefers-reduced-motion` respected; motion is minimal by default.
- Deleted-comment placeholders, empty states, and errors are written in plain, warm Turkish — microcopy is part of the design system.

## 6.1 Terminology

- The psychologist role is called **"danışman"** everywhere in the user-facing UI (e.g. "Danışmanım", "Bu yorum danışman tarafından silinmiştir"); code, database, and docs keep `psychologist`. The English UI uses "counselor".

## 7. Implementation Notes

- Tokens live once as CSS variables (`:root` = light; `.dark` = dark overrides), mapped into `tailwind.config` so classes like `bg-surface`, `text-muted` exist; shadcn components consume the same variables.
- Fonts self-hosted as woff2 in `apps/web` (subsets: latin + latin-ext), declared via `@font-face` with `font-display: swap`.
- The app icon / manifest theme color derive from this palette (`background` cream, `primary` rust) — designed alongside the first screens.
