(function(){
 let timers=[],cleanups=[],started=false,swiper;
 function start(){
  if(started)return;started=true;
  let settings={};try{settings=JSON.parse(document.getElementById('bg-site-settings')?.textContent||'{}')}catch{}
  const on=(el,type,fn,options)=>{el?.addEventListener(type,fn,options);cleanups.push(()=>el?.removeEventListener(type,fn,options))};
  const modal=document.getElementById('contactModal');
  const show=()=>{if(modal){modal.classList.add('show');modal.setAttribute('aria-hidden','false');modal.querySelector('input:not([type=hidden])')?.focus();}};
  const hide=()=>{if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}};
  document.querySelectorAll('[data-bg-action]').forEach(el=>on(el,'click',e=>{e.preventDefault();const a=el.dataset.bgAction;if(a==='open-modal')show();if(a==='close-modal')hide();if(a==='brochure'){const link=document.createElement('a');link.href=settings.brochureUrl||'/images/brochure.pdf';link.download='BG-Elevators-Brochure.pdf';document.body.append(link);link.click();link.remove();}}));
  if(modal){modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Contact BG Elevators');on(modal,'click',e=>{if(e.target===modal)hide()});on(document,'keydown',e=>{if(e.key==='Escape')hide()});if(location.pathname==='/'||location.pathname==='/index.html')timers.push(setTimeout(show,10000));}
  const slides=[...document.querySelectorAll('.hero-slide')],dots=[...document.querySelectorAll('.dot')];let current=0;
  const showSlide=i=>{if(!slides.length)return;current=(i+slides.length)%slides.length;slides.forEach((s,j)=>s.classList.toggle('active',j===current));dots.forEach((d,j)=>{d.classList.toggle('active',j===current);d.setAttribute('aria-label','Show slide '+(j+1));d.setAttribute('role','button');d.tabIndex=0;});};
  if(slides.length){showSlide(0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)timers.push(setInterval(()=>showSlide(current+1),6000));dots.forEach((d,i)=>{on(d,'click',()=>showSlide(i));on(d,'keydown',e=>{if(e.key==='Enter'||e.key===' ')showSlide(i)});});on(document.querySelector('.left-arrows'),'click',()=>showSlide(current-1));on(document.querySelector('.right-arrows'),'click',()=>showSlide(current+1));}
  if(window.Swiper&&document.querySelector('.my-swiper-container')){
   const container=document.querySelector('.my-swiper-container');
   container.swiper?.destroy?.(true,true);
   swiper=new window.Swiper(container,{loop:true,slidesPerView:1,spaceBetween:30,observer:true,observeParents:true,resizeObserver:true,navigation:{nextEl:'.swiper-button-next',prevEl:'.swiper-button-prev'},breakpoints:{500:{slidesPerView:2},768:{slidesPerView:3},1024:{slidesPerView:4}}});
   const refreshSwiper=()=>swiper?.update?.();
   on(window,'load',refreshSwiper);on(window,'resize',refreshSwiper);
   timers.push(setTimeout(refreshSwiper,100),setTimeout(refreshSwiper,1000));
  }
  document.querySelectorAll('.slider.w-slider').forEach(slider=>{
   const next=slider.querySelector('.w-slider-arrow-right');if(!next)return;
   // Webflow still provides the slide mechanics and swipe gestures; this runtime owns
   // autoplay so behavior stays reliable when the legacy bundle is loaded at idle.
   slider.dataset.autoplay='false';let paused=false;
   const pause=()=>{paused=true},resume=()=>{paused=false};
   on(slider,'mouseenter',pause);on(slider,'mouseleave',resume);on(slider,'focusin',pause);on(slider,'focusout',resume);on(slider,'touchstart',pause,{passive:true});on(slider,'touchend',resume,{passive:true});
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)timers.push(setInterval(()=>{if(!paused&&document.visibilityState==='visible')next.click();},4200));
  });
  const active=location.pathname==='/index.html'?'/':location.pathname;
  document.querySelectorAll('.nav-link').forEach(a=>{const p=new URL(a.href,location.origin).pathname;a.classList.toggle('w--current',(p==='/index.html'?'/':p)===active);if((p==='/index.html'?'/':p)===active)a.setAttribute('aria-current','page')});
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSections=[...document.querySelectorAll('main section')].filter(section=>!section.closest('[role="dialog"]'));
  if(revealSections.length){
   document.documentElement.classList.add('bg-motion');
   revealSections.forEach(section=>section.classList.add('bg-reveal'));
   if(reduceMotion||!('IntersectionObserver' in window))revealSections.forEach(section=>section.classList.add('bg-reveal-visible'));
   else{
    const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('bg-reveal-visible');revealObserver.unobserve(entry.target);}),{threshold:.08,rootMargin:'0px 0px -7% 0px'});
    revealSections.forEach(section=>revealObserver.observe(section));
    cleanups.push(()=>revealObserver.disconnect());
   }
  }
  const blogList=document.querySelector('.premium-blog-index .blog-list'),blogSearch=document.querySelector('[data-blog-search]'),blogMore=document.querySelector('[data-blog-more]'),blogEmpty=document.querySelector('.premium-blog-empty');
  if(blogList){const cards=[...blogList.children];let visibleCount=7;const filter=()=>{const term=(blogSearch?.value||'').trim().toLowerCase();blogList.classList.toggle('is-searching',Boolean(term));let matches=0;cards.forEach(card=>{const match=!term||card.textContent.toLowerCase().includes(term);if(match)matches++;const show=match&&(Boolean(term)||matches<=visibleCount);card.style.display=show?'block':'none';});if(blogEmpty)blogEmpty.hidden=matches>0;if(blogMore){blogMore.hidden=Boolean(term)||visibleCount>=matches;const remaining=Math.min(6,Math.max(0,matches-visibleCount));blogMore.querySelector('[data-more-count]')?.replaceChildren(String(remaining));}};on(blogSearch,'input',filter);on(blogMore,'click',()=>{visibleCount+=6;filter();});filter();}
  const progress=document.querySelector('.premium-reading-progress span');if(progress){const update=()=>{const height=document.documentElement.scrollHeight-innerHeight;progress.style.width=(height>0?Math.min(100,scrollY/height*100):0)+'%';};on(window,'scroll',update,{passive:true});update();}
  const articleBody=document.querySelector('.premium-blog-detail .blog-content');
  if(articleBody&&!articleBody.closest('.premium-story-layout')){
   const headings=[...articleBody.querySelectorAll('h2,h3')].slice(0,8);
   if(headings.length){const layout=document.createElement('div');layout.className='premium-story-layout';articleBody.before(layout);layout.append(articleBody);const aside=document.createElement('aside');aside.className='premium-story-aside';const title=document.createElement('strong');title.textContent='In this story';const list=document.createElement('ul');headings.forEach((heading,index)=>{heading.id=heading.id||`story-${index+1}`;const item=document.createElement('li'),link=document.createElement('a');link.href='#'+heading.id;link.textContent=heading.textContent;item.append(link);list.append(item);});const cta=document.createElement('a');cta.className='premium-story-cta';cta.href='/contact-us';cta.innerHTML='Talk to an elevator expert <span aria-hidden="true">→</span>';aside.append(title,list,cta);layout.append(aside);}
  }
  const copyLink=document.querySelector('[data-copy-link]');on(copyLink,'click',async()=>{try{await navigator.clipboard.writeText(location.href);copyLink.textContent='Link copied';timers.push(setTimeout(()=>copyLink.textContent='Copy article link',1800));}catch{copyLink.textContent='Copy unavailable';}});
  on(document,'submit',async e=>{
   const form=e.target;if(!form.matches('form[data-bg-form]'))return;e.preventDefault();e.stopImmediatePropagation();
   if(!form.reportValidity())return;const button=form.querySelector('[type=submit]');const old=button?.textContent||button?.value;let status=form.querySelector('.bg-form-status');if(!status){status=document.createElement('p');status.className='bg-form-status';status.setAttribute('role','status');form.append(status)}
   if(button){button.disabled=true;if(button.tagName==='INPUT')button.value='Sending…';else button.textContent='Sending…';}status.textContent='';
   try{const data=new FormData(form);data.set('type',form.dataset.bgForm);data.set('source',location.pathname);const r=await fetch('/api/enquiries',{method:'POST',body:data});const result=await r.json();if(!r.ok)throw new Error(result.error||'Unable to send. Please try again.');form.reset();status.textContent=result.message||'Your message was received.';if(settings.formSuccessPath)location.assign(settings.formSuccessPath);}
   catch(error){status.textContent=error.message;status.style.color='#a12720';}
   finally{if(button){button.disabled=false;if(button.tagName==='INPUT')button.value=old;else button.textContent=old;}}
  },true);
  // Fail open only for animated elements outside the section reveal system.
  const revealHidden=()=>{document.querySelectorAll('[data-w-id]').forEach(e=>{if(!e.closest('.bg-reveal')&&getComputedStyle(e).opacity==='0')e.style.opacity='1';});swiper?.update?.();};
  timers.push(setTimeout(revealHidden,800));
 }
 function stop(){timers.forEach(t=>{clearTimeout(t);clearInterval(t)});cleanups.forEach(f=>f());swiper?.destroy?.();timers=[];cleanups=[];started=false;}
 window.BGWebsite={start,stop};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
