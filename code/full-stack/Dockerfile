# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --include=prod --include=dev --bin-links=true --no-audit --no-fund --prefer-offline; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    else echo "No lockfile found" && exit 1; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN test -x node_modules/.bin/next
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Runnable image that keeps devDependencies and test sources for `docker compose run test`
FROM node:20-alpine AS test
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
CMD ["npm", "run", "test"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

COPY --from=builder /app/package.json ./package.json
COPY ./docker/entrypoint.sh ./docker/entrypoint.sh
RUN sed -i 's/\r$//' ./docker/entrypoint.sh && chmod +x ./docker/entrypoint.sh

CMD ["sh", "./docker/entrypoint.sh"]
