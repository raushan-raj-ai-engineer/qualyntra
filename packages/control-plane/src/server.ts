/**
 * File: packages/control-plane/src/server.ts
 * Purpose: Creates a dependency-injected Node HTTP server for the control-plane router with graceful lifecycle ownership.
 * Author: Raushan Raj
 */
import { createServer } from 'node:http';
import type { ControlPlaneRouterDependencies } from './router';
import { createControlPlaneHandler } from './router';

export function createControlPlaneServer(dependencies:ControlPlaneRouterDependencies){
  const handler=createControlPlaneHandler(dependencies);
  return createServer((req:any,res:any)=>{void handler(req,res);});
}
