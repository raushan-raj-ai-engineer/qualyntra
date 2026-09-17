/**
 * File: packages/contracts/src/governance.ts
 * Purpose: Defines vendor-neutral enterprise governance, tenancy, authorization, audit, release-policy, and secret-reference contracts.
 * Author: Raushan Raj
 */

export type TenantLevel='organization'|'workspace'|'project'|'environment';
export interface TenantScope {
  organizationId:string;
  workspaceId?:string;
  projectId?:string;
  environmentId?:string;
}

export type GovernancePermission=
  |'platform.read'
  |'execution.run'
  |'execution.worker'
  |'results.ingest'
  |'evaluation.run'
  |'governance.read'
  |'governance.manage'
  |'integrations.manage'
  |'notifications.manage'
  |'secrets.resolve'
  |'release.evaluate'
  |'release.approve'
  |'audit.read';

export interface RoleDefinition {
  id:string;
  displayName:string;
  permissions:GovernancePermission[];
  description?:string;
}

export interface RoleAssignment {
  roleId:string;
  scope:TenantScope;
}

export interface ActorIdentity {
  id:string;
  type:'user'|'service';
  assignments:RoleAssignment[];
  displayName?:string;
}

export interface AuthorizationRequest {
  actor:ActorIdentity;
  permission:GovernancePermission;
  resourceScope:TenantScope;
}

export interface AuthorizationDecision {
  allowed:boolean;
  reasons:string[];
  matchedRoleIds:string[];
}

export interface AuditRecord {
  id:string;
  sequence:number;
  timestamp:string;
  actorId:string;
  action:string;
  resource:string;
  outcome:'allowed'|'denied'|'succeeded'|'failed';
  correlationId?:string;
  scope?:TenantScope;
  metadata?:Record<string,unknown>;
  previousHash?:string;
  hash:string;
}

export interface AuditSink {
  append(record:Omit<AuditRecord,'sequence'|'previousHash'|'hash'>):Promise<AuditRecord>;
}
export interface AuditReader { list(scope?:TenantScope):Promise<AuditRecord[]>; }

export type PolicyOperator='eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'exists';
export type PolicySeverity='block'|'review';

export interface ReleaseRule {
  id:string;
  description:string;
  fact:string;
  operator:PolicyOperator;
  expected?:string|number|boolean;
  severity:PolicySeverity;
}

export interface ReleasePolicy {
  id:string;
  name:string;
  rules:ReleaseRule[];
  requiredApprovals?:number;
}

export interface EvidenceFact {
  key:string;
  value:string|number|boolean;
  evidenceRefs?:string[];
}

export interface ReleaseApproval {
  actorId:string;
  timestamp:string;
  scope:TenantScope;
}

export interface PolicyException {
  ruleId:string;
  reason:string;
  approvedBy:string;
  scope:TenantScope;
  expiresAt:string;
}

export interface RuleDecision {
  ruleId:string;
  outcome:'pass'|'fail'|'review'|'excepted';
  reason:string;
  evidenceRefs:string[];
}

export interface ReleaseDecision {
  policyId:string;
  status:'PASS'|'FAIL'|'REVIEW_REQUIRED';
  evaluatedAt:string;
  scope:TenantScope;
  rules:RuleDecision[];
  approvals:{required:number;present:number};
  reasons:string[];
}

export interface SecretReference {
  provider:string;
  key:string;
  version?:string;
}

export interface SecretResolver {
  readonly id:string;
  supports(reference:SecretReference):boolean;
  resolve(reference:SecretReference):Promise<string>;
}
