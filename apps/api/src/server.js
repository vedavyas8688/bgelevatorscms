import {mongoStore} from '@bg/database';
import {config} from './config.js';
import {createApp} from './app.js';
import express from 'express';

let store;
let appPromise;
function getApp(){
 if(!config.mongo)return Promise.reject(new Error('Set MONGODB_URI in the Vercel project environment variables.'));
 if(!appPromise)appPromise=mongoStore(config.mongo).then(nextStore=>{store=nextStore;return createApp(nextStore).app;}).catch(error=>{appPromise=undefined;throw error;});
 return appPromise;
}

// Keep module evaluation successful even when an external dependency is
// temporarily unavailable. Vercel can then log the real initialization error
// instead of replacing it with a generic FUNCTION_INVOCATION_FAILED page.
const app=express();
app.use(async(req,res)=>{
 try{const readyApp=await getApp();return readyApp(req,res);}
 catch(error){console.error('API initialization failed:',error);if(!res.headersSent)res.status(503).json({error:'API initialization failed. Check the deployment runtime logs.'});}
});

// Vercel detects this default export and runs the Express app as one Function.
// Local development keeps the normal long-running HTTP server and graceful shutdown.
export default app;
if(!process.env.VERCEL){
 const server=app.listen(config.port,()=>console.log(`BG Elevators API listening on ${config.port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{if(store)await store.close();process.exit(0)}));
}
