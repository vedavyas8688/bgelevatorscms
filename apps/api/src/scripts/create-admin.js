import {mongoStore} from '@bg/database';
import {createAdmin} from '@bg/cms';
import {config} from '../config.js';
if(!config.mongo||!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)throw new Error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env (minimum 12 characters).');
const store=await mongoStore(config.mongo);try{await createAdmin(store,process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD,process.env.ADMIN_NAME||'BG Administrator');console.log('Administrator created.');}finally{await store.close();}
