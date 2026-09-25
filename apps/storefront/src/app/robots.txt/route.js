import {api} from '../../api.js';
export const dynamic='force-dynamic';
export async function GET(){const settings=await api('/settings');return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${settings.siteUrl}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain'}});}
