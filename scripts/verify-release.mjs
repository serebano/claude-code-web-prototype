import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url)));
assert.equal(pkg.version,lock.version,'Package and lock versions differ');
const root=new URL(`../docs/screenshots/v${pkg.version}/`,import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
assert.equal(manifest.version,pkg.version);
assert.ok(manifest.screenshots.length>=3,'Include workspace, settings and split screenshots');
for(const item of manifest.screenshots){
 const path=new URL(item.file,root);assert.ok(existsSync(path),`Missing ${item.file}`);
 const hash=createHash('sha256').update(readFileSync(path)).digest('hex');assert.equal(hash,item.sha256,`${item.file} changed without updating its manifest`);
}
const changelog=readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8');assert.ok(changelog.includes(`## ${pkg.version}`),'Missing release notes');
console.log(`Release v${pkg.version}: metadata and ${manifest.screenshots.length} screenshots verified.`);
