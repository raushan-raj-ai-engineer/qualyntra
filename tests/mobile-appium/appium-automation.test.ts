/**
 * File: tests/mobile-appium/appium-automation.test.ts
 * Purpose: Verifies Appium W3C session creation, mobile actions, evidence, security controls, and guaranteed teardown using an offline transport.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { promises as fs } from 'node:fs';import { tmpdir } from 'node:os';import path from 'node:path';
import { AppiumAutomationAdapter } from '../../adapters/automation/appium/src';
import type { AppiumHttpRequest,AppiumHttpResponse,AppiumHttpTransport } from '../../adapters/automation/appium/src/http';
import type { AutomationPlan } from '../../packages/contracts/src/automation';

class ScriptedTransport implements AppiumHttpTransport {
  readonly requests:AppiumHttpRequest[]=[];constructor(private readonly handler:(request:AppiumHttpRequest,index:number)=>AppiumHttpResponse|Promise<AppiumHttpResponse>){}
  async request(request:AppiumHttpRequest):Promise<AppiumHttpResponse>{this.requests.push(request);return await this.handler(request,this.requests.length-1);}
}
function plan(overrides:Partial<AutomationPlan>={}):AutomationPlan{return {runId:'mobile-1',engine:'appium',allowRemote:false,mobile:{platform:'android',serverUrl:'http://127.0.0.1:4723',automationName:'UiAutomator2',deviceName:'emulator'},commands:[],...overrides};}

test('appium adapter creates W3C session and always deletes it',async()=>{
  const transport=new ScriptedTransport((request)=>request.url.endsWith('/session')?{status:200,body:{value:{sessionId:'s1',capabilities:{platformName:'Android'}}}}:{status:200,body:{value:null}});
  const result=await new AppiumAutomationAdapter({transport}).execute(plan({commands:[{id:'activate',type:'activateApp',value:'com.example.app'}]}));
  assert.equal(result.status,'passed');assert.equal(transport.requests[0]?.method,'POST');assert.deepEqual((transport.requests[0]?.body as any).capabilities.alwaysMatch.platformName,'Android');assert.equal(transport.requests.at(-1)?.method,'DELETE');
});

test('remote appium server requires explicit allowRemote',async()=>{
  const transport=new ScriptedTransport(()=>({status:200,body:{value:{}}}));const result=await new AppiumAutomationAdapter({transport}).execute(plan({mobile:{platform:'android',serverUrl:'https://device-cloud.invalid'}}));assert.equal(result.status,'error');assert.match(result.failure?.message??'',/allowRemote=true/);assert.equal(transport.requests.length,0);
});

test('embedded URL credentials are rejected before transport invocation',async()=>{
  const transport=new ScriptedTransport(()=>({status:200,body:{value:{}}}));const result=await new AppiumAutomationAdapter({transport}).execute(plan({allowRemote:true,mobile:{platform:'ios',serverUrl:'https://user:secret@cloud.invalid'}}));assert.equal(result.status,'error');assert.match(result.failure?.message??'',/must not contain embedded credentials/);assert.equal(transport.requests.length,0);
});

test('screenshot and page source become hashed evidence',async()=>{
  const dir=await fs.mkdtemp(path.join(tmpdir(),'qualyntra-appium-'));const transport=new ScriptedTransport((request)=>{
    if(request.url.endsWith('/session'))return {status:200,body:{value:{sessionId:'s1',capabilities:{}}}};
    if(request.url.endsWith('/screenshot'))return {status:200,body:{value:Buffer.from('png').toString('base64')}};
    if(request.url.endsWith('/source'))return {status:200,body:{value:'<hierarchy />'}};
    return {status:200,body:{value:null}};
  });
  const result=await new AppiumAutomationAdapter({transport}).execute(plan({artifactDirectory:dir,commands:[{id:'shot',type:'screenshot'},{id:'source',type:'pageSource'}]}));
  assert.equal(result.status,'passed');assert.equal(result.evidence.length,2);assert.ok(result.evidence.every(item=>Boolean(item.sha256)));
});

test('executeMobile is opt-in and mobile shell has a second safety gate',async()=>{
  const transport=new ScriptedTransport((request)=>request.url.endsWith('/session')?{status:200,body:{value:{sessionId:'s1',capabilities:{}}}}:{status:200,body:{value:null}});
  const adapter=new AppiumAutomationAdapter({transport});
  const blocked=await adapter.execute(plan({commands:[{id:'mobile',type:'executeMobile',metadata:{script:'mobile: scroll'}}]}));assert.equal(blocked.status,'failed');assert.match(blocked.failure?.message??'',/allowExecuteMobile=true/);
  const shell=await adapter.execute(plan({mobile:{platform:'android',serverUrl:'http://127.0.0.1:4723',allowExecuteMobile:true},commands:[{id:'shell',type:'executeMobile',metadata:{script:'mobile: shell'}}]}));assert.equal(shell.status,'failed');assert.match(shell.failure?.message??'',/allowUnsafeMobileCommands=true/);
});

test('accessibility id locator maps to Appium element lookup and tap',async()=>{
  const transport=new ScriptedTransport((request)=>{
    if(request.url.endsWith('/session'))return {status:200,body:{value:{sessionId:'s1',capabilities:{}}}};
    if(request.url.endsWith('/element'))return {status:200,body:{value:{'element-6066-11e4-a52e-4f735466cecf':'e1'}}};
    return {status:200,body:{value:null}};
  });
  const result=await new AppiumAutomationAdapter({transport}).execute(plan({commands:[{id:'tap',type:'tap',locator:{strategy:'accessibilityId',value:'Login'}}]}));assert.equal(result.status,'passed');assert.deepEqual(transport.requests.find(r=>r.url.endsWith('/element'))?.body,{using:'accessibility id',value:'Login'});
});
