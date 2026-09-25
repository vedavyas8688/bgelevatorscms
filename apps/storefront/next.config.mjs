import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
if(!process.env.VERCEL)try{loadEnvFile(path.join(root,'.env'));}catch(error){if(error?.code!=='ENOENT')throw error;}

export default {poweredByHeader:false,output:'standalone',outputFileTracingRoot:root,transpilePackages:['@bg/content'],async rewrites(){return [{source:'/api/:path*',destination:`${process.env.API_URL||'http://127.0.0.1:4000'}/api/:path*`}];},experimental:{cpus:2}};
