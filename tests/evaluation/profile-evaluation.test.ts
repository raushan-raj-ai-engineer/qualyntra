/**
 * File: tests/evaluation/profile-evaluation.test.ts
 * Purpose: Verifies reusable evaluation profiles combine datasets, metrics, summaries, and regression gates as one product-level evaluation operation.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EvaluationEngine } from '../../packages/evaluation/src/engine';
import { ExactMatchMetric, JsonValidityMetric } from '../../packages/evaluation/src/metrics';

test('evaluation profile returns dataset identity, summary, and gate decision', async () => {
  const engine = new EvaluationEngine();
  const result = await engine.evaluateProfile(
    {
      id: 'structured-output-regression',
      version: '2026-09-17',
      cases: [
        {
          id: 'case-1',
          kind: 'text',
          input: 'Return JSON',
          actualOutput: '{"ok":true}',
          expectedOutput: '{"ok":true}',
        },
      ],
    },
    {
      id: 'structured-output-profile',
      metrics: [new ExactMatchMetric(), new JsonValidityMetric()],
      gate: {
        id: 'structured-output-gate',
        minPassRate: 1,
        requiredMetrics: {
          'exact-match': 1,
          'json-validity': 1,
        },
      },
    },
  );

  assert.equal(result.profileId, 'structured-output-profile');
  assert.equal(result.datasetId, 'structured-output-regression');
  assert.equal(result.summary.passRate, 1);
  assert.equal(result.gate?.passed, true);
});
