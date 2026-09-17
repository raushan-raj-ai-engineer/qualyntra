/**
 * File: adapters/runners/testng/src/index.ts
 * Purpose: Provides the TestNG runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:false,cancellation:true,sharding:false,retries:false,tags:true,junitOutput:true};
export const descriptor:AdapterDescriptor={id:'runner.testng',kind:'runner',version:'1.0.0',displayName:'TestNG',description:'External-process integration for TestNG.',capabilities:["cancellation", "tags", "junit-output"],supportedLanguages:['java'],supportedTools:['testng']};
export class TestngAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command='java'){super({id:descriptor.id,defaultCommand:command,baseArgs:[],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

