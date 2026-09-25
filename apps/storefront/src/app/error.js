'use client';
export default function Error({reset}){return <main style={{fontFamily:'Arial',maxWidth:600,margin:'12vh auto',padding:32}}><h1>We couldn’t load this page</h1><p>Please try again in a moment.</p><button onClick={reset}>Try again</button></main>;}
