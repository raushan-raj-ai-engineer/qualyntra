/**
 * File: apps/control-plane/src/runtime-backends.ts
 * Purpose: Composes in-memory or PostgreSQL durable runtime state for the control plane without leaking database concerns into platform-kernel packages.
 * Author: Raushan Raj
 */
import path from 'node:path';
import type { ArtifactCatalog } from '../../../packages/contracts/src/artifact';
import type { ControlPlaneRepository } from '../../../packages/contracts/src/control-plane';
import type { AuditReader,AuditSink } from '../../../packages/contracts/src/governance';
import type { DistributedExecutionQueue } from '../../../packages/contracts/src/distributed';
import type { TelemetryReader,TelemetrySink } from '../../../packages/contracts/src/observability';
import { InMemoryControlPlaneRepository } from '../../../packages/control-plane/src/repository';
import { InMemoryAuditLog } from '../../../packages/governance/src/audit-log';
import { InMemoryDistributedExecutionQueue } from '../../../packages/distributed/src/in-memory-queue';
import { InMemoryArtifactCatalog } from '../../../packages/artifacts/src/catalog';
import { InMemoryTelemetryStore } from '../../../packages/observability/src/store';
import { InMemoryAlertStateStore,type AlertStateStore } from '../../../packages/observability/src/alerts';
import { readSecretFile } from '../../../packages/security/src/file-secret';
import { createOptionalNodePostgresDatabase,type PostgresDatabase } from '../../../adapters/persistence/postgres/src/driver';
import { loadSqlMigrations,PostgresMigrationRunner } from '../../../adapters/persistence/postgres/src/migrations';
import { PostgresControlPlaneRepository } from '../../../adapters/persistence/postgres/src/repository';
import { PostgresAuditLog } from '../../../adapters/persistence/postgres/src/audit-log';
import { PostgresDistributedExecutionQueue } from '../../../adapters/persistence/postgres/src/distributed-queue';
import { PostgresArtifactCatalog } from '../../../adapters/persistence/postgres/src/artifact-catalog';
import { PostgresTelemetryStore } from '../../../adapters/persistence/postgres/src/telemetry-store';
import { PostgresAlertStateStore } from '../../../adapters/persistence/postgres/src/alert-state';
import { postgresHealth } from '../../../adapters/persistence/postgres/src/health';

export type RuntimeBackendMode='memory'|'postgres';
export interface ControlPlaneRuntimeBackends{
  mode:RuntimeBackendMode;
  repository:ControlPlaneRepository;
  audit:AuditSink&AuditReader;
  distributedQueue:DistributedExecutionQueue;
  artifactCatalog:ArtifactCatalog;
  telemetry:TelemetrySink&TelemetryReader;
  alertState:AlertStateStore;
  health():Promise<{status:'healthy'|'unavailable';message?:string}>;
  close():Promise<void>;
}
export interface RuntimeBackendFactoryInput{
  env?:Record<string,string|undefined>;
  sensitiveKeys?:string[];
  database?:PostgresDatabase;
  applicationVersion?:string;
}
function integer(value:string|undefined,fallback:number,name:string,min:number,max:number):number{const parsed=Number(value??fallback);if(!Number.isInteger(parsed)||parsed<min||parsed>max)throw new Error(`${name} must be an integer between ${min} and ${max}`);return parsed;}
function bool(value:string|undefined,fallback:boolean):boolean{if(value===undefined)return fallback;return['1','true','yes','on'].includes(value.toLowerCase());}
function mode(env:Record<string,string|undefined>):RuntimeBackendMode{const value=(env.QUALYNTRA_RUNTIME_BACKEND??'memory').trim().toLowerCase();if(value!=='memory'&&value!=='postgres')throw new Error('QUALYNTRA_RUNTIME_BACKEND must be memory or postgres.');return value;}

export async function createControlPlaneRuntimeBackends(input:RuntimeBackendFactoryInput={}):Promise<ControlPlaneRuntimeBackends>{
  const env=input.env??process.env;const selected=mode(env);const sensitiveKeys=input.sensitiveKeys??['authorization','api-key','apikey','token','password','secret','cookie','set-cookie'];
  if(selected==='memory'){
    const telemetry=new InMemoryTelemetryStore({sensitiveKeys});return{mode:'memory',repository:new InMemoryControlPlaneRepository(),audit:new InMemoryAuditLog(),distributedQueue:new InMemoryDistributedExecutionQueue(),artifactCatalog:new InMemoryArtifactCatalog(),telemetry,alertState:new InMemoryAlertStateStore(),health:async()=>({status:'healthy'}),close:async()=>{}};
  }
  let database=input.database;
  if(!database){const file=env.QUALYNTRA_POSTGRES_CONNECTION_STRING_FILE?.trim();if(!file)throw new Error('QUALYNTRA_POSTGRES_CONNECTION_STRING_FILE is required when QUALYNTRA_RUNTIME_BACKEND=postgres.');const connectionString=await readSecretFile(file);database=createOptionalNodePostgresDatabase({connectionString,maxConnections:integer(env.QUALYNTRA_POSTGRES_MAX_CONNECTIONS,20,'QUALYNTRA_POSTGRES_MAX_CONNECTIONS',1,200),statementTimeoutMs:integer(env.QUALYNTRA_POSTGRES_STATEMENT_TIMEOUT_MS,30_000,'QUALYNTRA_POSTGRES_STATEMENT_TIMEOUT_MS',100,300_000),ssl:bool(env.QUALYNTRA_POSTGRES_SSL,true)});}
  if(bool(env.QUALYNTRA_POSTGRES_MIGRATE_ON_START,true)){const directory=env.QUALYNTRA_POSTGRES_MIGRATIONS_DIR?.trim()||path.resolve('adapters/persistence/postgres/migrations');const migrations=await loadSqlMigrations(directory);await new PostgresMigrationRunner(database,input.applicationVersion??'1.0.0').migrate(migrations);}
  const audit=new PostgresAuditLog(database);const telemetry=new PostgresTelemetryStore(database,sensitiveKeys);return{mode:'postgres',repository:new PostgresControlPlaneRepository(database),audit,distributedQueue:new PostgresDistributedExecutionQueue(database),artifactCatalog:new PostgresArtifactCatalog(database),telemetry,alertState:new PostgresAlertStateStore(database),health:async()=>{const health=await postgresHealth(database!);return health.status==='healthy'?{status:'healthy'}:{status:'unavailable',message:health.reason};},close:async()=>{await database?.close?.();}};
}
