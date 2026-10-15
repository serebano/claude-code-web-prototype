import {test,expect,openSettings} from './fixtures';
import type {Page} from '@playwright/test';

// Explicit inventories make removed categories and controls a regression, rather
// than allowing an empty locator loop to pass silently.
const inventory:Record<string,{switches:string[];selects:string[]}>= {
 General:{switches:['Response completions','Scheduled tasks','Code notifications','Code permission requests','Emails from Claude Code cloud sessions','Dispatch messages','Mentions and replies','Comments on artifacts','Artifacts shared'],selects:['Chat font','Preferred browser','Language','Style','Speed']},
 Account:{switches:[],selects:[]},Privacy:{switches:['Use coarse location','Help improve Claude'],selects:[]},Billing:{switches:[],selects:[]},Usage:{switches:[],selects:[]},
 Capabilities:{switches:['Load connector tools when needed','Discover connectors','Artifacts','AI-powered artifacts','Inline visualizations','Code execution and file creation','Network access'],selects:[]},
 Memory:{switches:['Search and reference chats','Generate memory from chats','Include sensitive topics in memory'],selects:[]},'Design systems':{switches:[],selects:[]},Reflect:{switches:[],selects:[]},'Time and focus':{switches:['Quiet mode'],selects:['Focus duration']},
 'Claude Code':{switches:['Classify session states','Switch models when a message is flagged','Connect new sessions','Allow bypass permissions','Dynamic workflows','Get attention in Dock','Keep computer awake','Keep computer awake on battery','Prompt suggestions','Enable local sandbox','Strict sandbox','Browser tools','Open links in browser','Enable mobile simulators','Create pull requests automatically','Auto-fix pull requests','Archive sessions after merge'],selects:['Light code theme','Dark code theme','Archive inactive sessions','Unrelated tasks','Worktree location','Output style','Keep cookies']},
 'Claude in Chrome':{switches:[],selects:[]},
 System:{switches:['Open on startup','Show in menu bar','Keep computer awake','Enable computer use','Unhide apps when finished'],selects:['Quick access shortcut','Voice shortcut','Dictation shortcut','Control mode']},
 Extensions:{switches:[],selects:[]},Developer:{switches:[],selects:[]},Skills:{switches:[],selects:[]},Connectors:{switches:[],selects:[]},Plugins:{switches:[],selects:[]},'API keys':{switches:[],selects:[]},About:{switches:[],selects:['Reference surface']}
};
const dialog=(page:Page)=>page.getByRole('dialog',{name:'Settings',exact:true});
const row=(page:Page,title:string)=>dialog(page).locator('.cw-setting-row').filter({has:page.locator('.cw-setting-copy > label').filter({hasText:new RegExp('^'+title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')})});
async function close(page:Page){await dialog(page).getByRole('button',{name:'Close settings',exact:true}).click();await expect(dialog(page)).toBeHidden()}
async function reopen(page:Page,category:string){await close(page);await page.reload();await openSettings(page,category)}
test.beforeEach(async({page})=>{await page.goto('/')});

for(const [category,controls] of Object.entries(inventory)){
 test(`settings category: ${category} — exact control inventory`,async({page})=>{
  await openSettings(page,category);const modal=dialog(page);
  if(category!=='About')await expect(modal.getByRole('navigation',{name:'Settings categories'}).getByRole('button',{name:category,exact:true})).toHaveAttribute('aria-current','page');
  await expect(modal.locator('.cw-setting-section')).not.toHaveCount(0);
  await expect(modal.getByRole('switch')).toHaveCount(controls.switches.length);
  await expect(modal.getByRole('combobox')).toHaveCount(controls.selects.length);
  for(const name of controls.switches)await expect(modal.getByRole('switch',{name,exact:true})).toBeEnabled();
  for(const name of controls.selects)await expect(modal.getByRole('combobox',{name,exact:true})).toBeEnabled();
 });
 if(controls.switches.length)test(`settings ${category}: every switch flips, persists and restores`,async({page})=>{
  await openSettings(page,category);const initial:Record<string,string>={};
  for(const name of controls.switches){const control=dialog(page).getByRole('switch',{name,exact:true});initial[name]=(await control.getAttribute('aria-checked'))!;await control.click();await expect(control).toHaveAttribute('aria-checked',initial[name]==='true'?'false':'true')}
  await reopen(page,category);
  for(const name of controls.switches){const control=dialog(page).getByRole('switch',{name,exact:true});await expect(control).toHaveAttribute('aria-checked',initial[name]==='true'?'false':'true');await control.click();await expect(control).toHaveAttribute('aria-checked',initial[name])}
  await reopen(page,category);
  for(const name of controls.switches)await expect(dialog(page).getByRole('switch',{name,exact:true})).toHaveAttribute('aria-checked',initial[name]);
 });
 if(controls.selects.length&&category!=='About')test(`settings ${category}: every select changes, persists and restores`,async({page})=>{
  await openSettings(page,category);const original:Record<string,string>={},changed:Record<string,string>={};
  for(const name of controls.selects){const control=dialog(page).getByRole('combobox',{name,exact:true});original[name]=await control.inputValue();const options=await control.locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));expect(options.length).toBeGreaterThan(1);changed[name]=options.find(v=>v!==original[name])!;await control.selectOption(changed[name]);await expect(control).toHaveValue(changed[name])}
  await reopen(page,category);
  for(const name of controls.selects){const control=dialog(page).getByRole('combobox',{name,exact:true});await expect(control).toHaveValue(changed[name]);await control.selectOption(original[name])}
  await reopen(page,category);
  for(const name of controls.selects)await expect(dialog(page).getByRole('combobox',{name,exact:true})).toHaveValue(original[name]);
 });
}

const editors=[['Account','Display name','Test workspace'],['Memory','Your memory','Prefer concise local examples.'],['Memory','Import memory','Imported demonstration memory.'],['Capabilities','Allowed domains','example.com\nexample.org'],['System','Allowed sites','example.com'],['Design systems','Design guidance','Use a warm neutral palette.'],['Extensions','Extension configuration','{"mcpServers":{}}']];
for(const [category,title,value] of editors)test(`settings editor: ${title} saves and reloads`,async({page})=>{
 await openSettings(page,category);if(category==='Extensions')await dialog(page).getByRole('button',{name:'Advanced settings'}).click();else await row(page,title).getByRole('button').click();const editor=dialog(page).getByRole('textbox',{name:title,exact:true});await expect(editor).toBeFocused();await editor.fill(value);await dialog(page).getByRole('button',{name:'Save locally',exact:true}).click();await expect(editor).toBeHidden();await reopen(page,category);if(category==='Extensions')await dialog(page).getByRole('button',{name:'Advanced settings'}).click();else await row(page,title).getByRole('button').click();await expect(dialog(page).getByRole('textbox',{name:title,exact:true})).toHaveValue(value);
});

test('extension editor rejects invalid JSON without losing the draft',async({page})=>{
 await openSettings(page,'Extensions');await dialog(page).getByRole('button',{name:'Advanced settings'}).click();const editor=dialog(page).getByRole('textbox',{name:'Extension configuration',exact:true});
 for(const invalid of ['{invalid','[]','null']){await editor.fill(invalid);await dialog(page).getByRole('button',{name:'Save locally'}).click();await expect(editor).toHaveValue(invalid);await expect(editor).toHaveAttribute('aria-invalid','true');await expect(dialog(page).getByRole('alert')).toContainText('valid JSON object')}
 await editor.fill('{"mcpServers":{}}');await dialog(page).getByRole('button',{name:'Save locally'}).click();await expect(editor).toBeHidden();
});

const details:Record<string,string[]>={Account:['Organization'],Privacy:['Shared chats and artifacts','Uploaded files','Feedback'],Billing:['Plans and billing'],Usage:['Local storage usage'],System:['Connected browsers','Denied apps','Accessibility & screen recording','Local browser storage'],'Claude Code':['Simulator access','Shared sessions'],'Claude in Chrome':['Set up Claude in Chrome'],Skills:['About skills'],Connectors:['About connectors'],Plugins:['About plugins']};
for(const [category,titles] of Object.entries(details))test(`settings ${category}: every information action opens contextual details`,async({page})=>{
 await openSettings(page,category);
 for(const title of titles){await row(page,title).getByRole('button').click();await expect(dialog(page).getByRole('heading',{name:title,exact:true})).toBeFocused();await expect(dialog(page).locator('.cw-settings-detail > p')).not.toHaveText('');await dialog(page).getByRole('button',{name:`← Back to ${category}`,exact:true}).click();await expect(row(page,title)).toBeVisible()}
});

test('settings explanatory actions, cross-category links, and platform URL',async({page})=>{
 await openSettings(page,'Developer');await expect(dialog(page).getByRole('link',{name:'Developer docs'})).toHaveAttribute('href','https://modelcontextprotocol.io/');
 await dialog(page).getByRole('navigation').getByRole('button',{name:'Reflect',exact:true}).click();await dialog(page).getByRole('button',{name:'About this prototype',exact:true}).click();await expect(dialog(page).locator('.cw-settings-detail')).toContainText('local interface demonstration');
 await dialog(page).getByRole('navigation').getByRole('button',{name:'Capabilities',exact:true}).click();await dialog(page).getByRole('button',{name:'Open Skills'}).click();await expect(dialog(page).getByRole('navigation').getByRole('button',{name:'Skills',exact:true})).toHaveAttribute('aria-current','page');

 await dialog(page).getByRole('navigation').getByRole('button',{name:'Privacy',exact:true}).click();await row(page,'Memory').getByRole('button').click();await expect(dialog(page).getByRole('navigation').getByRole('button',{name:'Memory',exact:true})).toHaveAttribute('aria-current','page');
 await dialog(page).getByRole('navigation').getByRole('button',{name:'API keys',exact:true}).click();await expect(dialog(page).getByRole('link',{name:'Open platform'})).toHaveAttribute('href','https://platform.claude.com/');await expect(dialog(page).getByRole('link')).toHaveAttribute('rel','noreferrer');
});

for(const category of ['Skills','Connectors','Plugins'])test(`settings Customize link opens ${category}`,async({page})=>{await openSettings(page,category);await dialog(page).getByRole('button',{name:'Open Customize'}).click();await expect(dialog(page)).toBeHidden();await expect(page.locator('.filter-tabs button.active')).toHaveText(category)});

for(const [category,title] of [['Privacy','Export local settings'],['About','What works here']])test(`settings export via ${category} contains local preferences`,async({page})=>{
 await openSettings(page,category);const downloadPromise=page.waitForEvent('download');await row(page,title).getByRole('button').click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('workspace-settings.json');const stream=await download.createReadStream();expect(stream).not.toBeNull();let text='';for await(const chunk of stream!)text+=chunk.toString();const data=JSON.parse(text);expect(data.note).toBe('Local prototype data only');expect(data.settings).toHaveProperty('transcriptWidth');expect(data).toHaveProperty('theme');expect(data).toHaveProperty('textSize');
});

test('search includes option values, escapes in layers, and clears empty results',async({page})=>{
 await openSettings(page);const search=dialog(page).getByRole('textbox',{name:'Search settings'});await expect(search).toBeFocused();await search.fill('Dracula');await expect(row(page,'Code themes')).toBeVisible();await expect(dialog(page).locator('.cw-setting-row')).toHaveCount(1);await search.fill('not-a-real-setting-xyz');await expect(dialog(page).getByRole('heading',{name:'No settings found'})).toBeVisible();await dialog(page).getByRole('button',{name:'Clear search',exact:true}).last().click();await expect(search).toHaveValue('');await search.fill('Display name');await row(page,'Display name').getByRole('button').click();await expect(dialog(page).getByRole('textbox',{name:'Display name',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog(page).locator('.cw-settings-detail')).toHaveCount(0);await expect(search).toHaveValue('Display name');await page.keyboard.press('Escape');await expect(search).toHaveValue('');await page.keyboard.press('Escape');await expect(dialog(page)).toBeHidden();
});

test('same category and search leave detail panels; focus is trapped',async({page})=>{
 await openSettings(page,'Memory');await row(page,'Your memory').getByRole('button').click();await dialog(page).getByRole('navigation').getByRole('button',{name:'Memory',exact:true}).click();await expect(dialog(page).locator('.cw-settings-detail')).toHaveCount(0);await row(page,'Your memory').getByRole('button').click();const search=dialog(page).getByRole('textbox',{name:'Search settings'});await search.fill('Theme');await expect(dialog(page).locator('.cw-settings-detail')).toHaveCount(0);await expect(row(page,'Theme')).toBeVisible();await search.fill('');await search.focus();await page.keyboard.press('Shift+Tab');await expect(dialog(page).getByRole('button',{name:'Import',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(search).toBeFocused();await close(page);
});

test('appearance controls apply to Home and Code and survive reload',async({page})=>{
 await page.locator('.mode-switch').getByRole('button',{name:'Home',exact:true}).click();await openSettings(page);await dialog(page).getByRole('combobox',{name:'Chat font',exact:true}).selectOption('Sans');await expect(page.locator('.app-shell')).toHaveAttribute('data-font','Sans');await dialog(page).getByRole('button',{name:'Light theme',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await dialog(page).getByRole('button',{name:'Reduced',exact:true}).click();await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);await close(page);await page.locator('.mode-switch').getByRole('button',{name:'Code',exact:true}).click();await expect(page.locator('.app-shell')).toHaveAttribute('data-font','System');await openSettings(page,'Claude Code');await dialog(page).getByRole('radio',{name:'System',exact:true}).check();await expect(page.locator('.app-shell')).toHaveAttribute('data-interface-font','System');await dialog(page).getByRole('navigation').getByRole('button',{name:'General',exact:true}).click();await dialog(page).getByRole('button',{name:'Large',exact:true}).click();await expect(page.locator('.app-shell')).toHaveAttribute('data-size','Large');await row(page,'Transcript width').getByRole('button',{name:'Wide',exact:true}).click();await expect(page.locator('.app-shell')).toHaveAttribute('data-width','Wide');await dialog(page).getByRole('navigation').getByRole('button',{name:'Claude Code',exact:true}).click();await dialog(page).getByRole('radio',{name:'Verbose',exact:true}).check();await expect(page.locator('.app-shell')).toHaveAttribute('data-transcript','Verbose');await dialog(page).getByRole('textbox',{name:'Code font family'}).fill('Monaco');await expect(dialog(page).getByLabel('Light code appearance preview')).toHaveCSS('font-family',/Monaco/);await dialog(page).getByRole('combobox',{name:'Light code theme'}).selectOption('Solarized Light');await expect(page.locator('.app-shell')).toHaveAttribute('data-code-theme','Solarized Light');await reopen(page,'Claude Code');await expect(dialog(page).getByRole('textbox',{name:'Code font family'})).toHaveValue('Monaco');await expect(page.locator('.app-shell')).toHaveAttribute('data-size','Large');
});

test('bypass permissions must be enabled and revocation returns to Manual',async({page})=>{
 await page.locator('.composer-footer').getByRole('button',{name:'Manual',exact:true}).click();await expect(page.getByRole('menuitemcheckbox',{name:'Bypass permissions',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await openSettings(page,'Claude Code');await dialog(page).getByRole('switch',{name:'Allow bypass permissions'}).click();await close(page);await page.locator('.composer-footer').getByRole('button',{name:'Manual',exact:true}).click();await page.getByRole('menuitemcheckbox',{name:'Bypass permissions',exact:true}).click();await expect(page.locator('.composer-footer').getByRole('button',{name:'Bypass permissions',exact:true})).toBeVisible();await openSettings(page,'Claude Code');await dialog(page).getByRole('switch',{name:'Allow bypass permissions'}).click();await close(page);await expect(page.locator('.composer-footer').getByRole('button',{name:'Manual',exact:true})).toBeVisible();await page.reload();await expect(page.locator('.composer-footer').getByRole('button',{name:'Manual',exact:true})).toBeVisible();
});

test('all theme, motion, interface-font and text-size choices select and persist',async({page})=>{
 await openSettings(page);
 for(const name of ['Light','Dark','System']){await dialog(page).getByRole('button',{name:`${name} theme`,exact:true}).click();await expect(dialog(page).getByRole('button',{name:`${name} theme`,exact:true})).toHaveAttribute('aria-pressed','true')}
 for(const name of ['Reduced','System']){await row(page,'Motion').getByRole('button',{name,exact:true}).click();await expect(row(page,'Motion').getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true')}
 await dialog(page).getByRole('navigation').getByRole('button',{name:'Claude Code',exact:true}).click();
 for(const name of ['Anthropic Sans','System','OpenDyslexic']){await dialog(page).getByRole('radio',{name,exact:true}).check();await expect(page.locator('.app-shell')).toHaveAttribute('data-interface-font',name)}
 await dialog(page).getByRole('navigation').getByRole('button',{name:'General',exact:true}).click();
 for(const name of ['Small','Medium','Large']){await row(page,'Transcript text size').getByRole('button',{name,exact:true}).click();await expect(page.locator('.app-shell')).toHaveAttribute('data-size',name)}
 await reopen(page,'Claude Code');await expect(dialog(page).getByRole('radio',{name:'OpenDyslexic'})).toBeChecked();await dialog(page).getByRole('navigation').getByRole('button',{name:'General',exact:true}).click();await expect(row(page,'Transcript text size').getByRole('button',{name:'Large',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('branch prefix input persists and save notice can be dismissed',async({page})=>{
 await openSettings(page,'Claude Code');const prefix=dialog(page).getByRole('textbox',{name:'Branch prefix',exact:true});await prefix.fill('demo-test');await expect(dialog(page).getByRole('status')).toContainText('saved locally');await dialog(page).getByRole('button',{name:'Dismiss notice'}).click();await expect(dialog(page).getByRole('status')).toHaveCount(0);await reopen(page,'Claude Code');await expect(dialog(page).getByRole('textbox',{name:'Branch prefix',exact:true})).toHaveValue('demo-test');
});

test('About storage details export local data and return to the category',async({page})=>{
 await openSettings(page,'About');await dialog(page).getByRole('button',{name:'View storage',exact:true}).click();await expect(dialog(page).locator('.cw-settings-detail')).toContainText('KB of local workspace data');const downloaded=page.waitForEvent('download');await dialog(page).getByRole('button',{name:'Export local preferences',exact:true}).click();expect((await downloaded).suggestedFilename()).toBe('workspace-settings.json');await dialog(page).getByRole('button',{name:'← Back to About',exact:true}).click();await expect(dialog(page).getByRole('heading',{name:'About this workspace',exact:true})).toBeVisible();
});

test('settings geometry matches the measured desktop web surface',async({page})=>{
 await page.setViewportSize({width:1470,height:942});
 await openSettings(page);
 const modal=dialog(page);
 const bounds=await modal.boundingBox();
 expect(bounds?.width).toBe(1024);expect(bounds?.height).toBe(800);
 expect((await modal.locator('.cw-settings-sidebar').boundingBox())?.width).toBe(192);
 expect((await modal.locator('.cw-settings-search').boundingBox())?.height).toBe(32);
 await expect(modal).toHaveCSS('border-radius','12px');
 await expect(modal).toHaveCSS('background-color','rgb(26, 26, 25)');
 await expect(modal.locator('.cw-settings-sidebar')).toHaveCSS('background-color','rgb(21, 21, 21)');
 const appearance=modal.locator('.cw-setting-section').first();
 expect((await appearance.boundingBox())?.width).toBe(782);
 await expect(appearance.getByRole('heading',{name:'Appearance',exact:true})).toHaveCSS('font-size','15px');
 await expect(row(page,'Theme').locator('.cw-setting-copy > label')).toHaveCSS('font-size','14px');
 const icon=await modal.getByRole('button',{name:'Light theme',exact:true}).boundingBox();
 expect(icon?.width).toBe(30);expect(icon?.height).toBe(30);
 for(const name of ['Transcript text size','Transcript width','Motion'])expect((await row(page,name).locator('.cw-segments').boundingBox())?.height).toBe(32);
 const browser=await modal.getByRole('combobox',{name:'Preferred browser',exact:true}).boundingBox();expect(browser?.width).toBe(260);expect(browser?.height).toBe(32);
});


test('General transcript segments persist and share their values with Claude Code',async({page})=>{
 await openSettings(page,'General');
 const width=row(page,'Transcript width'),size=row(page,'Transcript text size');
 await expect(width.getByRole('combobox')).toHaveCount(0);
 await expect(width).toContainText('Maximum width of the transcript and composer columns.');
 await expect(size).toContainText('Size of the conversation transcript text.');
 for(const name of ['Narrow','Medium','Wide']){
  await width.getByRole('button',{name,exact:true}).click();
  await expect(width.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-width',name);
 }
 for(const name of ['Small','Medium','Large']){
  await size.getByRole('button',{name,exact:true}).click();
  await expect(size.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-size',name);
 }
 await reopen(page,'General');
 await expect(width.getByRole('button',{name:'Wide',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(size.getByRole('button',{name:'Large',exact:true})).toHaveAttribute('aria-pressed','true');
 await dialog(page).getByRole('navigation').getByRole('button',{name:'Claude Code',exact:true}).click();
 await expect(dialog(page).getByRole('combobox',{name:'Transcript width',exact:true})).toHaveCount(0);
 await expect(page.locator('.app-shell')).toHaveAttribute('data-width','Wide');
 await expect(page.locator('.app-shell')).toHaveAttribute('data-size','Large');
});
