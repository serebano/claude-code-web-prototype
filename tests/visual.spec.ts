import {test,expect,openSettings,openLayout,openSessionMenu} from './fixtures';
import type {Page} from '@playwright/test';

// Baselines are generated/reviewed in the pinned Linux Playwright container,
// never accepted implicitly during a regression run. No native app data is used.
const categories=['General','Account','Privacy','Billing','Usage','Capabilities','Memory','Design systems','Reflect','Time and focus','Claude Code','Claude in Chrome','System','Extensions','Developer','Skills','Connectors','Plugins','API keys','About'];
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-');
async function stable(page:Page){
 await page.evaluate(async()=>{await document.fonts.ready});
 await expect(page.locator('.app-shell')).toBeVisible();
}
async function capture(page:Page,name:string){
 await stable(page);
 await expect(page).toHaveScreenshot(name+'.png',{animations:'disabled',caret:'hide'});
}
async function split(page:Page,direction:'right'|'below'){
 await openLayout(page);
 await page.getByRole('menuitem',{name:new RegExp(`^Split ${direction}`)}).click();
 await expect(page.getByRole('region',{name:'Secondary session pane'})).toBeVisible();
 await expect(page.locator('.conversation-splits')).toHaveClass(new RegExp(`split-${direction}`));
}

for(const category of categories)test(`visual settings: ${category}`,async({page})=>{
 await openSettings(page,category);
 if(category!=='About')await expect(page.getByRole('dialog',{name:'Settings',exact:true}).getByRole('navigation').getByRole('button',{name:category,exact:true})).toHaveAttribute('aria-current','page');
 await page.mouse.move(1430,950);
 await capture(page,`settings-${slug(category)}`);
});

const menus:{name:string;open:(page:Page)=>Promise<unknown>;label?:string;dialog?:string}[]=[
 {name:'more-navigation',open:page=>page.getByRole('button',{name:'More navigation items'}).click(),label:'More navigation'},
 {name:'group-sort',open:page=>page.getByRole('button',{name:'Group and sort'}).click(),label:'Group and sort'},
 {name:'account',open:page=>page.locator('.profile').click(),label:'Account menu'},
 {name:'sidebar-session',open:page=>page.getByRole('button',{name:'More options for Refactor the API client'}).click()},
 {name:'session-title',open:openSessionMenu,label:'Session menu'},
 {name:'layout-panels',open:openLayout,label:'View options'},
 {name:'view-options',open:page=>page.getByRole('button',{name:'View options',exact:true}).click(),label:'View options'},
 {name:'composer-add',open:page=>page.getByRole('button',{name:'Add',exact:true}).click(),label:'Add'},
 {name:'permissions',open:page=>page.locator('.composer-footer').getByRole('button',{name:'Manual',exact:true}).click(),label:'Permissions'},
 {name:'model-effort',open:page=>page.locator('.composer-footer').getByRole('button',{name:'Opus 5.5 Medium',exact:true}).click(),label:'Model and effort'},
 {name:'command-palette',open:page=>page.keyboard.press('Meta+k'),dialog:'commands'},
 {name:'workspace-search',open:page=>page.keyboard.press('Meta+Shift+k'),dialog:'Search workspace'},
 {name:'secondary-pane',open:async page=>{await split(page,'right');await page.getByRole('button',{name:'Pane options',exact:true}).click()},label:'Secondary pane options'},
];
for(const menu of menus)test(`visual menu: ${menu.name}`,async({page})=>{
 await menu.open(page);
 if(menu.name==='model-effort')await expect(page.getByRole('menu',{name:'Model and effort',exact:true})).toHaveCSS('background-color','rgb(32, 32, 31)');
 if(menu.dialog)await expect(page.getByRole('dialog',{name:menu.dialog,exact:true})).toBeVisible();
 else{
  const surface=menu.label?page.getByRole('menu',{name:menu.label,exact:true}):page.getByRole('menu');
  await expect(surface).toBeVisible();
  // Preserve and record a keyboard-focused menu item in every menu screenshot.
  await page.keyboard.press('ArrowDown');
  await expect(surface.locator('button:focus')).toHaveCount(1);
 }
 await page.mouse.move(1430,950);
 await capture(page,`menu-${menu.name}`);
});

for(const panel of ['Session details','Changes','Files','Browser / Preview','Terminal','Background tasks','Plan'])test(`visual panel: ${panel}`,async({page})=>{
 await openLayout(page);await page.getByRole('menuitem',{name:/^Close pane/}).click();
 if(panel==='Background tasks'||panel==='Plan')await page.getByRole('button',{name:'View options',exact:true}).click();else await openLayout(page);
 await page.getByRole('menuitemcheckbox',{name:new RegExp('^'+panel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
 await expect(page.locator('.right-panel')).toBeVisible();
 await page.mouse.move(1430,950);
 await capture(page,`panel-${slug(panel)}`);
});

for(const direction of ['right','below'] as const)test(`visual split: ${direction}`,async({page})=>{
 await split(page,direction);
 await page.getByRole('region',{name:'Secondary session pane'}).getByRole('textbox',{name:'Message secondary session',exact:true}).focus();
 await page.mouse.move(1430,950);
 await capture(page,`split-${direction}`);
});

for(const category of ['General','Claude Code'])test(`visual settings: ${category} lower controls`,async({page})=>{
 await openSettings(page,category);
 const scroller=page.getByRole('dialog',{name:'Settings',exact:true}).locator('.cw-settings-scroll');
 await scroller.evaluate(element=>{element.scrollTop=element.scrollHeight});
 await expect(page.getByRole('dialog').getByText(category==='General'?'Artifacts shared':'Shared sessions',{exact:true})).toBeVisible();
 await page.mouse.move(1430,950);
 await capture(page,`settings-${slug(category)}-bottom`);
});

for(const surface of ['workspace','settings'])test(`visual light theme: ${surface}`,async({page})=>{
 await openSettings(page);
 await page.getByRole('dialog').getByRole('button',{name:'Light theme',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 if(surface==='workspace')await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.mouse.move(1430,950);
 await capture(page,`light-${surface}`);
});

for(const surface of ['workspace','settings'])test(`visual mobile: ${surface}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 // Reinitialize responsive defaults at the target viewport, retaining no data
 // changes from this otherwise fresh test context.
 await page.reload();
 if(surface==='settings')await openSettings(page);
 else await expect(page.getByRole('button',{name:'Show sidebar',exact:true})).toBeVisible();
 await page.mouse.move(389,843);
 await capture(page,`mobile-${surface}`);
});

test('visual sidebar row hover exposes session actions',async({page})=>{
 const target=page.locator('.session-link').filter({hasText:'Refactor the API client'});
 await target.hover();
 await expect(page.getByRole('button',{name:'More options for Refactor the API client'})).toHaveCSS('opacity','1');
 await capture(page,'sidebar-session-hover');
});

test('visual menu: nested effort options',async({page})=>{
 await page.locator('.composer-right .footer-button').click();
 await page.getByRole('menuitem',{name:/^Effort/}).focus();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('menu',{name:'Effort',exact:true})).toBeVisible();
 await page.mouse.move(1430,950);
 await capture(page,'menu-model-effort-submenu');
});

for(const category of ['General','Claude Code','Capabilities','Design systems','Time and focus','Claude in Chrome'])test(`visual web settings: ${category}`,async({page})=>{
 await page.evaluate(()=>localStorage.setItem('cw.settings',JSON.stringify({referenceSurface:'Web'})));
 await page.reload();await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible();
 await openSettings(page,category);await page.mouse.move(1430,950);await capture(page,`web-settings-${slug(category)}`);
});
