/**
 * File: adapters/persistence/postgres/src/health.ts
 * Purpose: Reports PostgreSQL persistence readiness without leaking connection details or credentials.
 * Author: Raushan Raj
 */
import type { PersistenceHealth } from '../../../../packages/contracts/src/persistence';
import type { PostgresQueryExecutor } from './driver';
export async function postgresHealth(database:PostgresQueryExecutor):Promise<PersistenceHealth>{const started=Date.now();try{await database.query('SELECT 1 AS ok');return{status:'healthy',checkedAt:new Date().toISOString(),latencyMs:Date.now()-started};}catch(error){return{status:'unavailable',checkedAt:new Date().toISOString(),latencyMs:Date.now()-started,reason:error instanceof Error?error.message:'PostgreSQL health check failed.'};}}
