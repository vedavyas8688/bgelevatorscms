import sanitizeHtml from 'sanitize-html';
import { seed,templates,renderPage,documentHtml,sitemapXml,cleanPath,cleanInternalUrls } from '@bg/content';
export const clone = x => structuredClone(x);
export const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const random = () => crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const now = () => new Date().toISOString();
export const failure = (message,status=400) => Object.assign(new Error(message),{status});
const assert=(ok,message,status=400)=>{if(!ok)throw failure(message,status);};
const plain=(v,max=10000)=>String(v??'').slice(0,max);
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,status:u.status});
const safeUrl=(v,external=false)=>{v=plain(v,3000).trim();assert(!v||/^(https?:\/\/|\/[^/]|\/$|#|mailto:|tel:)/i.test(v),'Use a relative path or a valid http(s) URL.');if(external&&v)assert(/^https?:\/\//i.test(v),'Use a full http(s) URL.');return v;};
const safePath=path=>{path=plain(path,500).trim();assert(/^\/[a-z0-9][a-z0-9/-]*$/.test(path)&&!path.includes('//')&&!path.includes('/api/')&&!path.startsWith('/admin/'),'Use a unique lowercase URL without .html.');return path;};
const safeLegacyPath=path=>{path=plain(path,500).trim();assert(/^\/[a-z0-9][a-z0-9/-]*\.html$/.test(path)&&!path.includes('//'),'Use a valid legacy .html path.');return path;};
const safePostPath=safePath;
export async function passwordHash(password,salt=random()) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bytes=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:600000,hash:'SHA-256'},key,256);
 return salt+':'+Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function passwordMatches(password,stored){if(!stored)return false;const value=await passwordHash(password,stored.split(':')[0]);let d=value.length^stored.length;for(let i=0;i<value.length;i++)d|=value.charCodeAt(i)^stored.charCodeAt(i);return d===0;}
export async function seedStore(store){for(const [kind,values] of Object.entries(seed)){for(const value of values){if(!await store.get(kind,value.id))await store.put(kind,value.id,clone(value),0);}}}
export async function createAdmin(store,email,password,name='Administrator'){
 email=String(email).toLowerCase().trim();assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Valid email required.');assert(password?.length>=12,'Password must have at least 12 characters.');
 const id=await hash(email);assert(!await store.get('users',id),'User already exists.');
 return store.put('users',id,{id,email,name,role:'admin',status:'active',passwordHash:await passwordHash(password),createdAt:now()},0);
}
function cleanContent(templateId,data,isRegion=false){
 assert(data&&typeof data==='object','Content is required.');
 const cleanFields=(t,c)=>{
  assert(templates[t],'Unknown section template.');const out={};
  for(const f of templates[t].fields||[]){let value=plain(c?.fields?.[f.id],f.type==='richtext'?350000:20000);
   if(f.type==='richtext')value=sanitizeHtml(value,{allowedTags:[...sanitizeHtml.defaults.allowedTags,'img','h1','h2','table','thead','tbody','tr','th','td','span','div','figure','figcaption'],allowedAttributes:{'*':['class','id'],a:['href','target','rel'],img:['src','alt','width','height','loading'],th:['colspan','rowspan'],td:['colspan','rowspan']},allowedSchemes:['http','https','mailto','tel']});
   if(['image','url'].includes(f.type))value=safeUrl(value);
   if(f.type==='blogList'){let arr;try{arr=JSON.parse(value)}catch{throw failure('Select valid blog articles.')}assert(Array.isArray(arr)&&arr.length<1000&&arr.every(x=>typeof x==='string'&&x.startsWith('/')),'Invalid blog selection.');value=JSON.stringify(arr);}
   out[f.id]=value;
  }return {fields:out,enabled:c?.enabled!==false};
 };
 if(isRegion)return cleanFields(templateId,data);
 const original=seed.pages.find(p=>p.template===templateId);assert(original,'Unknown page layout.');
 const allowed=new Map(original.draft.sections.map(s=>[s.id,s.template]));
 assert(Array.isArray(data.sections)&&data.sections.length===allowed.size,'The existing layout requires all original sections. Hide sections instead of deleting them.');
 assert(new Set(data.sections.map(s=>s.id)).size===allowed.size,'Duplicate sections.');
 const sections=data.sections.map(s=>{assert(allowed.get(s.id)===s.template,'Invalid section.');return {id:s.id,template:s.template,...cleanFields(s.template,s)};});
 const se=data.seo||{};let schema=se.schema||[];assert(Array.isArray(schema)&&JSON.stringify(schema).length<120000,'Structured data must be a JSON array.');
 const seo={title:plain(se.title,200),description:plain(se.description,1000),canonical:safeUrl(se.canonical,true),robots:['index,follow','noindex,follow','noindex,nofollow'].includes(se.robots)?se.robots:'index,follow',ogTitle:plain(se.ogTitle,200),ogDescription:plain(se.ogDescription,1000),ogImage:safeUrl(se.ogImage),twitterTitle:plain(se.twitterTitle,200),twitterDescription:plain(se.twitterDescription,1000),schema};
 const l=data.listing||{};
 const b=data.blog||{},author=b.author||{};
 const strings=(value,max=30)=>Array.isArray(value)?value.slice(0,max).map(item=>plain(item,120).trim()).filter(Boolean):[];
 return {sections,seo,listing:{title:plain(l.title,300),excerpt:plain(l.excerpt,1500),date:plain(l.date,80),image:safeUrl(l.image)},blog:{publishDate:plain(b.publishDate,80),featured:Boolean(b.featured),categories:strings(b.categories),tags:strings(b.tags),author:{name:plain(author.name,150),avatar:safeUrl(author.avatar),bio:plain(author.bio,3000)},relatedProducts:strings(b.relatedProducts),relatedCategories:strings(b.relatedCategories),relatedBrands:strings(b.relatedBrands),focusKeyword:plain(b.focusKeyword,250),maxImagePreview:['none','standard','large'].includes(b.maxImagePreview)?b.maxImagePreview:'large'}};
}
export function createService(store,options={}) {
 const {platformAuth=false,origins=[],upload,download,notify,production=false}=options;
 let publicCache=null,publicCacheAt=0;
 const invalidatePublic=()=>{publicCache=null;publicCacheAt=0;};
 const publicData=async()=>{
  if(publicCache&&Date.now()-publicCacheAt<60000)return publicCache;
  publicCache=await Promise.all([store.list('pages'),store.list('regions'),store.get('settings','site')]).then(([pages,regions,settings])=>({pages,regions,settings:settings||{}}));publicCacheAt=Date.now();return publicCache;
 };
 const audit=async(user,action,entity)=>{const id=crypto.randomUUID();await store.put('audit',id,{id,actor:user.email,action,entity,createdAt:now()},0);};
 const auditSafe=async(...args)=>{try{await audit(...args)}catch(e){console.error('Audit write failed',e.message)}};
 async function identify(req){
  if(platformAuth){const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');return id&&email?{user:{id,email,name:email,role:'admin',status:'active'},csrf:'platform'}:null;}
  const cookie=req.headers.get('cookie')||'';const raw=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('bg_session='))?.slice(11);
  if(!raw)return null;const session=await store.get('sessions',await hash(raw));if(!session||new Date(session.expiresAt)<new Date())return null;
  const user=await store.get('users',session.userId);return user?.status==='active'?{user,csrf:session.csrf,session}:null;
 }
 async function rate(key,max,minutes){
  const id=await hash(key+':'+Math.floor(Date.now()/(minutes*60000)));const record=await store.get('limits',id);assert((record?.count||0)<max,'Too many requests. Please try again later.',429);
  try{await store.put('limits',id,{id,count:(record?.count||0)+1,expiresAt:new Date(Date.now()+minutes*60000).toISOString()},record?.version||0)}catch(e){if(e.status===409)throw failure('Please retry in a moment.',429);throw e;}
 }
 async function parse(req){const data=await req.json().catch(()=>{throw failure('Invalid JSON.');});assert(JSON.stringify(data).length<1800000,'Content is too large.',413);return data;}
 async function handle(req){
  const url=new URL(req.url),path=url.pathname.replace(/\/$/,'')||'/',method=req.method;
  const origin=req.headers.get('origin');
  if(!['GET','HEAD','OPTIONS'].includes(method)){
   assert(!origin||[url.origin,...origins].includes(origin),'Cross-site request blocked.',403);
   assert(req.headers.get('sec-fetch-site')!=='cross-site','Cross-site request blocked.',403);
  }
  if(method==='OPTIONS')return new Response(null,{status:204});
  if(path==='/api/health')return json({ok:true,service:'BG Elevators CMS'});
  if(path==='/api/auth/mode')return json({mode:platformAuth?'platform':'password'});
  if(path==='/api/auth/login'&&method==='POST'){
   assert(!platformAuth,'Use ChatGPT sign-in.',400);const d=await parse(req);const email=plain(d.email,200).toLowerCase().trim();
   await rate('login:'+email+':'+(req.headers.get('x-client-ip')||''),10,15);
   const user=await store.get('users',await hash(email));assert(user?.status==='active'&&await passwordMatches(plain(d.password,500),user.passwordHash),'Email or password is incorrect.',401);
   const token=random(),csrf=random(),id=await hash(token);await store.put('sessions',id,{id,userId:user.id,csrf,expiresAt:new Date(Date.now()+12*3600000).toISOString()},0);
   await auditSafe(user,'Signed in','account');return json({user:safeUser(user),csrf},200,{'Set-Cookie':`bg_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${production?'; Secure':''}`});
  }
  if(path.startsWith('/api/public')){
   const {pages,regions,settings}=await publicData();
   if(path==='/api/public/settings')return json(settings);
   if(path==='/api/public/pages')return json(pages.filter(p=>p.published&&p.status!=='archived').map(p=>({id:p.id,path:cleanPath(p.path),kind:p.kind,name:p.name,updatedAt:p.updatedAt,seo:cleanInternalUrls(p.published.seo),listing:p.published.listing})));
   if(path==='/api/public/page'){
    const wanted=url.searchParams.get('path')||'/';const canonical=cleanPath(wanted);
    const red=await store.get('redirects',await hash(wanted));if(red)return json({redirect:red.to,status:red.code});
    if(wanted!==canonical)return json({redirect:canonical,status:301});
    const p=pages.find(p=>cleanPath(p.path)===canonical);
    assert(p&&p.published&&p.status!=='archived','Page not found.',404);return json({page:{id:p.id,path:canonical,kind:p.kind},view:renderPage(p,regions,pages),settings},200,{'Cache-Control':'public, max-age=30, stale-while-revalidate=300'});
   }
   if(path==='/api/public/sitemap')return new Response(sitemapXml(pages,settings.siteUrl||url.origin),{headers:{'Content-Type':'application/xml'}});
   throw failure('Not found.',404);
  }
  if((path==='/api/enquiries'||path==='/api/applications')&&method==='POST'){
   await rate('enquiry:'+(req.headers.get('x-client-ip')||req.headers.get('cf-connecting-ip')||'unknown'),8,10);
   const form=await req.formData();if(form.get('website'))return json({status:'success'});
   const name=plain(form.get('Name')||form.get('name'),150).trim(),email=plain(form.get('Email')||form.get('email'),200).trim(),phone=plain(form.get('Phone')||form.get('phone'),40).trim();
   assert(name.length>=2,'Please enter your name.');assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Please enter a valid email.');assert(/^[+\d ()-]{7,30}$/.test(phone),'Please enter a valid phone number.');
   const file=form.get('Resume')||form.get('file');const type=form.get('type')==='career'||path==='/api/applications'||file?.size?'career':'enquiry';
   const id=crypto.randomUUID();let attachment=null;
   if(file?.size){assert(file.size<=5*1024*1024,'Resume must be 5 MB or smaller.');assert(/\.(pdf|docx)$/i.test(file.name),'Upload a PDF or DOCX resume.');attachment=await saveUpload(file,true);}
   const record={id,type,name,email,phone,location:plain(form.get('Location'),250),message:plain(form.get('Message')||form.get('message'),10000),cvUrl:safeUrl(form.get('CV-URL')||''),source:plain(form.get('source'),500),attachment,status:'new',notes:'',createdAt:now()};
   await store.put('inquiries',id,record,0);
   if(notify){try{await notify(record)}catch(e){console.error('Enquiry saved; email delivery failed:',e.message);await store.put('inquiries',id,{...record,notification:'failed'});}}
   return json({status:'success',message:'Thank you. Your message has been received.',id},201);
  }
  const auth=await identify(req);
  if(path.startsWith('/api/media/')){
   const id=path.split('/').pop();const item=await store.get('media',id);assert(item,'File not found.',404);if(item.private)assert(auth,'Sign in required.',401);
   if(item.source==='original')return Response.redirect(new URL(item.url,url.origin),302);
   const blob=await download?.(item);assert(blob,'File unavailable.',404);return new Response(blob.body,{headers:{'Content-Type':item.type,'X-Content-Type-Options':'nosniff','Cache-Control':item.private?'private, no-store':'public, max-age=86400',...(item.private?{'Content-Disposition':`attachment; filename="${item.name.replace(/[^a-zA-Z0-9._-]/g,'_')}"`}:{})}});
  }
  assert(auth,'Sign in required.',401);const user=auth.user;
  if(!['GET','HEAD','OPTIONS'].includes(method))assert(req.headers.get('x-bg-csrf')===auth.csrf,'Your session changed. Refresh and try again.',403);
  if(path==='/api/auth/me')return json({user:safeUser(user),csrf:auth.csrf});
  if(path==='/api/auth/logout'&&method==='POST'){if(auth.session)await store.remove('sessions',auth.session.id);return json({ok:true},200,{'Set-Cookie':`bg_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${production?'; Secure':''}`});}
  assert(path.startsWith('/api/admin'),'Not found.',404);
  if(path==='/api/admin/dashboard'){
   const [pages,inquiries,media,audit]=await Promise.all(['pages','inquiries','media','audit'].map(k=>store.list(k)));
   return json({pages:pages.length,published:pages.filter(p=>p.published&&p.status!=='archived').length,blogs:pages.filter(p=>p.kind==='blog').length,media:media.filter(m=>!m.private).length,enquiries:inquiries.filter(i=>i.status==='new').length,recent:inquiries.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6),activity:audit.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8)});
  }
  if(path==='/api/admin/templates')return json(Object.fromEntries(Object.entries(templates).map(([id,t])=>[id,{id,label:t.label,fields:t.fields}])));
  if(path==='/api/admin/media/upload'&&method==='POST'){const form=await req.formData();const file=form.get('file');assert(file?.size,'Choose a file.');const item=await saveUpload(file,false);await auditSafe(user,'Uploaded media',item.name);return json(item,201);}
  if(path==='/api/admin/inquiries/export'){
   const rows=await store.list('inquiries');const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
   const keys=['createdAt','type','name','email','phone','location','message','status','notes'];return new Response([keys.join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bg-enquiries.csv"'}});
  }
  const match=path.match(/^\/api\/admin\/(pages|regions|media|inquiries|settings|users|redirects|audit)(?:\/([^/]+))?(?:\/(publish|unpublish|preview|duplicate|password))?$/);assert(match,'Not found.',404);
  const [,kind,rawId,action]=match;const id=rawId?decodeURIComponent(rawId):undefined;
  if(['users','settings','redirects','audit'].includes(kind))assert(user.role==='admin','Administrator access required.',403);
  if(kind==='pages'&&method==='POST'&&!id){
   const data=await parse(req);
   const title=plain(data.title,300).trim(),pagePath=safePostPath(data.path);assert(title.length>=3,'Enter a post title.');
   const pages=await store.list('pages');assert(!pages.some(page=>cleanPath(page.path)===pagePath),'This URL already exists.',409);
   const source=pages.find(page=>page.kind==='blog'&&page.draft?.sections?.some(section=>(templates[section.template]?.fields||[]).some(field=>field.type==='richtext')));assert(source,'A blog layout is required before creating posts.',500);
   const created=now(),newId=pagePath.slice(1),draft=clone(source.draft),article=draft.sections.find(section=>(templates[section.template]?.fields||[]).some(field=>field.type==='richtext'));
   let imageAssigned=false;
   for(const field of templates[article.template].fields||[]){const label=field.label.toLowerCase();if(field.type==='richtext')article.fields[field.id]=plain(data.body,350000);else if(label.startsWith('heading:'))article.fields[field.id]=title;else if(field.type==='image'&&!imageAssigned){article.fields[field.id]=safeUrl(data.featuredImage);imageAssigned=true;}else if(label.includes('srcset')&&data.featuredImage)article.fields[field.id]=safeUrl(data.featuredImage);}
   draft.listing={title,excerpt:plain(data.excerpt,1500),date:plain(data.publishDate,80),image:safeUrl(data.featuredImage)};
   draft.seo={title:plain(data.seo?.title||title,200),description:plain(data.seo?.description||data.excerpt,1000),canonical:safeUrl(data.seo?.canonical,true),robots:data.seo?.robots==='noindex,nofollow'?'noindex,nofollow':data.seo?.robots==='noindex,follow'?'noindex,follow':'index,follow',ogTitle:plain(data.seo?.ogTitle||data.seo?.title||title,200),ogDescription:plain(data.seo?.ogDescription||data.seo?.description||data.excerpt,1000),ogImage:safeUrl(data.seo?.ogImage||data.featuredImage),twitterTitle:plain(data.seo?.twitterTitle||data.seo?.title||title,200),twitterDescription:plain(data.seo?.twitterDescription||data.seo?.description||data.excerpt,1000),schema:[]};
   draft.blog={publishDate:plain(data.publishDate,80),featured:Boolean(data.featured),categories:Array.isArray(data.categories)?data.categories:[],tags:Array.isArray(data.tags)?data.tags:[],author:data.author||{},relatedProducts:Array.isArray(data.relatedProducts)?data.relatedProducts:[],relatedCategories:Array.isArray(data.relatedCategories)?data.relatedCategories:[],relatedBrands:Array.isArray(data.relatedBrands)?data.relatedBrands:[],focusKeyword:plain(data.seo?.focusKeyword,250),maxImagePreview:['none','standard','large'].includes(data.seo?.maxImagePreview)?data.seo.maxImagePreview:'large'};
   const cleanDraft=cleanContent(source.template,draft),publish=data.status==='published'&&user.role==='admin';
   const page={...clone(source),id:newId,path:pagePath,name:title,kind:'blog',draft:cleanDraft,published:publish?clone(cleanDraft):null,status:publish?'published':'draft',createdAt:created,updatedAt:created};delete page.version;
   const saved=await store.put('pages',newId,page,0);invalidatePublic();await auditSafe(user,publish?'Created and published blog post':'Created blog draft',pagePath);return json(saved,201);
  }
  if(method==='GET'){
   if(action==='preview'){
    const p=await store.get(kind,id);assert(p,'Not found.',404);const [regions,pages,settings]=await Promise.all([store.list('regions'),store.list('pages'),store.get('settings','site')]);return new Response(documentHtml(renderPage(p,regions,pages,true),settings,p.path),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
   }
   if(id){const record=await store.get(kind,id);assert(record,'Not found.',404);return json(kind==='users'?safeUser(record):record);}
   let records=await store.list(kind);
   if(kind==='users')records=records.map(safeUser);
   if(kind==='pages')records=records.map(p=>({id:p.id,path:cleanPath(p.path),name:p.name,kind:p.kind,status:p.status,hasDraft:JSON.stringify(p.draft)!==JSON.stringify(p.published),updatedAt:p.updatedAt,version:p.version,template:p.template}));
   if(kind==='media')records=records.filter(m=>!m.private);
   if(kind==='audit'||kind==='inquiries')records.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
   return json(records);
  }
  const data=method==='DELETE'?{}:await parse(req);
  if(kind==='pages'||kind==='regions'){
   if(action==='duplicate'&&method==='POST'){
    assert(kind==='pages','Only pages can be duplicated.');const source=await store.get(kind,id);assert(source,'Not found.',404);const path=safePath(data.path);assert(!(await store.list('pages')).some(p=>cleanPath(p.path)===path),'This URL already exists.',409);
    const newId=path.slice(1);const page={...clone(source),id:newId,path,name:plain(data.name,200)||source.name+' copy',published:null,status:'draft',createdAt:now(),updatedAt:now()};page.draft.seo.canonical='';
    const result=await store.put('pages',newId,page,0);invalidatePublic();await auditSafe(user,'Created page',path);return json(result,201);
   }
   const existing=await store.get(kind,id);assert(existing,'Not found.',404);assert(Number(data.version)===existing.version,'Another editor changed this record. Reload before saving.',409);
   if(action==='publish'){assert(user.role==='admin','Only administrators can publish.',403);existing.published=clone(existing.draft);existing.status='published';}
   else if(action==='unpublish'){assert(user.role==='admin','Only administrators can unpublish.',403);assert(existing.id!=='home','Home cannot be unpublished.');existing.published=null;existing.status='draft';}
   else if(method==='PUT'){existing.draft=cleanContent(existing.template,data.draft,kind==='regions');if(data.name)existing.name=plain(data.name,250);}
   else throw failure('Unsupported operation.',405);
   existing.updatedAt=now();const saved=await store.put(kind,id,existing,data.version);invalidatePublic();await auditSafe(user,action||'Saved draft',existing.path||existing.name);return json(saved);
  }
  if(kind==='inquiries'&&method==='PUT'){const old=await store.get(kind,id);assert(old,'Not found.',404);assert(['new','in-progress','closed'].includes(data.status),'Invalid enquiry status.');return json(await store.put(kind,id,{...old,status:data.status,notes:plain(data.notes,15000)},data.version));}
  if(kind==='media'&&method==='PUT'){const old=await store.get(kind,id);assert(old,'Not found.',404);return json(await store.put(kind,id,{...old,alt:plain(data.alt,400),name:plain(data.name,300)||old.name},data.version));}
  if(kind==='settings'&&method==='PUT'){assert(id==='site','Unknown setting.');const value={id,name:plain(data.name,150),siteUrl:safeUrl(data.siteUrl,true).replace(/\/$/,''),brochureUrl:safeUrl(data.brochureUrl),formSuccessPath:safeUrl(data.formSuccessPath)};const saved=await store.put(kind,id,value,data.version);invalidatePublic();await auditSafe(user,'Updated settings','site');return json(saved);}
  if(kind==='users'){
   assert(!platformAuth,'Team access for this preview is controlled by Sites. Use the VPS CMS to manage staff accounts.');
   if(method==='POST'&&!id){const result=await createAdmin(store,data.email,data.password,data.name);const saved=await store.put(kind,result.id,{...result,role:data.role==='editor'?'editor':'admin'},result.version);await auditSafe(user,'Created user',saved.email);return json(safeUser(saved),201);}
   if(method==='PUT'&&id){const old=await store.get(kind,id);assert(old,'Not found.',404);assert(id!==user.id||data.status==='active','You cannot disable your own account.');assert(id!==user.id||data.role==='admin','You cannot demote your own account.');const next={...old,name:plain(data.name,150),role:data.role==='editor'?'editor':'admin',status:data.status==='active'?'active':'disabled'};if(data.password){assert(data.password.length>=12,'Use at least 12 characters.');next.passwordHash=await passwordHash(data.password);for(const s of await store.list('sessions'))if(s.userId===id)await store.remove('sessions',s.id);}
    const result=await store.put(kind,id,next,old.version);await auditSafe(user,'Updated user',old.email);return json(safeUser(result));}
  }
  if(kind==='redirects'){
   if(method==='DELETE'){await store.remove(kind,id);return json({ok:true});}
   if(method==='POST'){const from=data.from?.endsWith('.html')?safeLegacyPath(data.from):safePath(data.from),to=safePath(cleanPath(safeUrl(data.to)));assert(to!==from,'Choose a different local destination.');const pages=await store.list('pages');assert(pages.some(p=>cleanPath(p.path)===to&&p.published),'Destination must be a published page.');assert(!pages.some(p=>cleanPath(p.path)===from),'Original page URLs are protected; unpublish a page instead of replacing its URL.');const rid=await hash(from);return json(await store.put(kind,rid,{id:rid,from,to,code:301},0),201);}
  }
  throw failure('Unsupported operation.',405);
 }
 async function saveUpload(file,isPrivate){
  assert(upload,'Media storage is not configured.',503);assert(file.size>0&&file.size<=(isPrivate?5:10)*1024*1024,'File exceeds the size limit.');
  const bytes=new Uint8Array(await file.arrayBuffer());let type='';const ascii=new TextDecoder().decode(bytes.slice(0,12));
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';
  else if(bytes[0]===137&&ascii.slice(1,4)==='PNG')type='image/png';
  else if(ascii.startsWith('RIFF')&&ascii.slice(8)==='WEBP')type='image/webp';
  else if(ascii.startsWith('%PDF-'))type='application/pdf';
  else if(ascii.startsWith('PK')&&isPrivate&&/\.docx$/i.test(file.name))type='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  assert(type&&(isPrivate?!type.startsWith('image/'):true),'Use JPG, PNG, WebP or PDF. Resumes accept PDF or DOCX.');
  const id=crypto.randomUUID(),name=plain(file.name,200).replace(/[^a-zA-Z0-9._ -]/g,'_');const item={id,name,type,size:file.size,private:isPrivate,source:'upload',alt:'',url:'/api/media/'+id,createdAt:now()};
  const stored=await upload(item,bytes);await store.put('media',id,{...item,...stored},0);return {...item,...stored};
 }
 return {identify,async fetch(req){try{return await handle(req)}catch(e){if(!e.status)console.error('API failure',e.message);return json({error:e.status?e.message:'Service unavailable. Please try again.'},e.status||503);}}};
}
