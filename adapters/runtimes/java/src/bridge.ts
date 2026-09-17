/**
 * File: adapters/runtimes/java/src/bridge.ts
 * Purpose: Invokes the dependency-free Java SDK JSON bridge through the shared shell-free process boundary and normalizes responses for the TypeScript control plane.
 * Author: Raushan Raj
 */
import type { EvidenceRecord } from '../../../../packages/contracts/src/evidence';
import type { RuntimeIdentity } from '../../../../packages/contracts/src/execution';
import type { UniversalTestResult } from '../../../../packages/contracts/src/result';
import { probeProcess, type ProcessProbeOptions, type ProcessProbeResult } from '../../../../packages/runtime/src';

export interface JavaBridgeClientOptions {
  classpath: string;
  executable?: string;
  mainClass?: string;
  timeoutMs?: number;
  cwd?: string;
  environment?: Record<string, string | undefined>;
  probe?: (
    command: string,
    args?: string[],
    options?: ProcessProbeOptions,
  ) => Promise<ProcessProbeResult>;
}

interface JavaBridgeEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { type?: string; message?: string };
}

export class JavaBridgeClient {
  private readonly executable: string;
  private readonly mainClass: string;
  private readonly timeoutMs: number;
  private readonly probe: NonNullable<JavaBridgeClientOptions['probe']>;

  constructor(private readonly options: JavaBridgeClientOptions) {
    if (!options.classpath.trim()) throw new Error('Java bridge classpath is required.');
    this.executable = options.executable ?? process.env.QUALYNTRA_JAVA_EXECUTABLE ?? 'java';
    this.mainClass = options.mainClass ?? 'io.qualyntra.sdk.Bridge';
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.probe = options.probe ?? probeProcess;
  }

  async health(): Promise<Record<string, unknown>> {
    return await this.invoke<Record<string, unknown>>({ operation: 'health' });
  }

  async normalizeJUnit(
    xml: string,
    runId: string,
    runtime: RuntimeIdentity,
  ): Promise<UniversalTestResult[]> {
    const response = await this.invoke<{ results: UniversalTestResult[] }>({
      operation: 'results.junit.normalize',
      xml,
      runId,
      runtime,
    });
    return Array.isArray(response.results) ? response.results : [];
  }

  async normalizeTestNg(
    xml: string,
    runId: string,
    runtime: RuntimeIdentity,
  ): Promise<UniversalTestResult[]> {
    const response = await this.invoke<{ results: UniversalTestResult[] }>({
      operation: 'results.testng.normalize',
      xml,
      runId,
      runtime,
    });
    return Array.isArray(response.results) ? response.results : [];
  }

  async collectFileEvidence(input: {
    runId: string;
    path: string;
    kind?: string;
    contentType?: string;
  }): Promise<EvidenceRecord> {
    const response = await this.invoke<{ evidence: EvidenceRecord }>({
      operation: 'evidence.file',
      runId: input.runId,
      path: input.path,
      kind: input.kind ?? 'custom',
      contentType: input.contentType ?? 'application/octet-stream',
    });
    if (!response.evidence) throw new Error('Java bridge returned no evidence record.');
    return response.evidence;
  }

  private async invoke<T>(payload: Record<string, unknown>): Promise<T> {
    const result = await this.probe(
      this.executable,
      ['-cp', this.options.classpath, this.mainClass],
      {
        cwd: this.options.cwd,
        env: this.options.environment,
        timeoutMs: this.timeoutMs,
        input: JSON.stringify(payload),
      },
    );

    if (!result.available) throw new Error('Java bridge executable is unavailable.');
    if (result.timedOut) throw new Error('Java bridge request timed out.');

    let envelope: JavaBridgeEnvelope<T>;
    try {
      envelope = JSON.parse(result.stdout.trim()) as JavaBridgeEnvelope<T>;
    } catch {
      throw new Error('Java bridge returned malformed JSON.');
    }

    if (result.exitCode !== 0 || !envelope.ok) {
      const type = envelope.error?.type ?? 'JavaBridgeError';
      const message = envelope.error?.message ?? 'Java bridge request failed.';
      throw new Error(`${type}: ${message}`);
    }
    if (envelope.data === undefined) throw new Error('Java bridge returned no data.');
    return envelope.data;
  }
}
