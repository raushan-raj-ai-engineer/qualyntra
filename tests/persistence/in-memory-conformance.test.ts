/**
 * File: tests/persistence/in-memory-conformance.test.ts
 * Purpose: Verifies the reference in-memory repository satisfies shared tenant, idempotency, and optimistic-concurrency persistence behavior.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { InMemoryControlPlaneRepository } from '../../packages/control-plane/src/repository';
import { verifyControlPlaneRepositoryConformance } from '../../packages/persistence/src/conformance';
test('in-memory repository satisfies persistence conformance',async()=>{const result=await verifyControlPlaneRepositoryConformance(new InMemoryControlPlaneRepository());assert.deepEqual(result.checks,['idempotency-scope','tenant-visibility','optimistic-version']);});
