import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const root=fileURLToPath(new URL('../../../',import.meta.url));
if(!process.env.VERCEL)try{loadEnvFile(path.join(root,'.env'));}catch(error){if(error?.code!=='ENOENT')throw error;}
export const config={mongo:process.env.MONGODB_URI,port:Number(process.env.PORT||4000),production:process.env.NODE_ENV==='production',origins:(process.env.CORS_ORIGINS||'http://localhost:3000,http://localhost:5173,http://localhost:4173').split(',').map(s=>s.trim())};
