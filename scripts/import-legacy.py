#!/usr/bin/env python3
"""Import the supplied BG HTML archive as immutable layouts + editable content.
Run: python3 scripts/import-legacy.py /path/to/bg_elevators-main
Requires beautifulsoup4. No original PHP/configuration is copied.
"""
import sys,json,re,hashlib,shutil,mimetypes,copy
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment
ROOT=Path(__file__).resolve().parents[1]; SRC=Path(sys.argv[1]); OUT=ROOT/'packages/content'
OUT.mkdir(parents=True,exist_ok=True)
public=ROOT/'apps/storefront/public';public.mkdir(parents=True,exist_ok=True)
for d in ['images','fonts','css','js','uploads']:
 if (SRC/d).exists():shutil.copytree(SRC/d,public/d,dirs_exist_ok=True)
templates={}; regions={};pages=[];manifest=[];media=[]
blogcards={}
for f in SRC.glob('*.html'):
 s=BeautifulSoup(f.read_text(),'html.parser')
 for a in s.select('a.blog-card'):
  path='/'+a.get('href','').lstrip('/')
  if path not in blogcards or f.name=='blogs.html':
   img=a.find('img');h=a.select_one('.h5,.h4,h3');p=a.find('p');date=a.select_one('.text-md')
   blogcards[path]={'title':h.get_text(' ',strip=True) if h else '', 'image': '/'+img.get('src','').lstrip('/') if img else '', 'excerpt':p.get_text(' ',strip=True) if p else '', 'date':date.get_text(' ',strip=True) if date else ''}
def safe_path(v):
 if not v or re.match(r'^(?:[a-z]+:|//|#)',v,re.I):return v
 return '/'+v.lstrip('./')
def serialize(x):
 return str(x).replace('viewbox=','viewBox=').replace('preserveaspectratio=','preserveAspectRatio=')
def prep(s):
 for el in s.find_all(True):
  if el.name is None:continue
  if el.name in ('script','noscript'):el.decompose();continue
  if el.attrs is None:continue
  for key in list(el.attrs):
   if key.startswith('on'):
    act=el.attrs.pop(key)
    if 'openModal' in str(act):el['data-bg-action']='open-modal'
    if 'closeModal' in str(act):el['data-bg-action']='close-modal'
    if 'handleDownloadBrochure' in str(act):el['data-bg-action']='brochure'
  for key in ['src','href','poster']:
   if el.has_attr(key):el[key]=safe_path(el[key])
  if el.has_attr('srcset'):
   el['srcset']=', '.join(' '.join([safe_path(x.strip().split()[0])]+x.strip().split()[1:]) for x in el['srcset'].split(',') if x.strip())
  if el.name=='a' and el.get('target')=='_blank':el['rel']='noopener noreferrer'
  if el.name=='form':
   el['action']='/api/enquiries';el['method']='post';el['data-bg-form']='career' if el.select_one('input[type=file],input[name="CV-URL"]') else 'enquiry'
   for x in el.select('input[name=recaptcha_token],.g-recaptcha'):x.decompose()
   hp=BeautifulSoup('<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px"/>','html.parser')
   el.append(hp)
  if el.name=='input' and el.get('name')=='Location':el['type']='text'
 # SVG content and raw CSS are trusted layout, never user-provided markup.
 return s

