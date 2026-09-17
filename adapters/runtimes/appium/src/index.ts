/**
 * File: adapters/runtimes/appium/src/index.ts
 * Purpose: Detects Appium server readiness/version and exposes lifecycle, compatibility, and Android/iOS runtime capabilities without bundling Appium.
 * Author: Raushan Raj
 */
import type { AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { CompatibilityRegistry,RuntimeAdapter,RuntimeCapabilitySet,RuntimeContext,RuntimeHealth,RuntimeInstanceIdentity,RuntimeLifecycleState } from '../../../../packages/contracts/src/runtime';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';
import { resolveRuntimeCompatibility } from '../../../../packages/runtime/src/compatibility';
import { loadCompatibilityRegistry } from '../../../../packages/runtime/src/registry-loader';
import { FetchAppiumHttpTransport,appiumEndpoint,assertAppiumServerUrlAllowed,webdriverValue,type AppiumHttpTransport } from '../../../automation/appium/src/http';

export const descriptor:AdapterDescriptor={
  id:'runtime.appium',kind:'runtime',version:'1.0.0',displayName:'Appium Server Runtime',
  description:'Discovers an external Appium server without bundling Appium into Qualyntra.',
  supportedLanguages:['protocol'],supportedTools:['appium'],capabilities:['mobile','android','ios','health','version-detection','device-cloud'],
};

export interface AppiumRuntimeOptions {
  serverUrl?:string;
  headers?:Record<string,string>;
  timeoutMs?:number;
  transport?:AppiumHttpTransport;
  registry?:CompatibilityRegistry;
  networkPolicy?:NetworkPolicy;
  allowRemote?:boolean;
}

function object(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function text(value:unknown):string|undefined{return typeof value==='string'&&value.trim()?value:undefined;}

export class AppiumRuntimeAdapter implements RuntimeAdapter {
  readonly descriptor=descriptor;readonly id=descriptor.id;
  private state:RuntimeLifecycleState='created';private readonly transport:AppiumHttpTransport;
  constructor(private readonly options:AppiumRuntimeOptions={}){this.transport=options.transport??new FetchAppiumHttpTransport();}
  lifecycle():RuntimeLifecycleState{return this.state;}
  async initialize():Promise<void>{this.state='initializing';const health=await this.runtimeHealth();this.state=health.status==='healthy'?'ready':health.status==='degraded'?'degraded':'failed';if(this.state==='failed')throw new Error(health.message??'Appium runtime is unavailable.');}
  async shutdown():Promise<void>{this.state='stopping';this.state='stopped';}
  async runtimeCapabilities():Promise<RuntimeCapabilitySet>{return {mobile:true,android:true,ios:true,w3cWebDriver:true,screenshots:true,pageSource:true,deviceCloud:true,appLifecycle:true};}
  async identity():Promise<RuntimeInstanceIdentity>{const snapshot=await this.snapshot();return {adapterId:this.id,tool:'appium',detectedVersion:snapshot.version};}
  async health():Promise<AdapterHealth>{const value=await this.runtimeHealth();return {status:value.status,message:value.message,checkedAt:value.checkedAt};}
  private async snapshot():Promise<{status:'healthy'|'degraded'|'unavailable';version?:string;message?:string;metadata?:Record<string,unknown>}>{
    if(!this.options.serverUrl)return {status:'unavailable',message:'Appium server URL is not configured.'};
    try{
      assertAppiumServerUrlAllowed(this.options.serverUrl,this.options.allowRemote===true);
      if(this.options.networkPolicy)assertNetworkAllowed(this.options.serverUrl,this.options.networkPolicy);
      const response=await this.transport.request({method:'GET',url:appiumEndpoint(this.options.serverUrl,'status'),headers:this.options.headers,timeoutMs:this.options.timeoutMs??5_000});
      const value=object(webdriverValue(response.body));const build=object(value.build);const version=text(build.version);const ready=value.ready!==false;
      return {status:ready?'healthy':'degraded',version,message:text(value.message)??(ready?'Appium server is ready.':'Appium server is not ready for sessions.'),metadata:{ready}};
    }catch(error){return {status:'unavailable',message:error instanceof Error?error.message:String(error)};}
  }
  async runtimeHealth(context:RuntimeContext={}):Promise<RuntimeHealth>{
    const snapshot=await this.snapshot();const registry=this.options.registry??loadCompatibilityRegistry(context.workingDirectory??process.cwd());
    const compatibility=resolveRuntimeCompatibility('appium',snapshot.version,registry);
    const lifecycle=this.state==='created'?(snapshot.status==='healthy'?'ready':snapshot.status==='degraded'?'degraded':'failed'):this.state;
    return {status:snapshot.status,checkedAt:new Date().toISOString(),message:snapshot.message,lifecycle,identity:{adapterId:this.id,tool:'appium',detectedVersion:snapshot.version},compatibility,metadata:snapshot.metadata};
  }
}
