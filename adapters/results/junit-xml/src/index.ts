/**
 * File: adapters/results/junit-xml/src/index.ts
 * Purpose: Normalizes common JUnit XML output from Pytest, JUnit/TestNG, Cypress, WebdriverIO, and other runners.
 * Author: Raushan Raj
 */
import type { ResultAdapter,UniversalTestResult } from '../../../../packages/contracts/src/result'; import type { RuntimeIdentity } from '../../../../packages/contracts/src/execution'; import { createId } from '../../../../packages/core/src/ids';
function attrs(fragment:string):Record<string,string>{const out:Record<string,string>={}; const re=/([\w.-]+)="([^"]*)"/g; let m:RegExpExecArray|null; while((m=re.exec(fragment))) out[m[1]!]=m[2]!; return out;}
function decode(v:string):string{return v.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
export class JUnitXmlResultAdapter implements ResultAdapter { readonly id='result.junit-xml'; supports(path:string,contentType?:string):boolean{return /\.xml$/i.test(path)||contentType==='application/xml'||contentType==='text/xml';} async parse(input:{path?:string;content?:string;runId:string;runtime:RuntimeIdentity}):Promise<UniversalTestResult[]>{ if(!input.content)throw new Error('JUnit parser requires XML content.'); const results:UniversalTestResult[]=[]; const re=/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g; let m:RegExpExecArray|null; while((m=re.exec(input.content))){const a=attrs(m[1]??''); const body=m[2]??''; const failed=/<failure\b([^>]*)>([\s\S]*?)<\/failure>|<error\b([^>]*)>([\s\S]*?)<\/error>/.exec(body); const skipped=/<skipped\b/.test(body); const status=failed?'failed':skipped?'skipped':'passed'; results.push({id:createId('test'),runId:input.runId,suite:decode(a.classname??''),name:decode(a.name??'unnamed'),status,durationMs:Math.round(Number(a.time??'0')*1000),runtime:input.runtime,failure:failed?{message:decode((failed[2]??failed[4]??'failure').trim()),category:failed[3]!==undefined?'error':'assertion'}:undefined}); } return results; } }

