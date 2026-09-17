/**
 * File: tests/providers/provider-router.test.ts
 * Purpose: Verifies alias routing, health-aware failover, retries, telemetry, cost estimation, and evaluator compatibility for multi-LLM providers.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ModelProviderAdapter, ModelRequest, ModelResponse } from '../../packages/contracts/src/evaluation';
import type { ProviderAttemptTelemetry } from '../../packages/contracts/src/provider';
import { ModelProviderRegistry } from '../../packages/evaluation/src/provider-registry';
import { LlmJudgeMetric } from '../../packages/evaluation/src/llm-judge';
import { InMemoryCostCatalog } from '../../packages/providers/src/cost-catalog';
import { ProviderInvocationError } from '../../packages/providers/src/errors';
import { ModelAliasRegistry } from '../../packages/providers/src/model-alias';
import { ProviderRouter, RoutedModelProvider } from '../../packages/providers/src/provider-router';

class FakeProvider implements ModelProviderAdapter {
  calls = 0;
  constructor(
    public readonly id: string,
    private readonly behavior: (request: ModelRequest, call: number) => Promise<ModelResponse>,
    private readonly state: 'healthy' | 'degraded' | 'unavailable' = 'healthy',
  ) {}
  capabilities() { return { chat: true, streaming: false, embeddings: false, jsonMode: false, tools: false, multimodal: false }; }
  async health() { return { status: this.state, message: this.state }; }
  generate(request: ModelRequest) { this.calls += 1; return this.behavior(request, this.calls); }
}

function response(provider: string, model: string, content = 'ok'): ModelResponse {
  return { content, model, provider, latencyMs: 12, inputTokens: 100, outputTokens: 20 };
}

test('router retries retryable failures and then succeeds without fallback', async () => {
  const providers = new ModelProviderRegistry();
  const primary = new FakeProvider('primary', async (_request, call) => {
    if (call === 1) throw new ProviderInvocationError('rate limited', 'rate-limit', 'primary', true, 429);
    return response('primary', 'model-a');
  });
  providers.register(primary);
  const aliases = new ModelAliasRegistry();
  aliases.register({ alias: 'judge-fast', candidates: [{ providerId: 'primary', model: 'model-a' }] });
  const events: ProviderAttemptTelemetry[] = [];
  const router = new ProviderRouter(providers, aliases, {
    policy: { retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0 } },
    telemetry: { record: event => { events.push(event); } },
    sleep: async () => undefined,
  });

  const result = await router.generate('judge-fast', { messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(result.provider, 'primary');
  assert.equal(result.retryCount, 1);
  assert.equal(result.fallbackUsed, false);
  assert.equal(primary.calls, 2);
  assert.deepEqual(events.map(event => event.success), [false, true]);
});

test('router falls back across providers and estimates cost from external catalog', async () => {
  const providers = new ModelProviderRegistry();
  providers.register(new FakeProvider('primary', async () => { throw new ProviderInvocationError('down', 'server-error', 'primary', true, 503); }));
  providers.register(new FakeProvider('secondary', async request => response('secondary', request.model ?? 'missing')));
  const aliases = new ModelAliasRegistry();
  aliases.register({ alias: 'judge-high-quality', candidates: [
    { providerId: 'primary', model: 'model-a', maxAttempts: 1 },
    { providerId: 'secondary', model: 'model-b', maxAttempts: 1 },
  ] });
  const costs = new InMemoryCostCatalog();
  costs.set('secondary', 'model-b', { inputPerMillionUsd: 10, outputPerMillionUsd: 20 });
  const router = new ProviderRouter(providers, aliases, { costCatalog: costs });

  const result = await router.generate('judge-high-quality', { messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(result.provider, 'secondary');
  assert.equal(result.model, 'model-b');
  assert.equal(result.fallbackUsed, true);
  assert.ok(Math.abs((result.costUsd ?? 0) - 0.0014) < 1e-12);
  assert.equal(result.totalTokens, 120);
});

test('routed provider can be used directly as an LLM judge without vendor coupling', async () => {
  const providers = new ModelProviderRegistry();
  providers.register(new FakeProvider('judge-a', async request => response('judge-a', request.model ?? 'm', '{"score":0.9,"reason":"good"}')));
  const aliases = new ModelAliasRegistry();
  aliases.register({ alias: 'quality-judge', candidates: [{ providerId: 'judge-a', model: 'judge-model' }] });
  const router = new ProviderRouter(providers, aliases);
  const routed = new RoutedModelProvider('quality-router', 'quality-judge', router, providers, aliases);
  const metric = new LlmJudgeMetric('quality', 'Quality', 0.8, 'Judge quality');
  const result = await metric.evaluate({ id: '1', input: 'q', actualOutput: 'a' }, { judge: routed });
  assert.equal(result.passed, true);
  assert.equal(result.score, 0.9);
});

test('route health reports degraded when at least one fallback remains available', async () => {
  const providers = new ModelProviderRegistry();
  providers.register(new FakeProvider('a', async () => response('a', 'm'), 'unavailable'));
  providers.register(new FakeProvider('b', async () => response('b', 'm'), 'healthy'));
  const aliases = new ModelAliasRegistry();
  aliases.register({ alias: 'route', candidates: [{ providerId: 'a', model: 'a' }, { providerId: 'b', model: 'b' }] });
  const health = await new ProviderRouter(providers, aliases).health('route');
  assert.equal(health.status, 'degraded');
  assert.equal(health.candidates.length, 2);
});
