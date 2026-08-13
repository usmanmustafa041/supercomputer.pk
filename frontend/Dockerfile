# The web tier. Built in stages so the shipped image carries only what it needs
# to run: no source, no toolchain, no development dependencies.
#
# Note what is not installed here: no `pg`, no database driver of any kind, and
# no storage client. This container could not open a database connection if it
# wanted to.

# ------------------------------------------------------------------ deps
FROM node:24-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace @supercomputers/web --workspace @supercomputers/shared --include-workspace-root

# ----------------------------------------------------------------- build
FROM node:24-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY shared ./shared
COPY frontend ./frontend

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @supercomputers/shared \
 && npm run build --workspace @supercomputers/web

# ---------------------------------------------------------------- runner
FROM node:24-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: "standalone"` emits a self-contained server carrying only the modules
# actually imported, which is a fraction of node_modules.
COPY --from=builder /repo/frontend/public ./frontend/public
COPY --from=builder --chown=nextjs:nodejs /repo/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/frontend/.next/static ./frontend/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "frontend/server.js"]
