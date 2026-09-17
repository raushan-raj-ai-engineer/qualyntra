/**
 * File: adapters/llm/openai-compatible/src/index.ts
 * Purpose: Connects to OpenAI-compatible chat-completions endpoints with network policy, injectable transport, normalized errors, and no embedded credentials.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter, ModelProviderCapabilities, ModelRequest, ModelResponse } from '../../../../packages/contracts/src/evaluation';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';
import { asRecord, FetchProviderHttpTransport, type ProviderHttpTransport } from '../../../../packages/providers/src/http';
import { capabilitiesWith, configuredHealth, endpoint, header, TEXT_CHAT_CAPABILITIES } from '../../../../packages/providers/src/adapter-utils';

export interface OpenAICompatibleOptions {
  id: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  networkPolicy: NetworkPolicy;
  headers?: Record<string, string>;
  timeoutMs?: number;
  transport?: ProviderHttpTransport;
  capabilities?: Partial<ModelProviderCapabilities>;
  path?: string;
}

export class OpenAICompatibleProvider implements ModelProviderAdapter {
  readonly id: string;
  private readonly transport: ProviderHttpTransport;
  constructor(private readonly options: OpenAICompatibleOptions) {
    this.id = options.id;
    this.transport = options.transport ?? new FetchProviderHttpTransport();
  }
  capabilities(): ModelProviderCapabilities {
    return capabilitiesWith(TEXT_CHAT_CAPABILITIES, optionsCapabilities(this.options.capabilities));
  }
  async health() { return configuredHealth(this.options.baseUrl, this.options.networkPolicy, true); }
  async generate(request: ModelRequest): Promise<ModelResponse> {
    assertNetworkAllowed(this.options.baseUrl, this.options.networkPolicy);
    const started = Date.now();
    const headers: Record<string, string> = { 'content-type': 'application/json', ...this.options.headers };
    if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;
    const response = await this.transport.request({
      providerId: this.id,
      url: endpoint(this.options.baseUrl, this.options.path ?? '/v1/chat/completions'),
      method: 'POST',
      headers,
      timeoutMs: request.timeoutMs ?? this.options.timeoutMs,
      body: JSON.stringify({
        model: request.model ?? this.options.model,
        messages: request.messages,
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
      }),
    });
    const body = asRecord(response.body);
    const usage = asRecord(body.usage);
    const choice = Array.isArray(body.choices) ? asRecord(body.choices[0]) : {};
    const message = asRecord(choice.message);
    const inputTokens = numberOrUndefined(usage.prompt_tokens);
    const outputTokens = numberOrUndefined(usage.completion_tokens);
    return {
      content: String(message.content ?? ''),
      model: String(body.model ?? request.model ?? this.options.model),
      provider: this.id,
      latencyMs: Date.now() - started,
      inputTokens,
      outputTokens,
      totalTokens: numberOrUndefined(usage.total_tokens) ?? ((inputTokens ?? 0) + (outputTokens ?? 0)),
      requestId: header(response.headers, 'x-request-id', 'request-id'),
      raw: body,
    };
  }
}

function optionsCapabilities(value?: Partial<ModelProviderCapabilities>): Partial<ModelProviderCapabilities> { return value ?? {}; }
function numberOrUndefined(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
