/**
 * File: scripts/performance-scale-certify.mjs
 * Purpose: Runs live HA performance and scale certification across API concurrency, idempotency, queue drain, worker churn, artifact throughput, telemetry volume, database-pool pressure, and survivor load during replica restart.
 * Author: Raushan Raj
 */
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const profiles={
  smoke:{apiRequests:60,apiConcurrency:16,idempotencyFanout:12,queueJobs:100,workers:6,artifactCount:6,artifactBytes:32*1024,artifactConcurrency:3,telemetryPoints:100,telemetryConcurrency:16,churnCycles:2,restartRequests:24},
  standard:{apiRequests:240,apiConcurrency:48,idempotencyFanout:32,queueJobs:1000,workers:16,artifactCount:24,artifactBytes:64*1024,artifactConcurrency:8,telemetryPoints:1000,telemetryConcurrency:48,churnCycles:4,restartRequests:80},
  stress:{apiRequests:1000,apiConcurrency:96,idempotencyFanout:64,queueJobs:5000,workers:32,artifactCount:64,artifactBytes:256*1024,artifactConcurrency:16,telemetryPoints:5000,telemetryConcurrency:96,churnCycles:8,restartRequests:240},
};
const profileName=(process.env.QUALYNTRA_SCALE_PROFILE??'standard').trim().toLowerCase();
if(!Object.hasOwn(profiles,profileName))throw new Error('QUALYNTRA_SCALE_PROFILE must be smoke, standard, or stress.');
const base=profiles[profileName];
const number=(name,fallback,min=1,max=1_000_000)=>{const parsed=Number(process.env[name]??fallback);if(!Number.isInteger(parsed)||parsed<min||parsed>max)throw new Error(`${name} must be an integer between ${min} and ${max}.`);return parsed;};
const decimal=(name,fallback,min=0,max=1_000_000)=>{const parsed=Number(process.env[name]??fallback);if(!Number.isFinite(parsed)||parsed<min||parsed>max)throw new Error(`${name} must be a number between ${min} and ${max}.`);return parsed;};
const a=process.env.QUALYNTRA_SCALE_CONTROL_PLANE_A??'http://127.0.0.1:14317';
const b=process.env.QUALYNTRA_SCALE_CONTROL_PLANE_B??'http://127.0.0.1:14318';
const org=process.env.QUALYNTRA_SCALE_ORGANIZATION_ID??'ha-cert-org';
const token=(await readFile(process.env.QUALYNTRA_SCALE_API_TOKEN_FILE??'deploy/compose/.ha-secrets/api-token','utf8')).trim();
if(!token)throw new Error('Scale certification API token file is empty.');
const reportPath=process.env.QUALYNTRA_SCALE_REPORT_PATH??'artifacts/performance-scale-report.json';
const requestTimeoutMs=number('QUALYNTRA_SCALE_REQUEST_TIMEOUT_MS',15_000,100,120_000);
const config={
  apiRequests:number('QUALYNTRA_SCALE_API_REQUESTS',base.apiRequests,1,20_000),
  apiConcurrency:number('QUALYNTRA_SCALE_API_CONCURRENCY',base.apiConcurrency,1,512),
  idempotencyFanout:number('QUALYNTRA_SCALE_IDEMPOTENCY_FANOUT',base.idempotencyFanout,2,512),
  queueJobs:number('QUALYNTRA_SCALE_QUEUE_JOBS',base.queueJobs,1,50_000),
  workers:number('QUALYNTRA_SCALE_WORKERS',base.workers,1,128),
  artifactCount:number('QUALYNTRA_SCALE_ARTIFACT_COUNT',base.artifactCount,1,2_000),
  artifactBytes:number('QUALYNTRA_SCALE_ARTIFACT_BYTES',base.artifactBytes,1,8*1024*1024),
  artifactConcurrency:number('QUALYNTRA_SCALE_ARTIFACT_CONCURRENCY',base.artifactConcurrency,1,128),
  telemetryPoints:number('QUALYNTRA_SCALE_TELEMETRY_POINTS',base.telemetryPoints,1,50_000),
  telemetryConcurrency:number('QUALYNTRA_SCALE_TELEMETRY_CONCURRENCY',base.telemetryConcurrency,1,512),
  churnCycles:number('QUALYNTRA_SCALE_WORKER_CHURN_CYCLES',base.churnCycles,1,100),
  restartRequests:number('QUALYNTRA_SCALE_RESTART_REQUESTS',base.restartRequests,1,5_000),
  dbPoolPerReplica:number('QUALYNTRA_SCALE_DB_POOL_PER_REPLICA',12,1,200),
};
const thresholds={
  maxErrorRate:decimal('QUALYNTRA_SCALE_MAX_ERROR_RATE',0,0,1),
  apiP95Ms:decimal('QUALYNTRA_SCALE_API_P95_MS',2500,1,120_000),
  apiP99Ms:decimal('QUALYNTRA_SCALE_API_P99_MS',5000,1,120_000),
  apiMinRps:decimal('QUALYNTRA_SCALE_API_MIN_RPS',10,0,100_000),
  queueMinJobsPerSecond:decimal('QUALYNTRA_SCALE_QUEUE_MIN_JOBS_PER_SECOND',5,0,100_000),
  artifactMinMiBPerSecond:decimal('QUALYNTRA_SCALE_ARTIFACT_MIN_MIB_PER_SECOND',0.5,0,100_000),
  telemetryMinRps:decimal('QUALYNTRA_SCALE_TELEMETRY_MIN_RPS',15,0,100_000),
  restartSurvivorP95Ms:decimal('QUALYNTRA_SCALE_RESTART_SURVIVOR_P95_MS',3000,1,120_000),
};
const baseHeaders={authorization:`Bearer ${token}`,'x-qualyntra-organization-id':org};
const startedAt=new Date().toISOString();
const runToken=`${Date.now()}-${process.pid}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(value,message){if(!value)throw new Error(message);}
function quantile(values,q){if(!values.length)return 0;const sorted=[...values].sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(q*sorted.length)-1))]??0;}
function summary(samples,elapsedMs){const success=samples.filter(item=>item.ok);const durations=success.map(item=>item.durationMs);const errors=samples.length-success.length;return{samples:samples.length,successes:success.length,errors,errorRate:samples.length?errors/samples.length:0,durationMs:elapsedMs,throughputPerSecond:elapsedMs>0?success.length/(elapsedMs/1000):success.length,p50Ms:quantile(durations,0.50),p95Ms:quantile(durations,0.95),p99Ms:quantile(durations,0.99),maxMs:durations.length?Math.max(...durations):0};}
async function request(origin,route,init={}){const response=await fetch(`${origin}${route}`,{...init,headers:{...baseHeaders,...(init.headers??{})},signal:AbortSignal.timeout(requestTimeoutMs)});const text=await response.text();let body;try{body=text?JSON.parse(text):undefined;}catch{body=text;}if(!response.ok)throw new Error(`${init.method??'GET'} ${route} failed at ${origin}: ${response.status} ${String(text).slice(0,240)}`);return{status:response.status,body};}
async function ready(origin){for(let i=0;i<60;i++){try{const response=await fetch(`${origin}/ready`,{signal:AbortSignal.timeout(2000)});if(response.ok)return;}catch{}await sleep(1000);}throw new Error(`Control plane did not become ready: ${origin}`);}
async function timed(work){const start=performance.now();try{const value=await work();return{ok:true,durationMs:performance.now()-start,value};}catch(error){return{ok:false,durationMs:performance.now()-start,error:error instanceof Error?error.message:String(error)};}}
async function pool(total,concurrency,work){const results=new Array(total);let cursor=0;const workers=Array.from({length:Math.min(total,concurrency)},async()=>{for(;;){const index=cursor++;if(index>=total)return;results[index]=await timed(()=>work(index));}});await Promise.all(workers);return results;}
function gate(name,condition,violations=[]){return{name,status:condition?'pass':'fail',violations:condition?[]:violations};}
function metricGate(name,value,{errorRate,maxP95,maxP99,minThroughput}){const violations=[];if(errorRate!==undefined&&value.errorRate>errorRate)violations.push(`errorRate ${value.errorRate.toFixed(6)} exceeds ${errorRate}`);if(maxP95!==undefined&&value.p95Ms>maxP95)violations.push(`p95Ms ${value.p95Ms.toFixed(2)} exceeds ${maxP95}`);if(maxP99!==undefined&&value.p99Ms>maxP99)violations.push(`p99Ms ${value.p99Ms.toFixed(2)} exceeds ${maxP99}`);if(minThroughput!==undefined&&value.throughputPerSecond<minThroughput)violations.push(`throughputPerSecond ${value.throughputPerSecond.toFixed(2)} is below ${minThroughput}`);return gate(name,violations.length===0,violations);}
function child(command,args){return new Promise((resolve,reject)=>{const process=spawn(command,args,{stdio:'inherit'});process.on('error',reject);process.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited with status ${code}`)));});}

