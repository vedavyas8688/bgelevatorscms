import {createService} from '@bg/cms';
import {documentHtml} from '@bg/content';
import {d1Store} from './store.js';
export async function handleWebsite(request,service,assets){
 const url=new URL(request.url);const path=url.pathname;
 if(path.startsWith('/api/'))return service.fetch(request);
 if(path==='/admin'||path==='/admin/'||path.startsWith('/admin/')&&!path.startsWith('/admin/assets/'))return assets('/admin/index.html');
 if(path==='/sitemap.xml')return service.fetch(new Request(url.origin+'/api/public/sitemap',{headers:request.headers}));
 if(path==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}}); // private preview must not be indexed
 if(path!=='/'&&/\.[a-z0-9]+$/i.test(path)&&!path.endsWith('.html'))return assets(path);
 const response=await service.fetch(new Request(url.origin+'/api/public/page?path='+encodeURIComponent(path),{headers:request.headers}));const data=await response.json();
 if(!response.ok)return new Response(`<!doctype html><html><head><meta name="robots" content="noindex"><title>BG Elevators</title></head><body style="font:16px Arial;padding:10vw"><h1>${response.status===404?'Page not found':'Temporarily unavailable'}</h1><p>${response.status===404?'This page is unavailable.':'Please try again in a moment.'}</p><a href="/">Return to home</a></body></html>`,{status:response.status,headers:{'Content-Type':'text/html'}});
 if(data.redirect)return Response.redirect(new URL(data.redirect,url.origin),data.status||301);
 return new Response(documentHtml(data.view,data.settings,data.page.path),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'}});
}
export default {async fetch(request,env){
 try{
  if(!env.DB)return new Response('Content database unavailable.',{status:503});
  const service=createService(d1Store(env.DB),{platformAuth:true,production:true,
   async upload(item,bytes){await env.BUCKET.put(item.id,bytes,{httpMetadata:{contentType:item.type}});return {storage:'r2'};},
   async download(item){const object=await env.BUCKET.get(item.id);return object?{body:object.body}:null;}});
  return await handleWebsite(request,service,path=>env.ASSETS.fetch(new Request(new URL(path,request.url),request)));
 }catch(e){console.error(e.message);return new Response('Service unavailable. Please try again.',{status:503});}
}};
