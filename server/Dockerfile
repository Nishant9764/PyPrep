FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production CONTENT_DIR=/app/content
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 4000
# Seeding is idempotent (upserts), so running it at every start keeps content in sync with /content.
CMD ["sh", "-c", "node dist/scripts/seed.js && node dist/index.js"]
