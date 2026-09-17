/**
 * File: adapters/persistence/postgres/src/migrations.ts
 * Purpose: Loads, checksums, orders, locks, and transactionally applies immutable PostgreSQL schema migrations.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { MigrationChecksumError,MigrationOrderError } from '../../../../packages/persistence/src/errors';
import type { AppliedMigration } from '../../../../packages/contracts/src/persistence';
import type { PostgresDatabase,PostgresTransaction } from './driver';

export interface SqlMigration { id:string; description:string; sql:string; checksum:string; }
export function migrationChecksum(sql:string):string{return createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');}
export async function loadSqlMigrations(directory:string):Promise<SqlMigration[]>{const names=(await fs.readdir(directory) as string[]).filter((name:string)=>/^\d{4}_[a-z0-9_-]+\.sql$/i.test(name)).sort();const migrations:SqlMigration[]=[];for(const name of names){const sql=await fs.readFile(path.join(directory,name),'utf8');const id=name.slice(0,-4);migrations.push({id,description:id.replace(/^\d+_/,'').replace(/[_-]+/g,' '),sql,checksum:migrationChecksum(sql)});}return migrations;}
function ensureStrictOrder(migrations:SqlMigration[]):void{const ids=migrations.map(item=>item.id);if(new Set(ids).size!==ids.length)throw new MigrationOrderError('Migration identifiers must be unique.');for(let i=1;i<ids.length;i++)if(ids[i-1]!.localeCompare(ids[i]!)>=0)throw new MigrationOrderError('Migrations must be supplied in strictly increasing identifier order.');}
async function ensureMetadata(tx:PostgresTransaction){await tx.query(`CREATE TABLE IF NOT EXISTS qualyntra_schema_migrations (migration_id TEXT PRIMARY KEY, checksum TEXT NOT NULL, description TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), application_version TEXT NOT NULL)`);}
export class PostgresMigrationRunner{
  constructor(private readonly database:PostgresDatabase,private readonly applicationVersion='development'){}
  async applied():Promise<AppliedMigration[]>{const result=await this.database.query<any>('SELECT migration_id,checksum,description,applied_at,application_version FROM qualyntra_schema_migrations ORDER BY migration_id');return result.rows.map(row=>({id:String(row.migration_id),checksum:String(row.checksum),description:String(row.description),appliedAt:new Date(row.applied_at).toISOString(),applicationVersion:String(row.application_version)}));}
  async migrate(migrations:SqlMigration[]):Promise<{applied:string[];skipped:string[]}>{ensureStrictOrder(migrations);return this.database.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock($1)',[73915031]);await ensureMetadata(tx);const existing=await tx.query<any>('SELECT migration_id,checksum FROM qualyntra_schema_migrations ORDER BY migration_id');const checksums=new Map(existing.rows.map(row=>[String(row.migration_id),String(row.checksum)]));const applied:string[]=[];const skipped:string[]=[];for(const migration of migrations){const checksum=checksums.get(migration.id);if(checksum){if(checksum!==migration.checksum)throw new MigrationChecksumError(migration.id);skipped.push(migration.id);continue;}await tx.query(migration.sql);await tx.query('INSERT INTO qualyntra_schema_migrations (migration_id,checksum,description,application_version) VALUES ($1,$2,$3,$4)',[migration.id,migration.checksum,migration.description,this.applicationVersion]);applied.push(migration.id);}return{applied,skipped};});}
}
