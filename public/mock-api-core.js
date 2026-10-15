/** Independently defined prototype API. No Anthropic endpoints or execution. */
export const PREFIX=/^https?:/.test(import.meta.url)?new URL('./api/prototype/v1',import.meta.url).pathname:'/api/prototype/v1';
const seed=()=>({workspace:null,sessions:[],tasks:[],settings:{},files:{'README.md':'# Prototype workspace\n\nVirtual files only. No host filesystem access.\n'},runs:{}});
const validId=v=>typeof v==='string'&&v.length>0&&v.length<160&&!/[\/\\\u0000]/.test(v);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function fail(status,code,message){return new Response(JSON.stringify({error:{code,message}}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
function safe(value){if(!value||typeof value!=='object')return true;return Object.entries(value).every(([k,v])=>!['__proto__','prototype','constructor'].includes(k)&&safe(v))}
const safePath=path=>typeof path==='string'&&path.length>0&&!path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(p=>['..','.','__proto__','constructor','prototype'].includes(p)||!p)&&!/[\u0000-\u001f]/.test(path);
const problem=(message,status=400)=>Object.assign(new Error(message),{status});
function reply(prompt,permission){
 if(/test/i.test(prompt))return 'For this sample project, I would check metric rendering, chart accessibility, and empty states. You can inspect the example components in Files. This is a scripted prototype response; no tests were actually run.';
 if(permission==='Plan'||/plan/i.test(prompt))return 'Here’s a suggested approach:\n\n1. Review the existing components and layout.\n2. Build the metric cards and revenue visualization.\n3. Check the responsive layout and keyboard interactions.\n\nThis is a demo plan. The prototype does not change files or execute code.';
 if(/file|change|dashboard|build/i.test(prompt))return 'The sample dashboard is ready to explore. Open Preview to see the layout, Changes to review the illustrative diff, or Files to read the components.\n\nThis is a scripted demo response. No repository files were modified.';
 return 'I’ve received your message. In a connected workspace, this is where the agent would investigate and respond.\n\nFor now, try the sample Files, Changes, and Preview panels, create another session, or adjust the model and permission controls. This prototype runs entirely in your browser.';
}
export function createMemoryStore(){let state=null;return {async get(){return state?structuredClone(state):null},async set(value){state=structuredClone(value)}}}
/** A handler owns one serialized mutation queue, preventing lost concurrent writes. */
export function createMockApi({store,now=()=>Date.now(),id=()=>crypto.randomUUID(),delayMs=1400}){
 let queue=Promise.resolve();
 async function dispatch(request){
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX+'/'))return fail(404,'NOT_FOUND','Unknown prototype endpoint.');
  let parts;try{parts=url.pathname.slice(PREFIX.length+1).split('/').filter(Boolean).map(decodeURIComponent)}catch{return fail(400,'INVALID_PATH','Invalid path encoding.')}
  const method=request.method.toUpperCase();
  if(parts[0]==='health'&&method==='GET')return json({ok:true,mode:'mock',version:1,executesCommands:false});
  try{
   let body={};if(['POST','PUT','PATCH'].includes(method)){
    const raw=await request.text();if(raw.length>1048576)throw problem('Request body exceeds 1 MiB.',413);
    try{body=JSON.parse(raw||'{}')}catch{throw problem('Request body must be valid JSON.')}
    if(!object(body)||!safe(body))throw problem('Request body must be a safe JSON object.');
   }
   if(parts[0]==='sessions'&&parts[2]==='events'&&parts.length===3&&method==='POST'){
    if(!validId(parts[1])||!Array.isArray(body.events)||!body.events.length||body.events.length>16)throw problem('Provide 1–16 typed events for a valid session.');
    const payloads=body.events.map(event=>event?.payload);
    for(const payload of payloads){if(!object(payload)||!validId(payload.type==='user'?payload.uuid:payload.request_id))throw problem('Event UUID/request_id is required.');if(payload.type==='user'){if(payload.message?.role!=='user'||typeof payload.message.content!=='string'||!payload.message.content.trim()||payload.message.content.length>32000)throw problem('Only text user messages are supported.');}else if(payload.type!=='control_request'||payload.request?.subtype!=='interrupt')throw problem('Unsupported prototype event type.',422);}
    const results=[];
    for(const payload of payloads){
     if(payload.type==='user'){const result=await dispatch(new Request(url.origin+PREFIX+'/sessions/'+encodeURIComponent(parts[1])+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:payload.message.content})}));const data=await result.json();if(!result.ok)return json(data,result.status);results.push({uuid:payload.uuid,...data});}
     else{const current=(await store.get())||seed();if(!current.sessions.some(session=>session.id===parts[1]))return fail(404,'NOT_FOUND','Session not found.');const cancelled=[];for(const run of Object.values(current.runs)){if(run.sessionId===parts[1]&&run.status==='pending'){run.status='cancelled';cancelled.push(run.id)}}if(current.workspace)current.workspace.updatedAt=Math.max(now(),current.workspace.updatedAt+1);await store.set(current);results.push({request_id:payload.request_id,cancelled});}
    }return json({accepted:results},202);
   }
   const state=(await store.get())||seed();
   const persist=async(data,status=200)=>{if(state.workspace){state.workspace.updatedAt=Math.max(now(),state.workspace.updatedAt+1);if(data?.uiState)data.updatedAt=state.workspace.updatedAt}await store.set(state);return json(data,status)};
   if(parts[0]==='workspace'&&parts.length===1){
    if(method==='GET')return state.workspace?json({...state.workspace,sessions:state.sessions,tasks:state.tasks,settings:state.settings}):fail(404,'NOT_FOUND','Workspace has not been created.');
    if(method==='PUT'){
     if(!object(body.uiState)||Object.entries(body.uiState).some(([k,v])=>!k.startsWith('cw.')||typeof v!=='string'))throw problem('uiState must map cw.* keys to raw JSON strings.');
     for(const value of Object.values(body.uiState)){try{if(!safe(JSON.parse(value)))throw Error()}catch{throw problem('Each uiState value must be safe JSON.')}}
     state.workspace={uiState:body.uiState,updatedAt:now()};
     const decode=(key)=>body.uiState[key]===undefined?undefined:JSON.parse(body.uiState[key]);
     const sessions=decode('cw.sessions'),tasks=decode('cw.tasks'),settings=decode('cw.settings'),files=decode('cw.files');
     if(sessions!==undefined){if(!Array.isArray(sessions)||sessions.some(s=>!object(s)||!validId(s.id)||typeof s.title!=='string'||!Array.isArray(s.messages)))throw problem('Invalid sessions snapshot.');state.sessions=sessions}
     if(tasks!==undefined){if(!Array.isArray(tasks)||tasks.some(t=>!object(t)||!validId(t.id)||typeof t.name!=='string'))throw problem('Invalid tasks snapshot.');state.tasks=tasks}
     if(files!==undefined){if(!object(files)||Object.entries(files).some(([path,content])=>!safePath(path)||typeof content!=='string'||content.length>262144))throw problem('Invalid virtual files snapshot.');state.files=files}
     if(settings!==undefined){if(!object(settings))throw problem('Invalid settings snapshot.');state.settings=settings}
     return persist({...state.workspace,sessions:state.sessions,tasks:state.tasks,settings:state.settings});
    }
   }
   if(parts[0]==='settings'&&parts.length===1){
    if(method==='GET')return json({settings:state.settings});
    if(method==='PATCH'){if(Object.values(body).some(v=>typeof v!=='string'&&typeof v!=='boolean'))throw problem('Settings values must be strings or booleans.');state.settings={...state.settings,...body};if(state.workspace)state.workspace.uiState['cw.settings']=JSON.stringify(state.settings);return persist({settings:state.settings})}
   }
   if(parts[0]==='files'&&parts.length===1){
    const path=url.searchParams.get('path');
    if(path!==null&&!safePath(path))throw problem('Use a relative virtual file path without traversal.');
    if(method==='GET'){if(!path)return json({files:Object.keys(state.files).sort().map(path=>({path,virtual:true}))});if(!Object.hasOwn(state.files,path))return fail(404,'NOT_FOUND','Virtual file not found.');return json({path,content:state.files[path],virtual:true})}
    if(method==='PUT'){if(!path||typeof body.content!=='string'||body.content.length>262144)throw problem('Provide a path and text content up to 256 KiB.');state.files[path]=body.content;if(state.workspace)state.workspace.uiState['cw.files']=JSON.stringify(state.files);return persist({path,content:body.content,virtual:true})}
   }
   if(['sessions','tasks'].includes(parts[0])){
    const kind=parts[0],recordId=parts[1],collection=state[kind];
    const sync=()=>{if(state.workspace)state.workspace.uiState['cw.'+kind]=JSON.stringify(collection)};
    if(parts.length===1&&method==='GET')return json({[kind]:collection});
    if(parts.length===1&&method==='POST'){
     const title=kind==='sessions'?body.title:body.name;if(typeof title!=='string'||!title.trim()||title.length>500)throw problem('A nonempty title/name is required.');
     const item=kind==='sessions'?{id:id(),title:title.trim(),project:typeof body.project==='string'?body.project:'acme-dashboard',messages:[],archived:false}:{id:id(),name:title.trim(),time:typeof body.time==='string'?body.time:'09:00',enabled:body.enabled!==false};
     collection.unshift(item);sync();return persist({[kind==='sessions'?'session':'task']:item},201);
    }
    if(!validId(recordId))throw problem('Invalid record ID.');
    const item=collection.find(v=>v.id===recordId);if(!item)return fail(404,'NOT_FOUND','Record not found.');
    if(parts.length===2){
     const key=kind==='sessions'?'session':'task';
     if(method==='GET')return json({[key]:item});
     if(method==='DELETE'){collection.splice(collection.indexOf(item),1);sync();return persist({deleted:true,id:recordId})}
     if(method==='PATCH'){
      const allowed=kind==='sessions'?['title','project','archived','pinned']:['name','time','enabled'];
      if(!Object.keys(body).length||Object.entries(body).some(([k,v])=>!allowed.includes(k)||(['archived','pinned','enabled'].includes(k)?typeof v!=='boolean':typeof v!=='string'||!v.trim()||v.length>500)))throw problem('Invalid record patch.');
      Object.assign(item,body);sync();return persist({[key]:item});
     }
    }
    if(kind==='sessions'&&parts[2]==='fork'&&parts.length===3&&method==='POST'){const fork={...structuredClone(item),id:id(),title:item.title+' (fork)',archived:false};collection.unshift(fork);sync();return persist({session:fork},201)}
    if(kind==='sessions'&&parts[2]==='messages'&&parts.length===3&&method==='POST'){
     if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>32000)throw problem('Provide a prompt of 1–32000 characters.');
     body.sessionId=recordId;item.messages.push({role:'user',text:body.prompt});sync();
    }else return fail(405,'METHOD_NOT_ALLOWED','Unsupported method for this endpoint.');
   }
   if(parts[0]==='runs'||(parts[0]==='sessions'&&parts[2]==='messages')){
    if(method==='POST'&&((parts[0]==='runs'&&parts.length===1)||parts[2]==='messages')){
     if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>32000)throw problem('Provide a prompt of 1–32000 characters.');
     if(body.sessionId!==undefined&&!validId(body.sessionId))throw problem('Invalid session ID.');
     if(body.channel!=='secondary'&&body.sessionId&&!state.sessions.some(s=>s.id===body.sessionId))state.sessions.push({id:body.sessionId,title:body.prompt.slice(0,45),project:'acme-dashboard',messages:[],channel:body.channel||'primary'});
     const run={id:id(),sessionId:body.sessionId??null,channel:body.channel||'primary',status:'pending',createdAt:now(),readyAt:now()+delayMs,text:body.channel==='secondary'?(body.permission==='Plan'?'I’d start by identifying the files involved, outlining the smallest change, and checking the expected behavior before making edits.\n\nThis is a local interface demo: no model is connected and no files were read or changed.':'I can help break that down into a focused coding task. Share the relevant code or describe the expected behavior, and we can work through an implementation.\n\nThis is a local interface demo: no model is connected and no commands were run.'):reply(body.prompt,body.permission),activity:'Demo response · no tools executed'};
     state.runs[run.id]=run;return persist({run:{id:run.id,status:run.status}},202);
    }
    const run=Object.hasOwn(state.runs,parts[1])?state.runs[parts[1]]:null;if(!run)return fail(404,'NOT_FOUND','Run not found.');
    if(method==='DELETE'&&parts.length===2){if(run.status==='pending')run.status='cancelled';return persist({run})}
    if(method==='GET'&&(parts.length===2||parts[2]==='events')){
     if(run.status==='pending'&&now()>=run.readyAt){run.status='completed';
      if(run.channel==='secondary'&&state.workspace?.uiState['cw.splitSession']){
       let split;try{split=JSON.parse(state.workspace.uiState['cw.splitSession'])}catch{}
       const secondary=Array.isArray(split?.sessions)?split.sessions.find(session=>session.id===run.sessionId):null;
       if(secondary&&Array.isArray(secondary.messages)){const messageId=run.id+':assistant';if(!secondary.messages.some(message=>message.id===messageId))secondary.messages.push({id:messageId,role:'assistant',text:run.text});state.workspace.uiState['cw.splitSession']=JSON.stringify(split)}
      }
      const session=run.channel==='secondary'?null:state.sessions.find(s=>s.id===run.sessionId);if(session){session.messages.push({role:'assistant',text:run.text,activity:run.activity});if(state.workspace)state.workspace.uiState['cw.sessions']=JSON.stringify(state.sessions)}if(state.workspace)state.workspace.updatedAt=Math.max(now(),state.workspace.updatedAt+1);await store.set(state)}
     const visible=run.status==='completed'?run:{id:run.id,status:run.status,sessionId:run.sessionId};
     if(parts[2]==='events')return new Response(`event: ${run.status}\ndata: ${JSON.stringify(visible)}\n\n`,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store'}});
     return json({run:visible});
    }
   }
   if(parts[0]==='terminal'&&parts.length===1&&method==='POST'){
    if(typeof body.command!=='string'||body.command.length>1000)throw problem('Provide a command string up to 1000 characters.');
    const command=body.command.trim();return json({simulated:true,executed:false,output:command==='help'?'Available: help, pwd, ls, clear. Other commands do not execute.':command==='pwd'?'/demo/acme-dashboard':command==='ls'?Object.keys(state.files).join('\n'):command==='clear'?'':'Demo only: this command was not executed.'});
   }
   return fail(404,'NOT_FOUND','Unknown prototype endpoint.');
  }catch(error){return fail(error.status||500,error.status?'INVALID_REQUEST':'INTERNAL_ERROR',error.status?error.message:'Prototype storage failed.')}
 }
 return request=>{const task=queue.then(()=>dispatch(request));queue=task.then(()=>{},()=>{});return task};
}
