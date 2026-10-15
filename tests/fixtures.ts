import { test as base, expect, type Page } from '@playwright/test';

// Playwright's context fixture provides fresh browser storage for each test.
// Navigating/reloading within a test deliberately preserves local preferences.
export const test = base.extend<{ workspace: void }>({
 workspace: [async ({page},use)=>{
  const runtimeErrors:string[]=[];page.on('pageerror',error=>runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible({timeout:20_000});
  await use();
  expect(runtimeErrors,'Uncaught browser errors').toEqual([]);
 },{auto:true}],
});
export {expect};
export async function openSettings(page:Page, category='General') {
 if(!await page.getByRole('dialog',{name:'Settings',exact:true}).isVisible()) await page.keyboard.press('Meta+,');
 const dialog=page.getByRole('dialog',{name:'Settings',exact:true});
 await expect(dialog).toBeVisible();
 if(category==='About'){await dialog.getByRole('button',{name:'Local prototype',exact:true}).click();return;}
 const categoryButton=dialog.getByRole('navigation',{name:'Settings categories'}).getByRole('button',{name:category,exact:true});
 if(await categoryButton.getAttribute('aria-current')!=='page') await categoryButton.click();
}
export async function openLayout(page:Page) {
 await page.getByRole('button',{name:'Layout and panels',exact:true}).click();
 await expect(page.getByRole('menu',{name:'View options',exact:true})).toBeVisible();
}
export async function openSessionMenu(page:Page) {
 await page.locator('.title-button').click();
 await expect(page.getByRole('menu',{name:'Session menu',exact:true})).toBeVisible();
}
