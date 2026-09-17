/**
 * File: packages/runtime/src/process-probe.ts
 * Purpose: Provides a vendor-neutral, shell-free process probe for runtime discovery, health checks, and lightweight metadata inspection.
 * Author: Raushan Raj
 */
import { spawn } from 'node:child_process';

export interface ProcessProbeOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  input?: string;
}

export interface ProcessProbeResult {
  available: boolean;
  exitCode?: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export async function probeProcess(
  command: string,
  args: string[] = [],
  options: ProcessProbeOptions = {},
): Promise<ProcessProbeResult> {
  const started = Date.now();

  return await new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      shell: false,
    });

    if (options.input !== undefined) child.stdin?.end(options.input);

    const timer = options.timeoutMs
      ? setTimeout(() => {
          if (settled) return;
          timedOut = true;
          child.kill('SIGTERM');
        }, options.timeoutMs)
      : undefined;

    child.stdout?.on('data', (chunk: unknown) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk: unknown) => {
      stderr += String(chunk);
    });

    child.on('error', (error: { message?: string }) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        available: false,
        stdout,
        stderr: `${stderr}${error?.message ?? 'process probe failed'}`,
        durationMs: Date.now() - started,
        timedOut,
      });
    });

    child.on('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        available: true,
        exitCode: typeof code === 'number' ? code : undefined,
        stdout,
        stderr,
        durationMs: Date.now() - started,
        timedOut,
      });
    });
  });
}
