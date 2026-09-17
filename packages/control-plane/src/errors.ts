/**
 * File: packages/control-plane/src/errors.ts
 * Purpose: Provides safe structured control-plane errors without exposing internal stack traces to API clients.
 * Author: Raushan Raj
 */
export class ApiError extends Error {
  constructor(
    readonly status:number,
    readonly code:string,
    message:string,
    readonly details?:Record<string,unknown>,
    readonly headers?:Record<string,string>,
  ){super(message);this.name='ApiError';}
}

export function asApiError(error:unknown):ApiError{
  if(error instanceof ApiError)return error;
  return new ApiError(500,'internal_error','The control plane could not complete the request.');
}
