# ERP Mini

A modern, multi-tenant **ERP / business platform** — CRM, Sales, Inventory, Purchasing, Projects, HR, Subscriptions, Accounting, Manufacturing, Logistics and Reports in one unified, schema-driven app.

![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_/_SQLite-prod_/_dev-4169E1?logo=postgresql&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-000?logo=auth0&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-EN_·_RU_·_UZ-7C3AED)

> **Not a UI shell.** Every module is database-backed with real server actions, RBAC, audit logging and a public REST API. (An earlier README described a "Phase 1 shell" — that is long obsolete.)

---

## Overview

ERP Mini is a single-workspace-per-tenant business system. Every domain row is scoped by `workspaceId`, every mutation passes a role gate, and the same Prisma schema runs on **SQLite in dev** and **PostgreSQL in prod**. The UI ships in **three languages** and adapts to OS conventions (e.g. ⌘K on macOS, Ctrl K on Windows).

**By the numbers:** ~276 TypeScript files (`.ts` + `.tsx`), ~36k lines of app code, **38** Prisma models, **~15** modules, **12** API routes, **3** locales.

## Modules

| | | |
| --- | --- | --- |
| **Dashboard** — KPIs, charts, activity | **CRM** — pipeline, customers, activities | **Sales** — quotes → orders → invoices |
| **Inventory** — products, signed stock ledger | **Purchase** — RFQs, POs, vendors | **Projects** — boards, tasks |
| **HR** — people & org | **Subscriptions** — recurring billing (MRR/ARR) | **Accounting** — journals, chart, reports |
| **Manufacturing** — BOMs | **Logistics** — positions, map (Leaflet) | **Reports** — funnel, revenue trend |
| **Calendar** · **Inbox** | **Settings** — members, billing, appearance, audit, developer | **Portal** — public quote/invoice view |

## Tech stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js **16.2.6** (App Router, Turbopack), React **19.2**, TypeScript 5 |
| **Styling** | Tailwind CSS **v4** (CSS-first), `tw-animate-css`, View Transitions |
| **UI** | shadcn + **Base UI** primitives, lucide-react, sonner, cmdk (⌘K palette), recharts, dnd-kit (kanban), Leaflet (maps), next-themes |
| **Data** | Prisma **6** ORM · **SQLite** (dev) / **PostgreSQL** (prod) · Zod validation · react-hook-form · Zustand · TanStack Table |
| **Auth** | Auth.js **v5** (JWT sessions), bcryptjs, optional Google OAuth, RBAC (OWNER › ADMIN › MEMBER › VIEWER) |
| **Integrations** | Stripe (payments) · Resend (email) · Anthropic SDK (AI panels) · Vercel Blob (files) · svix (webhooks) · @react-pdf/renderer (PDF) |
| **i18n** | next-intl (cookie-driven `NEXT_LOCALE`) — English · Русский · Oʻzbek |
| **Deploy** | Docker + docker-compose + Caddy (HTTPS) · Vercel-compatible · runs on a Hetzner VPS |
| **Quality** | `tsc --noEmit` + ESLint 9 (flat config). No unit-test framework. |

## Languages used

- **TypeScript** — the entire stack (server + client), strict mode.
- **SQL / Prisma schema** — 38 models, dual-engine (SQLite + PostgreSQL).
- **CSS** — one `app/globals.css` (Tailwind v4 tokens, theme variables, animations).
- **JSON** — i18n dictionaries (key parity enforced across `en` / `ru` / `uz`) + config.
- **Dockerfile / Caddyfile / YAML** — containerized deployment.

## Architecture highlights

