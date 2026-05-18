FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* must be set at build time (embedded in the client bundle)
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_APP_SHORT_NAME=POS
ARG NEXT_PUBLIC_APP_TAGLINE=
ARG NEXT_PUBLIC_APP_COPYRIGHT_ENTITY=
ARG NEXT_PUBLIC_TENANT_SLUG=
ARG NEXT_PUBLIC_FEATURE_RECETAS=true
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ARG NEXT_PUBLIC_CONTACT_WHATSAPP=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_SHORT_NAME=$NEXT_PUBLIC_APP_SHORT_NAME
ENV NEXT_PUBLIC_APP_TAGLINE=$NEXT_PUBLIC_APP_TAGLINE
ENV NEXT_PUBLIC_APP_COPYRIGHT_ENTITY=$NEXT_PUBLIC_APP_COPYRIGHT_ENTITY
ENV NEXT_PUBLIC_TENANT_SLUG=$NEXT_PUBLIC_TENANT_SLUG
ENV NEXT_PUBLIC_FEATURE_RECETAS=$NEXT_PUBLIC_FEATURE_RECETAS
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_CONTACT_WHATSAPP=$NEXT_PUBLIC_CONTACT_WHATSAPP

# Copy workspace manifests first for layer caching
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

RUN npm run build --workspace=@pos/frontend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# With outputFileTracingRoot set to monorepo root, the standalone output
# preserves the apps/frontend path prefix
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