await Promise.all([ready(a),ready(b)]);
for(let i=0;i<8;i++)await Promise.all([request(a,'/api/v1/capabilities'),request(b,'/api/v1/capabilities')]);
const scenarios={};const gates=[];

const apiStart=performance.now();
const createdRuns=await pool(config.apiRequests,config.apiConcurrency,index=>request(index%2?a:b,'/api/v1/runs',{method:'POST',headers:{'content-type':'application/json','idempotency-key':`scale-run-${runToken}-${index}`},body:JSON.stringify({projectId:'scale-cert-project',runtime:{language:'typescript',runner:'playwright-test'}})}));
const apiSummary=summary(createdRuns,performance.now()-apiStart);scenarios.apiConcurrency={...apiSummary,concurrency:config.apiConcurrency,poolPressureRatio:config.apiConcurrency/(config.dbPoolPerReplica*2)};
gates.push(metricGate('apiConcurrency',apiSummary,{errorRate:thresholds.maxErrorRate,maxP95:thresholds.apiP95Ms,maxP99:thresholds.apiP99Ms,minThroughput:thresholds.apiMinRps}));
const successfulRuns=createdRuns.filter(item=>item.ok).map(item=>item.value.body.id);assert(successfulRuns.length>0,'API concurrency scenario produced no successful runs.');

