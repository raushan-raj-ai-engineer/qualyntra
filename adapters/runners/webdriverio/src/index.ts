/**
 * File: adapters/runners/webdriverio/src/index.ts
 * Purpose: Provides the WebdriverIO runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:false,cancellation:true,sharding:true,retries:false,tags:false,junitOutput:true};
export const descriptor:AdapterDescriptor={id:'runner.webdriverio',kind:'runner',version:'1.0.0',displayName:'WebdriverIO',description:'External-process integration for WebdriverIO.',capabilities:["cancellation", "sharding", "junit-output"]};
export class WebdriverioAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command='npx'){super({id:descriptor.id,defaultCommand:command,baseArgs:["wdio", "run"],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

