/**
 * File: tests/deployment/performance-scale-assets.test.ts
 * Purpose: Verifies performance and scale certification assets exercise HA pressure scenarios without embedding credentials or weakening production runtime defaults.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { readFileSync } from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
test('scale overlay raises only certification rate ceiling and creates bounded PostgreSQL pool pressure',()=>{const overlay=read('deploy/compose/docker-compose.scale.yml');for(const token of ['control-plane-a:','control-plane-b:','QUALYNTRA_API_RATE_LIMIT_PER_MINUTE: "100000"','QUALYNTRA_POSTGRES_MAX_CONNECTIONS: "12"','QUALYNTRA_POSTGRES_STATEMENT_TIMEOUT_MS: "15000"'])assert.ok(overlay.includes(token),`missing ${token}`);assert.equal(overlay.includes('QUALYNTRA_API_TOKEN'),false);});
test('live scale certifier covers API queue workers artifacts telemetry and restart survivor behavior',()=>{const script=read('scripts/performance-scale-certify.mjs');for(const token of ['apiConcurrency','atomicIdempotency','workerChurn','queueScale','artifactThroughput','telemetryVolume','restartSurvivor','docker-compose.scale.yml'])assert.ok(script.includes(token),`missing ${token}`);});
test('scale certification supports smoke standard and stress profiles with operator-overridable SLOs',()=>{const script=read('scripts/performance-scale-certify.mjs');for(const token of ['smoke:','standard:','stress:','QUALYNTRA_SCALE_API_P95_MS','QUALYNTRA_SCALE_QUEUE_MIN_JOBS_PER_SECOND','QUALYNTRA_SCALE_ARTIFACT_MIN_MIB_PER_SECOND'])assert.ok(script.includes(token),`missing ${token}`);});
test('performance report is written under ignored runtime artifacts rather than committed source',()=>{const script=read('scripts/performance-scale-certify.mjs');assert.ok(script.includes('artifacts/performance-scale-report.json'));assert.ok(read('.gitignore').includes('/artifacts/'));});
test('performance package is protected from vendor-specific imports',()=>{assert.ok(read('scripts/audit-architecture.mjs').includes("'packages/performance'"));});
