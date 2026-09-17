/**
 * File: packages/governance/src/policy.ts
 * Purpose: Evaluates evidence-backed release policies, expiring exceptions, and approval requirements without opaque scoring.
 * Author: Raushan Raj
 */
import type { EvidenceFact,PolicyException,ReleaseApproval,ReleaseDecision,ReleasePolicy,ReleaseRule,RuleDecision,TenantScope } from '../../contracts/src/governance';
import { scopeContains,validateScope } from './tenancy';

function compare(actual:string|number|boolean|undefined,rule:ReleaseRule):boolean{
  if(rule.operator==='exists')return actual!==undefined;
  if(actual===undefined||rule.expected===undefined)return false;
  switch(rule.operator){
    case'eq':return actual===rule.expected;
    case'neq':return actual!==rule.expected;
    case'gt':return typeof actual==='number'&&typeof rule.expected==='number'&&actual>rule.expected;
    case'gte':return typeof actual==='number'&&typeof rule.expected==='number'&&actual>=rule.expected;
    case'lt':return typeof actual==='number'&&typeof rule.expected==='number'&&actual<rule.expected;
    case'lte':return typeof actual==='number'&&typeof rule.expected==='number'&&actual<=rule.expected;
  }
}
function activeException(ruleId:string,scope:TenantScope,exceptions:PolicyException[],now:number):PolicyException|undefined{
  return exceptions.find(item=>item.ruleId===ruleId&&Date.parse(item.expiresAt)>now&&scopeContains(item.scope,scope));
}

export function evaluateReleasePolicy(input:{policy:ReleasePolicy;scope:TenantScope;facts:EvidenceFact[];approvals?:ReleaseApproval[];exceptions?:PolicyException[];now?:Date}):ReleaseDecision{
  validateScope(input.scope);
  const factMap=new Map(input.facts.map(f=>[f.key,f]));const now=input.now??new Date();const nowMs=now.getTime();
  const rules:RuleDecision[]=input.policy.rules.map(rule=>{
    const fact=factMap.get(rule.fact);const exception=activeException(rule.id,input.scope,input.exceptions??[],nowMs);
    if(exception)return{ruleId:rule.id,outcome:'excepted',reason:`Exception approved by ${exception.approvedBy}: ${exception.reason}`,evidenceRefs:fact?.evidenceRefs??[]};
    const passed=compare(fact?.value,rule);
    if(passed)return{ruleId:rule.id,outcome:'pass',reason:`Rule satisfied: ${rule.description}`,evidenceRefs:fact?.evidenceRefs??[]};
    return{ruleId:rule.id,outcome:rule.severity==='block'?'fail':'review',reason:fact?`Rule not satisfied: ${rule.description}`:`Required fact missing: ${rule.fact}`,evidenceRefs:fact?.evidenceRefs??[]};
  });
  const approvals=(input.approvals??[]).filter(a=>scopeContains(a.scope,input.scope));const required=Math.max(0,input.policy.requiredApprovals??0);
  const distinctApprovers=new Set(approvals.map(a=>a.actorId)).size;
  const reasons:string[]=[];
  if(rules.some(r=>r.outcome==='fail'))reasons.push('One or more blocking release rules failed.');
  if(rules.some(r=>r.outcome==='review'))reasons.push('One or more release rules require review.');
  if(distinctApprovers<required)reasons.push(`Required approvals not met: ${distinctApprovers}/${required}.`);
  const status:ReleaseDecision['status']=rules.some(r=>r.outcome==='fail')?'FAIL':(rules.some(r=>r.outcome==='review')||distinctApprovers<required)?'REVIEW_REQUIRED':'PASS';
  if(reasons.length===0)reasons.push('All release rules and approval requirements passed.');
  return{policyId:input.policy.id,status,evaluatedAt:now.toISOString(),scope:input.scope,rules,approvals:{required,present:distinctApprovers},reasons};
}
