import {NextResponse} from 'next/server';

export function middleware(request){
 const url=request.nextUrl.clone();
 if(!url.pathname.endsWith('.html'))return NextResponse.next();
 url.pathname=url.pathname==='/index.html'?'/':url.pathname.slice(0,-5);
 return NextResponse.redirect(url,301);
}

export const config={matcher:['/:path*.html']};
