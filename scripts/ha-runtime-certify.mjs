/**
 * File: scripts/ha-runtime-certify.mjs
 * Purpose: Performs live two-control-plane certification for atomic idempotency, shared artifact bytes, queue lease arbitration, and restart recovery.
 * Author: Raushan Raj
 */
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const a=process.env.QUALYNTRA_HA_CONTROL_PLANE_A??'http://127.0.0.1:14317';
const b=process.env.QUALYNTRA_HA_CONTROL_PLANE_B??'http://127.0.0.1:14318';
const org=process.env.QUALYNTRA_HA_ORGANIZATION_ID??'ha-cert-org';
const token=(await readFile(process.env.QUALYNTRA_HA_API_TOKEN_FILE??'deploy/compose/.ha-secrets/api-token','utf8')).trim();
const compose=['compose','-f','deploy/compose/docker-compose.ha.yml'];
const baseHeaders={authorization:`Bearer ${token}`,'x-qualyntra-organization-id':org};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(value,message){if(!value)throw new Error(message);}
async function request(origin,path,init={}){const response=await fetch(`${origin}${path}`,{...init,headers:{...baseHeaders,...(init.headers??{})}});const text=await response.text();let body;try{body=text?JSON.parse(text):undefined;}catch{body=text;}if(!response.ok)throw new Error(`${init.method??'GET'} ${path} failed at ${origin}: ${response.status} ${text.slice(0,300)}`);return{status:response.status,body};}
async function ready(origin){for(let i=0;i<40;i++){try{const response=await fetch(`${origin}/ready`);if(response.ok)return;}catch{}await sleep(1000);}throw new Error(`Control plane did not become ready: ${origin}`);}
await Promise.all([ready(a),ready(b)]);

const runBody={projectId:'ha-cert-project',runtime:{language:'typescript',runner:'playwright-test'}};
const idem=`ha-${Date.now()}`;
const [runA,runB]=await Promise.all([request(a,'/api/v1/runs',{method:'POST',headers:{'content-type':'application/json','idempotency-key':idem},body:JSON.stringify(runBody)}),request(b,'/api/v1/runs',{method:'POST',headers:{'content-type':'application/json','idempotency-key':idem},body:JSON.stringify(runBody)})]);
assert(runA.body.id===runB.body.id,'Concurrent idempotent run creation returned different run ids.');
assert([runA.status,runB.status].sort().join(',')==='200,201','Expected one created and one replayed idempotent response.');

const artifact=await request(a,`/api/v1/artifacts?name=ha-cert.txt&kind=attachment&runId=${encodeURIComponent(runA.body.id)}`,{method:'POST',headers:{'content-type':'text/plain'},body:'shared-artifact-bytes'});
const verified=await request(b,`/api/v1/artifacts/${artifact.body.id}/verify`);
assert(verified.body.verified===true&&verified.body.sizeBytes===21,'Second replica could not verify artifact bytes written through first replica.');

const capabilities={languages:['typescript'],runners:['playwright-test'],engines:['chromium'],labels:['ha']};
await request(a,'/api/v1/agents/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'worker_ha-a',capabilities,maxConcurrency:1,state:'online'})});
await request(b,'/api/v1/agents/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'worker_ha-b',capabilities,maxConcurrency:1,state:'online'})});
const job1=await request(a,'/api/v1/distributed/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request:{runId:`ha-race-${Date.now()}`,projectId:'ha-cert-project',runtime:{language:'typescript',runner:'playwright-test',engine:'chromium'}},requirements:{language:'typescript',runner:'playwright-test',engine:'chromium',labels:['ha']},maxAttempts:2})});
const leasePayload=JSON.stringify({leaseMs:5000,workerStaleMs:60000});
const [leaseA,leaseB]=await Promise.all([request(a,'/api/v1/agents/worker_ha-a/lease',{method:'POST',headers:{'content-type':'application/json'},body:leasePayload}),request(b,'/api/v1/agents/worker_ha-b/lease',{method:'POST',headers:{'content-type':'application/json'},body:leasePayload})]);
const leased=[{origin:a,worker:'worker_ha-a',job:leaseA.body.job},{origin:b,worker:'worker_ha-b',job:leaseB.body.job}].filter(item=>item.job);
assert(leased.length===1&&leased[0].job.id===job1.body.id,'SKIP LOCKED arbitration did not yield exactly one lease.');
const winner=leased[0];
await request(winner.origin,`/api/v1/agent-jobs/${winner.job.id}/leases/${winner.job.lease.id}/complete`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({result:{runId:winner.job.runId,status:'passed',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}})});

const job2=await request(a,'/api/v1/distributed/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request:{runId:`ha-restart-${Date.now()}`,projectId:'ha-cert-project',runtime:{language:'typescript',runner:'playwright-test',engine:'chromium'}},requirements:{language:'typescript',runner:'playwright-test',engine:'chromium',labels:['ha']},maxAttempts:2})});
await request(a,'/api/v1/agents/worker_ha-a/heartbeat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:'online'})});
const beforeRestart=await request(a,'/api/v1/agents/worker_ha-a/lease',{method:'POST',headers:{'content-type':'application/json'},body:leasePayload});
assert(beforeRestart.body.job?.id===job2.body.id,'Restart recovery setup failed to lease the expected job.');
const restart=spawnSync('docker',[...compose,'restart','control-plane-a'],{stdio:'inherit'});assert(restart.status===0,'Docker restart of control-plane-a failed.');
await ready(a);await sleep(7000);
await request(b,'/api/v1/agents/worker_ha-b/heartbeat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:'online'})});
let recovered;for(let i=0;i<8&&!recovered;i++){const attempt=await request(b,'/api/v1/agents/worker_ha-b/lease',{method:'POST',headers:{'content-type':'application/json'},body:leasePayload});recovered=attempt.body.job;if(!recovered)await sleep(1500);}
assert(recovered?.id===job2.body.id,'Expired lease was not recovered after control-plane restart.');
console.log(JSON.stringify({ok:true,atomicIdempotency:true,sharedArtifactVerification:true,exclusiveLease:true,restartRecovery:true},null,2));
