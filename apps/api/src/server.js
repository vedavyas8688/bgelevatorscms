import {mongoStore} from '@bg/database';
import {config} from './config.js';
import {createApp} from './app.js';
if(!config.mongo)throw new Error('Set MONGODB_URI in the root .env file. See README.md.');
const store=await mongoStore(config.mongo);const {app}=createApp(store);
const server=app.listen(config.port,()=>console.log(`BG Elevators API listening on ${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await store.close();process.exit(0)}));
