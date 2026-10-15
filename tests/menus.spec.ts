import { test, expect, openSessionMenu } from './fixtures';

test('menu keyboard navigation wraps, supports typeahead and restores focus', async ({page}) => {
  const trigger = page.getByRole('button', {name:'More navigation items'});
  await trigger.click();
  const menu = page.getByRole('menu', {name:'More navigation'});
  await expect(menu.getByRole('menuitem', {name:'Projects',exact:true})).toBeFocused();
  await page.keyboard.press('End');
  await expect(menu.getByRole('menuitem', {name:/Keyboard shortcuts/})).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', {name:'Projects',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(menu.getByRole('menuitem', {name:/Keyboard shortcuts/})).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('s');
  await expect(menu.getByRole('menuitem', {name:'Scheduled',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
});

for (const destination of ['Projects','Scheduled']) {
  test(`More navigation opens ${destination}`,async ({page})=>{
    await page.getByRole('button',{name:'More navigation items'}).click();
    await page.getByRole('menuitem',{name:destination,exact:true}).click();
    await expect(page.getByRole('heading',{name:destination,exact:true})).toBeVisible();
  });
}
for (const [entry,heading] of [['Settings','Appearance'],['Appearance','Appearance'],['About this prototype','About this workspace'],['Keyboard shortcuts','Keyboard shortcuts']]) {
  test(`account menu opens ${entry}`,async ({page})=>{
    await page.locator('.profile').click();
    await page.getByRole('menu',{name:'Account menu'}).getByRole('menuitem',{name:new RegExp('^'+entry)}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('heading',{name:heading,exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
}

test('grouping persists and session row can pin, rename, archive and restore',async ({page})=>{
  await page.getByRole('button',{name:'Group and sort'}).click();
  await page.getByRole('menuitemcheckbox',{name:'Recents',exact:true}).click();
  await expect(page.locator('.recent-heading')).toContainText('Recents');
  await page.reload();
  await expect(page.locator('.recent-heading')).toContainText('Recents');
  await page.getByRole('button',{name:'More options for Refactor the API client'}).click();
  await page.getByRole('menuitem',{name:'Pin',exact:true}).click();
  await expect(page.locator('.session-link').first()).toContainText('Refactor the API client');
  await page.getByRole('button',{name:'More options for Refactor the API client'}).click();
  await page.getByRole('menuitem',{name:'Rename',exact:true}).click();
  await page.getByRole('textbox',{name:'Session name'}).fill('Renamed API');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'More options for Renamed API'}).click();
  await page.getByRole('menuitem',{name:'Archive',exact:true}).click();
  await expect(page.locator('.session-link').filter({hasText:'Renamed API'})).toHaveCount(0);
  await page.getByRole('button',{name:'More navigation items'}).click();
  await page.getByRole('menuitem',{name:'Archived sessions',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Renamed API Restore'}).click();
  await expect(page.locator('.title-button')).toHaveAccessibleName('Renamed API');
  await page.getByRole('button',{name:'More options for Renamed API'}).click();
  await page.getByRole('menuitem',{name:'Unpin',exact:true}).click();
  await expect(page.locator('.session-link').filter({hasText:'Renamed API'})).not.toContainText('⌖');
});

test('title menu rename cancel, fork, transcript mode and export retain session contents',async ({page})=>{
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:'Rename',exact:true}).click();
  await page.getByRole('textbox',{name:'Session name'}).fill('Uncommitted name');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard');
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:'Fork',exact:true}).click();
  await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard (fork)');
  await expect(page.locator('.user-bubble')).toContainText('Build a clean analytics dashboard');
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:/Transcript view:/}).click();
  await page.getByRole('button',{name:'Verbose',exact:true}).click();
  await expect(page.locator('.activity-log')).toBeVisible();
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:'Export conversation'}).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export session',exact:true}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('session.json');
  const stream = await download.createReadStream();
  const chunks:Buffer[]=[]; for await (const chunk of stream!) chunks.push(chunk);
  const exported=JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.title).toBe('Build the analytics dashboard (fork)');
  expect(exported.messages).toHaveLength(2);
});

