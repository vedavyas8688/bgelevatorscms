import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {mongoStore} from '@bg/database';
import {seedStore,createAdmin} from '@bg/cms';
import {seed,templates} from '@bg/content';
import {createApp} from '../apps/api/src/app.js';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
const results=[];const check=(label,ok)=>{assert.ok(ok,label);results.push(label);console.log('PASS',label)};
const mongo=await MongoMemoryServer.create({instance:{args:['--nounixsocket']}});
const store=await mongoStore(mongo.getUri());let server,next;
try{
 await seedStore(store);await seedStore(store);check('Seed is idempotent: 139 original pages',(await store.list('pages')).length===139);
 const password='Test-only-'+crypto.randomUUID();await createAdmin(store,'admin@bg-test.invalid',password,'Test Administrator');
 const uploaded=new Map();const {app}=createApp(store,{notify:undefined,upload:async(item,bytes)=>{uploaded.set(item.id,bytes);return {storage:'test'}},download:async item=>({body:uploaded.get(item.id)})});
 server=await new Promise(resolve=>{const s=app.listen(4000,'127.0.0.1',()=>resolve(s))});const origin='http://127.0.0.1:4000';let cookie='',csrf='';
 async function request(path,body,method){const r=await fetch(origin+'/api'+path,{method:method||(body?'POST':'GET'),headers:{...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-BG-CSRF':csrf}:{}),Origin:'http://localhost:3000'},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});return r;}
 check('Unauthenticated administration is rejected',(await request('/admin/pages')).status===401);
 let r=await request('/auth/login',{email:'admin@bg-test.invalid',password});check('Administrator login succeeds',r.status===200);cookie=r.headers.get('set-cookie').split(';')[0];({csrf}=await r.json());
 check('Session cookie is HttpOnly',r.headers.get('set-cookie').includes('HttpOnly'));
 check('CSRF rejects missing token',(await fetch(origin+'/api/admin/pages/home',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'})).status===403);
 const contact=await(await request('/admin/pages/contact-us')).json();
 for(const section of contact.draft.sections){const iframe=templates[section.template].fields.find(f=>f.label==='iframe: src');if(iframe){section.fields[iframe.id]='javascript:alert(1)';break;}}
 check('Executable iframe URLs are rejected',(await request('/admin/pages/contact-us',{version:contact.version,draft:contact.draft},'PUT')).status===400);
 let home=await (await request('/admin/pages/home')).json();const original=structuredClone(home);const sec=home.draft.sections[0],field=templates[sec.template].fields.find(f=>f.type==='text');const marker='CMS integration test '+Date.now();sec.fields[field.id]=marker;
 r=await request('/admin/pages/home',{version:home.version,draft:home.draft,name:home.name},'PUT');assert.equal(r.status,200,await r.clone().text());home=await r.json();
 let live=await (await request('/public/page?path=%2F')).json();check('Draft edits do not affect the public website',!live.view.html.includes(marker));
 r=await request('/admin/pages/home/preview');check('Authenticated draft preview renders the saved change',(await r.text()).includes(marker));
 r=await request('/admin/pages/home/publish',{version:home.version});home=await r.json();live=await(await request('/public/page?path=%2F')).json();check('Publishing updates server-rendered website content',live.view.html.includes(marker));
 r=await request('/admin/pages/home',{version:1,draft:home.draft},'PUT');check('Stale edits are rejected',r.status===409);
 r=await request('/admin/pages/home',{version:home.version,draft:original.draft,name:original.name},'PUT');home=await r.json();await request('/admin/pages/home/publish',{version:home.version});
 // Every migrated page can be loaded and saved without changing its URL or losing required fields.
 for(const p of seed.pages){r=await request('/public/page?path='+encodeURIComponent(p.path));assert.equal(r.status,200,p.path);const d=await r.json();assert.ok(d.view.html.length>100,p.path);assert.ok(!/__BG_(?:f\d+|SECTION|REGION)/.test(d.view.html),p.path+' contains unresolved fields');}
 check('All 139 original routes render with resolved CMS fields',true);
 r=await request('/admin/pages',{title:'CMS New Post Test',path:'/cms-new-post-test',excerpt:'Purpose-built post creation test.',body:'<h2>New post body</h2><p>Created through the dedicated endpoint.</p>',status:'draft',publishDate:'2026-09-25',featured:true,categories:['Elevators'],tags:['CMS'],featuredImage:'/images/topInovation.webp',author:{name:'BG Administrator',bio:'Test author'},seo:{title:'CMS New Post Test',description:'Purpose-built post creation test.',focusKeyword:'new post',robots:'index,follow',maxImagePreview:'large'}});assert.equal(r.status,201,await r.clone().text());const createdPost=await r.json();check('Dedicated New Post endpoint creates a structured blog draft',createdPost.kind==='blog'&&createdPost.status==='draft'&&createdPost.draft.blog.author.name==='BG Administrator'&&createdPost.draft.listing.title==='CMS New Post Test');check('New Post uses a clean extensionless route',createdPost.path==='/cms-new-post-test');check('New Post remains private until publication',(await request('/public/page?path=%2Fcms-new-post-test')).status===404);
 const post=seed.pages.find(p=>p.kind==='blog');r=await request('/admin/pages/'+post.id+'/duplicate',{path:'/test-dynamic-blog',name:'Test dynamic article'});assert.equal(r.status,201,await r.clone().text());let duplicate=await r.json();check('New pages start as unpublished drafts',(await request('/public/page?path=%2Ftest-dynamic-blog.html')).status===404);
 duplicate.draft.listing.title='Test dynamic article';r=await request('/admin/pages/'+duplicate.id,{version:duplicate.version,draft:duplicate.draft},'PUT');duplicate=await r.json();r=await request('/admin/pages/'+duplicate.id+'/publish',{version:duplicate.version});duplicate=await r.json();live=await(await request('/public/page?path=%2Fblogs')).json();check('New published blog posts appear in the blog listing',live.view.html.includes('/test-dynamic-blog'));
 r=await request('/admin/pages/'+duplicate.id+'/unpublish',{version:duplicate.version});check('Unpublished page returns a real 404',(await request('/public/page?path=%2Ftest-dynamic-blog.html')).status===404);
 const form=new FormData();for(const [k,v]of Object.entries({Name:'QA Customer',Email:'customer@example.invalid',Phone:'+919876543210',Message:'Local integration test',source:'/contact-us'}))form.set(k,v);
 r=await request('/enquiries',form);assert.equal(r.status,201,await r.clone().text());const inquiryId=(await r.json()).id;let inquiry=await(await request('/admin/inquiries/'+inquiryId)).json();check('Contact form persists to the CMS',inquiry.name==='QA Customer');
 r=await request('/admin/inquiries/'+inquiryId,{...inquiry,status:'closed',notes:'Test completed'},'PUT');check('Enquiry status and notes save',r.status===200);
 const career=new FormData();for(const [k,v]of form.entries())career.set(k,v);career.set('type','career');career.set('Resume',new File(['%PDF-1.4\nTest resume'], 'resume.pdf',{type:'application/pdf'}));r=await request('/enquiries',career);assert.equal(r.status,201,await r.clone().text());const careerId=(await r.json()).id;const savedCareer=await(await request('/admin/inquiries/'+careerId)).json();check('Career resume is stored privately',savedCareer.attachment.private);check('Anonymous users cannot download resumes',(await fetch(origin+savedCareer.attachment.url)).status===401);check('Authenticated staff can download resumes',(await fetch(origin+savedCareer.attachment.url,{headers:{Cookie:cookie}})).status===200);
 const badFile=new FormData();badFile.set('file',new File(['<script>alert(1)</script>'],'photo.jpg',{type:'image/jpeg'}));check('Mislabelled executable upload is rejected',(await request('/admin/media/upload',badFile)).status===400);
 const file=new FormData();file.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=','base64')],'pixel.png',{type:'image/png'}));r=await request('/admin/media/upload',file);assert.equal(r.status,201,await r.clone().text());const image=await r.json();check('Uploaded images are retrievable',(await fetch(origin+image.url)).status===200);
 r=await request('/admin/users',{email:'editor@bg-test.invalid',password,name:'Editor',role:'editor'});check('Administrator can create editor accounts',r.status===201);await request('/auth/logout',{});cookie='';csrf='';r=await request('/auth/login',{email:'editor@bg-test.invalid',password});cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await r.json()).csrf;home=await(await request('/admin/pages/home')).json();check('Editors cannot publish',(await request('/admin/pages/home/publish',{version:home.version})).status===403);check('Editors cannot access team settings',(await request('/admin/users')).status===403);
 r=await request('/admin/pages/home',{version:home.version,draft:home.draft},'PUT');check('Editors can save drafts',r.status===200);
 // Exercise the built Next.js server, with the real Express and MongoDB backing it.
 next=spawn(process.execPath,['../../node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3108'],{cwd:new URL('../apps/storefront',import.meta.url),env:{...process.env,API_URL:origin,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});let nextLog='';next.stdout.on('data',b=>nextLog+=b);next.stderr.on('data',b=>nextLog+=b);
 let ready=false;for(let i=0;i<100;i++){try{r=await fetch('http://127.0.0.1:3108/',{signal:AbortSignal.timeout(1500)});if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,150));}assert.ok(ready,nextLog);
 const html=await r.text();check('Next.js production server renders original home content',html.includes('30+ Years of Excellence')&&html.includes('BG Elevators'));
 {const legacy=await fetch('http://127.0.0.1:3108/index.html',{redirect:'manual'});check('Next.js permanently redirects index.html to /',legacy.status===301&&legacy.headers.get('location')==='/');}
 check('Next.js returns 404 for missing pages',(await fetch('http://127.0.0.1:3108/not-a-page.html')).status===404);
 check('XML sitemap is generated',(await(await fetch('http://127.0.0.1:3108/sitemap.xml')).text()).includes('<urlset'));
 await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/test-results.json',JSON.stringify({runAt:new Date().toISOString(),database:'MongoDB (isolated test database)',next:'15.5.26',passed:results.length,checks:results},null,2));
 console.log('Completed',results.length,'integration checks.');
}finally{if(next&&next.exitCode===null){next.kill('SIGTERM');await Promise.race([new Promise(r=>next.once('exit',r)),new Promise(r=>setTimeout(r,3000))])}if(server)await new Promise(r=>server.close(r));await store.close();await mongo.stop();}
