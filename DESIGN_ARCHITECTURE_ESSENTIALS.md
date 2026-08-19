# Design Architecture — Essentials: Why These Choices

Companion to `DESIGN_ARCHITECTURE.md`. For each decision: what we picked, why, and why not the alternatives.

## Calm autumn direction

**Chosen:** warm, muted autumn palette evolving the original thesis site's nature-calm feel.

**Why:** the audience arrives grieving. The interface should read as a quiet, warm room — the thesis site's foggy-landscape softness was already right for this; we kept its spirit and executed it as a real token system instead of a background photo doing all the work.

**Why not a clinical/neutral look:** grays and blues read as institutional — hospital forms, dashboards. Wrong emotional register for narrative grief work.

## Brown-family light mode, but layered

**Chosen:** cream ground, beige surfaces, rust primary, olive secondary, espresso text.

**Why:** an all-brown UI goes muddy fast. The structure is cream/beige *layers* with brown reserved for text and one strong rust accent — warmth without heaviness. Olive-sage is a quiet nod to the original site's greens.

**Why espresso `#2B2118`, not black:** pure `#000` on cream is harsh and cold; espresso reads as black while keeping the warmth. (Requested "black text" is honored in perception, softened in value.)

**Why `danger` is a separate red:** rust is the primary action color; destructive actions (delete, deactivate) must never be visually confusable with ordinary actions.

## Dark mode as "autumn at night"

**Chosen:** dark espresso grounds (never `#000`, never neutral gray), soft-cream text (never `#FFF`), same accents brightened (`#A0522D → #C97B4F`, `#7A7C58 → #9FA173`).

**Why:** naive inversion or standard gray dark modes make the product feel like a different, colder app at night. Keeping warm hues in the darks and brightening (not reusing) the accents preserves identity and legibility. Pure white text on dark glares; soft cream doesn't.

**Why dark mode at all:** users may write at night, in bed, in low light — for this product that's not an edge case.

## Three fonts by content role

**Chosen:** Google Sans (UI + module content), Nunito Sans (what users write), Playwrite DE LA (letters only).

**Why:** the roles are semantically different voices — the *platform* speaks (instructions, rules), *people* speak (responses, comments), and the *letter* is intimate address to the deceased. Giving each a face makes the distinction felt without labels. Handwriting for the Module 3 letter turns a form field into something closer to paper.

**Risks accepted, with guardrails:** three families is above the usual two-font guidance — accepted because each has a strict role. Playwrite is decorative and low-legibility at small sizes → 18px minimum, tall line-height, never for UI or long text. The **"Guides" variant is explicitly banned** (it renders school-notebook guide lines through the letters — meant for handwriting practice sheets, and was the originally linked variant).

**Licensing (verified):** all three are SIL OFL on Google Fonts — Google Sans included, which was historically proprietary but is now openly licensed. Commercial use and self-hosting are permitted; the only OFL restriction (not selling the fonts themselves) is irrelevant here.

**Why self-hosted, not Google CDN `<link>`:** no user data leaks to a third party on every page load (relevant for a health-adjacent product), no dependency on an external host, and fonts load offline-ish with the installed home-screen app.

## Rounded shapes, shadows only on overlays

**Chosen:** pill buttons, soft-radius cards, no sharp corners; small warm shadows on modals/dropdowns only, everything else flat.

**Why:** softness is an emotional decision for this audience ("not sharp, because the users already feel bad" — the founding instinct, and it's correct: sharp geometry reads as severe). Restricting shadows to overlays keeps the flat cream layers calm and makes elevation *mean* something: a shadow = "this floats above and demands attention."

**Why not shadows everywhere:** ambient card shadows are the default dashboard look; they add visual noise and dilute the modal's signal.

## Default spacing and accessibility scales

**Chosen:** Tailwind's default spacing scale; WCAG AA contrast, visible focus rings, 44px touch targets, reduced-motion respect.

**Why:** these defaults are well-designed and unopinionated; inventing custom scales adds decisions without adding character. The character lives in color and type. Accessibility floors are non-negotiable for a mobile-first product serving people in distress — glare, tiny targets, and motion are all worse for stressed users.

## One system, two tempos

**Chosen:** participant area breathes (one primary thing per screen); admin/psychologist areas run denser — same tokens, radii, and type throughout.

**Why:** the participant side is an emotional reading-and-writing space; the staff side is a working tool. Different densities serve different jobs, but shared tokens keep it one product — a psychologist moderating a forum shouldn't feel teleported to a different app.
