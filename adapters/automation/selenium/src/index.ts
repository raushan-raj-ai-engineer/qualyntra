/**
 * File: adapters/automation/selenium/src/index.ts
 * Purpose: Declares Selenium capabilities behind the vendor-neutral AutomationAdapter contract.
 * Author: Raushan Raj
 */
import type { AutomationAdapter,AutomationCapabilities } from '../../../../packages/contracts/src/automation'; import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
export const descriptor:AdapterDescriptor={id:'automation.selenium',kind:'automation',version:'1.0.0',displayName:'Selenium',description:'Capability descriptor for Selenium.',supportedLanguages:["java", "python", "dotnet", "javascript"],supportedTools:['selenium'],capabilities:["web", "screenshots", "webdriver", "grid", "bidi"]};
export class SeleniumAutomationAdapter implements AutomationAdapter,Adapter { readonly id=descriptor.id; readonly descriptor=descriptor; capabilities():AutomationCapabilities{return {web:true,mobile:false,api:false,tracing:false,screenshots:true,networkInterception:false,visualComparison:false,accessibility:false,storageState:false};} describe():Record<string,unknown>{return {...descriptor};} async health():Promise<AdapterHealth>{return {status:'healthy',checkedAt:new Date().toISOString(),message:'Descriptor loaded; concrete SDK is supplied by the execution project.'};} }

