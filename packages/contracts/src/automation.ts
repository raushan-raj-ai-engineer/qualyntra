/**
 * File: packages/contracts/src/automation.ts
 * Purpose: Defines generic automation-driver capabilities without importing a browser/mobile vendor SDK.
 * Author: Raushan Raj
 */
export interface AutomationCapabilities { web:boolean; mobile:boolean; api:boolean; tracing:boolean; screenshots:boolean; networkInterception:boolean; visualComparison:boolean; accessibility:boolean; storageState:boolean; }
export interface LocatorDescriptor { strategy:'role'|'label'|'text'|'testId'|'css'|'xpath'|'accessibilityId'|'custom'; value:string; options?:Record<string,unknown>; }
export interface AutomationAction { type:'navigate'|'click'|'fill'|'select'|'check'|'tap'|'swipe'|'custom'; locator?:LocatorDescriptor; value?:unknown; url?:string; }
export interface AutomationAdapter { readonly id:string; capabilities():AutomationCapabilities; describe():Record<string,unknown>; }

