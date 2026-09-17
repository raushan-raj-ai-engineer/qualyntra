/**
 * File: packages/contracts/src/execution.ts
 * Purpose: Defines runner-neutral execution requests, outcomes, and runtime identity.
 * Author: Raushan Raj
 */
export type ExecutionStatus = 'queued'|'running'|'passed'|'failed'|'skipped'|'cancelled'|'error';
export interface RuntimeIdentity { language:string; runner:string; runnerVersion?:string; engine?:string; engineVersion?:string; sdkVersion?:string; }
export interface ExecutionRequest { runId:string; projectId:string; command?:string; args?:string[]; cwd?:string; env?:Record<string,string>; selection?:{tests?:string[]; tags?:string[]}; runtime:RuntimeIdentity; metadata?:Record<string,string>; timeoutMs?:number; }
export interface ExecutionSummary { total:number; passed:number; failed:number; skipped:number; durationMs:number; }
export interface ExecutionResult { runId:string; status:ExecutionStatus; exitCode?:number; startedAt:string; finishedAt:string; summary?:ExecutionSummary; stdout?:string; stderr?:string; resultFiles?:string[]; metadata?:Record<string,unknown>; }
export interface RunnerCapabilities { discovery:boolean; cancellation:boolean; sharding:boolean; retries:boolean; tags:boolean; junitOutput:boolean; }
export interface RunnerAdapter { readonly id:string; capabilities():RunnerCapabilities; discover?(request:ExecutionRequest):Promise<string[]>; execute(request:ExecutionRequest):Promise<ExecutionResult>; cancel?(runId:string):Promise<void>; }

