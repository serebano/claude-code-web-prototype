import {test,expect,openLayout} from './fixtures';

async function openPanel(page:import('@playwright/test').Page,name:string){
 await openLayout(page); await page.getByRole('menuitemcheckbox',{name:new RegExp('^'+name)}).click();
}
async function splitRight(page:import('@playwright/test').Page){
 if(await page.getByRole('button',{name:'Close panel',exact:true}).isVisible())await page.getByRole('button',{name:'Close panel',exact:true}).click();
 await openLayout(page);await page.getByRole('menuitem',{name:/^Split right/}).click();
 await expect(page.getByRole('region',{name:'Secondary session pane'})).toBeVisible();
}

test('files selection and changes disclosures display corresponding source',async ({page})=>{
 await openPanel(page,'Files');
 await page.locator('.file-tree').getByRole('button',{name:'README.md',exact:true}).click();
 await expect(page.locator('.code-view')).toContainText('# Acme Dashboard');
 await page.locator('.file-tree').getByRole('button',{name:/src\/components\/MetricCard.tsx/}).click();
 await expect(page.locator('.code-view')).toContainText('export function MetricCard');
 await openPanel(page,'Changes');
 const diffs=page.locator('.diff-file');
 await expect(diffs).toHaveCount(3);
 await expect(diffs.nth(0)).toHaveAttribute('open','');
 await diffs.nth(0).locator('summary').click();
 await expect(diffs.nth(0)).not.toHaveAttribute('open','');
 await diffs.nth(1).locator('summary').click();
 await expect(diffs.nth(1).locator('pre')).toContainText('export function MetricCard');
});

test('preview period updates sample metrics and terminal supports documented commands',async ({page})=>{
 await openPanel(page,'Browser / Preview');
 await expect(page.locator('.mini-metrics')).toContainText('$48,295');
 await page.getByRole('combobox',{name:'Preview period'}).selectOption('Last month');
 await expect(page.locator('.mini-metrics')).toContainText('$42,815');
 await expect(page.locator('.mini-metrics')).toContainText('2,237');
 await openPanel(page,'Terminal');
 const input=page.getByRole('textbox',{name:'Demo terminal command'});
 for(const [command,result] of [['help','Available: help, pwd, ls, clear.'],['pwd','/demo/acme-dashboard'],['ls','src/components/MetricCard.tsx'],['echo unsafe','Demo only: this command was not executed.']]){
  await input.fill(command);await input.press('Enter');await expect(page.locator('.terminal')).toContainText(result);await expect(input).toHaveValue('');
 }
 await input.fill('clear');await input.press('Enter');await expect(page.locator('.terminal > p')).toHaveCount(0);
});

