import {initializeApi,request} from './api/client';

type Workspace={updatedAt?:number;sessions:unknown[];tasks:unknown[];settings:Record<string,unknown>;uiState:Record<string,string>};
let pending:ReturnType<typeof setTimeout>|undefined;
let writes:Promise<unknown>=Promise.resolve();
function snapshot():Workspace{
 const uiState:Record<string,string>={};
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('cw.'))uiState[key]=localStorage.getItem(key)!;}
 const parse=(key:string,fallback:unknown)=>{try{return JSON.parse(uiState[key]||'null')??fallback}catch{return fallback}};
 return {sessions:parse('cw.sessions',[]) as unknown[],tasks:parse('cw.tasks',[]) as unknown[],settings:parse('cw.settings',{}) as Record<string,unknown>,uiState};
}
export async function bootstrapWorkspace(){
 await initializeApi();
 const local=snapshot();
 let remote:Workspace|undefined;
 try{remote=await request<Workspace>('/workspace')}catch(error){if((error as {status?:number}).status!==404)throw error;}
 const acknowledged=Number(localStorage.getItem('prototype.apiSavedAt')||0);
 if(remote && (!Object.keys(local.uiState).length || (remote.updatedAt||0)>acknowledged)){
  for(const [key,value] of Object.entries(remote.uiState||{}))if(key.startsWith('cw.')&&typeof value==='string')localStorage.setItem(key,value);
  localStorage.setItem('prototype.apiSavedAt',String(remote.updatedAt||0));
 }else if(Object.keys(local.uiState).length){const saved=await request<Workspace>('/workspace',{method:'PUT',body:local});localStorage.setItem('prototype.apiSavedAt',String(saved.updatedAt||0));}

}
export function scheduleWorkspaceSave(){
 clearTimeout(pending);
 pending=setTimeout(()=>{
  let body:Workspace;try{body=snapshot()}catch{return;}
  writes=writes.catch(()=>{}).then(async()=>{const saved=await request<Workspace>('/workspace',{method:'PUT',body});localStorage.setItem('prototype.apiSavedAt',String(saved.updatedAt||0))}).catch(()=>{
   window.dispatchEvent(new CustomEvent('workspace-api-error',{detail:'API persistence unavailable; browser copy retained.'}));
  });
 },100);
}
