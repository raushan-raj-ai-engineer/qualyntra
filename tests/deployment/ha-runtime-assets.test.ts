/**
 * File: tests/deployment/ha-runtime-assets.test.ts
 * Purpose: Verifies live HA certification assets pin supported runtimes, use shared PostgreSQL/S3 state, mount secrets, and test restart recovery without enabling insecure defaults.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { readFileSync } from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
test('HA compose runs two control planes against shared PostgreSQL and S3-compatible state',()=>{const compose=read('deploy/compose/docker-compose.ha.yml');for(const token of ['postgres:18.6-bookworm','motoserver/moto:5.2.3','control-plane-a:','control-plane-b:','QUALYNTRA_RUNTIME_BACKEND: postgres','QUALYNTRA_ARTIFACT_STORAGE_BACKEND: s3','QUALYNTRA_POSTGRES_CONNECTION_STRING_FILE: /run/secrets/postgres_connection_string','QUALYNTRA_S3_ACCESS_KEY_FILE: /run/secrets/s3_access_key','QUALYNTRA_S3_SECRET_KEY_FILE: /run/secrets/s3_secret_key','QUALYNTRA_RUNTIME_RECOVERY_INTERVAL_MS: 5000','QUALYNTRA_ALLOWED_HOSTS: s3:5000'])assert.ok(compose.includes(token),`missing ${token}`);assert.equal(compose.includes('QUALYNTRA_API_TOKEN:'),false);});
test('control-plane image pins live HA runtime drivers inside adapter/deployment boundary',()=>{const dockerfile=read('deploy/docker/control-plane.Dockerfile');for(const token of ['pg@8.23.0','@aws-sdk/client-s3@3.1132.0','@aws-sdk/s3-request-presigner@3.1132.0'])assert.ok(dockerfile.includes(token));});
test('HA certification exercises atomic idempotency shared artifact verification exclusive leasing and restart recovery',()=>{const script=read('scripts/ha-runtime-certify.mjs');for(const token of ['idempotency-key','/verify','Promise.all','restart','control-plane-a','Expired lease was not recovered'])assert.ok(script.includes(token),`missing ${token}`);});
test('local HA secret material is excluded from source control',()=>{assert.ok(read('.gitignore').includes('/deploy/compose/.ha-secrets/'));});
