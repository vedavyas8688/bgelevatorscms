import {build} from 'esbuild';import fs from 'node:fs/promises';import path from 'node:path';
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/client/admin',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['apps/preview/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,define:{'process.env.NODE_ENV':'"production"'},external:['cloudflare:workers','node:*']});
await fs.cp('apps/storefront/public','dist/client',{recursive:true});await fs.cp('apps/admin/dist','dist/client/admin',{recursive:true});
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');await fs.cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Sites build ready: same CMS service, D1/R2 preview adapter, original assets and React admin.');
