/**
 * File: packages/providers/src/provider-router.ts
 * Purpose: Routes logical model aliases across providers with capability checks, health-aware fallback, retries, telemetry, and optional cost estimation.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter, ModelProviderCapabilities, ModelRequest, ModelResponse, ProviderHealth } from '../../contracts/src/evaluation';
import type { ProviderAttemptTelemetry, ProviderCostCatalog, ProviderRoutingPolicy, ProviderRouteHealth, ProviderTelemetrySink, ProviderErrorKind } from '../../contracts/src/provider';
import { ModelProviderRegistry } from '../../evaluation/src/provider-registry';
import { ModelAliasRegistry } from './model-alias';
import { estimateCostUsd } from './cost-catalog';
import { normalizeProviderError, ProviderInvocationError } from './errors';
import { DEFAULT_PROVIDER_RETRY_POLICY, retryDelayMs } from './retry-policy';

const DEFAULT_ROUTING_POLICY: ProviderRoutingPolicy = {
  retry: DEFAULT_PROVIDER_RETRY_POLICY,
  requireHealthyProvider: true,
  allowDegradedProvider: true,
  fallbackOnKinds: ['authentication', 'authorization', 'rate-limit', 'timeout', 'network', 'server-error', 'unavailable', 'unknown'],
};

export interface ProviderRouterOptions {
  policy?: Omit<Partial<ProviderRoutingPolicy>, 'retry'> & { retry?: Partial<ProviderRoutingPolicy['retry']> };
  telemetry?: ProviderTelemetrySink;
  costCatalog?: ProviderCostCatalog;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

function mergePolicy(input?: ProviderRouterOptions['policy']): ProviderRoutingPolicy {
  return {
    ...DEFAULT_ROUTING_POLICY,
    ...input,
    retry: { ...DEFAULT_PROVIDER_RETRY_POLICY, ...input?.retry },
  };
}

function supports(capabilities: ModelProviderCapabilities, required: Array<keyof ModelProviderCapabilities> = []): boolean {
  return required.every(key => capabilities[key] === true);
}

function routeCandidates<T extends { priority?: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.priority ?? a.index) - (b.item.priority ?? b.index))
    .map(entry => entry.item);
}

export class ProviderRouter {
  private readonly policy: ProviderRoutingPolicy;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(
    private readonly providers: ModelProviderRegistry,
    private readonly aliases: ModelAliasRegistry,
    private readonly options: ProviderRouterOptions = {},
  ) {
    this.policy = mergePolicy(options.policy);
    this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
  }

  async generate(alias: string, request: ModelRequest): Promise<ModelResponse> {
    const definition = this.aliases.get(alias);
    const errors: string[] = [];
    const candidates = routeCandidates(definition.candidates);

    for (let fallbackIndex = 0; fallbackIndex < candidates.length; fallbackIndex += 1) {
      const candidate = candidates[fallbackIndex]!;
      const provider = this.providers.get(candidate.providerId);
      if (!supports(provider.capabilities(), candidate.requiredCapabilities)) {
        errors.push(`${candidate.providerId}/${candidate.model}: required capabilities unavailable`);
        continue;
      }

      if (this.policy.requireHealthyProvider) {
        const health = await provider.health();
        if (health.status === 'unavailable' || (health.status === 'degraded' && !this.policy.allowDegradedProvider)) {
          errors.push(`${candidate.providerId}/${candidate.model}: ${health.message ?? health.status}`);
          continue;
        }
      }

      const maxAttempts = Math.max(1, candidate.maxAttempts ?? this.policy.retry.maxAttempts);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const started = Date.now();
        try {
          const response = await provider.generate({ ...request, model: candidate.model });
          const inputTokens = response.inputTokens ?? 0;
          const outputTokens = response.outputTokens ?? 0;
          const cost = response.costUsd ?? estimateCostUsd(this.options.costCatalog?.get(candidate.providerId, candidate.model), inputTokens, outputTokens);
          const enriched: ModelResponse = {
            ...response,
            model: response.model || candidate.model,
            totalTokens: response.totalTokens ?? inputTokens + outputTokens,
            costUsd: cost,
            retryCount: attempt - 1,
            fallbackUsed: fallbackIndex > 0,
          };
          await this.record({
            alias, providerId: candidate.providerId, model: candidate.model, fallbackIndex, attempt,
            success: true, latencyMs: enriched.latencyMs || (Date.now() - started), inputTokens,
            outputTokens, totalTokens: enriched.totalTokens, costUsd: enriched.costUsd, requestId: enriched.requestId,
          });
          return enriched;
        } catch (error) {
          const normalized = normalizeProviderError(candidate.providerId, error);
          await this.record({
            alias, providerId: candidate.providerId, model: candidate.model, fallbackIndex, attempt,
            success: false, latencyMs: Date.now() - started, errorKind: normalized.kind,
            statusCode: normalized.statusCode, requestId: normalized.requestId,
          });
          errors.push(`${candidate.providerId}/${candidate.model}: ${normalized.kind}`);
          const retryable = normalized.retryable && this.policy.retry.retryableKinds.includes(normalized.kind);
          if (retryable && attempt < maxAttempts) {
            await this.sleep(retryDelayMs(this.policy.retry, attempt, this.random));
            continue;
          }
          if (!this.policy.fallbackOnKinds.includes(normalized.kind)) {
            throw normalized;
          }
          break;
        }
      }
    }

    throw new ProviderInvocationError(`All routes failed for model alias ${alias}: ${errors.join(' | ')}`, 'unavailable', 'router', false);
  }

  async health(alias: string): Promise<ProviderRouteHealth> {
    const definition = this.aliases.get(alias);
    const candidates = [] as ProviderRouteHealth['candidates'];
    for (const candidate of routeCandidates(definition.candidates)) {
      const health = await this.providers.get(candidate.providerId).health();
      candidates.push({ providerId: candidate.providerId, model: candidate.model, status: health.status, message: health.message });
    }
    const healthy = candidates.filter(item => item.status === 'healthy').length;
    const available = candidates.filter(item => item.status !== 'unavailable').length;
    const status: ProviderRouteHealth['status'] = healthy === candidates.length
      ? 'healthy'
      : available > 0 ? 'degraded' : 'unavailable';
    return { alias, status, candidates };
  }

  private async record(event: ProviderAttemptTelemetry): Promise<void> {
    await this.options.telemetry?.record(event);
  }
}

function guaranteedCapabilities(providers: ModelProviderRegistry, alias: ReturnType<ModelAliasRegistry['get']>): ModelProviderCapabilities {
  const all = alias.candidates.map(candidate => providers.get(candidate.providerId).capabilities());
  const keys: Array<keyof ModelProviderCapabilities> = ['chat', 'streaming', 'embeddings', 'jsonMode', 'tools', 'multimodal'];
  const output = {} as ModelProviderCapabilities;
  for (const key of keys) output[key] = all.length > 0 && all.every(capabilities => capabilities[key] === true);
  return output;
}

export class RoutedModelProvider implements ModelProviderAdapter {
  constructor(
    public readonly id: string,
    private readonly alias: string,
    private readonly router: ProviderRouter,
    private readonly providers: ModelProviderRegistry,
    private readonly aliases: ModelAliasRegistry,
  ) {}
  capabilities(): ModelProviderCapabilities { return guaranteedCapabilities(this.providers, this.aliases.get(this.alias)); }
  generate(request: ModelRequest): Promise<ModelResponse> { return this.router.generate(this.alias, request); }
  async health(): Promise<ProviderHealth> {
    const health = await this.router.health(this.alias);
    return { status: health.status, message: `Alias ${this.alias}: ${health.candidates.length} candidate(s).`, checkedAt: new Date().toISOString() };
  }
}
