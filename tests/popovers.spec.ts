import {test,expect,openLayout} from './fixtures';
import type {Page,Locator} from '@playwright/test';

// Safari does not focus a button on a mouse click. Keep the composer focused
// to reproduce that placement failure independently of browser defaults.
async function suppressClickFocus(page:Page){
 await page.evaluate(()=>document.addEventListener('pointerdown',event=>{
  if((event.target as HTMLElement).closest('button'))event.preventDefault();
 },true));
 await page.getByRole('textbox',{name:'Message',exact:true}).focus();
}
const cases:{name:string;trigger:(page:Page)=>Locator;label:string;side?:boolean;above?:boolean;setup?:(page:Page)=>Promise<void>}[]=[
 {name:'navigation',trigger:p=>p.getByRole('button',{name:'More navigation items'}),label:'More navigation'},
 {name:'group',trigger:p=>p.getByRole('button',{name:'Group and sort'}).first(),label:'Group and sort'},
 {name:'account',trigger:p=>p.locator('.profile'),label:'Account menu',above:true},
 {name:'session row',trigger:p=>p.getByRole('button',{name:'More options for Refactor the API client'}),label:'Session actions',side:true},
 {name:'session title',trigger:p=>p.locator('.title-button'),label:'Session menu'},
 {name:'layout',trigger:p=>p.getByRole('button',{name:'Layout and panels',exact:true}),label:'View options'},
 {name:'view options',trigger:p=>p.getByRole('button',{name:'View options',exact:true}),label:'View options'},
 {name:'add',trigger:p=>p.getByRole('button',{name:'Add',exact:true}),label:'Add',above:true},
 {name:'permissions',trigger:p=>p.locator('.composer-footer').getByRole('button',{name:'Manual',exact:true}),label:'Permissions',above:true},
 {name:'model',trigger:p=>p.locator('.composer-right .footer-button'),label:'Model and effort',above:true},
 {name:'secondary pane',trigger:p=>p.getByRole('button',{name:'Pane options',exact:true}),label:'Secondary pane options',setup:async p=>{
  await openLayout(p);await p.getByRole('menuitem',{name:/^Split right/}).click();
 }},
];
for(const surface of cases)test(`popover ${surface.name} anchors to clicked button without click focus`,async({page})=>{
 await surface.setup?.(page);await suppressClickFocus(page);
 const trigger=surface.trigger(page);await trigger.click();
 const menu=page.getByRole('menu',{name:surface.label,exact:true});await expect(menu).toBeVisible();
 const button=(await trigger.boundingBox())!,popup=(await menu.boundingBox())!,viewport=page.viewportSize()!;
 expect(popup.x).toBeGreaterThanOrEqual(7);expect(popup.y).toBeGreaterThanOrEqual(7);
 expect(popup.x+popup.width).toBeLessThanOrEqual(viewport.width-7);
 expect(popup.y+popup.height).toBeLessThanOrEqual(viewport.height-7);
 if(surface.side){
  expect(Math.min(Math.abs(popup.x-(button.x+button.width+4)),Math.abs(popup.x+popup.width-(button.x-4)))).toBeLessThan(2);
  expect(Math.abs(popup.y-button.y)).toBeLessThan(2);
 }else{
  // Alignment can clamp at the viewport edge; it must still overlap its trigger.
  expect(popup.x).toBeLessThan(button.x+button.width+1);
  expect(popup.x+popup.width).toBeGreaterThan(button.x-1);
  const gap=Math.min(Math.abs(popup.y-(button.y+button.height+8)),Math.abs(popup.y+popup.height-(button.y-8)));
  // Tall menus may be clamped to a viewport edge instead of fitting either side.
  expect(gap<2||popup.y<=8||popup.y+popup.height>=viewport.height-8).toBeTruthy();
 }
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(trigger).toBeFocused();
});

test('popover tracks viewport resize and its scroll container',async({page})=>{
 await suppressClickFocus(page);
 const trigger=page.getByRole('button',{name:'View options',exact:true});await trigger.click();
 const menu=page.getByRole('menu',{name:'View options',exact:true});
 await page.setViewportSize({width:1100,height:760});
 await expect.poll(async()=>{const a=(await trigger.boundingBox())!,b=(await menu.boundingBox())!;return Math.abs(a.x+a.width-b.x-b.width)}).toBeLessThan(2);
 await page.keyboard.press('Escape');
 const row=page.getByRole('button',{name:'More options for Refactor the API client'});await row.click();
 const rowMenu=page.getByRole('menu',{name:'Session actions',exact:true});
 await page.locator('.session-list').evaluate(element=>{element.style.maxHeight='70px';element.style.overflow='auto';element.scrollTop=20});
 await expect.poll(async()=>Math.abs((await row.boundingBox())!.y-(await rowMenu.boundingBox())!.y)).toBeLessThan(2);
});

test('nested effort popover flips left at the edge and restores both triggers',async({page})=>{
 await openLayout(page);await page.getByRole('menuitem',{name:/^Close pane/}).click();
 await suppressClickFocus(page);
 const trigger=page.locator('.composer-right .footer-button');await trigger.click();
 const effort=page.getByRole('menuitem',{name:/^Effort/});await effort.focus();await page.keyboard.press('ArrowRight');
 const nested=page.getByRole('menu',{name:'Effort',exact:true});await expect(nested).toBeVisible();
 const a=(await effort.boundingBox())!,b=(await nested.boundingBox())!;
 expect(Math.abs(b.x+b.width-(a.x-4))).toBeLessThan(2);
 await page.setViewportSize({width:1100,height:760});
 await expect.poll(async()=>{const row=(await effort.boundingBox())!,popup=(await nested.boundingBox())!;return Math.min(Math.abs(popup.x+popup.width-(row.x-4)),Math.abs(popup.x-(row.x+row.width+4)))}).toBeLessThan(2);
 await page.keyboard.press('ArrowLeft');await expect(nested).toBeHidden();await expect(effort).toBeFocused();
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});

test('secondary menu outside-dismiss layer never paints over the workspace',async({page})=>{
 await openLayout(page);await page.getByRole('menuitem',{name:/^Split right/}).click();
 const trigger=page.getByRole('button',{name:'Pane options',exact:true});await trigger.click();
 const dismiss=page.getByRole('button',{name:'Dismiss pane menu'});
 await page.mouse.move(1430,950);
 await expect(dismiss).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(dismiss).toHaveCSS('box-shadow','none');
 await dismiss.focus();await expect(dismiss).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await page.mouse.click(1430,950);
 await expect(page.getByRole('menu',{name:'Secondary pane options'})).toBeHidden();
 await expect(trigger).toBeFocused();
});
