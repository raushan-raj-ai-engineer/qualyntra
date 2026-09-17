/**
 * File: adapters/runners/playwright-test/src/index.ts
 * Purpose: Provides the Playwright Test runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:true,cancellation:true,sharding:true,retries:true,tags:true,junitOutput:true};
export const descriptor:AdapterDescriptor={id:'runner.playwright-test',kind:'runner',version:'1.0.0',displayName:'Playwright Test',description:'External-process integration for Playwright Test.',capabilities:["discovery", "cancellation", "sharding", "retries", "tags", "junit-output"],supportedLanguages:['javascript','typescript'],supportedTools:['playwright']};
export class PlaywrightTestAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command='npx'){super({id:descriptor.id,defaultCommand:command,baseArgs:["playwright", "test"],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

