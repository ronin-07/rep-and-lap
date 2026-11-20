/* Rep & Lap Next.js offline shell. No Firebase API or account records are cached here. */
const VERSION='rep-lap-next-vercel-v3-milestone-3';
const SCOPE=new URL(self.registration.scope);
const HOME=new URL('./',SCOPE).href;
const CORE=['./','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE.map(x=>new URL(x,SCOPE).href))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('rep-lap-next-')&&x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE.pathname))return;
  if(url.pathname.includes('/api/')||url.pathname.includes('/__/auth/'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    if(event.request.mode==='navigate'){
      try{const response=await fetch(event.request);if(response.ok)await cache.put(HOME,response.clone());return response;}
      catch{return await cache.match(HOME)||Response.error();}
    }
    const cached=await cache.match(event.request);
    if(cached)return cached;
    try{const response=await fetch(event.request);if(response.ok&&url.pathname.includes('/_next/static/'))await cache.put(event.request,response.clone());return response;}
    catch{return Response.error();}
  })());
});
