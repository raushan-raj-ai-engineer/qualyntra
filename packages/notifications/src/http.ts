/**
 * File: packages/notifications/src/http.ts
 * Purpose: Provides bounded injectable HTTP delivery with normalized retryable failures for notification adapters.
 * Author: Raushan Raj
 */
export interface NotificationHttpRequest { adapterId:string;url:string;headers:Record<string,string>;body:string;timeoutMs:number;maxResponseBytes:number; }
export interface NotificationHttpResponse { status:number;headers:Record<string,string>;body:string; }
export interface NotificationHttpTransport { post(request:NotificationHttpRequest):Promise<NotificationHttpResponse>; }
export class NotificationHttpError extends Error { constructor(message:string,readonly status?:number,readonly retryable=false,readonly retryAfterMs?:number){super(message);this.name='NotificationHttpError';} }
function headersOf(headers:Headers):Record<string,string>{const out:Record<string,string>={};headers.forEach((v,k)=>out[k.toLowerCase()]=v);return out;}
function retryAfter(headers:Record<string,string>):number|undefined{const raw=headers['retry-after'];if(!raw)return undefined;const seconds=Number(raw);if(Number.isFinite(seconds)&&seconds>=0)return seconds*1000;const at=Date.parse(raw);return Number.isFinite(at)?Math.max(0,at-Date.now()):undefined;}
async function boundedText(response:Response,max:number):Promise<string>{const text=await response.text();if(Buffer.byteLength(text,'utf8')>max)throw new NotificationHttpError('Notification response exceeded the configured size limit.',response.status,false);return text;}
export class FetchNotificationHttpTransport implements NotificationHttpTransport {
  async post(request:NotificationHttpRequest):Promise<NotificationHttpResponse>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),request.timeoutMs);try{let response:Response;try{response=await fetch(request.url,{method:'POST',headers:request.headers,body:request.body,signal:controller.signal});}catch{throw new NotificationHttpError(`Notification ${request.adapterId} request failed before receiving an HTTP response.`,undefined,true);}const headers=headersOf(response.headers);const body=await boundedText(response,request.maxResponseBytes);if(!response.ok){const retryable=response.status===408||response.status===425||response.status===429||response.status>=500;throw new NotificationHttpError(`Notification ${request.adapterId} returned HTTP ${response.status}.`,response.status,retryable,retryAfter(headers));}return{status:response.status,headers,body};}finally{clearTimeout(timer);}}
}
