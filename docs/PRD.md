# Yasdestek - Product Requirements Document

## 1. Overview

Yasdestek is an online grief-support platform that digitalizes a thesis-validated grief intervention program for bereaved individuals. The original program (tested in a randomized controlled study with young adults aged 18-25) consists of six structured, narrative-based modules completed in small groups, where participants write, record audio, share media, and witness and comment on each other's experiences under the guidance of a psychologist.

The platform generalizes the original single-researcher website (yasdestek.com) into a multi-tenant system: admins manage psychologists, psychologists run their own groups of bereaved users, and users work through assigned modules.

## 2. Background

The intervention was shown to significantly reduce PTSD and depression symptoms and increase meaning reconstruction in the experimental group. Its core therapeutic mechanism is **social witnessing**: participants do not complete tasks in isolation - they share written narratives, voice recordings, and media in group forums and leave supportive comments on each other's content. The product must preserve this relational design; forums and commenting are core features, not extras.

## 3. Roles and Permissions

### 3.1 Admin
- Creates psychologist accounts and provides their credentials (username + password).
- Activates / deactivates psychologists (psychologists start **inactive**).
- Can also create user accounts.
- Adds / removes **global modules** (visible to everyone, like the 6 base modules).
- Removes comments from any forum (moderation).
- Views analytics: which psychologist has which users, and users' process/progress.

### 3.2 Psychologist
- Created by an admin; inactive until the admin activates them.
- Creates user accounts and provides their credentials (username + password).
- Activates / deactivates their own users (users start **inactive**).
- Organizes their users into **groups** (thesis design: ~5-6 people per group).
- Adds / removes modules **scoped to their own users only**.
- Assigns / removes modules for their users.
- Removes comments from forums within their own groups (moderation).

### 3.3 User (bereaved participant)
- Created by a psychologist (or admin); inactive until their psychologist activates them.
- Belongs to one psychologist and to a group.
- Completes assigned modules by **writing text**, **recording audio**, and **uploading images**.
- Sees group-mates' content in each module's forum and writes comments on it.
- Cannot register themselves; credentials are provisioned top-down.

### 3.4 Account rules
- No self-registration for any role.
- Everyone except admin starts **inactive** and must be activated by the role above them.
- Admin → activates psychologists. Psychologist → activates their users.
- Deactivation takes effect immediately (active sessions are terminated).
- Initial passwords are system-generated, shown once to the creator, and must be changed by the account owner at first login.
- **No email addresses are stored.** Forgotten passwords are reset by the role above (psychologist for users, admin for psychologists); the account owner is again forced to change the password at next login.

## 4. Modules

### 4.1 Base modules (seeded, from the thesis)
1. **Modül 1 - Sözcüklerin Gücü (Power of the Words):** detailed narrative of the loss event (before / during / after receiving the news), guided by prompt questions.
2. **Modül 2 - Karmaşık Duygular ve Suçluluk (Ambivalent Feelings and Guilt):** the relationship with the deceased - unfinished business, resentments, regrets, guilt.
3. **Modül 3 - Mektup Yazma (Letter Writing):** a letter written directly to the deceased.
4. **Modül 4 - Kendi Yolunu Bul (Finding Your Own Path):** coping strategies and personal strengths; participants model coping for each other.
5. **Modül 5 - Bağları Sürdürme (Continuing Bonds):** upload a photo, song, quote, or image of an object/city representing the deceased, plus what it evokes. (Media-centric module.)
6. **Modül 6 - Gelecek (Future):** short- and long-term goals, dreams, imagining life five years ahead.

The full Turkish prompt texts exist in the thesis (Appendix M) and are used as the modules' content.

### 4.2 Custom modules
- Admins can create/remove **global** modules.
- Psychologists can create/remove modules visible **only to their own users**.
- A module is structured as: **title**, **description** (welcome + purpose text), **rules** (module-specific expectations, shown distinctly - **required**: creating a module requires writing its rules), **guided questions** (rendered as a list next to the response area), and the response area.

