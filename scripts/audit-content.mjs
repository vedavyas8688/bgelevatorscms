import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {seed,renderPage,templates} from '@bg/content';
const root=path.resolve('apps/storefront/public'),missing=new Map();let fieldCount=0,sectionCount=0;
assert.equal(seed.pages.length,139);assert.equal(new Set(seed.pages.map(p=>p.path)).size,139);
for(const page of seed.pages){
 const view=renderPage(page,seed.regions,seed.pages);assert(view?.html.length>100,page.path);assert(!/__BG_(?:f\d+|SECTION|REGION)/.test(view.html),'Unresolved field on '+page.path);
 sectionCount+=page.draft.sections.length;for(const sec of page.draft.sections)fieldCount+=templates[sec.template].fields.length;
 for(const m of view.html.matchAll(/\bsrc="(\/[^"?]+)"/g)){let asset=m[1];try{await fs.access(path.join(root,asset))}catch{try{await fs.access(path.join(root,decodeURIComponent(asset)))}catch{missing.set(asset,[...(missing.get(asset)||[]),page.path])}}}
}
const report={pages:seed.pages.length,blogPosts:seed.pages.filter(p=>p.kind==='blog').length,sections:sectionCount,editableFields:fieldCount,sharedRegions:seed.regions.length,originalMedia:seed.media.length,duplicateRoutes:0,unresolvedFields:0,missingOriginalAssets:[...missing].map(([asset,pages])=>({asset,pages:[...new Set(pages)]}))};
await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/content-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
