import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import {createService} from '@bg/cms';
import {config,root} from './config.js';
export function createApp(store,overrides={}){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',process.env.TRUST_PROXY==='1'?1:false);
 app.use(helmet({contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'same-site'}}));
 app.use((req,res,next)=>{const origin=req.headers.origin;if(origin&&config.origins.includes(origin)){res.header('Access-Control-Allow-Origin',origin);res.header('Vary','Origin');res.header('Access-Control-Allow-Credentials','true');res.header('Access-Control-Allow-Headers','Content-Type, X-BG-CSRF');res.header('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');}next();});
 app.use(express.raw({type:()=>true,limit:'12mb'}));
 const uploadRoot=path.resolve(process.env.UPLOAD_DIR||path.join(root,'uploads'));
 const transport=process.env.SMTP_HOST?nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:10000}):null;
 const service=createService(store,{origins:config.origins,production:config.production,
  async upload(item,bytes){
   if(process.env.IMAGEKIT_PRIVATE_KEY){
    const form=new FormData();form.set('file',new Blob([bytes],{type:item.type}),item.name);form.set('fileName',item.id+'-'+item.name);form.set('folder','/bg-elevators');
    const r=await fetch('https://upload.imagekit.io/api/v1/files/upload',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY+':').toString('base64')},body:form,signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('ImageKit upload failed');const d=await r.json();return {url:d.url,storage:'imagekit',fileId:d.fileId};
   }
   if(process.env.VERCEL)throw Object.assign(new Error('IMAGEKIT_PRIVATE_KEY is required for persistent uploads on Vercel.'),{status:503});
   await fs.mkdir(uploadRoot,{recursive:true});await fs.writeFile(path.join(uploadRoot,item.id),bytes,{flag:'wx',mode:0o600});return {storage:'local'};
  },
  async download(item){if(item.storage==='imagekit')return {body:new Uint8Array(await (await fetch(item.url)).arrayBuffer())};return {body:await fs.readFile(path.join(uploadRoot,item.id))};},
  notify:transport&&process.env.ENQUIRY_EMAIL?async record=>transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:process.env.ENQUIRY_EMAIL,replyTo:record.email,subject:`BG Elevators: new ${record.type} from ${record.name}`,text:`Name: ${record.name}\nEmail: ${record.email}\nPhone: ${record.phone}\nLocation: ${record.location}\nMessage: ${record.message}\n\nReview and download attachments in the CMS.`}):undefined,
  ...overrides});
 app.use('/api',async(req,res)=>{try{
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
  // Never trust client-supplied platform identity headers on the VPS.
  for(const name of [...headers.keys()])if(name.startsWith('oai-authenticated-'))headers.delete(name);
  headers.set('x-client-ip',req.ip||'unknown');const request=new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)&&req.body?.length?{body:req.body}: {})});
  const response=await service.fetch(request);res.status(response.status);response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e.message);res.status(503).json({error:'Service unavailable. Please try again.'});}});
 app.use(['/images','/vendor','/css','/fonts','/js'],(req,res,next)=>express.static(path.join(root,'apps/storefront/public',req.baseUrl),{dotfiles:'deny'})(req,res,next));
 app.use((err,req,res,next)=>res.status(err.status||500).json({error:err.status===413?'File is too large.':'Request failed.'}));
 return {app,service};
}
