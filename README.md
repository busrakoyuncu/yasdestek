# Yasdestek

An online grief-support platform that digitalizes a thesis-validated grief intervention program. Bereaved users work through structured, narrative-based modules — writing, recording audio, and sharing media — in small groups guided by a psychologist, witnessing and supporting each other in module forums.

The intervention behind the platform was tested in a randomized controlled study and showed significant reductions in PTSD and depression symptoms and increased meaning reconstruction. Its core mechanism — **social witnessing** — shapes the product: forums and commenting are the heart of the platform, not extras.

## How it works

- **Three roles, provisioned top-down:** admins create and activate psychologists; psychologists create and activate their users, organize them into small groups (~5–6), and guide them through modules. No self-registration, no emails stored.
- **Modules:** six base modules from the thesis ship seeded (loss narrative, ambivalent feelings, letter writing, coping, continuing bonds, future orientation). Admins can add global modules; psychologists can add modules for their own users. Every module has a title, description, rules, and guided questions.
- **Responses & forums:** each user writes one response per module (text, voice recording, images), published to their group's forum where group-mates comment. Psychologists moderate; deleted comments leave a visible placeholder.
- **Messaging:** users can privately message their psychologist ("danışman"), who replies from an inbox.
- **Languages:** Turkish and English. Installable to the phone home screen.

## Stack

| Layer | Choices |
|---|---|
| Frontend | Vite · React · TypeScript · React Router · TanStack Query · Tailwind + shadcn/ui · react-hook-form + zod · react-i18next |
| Backend | NestJS · PostgreSQL · Prisma · cookie sessions · argon2 |
| Media | MinIO (S3-compatible), files served only through the permission-checked API |
| Infra | Monorepo (pnpm workspaces) · Docker Compose · Caddy (auto-HTTPS) · DigitalOcean droplet |

## Documentation

Every architectural decision is documented in a *what* file, with the reasoning and rejected alternatives in a companion *essentials* file:

| Area | What | Why |
|---|---|---|
| Product | [PRD.md](PRD.md) | — |
| Frontend | [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) | [essentials](FRONTEND_ARCHITECTURE_ESSENTIALS.md) |
| Backend | [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) | [essentials](BACKEND_ARCHITECTURE_ESSENTIALS.md) |
| Design | [DESIGN_ARCHITECTURE.md](DESIGN_ARCHITECTURE.md) | [essentials](DESIGN_ARCHITECTURE_ESSENTIALS.md) |
| System | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | [essentials](SYSTEM_ARCHITECTURE_ESSENTIALS.md) |

## Status

Documentation phase complete; scaffolding is next. Setup and development instructions will land here once the workspace exists.
