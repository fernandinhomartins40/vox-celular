FROM node:22-alpine AS base
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --ignore-scripts

# Build stage
FROM deps AS build
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve with a minimal static server
FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
