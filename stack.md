# STACK.md — Fixed technical stack

Approved stack for the Engagement Tracker (production build).
Do not swap frameworks or add major dependencies without explicit
approval (see RULES.md → Stack).

## Decisions

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Framework | Next.js (App Router) |
| UI | React + Tailwind CSS + shadcn/ui |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth (credentials, role stored in session) |
| Email | Resend |
| Tests | Vitest |
| Hosting | Vercel (app) + Neon (PostgreSQL) |
| Package manager | npm |
| Node | LTS (pinned in `.nvmrc`) |

## Database note
WORKFLOW.md §18 "collections" means **PostgreSQL tables**
(e.g. portfolios, jobs, timesheet, staff, settings, billing,
payments, auditlog, queries) — not Firestore or MongoDB.
Relational model: one client has many jobs; jobs have timesheets,
notes, stage history.

## Quality gates (must pass before commit)
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — Vitest
- `npm run build` — `next build`

These mirror RULES.md 6–8.

## Out of scope (do not add yet)
- No ISQM modules — handled in the ABOT system.
- No Phase 2 features until Phase 1 is signed off (see WORKFLOW.md).

## Environment variables (see .env.example)
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — session signing secret
- `NEXTAUTH_URL` — app base URL
- `RESEND_API_KEY` — email provider key
- `CRON_SECRET` — bearer token for scheduled jobs (`/api/cron/*`)
