# ---- build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# Install deps first for better caching
COPY package.json bun.lock ./
RUN bun install --ci

# Copy source and build
COPY . ./
RUN bun run build
# build with npm/yarn
# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install/copy production dependencies
COPY --from=build /app/package.json ./package.json
# Prefer copying node_modules resolved by Bun (faster, matches build)
COPY --from=build /app/node_modules ./node_modules
# Fallback to npm install in case layer cache misses (no-op if node_modules exists)
RUN [ -d node_modules ] || npm install --omit=dev

# Copy built files
COPY --from=build /app/dist ./dist
# Copy migrations if needed at runtime
COPY --from=build /app/src/db/migrations ./src/db/migrations

EXPOSE 3001
CMD ["node", "dist/index.js"]
