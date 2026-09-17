/**
 * File: apps/control-plane/src/server.ts
 * Purpose: Runs the lightweight local control-plane health and capability API using only Node built-ins.
 * Author: Raushan Raj
 */
import { createServer } from 'node:http'; import { loadConfiguration } from '../../../packages/configuration/src/env';
const config=loadConfiguration(); const server=createServer((req:any,res:any)=>{const url=req.url??'/'; if(url==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ok',product:'qualyntra',version:'1.0.0'}));return;} if(url==='/capabilities'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({execution:true,llmEvaluation:true,customAdapters:true,multiLanguage:true,enterpriseGovernance:true,releasePolicies:true,auditTrail:true}));return;}res.writeHead(404,{'content-type':'application/json'});res.end(JSON.stringify({error:'not_found'}));}); server.listen(config.port,config.host,()=>console.log(`Qualyntra control plane listening on http://${config.host}:${config.port}`));

