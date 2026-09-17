/**
 * File: adapters/runners/junit-console/src/index.ts
 * Purpose: Provides the JUnit Platform Console runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:true,cancellation:true,sharding:false,retries:false,tags:true,junitOutput:true};
export const descriptor:AdapterDescriptor={id:'runner.junit-console',kind:'runner',version:'1.0.0',displayName:'JUnit Platform Console',description:'External-process integration for JUnit Platform Console.',capabilities:["discovery", "cancellation", "tags", "junit-output"]};
export class JunitConsoleAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command='java'){super({id:descriptor.id,defaultCommand:command,baseArgs:[],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

