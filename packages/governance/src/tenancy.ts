/**
 * File: packages/governance/src/tenancy.ts
 * Purpose: Enforces hierarchical organization, workspace, project, and environment tenancy boundaries.
 * Author: Raushan Raj
 */
import type { TenantScope } from '../../contracts/src/governance';

export function scopeContains(grant:TenantScope,target:TenantScope):boolean{
  if(grant.organizationId!==target.organizationId)return false;
  if(grant.workspaceId!==undefined&&grant.workspaceId!==target.workspaceId)return false;
  if(grant.projectId!==undefined&&grant.projectId!==target.projectId)return false;
  if(grant.environmentId!==undefined&&grant.environmentId!==target.environmentId)return false;
  return true;
}

export function validateScope(scope:TenantScope):void{
  if(!scope.organizationId.trim())throw new Error('organizationId is required');
  if(scope.projectId&&!scope.workspaceId)throw new Error('project scope requires workspaceId');
  if(scope.environmentId&&(!scope.workspaceId||!scope.projectId))throw new Error('environment scope requires workspaceId and projectId');
}

export function scopeKey(scope:TenantScope):string{
  validateScope(scope);
  return [scope.organizationId,scope.workspaceId,scope.projectId,scope.environmentId].filter(Boolean).join('/');
}
