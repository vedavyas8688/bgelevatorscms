import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {d1Store} from './store.js';
export function sqliteStore(filename){
 fs.mkdirSync('.sites-runtime',{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec('CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(kind,id))');
 const binding={
  prepare(sql){
   return {bind(...args){
    const statement=db.prepare(sql);
    return {
     async first(){return statement.get(...args)||null;},
     async all(){return {results:statement.all(...args)};},
     async run(){const result=statement.run(...args);return {meta:{changes:Number(result.changes)}};}
    };
   }};
  }
 };
 return {store:d1Store(binding),close:()=>db.close()};
}
