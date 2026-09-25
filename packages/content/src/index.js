import templates from '../templates.json' with { type: 'json' };
import sourceSeed from '../seed.json' with { type: 'json' };
export const cleanPath = value => {
 const path=String(value||'/');
 if(path==='/'||path==='/index.html'||path==='/index')return '/';
 return path.replace(/\.html(?=([?#]|$))/i,'');
};
export const cleanInternalUrls = value => typeof value==='string'
 ? value.replace(/\/index\.html(?=([?#"'\s<]|$))/gi,'/').replace(/(\/[a-z0-9][a-z0-9/_-]*)\.html(?=([?#"'\s<]|$))/gi,'$1')
 : Array.isArray(value)?value.map(cleanInternalUrls):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cleanInternalUrls(v)])):value;
export const seed=cleanInternalUrls(sourceSeed);
export { templates };
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const jsonScript = obj => JSON.stringify(obj).replace(/</g,'\\u003c');
const localCss = href => href.includes('font-awesome') ? '/vendor/fontawesome/css/all.min.css' : href.includes('swiper') ? '/vendor/swiper-bundle.min.css' : href;
export function fillTemplate(templateId, content, context={}) {
 const t=templates[templateId]; if(!t || content?.enabled===false)return '';
 const definitions=Object.fromEntries((t.fields||[]).map(f=>[f.id,f]));
 return t.html.replace(/__BG_(f\d+)__/g,(_,key)=>{
  const field=definitions[key], value=content?.fields?.[key]??'';
  if(field?.type==='richtext')return value; // sanitized before storage by the API
  if(field?.type==='blogList') {
   let paths=[];try{paths=JSON.parse(value)}catch{}
   const all=context.pages||[];
   // New published articles join the original listing; home retains its original card count.
   let records=paths.map(path=>all.find(p=>cleanPath(p.path)===cleanPath(path))).filter(p=>p?.published && p.status!=='archived');
   const extras=all.filter(p=>p.kind==='blog'&&p.published&&p.status!=='archived'&&!seed.pages.some(s=>s.id===p.id));
   if(extras.length)records=[...extras.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')),...records];
   if(context.page?.id==='home')records=records.slice(0,paths.length);
   return records.map(p=>{
   const l=p.published.listing||{};
   const data={PATH:cleanPath(p.path),IMAGE:l.image||'',TITLE:l.title||p.name,DATE:l.date||'',EXCERPT:l.excerpt||''};
    return `<div class="w-dyn-item" role="listitem"><a class="blog-card w-inline-block" href="${escapeHtml(data.PATH)}"><div class="blog-card-image"><img src="${escapeHtml(data.IMAGE)}" alt="${escapeHtml(data.TITLE)}" loading="lazy" decoding="async"></div><div class="blog-card-center"><div class="blog-card-title-wrap"><div class="text-md secondary-700">${escapeHtml(data.DATE)}</div><h2 class="h5">${escapeHtml(data.TITLE)}</h2></div><svg class="blog-card-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg></div><p>${escapeHtml(data.EXCERPT)}</p></a></div>`;
   }).join('');
  }
  return escapeHtml(value);
 });
}
export function renderPage(page, regions=[], pages=[], draft=false) {
 const source=draft?page.draft:page.published;if(!source)return null;
 const layout=templates[page.template];if(!layout)throw new Error('Unknown layout');
 const context={page,pages};
 let html=layout.html.replace(/__BG_REGION_([a-z0-9-]+)__/g,(_,id)=>{
  const r=regions.find(r=>r.id===id);return r?fillTemplate(r.template,draft?r.draft:r.published,context):'';
 });
 // Use source section order at the original section insertion points, with disabled sections omitted.
 const sections=source.sections||[];let index=0;
 html=html.replace(/__BG_SECTION_([a-z0-9-]+)__/g,()=>{const s=sections[index++];return s?fillTemplate(s.template,s,context):'';});
 const premiumBlog=page.id==='blogs'||page.kind==='blog';
 if(page.id==='blogs'){
  const count=pages.filter(item=>item.kind==='blog'&&item.published&&item.status!=='archived').length;
  html=html.replace('<main>','<main class="premium-blog-index">').replace('<div class="w-dyn-list">',`<div class="premium-blog-tools"><div><strong>${count}</strong><span>expert articles</span></div><label><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/></svg><input type="search" data-blog-search placeholder="Search elevator insights…" aria-label="Search articles"></label></div><div class="w-dyn-list">`);
  html=html.replace('</div>\n</div>\n</section>',`</div><div class="premium-blog-empty" hidden>No articles match your search.</div><button class="premium-load-more" type="button" data-blog-more>Explore more articles <span>↓</span></button></div></section>`);
 }
 if(page.kind==='blog'){
  html=html.replace('<main>','<main class="premium-blog-detail"><div class="premium-reading-progress" aria-hidden="true"><span></span></div>');
  const article=sections.find(section=>(templates[section.template]?.fields||[]).some(field=>field.type==='richtext'));
  const bodyField=(templates[article?.template]?.fields||[]).find(field=>field.type==='richtext');
  const words=String(article?.fields?.[bodyField?.id]||'').replace(/<[^>]+>/g,' ').trim().split(/\s+/).filter(Boolean).length;
  const meta=`<div class="premium-article-meta"><span>BG Elevators Editorial</span><i></i><time>${escapeHtml(source.listing?.date||'')}</time><i></i><span>${Math.max(1,Math.ceil(words/220))} min read</span></div>`;
  html=html.replace('</div><img alt=',`</div>${meta}<img alt=`);
  html=html.replace('<div class="blog-content',`<div class="premium-article-tools"><span>Elevator knowledge, clearly explained</span><button type="button" data-copy-link>Copy article link</button></div><div class="blog-content`);
  html=html.replace(/class="blog-cover-image"([^>]*?)loading="lazy"/, 'class="blog-cover-image"$1loading="eager" fetchpriority="high"');
  const related=pages.filter(item=>item.id!==page.id&&item.kind==='blog'&&item.published&&item.status!=='archived').slice(0,3).map(item=>{const listing=item.published.listing||{};return `<article class="premium-related-card"><a href="${escapeHtml(item.path)}"><img src="${escapeHtml(listing.image||'')}" alt="" loading="lazy"><div><time>${escapeHtml(listing.date||'')}</time><h3>${escapeHtml(listing.title||item.name)}</h3><span>Read article →</span></div></a></article>`}).join('');
  if(related){const block=`<section class="premium-related"><div class="container"><div class="premium-related-heading"><span>Continue exploring</span><h2>More elevator insights</h2></div><div class="premium-related-grid">${related}</div></div></section>`;const firstClose=html.indexOf('</section>',html.indexOf('<main'));if(firstClose>=0)html=html.slice(0,firstClose+10)+block+html.slice(firstClose+10);}
 }
 html=html.replace(/<img\b(?![^>]*\bdecoding=)/gi,'<img decoding="async"');
 return {html:cleanInternalUrls(html),styles:layout.styles||[],stylesheets:[...new Set([...(layout.stylesheets||[]).map(localCss),...(premiumBlog?['/css/blog-premium.css']:[])])],htmlAttrs:layout.htmlAttrs,bodyClass:layout.bodyClass,scripts:layout.scripts,seo:cleanInternalUrls(source.seo),listing:source.listing};
}
export function documentHtml(view,settings={},path='/') {
 const seo=view.seo||{};const origin=(settings.siteUrl||'https://bgelevators.com').replace(/\/$/,'');const canonical=cleanInternalUrls(seo.canonical)||origin+cleanPath(path);
 return '<!doctype html><html lang="en" class="w-mod-js" '+Object.entries(view.htmlAttrs||{}).map(([k,v])=>`${k}="${escapeHtml(v)}"`).join(' ')+'><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 `<title>${escapeHtml(seo.title)}</title><meta name="description" content="${escapeHtml(seo.description)}"><meta name="robots" content="${escapeHtml(seo.robots||'index,follow')}"><link rel="canonical" href="${escapeHtml(canonical)}"><link rel="icon" href="/images/bgElevetorLogo.jpg">`+
 `<meta property="og:title" content="${escapeHtml(seo.ogTitle||seo.title)}"><meta property="og:description" content="${escapeHtml(seo.ogDescription||seo.description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="website">`+(seo.ogImage?`<meta property="og:image" content="${escapeHtml(new URL(seo.ogImage,origin))}">`:'')+
 `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(seo.twitterTitle||seo.title)}"><meta name="twitter:description" content="${escapeHtml(seo.twitterDescription||seo.description)}">`+
 view.stylesheets.map(h=>`<link rel="stylesheet" href="${escapeHtml(h)}">`).join('')+view.styles.map(s=>`<style>${s}</style>`).join('')+
 `<link rel="stylesheet" href="/bg-runtime.css">`+(seo.schema||[]).map(s=>`<script type="application/ld+json">${jsonScript(s)}</script>`).join('')+
 `</head><body class="${escapeHtml(view.bodyClass)}">${view.html}<script id="bg-site-settings" type="application/json">${jsonScript(settings)}</script>`+
 ['/vendor/swiper-bundle.min.js',...(view.scripts||[]),'/bg-runtime.js'].map(s=>`<script defer src="${s}"></script>`).join('')+'</body></html>';
}
export function sitemapXml(pages,origin) {
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.filter(p=>p.published&&p.status!=='archived'&&!p.published.seo?.robots?.includes('noindex')).map(p=>`<url><loc>${escapeHtml(origin.replace(/\/$/,'')+cleanPath(p.path))}</loc>${p.updatedAt?`<lastmod>${escapeHtml(p.updatedAt.slice(0,10))}</lastmod>`:''}</url>`).join('')+'</urlset>';
}
