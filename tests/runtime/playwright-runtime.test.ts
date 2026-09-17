/**
 * File: tests/runtime/playwright-runtime.test.ts
 * Purpose: Verifies Playwright runtime diagnostics remain safe when Playwright is not bundled into the Qualyntra platform repository.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaywrightAutomationAdapter } from '../../adapters/automation/playwright/src';

test('playwright runtime reports optional dependency absence without crashing', async () => {
  const adapter = new PlaywrightAutomationAdapter();
  const health = await adapter.runtimeHealth({
    workingDirectory: '/qualyntra-intentionally-missing-runtime',
    metadata: { compatibilityRegistryRoot: process.cwd() },
  });

  assert.equal(health.status, 'unavailable');
  assert.equal(health.compatibility.status, 'unknown');
  assert.equal(health.identity.tool, 'playwright');
});

test('playwright runtime exposes vendor-neutral capabilities', async () => {
  const adapter = new PlaywrightAutomationAdapter();
  const capabilities = await adapter.runtimeCapabilities();
  assert.equal(capabilities.browserAutomation, true);
  assert.equal(capabilities.mobileAutomation, false);
  assert.equal(capabilities.tracing, true);
});
