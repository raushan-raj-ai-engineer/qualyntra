/**
 * File: packages/observability/src/alerts.ts
 * Purpose: Evaluates tenant-scoped metric alert rules with cooldowns and dispatches normalized notifications.
 * Author: Raushan Raj
 */
import type { AlertRecord,AlertRule,MetricPoint,NotificationRequest,TenantScope } from '../../contracts/src';
import { createId } from '../../core/src/ids';
import { scopeContains,scopeKey } from '../../governance/src/tenancy';
import type { NotificationService } from '../../notifications/src/service';

export interface AlertStateStore { lastTriggered(key:string):Promise<number|undefined>; markTriggered(key:string,at:number):Promise<void>; tryMarkTriggered?(key:string,at:number,cooldownMs:number):Promise<boolean>; append(record:AlertRecord):Promise<void>; list(scope?:TenantScope,limit?:number):Promise<AlertRecord[]>; }
export class InMemoryAlertStateStore implements AlertStateStore {
  private readonly last=new Map<string,number>();private readonly records:AlertRecord[]=[];
  async lastTriggered(key:string){return this.last.get(key);}async markTriggered(key:string,at:number){this.last.set(key,at);}async tryMarkTriggered(key:string,at:number,cooldownMs:number){const last=this.last.get(key);if(last!==undefined&&at-last<cooldownMs)return false;this.last.set(key,at);return true;}async append(record:AlertRecord){this.records.push(structuredClone(record));}
  async list(scope?:TenantScope,limit=200){const safe=Math.min(Math.max(limit,1),1000);const values=scope?this.records.filter(record=>record.scope&&scopeContains(scope,record.scope)):this.records;return structuredClone(values.slice(-safe).reverse());}
}
function compare(value:number,operator:AlertRule['operator'],threshold:number):boolean{switch(operator){case'gt':return value>threshold;case'gte':return value>=threshold;case'lt':return value<threshold;case'lte':return value<=threshold;case'eq':return value===threshold;case'neq':return value!==threshold;}}
function ruleMatchesScope(rule:AlertRule,point:MetricPoint):boolean{return !rule.scope||Boolean(point.scope&&scopeContains(rule.scope,point.scope));}
function key(rule:AlertRule,point:MetricPoint):string{return `${rule.id}:${point.scope?scopeKey(point.scope):'platform'}`;}
export class AlertEngine {
  constructor(private readonly rules:AlertRule[],private readonly state:AlertStateStore,private readonly notifications?:NotificationService){}
  async evaluate(point:MetricPoint):Promise<AlertRecord[]>{const triggered:AlertRecord[]=[];for(const rule of this.rules){if(rule.enabled===false||rule.metric!==point.name||!ruleMatchesScope(rule,point)||!compare(point.value,rule.operator,rule.threshold))continue;const now=Date.now();const stateKey=key(rule,point);const cooldownMs=rule.cooldownSeconds*1000;const claimed=this.state.tryMarkTriggered?await this.state.tryMarkTriggered(stateKey,now,cooldownMs):await (async()=>{const last=await this.state.lastTriggered(stateKey);if(last!==undefined&&now-last<cooldownMs)return false;await this.state.markTriggered(stateKey,now);return true;})();if(!claimed)continue;const record:AlertRecord={id:createId('alert'),ruleId:rule.id,ruleName:rule.name,metric:point.name,observedValue:point.value,threshold:rule.threshold,severity:rule.severity,triggeredAt:new Date(now).toISOString(),scope:point.scope,correlationId:point.correlationId,status:rule.notificationAdapterIds.length?'triggered':'notified'};if(rule.notificationAdapterIds.length&&this.notifications&&point.scope){const results:Record<string,'sent'|'failed'>={};for(const adapterId of rule.notificationAdapterIds){const request:NotificationRequest={id:createId('notification'),title:`${rule.severity.toUpperCase()}: ${rule.name}`,message:`${point.name} ${rule.operator} ${rule.threshold}; observed ${point.value}.`,severity:rule.severity,scope:point.scope,correlationId:point.correlationId,dedupeKey:`alert:${rule.id}:${record.triggeredAt}`,attributes:{metric:point.name,value:point.value,threshold:rule.threshold}};try{const response=await this.notifications.send(adapterId,request);results[adapterId]=response.ok?'sent':'failed';}catch{results[adapterId]='failed';}}record.notificationResults=results;record.status=Object.values(results).every(v=>v==='sent')?'notified':'notification_failed';}await this.state.append(record);triggered.push(structuredClone(record));}return triggered;}
}
