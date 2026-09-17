/**
 * File: adapters/automation/appium/src/http.ts
 * Purpose: Provides an injectable Appium/WebDriver HTTP transport with timeout handling and normalized protocol failures for offline-safe tests.
 * Author: Raushan Raj
 */
export interface AppiumHttpRequest {
  method:'GET'|'POST'|'DELETE';
  url:string;
  headers?:Record<string,string>;
  body?:unknown;
  timeoutMs?:number;
}

export interface AppiumHttpResponse {
  status:number;
  body:unknown;
}

export interface AppiumHttpTransport {
  request(request:AppiumHttpRequest):Promise<AppiumHttpResponse>;
}

export class AppiumProtocolError extends Error {
  constructor(
    message:string,
    readonly status?:number,
    readonly protocolCode?:string,
  ){
    super(message);
    this.name='AppiumProtocolError';
  }
}

function responseError(body:unknown):string|undefined{
  if(!body||typeof body!=='object')return undefined;
  const value=(body as Record<string,unknown>).value;
  if(!value||typeof value!=='object')return undefined;
  const code=(value as Record<string,unknown>).error;
  return typeof code==='string'?code:undefined;
}

export class FetchAppiumHttpTransport implements AppiumHttpTransport {
  async request(request:AppiumHttpRequest):Promise<AppiumHttpResponse>{
    const controller=new AbortController();
    const timeout=request.timeoutMs&&request.timeoutMs>0?setTimeout(()=>controller.abort(),request.timeoutMs):undefined;
    try{
      const response=await fetch(request.url,{
        method:request.method,
        headers:{'content-type':'application/json',...(request.headers??{})},
        body:request.body===undefined?undefined:JSON.stringify(request.body),
        signal:controller.signal,
      });
      const text=await response.text();
      let body:unknown=text;
      if(text){try{body=JSON.parse(text);}catch{/* preserve text */}}
      if(!response.ok){
        const code=responseError(body);
        throw new AppiumProtocolError(`Appium/WebDriver request failed with HTTP ${response.status}${code?` (${code})`:''}.`,response.status,code);
      }
      return {status:response.status,body};
    }catch(error){
      if(error instanceof AppiumProtocolError)throw error;
      if(error instanceof Error&&error.name==='AbortError')throw new AppiumProtocolError('Appium/WebDriver request timed out.');
      throw error;
    }finally{if(timeout)clearTimeout(timeout);}
  }
}


export function assertAppiumServerUrlAllowed(url:string,allowRemote:boolean):void{
  const parsed=new URL(url);
  if(parsed.username||parsed.password)throw new Error('Appium server URL must not contain embedded credentials; use headers instead.');
  const host=parsed.hostname.toLowerCase();
  const remote=!['localhost','127.0.0.1','::1'].includes(host);
  if(remote&&!allowRemote)throw new Error('Remote Appium access requires explicit allowRemote=true.');
}

export function appiumEndpoint(baseUrl:string,relative:string):string{
  const base=baseUrl.endsWith('/')?baseUrl:`${baseUrl}/`;
  return new URL(relative.replace(/^\/+/,''),base).toString();
}

export function webdriverValue(body:unknown):unknown{
  if(!body||typeof body!=='object')return body;
  const record=body as Record<string,unknown>;
  return Object.prototype.hasOwnProperty.call(record,'value')?record.value:body;
}
