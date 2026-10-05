# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f server/Dockerfile -t tandem-sync .
# The root is the context because the server bundles the quick-add contract
# it shares with the app (src/features/*/lib).

FROM node:22.20.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --workspace @tandem/server --include-workspace-root=false --ignore-scripts --no-audit --no-fund
COPY src/features/quick-add/lib src/features/quick-add/lib
COPY src/features/chores/lib src/features/chores/lib
COPY src/features/lists/lib src/features/lists/lib
COPY server server
RUN npm run build --workspace @tandem/server

FROM node:22.20.0-alpine
WORKDIR /srv
ENV NODE_ENV=production PORT=8043 DATA_DIR=/data
COPY --from=build /app/server/dist ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8043
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8043/health || exit 1
CMD ["node", "--enable-source-maps", "main.mjs"]
