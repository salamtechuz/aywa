# ERP Mini

A modern, opinionated ERP — Phase 1: **UI/UX shell only**.

This phase ships the design system, navigation, multi-tenant primitives, command palette, and empty module placeholders. No real business logic yet — that lands in Phase 2.

## What's in here

- Marketing landing page (`/`)
- Sign-in page (`/sign-in`) with email-only dev sign-in + optional Google OAuth
- App shell with:
  - Sidebar (collapsible, grouped modules)
  - Topbar (workspace switcher, command palette, notifications, user menu)
  - Breadcrumbs
  - Light / dark / system theme + live accent color picker
- Command palette (⌘K) for global navigation and quick actions
- Dashboard with stat cards, revenue chart, recent activity
- Placeholder pages for CRM, Sales, Inventory, Purchase, Accounting, HR, Projects, Manufacturing, Reports
- Settings: General, Members, Billing (plan picker), Appearance
- Reusable patterns: `page-header`, `empty-state`, `stat-card`, `data-table`, `view-switcher`, `detail-drawer`, `coming-soon`

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript + Turbopack |
| Styling | Tailwind CSS v4 (CSS-first) |
| Components | shadcn/ui (base-nova preset, neutral palette) |
| Icons | lucide-react |
| Charts | recharts |
| DB | Postgres 16 (Docker) |
| ORM | Prisma v6 |
| Auth | Auth.js v5 (Credentials for dev, optional Google OAuth) |
| Forms | react-hook-form + zod |
| State | Server components + small Zustand stores |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
npx auth secret   # writes AUTH_SECRET into .env automatically
```

If you want Google sign-in, paste your `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` into `.env`. Otherwise, the sign-in page only shows the email field — which works in dev with any email (no password needed).

### 3. (Optional) Start Postgres

Phase 1 does not require a live database — auth uses JWT sessions and workspaces are mocked in `lib/tenant.ts`. When you're ready to wire real persistence:

```bash
# Start Colima or Docker Desktop, then:
npm run db:up
npm run db:push       # creates tables from prisma/schema.prisma
```

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Smoke walkthrough

1. **/** — the landing page. Click **Try the demo**.
2. **/sign-in** — type any work email and **Continue with email**. (In dev there's no password and no email sent — you're signed in immediately.)
3. **/dashboard** — stat cards, revenue chart, recent activity.
4. Click around the sidebar — CRM, Sales, Inventory, etc. — each module renders a "coming soon" page with the planned feature list.
5. Press **⌘K** (or **Ctrl+K**) — search modules, run quick actions, or change theme.
6. Top-left **workspace switcher** — flip between Acme Corp and Kestrel Logistics.
7. **Settings → Appearance** — try a different accent color or theme.
8. Resize to mobile width — the sidebar collapses into a sheet, the topbar adapts.

## Project layout

```
app/
├── (app)/                      # Authenticated app shell
│   ├── layout.tsx              # Sidebar + topbar + breadcrumbs
│   ├── dashboard/page.tsx
│   ├── crm/page.tsx
│   ├── sales/page.tsx
│   ├── inventory/page.tsx
│   ├── purchase/page.tsx
│   ├── accounting/page.tsx
│   ├── hr/page.tsx
│   ├── projects/page.tsx
│   ├── manufacturing/page.tsx
│   ├── reports/page.tsx
│   └── settings/
│       ├── general/
│       ├── members/
│       ├── billing/
│       └── appearance/
├── sign-in/
├── api/auth/[...nextauth]/
├── page.tsx                    # Marketing landing
├── not-found.tsx
├── layout.tsx                  # Root: fonts, theme provider, toaster
└── globals.css                 # Design tokens
components/
├── ui/                         # shadcn primitives
├── shell/                      # Sidebar, topbar, command palette, etc.
├── patterns/                   # Page-level reusable patterns
├── dashboard/                  # Dashboard-specific widgets
└── theme-provider.tsx
lib/
├── auth.ts                     # Auth.js v5 config
├── auth-handlers.ts            # Route handler glue
├── db.ts                       # Prisma client singleton
├── tenant.ts                   # Workspace context (mocked in shell phase)
├── navigation.ts               # Shared nav config (sidebar + command palette)
└── utils.ts                    # cn()
prisma/
└── schema.prisma               # Multi-tenant skeleton (User, Workspace, Membership)
middleware.ts                   # Protects /(app)/* routes
docker-compose.yml              # Local Postgres
```

## What's next (Phase 2)

This is a shell. Once the visual direction lands, the next slice is **one real module end-to-end** — most likely Inventory or CRM — to validate the data patterns: list → detail-drawer → server actions → optimistic updates → live filters.

After that:
- Real DB-backed workspaces and Auth.js Prisma adapter (replace `lib/tenant.ts` mocks)
- Stripe billing wired into the plan picker
- Resend or Postmark for transactional email (invites, magic links)
- The remaining modules, one or two per release

## Design principles

1. Generous spacing and a modern type scale — never dense for density's sake.
2. First-class dark mode with a neutral palette tuned by hand.
3. Command palette (⌘K) is the primary nav for power users.
4. Inline editing and side panels beat full-page navigation for record-level work.
5. Every list page eventually offers Table / Kanban / Calendar / Gallery views with shared filter state.
6. Loading skeletons and empty states are designed, never afterthoughts.
7. Mobile-responsive from day one — the sidebar is a sheet, the topbar adapts.

## License

Private. © ERP Mini.
