/**
 * File: packages/runtime/src/compatibility.ts
 * Purpose: Resolves detected tool versions against brand-neutral compatibility registry data without importing vendor SDKs.
 * Author: Raushan Raj
 */
import type {
  CompatibilityRegistry,
  RuntimeCompatibility,
} from '../../contracts/src/runtime';

export function resolveRuntimeCompatibility(
  tool: string,
  detectedVersion: string | undefined,
  registry: CompatibilityRegistry,
): RuntimeCompatibility {
  const policy = registry.tools[tool];

  if (!policy) {
    return {
      tool,
      detectedVersion,
      status: 'unknown',
      reason: `No compatibility policy is registered for ${tool}.`,
    };
  }

  if (!detectedVersion) {
    return {
      tool,
      status: 'unknown',
      policy: policy.policy,
      referenceBaseline: policy.referenceBaseline,
      reason: `${tool} is not currently detectable in the selected runtime workspace.`,
    };
  }

  if (policy.certified.includes(detectedVersion)) {
    return {
      tool,
      detectedVersion,
      status: 'certified',
      policy: policy.policy,
      referenceBaseline: policy.referenceBaseline,
      reason: `${tool} ${detectedVersion} is certified for this Qualyntra release.`,
    };
  }

  if (policy.candidate === detectedVersion) {
    return {
      tool,
      detectedVersion,
      status: 'candidate',
      policy: policy.policy,
      referenceBaseline: policy.referenceBaseline,
      reason: `${tool} ${detectedVersion} is under compatibility qualification.`,
    };
  }

  if (policy.referenceBaseline === detectedVersion) {
    return {
      tool,
      detectedVersion,
      status: 'reference',
      policy: policy.policy,
      referenceBaseline: policy.referenceBaseline,
      reason: `${tool} ${detectedVersion} is the reference baseline but has not been promoted to certified status in this registry.`,
    };
  }

  return {
    tool,
    detectedVersion,
    status: 'uncertified',
    policy: policy.policy,
    referenceBaseline: policy.referenceBaseline,
    reason: `${tool} ${detectedVersion} has not been qualified for this Qualyntra release.`,
  };
}
