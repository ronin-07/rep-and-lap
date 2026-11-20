/* Rep & Lap — offline-first shell. Firebase credentials and API responses are never SW-cached. */
const CACHE='rep-and-lap-firebase-20261120-v1';
const SHELL=['./','./index.html','./app.js','./styles.css','./firebase-config.js','./firebase-client.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rep-and-lap-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const sdkModule=url.origin==='https://www.gstatic.com'&&url.pathname.startsWith('/firebasejs/13.4.0/');
  // Only SDK static scripts may be cached cross-origin. Do NOT cache Auth or Firestore API responses.
  if(!sameOrigin&&!sdkModule)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // The versioned SDK can be served cache-first after the initial online visit.
    if(sdkModule){
      const cached=await cache.match(event.request);
      if(cached)return cached;
      try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
      catch{return Response.error();}
    }
    const isNavigation=event.request.mode==='navigate';
    try{
      const response=await fetch(event.request);
      if(response.ok)cache.put(event.request,response.clone());
      return response;
    }catch{
      return (await cache.match(event.request))||(isNavigation?await cache.match('./index.html'):undefined)||Response.error();
    }
  })());
});
