# File: deploy/docker/control-plane.Dockerfile
# Purpose: Builds a minimal non-root production image for the Qualyntra control plane with writable data isolated to a mounted volume.
# Author: Raushan Raj
FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN groupadd --system qualyntra && useradd --system --gid qualyntra --home /opt/qualyntra --create-home qualyntra
WORKDIR /opt/qualyntra
COPY --from=build /workspace/dist ./dist
COPY --from=build /workspace/package.json ./package.json
RUN mkdir -p /var/lib/qualyntra && chown -R qualyntra:qualyntra /var/lib/qualyntra /opt/qualyntra
USER qualyntra
ENV NODE_ENV=production \
    QUALYNTRA_HOST=0.0.0.0 \
    QUALYNTRA_PORT=4317 \
    QUALYNTRA_DATA_DIR=/var/lib/qualyntra
EXPOSE 4317
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:4317/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","dist/apps/control-plane/src/server.js"]
