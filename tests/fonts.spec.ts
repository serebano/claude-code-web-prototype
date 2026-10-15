import {test,expect,openSettings} from './fixtures';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../public/fonts/manifest.json',import.meta.url),'utf8'));
test('packaged font faces load without substitution and retain source identities',async({page,request})=>{
 await page.goto('/');
 for(const font of manifest.fonts){
  const response=await request.get('/fonts/'+font.file);
  expect(response.ok()).toBeTruthy();
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(font.sha256);
  const loaded=await page.evaluate(async({family,style})=>{
   const faces=await document.fonts.load(`${style} 400 14px "${family}"`,'Settings Appearance');
   return faces.map(face=>({family:face.family,status:face.status}));
  },font);
  expect(loaded).toEqual([{family:font.family,status:'loaded'}]);
 }
 await expect(page.locator('.app-shell')).toHaveCSS('font-family',/anthropic-sans/);
 await openSettings(page);
 await expect(page.getByRole('dialog',{name:'Settings',exact:true})).toHaveCSS('font-family',/anthropic-sans/);
 await expect(page.getByRole('combobox',{name:'Chat font',exact:true})).toHaveCSS('font-family',/anthropic-serif/);
});

test('navigation and settings render verified Anthropicons glyphs',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>document.fonts.ready);
 const artifacts=page.locator('.sidebar nav [data-icon="Artifacts"]');
 await expect(artifacts).toHaveText('\ue017');
 await expect(artifacts).toHaveCSS('font-family','Anthropicons-Variable');
 await expect(artifacts).toHaveAttribute('aria-hidden','true');
 await openSettings(page);
 for(const [name,codePoint] of [['Settings',0xe0d6],['UserCircle',0xe105],['UsageGaugeMiddle',0xe130],['Scroll',0xe0d2],['Plugin',0xe0c5]] as const){
  const glyph=page.locator('.cw-settings-sidebar [data-icon="'+name+'"]').first();
  await expect(glyph).toHaveText(String.fromCodePoint(codePoint));
  await expect(glyph).toHaveCSS('font-family','Anthropicons-Variable');
 }
});