- **Multi-tenancy** — every query is scoped by `workspaceId` ([lib/tenant.ts](lib/tenant.ts) is the single source of truth).
- **Data convention** — reads in `lib/<module>/queries.ts` (`import "server-only"`); writes are colocated server actions: `assertCanWrite()` → Zod parse → scope to workspace → side effects (webhooks, audit) → `revalidatePath`.
- **Audit log** — best-effort, never throws, called after successful mutations.
- **Inventory** — `StockMovement` is an append-only signed ledger; `computeOnHand()` is authoritative.
- **Public REST API** — `/api/v1/*` authenticated by Bearer `ApiToken` (hashed); inbound Stripe/Resend webhooks; HMAC-signed outbound webhooks; a `CRON_SECRET`-gated recurring-invoices job.
- **String enums** — status/stage values are app-validated TEXT (no native DB enums) so one schema works on both engines.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
npx auth secret        # writes AUTH_SECRET into .env
```

Local dev needs no external services — empty integration keys simply hide/degrade that feature (e.g. Resend prints magic links to the console). `AUTH_TRUST_HOST=true` lets auth work on any port.

### 3. Database (SQLite by default)

Dev uses SQLite out of the box (`DATABASE_URL="file:./dev.db"`), so there's nothing to start:

```bash
npm run db:push        # create tables from prisma/schema.prisma
npm run seed           # seed the demo workspace (ws_acme)
```

> Using Postgres instead? Flip `provider` to `"postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at your DB, and run `npm run db:up` (Docker) + `prisma migrate deploy`.

### 4. Run

```bash
npm run dev            # http://localhost:3000
```

Open the landing page, click **Try the demo**, and sign in with **any email** (dev sign-in needs no password) to land in the seeded `ws_acme` workspace.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack, 4 GB heap) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config) |
| `npx tsc --noEmit` | Typecheck — the main static gate |
| `npm run db:push` / `db:migrate` | Push schema / create a dev migration |
| `npm run db:studio` | Prisma Studio |
| `npm run seed` | Seed the demo workspace |

## Internationalization

Locale comes from the `NEXT_LOCALE` cookie ([i18n/request.ts](i18n/request.ts)); translations are namespaced JSON in [messages/](messages/) (`en` / `ru` / `uz`). **Server** components use `getTranslations`, **client** components use `useTranslations`. All three files are kept at strict key parity — every user-facing string must exist in all locales.

## Project structure

```text
app/
├── (app)/                 # Authenticated app (sidebar + topbar + breadcrumbs)
│   ├── crm/ sales/ inventory/ purchase/ projects/ hr/
│   ├── subscriptions/ accounting/ manufacturing/ logistics/
│   ├── reports/ calendar/ inbox/ dashboard/ settings/
│   └── <module>/*actions.ts        # "use server" mutations
├── api/                   # v1 REST, auth, webhooks, cron, PDF
├── portal/[token]/        # Public customer quote/invoice view
├── sign-in/ sign-up/ accept-invite/
├── page.tsx               # Marketing landing (own theme scope, 3D tilt, i18n)
├── layout.tsx             # Root: fonts, theme + intl providers
└── globals.css            # Design tokens & animations
components/
├── ui/ shell/ patterns/   # primitives · sidebar/topbar/palette · reusable patterns
├── brand/                 # landing: logo, tilt cards, preview app, CTA
└── <module>/              # per-module UI
lib/
├── <module>/queries.ts    # server-only reads, scoped by workspaceId
├── auth.ts permissions.ts tenant.ts audit/ api/ webhooks/ ai/ stripe/ email/
prisma/schema.prisma       # 38 models, dual-engine
i18n/  messages/           # next-intl config + en/ru/uz dictionaries
middleware.ts              # protects /(app)/* routes
Dockerfile  Caddyfile  docker-compose*.yml
```

## Deployment

A multi-stage `Dockerfile` builds the app; `docker-compose.prod.yml` + `Caddyfile` run it behind Caddy with automatic HTTPS. The `vercel-build` script (`prisma generate && prisma migrate deploy && next build`) makes it Vercel-ready too. See [DEPLOY.md](DEPLOY.md) for the VPS workflow.

## License

Private. © ERP Mini.
