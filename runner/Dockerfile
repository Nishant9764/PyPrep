# ---- build the TypeScript ----------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- runtime: Node (runner) + Python (what learner code runs on) --------------------------
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY harness ./harness
# Everything the sandboxed user can read is world-readable but not writable.
RUN chmod -R a+rX /app && chmod -R go-w /app
ENV NODE_ENV=production \
    SANDBOX_UID_BASE=20000 \
    RUNNER_SOCKET=/run/runner/runner.sock \
    RUNNER_SOCKET_GID=2000
# The runner itself starts as root ONLY so it can switch each execution to an unprivileged uid
# (20000+). docker-compose drops every capability except SETUID/SETGID/CHOWN, gives the
# container no network, a read-only filesystem and a pid limit.
USER root
CMD ["node", "dist/index.js"]
