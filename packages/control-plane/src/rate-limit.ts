/**
 * File: packages/control-plane/src/rate-limit.ts
 * Purpose: Provides an in-memory fixed-window rate-limit boundary with deterministic clock injection for local and test use.
 * Author: Raushan Raj
 */
export interface RateLimitDecision { allowed:boolean; remaining:number; retryAfterSeconds:number; }
export interface RateLimiter { consume(key:string):RateLimitDecision; }

export class FixedWindowRateLimiter implements RateLimiter{
  private readonly windows=new Map<string,{start:number;count:number}>();
  constructor(private readonly limit:number,private readonly windowMs=60_000,private readonly now:()=>number=()=>Date.now()){
    if(!Number.isInteger(limit)||limit<1)throw new Error('Rate limit must be a positive integer.');
    if(!Number.isFinite(windowMs)||windowMs<1)throw new Error('Rate-limit window must be positive.');
  }
  consume(key:string):RateLimitDecision{
    const current=this.now();for(const [candidate,value] of this.windows)if(current-value.start>=this.windowMs)this.windows.delete(candidate);let window=this.windows.get(key);
    if(!window||current-window.start>=this.windowMs){window={start:current,count:0};this.windows.set(key,window);}
    if(window.count>=this.limit){return{allowed:false,remaining:0,retryAfterSeconds:Math.max(1,Math.ceil((window.start+this.windowMs-current)/1000))};}
    window.count++;
    return{allowed:true,remaining:Math.max(0,this.limit-window.count),retryAfterSeconds:0};
  }
}
