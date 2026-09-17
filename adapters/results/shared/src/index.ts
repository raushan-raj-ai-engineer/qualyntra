/**
 * File: adapters/results/shared/src/index.ts
 * Purpose: Provides dependency-free parsing helpers shared by external result adapters.
 * Author: Raushan Raj
 */
export function decodeXml(value:string):string{return value.replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
export function xmlAttrs(fragment:string):Record<string,string>{const out:Record<string,string>={};const re=/([\w:.-]+)\s*=\s*(["'])(.*?)\2/g;let match:RegExpExecArray|null;while((match=re.exec(fragment)))out[match[1]!]=decodeXml(match[3]??'');return out;}
export function stripXml(value:string):string{return decodeXml(value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());}
export function parseIsoDurationMs(value:string|undefined):number{if(!value)return 0;const hms=/^(\d+):(\d+):(\d+)(?:\.(\d+))?$/.exec(value);if(hms){const fraction=(hms[4]??'').padEnd(3,'0').slice(0,3);return Number(hms[1])*3600000+Number(hms[2])*60000+Number(hms[3])*1000+Number(fraction||0);}const seconds=Number(value);return Number.isFinite(seconds)?Math.max(0,Math.round(seconds*1000)):0;}
export function safeJson(content:string):unknown{try{return JSON.parse(content);}catch(error){throw new Error(`Invalid JSON result artifact: ${error instanceof Error?error.message:String(error)}`);}}
