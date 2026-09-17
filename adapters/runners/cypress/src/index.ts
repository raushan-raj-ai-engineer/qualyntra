/**
 * File: adapters/runners/cypress/src/index.ts
 * Purpose: Provides the Cypress runner adapter while keeping vendor dependencies outside the platform kernel.
 * Author: Raushan Raj
 */
import { ProcessRunnerAdapter } from '../../../../packages/execution/src/process-runner';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
const capabilities={discovery:false,cancellation:true,sharding:false,retries:false,tags:true,junitOutput:true};
export const descriptor:AdapterDescriptor={id:'runner.cypress',kind:'runner',version:'1.0.0',displayName:'Cypress',description:'External-process integration for Cypress.',capabilities:["cancellation", "tags", "junit-output"]};
export class CypressAdapter extends ProcessRunnerAdapter implements Adapter { readonly descriptor=descriptor; constructor(command='npx'){super({id:descriptor.id,defaultCommand:command,baseArgs:["cypress", "run"],capabilities});} async health():Promise<AdapterHealth>{return {status:'healthy',message:'Adapter contract loaded; runtime availability is checked at execution time.',checkedAt:new Date().toISOString()};} }

