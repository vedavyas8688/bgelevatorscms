import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {seed,renderPage} from '@bg/content';

const sourceRoot=path.resolve(process.argv[2]||'.audit-source/bg_elevators-main');
const publicRoot=path.resolve('apps/storefront/public');
const manifest=JSON.parse(await fs.readFile('packages/content/migration-manifest.json','utf8'));
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const exists=async file=>fs.access(file).then(()=>true,()=>false);
async function walk(root){const out=[];for(const entry of await fs.readdir(root,{withFileTypes:true})){const full=path.join(root,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
const rel=(root,file)=>path.relative(root,file).replaceAll('\\','/');

const sourceFiles=await walk(sourceRoot);
const sourceHtml=sourceFiles.filter(file=>file.toLowerCase().endsWith('.html'));
const sourceHtmlNames=sourceHtml.map(file=>rel(sourceRoot,file)).sort();
const manifestNames=manifest.map(item=>item.file).sort();
const migratedRoutes=seed.pages.map(page=>page.path).sort();
const expectedRoutes=manifest.map(item=>item.path).sort();
const hashMismatches=[];
for(const item of manifest){const file=path.join(sourceRoot,item.file);if(!await exists(file)){hashMismatches.push({file:item.file,reason:'missing from ZIP'});continue;}const actual=hash(await fs.readFile(file));if(actual!==item.originalSha256)hashMismatches.push({file:item.file,expected:item.originalSha256,actual});}

const assetRoots=['css','fonts','images','js','uploads'];
const sourceAssets=sourceFiles.filter(file=>assetRoots.includes(rel(sourceRoot,file).split('/')[0]));
const missingPublicAssets=[],changedPublicAssets=[];
for(const file of sourceAssets){const relative=rel(sourceRoot,file),target=path.join(publicRoot,relative);if(!await exists(target)){missingPublicAssets.push(relative);continue;}const [a,b]=await Promise.all([fs.readFile(file),fs.readFile(target)]);if(hash(a)!==hash(b))changedPublicAssets.push(relative);}

const unresolved=[],emptyRendered=[],renderErrors=[];
for(const page of seed.pages){try{const view=renderPage(page,seed.regions,seed.pages);if(!view?.html?.trim())emptyRendered.push(page.path);if(/__BG_(?:f\d+|SECTION|REGION)/.test(view?.html||''))unresolved.push(page.path);}catch(error){renderErrors.push({path:page.path,error:error.message});}}
const difference=(left,right)=>left.filter(value=>!new Set(right).has(value));
const report={
 source:{root:sourceRoot,files:sourceFiles.length,htmlPages:sourceHtml.length,assets:sourceAssets.length},
 migration:{pages:seed.pages.length,blogs:seed.pages.filter(page=>page.kind==='blog').length,manifestEntries:manifest.length},
 htmlFiles:{missingFromManifest:difference(sourceHtmlNames,manifestNames),missingFromZip:difference(manifestNames,sourceHtmlNames),hashMismatches},
 routes:{missingFromMigration:difference(expectedRoutes,migratedRoutes),unexpectedInMigration:difference(migratedRoutes,expectedRoutes),duplicateSource:[...new Set(expectedRoutes.filter((route,index)=>expectedRoutes.indexOf(route)!==index))],duplicateMigration:[...new Set(migratedRoutes.filter((route,index)=>migratedRoutes.indexOf(route)!==index))]},
 rendering:{unresolvedPlaceholders:unresolved,emptyPages:emptyRendered,errors:renderErrors},
 assets:{sourceAssets:sourceAssets.length,missingFromPublic:missingPublicAssets,changedFromSource:changedPublicAssets},
 exactHtmlSourceMatch:sourceHtml.length===manifest.length&&!hashMismatches.length&&!difference(sourceHtmlNames,manifestNames).length&&!difference(manifestNames,sourceHtmlNames).length,
 routeParity:!difference(expectedRoutes,migratedRoutes).length&&!difference(migratedRoutes,expectedRoutes).length,
 generatedAt:new Date().toISOString()
};
await fs.writeFile('docs/source-zip-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
