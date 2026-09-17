/**
 * File: packages/integrations/src/dedupe.ts
 * Purpose: Defines an injectable idempotency result store so integration mutations can suppress duplicate external side effects.
 * Author: Raushan Raj
 */
import type { IntegrationResponse } from '../../contracts/src/integration';
export interface IntegrationDedupeStore{get(key:string):Promise<IntegrationResponse|undefined>;put(key:string,response:IntegrationResponse):Promise<void>;}
export class InMemoryIntegrationDedupeStore implements IntegrationDedupeStore{private readonly values=new Map<string,IntegrationResponse>();async get(key:string){const value=this.values.get(key);return value?structuredClone(value):undefined;}async put(key:string,response:IntegrationResponse){this.values.set(key,structuredClone(response));}}
export async function dedupe<T extends IntegrationResponse>(store:IntegrationDedupeStore|undefined,key:string|undefined,action:()=>Promise<T>):Promise<T>{if(!key)return action();const prior=await store?.get(key);if(prior)return prior as T;const result=await action();await store?.put(key,result);return result;}
