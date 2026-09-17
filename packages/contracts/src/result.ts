/**
 * File: packages/contracts/src/result.ts
 * Purpose: Defines the universal normalized test result model independent of runner and language.
 * Author: Raushan Raj
 */
import type { RuntimeIdentity } from './execution';
export type TestStatus='passed'|'failed'|'skipped'|'error';
export interface FailureDetail { category?:string; message:string; stack?:string; fingerprint?:string; }
export interface StepResult { name:string; status:TestStatus; durationMs:number; error?:FailureDetail; }
export interface AttachmentRef { name:string; contentType:string; path?:string; uri?:string; sha256?:string; }
export interface UniversalTestResult { id:string; runId:string; suite?:string; name:string; status:TestStatus; durationMs:number; runtime:RuntimeIdentity; startedAt?:string; finishedAt?:string; steps?:StepResult[]; failure?:FailureDetail; attachments?:AttachmentRef[]; tags?:string[]; metadata?:Record<string,unknown>; }
export interface ResultAdapter { readonly id:string; supports(path:string,contentType?:string):boolean; parse(input:{path?:string;content?:string;runId:string;runtime:RuntimeIdentity}):Promise<UniversalTestResult[]>; }

