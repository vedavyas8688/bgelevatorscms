import {cache} from 'react';
export const api=cache(async path=>{
 const response=await fetch(`${process.env.API_URL||'http://127.0.0.1:4000'}/api/public${path}`,{next:{revalidate:30},signal:AbortSignal.timeout(15000)});
 if(response.status===404)return null;if(!response.ok)throw new Error('The content service is temporarily unavailable.');return response.json();
});
export const getPage=cache(path=>api('/page?path='+encodeURIComponent(path)));
export function metadata(data){if(!data?.view)return {};const seo=data.view.seo;const base=data.settings.siteUrl||'https://bgelevators.com';const canonical=seo.canonical||base.replace(/\/$/,'')+data.page.path;
 return {title:seo.title,description:seo.description,alternates:{canonical},robots:seo.robots,openGraph:{title:seo.ogTitle||seo.title,description:seo.ogDescription||seo.description,url:canonical,...(seo.ogImage?{images:[new URL(seo.ogImage,base).href]}:{})},twitter:{card:'summary_large_image',title:seo.twitterTitle||seo.title,description:seo.twitterDescription||seo.description}};
}
