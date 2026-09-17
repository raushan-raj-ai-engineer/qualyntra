/**
 * File: packages/governance/src/service.ts
 * Purpose: Coordinates authorization and policy evaluation with append-only audit evidence.
 * Author: Raushan Raj
 */
import type { AuditSink,AuthorizationRequest,EvidenceFact,PolicyException,ReleaseApproval,ReleaseDecision,ReleasePolicy,TenantScope } from '../../contracts/src/governance';
import { createId } from '../../core/src/ids';
import { RbacAuthorizer } from './rbac';
import { evaluateReleasePolicy } from './policy';
import { scopeKey } from './tenancy';

export class GovernanceService{
  constructor(private readonly authorizer:RbacAuthorizer,private readonly audit:AuditSink){}
  async authorize(request:AuthorizationRequest,correlationId=createId('corr')){
    const decision=this.authorizer.authorize(request);
    await this.audit.append({id:createId('audit'),timestamp:new Date().toISOString(),actorId:request.actor.id,action:`authorize:${request.permission}`,resource:scopeKey(request.resourceScope),outcome:decision.allowed?'allowed':'denied',correlationId,scope:request.resourceScope,metadata:{reasons:decision.reasons,matchedRoleIds:decision.matchedRoleIds}});
    return decision;
  }
  async evaluateRelease(input:{actorId:string;policy:ReleasePolicy;scope:TenantScope;facts:EvidenceFact[];approvals?:ReleaseApproval[];exceptions?:PolicyException[];correlationId?:string}):Promise<ReleaseDecision>{
    const decision=evaluateReleasePolicy(input);
    await this.audit.append({id:createId('audit'),timestamp:new Date().toISOString(),actorId:input.actorId,action:'release.evaluate',resource:`policy:${input.policy.id}`,outcome:decision.status==='FAIL'?'failed':'succeeded',correlationId:input.correlationId??createId('corr'),scope:input.scope,metadata:{status:decision.status,reasons:decision.reasons}});
    return decision;
  }
}
