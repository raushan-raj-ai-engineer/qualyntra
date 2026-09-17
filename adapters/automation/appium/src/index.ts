/**
 * File: adapters/automation/appium/src/index.ts
 * Purpose: Implements Appium Android/iOS automation through the W3C WebDriver/Appium protocol with normalized results, evidence, remote controls, and safe teardown.
 * Author: Raushan Raj
 */
import { createHash,randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { AutomationCapabilities,AutomationCommand,AutomationExecutionOutcome,AutomationPlan,ExecutableAutomationAdapter,LocatorDescriptor,MobileSessionConfiguration } from '../../../../packages/contracts/src/automation';
import type { EvidenceRecord,EvidenceKind } from '../../../../packages/contracts/src/evidence';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';
import { AppiumProtocolError,FetchAppiumHttpTransport,appiumEndpoint,assertAppiumServerUrlAllowed,webdriverValue,type AppiumHttpTransport } from './http';

export const descriptor:AdapterDescriptor={
  id:'automation.appium',kind:'automation',version:'1.0.0',displayName:'Appium Mobile',
  description:'Android/iOS automation over the W3C WebDriver and Appium protocol.',
  supportedLanguages:['protocol'],supportedTools:['appium'],
  capabilities:['mobile','android','ios','screenshots','page-source','w3c-actions','device-cloud','app-lifecycle','evidence'],
};

export interface AppiumAutomationOptions {
  serverUrl?:string;
  headers?:Record<string,string>;
  timeoutMs?:number;
  transport?:AppiumHttpTransport;
  networkPolicy?:NetworkPolicy;
}

interface AppiumSession { sessionId:string; capabilities:Record<string,unknown>; }

function object(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function string(value:unknown):string|undefined{return typeof value==='string'&&value.trim()?value:undefined;}
function number(value:unknown):number|undefined{return typeof value==='number'&&Number.isFinite(value)?value:undefined;}
function serverUrl(plan:AutomationPlan,options:AppiumAutomationOptions):string{
  const value=plan.mobile?.serverUrl??plan.remoteUrl??options.serverUrl;
  if(!value)throw new Error('Appium execution requires mobile.serverUrl, remoteUrl, or adapter serverUrl configuration.');
  assertAppiumServerUrlAllowed(value,plan.allowRemote===true);
  if(options.networkPolicy)assertNetworkAllowed(value,options.networkPolicy);
  return value;
}
function headers(plan:AutomationPlan,options:AppiumAutomationOptions):Record<string,string>{return {...(options.headers??{}),...(plan.mobile?.headers??{})};}
function platformName(platform:'android'|'ios'):string{return platform==='android'?'Android':'iOS';}

function setIfPresent(target:Record<string,unknown>,key:string,value:unknown):void{if(value!==undefined&&value!==null&&value!=='')target[key]=value;}
function sessionCapabilities(mobile:MobileSessionConfiguration):Record<string,unknown>{
  const alwaysMatch={...(mobile.capabilities??{})};
  const expectedPlatform=platformName(mobile.platform);
  const existingPlatform=string(alwaysMatch.platformName);
  if(existingPlatform&&existingPlatform.toLowerCase()!==expectedPlatform.toLowerCase())throw new Error(`mobile.platform conflicts with capabilities.platformName (${existingPlatform}).`);
  alwaysMatch.platformName=expectedPlatform;
  if(mobile.browserName){
    const existingBrowser=string(alwaysMatch.browserName);
    if(existingBrowser&&existingBrowser!==mobile.browserName)throw new Error('mobile.browserName conflicts with capabilities.browserName.');
    alwaysMatch.browserName=mobile.browserName;
  }
  const appiumOptions={...object(alwaysMatch['appium:options'])};
  const dedicated:Record<string,unknown>={};
  setIfPresent(dedicated,'automationName',mobile.automationName);
  setIfPresent(dedicated,'deviceName',mobile.deviceName);
  setIfPresent(dedicated,'platformVersion',mobile.platformVersion);
  setIfPresent(dedicated,'app',mobile.app);
  setIfPresent(dedicated,'udid',mobile.udid);
  if(mobile.noReset!==undefined)dedicated.noReset=mobile.noReset;
  if(mobile.fullReset!==undefined)dedicated.fullReset=mobile.fullReset;
  for(const [key,value] of Object.entries(dedicated)){
    if(Object.prototype.hasOwnProperty.call(appiumOptions,key)&&appiumOptions[key]!==value)throw new Error(`mobile.${key} conflicts with capabilities['appium:options'].${key}.`);
    appiumOptions[key]=value;
  }
  if(Object.keys(appiumOptions).length)alwaysMatch['appium:options']=appiumOptions;
  return {alwaysMatch,firstMatch:[]};
}

function elementUsing(locator:LocatorDescriptor):{using:string;value:string}{
  const using=({
    accessibilityId:'accessibility id',id:'id',className:'class name',xpath:'xpath',
    androidUiAutomator:'-android uiautomator',iosPredicate:'-ios predicate string',iosClassChain:'-ios class chain',
  } as Record<string,string>)[locator.strategy];
  if(!using)throw new Error(`Locator strategy ${locator.strategy} is not supported by Appium mobile adapter.`);
  return {using,value:locator.value};
}
function elementId(value:unknown):string{
  const record=object(value);
  const id=string(record['element-6066-11e4-a52e-4f735466cecf'])??string(record.ELEMENT);
  if(!id)throw new Error('Appium element response did not contain a WebDriver element id.');
  return id;
}
function safeId(id:string):string{return id.replace(/[^A-Za-z0-9_.-]+/g,'_').replace(/^[._]+|[._]+$/g,'')||'artifact';}
async function artifactPath(plan:AutomationPlan,command:AutomationCommand,extension:string):Promise<string>{
  if(!plan.artifactDirectory)throw new Error(`Action ${command.type} requires artifactDirectory.`);
  const directory=path.resolve(plan.artifactDirectory);
  await fs.mkdir(directory,{recursive:true});
  const target=path.resolve(directory,`${safeId(command.id)}.${extension}`);
  if(path.dirname(target)!==directory)throw new Error('Artifact path escaped artifactDirectory.');
  return target;
}
async function evidenceFromBytes(plan:AutomationPlan,command:AutomationCommand,kind:EvidenceKind,contentType:string,extension:string,bytes:Uint8Array):Promise<EvidenceRecord>{
  const target=await artifactPath(plan,command,extension);
  await fs.writeFile(target,bytes);
  return {id:randomUUID(),runId:plan.runId,kind,name:path.basename(target),contentType,createdAt:new Date().toISOString(),path:target,sha256:createHash('sha256').update(bytes).digest('hex'),redacted:false};
}
function failure(error:unknown):{category:string;message:string;retryable:boolean}{
  if(error instanceof AppiumProtocolError)return {category:error.protocolCode??error.name,message:error.message,retryable:typeof error.status==='number'&&[408,429,500,502,503,504].includes(error.status)};
  if(error instanceof Error)return {category:error.name,message:error.message,retryable:false};
  return {category:'Error',message:String(error),retryable:false};
}
function elapsed(start:number):number{return Math.max(0,Date.now()-start);}

export class AppiumAutomationAdapter implements ExecutableAutomationAdapter,Adapter {
  readonly id=descriptor.id;readonly descriptor=descriptor;
  private readonly transport:AppiumHttpTransport;
  constructor(private readonly options:AppiumAutomationOptions={}){this.transport=options.transport??new FetchAppiumHttpTransport();}
  capabilities():AutomationCapabilities{return {web:false,mobile:true,api:false,tracing:false,screenshots:true,networkInterception:false,visualComparison:false,accessibility:true,storageState:false};}
  describe():Record<string,unknown>{return {...descriptor};}
  async health():Promise<AdapterHealth>{
    const configured=this.options.serverUrl;
    if(!configured)return {status:'degraded',checkedAt:new Date().toISOString(),message:'Adapter is loaded; configure an Appium server URL for live health checks.'};
    try{
      assertAppiumServerUrlAllowed(configured,false);
      const response=await this.transport.request({method:'GET',url:appiumEndpoint(configured,'status'),headers:this.options.headers,timeoutMs:this.options.timeoutMs??5_000});
      const value=object(webdriverValue(response.body));
      return {status:value.ready===false?'degraded':'healthy',checkedAt:new Date().toISOString(),message:string(value.message)??'Appium server responded.'};
    }catch(error){return {status:'unavailable',checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:String(error)};}
  }

  private async request(plan:AutomationPlan,method:'GET'|'POST'|'DELETE',relative:string,body?:unknown):Promise<unknown>{
    const response=await this.transport.request({method,url:appiumEndpoint(serverUrl(plan,this.options),relative),headers:headers(plan,this.options),body,timeoutMs:plan.timeoutMs??this.options.timeoutMs??30_000});
    return webdriverValue(response.body);
  }
  private async createSession(plan:AutomationPlan):Promise<AppiumSession>{
    if(!plan.mobile)throw new Error('Appium automation requires plan.mobile configuration.');
    const value=object(await this.request(plan,'POST','session',{capabilities:sessionCapabilities(plan.mobile)}));
    const sessionId=string(value.sessionId);
    if(!sessionId)throw new Error('Appium create-session response did not contain sessionId.');
    return {sessionId,capabilities:object(value.capabilities)};
  }
  private async findElement(plan:AutomationPlan,sessionId:string,locator:LocatorDescriptor):Promise<string>{
    return elementId(await this.request(plan,'POST',`session/${encodeURIComponent(sessionId)}/element`,elementUsing(locator)));
  }
  private async clickElement(plan:AutomationPlan,sessionId:string,locator:LocatorDescriptor):Promise<void>{
    const id=await this.findElement(plan,sessionId,locator);
    await this.request(plan,'POST',`session/${encodeURIComponent(sessionId)}/element/${encodeURIComponent(id)}/click`,{});
  }
  private async pointer(plan:AutomationPlan,sessionId:string,command:AutomationCommand,scroll:boolean):Promise<void>{
    const meta=command.metadata??{};
    const startX=number(meta.startX)??number(meta.x);
    const startY=number(meta.startY)??number(meta.y);
    const endX=number(meta.endX)??(scroll?startX:undefined);
    const endY=number(meta.endY);
    if(startX===undefined||startY===undefined)throw new Error(`${command.type} requires coordinate metadata.`);
    const finalX=endX??startX;const finalY=endY??startY;
    const duration=Math.max(0,number(meta.durationMs)??(scroll?500:100));
    const actions=[{type:'pointer',id:'finger1',parameters:{pointerType:'touch'},actions:[
      {type:'pointerMove',duration:0,x:startX,y:startY,origin:'viewport'},
      {type:'pointerDown',button:0},{type:'pause',duration:Math.min(100,duration)},
      {type:'pointerMove',duration,x:finalX,y:finalY,origin:'viewport'},{type:'pointerUp',button:0},
    ]}];
    await this.request(plan,'POST',`session/${encodeURIComponent(sessionId)}/actions`,{actions});
    try{await this.request(plan,'DELETE',`session/${encodeURIComponent(sessionId)}/actions`);}catch{/* release is best effort */}
  }
  private appIdentifier(plan:AutomationPlan,command:AutomationCommand):string{
    const value=string(command.value)??plan.mobile?.appId;
    if(!value)throw new Error(`${command.type} requires command.value or mobile.appId.`);
    return value;
  }
  private async executeCommand(plan:AutomationPlan,sessionId:string,command:AutomationCommand):Promise<EvidenceRecord[]>{
    const base=`session/${encodeURIComponent(sessionId)}`;
    if(command.type==='navigate'){
      if(!command.url)throw new Error('navigate action requires url.');
      const url=plan.baseUrl?new URL(command.url,plan.baseUrl.endsWith('/')?plan.baseUrl:`${plan.baseUrl}/`).toString():command.url;
      await this.request(plan,'POST',`${base}/url`,{url});return [];
    }
    if(command.type==='screenshot'){
      const value=await this.request(plan,'GET',`${base}/screenshot`);
      if(typeof value!=='string')throw new Error('Appium screenshot response was not base64 text.');
      return [await evidenceFromBytes(plan,command,'screenshot','image/png','png',Buffer.from(value,'base64'))];
    }
    if(command.type==='pageSource'){
      const value=await this.request(plan,'GET',`${base}/source`);
      if(typeof value!=='string')throw new Error('Appium page source response was not text.');
      return [await evidenceFromBytes(plan,command,'dom','application/xml','xml',Buffer.from(value,'utf8'))];
    }
    if(command.type==='tap'){
      if(command.locator)await this.clickElement(plan,sessionId,command.locator);else await this.pointer(plan,sessionId,command,false);return [];
    }
    if(command.type==='swipe'||command.type==='scroll'){await this.pointer(plan,sessionId,command,command.type==='scroll');return [];}
    if(command.type==='activateApp'||command.type==='terminateApp'||command.type==='removeApp'){
      const appId=this.appIdentifier(plan,command);const payload=plan.mobile?.platform==='ios'?{bundleId:appId}:{appId};
      const endpoint=command.type==='activateApp'?'activate_app':command.type==='terminateApp'?'terminate_app':'remove_app';
      await this.request(plan,'POST',`${base}/appium/device/${endpoint}`,payload);return [];
    }
    if(command.type==='installApp'){
      const appPath=string(command.value)??plan.mobile?.app;
      if(!appPath)throw new Error('installApp requires command.value or mobile.app.');
      await this.request(plan,'POST',`${base}/appium/device/install_app`,{appPath});return [];
    }
    if(command.type==='executeMobile'){
      if(!plan.mobile?.allowExecuteMobile)throw new Error('executeMobile requires mobile.allowExecuteMobile=true.');
      const script=string(command.metadata?.script);
      if(!script?.startsWith('mobile:'))throw new Error('executeMobile requires metadata.script starting with "mobile:".');
      if(script.trim().toLowerCase()==='mobile: shell'&&!plan.mobile.allowUnsafeMobileCommands)throw new Error('mobile: shell requires mobile.allowUnsafeMobileCommands=true.');
      const args=command.metadata?.args;
      await this.request(plan,'POST',`${base}/execute/sync`,{script,args:Array.isArray(args)?args:[args??{}]});return [];
    }
    if(!command.locator)throw new Error(`Action ${command.type} requires locator.`);
    const id=await this.findElement(plan,sessionId,command.locator);const element=`${base}/element/${encodeURIComponent(id)}`;
    if(command.type==='click'){await this.request(plan,'POST',`${element}/click`,{});return [];}
    if(command.type==='clear'){await this.request(plan,'POST',`${element}/clear`,{});return [];}
    if(command.type==='fill'){
      await this.request(plan,'POST',`${element}/clear`,{});
      await this.request(plan,'POST',`${element}/value`,{text:command.value==null?'':String(command.value)});return [];
    }
    if(command.type==='check'){
      const selected=Boolean(await this.request(plan,'GET',`${element}/selected`));
      const target=command.value===undefined?true:Boolean(command.value);
      if(selected!==target)await this.request(plan,'POST',`${element}/click`,{});return [];
    }
    throw new Error(`Unsupported Appium action: ${command.type}.`);
  }

  async execute(plan:AutomationPlan):Promise<AutomationExecutionOutcome>{
    if(plan.engine.toLowerCase()!=='appium')throw new Error(`Appium adapter cannot execute engine ${plan.engine}.`);
    const startedAt=new Date().toISOString();const steps:AutomationExecutionOutcome['steps']=[];const evidence:EvidenceRecord[]=[];
    let session:AppiumSession|undefined;let topFailure:AutomationExecutionOutcome['failure'];let status:AutomationExecutionOutcome['status']='passed';
    try{
      session=await this.createSession(plan);
      for(const command of plan.commands){const start=Date.now();try{evidence.push(...await this.executeCommand(plan,session.sessionId,command));steps.push({commandId:command.id,action:command.type,status:'passed',durationMs:elapsed(start)});}catch(error){const detail=failure(error);steps.push({commandId:command.id,action:command.type,status:'failed',durationMs:elapsed(start),failure:detail});topFailure??=detail;status='failed';if(plan.failFast!==false)break;}}
    }catch(error){topFailure=failure(error);status='error';}
    finally{if(session){try{await this.request(plan,'DELETE',`session/${encodeURIComponent(session.sessionId)}`);}catch(error){topFailure??=failure(error);if(status==='passed')status='error';}}}
    return {runId:plan.runId,engine:'appium',status,startedAt,finishedAt:new Date().toISOString(),steps,evidence,failure:topFailure,metadata:{platform:plan.mobile?.platform,capabilities:session?.capabilities?Object.keys(session.capabilities).sort():[]}};
  }
}

export * from './http';
