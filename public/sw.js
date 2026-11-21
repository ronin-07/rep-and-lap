/* RepLap offline shell. Never serve stale Next.js code ahead of the network:
 * cached chunks from an earlier Vercel deployment can break client hydration. */
const VERSION='rep-lap-next-reload-safe-v1';
const SCOPE=new URL(self.registration.scope);
const HOME=new URL('./',SCOPE).href;
const CORE=['./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./recover-timer.html'];
self.addEventListener('install',event=>event.waitUntil(
 caches.open(VERSION).then(cache=>cache.addAll(CORE.map(path=>new URL(path,SCOPE).href))).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rep-lap-next-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 if(url.pathname.includes('/api/')||url.pathname.includes('/__/auth/'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(VERSION);
  if(event.request.mode==='navigate'){
   try{
    const response=await fetch(event.request);
    if(response.ok&&url.pathname===SCOPE.pathname)await cache.put(HOME,response.clone());
    return response;
   }catch{
    return await cache.match(url.pathname===SCOPE.pathname?HOME:event.request)
      ||await cache.match(new URL('./recover-timer.html',SCOPE).href)
      ||Response.error();
   }
  }
  // Next chunks are deployment-specific. Always try the actual deployment
  // before using any offline copy, instead of cache-first stale JavaScript.
  if(url.pathname.includes('/_next/')){
   try{
    const response=await fetch(event.request);
    if(response.ok&&url.pathname.includes('/_next/static/'))await cache.put(event.request,response.clone());
    return response;
   }catch{return await cache.match(event.request)||Response.error();}
  }
  const cached=await cache.match(event.request);
  if(cached)return cached;
  try{return await fetch(event.request);}catch{return Response.error();}
 })());
});
