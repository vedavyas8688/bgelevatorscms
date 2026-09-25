import {seed} from '@bg/content';
import {failure} from '@bg/cms';
const initial=(kind,id)=>seed[kind]?.find(r=>r.id===id)||null;
export function d1Store(db){return {
 async get(kind,id){const row=await db.prepare('SELECT data,version FROM records WHERE kind=? AND id=?').bind(kind,id).first();return row?{...JSON.parse(row.data),version:row.version}:structuredClone(initial(kind,id));},
 async list(kind){const rows=(await db.prepare('SELECT id,data,version FROM records WHERE kind=?').bind(kind).all()).results;const map=new Map((seed[kind]||[]).map(r=>[r.id,structuredClone(r)]));rows.forEach(r=>map.set(r.id,{...JSON.parse(r.data),version:r.version}));return [...map.values()];},
 async put(kind,id,value,expected){const base=initial(kind,id);const version=expected!==undefined?expected+1:(await this.get(kind,id))?.version+1||1;const data=JSON.stringify({...value,id,version});let result;
  if(expected===0)result=await db.prepare('INSERT OR IGNORE INTO records(kind,id,data,version) VALUES(?,?,?,?)').bind(kind,id,data,version).run();
  else if(expected!==undefined){if(!base&&!await this.get(kind,id))throw failure('Record was removed. Reload before saving.',409);result=await db.prepare('INSERT INTO records(kind,id,data,version) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data,version=excluded.version WHERE records.version=?').bind(kind,id,data,version,expected).run();}
  else result=await db.prepare('INSERT INTO records(kind,id,data,version) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data,version=records.version+1').bind(kind,id,data,version).run();
  if(!result.meta.changes)throw failure('Another editor changed this record. Reload before saving.',409);return {...value,id,version};
 },
 async remove(kind,id){await db.prepare('DELETE FROM records WHERE kind=? AND id=?').bind(kind,id).run();}
};}
