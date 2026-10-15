#!/usr/bin/env node
import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMockApi,createMemoryStore,PREFIX} from '../public/mock-api-core.js';
const port=Number(process.env.MOCK_API_PORT||4175);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid MOCK_API_PORT');
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const handle=createMockApi({store:createMemoryStore()});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
function error(res,status,message){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:{code:status===404?'NOT_FOUND':'INVALID_REQUEST',message}}))}
async function staticFile(req,res,url){
 if(!['GET','HEAD'].includes(req.method)){error(res,405,'Static files support GET and HEAD only.');return}
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{error(res,400,'Invalid path encoding.');return}
 if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').includes('..')){error(res,400,'Invalid static path.');return}
 let root;try{root=await realpath(dist)}catch{error(res,503,'Build the app first: npm run build');return}
 const inside=file=>file===root||file.startsWith(root+path.sep);
 let target=path.resolve(root,'.'+pathname);if(!inside(target)){error(res,403,'Path outside static directory.');return}
 try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');target=await realpath(target)}catch{
  if(path.extname(pathname)){error(res,404,'Static file not found.');return}
  target=path.join(root,'index.html');
 }
 // realpath prevents a symlink in dist from exposing files outside the build.
 try{target=await realpath(target);if(!inside(target)){error(res,403,'Path outside static directory.');return}const content=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Length':content.byteLength,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content)}catch{error(res,404,'Static file not found.')}
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(!url.pathname.startsWith(PREFIX+'/')){await staticFile(req,res,url);return}
  let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>1048576){error(res,413,'Request body exceeds 1 MiB.');return}chunks.push(chunk)}
  const response=await handle(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{error(res,500,'Prototype server failed.')}
});
server.listen(port,'127.0.0.1',()=>console.log(`Prototype app + independent mock API: http://127.0.0.1:${port}/ (memory backend; no commands execute)`));
