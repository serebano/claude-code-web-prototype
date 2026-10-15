import {test,expect} from '@playwright/test';
import {createMockApi,createMemoryStore,PREFIX} from '../public/mock-api-core.js';
function api(delayMs=0){let time=1000,sequence=0;const handle=createMockApi({store:createMemoryStore(),now:()=>time,id:()=>`id-${++sequence}`,delayMs});return {advance:(delta:number)=>time+=delta,handle,async call(path:string,method='GET',body?:unknown){const response=await handle(new Request('http://localhost'+PREFIX+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));return {status:response.status,data:await response.json()}}}}

test('API health and workspace migration preserve raw preferences and normalize entities',async()=>{
 const service=api();expect((await service.call('/health')).data).toMatchObject({ok:true,executesCommands:false});expect((await service.call('/workspace')).status).toBe(404);
 const uiState={'cw.sessions':JSON.stringify([{id:'welcome',title:'Existing',messages:[]}]),'cw.settings':JSON.stringify({font:'Serif'}),'cw.tasks':'[]','cw.files':JSON.stringify({'src/demo.ts':'export const demo = true;'})};
 expect((await service.call('/workspace','PUT',{uiState})).status).toBe(200);
 const loaded=(await service.call('/workspace')).data;expect(loaded.uiState).toEqual(uiState);expect(loaded.sessions[0].title).toBe('Existing');expect(loaded.settings.font).toBe('Serif');
 expect((await service.call('/files?path=src%2Fdemo.ts')).data.content).toContain('export const demo');
 await service.call('/settings','PATCH',{font:'Sans'});const patched=(await service.call('/workspace')).data;expect(patched.updatedAt).toBeGreaterThan(loaded.updatedAt);expect(JSON.parse(patched.uiState['cw.settings']).font).toBe('Sans');
});

test('API sessions create, patch, fork independently and delete with coherent errors',async()=>{
 const service=api();const created=await service.call('/sessions','POST',{title:'Original',project:'demo'});expect(created.status).toBe(201);const id=created.data.session.id;
 await service.call('/sessions/'+id,'PATCH',{title:'Renamed',archived:true,pinned:true});expect((await service.call('/sessions/'+id)).data.session).toMatchObject({title:'Renamed',archived:true,pinned:true});
 const fork=(await service.call('/sessions/'+id+'/fork','POST',{})).data.session;expect(fork.id).not.toBe(id);expect(fork.archived).toBe(false);
 await service.call('/sessions/'+fork.id,'PATCH',{title:'Independent'});expect((await service.call('/sessions/'+id)).data.session.title).toBe('Renamed');
 expect((await service.call('/sessions/'+id,'DELETE')).data.deleted).toBe(true);expect((await service.call('/sessions/'+id)).status).toBe(404);
 expect((await service.call('/sessions','POST',{title:''})).status).toBe(400);expect((await service.call('/sessions/'+fork.id,'PATCH',{id:'replace'})).status).toBe(400);
});

test('API run completion appends one reply, exposes an SSE snapshot and supports cancellation',async()=>{
 const service=api(1400);const id=(await service.call('/sessions','POST',{title:'Conversation'})).data.session.id;
 const created=await service.call('/sessions/'+id+'/messages','POST',{prompt:'Plan a refactor',permission:'Plan'});expect(created.status).toBe(202);const runId=created.data.run.id;
 expect((await service.call('/runs/'+runId)).data.run.status).toBe('pending');service.advance(1400);
 expect((await service.call('/runs/'+runId)).data.run).toMatchObject({status:'completed',activity:'Demo response · no tools executed'});
 await service.call('/runs/'+runId);expect((await service.call('/sessions/'+id)).data.session.messages).toHaveLength(2);
 const sse=await service.handle(new Request('http://localhost'+PREFIX+'/runs/'+runId+'/events'));expect(sse.headers.get('Content-Type')).toBe('text/event-stream');expect(await sse.text()).toContain('event: completed');
 const cancelled=(await service.call('/runs','POST',{sessionId:id,prompt:'Do not complete'})).data.run.id;await service.call('/runs/'+cancelled,'DELETE');service.advance(5000);expect((await service.call('/runs/'+cancelled)).data.run.status).toBe('cancelled');expect((await service.call('/sessions/'+id)).data.session.messages).toHaveLength(2);
 expect((await service.call('/runs/constructor')).status).toBe(404);
});

test('API typed event subset accepts user events and interrupts only matching session runs',async()=>{
 const service=api(1400);const id=(await service.call('/sessions','POST',{title:'Events'})).data.session.id;
 const accepted=await service.call('/sessions/'+id+'/events','POST',{events:[{payload:{type:'user',uuid:'event-1',session_id:id,parent_tool_use_id:null,message:{role:'user',content:'A user message'}}}]});expect(accepted.status).toBe(202);
 const other=(await service.call('/runs','POST',{sessionId:'other',prompt:'Other conversation'})).data.run.id;
 const stopped=await service.call('/sessions/'+id+'/events','POST',{events:[{payload:{type:'control_request',request_id:'interrupt-1',request:{subtype:'interrupt',cancel_queued:true}}}]});expect(stopped.data.accepted[0].cancelled).toHaveLength(1);expect((await service.call('/runs/'+other)).data.run.status).toBe('pending');
 const bad=await service.call('/sessions/'+id+'/events','POST',{events:[{payload:{type:'control_request',request_id:'bad',request:{subtype:'execute_shell'}}}]});expect(bad.status).toBe(422);
});

