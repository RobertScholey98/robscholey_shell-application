# syntax=docker/dockerfile:1.7
# Build context: the robscholey.com workspace root (not this repo)

# --- deps: install workspace dependencies ---
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY robscholey_admin/package.json ./robscholey_admin/
COPY robscholey_auth-microservice/package.json ./robscholey_auth-microservice/
COPY robscholey_shell-application/package.json ./robscholey_shell-application/
COPY robscholey_shell-kit/package.json ./robscholey_shell-kit/
COPY robscholey_template-child-nextJS/package.json ./robscholey_template-child-nextJS/
COPY packages/contracts/package.json ./packages/contracts/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- builder: produce Next standalone output ---
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

COPY --from=deps /app /app
COPY packages/contracts ./packages/contracts
COPY robscholey_shell-kit ./robscholey_shell-kit
COPY robscholey_shell-application ./robscholey_shell-application

ARG NEXT_PUBLIC_AUTH_URL=http://localhost:3001
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
# Shell origin gets inlined into the client bundle by Next at build time.
# Without this, Providers.tsx's `?? 'http://localhost:3000'` fallback wins and
# shell-kit warns at runtime that the configured origin doesn't match window.location.
ARG NEXT_PUBLIC_SHELL_ORIGIN=http://localhost:3000
ENV NEXT_PUBLIC_SHELL_ORIGIN=$NEXT_PUBLIC_SHELL_ORIGIN
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter robscholey_shell-application build

# --- runner: minimal runtime image ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/robscholey_shell-application/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/robscholey_shell-application/.next/static ./robscholey_shell-application/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/robscholey_shell-application/public ./robscholey_shell-application/public

USER nextjs
EXPOSE 3000

CMD ["node", "robscholey_shell-application/server.js"]
