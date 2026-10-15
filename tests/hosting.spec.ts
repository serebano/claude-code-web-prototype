import {test,expect} from '@playwright/test';

test('deployment base serves fonts, artwork and the mock API',async({page,baseURL})=>{
 await page.goto(baseURL!);
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible({timeout:20000});
 const result=await page.evaluate(async()=>{
  await document.fonts.ready;
  const base=location.pathname.replace(/\/?$/,'/');
  const responses=await Promise.all(['fonts/anthropic-sans.woff2','reference-assets/servers-empty-dark.svg','api/prototype/v1/health'].map(path=>fetch(base+path)));
  return {statuses:responses.map(r=>r.status),health:await responses[2].json(),scope:(await navigator.serviceWorker.ready).scope};
 });
 expect(result.statuses).toEqual([200,200,200]);
 expect(result.scope).toBe(baseURL!.replace(/\/?$/,'/'));
 expect(result.health).toBeTruthy();
});
