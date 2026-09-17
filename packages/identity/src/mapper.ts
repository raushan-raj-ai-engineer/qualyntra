/**
 * File: packages/identity/src/mapper.ts
 * Purpose: Maps verified enterprise identity claims into tenant-scoped Qualyntra actors and RBAC assignments without vendor-specific claim assumptions.
 * Author: Raushan Raj
 */
import type { EnterpriseIdentity,IdentityMappingPolicy,VerifiedJwt } from '../../contracts/src/identity';
import type { TenantScope } from '../../contracts/src/governance';
import { validateScope } from '../../governance/src/tenancy';

function stringClaim(claims:Record<string,unknown>,name:string|undefined):string|undefined{if(!name)return undefined;const value=claims[name];return typeof value==='string'&&value.trim()?value.trim():undefined;}
function listClaim(value:unknown):string[]{if(typeof value==='string')return[value];if(Array.isArray(value))return [...new Set(value.filter((x):x is string=>typeof x==='string'&&Boolean(x.trim())).map(x=>x.trim()))];return[];}

export class IdentityMapper{
  constructor(private readonly policy:IdentityMappingPolicy){if(!policy.organizationClaim.trim())throw new Error('Identity organization claim is required');}
  map(jwt:VerifiedJwt):EnterpriseIdentity{
    const organizationId=stringClaim(jwt.claims,this.policy.organizationClaim);if(!organizationId)throw new Error(`Verified identity is missing organization claim: ${this.policy.organizationClaim}`);
    const scope:TenantScope={organizationId,workspaceId:stringClaim(jwt.claims,this.policy.workspaceClaim),projectId:stringClaim(jwt.claims,this.policy.projectClaim),environmentId:stringClaim(jwt.claims,this.policy.environmentClaim)};validateScope(scope);
    const groups=listClaim(jwt.claims[this.policy.groupClaim]);const roleIds=[...new Set(this.policy.roleMappings.filter(mapping=>groups.includes(mapping.group)).map(mapping=>mapping.roleId))];
    const displayName=this.policy.displayNameClaims.map(name=>stringClaim(jwt.claims,name)).find(Boolean);
    return{actor:{id:jwt.subject,type:this.policy.serviceSubjects.includes(jwt.subject)?'service':'user',assignments:roleIds.map(roleId=>({roleId,scope:{...scope}})),displayName},scope,issuer:jwt.issuer,subject:jwt.subject,expiresAt:jwt.expiresAt,tokenId:jwt.tokenId,groups};
  }
}
