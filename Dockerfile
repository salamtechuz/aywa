# syntax=docker/dockerfile:1
# Multi-stage build for the aywa / erp-mini Next.js 16 app.
# We run `next start` against the full dependency tree (not standalone) — this is
# the most robust path for Prisma + next-intl and avoids file-tracing surprises.
# Debian (bookworm) is used over Alpine so Prisma's auto-detected engine
# (debian-openssl-3.0.x) matches between build and runtime.

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: install node_modules (postinstall runs `prisma generate`) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: compile the Next.js production build ----
FROM base AS builder
# 3.7 GB box: cap the heap but leave headroom; swap covers spikes.
ENV NODE_OPTIONS=--max-old-space-size=3072
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal-ish image that serves the build ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Copy the whole built app (incl. node_modules, .next, public, prisma, i18n,
# messages). Bulletproof for runtime file resolution on a single VPS.
COPY --from=builder /app ./
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
