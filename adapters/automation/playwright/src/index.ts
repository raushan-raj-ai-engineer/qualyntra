/**
 * File: adapters/automation/playwright/src/index.ts
 * Purpose: Declares Playwright capabilities behind the vendor-neutral AutomationAdapter contract.
 * Author: Raushan Raj
 */
import type { AutomationAdapter,AutomationCapabilities } from '../../../../packages/contracts/src/automation'; import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
export const descriptor:AdapterDescriptor={id:'automation.playwright',kind:'automation',version:'1.0.0',displayName:'Playwright',description:'Capability descriptor for Playwright.',supportedLanguages:["typescript", "javascript", "python", "java", "dotnet"],supportedTools:['playwright'],capabilities:["web", "api", "tracing", "screenshots", "network-interception", "visual", "accessibility", "storage-state"]};
export class PlaywrightAutomationAdapter implements AutomationAdapter,Adapter { readonly id=descriptor.id; readonly descriptor=descriptor; capabilities():AutomationCapabilities{return {web:true,mobile:false,api:true,tracing:true,screenshots:true,networkInterception:true,visualComparison:true,accessibility:true,storageState:true};} describe():Record<string,unknown>{return {...descriptor};} async health():Promise<AdapterHealth>{return {status:'healthy',checkedAt:new Date().toISOString(),message:'Descriptor loaded; concrete SDK is supplied by the execution project.'};} }

