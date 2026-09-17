/**
 * File: apps/dashboard/web/main.ts
 * Purpose: Boots the tenant-aware dashboard SPA, keeps scope only in memory, and routes all data access through the same-origin dashboard API boundary.
 * Author: Raushan Raj
 */
import {DashboardApiClient,loadAuthStatus,loadRuntimeConfig,type TenantScope} from './api.js';
import {createShell,renderRoute,ROUTES,type Route} from './ui.js';

function routeFromHash():Route{const value=location.hash.replace(/^#\/?/,'').split('?')[0] as Route;return ROUTES.some(item=>item.id===value)?value:'overview';}
async function boot():Promise<void>{
  const root=document.getElementById('app');if(!root)throw new Error('Dashboard root element is missing.');
  try{
    const [config,auth]=await Promise.all([loadRuntimeConfig(),loadAuthStatus()]);
    let scope:TenantScope={organizationId:config.defaultScope?.organizationId??'',workspaceId:config.defaultScope?.workspaceId,projectId:config.defaultScope?.projectId,environmentId:config.defaultScope?.environmentId};
    const api=new DashboardApiClient(config.apiBase,()=>scope);let renderSequence=0;
    const shell=createShell(root,{scope,authenticated:auth.authenticated,actorId:auth.actorId,onScope:next=>{scope=next;void load(routeFromHash());},onRoute:route=>{if(location.hash!==`#/${route}`)location.hash=`#/${route}`;else void load(route);}});
    const load=async(route:Route)=>{const seq=++renderSequence;await renderRoute(shell.main,shell.live,route,api);if(seq!==renderSequence)return;};
    const activate=()=>shell.activate(routeFromHash());window.addEventListener('hashchange',activate);activate();
  }catch(error){root.removeAttribute('aria-busy');root.replaceChildren();const message=document.createElement('div');message.className='error-box';message.textContent=error instanceof Error?error.message:'Dashboard failed to start.';root.append(message);}
}
void boot();
