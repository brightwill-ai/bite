FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/menu/package.json ./apps/menu/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
RUN npm ci

# Build the specified app
FROM deps AS builder
ARG APP
COPY . .
RUN npx turbo build --filter=@bite/${APP}

# Production runner
FROM node:20-alpine AS runner
ARG APP
ARG PORT=3000
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${PORT}
ENV HOSTNAME=0.0.0.0
ENV APP=${APP}

COPY --from=builder /app/apps/${APP}/.next/standalone ./
COPY --from=builder /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder /app/apps/${APP}/public ./apps/${APP}/public

EXPOSE ${PORT}
CMD node apps/${APP}/server.js
