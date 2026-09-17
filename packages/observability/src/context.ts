/**
 * File: packages/observability/src/context.ts
 * Purpose: Propagates correlation, trace, tenant, and actor context across asynchronous platform work without vendor SDK coupling.
 * Author: Raushan Raj
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { TelemetryContext } from '../../contracts/src/observability';

export class TelemetryContextManager {
  private readonly storage=new AsyncLocalStorage<TelemetryContext>();
  run<T>(context:TelemetryContext,fn:()=>T):T{return this.storage.run(structuredClone(context),fn);}
  current():TelemetryContext{return structuredClone(this.storage.getStore()??{});}
}
