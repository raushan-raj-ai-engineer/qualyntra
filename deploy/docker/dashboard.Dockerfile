# File: deploy/docker/dashboard.Dockerfile
# Purpose: Builds a minimal non-root image for the Qualyntra dashboard BFF and compiled browser assets.
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
USER qualyntra
ENV NODE_ENV=production \
    QUALYNTRA_DASHBOARD_HOST=0.0.0.0 \
    QUALYNTRA_DASHBOARD_PORT=4320
EXPOSE 4320
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:4320/dashboard-health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","dist/apps/dashboard/src/main.js"]
