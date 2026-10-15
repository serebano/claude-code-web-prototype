#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {mkdirSync,existsSync,readFileSync,mkdtempSync,cpSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const image='mcr.microsoft.com/playwright:v1.64.1-noble';
const [mode='check',...provided]=process.argv.slice(2);
const modes=new Set(['all','check','update','interactions']);
if(mode==='--help'||mode==='help'){
 console.log('Usage: node scripts/visual-tests.mjs [all|check|update|interactions] [-- test-filter ...]\nRuns pinned Linux/amd64 Chromium in Docker. Only update writes screenshot baselines.');
 process.exit(0);
}
if(!modes.has(mode))throw Error(`Unknown mode ${mode}. Use --help.`);
const filters=provided[0]==='--'?provided.slice(1):provided;
if(filters.some(value=>value.startsWith('-')))throw Error('Additional arguments must be test-file/title filters, not Playwright flags. Snapshot policy is controlled by the selected mode.');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.devDependencies?.['@playwright/test']!=='1.64.1')throw Error('Update the pinned Docker image and test dependency together. Expected @playwright/test 1.64.1.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const reportDir=path.join(root,'test-results',`docker-${mode}-${stamp}-${process.pid}`);
mkdirSync(reportDir,{recursive:true});
// Docker Desktop may not have access to macOS Documents. Only bind a dedicated
// /tmp staging folder; Node copies the user's sources and reviewed outputs.
const staging=mkdtempSync('/tmp/claude-visual-tests-');
const stagedSource=path.join(staging,'source');
const stagedResults=path.join(staging,'results');
const stagedBaselines=path.join(staging,'baselines');
const excluded=new Set(['node_modules','dist','.git','.openai','test-results','playwright-report','blob-report']);
cpSync(root,stagedSource,{recursive:true,filter:source=>{const relative=path.relative(root,source);return !relative.split(path.sep).some(part=>excluded.has(part)||part.startsWith('.env')||part.endsWith('.tsbuildinfo'))}});
mkdirSync(stagedResults);mkdirSync(stagedBaselines);
function copyBaselines(directory,relative=''){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const next=path.join(directory,entry.name), destination=path.join(relative,entry.name);
  if(entry.name.endsWith('-snapshots'))cpSync(next,path.join(root,'tests',destination),{recursive:true});
  else copyBaselines(next,destination);
 }
}
const selected=filters.length?filters:(mode==='check'||mode==='update')?['tests/visual.spec.ts',...existsSync(path.join(root,'tests/texture.spec.ts'))?['tests/texture.spec.ts']:[]]:mode==='interactions'?readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.spec.ts')&&!/^(visual|texture)\.spec\.ts$/.test(name)).map(name=>'tests/'+name):[];
const argumentsForPlaywright=['test',...selected,'--project=chromium',`--update-snapshots=${mode==='update'?'all':'none'}`];
if(mode==='interactions')argumentsForPlaywright.push('--grep-invert','visual|screenshot');

// This script runs in a disposable Linux work directory. The source mount is
// read-only; native host dependencies and build products never enter /work.
const command=String.raw`
set -u
mkdir -p /work
cd /source
tar --exclude='./node_modules' --exclude='./dist' --exclude='./.git' --exclude='./.env*' --exclude='./.openai' --exclude='./test-results' --exclude='./playwright-report' --exclude='./blob-report' --exclude='*.tsbuildinfo' -cf - . | tar -xf - -C /work
copy_status=$?
if [ "$copy_status" -ne 0 ]; then exit "$copy_status"; fi
cd /work
npm ci
install_status=$?
status=$install_status
if [ "$install_status" -eq 0 ]; then
 ./node_modules/.bin/playwright "$@"
 status=$?
 if [ "$RUN_MODE" = 'all' ]; then
  npm run verify:release
  release_status=$?
  if [ "$status" -eq 0 ]; then status=$release_status; fi
 fi
fi
for folder in playwright-report test-results; do
 if [ -d "$folder" ]; then
  cp -R "$folder" /results/
  report_status=$?
  if [ "$status" -eq 0 ] && [ "$report_status" -ne 0 ]; then status=$report_status; fi
 fi
done
if [ "$RUN_MODE" = 'update' ] && [ "$status" -eq 0 ]; then
 cd /work/tests
 find . -type d -name '*-snapshots' -prune -exec cp -R --parents '{}' /baseline-output/ \;
 copy_status=$?
 if [ "$copy_status" -ne 0 ]; then status=$copy_status; fi
fi
exit "$status"
`;
const args=['run','--rm','--init','--ipc=host','--platform','linux/amd64',
 '--mount',`type=bind,source=${stagedSource},target=/source,readonly`,
 '--mount',`type=bind,source=${stagedResults},target=/results`,
 '--mount','type=volume,destination=/work/node_modules',
 '--mount','type=volume,destination=/work/dist',
 '--env','CI=1','--env',`RUN_MODE=${mode}`];
if(mode==='update')args.push('--mount',`type=bind,source=${stagedBaselines},target=/baseline-output`);
args.push(image,'bash','-o','pipefail','-c',command,'playwright-run',...argumentsForPlaywright);
console.log(`Running ${mode} in ${image} (linux/amd64).\nReports: ${reportDir}\nStaging: ${staging}`);
const child=spawn('docker',args,{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(`Docker could not start: ${error.message}`);process.exitCode=1});
child.on('exit',(code,signal)=>{
 try{
  cpSync(stagedResults,reportDir,{recursive:true});
  if(mode==='update'&&code===0)copyBaselines(stagedBaselines);
 }catch(error){console.error(`Could not copy results: ${error.message}. Staging retained at ${staging}`);process.exitCode=1;return}
 console.log(`Reports: ${reportDir}`);
 if(mode==='update')console.log(code===0?'Baselines copied to tests/. Review the image diffs before committing.':'Run failed; host baselines were not updated.');
 process.exitCode=code??(signal==='SIGINT'?130:143);
});
