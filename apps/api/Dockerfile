FROM node:22-alpine AS base
WORKDIR /app

# Install production dependencies only
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Install all dependencies (including devDeps) for building
FROM base AS build-deps
COPY package.json ./
RUN npm install --ignore-scripts

# Build stage
FROM build-deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY package.json .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
