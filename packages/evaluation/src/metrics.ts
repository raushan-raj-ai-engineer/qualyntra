/**
 * File: packages/evaluation/src/metrics.ts
 * Purpose: Provides dependency-free native metrics for output quality, RAG grounding, tool behavior, JSON validity, and custom business rules.
 * Author: Raushan Raj
 */
import type {
  EvaluationCase,
  EvaluationContext,
  EvaluationMetric,
  MetricResult,
} from '../../contracts/src/evaluation';

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();
const significantTokenPattern = /[a-z0-9]{4,}/g;

function significantTokens(value: string): Set<string> {
  return new Set(value.toLowerCase().match(significantTokenPattern) ?? []);
}

function setOverlapScore(left: Set<string>, right: Set<string>): number {
  const union = new Set([...left, ...right]);
  if (!union.size) {
    return 1;
  }
  let intersection = 0;
  for (const value of union) {
    if (left.has(value) && right.has(value)) {
      intersection += 1;
    }
  }
  return intersection / union.size;
}

export class ExactMatchMetric implements EvaluationMetric {
  readonly id = 'exact-match';
  readonly name = 'Exact Match';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const score =
      testCase.expectedOutput !== undefined &&
      normalize(testCase.actualOutput) === normalize(testCase.expectedOutput)
        ? 1
        : 0;

    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: score ? 'Output matches expected output.' : 'Output differs from expected output.',
    };
  }
}

export class ContainsExpectedMetric implements EvaluationMetric {
  readonly id = 'contains-expected';
  readonly name = 'Contains Expected';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const score =
      testCase.expectedOutput !== undefined &&
      normalize(testCase.actualOutput).includes(normalize(testCase.expectedOutput))
        ? 1
        : 0;

    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: score ? 'Expected content is present.' : 'Expected content is missing.',
    };
  }
}

export class TokenOverlapMetric implements EvaluationMetric {
  readonly id = 'token-overlap';
  readonly name = 'Token Overlap';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 0.6) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    if (testCase.expectedOutput === undefined) {
      return {
        metricId: this.id,
        score: 0,
        passed: false,
        reason: 'Expected output is required for token-overlap evaluation.',
      };
    }

    const score = setOverlapScore(
      significantTokens(testCase.actualOutput),
      significantTokens(testCase.expectedOutput),
    );

    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `Significant-token Jaccard overlap is ${score.toFixed(4)}.`,
    };
  }
}

export class ToolCorrectnessMetric implements EvaluationMetric {
  readonly id = 'tool-correctness';
  readonly name = 'Tool Correctness';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const expected = new Set(testCase.toolsExpected ?? []);
    const used = new Set(testCase.toolsUsed ?? []);
    const union = new Set([...expected, ...used]);
    let matches = 0;

    for (const tool of union) {
      if (expected.has(tool) === used.has(tool)) {
        matches += 1;
      }
    }

    const score = union.size ? matches / union.size : 1;
    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `Compared ${expected.size} expected tool(s) with ${used.size} used tool(s).`,
    };
  }
}

export class ToolPrecisionMetric implements EvaluationMetric {
  readonly id = 'tool-precision';
  readonly name = 'Tool Precision';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const expected = new Set(testCase.toolsExpected ?? []);
    const used = new Set(testCase.toolsUsed ?? []);
    let correct = 0;
    for (const tool of used) {
      if (expected.has(tool)) {
        correct += 1;
      }
    }
    const score = used.size ? correct / used.size : expected.size ? 0 : 1;
    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `${correct}/${used.size} used tool(s) were expected.`,
    };
  }
}

export class ToolRecallMetric implements EvaluationMetric {
  readonly id = 'tool-recall';
  readonly name = 'Tool Recall';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const expected = new Set(testCase.toolsExpected ?? []);
    const used = new Set(testCase.toolsUsed ?? []);
    let found = 0;
    for (const tool of expected) {
      if (used.has(tool)) {
        found += 1;
      }
    }
    const score = expected.size ? found / expected.size : used.size ? 0 : 1;
    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `${found}/${expected.size} expected tool(s) were used.`,
    };
  }
}

