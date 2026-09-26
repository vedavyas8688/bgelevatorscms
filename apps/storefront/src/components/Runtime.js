'use client';
import {useEffect} from 'react';

export default function Runtime({attributes,bodyClass,scripts}){
 useEffect(()=>{
  let cancelled=false,idleId,loadHandler;
  Object.entries(attributes||{}).forEach(([k,v])=>document.documentElement.setAttribute(k,v));
  document.body.className=bodyClass||'';

  const load=src=>new Promise(resolve=>{
   if(document.querySelector(`script[data-bg-source="${src}"]`))return resolve();
   const element=document.createElement('script');
   element.src=src;element.async=true;element.dataset.bgSource=src;
   element.onload=resolve;element.onerror=resolve;document.body.append(element);
  });

  // Our small runtime owns essential navigation, forms, sliders and reveal effects.
  // Start it immediately, then let the large legacy Webflow bundle hydrate at idle.
  (async()=>{
   await Promise.all(['/vendor/swiper-bundle.min.js','/bg-runtime.js'].map(load));
   if(!cancelled)window.BGWebsite?.start();
  })();

  const loadLegacy=()=> (scripts||[]).reduce((pending,src)=>pending.then(()=>load(src)),Promise.resolve());
  const scheduleLegacy=()=>{
   if(cancelled)return;
   if('requestIdleCallback' in window)idleId=window.requestIdleCallback(loadLegacy,{timeout:2500});
   else idleId=window.setTimeout(loadLegacy,1200);
  };
  if(document.readyState==='complete')scheduleLegacy();
  else{loadHandler=scheduleLegacy;window.addEventListener('load',loadHandler,{once:true});}

  return()=>{
   cancelled=true;window.BGWebsite?.stop();
   if(loadHandler)window.removeEventListener('load',loadHandler);
   if(idleId!==undefined){if('cancelIdleCallback' in window)window.cancelIdleCallback(idleId);else clearTimeout(idleId);}
  };
 },[attributes,bodyClass,scripts]);
 return null;
}
