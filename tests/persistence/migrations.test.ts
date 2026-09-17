/**
 * File: tests/persistence/migrations.test.ts
 * Purpose: Verifies PostgreSQL migration ordering, advisory locking, checksum drift rejection, and transactional application.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { migrationChecksum,PostgresMigrationRunner } from '../../adapters/persistence/postgres/src/migrations';
import { MigrationChecksumError,MigrationOrderError } from '../../packages/persistence/src/errors';
class MigrationDb{calls:string[]=[];existing:{migration_id:string;checksum:string}[]=[];async query(){return{rows:[],rowCount:0};}async transaction<T>(work:any){const tx={id:'tx',query:async(text:string,params:unknown[]=[]):Promise<any>=>{this.calls.push(text);if(text.startsWith('SELECT migration_id,checksum'))return{rows:this.existing,rowCount:this.existing.length};if(text.startsWith('INSERT INTO qualyntra_schema_migrations')){this.existing.push({migration_id:String(params[0]),checksum:String(params[1])});return{rows:[],rowCount:1};}return{rows:[],rowCount:0};}};return work(tx);} }
function migration(id:string,sql:string){return{id,description:id,sql,checksum:migrationChecksum(sql)};}
test('migration runner serializes application and records checksums',async()=>{const db=new MigrationDb();const result=await new PostgresMigrationRunner(db as any,'1.0.0').migrate([migration('0001_base','CREATE TABLE demo(id text);'),migration('0002_next','ALTER TABLE demo ADD COLUMN name text;')]);assert.deepEqual(result.applied,['0001_base','0002_next']);assert.match(db.calls[0]!,/pg_advisory_xact_lock/);assert.equal(db.existing.length,2);});
test('migration runner rejects checksum drift for applied migration',async()=>{const db=new MigrationDb();db.existing=[{migration_id:'0001_base',checksum:'different'}];await assert.rejects(()=>new PostgresMigrationRunner(db as any).migrate([migration('0001_base','SELECT 1;')]),MigrationChecksumError);});
test('migration runner rejects duplicate or unordered identifiers',async()=>{const db=new MigrationDb();const runner=new PostgresMigrationRunner(db as any);await assert.rejects(()=>runner.migrate([migration('0002_b','SELECT 2;'),migration('0001_a','SELECT 1;')]),MigrationOrderError);});