const idemKey=`scale-idem-${runToken}`;const idemBody=JSON.stringify({projectId:'scale-cert-project',runtime:{language:'typescript',runner:'playwright-test'}});const idemResults=await Promise.all(Array.from({length:config.idempotencyFanout},(_,index)=>request(index%2?a:b,'/api/v1/runs',{method:'POST',headers:{'content-type':'application/json','idempotency-key':idemKey},body:idemBody})));const idemIds=new Set(idemResults.map(result=>result.body.id));const createdCount=idemResults.filter(result=>result.status===201).length;scenarios.atomicIdempotency={fanout:config.idempotencyFanout,uniqueRunIds:idemIds.size,createdResponses:createdCount,replayedResponses:idemResults.length-createdCount};gates.push(gate('atomicIdempotency',idemIds.size===1&&createdCount===1,[`expected one run id and one 201 response; got ${idemIds.size} ids and ${createdCount} created responses`]));

const capabilities={languages:['typescript'],runners:['playwright-test'],engines:['chromium'],labels:[`scale-${runToken}`]};const workerIds=Array.from({length:config.workers},(_,index)=>`worker_scale-${Date.now()}-${index}`);await Promise.all(workerIds.map((id,index)=>request(index%2?a:b,'/api/v1/agents/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,capabilities,maxConcurrency:1,state:'online'})})));
const churnStart=performance.now();const churnOps=[];for(let cycle=0;cycle<config.churnCycles;cycle++){for(const state of ['draining','online']){const batch=await pool(workerIds.length,Math.min(workerIds.length,32),(index)=>request(index%2?a:b,`/api/v1/agents/${workerIds[index]}/heartbeat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state})}));churnOps.push(...batch);}}scenarios.workerChurn=summary(churnOps,performance.now()-churnStart);gates.push(metricGate('workerChurn',scenarios.workerChurn,{errorRate:thresholds.maxErrorRate}));

const enqueueStart=performance.now();const enqueued=await pool(config.queueJobs,config.apiConcurrency,index=>request(index%2?a:b,'/api/v1/distributed/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request:{runId:`scale-job-${runToken}-${index}`,projectId:'scale-cert-project',runtime:{language:'typescript',runner:'playwright-test',engine:'chromium'}},requirements:{language:'typescript',runner:'playwright-test',engine:'chromium',labels:[`scale-${runToken}`]},maxAttempts:2})}));const enqueueSummary=summary(enqueued,performance.now()-enqueueStart);assert(enqueueSummary.errors===0,`Queue enqueue produced ${enqueueSummary.errors} errors.`);
const leasePayload=JSON.stringify({leaseMs:15000,workerStaleMs:120000});const completed=new Set();let leaseErrors=0;const drainStart=performance.now();
await Promise.all(workerIds.map(async(workerId,index)=>{const origin=index%2?a:b;let emptyPolls=0;while(completed.size<config.queueJobs){try{await request(origin,`/api/v1/agents/${workerId}/heartbeat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:'online'})});const lease=await request(origin,`/api/v1/agents/${workerId}/lease`,{method:'POST',headers:{'content-type':'application/json'},body:leasePayload});const job=lease.body.job;if(!job){emptyPolls++;if(emptyPolls>300)throw new Error(`Worker ${workerId} exceeded empty-poll budget while ${config.queueJobs-completed.size} jobs remained.`);await sleep(10);continue;}emptyPolls=0;if(completed.has(job.id))throw new Error(`Duplicate lease observed for completed job ${job.id}`);const now=new Date().toISOString();await request(origin,`/api/v1/agent-jobs/${job.id}/leases/${job.lease.id}/complete`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({result:{runId:job.runId,status:'passed',startedAt:now,finishedAt:new Date().toISOString()}})});completed.add(job.id);}catch(error){leaseErrors++;throw error;}}}));
const drainMs=performance.now()-drainStart;scenarios.queueScale={jobs:config.queueJobs,workers:config.workers,enqueue:enqueueSummary,drainDurationMs:drainMs,drainJobsPerSecond:drainMs>0?config.queueJobs/(drainMs/1000):config.queueJobs,duplicateCompletions:0,errors:leaseErrors};gates.push(gate('queueScale',completed.size===config.queueJobs&&leaseErrors===0&&scenarios.queueScale.drainJobsPerSecond>=thresholds.queueMinJobsPerSecond,[`completed ${completed.size}/${config.queueJobs}; errors=${leaseErrors}; drainJobsPerSecond=${scenarios.queueScale.drainJobsPerSecond.toFixed(2)} minimum=${thresholds.queueMinJobsPerSecond}`]));

