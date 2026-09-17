/**
 * File: adapters/llm/azure-openai/src/index.ts
 * Purpose: Implements Azure OpenAI v1 Responses API access with API-key or bearer-token authentication and no embedded deployment names.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter, ModelProviderCapabilities, ModelRequest, ModelResponse } from '../../../../packages/contracts/src/evaluation';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';
import { asRecord, FetchProviderHttpTransport, type ProviderHttpTransport } from '../../../../packages/providers/src/http';
import { capabilitiesWith, configuredHealth, endpoint, header, TEXT_CHAT_CAPABILITIES } from '../../../../packages/providers/src/adapter-utils';

export interface AzureOpenAIOptions {
  id?: string;
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
  deployment: string;
  networkPolicy: NetworkPolicy;
  headers?: Record<string, string>;
  timeoutMs?: number;
  transport?: ProviderHttpTransport;
  capabilities?: Partial<ModelProviderCapabilities>;
  store?: boolean;
}

export class AzureOpenAIProvider implements ModelProviderAdapter {
  readonly id: string;
  private readonly transport: ProviderHttpTransport;
  constructor(private readonly options: AzureOpenAIOptions) {
    this.id = options.id ?? 'azure-openai';
    if (options.apiKey && options.bearerToken) throw new Error('Configure either Azure OpenAI API key or bearer token, not both.');
    this.transport = options.transport ?? new FetchProviderHttpTransport();
  }
  capabilities(): ModelProviderCapabilities { return capabilitiesWith(TEXT_CHAT_CAPABILITIES, this.options.capabilities); }
  health() { return Promise.resolve(configuredHealth(this.options.baseUrl, this.options.networkPolicy, Boolean(this.options.apiKey || this.options.bearerToken))); }
  async generate(request: ModelRequest): Promise<ModelResponse> {
    assertNetworkAllowed(this.options.baseUrl, this.options.networkPolicy);
    const started = Date.now();
    const headers: Record<string, string> = { 'content-type': 'application/json', ...this.options.headers };
    if (this.options.apiKey) headers['api-key'] = this.options.apiKey;
    if (this.options.bearerToken) headers.authorization = `Bearer ${this.options.bearerToken}`;
    const response = await this.transport.request({
      providerId: this.id,
      url: endpoint(this.options.baseUrl, '/openai/v1/responses'),
      method: 'POST', headers, timeoutMs: request.timeoutMs ?? this.options.timeoutMs,
      body: JSON.stringify({
        model: request.model ?? this.options.deployment,
        input: request.messages.map(message => ({ role: message.role, content: message.content })),
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        ...(request.maxTokens === undefined ? {} : { max_output_tokens: request.maxTokens }),
        store: this.options.store ?? false,
      }),
    });
    const body = asRecord(response.body); const usage = asRecord(body.usage);
    const inputTokens = numberOrUndefined(usage.input_tokens); const outputTokens = numberOrUndefined(usage.output_tokens);
    return { content: extractOutputText(body), model: String(body.model ?? request.model ?? this.options.deployment), provider: this.id,
      latencyMs: Date.now() - started, inputTokens, outputTokens, totalTokens: numberOrUndefined(usage.total_tokens) ?? ((inputTokens ?? 0) + (outputTokens ?? 0)),
      requestId: header(response.headers, 'x-request-id', 'request-id', 'apim-request-id'), raw: body };
  }
}
function extractOutputText(body: Record<string, any>): string { if (typeof body.output_text === 'string') return body.output_text; const pieces:string[]=[]; for (const item of Array.isArray(body.output)?body.output:[]) for(const content of Array.isArray(asRecord(item).content)?asRecord(item).content:[]) if(typeof asRecord(content).text==='string') pieces.push(asRecord(content).text); return pieces.join(''); }
function numberOrUndefined(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
