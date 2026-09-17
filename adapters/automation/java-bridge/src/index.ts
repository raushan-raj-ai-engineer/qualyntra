/**
 * File: adapters/automation/java-bridge/src/index.ts
 * Purpose: Executes Java Playwright/Selenium automation plans through the Qualyntra JSON-over-stdio Java bridge without importing vendor Java libraries into Node.
 * Author: Raushan Raj
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { AutomationCapabilities,AutomationExecutionOutcome,AutomationPlan,ExecutableAutomationAdapter } from '../../../../packages/contracts/src/automation';

export interface JavaBridgeOptions {
  javaCommand?:string;
  classpath?:string|string[];
  mainClass?:string;
  cwd?:string;
  env?:Record<string,string|undefined>;
  timeoutMs?:number;
}
export interface JavaBridgeResponse { ok:boolean; data?:unknown; error?:{type?:string;message?:string}; }
export type JavaBridgeInvoker=(payload:Record<string,unknown>,options:JavaBridgeOptions)=>Promise<JavaBridgeResponse>;

export const descriptor:AdapterDescriptor={
  id:'automation.java-bridge',kind:'automation',version:'1.0.0',displayName:'Java Automation Bridge',
  description:'JSON-over-stdio automation bridge for project-owned Playwright Java and Selenium Java runtimes.',
  supportedLanguages:['java'],supportedTools:['playwright','selenium'],
  capabilities:['web','screenshots','tracing','remote-webdriver','evidence','normalized-results'],
};

function resolveClasspath(options:JavaBridgeOptions):string|undefined{
  const configured=options.classpath??process.env.QUALYNTRA_JAVA_BRIDGE_CLASSPATH;
  if(Array.isArray(configured))return configured.filter(Boolean).join(path.delimiter)||undefined;
  return configured?.trim()||undefined;
}

export async function invokeJavaBridge(payload:Record<string,unknown>,options:JavaBridgeOptions={}):Promise<JavaBridgeResponse>{
  const javaCommand=options.javaCommand??process.env.QUALYNTRA_JAVA_EXECUTABLE??'java';
  const classpath=resolveClasspath(options);
  if(!classpath)throw new Error('Java automation bridge requires classpath or QUALYNTRA_JAVA_BRIDGE_CLASSPATH.');
  const timeoutMs=options.timeoutMs??120_000;
  const args=['-cp',classpath,options.mainClass??'io.qualyntra.sdk.Bridge'];
  return await new Promise((resolve,reject)=>{
    let stdout='';let stderr='';let settled=false;
    const child=spawn(javaCommand,args,{cwd:options.cwd??process.cwd(),env:{...process.env,...options.env},shell:false,stdio:['pipe','pipe','pipe']});
    const timer=setTimeout(()=>{if(settled)return;settled=true;child.kill('SIGTERM');reject(new Error(`Java automation bridge timed out after ${timeoutMs} ms.`));},timeoutMs);
    child.stdout?.on('data',(chunk:unknown)=>stdout+=String(chunk));
    child.stderr?.on('data',(chunk:unknown)=>stderr+=String(chunk));
    child.on('error',(error:Error)=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);});
    child.on('close',(code:number|null)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      let response:JavaBridgeResponse;
      try{response=JSON.parse(stdout.trim()) as JavaBridgeResponse;}
      catch{reject(new Error(`Java automation bridge returned invalid JSON${stderr?`: ${stderr.trim()}`:''}.`));return;}
      if(code!==0&&!response.error){reject(new Error(`Java automation bridge exited with ${code??'unknown'}${stderr?`: ${stderr.trim()}`:''}.`));return;}
      resolve(response);
    });
    child.stdin?.end(JSON.stringify(payload));
  });
}

export class JavaAutomationBridgeAdapter implements ExecutableAutomationAdapter,Adapter {
  readonly id=descriptor.id;readonly descriptor=descriptor;
  constructor(private readonly options:JavaBridgeOptions={},private readonly invoker:JavaBridgeInvoker=invokeJavaBridge){}
  capabilities():AutomationCapabilities{return {web:true,mobile:false,api:false,tracing:true,screenshots:true,networkInterception:false,visualComparison:false,accessibility:false,storageState:false};}
  describe():Record<string,unknown>{return {...descriptor};}
  async health():Promise<AdapterHealth>{
    try{
      const response=await this.invoker({operation:'automation.health'},this.options);
      if(!response.ok)return {status:'unavailable',checkedAt:new Date().toISOString(),message:response.error?.message??'Java automation bridge unavailable.'};
      const data=(response.data??{}) as {engines?:Record<string,{available?:boolean}>};
      const available=Object.values(data.engines??{}).some((engine)=>engine.available===true);
      return {status:available?'healthy':'degraded',checkedAt:new Date().toISOString(),message:available?'At least one Java automation engine is available.':'Java bridge is reachable, but Playwright/Selenium are not present on its classpath.'};
    }catch(error){return {status:'unavailable',checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:String(error)};}
  }
  async execute(plan:AutomationPlan):Promise<AutomationExecutionOutcome>{
    if(!plan.runId||!plan.engine||!Array.isArray(plan.commands))throw new Error('Automation plan requires runId, engine, and commands.');
    const response=await this.invoker({operation:'automation.execute',plan},this.options);
    if(!response.ok)throw new Error(response.error?.message??'Java automation execution failed.');
    const data=(response.data??{}) as {result?:AutomationExecutionOutcome};
    if(!data.result)throw new Error('Java automation bridge response did not include a result.');
    return data.result;
  }
}
