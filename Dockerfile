# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-build
RUN apk add --no-cache libc6-compat
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=
RUN npm run build

FROM node:20-alpine AS api-build
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV DOCKER_BUILD=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/run-prepare.cjs scripts/run-prepare.cjs
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_FILES_DIR=/app/public
ENV DOCKER_BUILD=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/run-prepare.cjs scripts/run-prepare.cjs
RUN npm ci --omit=dev
COPY --from=api-build /app/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public
COPY scripts ./scripts
RUN chmod +x /app/scripts/docker-entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
