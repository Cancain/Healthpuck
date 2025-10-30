# ---- build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# Install deps first for better caching
COPY package.json bun.lock ./
RUN bun install --ci

# Copy source and build
COPY . ./
RUN bun run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built files
COPY --from=build /app/dist ./dist
# Copy migrations if needed at runtime
COPY --from=build /app/src/db/migrations ./src/db/migrations

EXPOSE 3001
CMD ["node", "dist/index.js"]
