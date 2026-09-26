import {jsonScript} from '@bg/content';
import Runtime from './Runtime.js';
const imageUrl=(source,width,quality=72)=>`/_next/image?url=${encodeURIComponent(source)}&amp;w=${width}&amp;q=${quality}`;
const optimizedBlogImages=html=>html
 .replace(/<div class="blog-card-image"><img src="(\/images\/[^"]+)"([^>]*)>/g,(_,source,attributes)=>
  `<div class="blog-card-image"><img src="${imageUrl(source,750)}" srcset="${imageUrl(source,750)} 750w, ${imageUrl(source,1080)} 1080w" sizes="(max-width: 767px) 100vw, 50vw"${attributes}>`)
 .replace(/<img\b[^>]*class="(?:blog-cover-image|premium-related-image)"[^>]*>/g,tag=>{
  const source=tag.match(/\ssrc="(\/images\/[^"]+)"/)?.[1];if(!source)return tag;
  const cover=tag.includes('blog-cover-image'),small=cover?1080:750,large=cover?1920:1080;
  const clean=tag.replace(/\s(?:src|srcset|sizes)="[^"]*"/g,'').replace(/>$/,'');
  return `${clean} src="${imageUrl(source,small,75)}" srcset="${imageUrl(source,small,75)} ${small}w, ${imageUrl(source,large,75)} ${large}w" sizes="${cover?'(max-width: 767px) 100vw, 1160px':'(max-width: 767px) 100vw, 33vw'}">`;
 });
export default function SitePage({data}){const {view,settings}=data;return <>
 {view.stylesheets.map(href=><link key={href} rel="stylesheet" href={href}/>)}
 {view.styles.map((css,i)=><style key={i} dangerouslySetInnerHTML={{__html:css}}/>)}
 <link rel="stylesheet" href="/bg-runtime.css"/>
 {(view.seo.schema||[]).map((schema,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonScript(schema)}}/>)}
 <div id="bg-website" dangerouslySetInnerHTML={{__html:optimizedBlogImages(view.html)}}/>
 <script id="bg-site-settings" type="application/json" dangerouslySetInnerHTML={{__html:jsonScript(settings)}}/>
 <Runtime attributes={view.htmlAttrs} bodyClass={view.bodyClass} scripts={view.scripts}/>
 </>;}
