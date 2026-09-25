import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const root=fileURLToPath(new URL('../../../',import.meta.url));
dotenv.config({path:path.join(root,'.env'),quiet:true});
export const config={mongo:process.env.MONGODB_URI,port:Number(process.env.PORT||4000),production:process.env.NODE_ENV==='production',origins:(process.env.CORS_ORIGINS||'http://localhost:3000,http://localhost:5173,http://localhost:4173').split(',').map(s=>s.trim())};
