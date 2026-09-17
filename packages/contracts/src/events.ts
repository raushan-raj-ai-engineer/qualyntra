/**
 * File: packages/contracts/src/events.ts
 * Purpose: Defines platform audit and lifecycle event envelopes.
 * Author: Raushan Raj
 */
export type PlatformEventType='adapter.registered'|'execution.started'|'execution.completed'|'evaluation.completed'|'security.denied'|'compatibility.checked'|'configuration.loaded';
export interface PlatformEvent<T=unknown> { id:string; type:PlatformEventType; timestamp:string; actor?:string; correlationId?:string; payload:T; }
export interface EventSink { publish<T>(event:PlatformEvent<T>):Promise<void>; }

