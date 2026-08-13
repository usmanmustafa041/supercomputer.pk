# The API. Built in stages so the shipped image carries only what it needs to
# run: no source, no toolchain, no development dependencies.

# ------------------------------------------------------------------ deps
FROM node:24-alpine AS deps
WORKDIR /repo

# Manifests only, so this layer is cached until a dependency actually changes.
# Copying the source first would rebuild node_modules on every code edit.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace @supercomputers/api --workspace @supercomputers/shared --include-workspace-root

# ----------------------------------------------------------------- build
FROM node:24-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY shared ./shared
COPY backend ./backend

# The domain package first: the API imports its compiled output, not its source.
RUN npm run build --workspace @supercomputers/shared \
 && npm run build --workspace @supercomputers/api \
 && npm prune --omit=dev --workspace @supercomputers/api --workspace @supercomputers/shared --include-workspace-root

# ---------------------------------------------------------------- runner
FROM node:24-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

# Not root. A process that only reads its own code and talks to two network
# services has no business being able to write to the image.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 api

COPY --from=builder --chown=api:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /repo/shared/dist ./shared/dist
COPY --from=builder --chown=api:nodejs /repo/shared/package.json ./shared/
COPY --from=builder --chown=api:nodejs /repo/backend/dist ./backend/dist
COPY --from=builder --chown=api:nodejs /repo/backend/package.json ./backend/

USER api
EXPOSE 4000
ENV PORT=4000

CMD ["node", "backend/dist/main.js"]
