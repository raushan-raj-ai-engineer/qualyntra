/**
 * File: packages/ingestion/src/registry.ts
 * Purpose: Resolves explicit or auto-detected external result formats to registered result adapters without vendor coupling in the kernel.
 * Author: Raushan Raj
 */
import type { ResultAdapterRegistration,ResultFormat } from './types';

export class ResultIngestionRegistry {
  private readonly registrations=new Map<ResultFormat,ResultAdapterRegistration>();

  register(registration:ResultAdapterRegistration):void {
    if(this.registrations.has(registration.format)) throw new Error(`Result format already registered: ${registration.format}`);
    this.registrations.set(registration.format,registration);
  }

  get(format:ResultFormat):ResultAdapterRegistration {
    const registration=this.registrations.get(format);
    if(!registration) throw new Error(`Result format not registered: ${format}`);
    return registration;
  }

  list():ResultAdapterRegistration[]{return [...this.registrations.values()].sort((a,b)=>(b.priority??0)-(a.priority??0));}

  resolve(input:{format?:ResultFormat;path?:string;contentType?:string;content:string}):ResultAdapterRegistration {
    if(input.format) return this.get(input.format);
    const candidates=this.list().filter(registration=>{
      if(registration.detect?.(input)) return true;
      return registration.adapter.supports(input.path??'',input.contentType);
    });
    if(candidates.length===0) throw new Error('No result adapter recognized the supplied artifact. Specify an explicit format or register an adapter.');
    return candidates[0]!;
  }
}
