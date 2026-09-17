# File: apps/agent/Dockerfile
# Purpose: Builds a minimal non-root container image for the standalone Qualyntra execution agent.
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
RUN mkdir -p /opt/qualyntra/data /opt/qualyntra/work && chown -R qualyntra:qualyntra /opt/qualyntra
USER qualyntra
ENV QUALYNTRA_AGENT_DATA_DIR=/opt/qualyntra/data \
    QUALYNTRA_AGENT_WORKSPACE_ROOT=/opt/qualyntra/work \
    QUALYNTRA_AGENT_HEALTH_HOST=0.0.0.0 \
    QUALYNTRA_AGENT_HEALTH_PORT=4321
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:4321/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","dist/apps/agent/src/main.js"]
