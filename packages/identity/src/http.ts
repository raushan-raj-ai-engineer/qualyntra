/**
 * File: packages/identity/src/http.ts
 * Purpose: Provides an injectable OIDC metadata/JWKS HTTP transport with bounded timeouts and no identity-vendor SDK dependency.
 * Author: Raushan Raj
 */
import type { IdentityHttpRequest,IdentityHttpResponse,IdentityHttpTransport } from '../../contracts/src/identity';

function headersObject(headers:Headers):Record<string,string>{const result:Record<string,string>={};headers.forEach((value,key)=>{result[key.toLowerCase()]=value;});return result;}

export class FetchIdentityHttpTransport implements IdentityHttpTransport{
  async get(request:IdentityHttpRequest):Promise<IdentityHttpResponse>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),request.timeoutMs);
    try{
      const response=await fetch(request.url,{method:'GET',headers:{accept:'application/json'},signal:controller.signal,redirect:'error'});
      const text=await response.text();let body:unknown=text;
      if(text){try{body=JSON.parse(text);}catch{body=text;}}
      return{status:response.status,body,headers:headersObject(response.headers)};
    }finally{clearTimeout(timeout);}
  }
}
