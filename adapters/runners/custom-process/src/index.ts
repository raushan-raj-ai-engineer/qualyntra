/**
 * File: adapters/runners/custom-process/src/index.ts
 * Purpose: Provides the Custom Process Runner runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:false,cancellation:true,sharding:false,retries:false,tags:false,junitOutput:false};
export const descriptor:AdapterDescriptor={id:'runner.custom-process',kind:'runner',version:'1.0.0',displayName:'Custom Process Runner',description:'External-process integration for Custom Process Runner.',capabilities:["cancellation"]};
export class CustomProcessAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command=''){super({id:descriptor.id,defaultCommand:command,baseArgs:[],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

