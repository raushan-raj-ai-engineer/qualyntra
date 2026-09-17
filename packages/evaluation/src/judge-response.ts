/**
 * File: packages/evaluation/src/judge-response.ts
 * Purpose: Builds provider-neutral judge prompts and validates structured judge responses without vendor SDK dependencies.
 * Author: Raushan Raj
 */
import type { EvaluationCase, ModelRequest } from '../../contracts/src/evaluation';

export interface ParsedJudgeResponse {
  score: number;
  reason: string;
}

function extractJsonObject(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced?.startsWith('{') && fenced.endsWith('}')) {
    return fenced;
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  throw new Error('Judge response did not contain a JSON object.');
}

export function parseJudgeResponse(content: string): ParsedJudgeResponse {
  const json = extractJsonObject(content);
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Judge response contained invalid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Judge response JSON must be an object.');
  }

  const candidate = parsed as Record<string, unknown>;
  const score = Number(candidate.score);

  if (!Number.isFinite(score)) {
    throw new Error('Judge response score must be a finite number.');
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    reason: typeof candidate.reason === 'string' && candidate.reason.trim()
      ? candidate.reason.trim()
      : 'No reason supplied by judge.',
  };
}

export function buildJudgeRequest(testCase: EvaluationCase, rubric: string): ModelRequest {
  return {
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'You are a strict software quality evaluator. Return ONLY JSON with keys score (0..1) and reason.',
      },
      {
        role: 'user',
        content: [
          `Rubric:\n${rubric}`,
          `Input:\n${testCase.input}`,
          `Actual output:\n${testCase.actualOutput}`,
          `Expected output:\n${testCase.expectedOutput ?? '(not supplied)'}`,
          `Context:\n${(testCase.context ?? []).join('\n')}`,
          `Retrieval context:\n${(testCase.retrievalContext ?? []).join('\n')}`,
          `Expected tools:\n${(testCase.toolsExpected ?? []).join(', ') || '(not supplied)'}`,
          `Used tools:\n${(testCase.toolsUsed ?? []).join(', ') || '(not supplied)'}`,
        ].join('\n\n'),
      },
    ],
  };
}
