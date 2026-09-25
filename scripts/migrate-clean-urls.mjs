import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {mongoStore} from '@bg/database';
import {cleanInternalUrls,cleanPath} from '@bg/content';
import {config,root} from '../apps/api/src/config.js';

if(!config.mongo)throw new Error('Set MONGODB_URI in .env first.');
const apply=process.argv.includes('--apply');
const store=await mongoStore(config.mongo);
try{
 const kinds=['pages','regions','settings','redirects'];
 const snapshot=Object.fromEntries(await Promise.all(kinds.map(async kind=>[kind,await store.list(kind)])));
 const changes=[];
 for(const kind of kinds)for(const record of snapshot[kind]){
  let next=cleanInternalUrls(record);
  if(kind==='pages')next={...next,path:cleanPath(record.path)};
  if(kind==='redirects')next={...next,from:record.from,to:cleanPath(record.to)};
  const before={...record};delete before.version;const after={...next};delete after.version;
  if(JSON.stringify(before)!==JSON.stringify(after))changes.push({kind,id:record.id,from:record.path||record.from,to:next.path||next.to,next,version:record.version});
 }
 console.log(`${changes.length} records need clean-URL migration.`);
 for(const change of changes.filter(change=>change.kind==='pages').slice(0,8))console.log(`${change.from} -> ${change.to}`);
 if(changes.length>8)console.log(`...and ${changes.length-8} more records.`);
 if(!apply){console.log('Dry run only. Run npm run migrate:clean-urls -- --apply to back up and apply.');process.exitCode=changes.length?2:0;}
 else if(changes.length){
  const backupDir=path.join(root,'backups');await mkdir(backupDir,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');const backupPath=path.join(backupDir,`clean-url-backup-${stamp}.json`);
  await writeFile(backupPath,JSON.stringify({createdAt:new Date().toISOString(),snapshot},null,2));
  for(const change of changes)await store.put(change.kind,change.id,change.next,change.version);
  console.log(`Migrated ${changes.length} records. Backup: ${backupPath}`);
 }
}finally{await store.close();}
