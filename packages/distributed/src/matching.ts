/**
 * File: packages/distributed/src/matching.ts
 * Purpose: Matches distributed execution requirements against worker capabilities without depending on any scheduler vendor.
 * Author: Raushan Raj
 */
import type { JobRequirements,WorkerCapabilities } from '../../contracts/src/distributed';
function includes(values:string[]|undefined,value:string|undefined):boolean{return !value||Boolean(values?.includes(value));}
export function workerMatches(capabilities:WorkerCapabilities,requirements:JobRequirements):boolean{
  if(!includes(capabilities.languages,requirements.language))return false;
  if(!includes(capabilities.runners,requirements.runner))return false;
  if(!includes(capabilities.engines,requirements.engine))return false;
  if(!includes(capabilities.operatingSystems,requirements.operatingSystem))return false;
  const labels=new Set(capabilities.labels??[]);return (requirements.labels??[]).every(label=>labels.has(label));
}
