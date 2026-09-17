/**
 * File: adapters/results/allure-json/src/index.ts
 * Purpose: Normalizes Allure test result JSON objects into Qualyntra universal results without requiring Allure runtime libraries.
 * Author: Raushan Raj
 */
import type { ResultAdapter,UniversalTestResult,TestStatus,AttachmentRef,StepResult } from '../../../../packages/contracts/src/result';
import type { RuntimeIdentity } from '../../../../packages/contracts/src/execution';
import { createId } from '../../../../packages/core/src/ids';
import { safeJson } from '../../shared/src';

type AnyRecord=Record<string,any>;
function mapStatus(value:string|undefined):TestStatus{if(value==='passed')return'passed';if(value==='skipped')return'skipped';if(value==='failed')return'failed';return'error';}
function labels(input:AnyRecord):AnyRecord[]{return Array.isArray(input.labels)?input.labels:[];}
function label(input:AnyRecord,name:string):string|undefined{return labels(input).find(item=>item?.name===name)?.value;}
function mapAttachments(items:any):AttachmentRef[]{if(!Array.isArray(items))return[];return items.filter(Boolean).map((item:AnyRecord)=>({name:String(item.name??item.source??'attachment'),contentType:String(item.type??'application/octet-stream'),path:item.source?String(item.source):undefined}));}
function mapSteps(items:any):StepResult[]{if(!Array.isArray(items))return[];return items.map((item:AnyRecord)=>({name:String(item.name??'step'),status:mapStatus(item.status),durationMs:Number.isFinite(item.stop)&&Number.isFinite(item.start)?Math.max(0,Number(item.stop)-Number(item.start)):0,error:item.statusDetails?.message?{message:String(item.statusDetails.message),stack:item.statusDetails.trace?String(item.statusDetails.trace):undefined}:undefined}));}
export class AllureJsonResultAdapter implements ResultAdapter{
  readonly id='result.allure-json';
  supports(path:string,contentType?:string):boolean{return /(?:^|\/)[^/]+-result\.json$/i.test(path)||contentType==='application/vnd.allure.result+json';}
  async parse(input:{path?:string;content?:string;runId:string;runtime:RuntimeIdentity}):Promise<UniversalTestResult[]>{if(!input.content)throw new Error('Allure parser requires JSON content.');const parsed=safeJson(input.content);const records=(Array.isArray(parsed)?parsed:[parsed]).filter(item=>item&&typeof item==='object') as AnyRecord[];return records.map(record=>{const status=mapStatus(record.status);const tags=labels(record).filter(item=>item?.name==='tag').map(item=>String(item.value));return{id:record.uuid?String(record.uuid):createId('test'),runId:input.runId,suite:label(record,'suite')??label(record,'parentSuite')??undefined,name:String(record.name??record.fullName??'unnamed'),status,durationMs:Number.isFinite(record.stop)&&Number.isFinite(record.start)?Math.max(0,Number(record.stop)-Number(record.start)):0,runtime:input.runtime,startedAt:Number.isFinite(record.start)?new Date(Number(record.start)).toISOString():undefined,finishedAt:Number.isFinite(record.stop)?new Date(Number(record.stop)).toISOString():undefined,steps:mapSteps(record.steps),failure:status==='failed'||status==='error'?{category:'assertion',message:String(record.statusDetails?.message??record.statusDetails?.trace??`Allure status: ${record.status??'unknown'}`),stack:record.statusDetails?.trace?String(record.statusDetails.trace):undefined}:undefined,attachments:mapAttachments(record.attachments),tags,metadata:{historyId:record.historyId,testCaseId:record.testCaseId,fullName:record.fullName}} satisfies UniversalTestResult;});}
}
