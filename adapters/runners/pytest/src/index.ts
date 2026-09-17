/**
 * File: adapters/runners/pytest/src/index.ts
 * Purpose: Provides Pytest execution, discovery, health probing, and optional JUnit-result emission behind runner-neutral contracts.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import { probeProcess, type ProcessProbeResult } from '../../../../packages/runtime/src/process-probe';
import type { Adapter, AdapterDescriptor, AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { ExecutionRequest, ExecutionResult } from '../../../../packages/contracts/src/execution';

const capabilities = {
  discovery: true,
  cancellation: false,
  sharding: true,
  retries: true,
  tags: true,
  junitOutput: true,
};

export const descriptor: AdapterDescriptor = {
  id: 'runner.pytest',
  kind: 'runner',
  version: '1.0.0',
  displayName: 'Pytest',
  description: 'External-process Pytest integration with discovery and optional JUnit output.',
  supportedLanguages: ['python'],
  supportedTools: ['pytest'],
  capabilities: ['discovery', 'sharding', 'retries', 'tags', 'junit-output', 'health-probe'],
};

export class PytestAdapter extends ProcessRunnerAdapter implements Adapter {
  readonly descriptor = descriptor;

  constructor(
    private readonly pythonCommand = process.env.QUALYNTRA_PYTHON_EXECUTABLE ?? 'python3',
    private readonly processProbe: (command: string, args?: string[], options?: Record<string, unknown>) => Promise<ProcessProbeResult> = probeProcess,
  ) {
    super({
      id: descriptor.id,
      defaultCommand: pythonCommand,
      baseArgs: ['-m', 'pytest'],
      capabilities,
    });
  }

  async health(): Promise<AdapterHealth> {
    const probe = await this.processProbe(
      this.pythonCommand,
      ['-c', "from importlib.metadata import version; print(version('pytest'))"],
      { timeoutMs: 10_000 },
    );
    const available = probe.available && probe.exitCode === 0;
    return {
      status: available ? 'healthy' : 'unavailable',
      checkedAt: new Date().toISOString(),
      message: available
        ? `Pytest ${probe.stdout.trim()} detected.`
        : 'Pytest is unavailable in the configured Python runtime.',
    };
  }

  async discover(request: ExecutionRequest): Promise<string[]> {
    const args = ['-m', 'pytest', '--collect-only', '-q', ...(request.args ?? [])];
    const probe = await this.processProbe(this.pythonCommand, args, {
      cwd: request.cwd,
      env: request.env,
      timeoutMs: request.timeoutMs ?? 30_000,
    });
    if (!probe.available || (probe.exitCode !== 0 && probe.exitCode !== 5)) {
      throw new Error(`Pytest discovery failed: ${probe.stderr.trim() || `exit ${probe.exitCode ?? 'unknown'}`}`);
    }
    return probe.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes('::'));
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const args = [...(request.args ?? [])];
    const junitOutput = request.metadata?.junitOutputPath;
    if (
      typeof junitOutput === 'string' &&
      junitOutput.length > 0 &&
      !args.some((arg) => arg.startsWith('--junitxml='))
    ) {
      args.push(`--junitxml=${junitOutput}`);
    }
    const result = await super.execute({ ...request, args });
    if (typeof junitOutput === 'string' && junitOutput.length > 0) {
      result.resultFiles = [junitOutput];
    }
    return result;
  }
}
