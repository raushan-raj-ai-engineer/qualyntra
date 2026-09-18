/**
 * File: scripts/validate-deployment.mjs
 * Purpose: Performs dependency-free static validation of Qualyntra deployment assets when Docker, Helm, or Kubernetes CLIs are unavailable.
 * Author: Raushan Raj
 */
import fs from 'node:fs';import path from 'node:path';
const failures=[];const read=p=>fs.readFileSync(p,'utf8');const requireText=(file,needles)=>{const text=read(file);for(const needle of needles)if(!text.includes(needle))failures.push(`${file}: missing ${needle}`);};
for(const file of ['deploy/docker/control-plane.Dockerfile','deploy/docker/dashboard.Dockerfile','deploy/compose/docker-compose.yml','deploy/helm/qualyntra/Chart.yaml','deploy/helm/qualyntra/values.yaml'])if(!fs.existsSync(file))failures.push(`${file}: missing`);
for(const file of ['deploy/docker/control-plane.Dockerfile','deploy/docker/dashboard.Dockerfile','apps/agent/Dockerfile'])requireText(file,['USER qualyntra','HEALTHCHECK']);
requireText('deploy/compose/docker-compose.yml',['read_only: true','cap_drop: ["ALL"]','no-new-privileges:true','condition: service_healthy']);
for(const file of fs.readdirSync('deploy/helm/qualyntra/templates').filter(f=>f.endsWith('.yaml')).map(f=>path.join('deploy/helm/qualyntra/templates',f))){const text=read(file);if(!/Purpose:/.test(text)||!/Author:\s*Raushan Raj/.test(text))failures.push(`${file}: missing Purpose/Author`);}
const chart=read('deploy/helm/qualyntra/templates/control-plane.yaml')+read('deploy/helm/qualyntra/templates/dashboard.yaml')+read('deploy/helm/qualyntra/templates/agent.yaml');for(const token of ['runAsNonRoot: true','readOnlyRootFilesystem: true','allowPrivilegeEscalation: false','capabilities: { drop: ["ALL"] }','startupProbe:','livenessProbe:','readinessProbe:','automountServiceAccountToken: false'])if(!chart.includes(token))failures.push(`helm workloads: missing ${token}`);
for(const forbidden of [/AKIA[0-9A-Z]{16}/,/-----BEGIN .*PRIVATE KEY-----/,/api[_-]?key\s*:\s*[^\s{]/i])for(const file of ['deploy/compose/docker-compose.yml','deploy/helm/qualyntra/values.yaml'])if(forbidden.test(read(file)))failures.push(`${file}: possible embedded credential`);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Deployment asset validation passed.');
