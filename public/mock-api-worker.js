import {createMockApi,PREFIX} from './mock-api-core.js';
const database=new Promise((resolve,reject)=>{
 const request=indexedDB.open('prototype-api-v1',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('state');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
const store={
 async get(){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('state').objectStore('state').get('workspace');request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error)})},
 async set(value){const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(value,'workspace');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})},
};
const handle=createMockApi({store});
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin===self.location.origin&&url.pathname.startsWith(PREFIX+'/'))event.respondWith(handle(event.request));
});
