/**
 * File: tests/providers/provider-contracts.test.ts
 * Purpose: Verifies alias validation, retry delay bounds, safe provider-error classification, and cost-catalog behavior.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryCostCatalog, estimateCostUsd } from '../../packages/providers/src/cost-catalog';
import { classifyHttpStatus, normalizeProviderError, ProviderInvocationError } from '../../packages/providers/src/errors';
import { ModelAliasRegistry } from '../../packages/providers/src/model-alias';
import { retryDelayMs } from '../../packages/providers/src/retry-policy';

test('alias registry rejects duplicate aliases and duplicate provider/model routes', () => {
  const aliases = new ModelAliasRegistry();
  aliases.register({ alias: 'judge', candidates: [{ providerId: 'a', model: 'm' }] });
  assert.throws(() => aliases.register({ alias: 'judge', candidates: [{ providerId: 'b', model: 'm' }] }), /already registered/);
  assert.throws(() => new ModelAliasRegistry().register({ alias: 'dup', candidates: [
    { providerId: 'a', model: 'm' }, { providerId: 'a', model: 'm' },
  ] }), /duplicate candidate/);
});

test('HTTP failures are classified for retry and fallback without response-body leakage', () => {
  assert.deepEqual(classifyHttpStatus(429), { kind: 'rate-limit', retryable: true });
  assert.deepEqual(classifyHttpStatus(401), { kind: 'authentication', retryable: false });
  const existing = new ProviderInvocationError('safe', 'server-error', 'p', true, 500);
  assert.equal(normalizeProviderError('p', existing), existing);
});

test('retry delay is deterministic with injected randomness and stays bounded', () => {
  const delay = retryDelayMs({ maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 500, backoffMultiplier: 2, jitterRatio: 0.2, retryableKinds: [] }, 2, () => 0.5);
  assert.equal(delay, 200);
});

test('cost catalog has no built-in vendor pricing and estimates only configured rates', () => {
  const catalog = new InMemoryCostCatalog();
  assert.equal(catalog.get('vendor', 'model'), undefined);
  catalog.set('vendor', 'model', { inputPerMillionUsd: 2, outputPerMillionUsd: 8 });
  assert.ok(Math.abs((estimateCostUsd(catalog.get('vendor', 'model'), 1_000, 500) ?? 0) - 0.006) < 1e-12);
});
