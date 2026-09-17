/**
 * File: tests/providers/adapters.test.ts
 * Purpose: Verifies provider-specific HTTP mapping offline for OpenAI, Azure OpenAI, Anthropic, Gemini, Bedrock, Ollama, and vLLM adapters.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProviderHttpRequest, ProviderHttpResponse, ProviderHttpTransport } from '../../packages/providers/src/http';
import { OpenAIResponsesProvider } from '../../adapters/llm/openai-responses/src/index';
import { AzureOpenAIProvider } from '../../adapters/llm/azure-openai/src/index';
import { AnthropicProvider } from '../../adapters/llm/anthropic/src/index';
import { GeminiProvider } from '../../adapters/llm/gemini/src/index';
import { BedrockProvider } from '../../adapters/llm/bedrock/src/index';
import { OllamaProvider } from '../../adapters/llm/ollama/src/index';
import { VllmProvider } from '../../adapters/llm/vllm/src/index';

const policy = { allowNetwork: true, allowedHosts: [] as string[] };
const request = { messages: [{ role: 'system' as const, content: 'system' }, { role: 'user' as const, content: 'hello' }], maxTokens: 50 };

class RecordingTransport implements ProviderHttpTransport {
  requests: ProviderHttpRequest[] = [];
  constructor(private readonly factory: (request: ProviderHttpRequest) => ProviderHttpResponse) {}
  async request(input: ProviderHttpRequest): Promise<ProviderHttpResponse> { this.requests.push(input); return this.factory(input); }
}

function response(body: unknown, headers: Record<string,string> = {}): ProviderHttpResponse { return { status: 200, headers, body }; }

test('OpenAI Responses and Azure OpenAI map to Responses API envelopes without live network', async () => {
  const openaiTransport = new RecordingTransport(() => response({ output_text: 'openai', model: 'm', usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 } }, { 'x-request-id': 'openai-rid' }));
  const openai = new OpenAIResponsesProvider({ baseUrl: 'https://example.test', apiKey: 'secret', model: 'm', networkPolicy: policy, transport: openaiTransport });
  const openaiResult = await openai.generate(request);
  assert.match(openaiTransport.requests[0]?.url ?? '', /\/v1\/responses$/);
  assert.equal(openaiTransport.requests[0]?.headers.authorization, 'Bearer secret');
  assert.equal(openaiResult.content, 'openai');
  assert.equal(openaiResult.totalTokens, 5);
  assert.equal(openaiResult.requestId, 'openai-rid');

  const azureTransport = new RecordingTransport(() => response({ output_text: 'azure', model: 'deployment', usage: { input_tokens: 1, output_tokens: 1 } }));
  const azure = new AzureOpenAIProvider({ baseUrl: 'https://azure.example.test', apiKey: 'key', deployment: 'deployment', networkPolicy: policy, transport: azureTransport });
  await azure.generate(request);
  assert.match(azureTransport.requests[0]?.url ?? '', /\/openai\/v1\/responses$/);
  assert.equal(azureTransport.requests[0]?.headers['api-key'], 'key');
});

test('Anthropic and Gemini map text conversations to their vendor REST envelopes', async () => {
  const anthropicTransport = new RecordingTransport(() => response({ model: 'claude', content: [{ type: 'text', text: 'anthropic' }], usage: { input_tokens: 4, output_tokens: 2 } }));
  const anthropic = new AnthropicProvider({ baseUrl: 'https://anthropic.example.test', apiKey: 'key', model: 'claude', apiVersion: 'version', defaultMaxTokens: 100, networkPolicy: policy, transport: anthropicTransport });
  const anthropicResult = await anthropic.generate(request);
  const anthropicBody = JSON.parse(anthropicTransport.requests[0]?.body ?? '{}');
  assert.equal(anthropicBody.system, 'system');
  assert.equal(anthropicTransport.requests[0]?.headers['x-api-key'], 'key');
  assert.equal(anthropicResult.content, 'anthropic');

  const geminiTransport = new RecordingTransport(() => response({ candidates: [{ content: { parts: [{ text: 'gemini' }] } }], usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2, totalTokenCount: 5 } }));
  const gemini = new GeminiProvider({ baseUrl: 'https://gemini.example.test', apiKey: 'key', model: 'gemini-model', networkPolicy: policy, transport: geminiTransport });
  const geminiResult = await gemini.generate(request);
  assert.match(geminiTransport.requests[0]?.url ?? '', /generateContent$/);
  assert.equal(geminiTransport.requests[0]?.headers['x-goog-api-key'], 'key');
  assert.equal(geminiResult.content, 'gemini');
});

test('Bedrock supports bearer or pluggable signed headers and maps Converse usage', async () => {
  const transport = new RecordingTransport(() => response({ output: { message: { content: [{ text: 'bedrock' }] } }, usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 }, metrics: { latencyMs: 9 } }, { 'x-amzn-requestid': 'aws-rid' }));
  const provider = new BedrockProvider({ baseUrl: 'https://bedrock.example.test', bearerToken: 'bedrock-key', model: 'model', networkPolicy: policy, transport });
  const result = await provider.generate(request);
  assert.match(transport.requests[0]?.url ?? '', /\/model\/model\/converse$/);
  assert.equal(transport.requests[0]?.headers.authorization, 'Bearer bedrock-key');
  assert.equal(result.content, 'bedrock');
  assert.equal(result.requestId, 'aws-rid');
  assert.equal(result.latencyMs, 9);
});

test('Ollama and vLLM stay compatible with private/local endpoints without vendor SDK dependencies', async () => {
  const ollamaTransport = new RecordingTransport(() => response({ model: 'local', message: { content: 'ollama' }, prompt_eval_count: 2, eval_count: 3 }));
  const ollama = new OllamaProvider({ baseUrl: 'http://localhost:11434', model: 'local', networkPolicy: policy, transport: ollamaTransport });
  const ollamaResult = await ollama.generate(request);
  assert.match(ollamaTransport.requests[0]?.url ?? '', /\/api\/chat$/);
  assert.equal(ollamaResult.content, 'ollama');

  const vllmTransport = new RecordingTransport(() => response({ model: 'vllm-model', choices: [{ message: { content: 'vllm' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
  const vllm = new VllmProvider({ baseUrl: 'http://localhost:8000', model: 'vllm-model', networkPolicy: policy, transport: vllmTransport });
  const vllmResult = await vllm.generate(request);
  assert.match(vllmTransport.requests[0]?.url ?? '', /\/v1\/chat\/completions$/);
  assert.equal(vllmResult.content, 'vllm');
});

test('Azure adapter prevents ambiguous dual authentication configuration', () => {
  assert.throws(() => new AzureOpenAIProvider({ baseUrl: 'https://azure.example.test', apiKey: 'a', bearerToken: 'b', deployment: 'd', networkPolicy: policy }), /either Azure OpenAI API key or bearer token/);
});
