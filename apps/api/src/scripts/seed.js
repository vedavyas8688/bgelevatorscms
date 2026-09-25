import {mongoStore} from '@bg/database';
import {seedStore,createAdmin,hash} from '@bg/cms';
import {config} from '../config.js';
if(!config.mongo)throw new Error('Set MONGODB_URI in .env first.');
const store=await mongoStore(config.mongo);
try{await seedStore(store);if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD&&!await store.get('users',await hash(process.env.ADMIN_EMAIL.toLowerCase().trim())))await createAdmin(store,process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD,process.env.ADMIN_NAME||'BG Administrator');console.log('Imported 139 pages, shared sections and media. Existing records were preserved.');}finally{await store.close();}
