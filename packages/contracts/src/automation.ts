/**
 * File: packages/contracts/src/automation.ts
 * Purpose: Defines vendor-neutral automation capabilities, executable plans, commands, and normalized outcomes across language/tool adapters.
 * Author: Raushan Raj
 */
import type { EvidenceRecord } from './evidence';
import type { FailureDetail } from './result';

export interface AutomationCapabilities {
  web:boolean;
  mobile:boolean;
  api:boolean;
  tracing:boolean;
  screenshots:boolean;
  networkInterception:boolean;
  visualComparison:boolean;
  accessibility:boolean;
  storageState:boolean;
}

export interface LocatorDescriptor {
  strategy:'role'|'label'|'text'|'testId'|'css'|'xpath'|'accessibilityId'|'custom';
  value:string;
  options?:Record<string,unknown>;
}

export type AutomationActionType='navigate'|'click'|'fill'|'select'|'check'|'screenshot'|'custom';

export interface AutomationCommand {
  id:string;
  type:AutomationActionType;
  locator?:LocatorDescriptor;
  value?:unknown;
  url?:string;
  metadata?:Record<string,unknown>;
}

export interface AutomationPlan {
  runId:string;
  engine:string;
  browser?:string;
  headless?:boolean;
  baseUrl?:string;
  remoteUrl?:string;
  allowRemote?:boolean;
  artifactDirectory?:string;
  tracing?:boolean;
  timeoutMs?:number;
  failFast?:boolean;
  commands:AutomationCommand[];
  metadata?:Record<string,unknown>;
}

export interface AutomationStepOutcome {
  commandId:string;
  action:AutomationActionType;
  status:'passed'|'failed';
  durationMs:number;
  failure?:FailureDetail;
}

export interface AutomationExecutionOutcome {
  runId:string;
  engine:string;
  status:'passed'|'failed'|'error';
  startedAt:string;
  finishedAt:string;
  steps:AutomationStepOutcome[];
  evidence:EvidenceRecord[];
  failure?:FailureDetail;
  metadata?:Record<string,unknown>;
}

export interface AutomationAdapter {
  readonly id:string;
  capabilities():AutomationCapabilities;
  describe():Record<string,unknown>;
}

export interface ExecutableAutomationAdapter extends AutomationAdapter {
  execute(plan:AutomationPlan):Promise<AutomationExecutionOutcome>;
}
