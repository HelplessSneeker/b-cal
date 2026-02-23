FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
COPY package.json /tmp/package.json
RUN corepack enable && cd /tmp && corepack install && rm /tmp/package.json

# ---- Install dependencies ----
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
COPY apps/api/ apps/api/
WORKDIR /app/apps/api
RUN pnpm prisma:generate && pnpm build
# pnpm deploy creates a standalone directory with production deps only.
# dist/ is excluded by .gitignore so pnpm deploy skips it — copy it manually.
WORKDIR /app
RUN pnpm --filter=@b-cal/api deploy --legacy --prod /deploy && \
    cp -r apps/api/dist /deploy/dist

# ---- Production (must be last — Coolify builds the final stage) ----
FROM base AS production
WORKDIR /app
RUN apk upgrade --no-cache && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=nestjs:nodejs /deploy ./
USER nestjs

ENV NODE_ENV=production
ENV NODE_PATH=/app/node_modules/.pnpm/node_modules
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["sh", "-c", "\
  retries=0; \
  until pnpm exec prisma migrate deploy; do \
    retries=$((retries + 1)); \
    if [ $retries -ge 10 ]; then \
      echo 'Migration failed after 10 attempts, exiting'; exit 1; \
    fi; \
    echo \"Migration attempt $retries failed, retrying in 3s...\"; \
    sleep 3; \
  done && \
  exec node dist/src/main"]
