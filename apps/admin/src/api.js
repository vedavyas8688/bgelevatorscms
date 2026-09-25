let csrf='';
export function setCSRF(value){csrf=value||'';}
export async function api(path,options={}){const r=await fetch('/api'+path,{credentials:'include',...options,headers:{...(options.body instanceof FormData?{}:options.body?{'Content-Type':'application/json'}:{}),...(options.method&&options.method!=='GET'?{'X-BG-CSRF':csrf}:{}),...options.headers}});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Request failed. Please try again.'),{status:r.status});if(data.csrf)setCSRF(data.csrf);return data;}
export const mutate=(path,body,method='POST')=>api(path,{method,body:JSON.stringify(body)});
