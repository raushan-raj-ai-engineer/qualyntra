/**
 * File: tests/runtime/compatibility.test.ts
 * Purpose: Verifies compatibility classification for certified, candidate, reference, uncertified, and unknown runtime versions.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeCompatibility } from '../../packages/runtime/src/compatibility';
import type { CompatibilityRegistry } from '../../packages/contracts/src/runtime';

const registry: CompatibilityRegistry = {
  platformVersion: '1.0.0',
  tools: {
    playwright: {
      referenceBaseline: '1.63.0',
      certified: ['1.62.1'],
      candidate: '1.64.0',
      policy: 'qualified-before-promotion',
    },
  },
};

test('compatibility resolver recognizes certified runtime', () => {
  assert.equal(resolveRuntimeCompatibility('playwright', '1.62.1', registry).status, 'certified');
});

test('compatibility resolver recognizes candidate runtime', () => {
  assert.equal(resolveRuntimeCompatibility('playwright', '1.64.0', registry).status, 'candidate');
});

test('compatibility resolver distinguishes reference baseline from certification', () => {
  assert.equal(resolveRuntimeCompatibility('playwright', '1.63.0', registry).status, 'reference');
});

test('compatibility resolver marks an unqualified version without claiming incompatibility', () => {
  assert.equal(resolveRuntimeCompatibility('playwright', '9.9.9', registry).status, 'uncertified');
});

test('compatibility resolver handles missing runtime version', () => {
  assert.equal(resolveRuntimeCompatibility('playwright', undefined, registry).status, 'unknown');
});
