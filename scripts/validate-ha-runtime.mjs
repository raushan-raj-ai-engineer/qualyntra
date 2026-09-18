/**
 * File: scripts/validate-ha-runtime.mjs
 * Purpose: Performs dependency-free static validation of HA runtime certification assets before Docker-based live certification is attempted.
 * Author: Raushan Raj
 */
import fs from 'node:fs';
const failures=[];const read=file=>fs.readFileSync(file,'utf8');const requireText=(file,tokens)=>{const text=read(file);for(const token of tokens)if(!text.includes(token))failures.push(`${file}: missing ${token}`);};
for(const file of ['deploy/compose/docker-compose.ha.yml','scripts/prepare-ha-certification.mjs','scripts/ha-runtime-certify.mjs','schemas/ha-runtime-certification.schema.json'])if(!fs.existsSync(file))failures.push(`${file}: missing`);
requireText('deploy/compose/docker-compose.ha.yml',['postgres:18.6-bookworm','motoserver/moto:5.2.3','control-plane-a:','control-plane-b:','QUALYNTRA_RUNTIME_BACKEND: postgres','QUALYNTRA_ARTIFACT_STORAGE_BACKEND: s3','QUALYNTRA_POSTGRES_CONNECTION_STRING_FILE: /run/secrets/postgres_connection_string','QUALYNTRA_S3_ACCESS_KEY_FILE: /run/secrets/s3_access_key','QUALYNTRA_S3_SECRET_KEY_FILE: /run/secrets/s3_secret_key','QUALYNTRA_ALLOWED_HOSTS: s3:5000']);
requireText('deploy/docker/control-plane.Dockerfile',['pg@8.23.0','@aws-sdk/client-s3@3.1132.0','@aws-sdk/s3-request-presigner@3.1132.0']);
requireText('scripts/ha-runtime-certify.mjs',['idempotency-key','/verify','Promise.all','restart','Expired lease was not recovered']);
if(!read('.gitignore').includes('/deploy/compose/.ha-secrets/'))failures.push('.gitignore: HA secret directory must be ignored');
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('HA runtime asset validation passed.');
