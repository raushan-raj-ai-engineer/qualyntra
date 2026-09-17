/**
 * File: adapters/results/cucumber-json/src/index.ts
 * Purpose: Normalizes Cucumber JSON formatter output into Qualyntra universal scenario results.
 * Author: Raushan Raj
 */
import type { ResultAdapter,UniversalTestResult,TestStatus,StepResult } from '../../../../packages/contracts/src/result';
import type { RuntimeIdentity } from '../../../../packages/contracts/src/execution';
import { createId } from '../../../../packages/core/src/ids';
import { safeJson } from '../../shared/src';

type AnyRecord=Record<string,any>;
function stepStatus(value:string|undefined):TestStatus{if(value==='passed')return'passed';if(value==='skipped'||value==='pending')return'skipped';if(value==='failed')return'failed';return'error';}
function durationMs(value:any):number{const n=Number(value);if(!Number.isFinite(n)||n<0)return 0;return n>1_000_000?Math.round(n/1_000_000):Math.round(n);}
export class CucumberJsonResultAdapter implements ResultAdapter{
  readonly id='result.cucumber-json';
  supports(path:string,contentType?:string):boolean{return /cucumber.*\.json$/i.test(path)||contentType==='application/vnd.cucumber+json';}
  async parse(input:{path?:string;content?:string;runId:string;runtime:RuntimeIdentity}):Promise<UniversalTestResult[]>{if(!input.content)throw new Error('Cucumber parser requires JSON content.');const parsed=safeJson(input.content);if(!Array.isArray(parsed))throw new Error('Cucumber JSON artifact must contain an array of features.');const results:UniversalTestResult[]=[];for(const feature of parsed as AnyRecord[]){for(const scenario of (Array.isArray(feature.elements)?feature.elements:[]) as AnyRecord[]){if(scenario.type&&scenario.type!=='scenario'&&scenario.type!=='scenario_outline')continue;const steps:StepResult[]=(Array.isArray(scenario.steps)?scenario.steps:[]).map((step:AnyRecord)=>({name:String(step.name??step.keyword??'step'),status:stepStatus(step.result?.status),durationMs:durationMs(step.result?.duration),error:step.result?.error_message?{message:String(step.result.error_message),category:'assertion'}:undefined}));const failed=steps.find(step=>step.status==='failed');const errored=steps.find(step=>step.status==='error');const skipped=steps.length>0&&steps.every(step=>step.status==='skipped');const status:TestStatus=failed?'failed':errored?'error':skipped?'skipped':'passed';results.push({id:createId('test'),runId:input.runId,suite:String(feature.name??feature.uri??''),name:String(scenario.name??'unnamed'),status,durationMs:steps.reduce((sum,step)=>sum+step.durationMs,0),runtime:input.runtime,steps,failure:failed?.error??errored?.error,tags:(Array.isArray(scenario.tags)?scenario.tags:[]).map((tag:AnyRecord)=>String(tag.name??'')).filter(Boolean),metadata:{featureId:feature.id,scenarioId:scenario.id,uri:feature.uri,line:scenario.line}});}}return results;}
}
