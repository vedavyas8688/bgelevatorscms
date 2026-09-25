'use client';
import {useEffect} from 'react';
export default function Runtime({attributes,bodyClass,scripts}){useEffect(()=>{let cancelled=false;Object.entries(attributes||{}).forEach(([k,v])=>document.documentElement.setAttribute(k,v));document.body.className=bodyClass||'';
 const load=src=>new Promise(resolve=>{if(document.querySelector(`script[data-bg-source="${src}"]`))return resolve();const s=document.createElement('script');s.src=src;s.async=false;s.dataset.bgSource=src;s.onload=resolve;s.onerror=resolve;document.body.append(s);});
 (async()=>{const sources=['/vendor/swiper-bundle.min.js',...(scripts||[]),'/bg-runtime.js'];await Promise.all(sources.map(load));if(!cancelled)window.BGWebsite?.start();})();return()=>{cancelled=true;window.BGWebsite?.stop();};},[attributes,bodyClass,scripts]);return null;}
