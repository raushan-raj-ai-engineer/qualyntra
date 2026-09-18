/**
 * File: scripts/validate-performance-scale.mjs
 * Purpose: Statically validates that performance and scale certification assets preserve HA topology, bounded pool pressure, configurable SLOs, report generation, and source-control safety.
 * Author: Raushan Raj
 */
import fs from 'node:fs';
const required=['scripts/performance-scale-certify.mjs','deploy/compose/docker-compose.scale.yml','schemas/performance-scale-certification.schema.json','docs/35-PERFORMANCE-SCALE-CERTIFICATION.md','packages/performance/src/index.ts','tests/performance/performance-statistics.test.ts','tests/deployment/performance-scale-assets.test.ts'];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing performance/scale asset: ${file}`);
const script=fs.readFileSync('scripts/performance-scale-certify.mjs','utf8');for(const token of ['apiConcurrency','atomicIdempotency','workerChurn','queueScale','artifactThroughput','telemetryVolume','restartSurvivor','performance-scale-report.json','QUALYNTRA_SCALE_PROFILE'])if(!script.includes(token))throw new Error(`Performance certifier is missing ${token}`);if(/Bearer\s+[A-Za-z0-9_-]{16,}/.test(script))throw new Error('Performance certifier contains embedded bearer credential material.');
const overlay=fs.readFileSync('deploy/compose/docker-compose.scale.yml','utf8');for(const token of ['control-plane-a:','control-plane-b:','QUALYNTRA_API_RATE_LIMIT_PER_MINUTE: "100000"','QUALYNTRA_POSTGRES_MAX_CONNECTIONS: "12"'])if(!overlay.includes(token))throw new Error(`Scale Compose overlay is missing ${token}`);
const architecture=fs.readFileSync('scripts/audit-architecture.mjs','utf8');if(!architecture.includes("'packages/performance'"))throw new Error('packages/performance must remain architecture protected.');
JSON.parse(fs.readFileSync('schemas/performance-scale-certification.schema.json','utf8'));
console.log('Performance/scale asset validation passed.');
