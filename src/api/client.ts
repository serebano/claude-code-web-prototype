import {appBase} from '../appBase';
const configured=(import.meta as ImportMeta & {env?:Record<string,string>}).env?.VITE_MOCK_API_BASE_URL;
const base=new URL(configured||appBase+'api/prototype/v1',location.origin);
if(base.origin!==location.origin)throw new Error('The prototype API must be same-origin. Use a local reverse proxy for the Node example.');
let readiness:Promise<void>|undefined;
export function initializeApi():Promise<void>{
 if(readiness)return readiness;
 const activation=(async()=>{
  if(configured)return; // Explicit same-origin server adapter; do not intercept it.
  if(!('serviceWorker' in navigator))throw new Error('This prototype API requires a secure browser origin with service worker support.');
  await navigator.serviceWorker.register(appBase+'mock-api-worker.js',{type:'module',scope:appBase});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);reject(new Error('Prototype API worker activation timed out.'))},10000);
   function changed(){if(navigator.serviceWorker.controller){clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve()}}
   navigator.serviceWorker.addEventListener('controllerchange',changed);changed();
  });
 })();
 let timer:ReturnType<typeof setTimeout>|undefined;
 readiness=Promise.race([activation,new Promise<void>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Prototype API worker initialization timed out.')),10000)})]).finally(()=>clearTimeout(timer));
 return readiness;
}
export class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message);this.name='ApiError'}}
export async function request<T=unknown>(path:string,options:{method?:string;body?:unknown;signal?:AbortSignal}={}):Promise<T>{
 await initializeApi();
 if(!path.startsWith('/')||path.startsWith('//')||path.includes('://'))throw new Error('Use a relative prototype API path.');
 const response=await fetch(base.pathname.replace(/\/$/,'')+path,{method:options.method||'GET',headers:options.body===undefined?undefined:{'Content-Type':'application/json'},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:options.signal,cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw new ApiError(response.status,data.error?.code||'API_ERROR',data.error?.message||'Prototype request failed.');
 return data as T;
}
export type RunInput={sessionId:string;prompt:string;permission:string;model:string;effort:string;channel:'primary'|'secondary'};
type Run={id:string;status:'pending'|'completed'|'cancelled';text?:string;activity?:string};
function pause(signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{
 if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return}
 const aborted=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);resolve()},100);
 signal?.addEventListener('abort',aborted,{once:true});
})}
export async function runResponse(input:RunInput,signal?:AbortSignal):Promise<{text:string;activity:string}>{
 signal?.throwIfAborted();
 // Keep creation observable even if Abort arrives in flight, then explicitly
 // cancel the created run; aborting fetch alone cannot cancel server work.
 const created=await request<{run:Run}>('/runs',{method:'POST',body:input});
 const cancel=()=>{void request('/runs/'+created.run.id,{method:'DELETE'}).catch(()=>{})};
 signal?.addEventListener('abort',cancel,{once:true});
 if(signal?.aborted){cancel();throw new DOMException('Aborted','AbortError')}
 try{
  for(;;){signal?.throwIfAborted();const {run}=await request<{run:Run}>('/runs/'+created.run.id,{signal});if(run.status==='completed')return {text:run.text!,activity:run.activity!};if(run.status==='cancelled')throw new DOMException('Aborted','AbortError');await pause(signal)}
 }finally{signal?.removeEventListener('abort',cancel)}
}
