# Deploying aywa to Vercel

This guide takes the local dev project (SQLite + mocked workspace) to a public
production deploy with real user accounts. Estimated time: **45-60 minutes**
end-to-end, mostly waiting for signups and DNS.

## Overview

| Concern | Dev (current) | Prod |
|---|---|---|
| Database | SQLite (`dev.db`) | Postgres (Neon / Supabase / RDS) |
| File storage | `public/uploads/` | Vercel Blob |
| Auth | JWT sessions, real signup + demo path | Same — already production-ready |
| AI | optional via `ANTHROPIC_API_KEY` | Same |
| Hosting | `npm run dev` on localhost | Vercel (recommended) |

The codebase is already prod-ready — only configuration changes below.

---

## 1. Create a Postgres database

Recommended: **Neon** (free tier, generous, zero-config).

1. Sign up at [neon.tech](https://neon.tech), create a project named `aywa`.
2. Copy the connection string from the dashboard (looks like `postgresql://...sslmode=require`).
3. Keep this URL handy — it's your `DATABASE_URL` for production.

Alternatives: Supabase, Railway, Vercel Postgres. Any Postgres 14+ works.

## 2. Switch the Prisma provider

Open [prisma/schema.prisma](prisma/schema.prisma) and change one line:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

Then locally (with `DATABASE_URL` pointing at your Neon DB):

```bash
npx prisma migrate dev --name init_postgres
```

This creates a `prisma/migrations/` folder with the initial migration. Commit it.

> **Note:** the existing schema only uses cross-DB-portable types (no native enums,
> no JSON columns), so the migration is a clean translation — nothing to rewrite.

## 3. Seed the production DB (optional)

If you want demo data in production for screenshots / pitches:

```bash
DATABASE_URL="postgresql://..." npx prisma db seed
```

Otherwise leave it empty — real users will populate it via signup + their own data.

## 4. Set up Vercel Blob

In your Vercel project dashboard:

1. Storage → Blob → Create store (name: `aywa-uploads`).
2. Go to the `.env.local` tab — copy `BLOB_READ_WRITE_TOKEN`.

When this env var is set, [lib/attachments/storage.ts](lib/attachments/storage.ts)
automatically routes uploads to Blob instead of the local filesystem. No code
changes required.

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial aywa deploy"
gh repo create aywa --private --source=. --push
```

(Or use the GitHub web UI; either works.)

## 6. Import the repo on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import from GitHub → pick `aywa`.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `prisma generate && next build` (auto-set if you keep package.json's `vercel-build` script — see below).
4. Add these environment variables in the Vercel UI:

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string (with `sslmode=require`) |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `AUTH_URL` | `https://yourapp.vercel.app` (replace with real domain) |
| `AUTH_TRUST_HOST` | `true` |
| `BLOB_READ_WRITE_TOKEN` | From step 4 |
| `ANTHROPIC_API_KEY` | (optional) For AI panels |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | (optional) For Google sign-in |

5. Click **Deploy**.

> First deploy will fail if `package.json` doesn't run `prisma generate` in
> the build step. Add this to `package.json` scripts if missing:
> ```json
> "vercel-build": "prisma generate && prisma migrate deploy && next build"
> ```
> `migrate deploy` applies any pending migrations on each deploy.

## 7. First signup

1. Visit `https://yourapp.vercel.app/sign-up`.
2. Enter your name, email, password, optional workspace name.
3. You'll be auto-signed in and dropped on `/dashboard` of your own workspace.

Every new signup creates a **new** `User` + `Workspace` + `OWNER Membership`
in one transaction (see [lib/signup.ts](lib/signup.ts)). Workspaces are
isolated by `workspaceId` on every query — see
[lib/tenant.ts](lib/tenant.ts).

## 8. (Optional) Custom domain

Vercel → Settings → Domains → Add. Point your DNS as instructed. Update
`AUTH_URL` to the new origin and redeploy.

---

## What stays the same

The dev workflow doesn't change:

- `npm run dev` still uses SQLite + `public/uploads/` + the demo workspace.
- The `dev-email` provider (passwordless demo sign-in with any email) still
  routes to the seeded `ws_acme` workspace, untouched by real signups.
- All current features (Calendar, PDF export, AI helpers, file attachments,
  CRM Kanban, Customer 360, i18n, Sales pipeline) work identically in both
  environments.

## What to watch out for

- **Edge runtime vs Node runtime.** The PDF route
  ([app/api/quotes/[id]/pdf/route.ts](app/api/quotes/[id]/pdf/route.ts))
  pins `runtime = "nodejs"` because `@react-pdf/renderer` uses Node APIs.
  Don't change this. Vercel will run it on a serverless function, not Edge.
- **Cold starts on serverless.** First request after idle can be 1-3s. To
  keep it warm, enable Vercel's Fluid Compute or use a paid plan with
  always-on functions.
- **Connection pooling.** Neon needs you to use the pooled URL (ends with
  `-pooler`) for `DATABASE_URL` in serverless. Use the direct URL only for
  migrations (`DIRECT_DATABASE_URL` if you split them).
- **Blob privacy.** Current uploads use `access: "public"` — fine for
  invoices and product photos. If you need private files, switch to
  signed URLs via `@vercel/blob`'s `getDownloadUrl` and gate the API.

## Recovery: rolling back from Postgres to SQLite

If something breaks during the migration and you want to restore dev:

```bash
git checkout prisma/schema.prisma   # revert provider to sqlite
echo 'DATABASE_URL="file:./dev.db"' > .env
npx prisma db push
npx prisma db seed
```

Your seeded dev data comes back. Nothing in prod is affected by local edits
unless you run `prisma migrate deploy` against the prod `DATABASE_URL`.
