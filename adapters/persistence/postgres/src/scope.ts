/**
 * File: adapters/persistence/postgres/src/scope.ts
 * Purpose: Normalizes hierarchical tenant scopes into non-null PostgreSQL keys and parameterized visibility predicates.
 * Author: Raushan Raj
 */
import type { TenantScope } from '../../../../packages/contracts/src/governance';
export interface StoredScope { organizationId:string; workspaceId:string; projectId:string; environmentId:string; }
export function storedScope(scope:TenantScope):StoredScope{return{organizationId:scope.organizationId,workspaceId:scope.workspaceId??'',projectId:scope.projectId??'',environmentId:scope.environmentId??''};}
export function restoredScope(row:any):TenantScope{const scope:TenantScope={organizationId:String(row.organization_id)};if(row.workspace_id)scope.workspaceId=String(row.workspace_id);if(row.project_id)scope.projectId=String(row.project_id);if(row.environment_id)scope.environmentId=String(row.environment_id);return scope;}
export function scopeParams(scope:TenantScope,start=1):{sql:string;params:string[]}{const s=storedScope(scope);return{sql:`organization_id=$${start} AND ($${start+1}='' OR workspace_id=$${start+1}) AND ($${start+2}='' OR project_id=$${start+2}) AND ($${start+3}='' OR environment_id=$${start+3})`,params:[s.organizationId,s.workspaceId,s.projectId,s.environmentId]};}
export function exactScopeParams(scope:TenantScope):string[]{const s=storedScope(scope);return[s.organizationId,s.workspaceId,s.projectId,s.environmentId];}
