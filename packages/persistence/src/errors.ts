/**
 * File: packages/persistence/src/errors.ts
 * Purpose: Defines storage-neutral persistence errors for concurrency, migration drift, and unavailable persistence backends.
 * Author: Raushan Raj
 */
export class PersistenceUnavailableError extends Error { constructor(message:string){super(message);this.name='PersistenceUnavailableError';} }
export class OptimisticConcurrencyError extends Error { constructor(public readonly resourceType:string,public readonly resourceId:string,public readonly expectedVersion:number){super(`${resourceType} ${resourceId} changed after version ${expectedVersion}.`);this.name='OptimisticConcurrencyError';} }
export class MigrationChecksumError extends Error { constructor(public readonly migrationId:string){super(`Applied migration checksum does not match source for ${migrationId}.`);this.name='MigrationChecksumError';} }
export class MigrationOrderError extends Error { constructor(message:string){super(message);this.name='MigrationOrderError';} }
