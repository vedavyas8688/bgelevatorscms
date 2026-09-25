import {notFound,permanentRedirect} from 'next/navigation';
import {getPage,metadata} from '../../api.js';
import SitePage from '../../components/SitePage.js';
export const dynamic='force-dynamic';
export async function generateMetadata({params}){const {slug}=await params;return metadata(await getPage('/'+slug.join('/')));}
export default async function Page({params}){const {slug}=await params;const data=await getPage('/'+slug.join('/'));if(!data)notFound();if(data.redirect)permanentRedirect(data.redirect);return <SitePage data={data}/>;}