test('API virtual files validate traversal and terminal never executes arbitrary commands',async()=>{
 const service=api();expect((await service.call('/files?path=src%2Fdemo.ts','PUT',{content:'example'})).data).toMatchObject({virtual:true,content:'example'});expect((await service.call('/files')).data.files.map((file:{path:string})=>file.path)).toContain('src/demo.ts');
 for(const path of ['../secret','/etc/passwd','src/../../secret','constructor','src\\secret'])expect((await service.call('/files?path='+encodeURIComponent(path),'PUT',{content:'x'})).status).toBe(400);
 for(const command of ['rm -rf /','curl https://example.com','$(whoami)','pwd'])expect((await service.call('/terminal','POST',{command})).data).toMatchObject({simulated:true,executed:false});
 expect((await service.call('/terminal','POST',{command:'pwd'})).data.output).toBe('/demo/acme-dashboard');
 expect((await service.call('/files?path=missing')).status).toBe(404);
});

test('API tasks and settings validate data, persist patches and reject malformed JSON',async()=>{
 const service=api();const task=(await service.call('/tasks','POST',{name:'Daily review',time:'09:00'})).data.task;
 await service.call('/tasks/'+task.id,'PATCH',{enabled:false,time:'10:00'});expect((await service.call('/tasks/'+task.id)).data.task).toMatchObject({enabled:false,time:'10:00'});await service.call('/tasks/'+task.id,'DELETE');expect((await service.call('/tasks')).data.tasks).toEqual([]);
 await service.call('/settings','PATCH',{font:'Serif',reduceMotion:true});expect((await service.call('/settings')).data.settings).toEqual({font:'Serif',reduceMotion:true});expect((await service.call('/settings','PATCH',{font:123})).status).toBe(400);
 for(const raw of ['{broken','[]','{"__proto__":{"polluted":true}}']){const response=await service.handle(new Request('http://localhost'+PREFIX+'/settings',{method:'PATCH',body:raw}));expect(response.status).toBe(400);expect(await response.json()).toHaveProperty('error.code','INVALID_REQUEST')}
});

test('API serializes concurrent writes without dropping sessions',async()=>{
 const service=api();await Promise.all(Array.from({length:20},(_,i)=>service.call('/sessions','POST',{title:'Session '+i})));expect((await service.call('/sessions')).data.sessions).toHaveLength(20);
});

test('browser endpoints are handled by the persistent service worker',async({page})=>{
 await page.goto('/');await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=> (await fetch('/api/prototype/v1/workspace')).status)).toBe(200);
 const result=await page.evaluate(async()=>{const request=async(path:string,method='GET',body?:unknown)=>{const response=await fetch('/api/prototype/v1'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()}};const health=await request('/health');await request('/files?path=browser-test.txt','PUT',{content:'IndexedDB retained'});return {health,controller:!!navigator.serviceWorker.controller}});
 expect(result.controller).toBe(true);expect(result.health.data).toMatchObject({ok:true,mode:'mock'});await page.reload();await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible();
 const file=await page.evaluate(async()=>await (await fetch('/api/prototype/v1/files?path=browser-test.txt')).json());expect(file).toMatchObject({content:'IndexedDB retained',virtual:true});
});

test('secondary runs retain Plan behavior without leaking into primary session snapshots',async()=>{
 const service=api();const primary=[{id:'primary',title:'Primary',messages:[]}];
 const split={active:'secondary-only',sessions:[{id:'secondary-only',title:'Secondary',draft:'',messages:[]}]};
 await service.call('/workspace','PUT',{uiState:{'cw.sessions':JSON.stringify(primary),'cw.splitSession':JSON.stringify(split)}});
 const id=(await service.call('/runs','POST',{sessionId:'secondary-only',prompt:'A refactor',permission:'Plan',channel:'secondary'})).data.run.id;
 expect((await service.call('/runs/'+id)).data.run.text).toContain('I’d start by identifying the files involved');
 const workspace=(await service.call('/workspace')).data;expect(workspace.sessions).toEqual(primary);expect(JSON.parse(workspace.uiState['cw.sessions'])).toEqual(primary);
 expect(JSON.parse(workspace.uiState['cw.splitSession']).sessions[0].messages).toHaveLength(1);
 await service.call('/runs/'+id);expect(JSON.parse((await service.call('/workspace')).data.uiState['cw.splitSession']).sessions[0].messages).toHaveLength(1);
 const cancelled=(await service.call('/runs','POST',{sessionId:'secondary-only',prompt:'Cancel this',channel:'secondary'})).data.run.id;await service.call('/runs/'+cancelled,'DELETE');await service.call('/runs/'+cancelled);expect(JSON.parse((await service.call('/workspace')).data.uiState['cw.splitSession']).sessions[0].messages).toHaveLength(1);
});
