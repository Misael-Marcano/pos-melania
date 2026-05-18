FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN npm run build -w @pos/shared && npm run build --workspace=@pos/backend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy workspace manifests for production install
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["node", "dist/server.js"]
