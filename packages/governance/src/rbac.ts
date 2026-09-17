/**
 * File: packages/governance/src/rbac.ts
 * Purpose: Implements deny-by-default role-based authorization scoped to enterprise tenancy boundaries.
 * Author: Raushan Raj
 */
import type { AuthorizationDecision,AuthorizationRequest,RoleDefinition } from '../../contracts/src/governance';
import { scopeContains,validateScope } from './tenancy';

export class RoleCatalog{
  private readonly roles=new Map<string,RoleDefinition>();
  constructor(roles:RoleDefinition[]=[]){for(const role of roles)this.register(role);}
  register(role:RoleDefinition):void{
    if(!role.id.trim())throw new Error('Role id is required');
    if(this.roles.has(role.id))throw new Error(`Role already registered: ${role.id}`);
    if(role.permissions.length===0)throw new Error(`Role must grant at least one permission: ${role.id}`);
    this.roles.set(role.id,{...role,permissions:[...new Set(role.permissions)]});
  }
  get(id:string):RoleDefinition|undefined{return this.roles.get(id);}
  list():RoleDefinition[]{return [...this.roles.values()].map(r=>({...r,permissions:[...r.permissions]}));}
}

export class RbacAuthorizer{
  constructor(private readonly catalog:RoleCatalog){}
  authorize(request:AuthorizationRequest):AuthorizationDecision{
    validateScope(request.resourceScope);
    const reasons:string[]=[];const matchedRoleIds:string[]=[];
    for(const assignment of request.actor.assignments){
      validateScope(assignment.scope);
      const role=this.catalog.get(assignment.roleId);
      if(!role){reasons.push(`Unknown role: ${assignment.roleId}`);continue;}
      if(!role.permissions.includes(request.permission))continue;
      if(!scopeContains(assignment.scope,request.resourceScope))continue;
      matchedRoleIds.push(role.id);
    }
    if(matchedRoleIds.length>0)return{allowed:true,reasons:[`Permission granted: ${request.permission}`],matchedRoleIds};
    if(reasons.length===0)reasons.push(`Permission denied: ${request.permission}`);
    return{allowed:false,reasons,matchedRoleIds:[]};
  }
}