test('local session link reopens its session and title pin toggles',async ({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:'Pin session',exact:true}).click();
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:'Unpin session',exact:true}).click();
  await openSessionMenu(page);
  await page.getByRole('menuitem',{name:'Copy local session link'}).click();
  const link=await page.evaluate(()=>navigator.clipboard.readText());
  expect(new URL(link).hash).toBe('#session=welcome');
  await page.locator('.session-link').filter({hasText:'Refactor the API client'}).click();
  await page.goto(link);
  await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard');
});

test('model, effort and permission choices persist per session',async ({page})=>{
  await page.getByRole('button',{name:'Opus 5.5 Medium',exact:true}).click();
  await page.getByRole('menuitemradio',{name:'Sonnet 5.5',exact:true}).click();
  await page.getByRole('button',{name:'Sonnet 5.5 Medium',exact:true}).click();
  await page.getByRole('menuitem',{name:/^Effort/}).click();
  await page.getByRole('menuitemradio',{name:'High',exact:true}).click();
  await page.getByRole('button',{name:'Manual',exact:true}).click();
  await expect(page.getByRole('menuitemcheckbox',{name:'Bypass permissions'})).toBeDisabled();
  await page.getByRole('menuitemcheckbox',{name:'Plan',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Sonnet 5.5 High',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Plan',exact:true})).toBeVisible();
  await page.locator('.session-link').filter({hasText:'Refactor the API client'}).click();
  await expect(page.getByRole('button',{name:'Opus 5.5 Medium',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Manual',exact:true})).toBeVisible();
});

test('Add supports attachments, removal, commands and connector settings',async ({page})=>{
  await page.getByRole('button',{name:'Add',exact:true}).click();
  const chooserPromise=page.waitForEvent('filechooser');
  await page.getByRole('menuitem',{name:'Add files or photos'}).click();
  await (await chooserPromise).setFiles({name:'example.txt',mimeType:'text/plain',buffer:Buffer.from('sample')});
  await expect(page.locator('.attachment-list')).toContainText('example.txt');
  await page.getByRole('button',{name:'Remove example.txt'}).click();
  await expect(page.locator('.attachment-list')).toHaveCount(0);
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('menuitem',{name:'Slash commands'}).click();
  await expect(page.getByRole('textbox',{name:'Search commands'})).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('menuitem',{name:'Connectors',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('heading',{name:'Connectors',exact:true})).toBeVisible();
});

test('palette/search keyboard actions, no results, shortcut help and sidebar shortcut',async ({page})=>{
  await page.keyboard.press('Meta+k');
  await page.getByRole('textbox',{name:'Search commands'}).fill('Open files');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button',{name:'Open files',exact:true})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.file-tree')).toBeVisible();
  await page.keyboard.press('Meta+Shift+k');
  await page.getByPlaceholder('Search your workspace…').fill('no such session');
  await expect(page.getByText('No sessions match “no such session”.')).toBeVisible();
  await page.getByPlaceholder('Search your workspace…').fill('API');
  await page.keyboard.press('Enter');
  await expect(page.locator('.title-button')).toHaveAccessibleName('Refactor the API client');
  await page.keyboard.press('Meta+/');
  await expect(page.getByRole('heading',{name:'Keyboard shortcuts'})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+b');
  await expect(page.getByRole('button',{name:'Show sidebar',exact:true})).toBeVisible();
  await page.keyboard.press('Meta+b');
  await expect(page.getByRole('button',{name:'Hide sidebar',exact:true})).toBeVisible();
});

test('primary drafts and replies remain in their originating session',async ({page})=>{
 await page.clock.install();
 const input=page.getByRole('textbox',{name:'Message',exact:true});
 await input.fill('A draft in the dashboard');
 await page.locator('.session-link').filter({hasText:'Refactor the API client'}).click();
 await expect(input).toHaveValue('');
 await input.fill('Review this client');await input.press('Enter');
 await page.locator('.session-link').filter({hasText:'Build the analytics dashboard'}).click();
 await expect(input).toHaveValue('A draft in the dashboard');
 await page.clock.fastForward(2000);
 await expect(page.locator('.conversation .user-bubble')).toHaveCount(1);
 await page.locator('.session-link').filter({hasText:'Refactor the API client'}).click();
 await expect(page.locator('.conversation .user-bubble')).toHaveCount(2);
 await expect(page.locator('.conversation .message.assistant')).toHaveCount(2);
});

test('primary stop cancels generation and Shift Enter inserts a newline',async ({page})=>{
 await page.clock.install();
 const input=page.getByRole('textbox',{name:'Message',exact:true});
 await input.fill('First line');await input.press('Shift+Enter');await input.press('a');
 await expect(input).toHaveValue('First line\na');
 await input.press('Enter');await page.getByRole('button',{name:'Stop response',exact:true}).click();
 await page.clock.fastForward(2000);
 await expect(page.locator('.conversation .message.assistant')).toHaveCount(1);
 await expect(page.locator('.thinking')).toHaveCount(0);
 await expect(page.locator('.send-button')).toBeDisabled();
});

test('every model, effort and ordinary permission option can be selected',async ({page})=>{
 for(const model of ['Fable 5.1','Sonnet 5.5','Haiku 5.5','Opus 5.5']){
  await page.locator('.composer-right .footer-button').click();
  await page.getByRole('menuitemradio',{name:model,exact:true}).click();
  await expect(page.locator('.composer-right .footer-button')).toContainText(model);
 }
 for(const effort of ['Low','High','Extra','Max','Ultracode','Medium']){
  await page.locator('.composer-right .footer-button').click();
  await page.getByRole('menuitem',{name:/^Effort/}).click();
  await page.getByRole('menu',{name:'Effort',exact:true}).getByRole('menuitemradio',{name:new RegExp('^'+effort)}).click();
  await expect(page.locator('.composer-right .footer-button')).toContainText(effort);
 }
 for(const permission of ['Auto','Accept edits','Plan','Manual']){
  await page.locator('.composer-footer > .popup-anchor > button').click();
  await page.getByRole('menuitemcheckbox',{name:permission,exact:true}).click();
  await expect(page.locator('.composer-footer > .popup-anchor > button')).toHaveAccessibleName(permission);
 }
});

test('session navigation menu and keyboard history return to prior conversations',async ({page})=>{
 await openSessionMenu(page);await page.getByRole('menuitem',{name:/^Next session/}).click();
 await expect(page.locator('.title-button')).toHaveAccessibleName('Refactor the API client');
 await page.keyboard.press('Meta+BracketLeft');await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard');
 await page.keyboard.press('Meta+BracketRight');await expect(page.locator('.title-button')).toHaveAccessibleName('Refactor the API client');
 await openSessionMenu(page);await page.getByRole('menuitem',{name:/^Previous session/}).click();
 await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard');
 await openSessionMenu(page);await page.getByRole('menuitem',{name:/^New session/}).click();
 await expect(page.locator('.title-button')).toHaveAccessibleName('New session');
 await expect(page.getByRole('button',{name:'Import Claude Code CLI sessions',exact:true})).toBeVisible();
 await page.keyboard.press('Meta+BracketLeft');await expect(page.locator('.title-button')).toHaveAccessibleName('Build the analytics dashboard');
});

test('Code landing auto mode toggles and imports an explicitly sample transcript',async ({page})=>{
 await page.getByRole('button',{name:'New',exact:true}).click();
 await page.getByRole('button',{name:'Turn on auto mode',exact:true}).click();
 await expect(page.locator('.composer-footer > .popup-anchor > button')).toHaveAccessibleName('Auto');
 await page.getByRole('button',{name:'Turn off auto mode',exact:true}).click();
 await expect(page.locator('.composer-footer > .popup-anchor > button')).toHaveAccessibleName('Manual');
 await page.getByRole('button',{name:'Import Claude Code CLI sessions',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('illustrative imported session');
 await page.getByRole('button',{name:'Import sample session',exact:true}).click();
 await expect(page.locator('.title-button')).toHaveAccessibleName('Imported CLI session (sample)');
 await expect(page.locator('.message-copy')).toContainText('No local CLI files were accessed.');
 await expect(page.getByRole('dialog')).toBeHidden();
 await page.reload();await expect(page.locator('.title-button')).toHaveAccessibleName('Imported CLI session (sample)');
});


test('nested model effort menu supports arrow navigation, Escape and focus restoration',async ({page})=>{
 const trigger=page.locator('.composer-right .footer-button');await trigger.click();
 const effort=page.getByRole('menuitem',{name:/^Effort/});await effort.focus();await page.keyboard.press('ArrowRight');
 const submenu=page.getByRole('menu',{name:'Effort',exact:true});
 await expect(submenu.getByRole('menuitemradio',{name:'Low',exact:true})).toBeFocused();
 await expect(submenu).toContainText('Higher effort means more thorough responses');
 await page.keyboard.press('End');await expect(submenu.getByRole('menuitemradio',{name:'Ultracode',exact:true})).toBeFocused();
 await page.keyboard.press('ArrowLeft');await expect(submenu).toBeHidden();await expect(effort).toBeFocused();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');await expect(submenu).toBeHidden();await expect(effort).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toHaveCount(0);await expect(trigger).toBeFocused();
 await trigger.click();await page.getByRole('menuitem',{name:'More models',exact:true}).click();
 await expect(page.getByRole('menu',{name:'More models',exact:true})).toContainText('No additional demo models');
 await page.keyboard.press('Escape');await expect(page.getByRole('menuitem',{name:'More models',exact:true})).toBeFocused();
});

test('fast mode persists within its session and web new-session shortcut works',async ({page})=>{
 await page.locator('.composer-right .footer-button').click();
 await page.getByRole('menuitemcheckbox',{name:'Enable fast mode',exact:true}).click();
 await page.reload();await page.locator('.composer-right .footer-button').click();
 await expect(page.getByRole('menuitemcheckbox',{name:'Enable fast mode',exact:true})).toBeChecked();
 await page.keyboard.press('Escape');await page.locator('.session-link').filter({hasText:'Refactor the API client'}).click();
 await page.locator('.composer-right .footer-button').click();await expect(page.getByRole('menuitemcheckbox',{name:'Enable fast mode',exact:true})).not.toBeChecked();
 await page.keyboard.press('Escape');await page.keyboard.press('Meta+Shift+o');
 await expect(page.locator('.title-button')).toHaveAccessibleName('New session');
 await expect(page.getByRole('button',{name:'Import Claude Code CLI sessions',exact:true})).toBeVisible();
});

test('pointer can enter the Effort submenu and choose High without dismissing its parent',async ({page})=>{
 const trigger=page.locator('.composer-right .footer-button');await trigger.click();
 await page.getByRole('menuitem',{name:/^Effort/}).hover();
 const submenu=page.getByRole('menu',{name:'Effort',exact:true});await expect(submenu).toBeVisible();
 const high=submenu.getByRole('menuitemradio',{name:'High',exact:true});await high.hover();
 await expect(high).toBeFocused();await expect(page.getByRole('menu',{name:'Model and effort',exact:true})).toBeVisible();
 await high.click();await expect(page.getByRole('menu')).toHaveCount(0);await expect(trigger).toContainText('High');await expect(trigger).toBeFocused();
 await trigger.click();await page.getByRole('menuitem',{name:/^Effort/}).hover();await expect(submenu.getByRole('menuitemradio',{name:'High',exact:true})).toBeChecked();
});
