import {jsonScript} from '@bg/content';
import Runtime from './Runtime.js';
export default function SitePage({data}){const {view,settings}=data;return <>
 {view.stylesheets.map(href=><link key={href} rel="stylesheet" href={href}/>)}
 {view.styles.map((css,i)=><style key={i} dangerouslySetInnerHTML={{__html:css}}/>)}
 <link rel="stylesheet" href="/bg-runtime.css"/>
 {(view.seo.schema||[]).map((schema,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonScript(schema)}}/>)}
 <div id="bg-website" dangerouslySetInnerHTML={{__html:view.html}}/>
 <script id="bg-site-settings" type="application/json" dangerouslySetInnerHTML={{__html:jsonScript(settings)}}/>
 <Runtime attributes={view.htmlAttrs} bodyClass={view.bodyClass} scripts={view.scripts}/>
 </>;}
