/**
 * File: packages/core/src/event-bus.ts
 * Purpose: Provides an in-process event bus for auditability and control-plane integrations.
 * Author: Raushan Raj
 */
import type { EventSink, PlatformEvent } from '../../contracts/src/events';
export class InMemoryEventBus implements EventSink { private readonly events:PlatformEvent[]=[]; async publish<T>(event:PlatformEvent<T>):Promise<void>{ this.events.push(event as PlatformEvent); } snapshot():readonly PlatformEvent[]{ return [...this.events]; } }

