/**
 * File: adapters/automation/appium/src/index.ts
 * Purpose: Declares Appium capabilities behind the vendor-neutral AutomationAdapter contract.
 * Author: Raushan Raj
 */
import type { AutomationAdapter,AutomationCapabilities } from '../../../../packages/contracts/src/automation'; import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
export const descriptor:AdapterDescriptor={id:'automation.appium',kind:'automation',version:'1.0.0',displayName:'Appium',description:'Capability descriptor for Appium.',supportedLanguages:["java", "python", "dotnet", "javascript"],supportedTools:['appium'],capabilities:["mobile", "screenshots", "webdriver", "device-cloud"]};
export class AppiumAutomationAdapter implements AutomationAdapter,Adapter { readonly id=descriptor.id; readonly descriptor=descriptor; capabilities():AutomationCapabilities{return {web:false,mobile:true,api:false,tracing:false,screenshots:true,networkInterception:false,visualComparison:false,accessibility:false,storageState:false};} describe():Record<string,unknown>{return {...descriptor};} async health():Promise<AdapterHealth>{return {status:'healthy',checkedAt:new Date().toISOString(),message:'Descriptor loaded; concrete SDK is supplied by the execution project.'};} }