const artifactPayload=Buffer.alloc(config.artifactBytes,0x51);const artifactStart=performance.now();const artifacts=await pool(config.artifactCount,config.artifactConcurrency,async index=>{const writeOrigin=index%2?a:b;const readOrigin=index%2?b:a;const uploaded=await request(writeOrigin,`/api/v1/artifacts?name=${encodeURIComponent(`scale-${runToken}-${index}.bin`)}&kind=attachment&runId=${encodeURIComponent(successfulRuns[index%successfulRuns.length])}`,{method:'POST',headers:{'content-type':'application/octet-stream'},body:artifactPayload});const verified=await request(readOrigin,`/api/v1/artifacts/${uploaded.body.id}/verify`);assert(verified.body.verified===true&&verified.body.sizeBytes===config.artifactBytes,`Cross-replica artifact verification failed for ${uploaded.body.id}.`);return uploaded.body.id;});const artifactMs=performance.now()-artifactStart;const artifactSummary=summary(artifacts,artifactMs);const artifactMiB=(config.artifactBytes*config.artifactCount)/(1024*1024);scenarios.artifactThroughput={...artifactSummary,totalMiB:artifactMiB,miBPerSecond:artifactMs>0?artifactMiB/(artifactMs/1000):artifactMiB,concurrency:config.artifactConcurrency};gates.push(gate('artifactThroughput',artifactSummary.errorRate<=thresholds.maxErrorRate&&scenarios.artifactThroughput.miBPerSecond>=thresholds.artifactMinMiBPerSecond,[`errorRate=${artifactSummary.errorRate}; MiB/s=${scenarios.artifactThroughput.miBPerSecond.toFixed(2)} minimum=${thresholds.artifactMinMiBPerSecond}`]));

const telemetryStart=performance.now();const telemetry=await pool(config.telemetryPoints,config.telemetryConcurrency,index=>request(index%2?a:b,'/api/v1/observability/metrics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:`metric_scale-${runToken}-${index}`,timestamp:new Date().toISOString(),name:'qualyntra.scale.certification.requests',kind:'counter',value:1,unit:'request',resource:{serviceName:'qualyntra-scale-certifier',instanceId:`host-${process.pid}`},attributes:{profile:profileName,replica:index%2?'a':'b'}})}));const telemetrySummary=summary(telemetry,performance.now()-telemetryStart);scenarios.telemetryVolume={...telemetrySummary,concurrency:config.telemetryConcurrency};gates.push(metricGate('telemetryVolume',telemetrySummary,{errorRate:thresholds.maxErrorRate,minThroughput:thresholds.telemetryMinRps}));

const restartStart=performance.now();const restartPromise=child('docker',['compose','-f','deploy/compose/docker-compose.ha.yml','-f','deploy/compose/docker-compose.scale.yml','restart','control-plane-a']);const survivor=await pool(config.restartRequests,Math.min(config.apiConcurrency,config.restartRequests),index=>request(b,'/api/v1/runs',{method:'POST',headers:{'content-type':'application/json','idempotency-key':`scale-survivor-${runToken}-${index}`},body:JSON.stringify({projectId:'scale-cert-project',runtime:{language:'typescript',runner:'playwright-test'}})}));await restartPromise;await ready(a);const restartSummary=summary(survivor,performance.now()-restartStart);scenarios.restartSurvivor={...restartSummary,restartedReplica:'control-plane-a',survivorReplica:'control-plane-b'};gates.push(metricGate('restartSurvivor',restartSummary,{errorRate:thresholds.maxErrorRate,maxP95:thresholds.restartSurvivorP95Ms}));

await Promise.all(workerIds.map((workerId,index)=>request(index%2?a:b,`/api/v1/agents/${workerId}/heartbeat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:'offline'})})));
await Promise.all([ready(a),ready(b)]);
const ok=gates.every(item=>item.status==='pass');const report={ok,profile:profileName,startedAt,finishedAt:new Date().toISOString(),configuration:{...config,requestTimeoutMs,controlPlanes:2,combinedPostgresPoolConnections:config.dbPoolPerReplica*2},thresholds,scenarios,gates};await mkdir(path.dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));console.log(`Performance/scale report: ${reportPath}`);if(!ok)process.exitCode=1;