def field_template(el,key,label):
 el=copy.deepcopy(el); fields=[];values={}
 def add(kind,label,value):
  fid=f'f{len(fields):04d}';fields.append({'id':fid,'type':kind,'label':label[:110]});values[fid]=str(value);return '__BG_'+fid+'__'
 # Rich text regions remain whole, preserving inline formatting.
 for rt in list(el.select('.w-richtext')):
  if rt.find_parent(class_='w-richtext'):continue
  val=''.join(serialize(c) for c in rt.contents);rt.clear();rt.append(add('richtext','Article / formatted content',val))
 # Dynamic blog lists render records through a retained card layout.
 for group in el.select('.blog-list'):
  cards=group.select('a.blog-card')
  if not cards:continue
  members=[safe_path(c.get('href','')) for c in cards]
  group.clear();token=add('blogList','Blog articles',json.dumps(members));group.append(token)
 for node in list(el.find_all(string=True)):
  if isinstance(node,Comment):node.extract();continue
  if node.parent.name in ('style','svg','path','title') or node.find_parent('svg'):continue
  text=str(node)
  if '__BG_' in text or not text.strip():continue
  # Decorative number reels keep their original markup; the visible statistic is a field in its parent.
  if node.find_parent(class_='number-digit'):continue
  tag=node.parent.name
  label2=('Heading' if re.match(r'h[1-6]',tag) else 'Text')+': '+re.sub(r'\s+',' ',text.strip())[:82]
  stripped=text.strip();prefix=text[:len(text)-len(text.lstrip())];suffix=text[len(text.rstrip()):]
  node.replace_with(prefix+add('text',label2,stripped)+suffix)
 for item in el.find_all(True):
  for attr in ['src','poster','href','alt','title','placeholder','srcset']:
   if not item.has_attr(attr):continue
   if item.name=='link' or (attr=='href' and item.get('data-bg-action')):continue
   kind='image' if attr in ('src','poster') and item.name in ('img','source','video') else 'url' if attr in ('href','src','poster') else 'text'
   hint=item.name+': '+attr
   item[attr]=add(kind,hint,item[attr])
 content={'fields':values,'enabled':True}
 templates[key]={'id':key,'label':label,'html':serialize(el),'fields':fields}
 return content

def region(el,kind,path):
 t=copy.deepcopy(el)
 # Keep layout variants; only active navigation state is derived at runtime.
 for e in t.select('[aria-current],.w--current'):
  e.attrs.pop('aria-current',None)
  if e.has_attr('class'):e['class']=[c for c in e['class'] if c!='w--current']
 sig=hashlib.sha256(re.sub(r'\s+',' ',serialize(t)).encode()).hexdigest()[:10]
 rid=kind+'-'+sig
 if rid not in regions:
  data=field_template(t,rid,kind.title())
  regions[rid]={'id':rid,'name':kind.title(),'kind':kind,'template':rid,'draft':data,'published':copy.deepcopy(data),'status':'published','version':1,'usedBy':[]}
 regions[rid]['usedBy'].append(path)
 return rid

