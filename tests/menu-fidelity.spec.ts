import {test,expect,openLayout} from './fixtures';

for(const label of ['Resize sidebar','Resize panel','Resize split']){
 for(const cancel of ['Escape','pointercancel'] as const)test(`${label} restores drag start on ${cancel} and commits on release`,async({page})=>{
  if(label==='Resize split'){
   await openLayout(page);await page.getByRole('menuitem',{name:/^Close pane/}).click();
   await openLayout(page);await page.getByRole('menuitem',{name:/^Split right/}).click();
  }
  const handle=page.getByRole('separator',{name:label,exact:true});
  const initial=(await handle.getAttribute('aria-valuenow'))!;
  async function drag(){
   const bounds=(await handle.boundingBox())!;
   await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   await page.mouse.down();
   await page.mouse.move(bounds.x+bounds.width/2+65,bounds.y+bounds.height/2,{steps:5});
   await expect(handle).not.toHaveAttribute('aria-valuenow',initial);
  }
  await drag();
  if(cancel==='Escape')await page.keyboard.press('Escape');
  else await handle.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});
  await expect(handle).toHaveAttribute('aria-valuenow',initial);
  await page.mouse.up();
  await expect(handle).toBeFocused();
  await drag();await page.mouse.up();
  const committed=(await handle.getAttribute('aria-valuenow'))!;
  expect(committed).not.toBe(initial);
  if(label!=='Resize split'){await page.reload();await expect(handle).toHaveAttribute('aria-valuenow',committed)}
  else{await page.keyboard.press('Escape');await expect(handle).toHaveAttribute('aria-valuenow',committed)}
 });
}