test('details sections collapse, environment changes and output links open tools',async ({page})=>{
 await expect(page.locator('.panel-title')).toContainText('Session details');
 await page.getByRole('button',{name:'Environment',exact:true}).click();
 await expect(page.locator('.environment-row')).toBeHidden();
 await page.getByRole('button',{name:'Environment',exact:true}).click();
 await page.locator('.environment-row').click();
 await page.getByRole('button',{name:'Cloud Remote workspace preview'}).click();
 await expect(page.locator('.environment-row')).toContainText('Cloud');
 await page.getByRole('button',{name:'Context 22%'}).click();
 await expect(page.locator('.context-bar')).toBeHidden();
 await page.getByRole('button',{name:'Outputs',exact:true}).click();
 await expect(page.locator('.output-row')).toHaveCount(0);
 await page.getByRole('button',{name:'Outputs',exact:true}).click();
 await page.locator('.output-row').filter({hasText:'README.md'}).click();
 await expect(page.locator('.code-view')).toContainText('# Acme Dashboard');
 await openPanel(page,'Session details');
 await page.getByRole('button',{name:'Background tasks',exact:true}).click();
 await expect(page.locator('.background-row')).toHaveCount(0);
 await page.getByRole('button',{name:'Background tasks',exact:true}).click();
 await page.getByRole('button',{name:'2 finished',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Finished tasks'})).toBeVisible();
});

test('plan checks persist per session and background tasks open activity',async ({page})=>{
 await page.getByRole('button',{name:'View options',exact:true}).click();
 await page.getByRole('menuitemcheckbox',{name:'Plan',exact:true}).click();
 const check=page.getByRole('checkbox',{name:'Check layout and accessibility'});
 await expect(check).not.toBeChecked();await check.check();
 await page.reload();
 await page.getByRole('button',{name:'View options',exact:true}).click();
 await page.getByRole('menuitemcheckbox',{name:'Plan',exact:true}).click();
 await expect(check).toBeChecked();
 await page.locator('.session-link').filter({hasText:'Refactor the API client'}).click();
 await expect(check).not.toBeChecked();
 await page.getByRole('button',{name:'View options',exact:true}).click();
 await page.getByRole('menuitemcheckbox',{name:'Background tasks',exact:true}).click();
 await page.getByRole('button',{name:'View 2 finished demo tasks'}).click();
 await expect(page.locator('.finished-task')).toHaveCount(2);
});

test('panel shortcuts open and close tools',async ({page})=>{
 for(const [shortcut,title] of [['Meta+Shift+f','Files'],['Meta+Shift+d','Changes'],['Meta+Shift+p','Preview'],['Control+Backquote','Terminal']]){
  await page.keyboard.press(shortcut);await expect(page.locator('.panel-title')).toContainText(title);
 }
 await page.keyboard.press('Meta+Backslash');await expect(page.locator('.right-panel')).toHaveCount(0);
});

test('sidebar and tool rail resize by keyboard, pointer and persist',async ({page})=>{
 for(const [label,key,delta] of [['Resize sidebar','ArrowRight',30],['Resize panel','ArrowLeft',-30]]){
  const separator=page.getByRole('separator',{name:label});const before=Number(await separator.getAttribute('aria-valuenow'));
  await separator.focus();await page.keyboard.press(key);
  await expect(separator).not.toHaveAttribute('aria-valuenow',String(before));
  const keyboardValue=await separator.getAttribute('aria-valuenow');
  const box=(await separator.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+delta,box.y+box.height/2,{steps:5});await page.mouse.up();
  await expect(separator).not.toHaveAttribute('aria-valuenow',keyboardValue!);
  const saved=await separator.getAttribute('aria-valuenow');await page.reload();await expect(separator).toHaveAttribute('aria-valuenow',saved!);
 }
});

test('split right/below layout, pointer and keyboard resizing, focus and close',async ({page})=>{
 await splitRight(page);
 const pane=page.getByRole('region',{name:'Secondary session pane'});const separator=page.getByRole('separator',{name:'Resize split'});
 await expect(separator).toHaveAttribute('aria-orientation','vertical');
 await separator.focus();await page.keyboard.press('ArrowRight');await expect(separator).toHaveAttribute('aria-valuenow','55');
 const box=(await separator.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+60,box.y+box.height/2,{steps:5});await page.mouse.up();await expect(separator).not.toHaveAttribute('aria-valuenow','55');
 await page.keyboard.press('Control+]');await expect(page.getByRole('textbox',{name:'Message secondary session'})).toBeFocused();
 await page.keyboard.press('Control+[');await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeFocused();
 await pane.getByRole('button',{name:'Pane options'}).click();await page.getByRole('menuitem',{name:'Move pane below'}).click();
 await expect(separator).toHaveAttribute('aria-orientation','horizontal');
 const primary=(await page.locator('.conversation').boundingBox())!,secondary=(await pane.boundingBox())!;expect(secondary.y).toBeGreaterThan(primary.y+primary.height-2);
 await separator.focus();await page.keyboard.press('ArrowDown');await expect(separator).toHaveAttribute('aria-valuenow','55');
 await pane.getByRole('button',{name:'Pane options'}).click();await page.getByRole('menuitem',{name:'Move pane right'}).click();await expect(separator).toHaveAttribute('aria-orientation','vertical');
 await separator.focus();await page.keyboard.press('Home');await expect(separator).toHaveAttribute('aria-valuenow',(await separator.getAttribute('aria-valuemin'))!);
 await page.keyboard.press('End');await expect(separator).toHaveAttribute('aria-valuenow',(await separator.getAttribute('aria-valuemax'))!);
 await separator.dblclick();await expect(separator).toHaveAttribute('aria-valuenow','50');
 await pane.getByRole('button',{name:'Pane options'}).click();await page.getByRole('menuitem',{name:'Close pane',exact:true}).click();await expect(pane).toHaveCount(0);
});

test('split draft, model, permission persist across close/reopen/reload and session selection',async ({page})=>{
 await splitRight(page);
 const pane=page.getByRole('region',{name:'Secondary session pane'}),input=pane.getByRole('textbox',{name:'Message secondary session'}),picker=pane.getByRole('combobox',{name:'Select secondary session'});
 await input.fill('An unfinished secondary draft');
 const first=await picker.inputValue();
 await pane.getByRole('combobox',{name:'Secondary session model'}).selectOption('Haiku 5.5');
 await pane.getByRole('combobox',{name:'Secondary session permission mode'}).selectOption('Plan');
 await pane.getByRole('button',{name:'New session in secondary pane'}).click();await expect(input).toHaveValue('');
 await picker.selectOption(first);await expect(input).toHaveValue('An unfinished secondary draft');
 await openLayout(page);await page.getByRole('menuitem',{name:/^Close split view/}).click();
 await splitRight(page);await expect(input).toHaveValue('An unfinished secondary draft');
 await page.reload();await splitRight(page);await expect(input).toHaveValue('An unfinished secondary draft');
 await expect(pane.getByRole('combobox',{name:'Secondary session model'})).toHaveValue('Haiku 5.5');
 await expect(pane.getByRole('combobox',{name:'Secondary session permission mode'})).toHaveValue('Plan');
});

test('existing session fork is independent; rename Escape cancels and Enter commits',async ({page})=>{
 await splitRight(page);const pane=page.getByRole('region',{name:'Secondary session pane'});
 await pane.getByRole('combobox',{name:'Select secondary session'}).selectOption('existing:welcome');
 await expect(pane.locator('.cw-split-message')).toHaveCount(2);
 await expect(pane).toContainText('Independent fork of “Build the analytics dashboard”');
 await pane.getByRole('button',{name:'Pane options'}).click();await page.getByRole('menuitem',{name:'Rename session',exact:true}).click();
 await pane.getByRole('textbox',{name:'Session name'}).fill('Discard this name');await page.keyboard.press('Escape');
 await expect(pane.getByRole('combobox',{name:'Select secondary session'}).locator('option:checked')).toHaveText('Build the analytics dashboard · fork');
 await pane.getByRole('button',{name:'Pane options'}).click();await page.getByRole('menuitem',{name:'Rename session',exact:true}).click();
 await pane.getByRole('textbox',{name:'Session name'}).fill('Independent work');await page.keyboard.press('Enter');
 await expect(pane.getByRole('combobox',{name:'Select secondary session'}).locator('option:checked')).toHaveText('Independent work');
 await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard');
 await pane.getByRole('textbox',{name:'Message secondary session'}).fill('Only in my fork');await pane.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(pane.locator('.cw-split-message')).toHaveCount(4);
 await expect(page.locator('.conversation .user-bubble')).toHaveCount(1);
});

test('split stop cancels response and switching sessions prevents late response',async ({page})=>{
 await page.clock.install();await splitRight(page);
 const pane=page.getByRole('region',{name:'Secondary session pane'}),input=pane.getByRole('textbox',{name:'Message secondary session'});
 await input.fill('Stop this response');await input.press('Enter');
 await pane.getByRole('button',{name:'Stop response'}).click();await page.clock.fastForward(2000);
 await expect(pane.locator('.cw-split-message')).toHaveCount(1);
 await input.fill('Switch away');await input.press('Enter');const picker=pane.getByRole('combobox',{name:'Select secondary session'}),first=await picker.inputValue();
 await pane.getByRole('button',{name:'New session in secondary pane'}).click();await page.clock.fastForward(2000);await expect(pane.locator('.cw-split-message')).toHaveCount(0);
 await picker.selectOption(first);await expect(pane.locator('.cw-split-message')).toHaveCount(2);
});
