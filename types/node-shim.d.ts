/**
 * File: types/node-shim.d.ts
 * Purpose: Provides the minimal Node.js declarations required to typecheck without vendoring @types/node.
 * Author: Raushan Raj
 */
declare module 'node:child_process' { export function spawn(command:string,args?:string[],options?:any): any; }
declare module 'node:fs' { export const promises:any; export function readFileSync(path:string,encoding:string):string; export function existsSync(path:string):boolean; }
declare module 'node:path' { const p:any; export = p; }
declare module 'node:os' { export function tmpdir(): string; }
declare module 'node:http' { export function createServer(handler:(req:any,res:any)=>void): any; }
declare module 'node:crypto' { export function randomUUID(): string; export function createHash(name:string): any; export function timingSafeEqual(a:any,b:any): boolean; }
declare const process:any;
declare const Buffer:any;
