# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --workspace=@vox/api --include-workspace-root=false --ignore-scripts --no-audit --no-fund
COPY apps/api apps/api
RUN npm exec --workspace=@vox/api -- prisma generate && npm run build --workspace=@vox/api

# CLI exists only in the temporary migration image.
FROM build AS migrate
ENV NODE_ENV=production
WORKDIR /app/apps/api
USER node
CMD ["node", "../../node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM build AS production-deps
RUN npm prune --omit=dev --workspace=@vox/api --include-workspace-root=false --ignore-scripts --no-audit --no-fund

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl && mkdir -p /app/uploads && chown node:node /app/uploads
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
