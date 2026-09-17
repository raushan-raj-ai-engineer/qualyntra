/**
 * File: packages/security/src/redaction.ts
 * Purpose: Redacts configured sensitive keys recursively before logging, persistence, or reporting.
 * Author: Raushan Raj
 */
export function redact(value:unknown, sensitiveKeys:string[]):unknown { const keys=new Set(sensitiveKeys.map(k=>k.toLowerCase())); const visit=(v:unknown):unknown=>{ if(Array.isArray(v))return v.map(visit); if(v&&typeof v==='object'){ const out:Record<string,unknown>={}; for(const [k,item] of Object.entries(v as Record<string,unknown>)) out[k]=keys.has(k.toLowerCase())?'[REDACTED]':visit(item); return out; } return v; }; return visit(value); }

