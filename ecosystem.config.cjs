module.exports={apps:[
 {name:'bg-api',cwd:__dirname,script:'apps/api/src/server.js',env:{NODE_ENV:'production'}},
 {name:'bg-storefront',cwd:__dirname,script:'node_modules/next/dist/bin/next',args:'start apps/storefront -p 3000',env:{NODE_ENV:'production',API_URL:'http://127.0.0.1:4000'}}
]};
