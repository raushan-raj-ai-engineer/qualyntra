/**
 * File: adapters/runners/pytest/src/index.ts
 * Purpose: Provides the Pytest runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:true,cancellation:true,sharding:true,retries:true,tags:true,junitOutput:true};
export const descriptor:AdapterDescriptor={id:'runner.pytest',kind:'runner',version:'1.0.0',displayName:'Pytest',description:'External-process integration for Pytest.',capabilities:["discovery", "cancellation", "sharding", "retries", "tags", "junit-output"]};
export class PytestAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command='python3'){super({id:descriptor.id,defaultCommand:command,baseArgs:["-m", "pytest"],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

