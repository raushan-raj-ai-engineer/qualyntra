/**
 * File: packages/contracts/src/persistence.ts
 * Purpose: Defines vendor-neutral persistence health, transaction, migration, and optimistic-concurrency contracts.
 * Author: Raushan Raj
 */
export type PersistenceHealthStatus='healthy'|'degraded'|'unavailable';
export interface PersistenceHealth { status:PersistenceHealthStatus; checkedAt:string; latencyMs?:number; reason?:string; metadata?:Record<string,unknown>; }
export interface PersistenceTransaction {
  readonly id:string;
}
export interface PersistenceTransactionManager {
  transaction<T>(work:(transaction:PersistenceTransaction)=>Promise<T>):Promise<T>;
}
export interface MigrationDescriptor { id:string; checksum:string; description?:string; }
export interface AppliedMigration extends MigrationDescriptor { appliedAt:string; applicationVersion?:string; }
export interface OptimisticVersioned { version:number; }