export class ToolSequenceMetric implements EvaluationMetric {
  readonly id = 'tool-sequence';
  readonly name = 'Tool Sequence';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const expected = testCase.toolsExpected ?? [];
    const used = testCase.toolsUsed ?? [];
    const longest = Math.max(expected.length, used.length);

    if (!longest) {
      return {
        metricId: this.id,
        score: 1,
        passed: true,
        reason: 'No tool sequence was expected or used.',
      };
    }

    let matchingPositions = 0;
    for (let index = 0; index < longest; index += 1) {
      if (expected[index] !== undefined && expected[index] === used[index]) {
        matchingPositions += 1;
      }
    }

    const score = matchingPositions / longest;
    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `${matchingPositions}/${longest} tool-call position(s) matched the expected sequence.`,
    };
  }
}

export class RetrievalCoverageMetric implements EvaluationMetric {
  readonly id = 'retrieval-coverage';
  readonly name = 'Retrieval Coverage';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 0.7) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const terms = significantTokens(testCase.expectedOutput ?? '');
    const corpus = normalize((testCase.retrievalContext ?? []).join(' '));
    let hit = 0;

    for (const term of terms) {
      if (corpus.includes(term)) {
        hit += 1;
      }
    }

    const score = terms.size ? hit / terms.size : 1;
    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `Retrieval context covered ${hit}/${terms.size} expected content term(s).`,
    };
  }
}

export class GroundednessHeuristicMetric implements EvaluationMetric {
  readonly id = 'groundedness-heuristic';
  readonly name = 'Groundedness Heuristic';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 0.7) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    const outputTerms = significantTokens(testCase.actualOutput);
    const source = [...(testCase.context ?? []), ...(testCase.retrievalContext ?? [])].join(' ');
    const sourceTerms = significantTokens(source);

    if (!outputTerms.size) {
      return {
        metricId: this.id,
        score: 1,
        passed: true,
        reason: 'Actual output contains no significant tokens to ground.',
      };
    }

    let supported = 0;
    for (const term of outputTerms) {
      if (sourceTerms.has(term)) {
        supported += 1;
      }
    }

    const score = supported / outputTerms.size;
    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `${supported}/${outputTerms.size} significant output term(s) appeared in supplied context.`,
      details: {
        heuristic: true,
        note: 'This lexical heuristic is not a substitute for semantic or factual faithfulness evaluation.',
      },
    };
  }
}

export class JsonValidityMetric implements EvaluationMetric {
  readonly id = 'json-validity';
  readonly name = 'JSON Validity';
  readonly type = 'deterministic' as const;

  constructor(public readonly threshold = 1) {}

  async evaluate(testCase: EvaluationCase): Promise<MetricResult> {
    try {
      JSON.parse(testCase.actualOutput);
      return {
        metricId: this.id,
        score: 1,
        passed: 1 >= this.threshold,
        reason: 'Actual output is valid JSON.',
      };
    } catch {
      return {
        metricId: this.id,
        score: 0,
        passed: false,
        reason: 'Actual output is not valid JSON.',
      };
    }
  }
}

export class CustomMetric implements EvaluationMetric {
  readonly type = 'custom' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly threshold: number,
    private readonly evaluator: (
      testCase: EvaluationCase,
      context: EvaluationContext,
    ) =>
      | Promise<{ score: number; reason: string; details?: Record<string, unknown> }>
      | { score: number; reason: string; details?: Record<string, unknown> },
  ) {}

  async evaluate(testCase: EvaluationCase, context: EvaluationContext): Promise<MetricResult> {
    const result = await this.evaluator(testCase, context);
    const score = Math.max(0, Math.min(1, result.score));

    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: result.reason,
      details: result.details,
    };
  }
}
