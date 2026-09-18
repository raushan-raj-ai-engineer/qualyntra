/**
 * File: adapters/persistence/postgres/src/index.ts
 * Purpose: Exports the optional PostgreSQL persistence adapter, migration runner, durable repository, audit log, and health probe.
 * Author: Raushan Raj
 */
export * from './driver';
export * from './scope';
export * from './health';
export * from './migrations';
export * from './repository';
export * from './audit-log';
export * from './distributed-queue';
export * from './artifact-catalog';
export * from './telemetry-store';
export * from './alert-state';
