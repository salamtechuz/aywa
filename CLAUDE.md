# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> ⚠️ The `@AGENTS.md` import above is load-bearing: this is **Next.js 16** with breaking changes from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code.
>
> The `README.md` describes "Phase 1: UI/UX shell only" — that is **stale**. The app now has real DB-backed modules (CRM, Sales, Inventory, Purchase, HR, Projects, Subscriptions), a public REST API, Stripe/Resend/Anthropic integrations, and i18n. Trust the code, not the README's phase framing.

## Commands

```bash
npm run dev            # dev server (Turbopack, 4GB heap)
npm run build          # production build
npm run lint           # eslint (flat config, eslint-config-next)
npx tsc --noEmit       # typecheck (no test suite exists — this is the main static gate)

npm run db:up          # start local Postgres via docker-compose (only if using Postgres)
npm run db:push        # push schema.prisma to the DB (no migration files)
npm run db:migrate     # create + apply a dev migration
npm run db:studio      # Prisma Studio
npm run seed           # tsx prisma/seed.ts — seeds the demo workspace (ws_acme)
```

There is **no test framework** configured. Do not invent `npm test`. Verify changes with `tsc --noEmit`, `lint`, and running the app.

### Database engine switch (important)

Dev runs **SQLite** (`prisma/schema.prisma` has `provider = "sqlite"`, `DATABASE_URL="file:./dev.db"`). Production is **Postgres**: manually flip `provider` to `"postgresql"`, set `DATABASE_URL`, and run `prisma migrate deploy` (the `vercel-build` script does generate + migrate + build). The schema deliberately avoids native enums and JSON columns so one schema works on both engines.

## Architecture

### Multi-tenancy — the central invariant

Every domain row carries a `workspaceId`. **Every query must be scoped by it.** The active workspace comes from `getActiveWorkspace()` ([lib/tenant.ts](lib/tenant.ts)), which returns the first membership. Synthetic dev users (id prefixed `dev:`) and any auth fallback resolve to the seeded demo workspace `ws_acme` so seed data stays visible without a real signup. There is no per-request workspace switching wired to persistence yet — `getActiveWorkspace()` is the single source of truth.

### Auth — Auth.js v5, JWT sessions

[lib/auth.ts](lib/auth.ts) configures NextAuth with **JWT session strategy** (the Prisma `Account`/`Session` models exist for the adapter but sessions are not DB-backed). Two credential providers: real `credentials` (email+password via `verifyUserPassword` in [lib/signup.ts](lib/signup.ts)) and passwordless `dev-email` (any email → synthetic `dev:` user → demo workspace). Google OAuth auto-enables when `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are set. [middleware.ts](middleware.ts) re-exports `auth as middleware`; protected route prefixes are listed **both** in the middleware `matcher` and the `authorized` callback — keep them in sync when adding a module.

### RBAC — role gate on every mutation

[lib/permissions.ts](lib/permissions.ts) defines the hierarchy `OWNER > ADMIN > MEMBER > VIEWER`. Server actions begin with:

```ts
const denied = await assertCanWrite();   // or assertCanAdmin()
if (denied) return denied;               // returns { ok: false, error } directly
```

`assertCanWrite` = MEMBER+, `assertCanAdmin` = ADMIN+. Use `requireRole`/`currentRole`/`canEdit`/`canAdmin` for finer checks.

### Data layer convention (follow this for every module)

- **Reads** live in `lib/<module>/queries.ts`, start with `import "server-only"`, take `workspaceId` as the first argument, and scope `where: { workspaceId }`.
- **Writes** are server actions colocated in the route dir: `app/(app)/<module>/*actions.ts` with `"use server"`. The canonical shape:
  1. `assertCanWrite()` gate
  2. `zod` parse of input
  3. `getActiveWorkspace()` → scope the mutation to `ws.id`
  4. side effects: `void deliverWebhook(...)` (fire-and-forget), `logAudit(...)`
  5. `revalidatePath("/<module>")`
  6. return the uniform envelope `{ ok: true }` or `{ ok: false, error }`
- **Audit**: `logAudit()` ([lib/audit/log.ts](lib/audit/log.ts)) is best-effort and never throws — call it *after* a successful mutation.
- **String enums**: status/stage values are TEXT validated at the app layer. The allowed sets + labels live in `lib/<module>/stages.ts` and are reused in zod `z.enum(...)`. Never rely on DB-level enum constraints.

### Inventory stock ledger

`StockMovement` is an **append-only, signed** ledger (IN/INITIAL positive, OUT negative). `computeOnHand()` ([lib/inventory/stock.ts](lib/inventory/stock.ts)) summing the ledger is authoritative; `Product.stockOnHand` is a denormalized cache — treat it as a hint, not truth.

### Public REST API & webhooks

`/api/v1/*` ([app/api/v1/](app/api/v1/)) is authenticated by **Bearer `ApiToken`** (hashed; `requireAuth`/`parsePagination`/`jsonError` in [lib/api/respond.ts](lib/api/respond.ts), WRITE implies READ). Inbound webhooks: Stripe (`checkout.session.completed`) and Resend (email open/click tracking). Outbound webhooks are delivered HMAC-signed via [lib/webhooks/deliver.ts](lib/webhooks/deliver.ts). The recurring-invoices cron ([app/api/cron/recurring-invoices/route.ts](app/api/cron/recurring-invoices/route.ts)) only runs with `Authorization: Bearer $CRON_SECRET`. PDFs (quotes, POs) render via `@react-pdf/renderer` under `/api/quotes/[id]/pdf` and `/api/purchase-orders/[id]/pdf`.

### i18n — next-intl, cookie-driven (no locale in URL)

Locale comes from the `NEXT_LOCALE` cookie ([i18n/request.ts](i18n/request.ts)); locales are `en`/`ru`/`uz` ([i18n/config.ts](i18n/config.ts)). Translations are namespaced JSON in [messages/](messages/) (`en.json`/`ru.json`/`uz.json`). **Server** components use `getTranslations("ns")`; **client** components use `useTranslations("ns")`. A file may bind several `t` to different namespaces (e.g. `crm`, `crm.relative`, `crm.activity.types`) — match each `t("key")` to its nearest binding. When adding any user-facing string, add the key to **all three** locale files (they must stay at key parity) and use ICU placeholders (`{count}`) for interpolation.

### Integrations gate on env vars

Empty key = feature hidden/degraded, app still runs: Anthropic (`ANTHROPIC_API_KEY`, AI panels in [lib/ai/](lib/ai/), default model `claude-sonnet-4-6`), Resend (email/magic links — empty prints links to console), Stripe ("Pay this invoice"), Vercel Blob (`BLOB_READ_WRITE_TOKEN` — empty → files go to `public/uploads/`). See [.env.example](.env.example) for the full list.

### Layout & conventions

- Path alias `@/*` → repo root.
- Authenticated UI lives under the `app/(app)/` route group ([app/(app)/layout.tsx](app/(app)/layout.tsx) = sidebar + topbar + breadcrumbs). Public routes: `/` (landing), `/sign-in`, `/sign-up`, `/accept-invite`, `/portal` (unauthenticated customer quote/invoice view via `portalToken`).
- Components: `components/ui/` (shadcn primitives), `components/shell/` (sidebar, topbar, command palette), `components/patterns/` (page-header, empty-state, data-table, detail-drawer, coming-soon, view-switcher), then one folder per module.
- Prisma client is a hot-reload-safe singleton ([lib/db.ts](lib/db.ts)) — always `import { db } from "@/lib/db"`.
- `accounting` and `manufacturing` are still placeholder modules using the `coming-soon` pattern.
