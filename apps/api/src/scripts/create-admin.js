import {mongoStore} from '@bg/database';
import {createAdmin,hash,passwordHash} from '@bg/cms';
import {config} from '../config.js';
if(!config.mongo||!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)throw new Error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env (minimum 10 characters).');
const store=await mongoStore(config.mongo);
try{
 const email=process.env.ADMIN_EMAIL.toLowerCase().trim();
 const id=await hash(email);
 const existing=await store.get('users',id);
 if(existing){
  await store.put('users',id,{...existing,email,name:process.env.ADMIN_NAME||existing.name||'BG Administrator',role:'admin',status:'active',passwordHash:await passwordHash(process.env.ADMIN_PASSWORD)},existing.version);
  for(const session of await store.list('sessions'))if(session.userId===id)await store.remove('sessions',session.id);
  console.log('Administrator password reset.');
 }else{
  await createAdmin(store,email,process.env.ADMIN_PASSWORD,process.env.ADMIN_NAME||'BG Administrator');
  console.log('Administrator created.');
 }
}finally{await store.close();}
