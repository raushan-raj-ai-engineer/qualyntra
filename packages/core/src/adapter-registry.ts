/**
 * File: packages/core/src/adapter-registry.ts
 * Purpose: Implements type-safe runtime registration and lookup for pluggable platform adapters.
 * Author: Raushan Raj
 */
import type { Adapter, AdapterKind } from '../../contracts/src/adapter';
export class AdapterRegistry {
  private readonly adapters=new Map<string,Adapter>();
  register(adapter:Adapter):void { if(this.adapters.has(adapter.descriptor.id)) throw new Error(`Adapter already registered: ${adapter.descriptor.id}`); this.adapters.set(adapter.descriptor.id,adapter); }
  replace(adapter:Adapter):void { this.adapters.set(adapter.descriptor.id,adapter); }
  get<T extends Adapter=Adapter>(id:string):T { const adapter=this.adapters.get(id); if(!adapter) throw new Error(`Adapter not registered: ${id}`); return adapter as T; }
  has(id:string):boolean { return this.adapters.has(id); }
  list(kind?:AdapterKind):Adapter[] { return [...this.adapters.values()].filter(a=>!kind||a.descriptor.kind===kind); }
  remove(id:string):boolean { return this.adapters.delete(id); }
}

