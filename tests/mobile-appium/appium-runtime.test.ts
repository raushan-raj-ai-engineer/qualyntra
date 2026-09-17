/**
 * File: tests/mobile-appium/appium-runtime.test.ts
 * Purpose: Verifies Appium runtime discovery, version compatibility, lifecycle, and unavailable-server behavior without requiring a live Appium installation.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { AppiumRuntimeAdapter } from '../../adapters/runtimes/appium/src';
import type { AppiumHttpRequest,AppiumHttpResponse,AppiumHttpTransport } from '../../adapters/automation/appium/src/http';
import type { CompatibilityRegistry } from '../../packages/contracts/src/runtime';

class FakeTransport implements AppiumHttpTransport { constructor(private readonly response:AppiumHttpResponse|Error){} async request(_request:AppiumHttpRequest):Promise<AppiumHttpResponse>{if(this.response instanceof Error)throw this.response;return this.response;} }
const registry:CompatibilityRegistry={platformVersion:'1.0.0',tools:{appium:{certified:['3.2.0'],candidate:null,policy:'adapter-runtime-owned'}}};

test('appium runtime detects server version and certified compatibility',async()=>{
  const runtime=new AppiumRuntimeAdapter({serverUrl:'http://127.0.0.1:4723',registry,transport:new FakeTransport({status:200,body:{value:{ready:true,message:'ready',build:{version:'3.2.0'}}}})});
  const health=await runtime.runtimeHealth();assert.equal(health.status,'healthy');assert.equal(health.identity.detectedVersion,'3.2.0');assert.equal(health.compatibility.status,'certified');
});

test('appium runtime reports missing configuration without network access',async()=>{
  const runtime=new AppiumRuntimeAdapter({registry,transport:new FakeTransport(new Error('should not run'))});const health=await runtime.runtimeHealth();assert.equal(health.status,'unavailable');assert.match(health.message??'',/not configured/);
});

test('appium lifecycle becomes ready after healthy initialization',async()=>{
  const runtime=new AppiumRuntimeAdapter({serverUrl:'http://127.0.0.1:4723',registry,transport:new FakeTransport({status:200,body:{value:{ready:true,build:{version:'3.2.0'}}}})});await runtime.initialize();assert.equal(runtime.lifecycle(),'ready');await runtime.shutdown();assert.equal(runtime.lifecycle(),'stopped');
});

test('appium runtime refuses remote health checks without explicit opt-in',async()=>{
  const transport=new FakeTransport({status:200,body:{value:{ready:true,build:{version:'3.2.0'}}}});const runtime=new AppiumRuntimeAdapter({serverUrl:'https://device-cloud.invalid',registry,transport});const health=await runtime.runtimeHealth();assert.equal(health.status,'unavailable');assert.match(health.message??'',/allowRemote=true/);
});
