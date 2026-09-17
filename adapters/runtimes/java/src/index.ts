/**
 * File: adapters/runtimes/java/src/index.ts
 * Purpose: Detects JVM/Javac availability, probes optional JUnit/TestNG classes from an explicit classpath, and exposes Java runtime health without coupling the platform kernel to Java test frameworks.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AdapterDescriptor, AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type {
  RuntimeAdapter,
  RuntimeCapabilitySet,
  RuntimeContext,
  RuntimeHealth,
  RuntimeInstanceIdentity,
  RuntimeLifecycleState,
} from '../../../../packages/contracts/src/runtime';
import {
  loadCompatibilityRegistry,
  probeProcess,
  resolveRuntimeCompatibility,
  type ProcessProbeResult,
} from '../../../../packages/runtime/src';

export interface JavaClassAvailability {
  junit: boolean;
  testng: boolean;
}

export interface JavaRuntimeSnapshot {
  executable: string;
  version?: string;
  vendor?: string;
  runtimeName?: string;
  vmName?: string;
  platform?: string;
  javacVersion?: string;
  classpathProvided: boolean;
  classes: JavaClassAvailability;
}

export interface JavaRuntimeAdapterOptions {
  executable?: string;
  compilerExecutable?: string;
  probe?: typeof probeProcess;
  classProbe?: (
    executable: string,
    classpath: string | undefined,
    context: RuntimeContext,
  ) => Promise<JavaClassAvailability>;
}

export const descriptor: AdapterDescriptor = {
  id: 'runtime.java',
  kind: 'runtime',
  version: '1.0.0',
  displayName: 'Java Runtime',
  description: 'JVM runtime and optional JUnit/TestNG classpath discovery adapter.',
  supportedLanguages: ['java'],
  supportedTools: ['java', 'javac', 'junit', 'testng'],
  capabilities: [
    'runtime-health',
    'compiler-discovery',
    'classpath-discovery',
    'junit',
    'testng',
  ],
};

const classProbeSource = `
public final class QualyntraClassProbe {
  public static void main(String[] args) {
    for (String name : args) {
      boolean available;
      try {
        Class.forName(name, false, ClassLoader.getSystemClassLoader());
        available = true;
      } catch (Throwable ignored) {
        available = false;
      }
      System.out.println(name + "=" + available);
    }
  }
}
`.trim();

function parseSettings(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([\w.]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (match?.[1] && match[2]) values[match[1]] = match[2];
  }
  return values;
}

function parseVersionLine(text: string): string | undefined {
  const quoted = /version\s+"([^"]+)"/i.exec(text)?.[1];
  if (quoted) return quoted;
  return /(?:javac|openjdk|java)\s+([\w.+-]+)/i.exec(text)?.[1];
}

function resolveClasspath(context: RuntimeContext): string | undefined {
  const metadataValue = context.metadata?.javaClasspath;
  if (Array.isArray(metadataValue)) {
    const parts = metadataValue.filter((item): item is string => typeof item === 'string' && item.length > 0);
    if (parts.length) return parts.join(path.delimiter);
  }
  if (typeof metadataValue === 'string' && metadataValue.trim()) return metadataValue;
  return context.environment?.QUALYNTRA_JAVA_CLASSPATH
    ?? process.env.QUALYNTRA_JAVA_CLASSPATH
    ?? context.environment?.CLASSPATH
    ?? process.env.CLASSPATH;
}

async function defaultClassProbe(
  executable: string,
  classpath: string | undefined,
  context: RuntimeContext,
): Promise<JavaClassAvailability> {
  if (!classpath) return { junit: false, testng: false };
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'qualyntra-java-probe-'));
  const sourcePath = path.join(directory, 'QualyntraClassProbe.java');
  try {
    await fs.writeFile(sourcePath, classProbeSource, 'utf8');
    const result = await probeProcess(
      executable,
      [
        '-cp',
        classpath,
        sourcePath,
        'org.junit.jupiter.api.Test',
        'org.testng.TestNG',
      ],
      {
        cwd: context.workingDirectory,
        env: context.environment,
        timeoutMs: 10_000,
      },
    );
    const output = result.stdout;
    return {
      junit: /org\.junit\.jupiter\.api\.Test=true/.test(output),
      testng: /org\.testng\.TestNG=true/.test(output),
    };
  } catch {
    return { junit: false, testng: false };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

export class JavaRuntimeAdapter implements RuntimeAdapter {
  readonly descriptor = descriptor;
  private state: RuntimeLifecycleState = 'created';
  private context: RuntimeContext = {};
  private readonly executable: string;
  private readonly compilerExecutable: string;
  private readonly probe: typeof probeProcess;
  private readonly classProbe: NonNullable<JavaRuntimeAdapterOptions['classProbe']>;

  constructor(options: JavaRuntimeAdapterOptions = {}) {
    this.executable = options.executable ?? process.env.QUALYNTRA_JAVA_EXECUTABLE ?? 'java';
    this.compilerExecutable = options.compilerExecutable ?? process.env.QUALYNTRA_JAVAC_EXECUTABLE ?? 'javac';
    this.probe = options.probe ?? probeProcess;
    this.classProbe = options.classProbe ?? defaultClassProbe;
  }

  lifecycle(): RuntimeLifecycleState {
    return this.state;
  }

  async initialize(context: RuntimeContext = {}): Promise<void> {
    this.state = 'initializing';
    this.context = context;
    const health = await this.runtimeHealth(context);
    this.state = health.status === 'unavailable' ? 'degraded' : 'ready';
  }

  async shutdown(): Promise<void> {
    this.state = 'stopping';
    this.context = {};
    this.state = 'stopped';
  }

  async snapshot(context: RuntimeContext = this.context): Promise<JavaRuntimeSnapshot | undefined> {
    const javaResult = await this.probe(this.executable, ['-XshowSettings:properties', '-version'], {
      cwd: context.workingDirectory,
      env: context.environment,
      timeoutMs: 10_000,
    });
    if (!javaResult.available || javaResult.exitCode !== 0) return undefined;

    const combined = `${javaResult.stdout}\n${javaResult.stderr}`;
    const settings = parseSettings(combined);
    const version = settings['java.version'] ?? parseVersionLine(combined);
    const javacResult = await this.probe(this.compilerExecutable, ['-version'], {
      cwd: context.workingDirectory,
      env: context.environment,
      timeoutMs: 10_000,
    });
    const javacCombined = `${javacResult.stdout}\n${javacResult.stderr}`;
    const classpath = resolveClasspath(context);
    const classes = await this.classProbe(this.executable, classpath, context);

    const osName = settings['os.name'];
    const osVersion = settings['os.version'];
    const osArch = settings['os.arch'];
    return {
      executable: this.executable,
      version,
      vendor: settings['java.vendor'],
      runtimeName: settings['java.runtime.name'],
      vmName: settings['java.vm.name'],
      platform: [osName, osVersion, osArch].filter(Boolean).join(' '),
      javacVersion: javacResult.available && javacResult.exitCode === 0
        ? parseVersionLine(javacCombined)
        : undefined,
      classpathProvided: Boolean(classpath),
      classes,
    };
  }

  async identity(context: RuntimeContext = this.context): Promise<RuntimeInstanceIdentity> {
    const snapshot = await this.snapshot(context);
    return this.identityFromSnapshot(snapshot, context);
  }

  async runtimeCapabilities(): Promise<RuntimeCapabilitySet> {
    const snapshot = await this.snapshot();
    return {
      processExecution: Boolean(snapshot),
      compiler: Boolean(snapshot?.javacVersion),
      junit: Boolean(snapshot?.classes.junit),
      testng: Boolean(snapshot?.classes.testng),
      classpathDiscovery: Boolean(snapshot?.classpathProvided),
      javaVersion: snapshot?.version ?? 'unknown',
    };
  }

  async runtimeHealth(context: RuntimeContext = this.context): Promise<RuntimeHealth> {
    const snapshot = await this.snapshot(context);
    const identity = this.identityFromSnapshot(snapshot, context);
    const registryRoot = context.metadata?.compatibilityRegistryRoot;
    const registry = loadCompatibilityRegistry(typeof registryRoot === 'string' ? registryRoot : process.cwd());
    const compatibility = resolveRuntimeCompatibility('java', snapshot?.version, registry);
    const components = [
      resolveRuntimeCompatibility('junit', snapshot?.classes.junit ? 'detected' : undefined, registry),
      resolveRuntimeCompatibility('testng', snapshot?.classes.testng ? 'detected' : undefined, registry),
    ];

    return {
      status: snapshot ? 'healthy' : 'unavailable',
      checkedAt: new Date().toISOString(),
      lifecycle: this.state,
      identity,
      compatibility,
      components,
      metadata: snapshot
        ? {
            vendor: snapshot.vendor,
            runtimeName: snapshot.runtimeName,
            vmName: snapshot.vmName,
            platform: snapshot.platform,
            javacVersion: snapshot.javacVersion,
            classpathProvided: snapshot.classpathProvided,
            classes: snapshot.classes,
          }
        : undefined,
      message: snapshot
        ? `Java ${snapshot.version ?? 'unknown'} detected; JUnit/TestNG availability is classpath-dependent.`
        : `Java executable '${this.executable}' is unavailable or did not return valid runtime metadata.`,
    };
  }

  async health(): Promise<AdapterHealth> {
    const health = await this.runtimeHealth();
    return {
      status: health.status,
      checkedAt: health.checkedAt,
      message: health.message,
    };
  }

  private identityFromSnapshot(
    snapshot: JavaRuntimeSnapshot | undefined,
    context: RuntimeContext,
  ): RuntimeInstanceIdentity {
    return {
      adapterId: descriptor.id,
      tool: 'java',
      detectedVersion: snapshot?.version,
      language: 'java',
      workingDirectory: context.workingDirectory ?? process.cwd(),
    };
  }
}

export type JavaProcessProbe = (
  command: string,
  args?: string[],
  options?: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs?: number },
) => Promise<ProcessProbeResult>;

export * from './bridge';