### 4.2.0 General rules page
- A platform-wide **"Genel Kurallar"** page (as on the original thesis site) holds the interaction rules: constructive commenting, supportive language, etc.
- Admin-editable; always reachable from the app's sidebar for all roles.

### 4.2.1 Module assignment
- Modules are assigned at the **group level**: the psychologist assigns a module to a group and all members receive it together (matching how the thesis ran groups through modules in sync).
- Pacing/unlocking is therefore controlled by the psychologist through assignment - modules appear for a group when the psychologist assigns them.
- Individual pacing, if ever needed, is handled by placing a user in a group of one.

### 4.3 Module responses
A user's response to a module can include:
- **Text** (primary form; guided free writing).
- **Audio recording** (recorded in the browser).
- **Image upload** (required by Module 5, available where relevant).

## 5. Groups and Forums

- Each user belongs to a group under their psychologist.
- Each module has a **forum per group**: members see only their own group's posts.
- A forum post is a user's published module response (text and/or audio and/or image).
- A user has **one response per module** (editable), as in the thesis; the group forum for a module is the set of members' responses.
- **Feed layout:** the forum is a list of members' responses, each with its comments nested directly beneath it - single-level threading (comments attach to responses; no comments-on-comments):
  - Elif's Module 1 response
    - Kerem's comment on Elif's
    - Ayşe's comment on Elif's
  - Kerem's Module 1 response
    - Ali's comment on Kerem's
- Group members can write **comments** under each other's posts.
- Moderation: the group's psychologist and admins can delete comments.
- Deleted comments are **soft-deleted**: the content is hidden and a placeholder is shown in its place ("Bu yorum danışman tarafından silinmiştir"). True erasure exists only as an explicit admin action for privacy requests.

## 6. Messaging

- A user can write a **private message to their psychologist** for any issue (questions, distress, technical problems) - separate from the group forum.
- The psychologist has a **message inbox** showing conversations with their users, with unread indicators.
- Modeled as one continuous conversation thread per user↔psychologist pair; the psychologist can reply in the same thread.
- Scope rules: a user can only message their own psychologist; a psychologist only their own users. (Psychologist↔admin messaging: not in v1 unless decided otherwise.)

## 7. Analytics (Admin)

- List of psychologists with their users.
- Per-user process view: which modules are assigned, completed, in progress.

## 8. Language & Platform

- The interface ships in **Turkish (default) and English**. Module content authored by admins/psychologists is data and displays exactly as written.
- The site is installable to the phone home screen (web manifest, opens full-screen like an app). No offline mode in v1 - using the app requires connectivity.
- The participant area is mobile-first responsive; admin/psychologist areas are desktop-first.

## 9. Non-Goals (for now)

- Self-registration / public sign-up.
- Video content or live video sessions inside the platform (group meetings happen externally, e.g. Zoom).
- Payments, notifications, native mobile apps, offline mode.
- Public marketing pages ("What is Yasdestek") - planned later as a separate small site in the monorepo.

## 10. Technical Context

- **Monorepo** (`apps/web`, `apps/api`, `packages/shared`).
- Frontend: Vite + React + TypeScript - full decisions in `FRONTEND_ARCHITECTURE.md` (+ `_ESSENTIALS`).
- Backend: NestJS + PostgreSQL + Prisma + MinIO, cookie-based sessions - full decisions in `BACKEND_ARCHITECTURE.md` (+ `_ESSENTIALS`).
- Media limits: images ≤ 10MB (jpeg/png/webp/heic), audio ≤ 50MB (webm/opus, mp4/aac).
- Deployment target: existing DigitalOcean server; zero-cost constraint on services (no paid storage/SaaS).

## 11. Open Questions

- Can a user be reassigned to another psychologist or group, and what happens to their existing forum content (do old posts/comments move, stay, or hide)?
- Group lifecycle: what happens when a group finishes the program - archived (read-only), deleted, or kept open?
- Data retention: how long are narratives/recordings kept after a user leaves the program?
