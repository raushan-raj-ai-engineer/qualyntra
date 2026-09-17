/**
 * File: packages/execution/src/orchestrator.ts
 * Purpose: Coordinates runner execution and publishes normalized lifecycle events.
 * Author: Raushan Raj
 */
import type { RunnerAdapter,ExecutionRequest,ExecutionResult } from '../../contracts/src/execution'; import type { EventSink } from '../../contracts/src/events'; import { createId } from '../../core/src/ids';
export class ExecutionOrchestrator { constructor(private readonly events:EventSink){} async run(adapter:RunnerAdapter,request:ExecutionRequest):Promise<ExecutionResult>{ await this.events.publish({id:createId('evt'),type:'execution.started',timestamp:new Date().toISOString(),correlationId:request.runId,payload:{adapter:adapter.id,projectId:request.projectId,runtime:request.runtime}}); const result=await adapter.execute(request); await this.events.publish({id:createId('evt'),type:'execution.completed',timestamp:new Date().toISOString(),correlationId:request.runId,payload:{adapter:adapter.id,status:result.status,exitCode:result.exitCode}}); return result; } }