for f in sorted(SRC.glob('*.html'),key=lambda f:(f.name!='index.html',f.name)):
 raw=f.read_text();s=BeautifulSoup(raw,'html.parser');body=s.body
 if body is None:continue
 path='/' if f.name=='index.html' else '/'+f.name
 pid='home' if path=='/' else f.stem
 title=s.title.get_text(strip=True) if s.title else f.stem
 def meta(key):
  m=s.find('meta',attrs={'name':key}) or s.find('meta',attrs={'property':key});return m.get('content','') if m else ''
 canon=s.find('link',rel='canonical')
 seo={'title':title,'description':meta('description'),'canonical':canon.get('href','') if canon else '', 'robots':meta('robots') or 'index,follow','ogTitle':meta('og:title'),'ogDescription':meta('og:description'),'ogImage':safe_path(meta('og:image')),'twitterTitle':meta('twitter:title'),'twitterDescription':meta('twitter:description'),'schema':[]}
 for j in s.select('script[type="application/ld+json"]'):
  try:seo['schema'].append(json.loads(j.string or j.text))
  except Exception:pass
 styles=[x.get_text() for x in s.find_all('style')]
 links=[safe_path(x.get('href','')) for x in s.select('head link[rel=stylesheet]')]
 # Convert script-generated product specification table to editable server-rendered content.
 for script in s.find_all('script'):
  m=re.search(r'const elevatorSpecs\s*=\s*(\[.*?\]);',script.text,re.S)
  if m:
   try:
    specs=json.loads(m.group(1));tbody=body.find('tbody')
    if tbody:
     for spec in specs:
      row=s.new_tag('tr')
      for v in spec.values():td=s.new_tag('td');td.string=str(v);row.append(td)
      tbody.append(row)
   except Exception:pass
 body=prep(body)
 for st in body.find_all('style'):st.decompose()
 for selector,kind in [('.navbar','header'),('footer','footer'),('.whatsapp-fixed-button','contact-button')]:
  for el in list(body.select(selector)):
   rid=region(el,kind,path);el.replace_with(NavigableString('__BG_REGION_'+rid+'__'))
 sections=[]
 main=body.find('main')
 candidates=list(main.find_all(recursive=False)) if main else [e for e in body.find_all(recursive=False) if e.name not in ['script','style']]
 for i,el in enumerate(candidates):
  if el.name in ['script','style']:continue
  heading=el.find(['h1','h2','h3'])
  label=heading.get_text(' ',strip=True)[:90] if heading else ('Contact popup' if el.get('id')=='contactModal' else 'Section '+str(i+1))
  key=pid+'-s'+str(i)
  content=field_template(el,key,label);sections.append({'id':key,'template':key,**content});el.replace_with(NavigableString('__BG_SECTION_'+key+'__'))
 # Any decorative content outside main remains layout; all semantic page content is in sections.
 skeleton=''.join(serialize(c) for c in body.contents)
 h1=s.find('h1');card=blogcards.get(path,{})
 kind='blog' if '.blog-content' in raw or 'blog-content' in raw and 'w-richtext' in raw else 'page'
 if kind!='blog':
  if 'finish' in pid or pid in ['products','cabin-option','doors','motors','control-system','ceiling','cop-and-lop','additional-features','glass-door']:kind='product'
  if pid in ['services','service-details','elevator-installation','elevator-modernization','amc-and-service-maintence','service-for-non-bg-elevators','breakdown-and-emergency-repairs']:kind='service'
  if pid.startswith('career'):kind='career'
 display=card.get('title') or (h1.get_text(' ',strip=True) if h1 else title)
 detail={'seo':seo,'sections':sections,'listing':{'title':display,'excerpt':card.get('excerpt',''),'image':card.get('image',''),'date':card.get('date','')}}
 page={'id':pid,'path':path,'name':'Home' if pid=='home' else display,'kind':kind,'template':pid,'draft':detail,'published':copy.deepcopy(detail),'status':'published','version':1}
 pages.append(page)
 templates[pid]={'id':pid,'html':skeleton,'styles':styles,'stylesheets':links,'htmlAttrs':{k:v for k,v in s.html.attrs.items() if k.startswith('data-wf')},'bodyClass':' '.join(body.get('class',[])),'scripts':['/js/jquery.min.js','/js/elevators.js','/js/common.js','/js/script.js'] if (SRC/'js/script.js').exists() else []}
 manifest.append({'file':f.name,'path':path,'id':pid,'kind':kind,'sections':len(sections),'fields':sum(len(sec['fields']) for sec in sections),'originalSha256':hashlib.sha256(raw.encode()).hexdigest()})
# Include the exact legacy blog card template; listing data are resolved from published records.
s=prep(BeautifulSoup((SRC/'blogs.html').read_text(),'html.parser'))
card=s.select_one('a.blog-card').parent
for sel,token,attr in [('a','__BG_PATH__','href'),('img','__BG_IMAGE__','src'),('.h5','__BG_TITLE__',None),('.blog-card-title-wrap .text-md','__BG_DATE__',None),('p','__BG_EXCERPT__',None)]:
 t=card.select_one(sel)
 if t:
  if attr:t[attr]=token
  else:t.clear();t.append(token)
templates['blog-card']={'html':serialize(card)}
for f in public.rglob('*'):
 if f.is_file() and f.suffix.lower() in ['.webp','.png','.jpg','.jpeg','.avif','.svg','.pdf']:
  url='/'+str(f.relative_to(public));media.append({'id':hashlib.sha256(url.encode()).hexdigest()[:20],'url':url,'name':f.name,'type':mimetypes.guess_type(f.name)[0] or 'application/octet-stream','size':f.stat().st_size,'source':'original','alt':''})
seed={'pages':pages,'regions':list(regions.values()),'media':media,'settings':[{'id':'site','name':'BG Elevators','siteUrl':'https://bgelevators.com','brochureUrl':'/images/brochure.pdf','formSuccessPath':'/thank-you.html'}]}
for name,data in [('seed.json',seed),('templates.json',templates),('migration-manifest.json',manifest)]:
 (OUT/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'pages':len(pages),'sections':sum(x['sections'] for x in manifest),'editableFields':sum(x['fields'] for x in manifest),'regions':len(regions),'media':len(media),'kinds':{k:sum(p['kind']==k for p in pages) for k in set(p['kind'] for p in pages)}}))
