import {getPage,metadata} from '../api.js';
import SitePage from '../components/SitePage.js';
export const dynamic='force-dynamic';
export async function generateMetadata(){return metadata(await getPage('/'));}
export default async function Home(){const data=await getPage('/');if(!data)throw new Error('Run npm run seed to import the website.');return <SitePage data={data}/>;}
