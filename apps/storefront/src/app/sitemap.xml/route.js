export const dynamic='force-dynamic';
export async function GET(){const r=await fetch(`${process.env.API_URL||'http://127.0.0.1:4000'}/api/public/sitemap`,{cache:'no-store'});return new Response(await r.text(),{status:r.status,headers:{'Content-Type':'application/xml'}});}
