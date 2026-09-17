/**
 * File: adapters/llm/openai-responses/src/index.ts
 * Purpose: Implements an OpenAI Responses API adapter using the Qualyntra vendor-neutral provider contract and injectable HTTP transport.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter, ModelProviderCapabilities, ModelRequest, ModelResponse } from '../../../../packages/contracts/src/evaluation';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';
import { asRecord, FetchProviderHttpTransport, type ProviderHttpTransport } from '../../../../packages/providers/src/http';
import { capabilitiesWith, configuredHealth, endpoint, header, TEXT_CHAT_CAPABILITIES } from '../../../../packages/providers/src/adapter-utils';

export interface OpenAIResponsesOptions {
  id?: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  networkPolicy: NetworkPolicy;
  headers?: Record<string, string>;
  timeoutMs?: number;
  transport?: ProviderHttpTransport;
  capabilities?: Partial<ModelProviderCapabilities>;
  store?: boolean;
}

export class OpenAIResponsesProvider implements ModelProviderAdapter {
  readonly id: string;
  private readonly transport: ProviderHttpTransport;
  constructor(private readonly options: OpenAIResponsesOptions) {
    this.id = options.id ?? 'openai';
    this.transport = options.transport ?? new FetchProviderHttpTransport();
  }
  capabilities(): ModelProviderCapabilities { return capabilitiesWith(TEXT_CHAT_CAPABILITIES, this.options.capabilities); }
  health() { return Promise.resolve(configuredHealth(this.options.baseUrl, this.options.networkPolicy, Boolean(this.options.apiKey))); }
  async generate(request: ModelRequest): Promise<ModelResponse> {
    assertNetworkAllowed(this.options.baseUrl, this.options.networkPolicy);
    const started = Date.now();
    const response = await this.transport.request({
      providerId: this.id,
      url: endpoint(this.options.baseUrl, '/v1/responses'),
      method: 'POST',
      timeoutMs: request.timeoutMs ?? this.options.timeoutMs,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.options.apiKey}`, ...this.options.headers },
      body: JSON.stringify({
        model: request.model ?? this.options.model,
        input: request.messages.map(message => ({ role: message.role, content: message.content })),
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        ...(request.maxTokens === undefined ? {} : { max_output_tokens: request.maxTokens }),
        store: this.options.store ?? false,
      }),
    });
    const body = asRecord(response.body);
    const usage = asRecord(body.usage);
    const inputTokens = numberOrUndefined(usage.input_tokens);
    const outputTokens = numberOrUndefined(usage.output_tokens);
    return {
      content: extractOutputText(body), model: String(body.model ?? request.model ?? this.options.model), provider: this.id,
      latencyMs: Date.now() - started, inputTokens, outputTokens,
      totalTokens: numberOrUndefined(usage.total_tokens) ?? ((inputTokens ?? 0) + (outputTokens ?? 0)),
      requestId: header(response.headers, 'x-request-id', 'request-id'), raw: body,
    };
  }
}

function extractOutputText(body: Record<string, any>): string {
  if (typeof body.output_text === 'string') return body.output_text;
  if (!Array.isArray(body.output)) return '';
  const pieces: string[] = [];
  for (const item of body.output) {
    const record = asRecord(item);
    if (!Array.isArray(record.content)) continue;
    for (const content of record.content) {
      const part = asRecord(content);
      if (typeof part.text === 'string') pieces.push(part.text);
    }
  }
  return pieces.join('');
}
function numberOrUndefined(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
