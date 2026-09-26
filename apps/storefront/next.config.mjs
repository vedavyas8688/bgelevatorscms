import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
dotenv.config({path:path.join(root,'.env'),quiet:true});

export default {poweredByHeader:false,output:'standalone',outputFileTracingRoot:root,transpilePackages:['@bg/content'],allowedDevOrigins:['192.168.0.3'],async rewrites(){return [{source:'/api/:path*',destination:`${process.env.API_URL||'http://127.0.0.1:4000'}/api/:path*`}];},experimental:{cpus:2}};
