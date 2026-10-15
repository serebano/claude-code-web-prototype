import {test,expect} from './fixtures';

test('landing texture stays static with reduced motion and does not intercept controls',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.25});
 await page.reload();
 await page.getByRole('button',{name:'New',exact:true}).click();
 const texture=page.getByTestId('landing-texture');
 await expect(texture).toHaveAttribute('data-renderer',/webgl2|canvas2d/);
 await expect(texture).toHaveCSS('pointer-events','none');
 await expect(texture).toHaveCSS('opacity','1');
 await expect(texture).toHaveScreenshot('landing-reduced-motion.png');
 const before=await texture.screenshot();
 await page.mouse.move(600,300);await page.mouse.move(900,400,{steps:12});
 expect(await texture.screenshot()).toEqual(before);
 await page.getByRole('button',{name:'Turn on auto mode',exact:true}).click();
 await expect(page.getByRole('button',{name:'Turn off auto mode',exact:true})).toBeVisible();
});

test('high contrast suppresses the decorative texture',async({page})=>{
 await page.emulateMedia({forcedColors:'active'});
 await page.getByRole('button',{name:'New',exact:true}).click();
 await expect(page.getByTestId('landing-texture')).toBeHidden();
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible();
});

test('animated landing field responds to pointer movement and unmounts on navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.clock.install();
 await page.getByRole('button',{name:'New',exact:true}).click();
 const texture=page.getByTestId('landing-texture');
 await page.clock.runFor(7200);
 await expect(texture).toHaveCSS('opacity','1');
 await expect(texture).toHaveAttribute('data-renderer','webgl2');
 const before=await texture.screenshot();
 await page.mouse.move(500,300);await page.clock.runFor(50);
 await page.mouse.move(850,350,{steps:10});await page.clock.runFor(120);
 expect(await texture.screenshot()).not.toEqual(before);
 await page.getByRole('button',{name:'Import Claude Code CLI sessions',exact:true}).click();
 await page.getByRole('button',{name:'Import sample session',exact:true}).click();
 await expect(texture).toHaveCount(0);
});
