# Design Architecture - Essentials: Why These Choices

Companion to `DESIGN_ARCHITECTURE.md`. For each decision: what we picked, why, and why not the alternatives.

## Quiet woods direction

**Chosen:** a cool, misty palette taken from the landing page's night forest: fog blues, a cream sky, and the warm gold of the fireflies.

**Why:** the audience arrives grieving. The interface should read as a still clearing at dusk - the original thesis site's foggy-landscape softness was already right for this; the landing page makes it literal, and the tokens are sampled from that image so the rest of the app feels like the same place.

**Why not a clinical/neutral look:** flat grays and saturated corporate blues read as institutional - hospital forms, dashboards. The blues here are desaturated and misty, and they always sit on cream or night ground, never on gray.

**Why we left the autumn palette (2026-11-10):** the first direction was warm brown and rust. Once the forest landing page existed, the brown app behind it felt like a different product. Cream stayed; the browns became blues.

## Blue-and-cream light mode, layered

**Chosen:** cream ground, fog-tinted surfaces, fog-blue primary, firefly-gold secondary, night-ink text.

**Why:** an all-blue UI goes cold fast. The structure is cream *layers* with blue reserved for text, borders, and one strong primary accent - calm without chill. The gold secondary is the fireflies: a small warm note on every screen, used for tags and accents only, since it reaches AA contrast on cream only at large sizes.

**Why night ink `#1B2540`, not black:** pure `#000` on cream is harsh; a very dark blue reads as black while keeping the palette's hue. (Requested "black text" is honored in perception, softened in value.)

**Why `danger` is a separate red:** blue is the primary action color; destructive actions (delete, deactivate) must never be visually confusable with ordinary actions.

## Dark mode as "the woods at night"

**Chosen:** night-blue grounds taken from the forest's darkest values (never `#000`, never neutral gray), soft-cream text (never `#FFF`), same accents brightened (`#3D5A8A → #9DB5E1`, `#8F6F12 → #FFD24D`).

**Why:** naive inversion or standard gray dark modes make the product feel like a different, colder app at night. Keeping the blue hue in the darks and brightening (not reusing) the accents preserves identity and legibility. Pure white text on dark glares; soft cream doesn't. The landing page is always rendered in this theme, so dark mode is literally its colors.

**Why dark mode at all:** users may write at night, in bed, in low light - for this product that's not an edge case.

**Why the forest pages are always night:** the welcome and login pages are the painting. A light version would mean a second image and a second mood for a door people pass through once per visit. Scoping `dark` to the page root (instead of `<html>`) keeps the rest of the app free to follow the device.

**Why a `glow` token:** cool cream text on the forest read as cold. The fireflies are the only warm light in the scene, so text and accents over the image borrow their colour. It is a token rather than a one-off so the login, welcome, and any future forest surface agree.

## Three fonts by content role

**Chosen:** Google Sans (UI + module content), Nunito Sans (what users write), Playwrite DE LA (letters only).

**Why:** the roles are semantically different voices - the *platform* speaks (instructions, rules), *people* speak (responses, comments), and the *letter* is intimate address to the deceased. Giving each a face makes the distinction felt without labels. Handwriting for the Module 3 letter turns a form field into something closer to paper.

**Risks accepted, with guardrails:** three families is above the usual two-font guidance - accepted because each has a strict role. Playwrite is decorative and low-legibility at small sizes → 18px minimum, tall line-height, never for UI or long text. The **"Guides" variant is explicitly banned** (it renders school-notebook guide lines through the letters - meant for handwriting practice sheets, and was the originally linked variant).

**Licensing (verified):** all three are SIL OFL on Google Fonts - Google Sans included, which was historically proprietary but is now openly licensed. Commercial use and self-hosting are permitted; the only OFL restriction (not selling the fonts themselves) is irrelevant here.

**Why self-hosted, not Google CDN `<link>`:** no user data leaks to a third party on every page load (relevant for a health-adjacent product), no dependency on an external host, and fonts load offline-ish with the installed home-screen app.

## Rounded shapes, shadows only on overlays

**Chosen:** pill buttons, soft-radius cards, no sharp corners; small night-tinted shadows on modals/dropdowns only, everything else flat.

**Why:** softness is an emotional decision for this audience ("not sharp, because the users already feel bad" - the founding instinct, and it's correct: sharp geometry reads as severe). Restricting shadows to overlays keeps the flat cream layers calm and makes elevation *mean* something: a shadow = "this floats above and demands attention."

**Why not shadows everywhere:** ambient card shadows are the default dashboard look; they add visual noise and dilute the modal's signal.

## Default spacing and accessibility scales

**Chosen:** Tailwind's default spacing scale; WCAG AA contrast, visible focus rings, 44px touch targets, reduced-motion respect.

**Why:** these defaults are well-designed and unopinionated; inventing custom scales adds decisions without adding character. The character lives in color and type. Accessibility floors are non-negotiable for a mobile-first product serving people in distress - glare, tiny targets, and motion are all worse for stressed users.

## One system, two tempos

**Chosen:** participant area breathes (one primary thing per screen); admin/psychologist areas run denser - same tokens, radii, and type throughout.

**Why:** the participant side is an emotional reading-and-writing space; the staff side is a working tool. Different densities serve different jobs, but shared tokens keep it one product - a psychologist moderating a forum shouldn't feel teleported to a different app.
