import {writeFile} from 'node:fs/promises';
import {test,expect,openSettings} from './fixtures';

for(const category of ['General','Claude Code','Capabilities','Design systems','Reflect','Time and focus','Claude in Chrome']) test(`reference comparison: ${category} at measured viewport`,async({page},testInfo)=>{
 await page.setViewportSize({width:1470,height:942});
 await page.evaluate(()=>{
  const saved=JSON.parse(localStorage.getItem('cw.settings')||'{}');
  localStorage.setItem('cw.settings',JSON.stringify({...saved,referenceSurface:'Web',aiArtifacts:false,font:'Serif',transcriptWidth:'Narrow',voice:'Buttery',browser:'Built-in browser',reduceMotion:false}));
  localStorage.setItem('cw.theme',JSON.stringify('system'));
  localStorage.setItem('cw.textSize',JSON.stringify('Medium'));
 });
 await page.reload();await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible();await page.locator('.profile').click();await page.getByRole('menuitem',{name:/^Settings/}).click();await openSettings(page,category);
 const modal=page.getByRole('dialog',{name:'Settings',exact:true});

 await page.evaluate(async()=>{await document.fonts.ready;if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});
 await page.mouse.move(1460,930);
 const bounds=await modal.boundingBox();expect(bounds).not.toBeNull();
 const path=testInfo.outputPath(`prototype-${category.toLowerCase().replaceAll(' ','-')}-reference-comparison.png`);
 await page.screenshot({path,clip:{x:bounds!.x+2,y:bounds!.y+2,width:bounds!.width-4,height:bounds!.height-4},animations:'disabled',caret:'hide'});
 await testInfo.attach('General comparison crop',{path,contentType:'image/png'});
 const geometry=await modal.evaluate(element=>{
  const rect=(node:Element)=>{const r=node.getBoundingClientRect();const style=getComputedStyle(node);return {text:node.textContent?.trim(),x:r.x,y:r.y,width:r.width,height:r.height,font:style.fontFamily,fontSize:style.fontSize,lineHeight:style.lineHeight}};
  return {dialog:rect(element),headings:[...element.querySelectorAll('.cw-setting-section h3')].map(rect),rows:[...element.querySelectorAll('.cw-setting-row')].map(rect)};
 });
 await writeFile(testInfo.outputPath('geometry.json'),JSON.stringify(geometry,null,2));
 await testInfo.attach('Measured General geometry',{body:JSON.stringify(geometry,null,2),contentType:'application/json'});
});
