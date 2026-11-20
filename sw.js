/* Rep & Lap offline shell. Auth API requests are never cached. */
const CACHE='rep-and-lap-v2-4-20261120';
const SHELL=['./','./index.html','./app.js','./styles.css','./supabase-config.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rep-and-lap-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return; // Supabase, login, third-party resources always use the network.
  const isNavigation=event.request.mode==='navigate';
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const network=await fetch(event.request);
      if(network.ok)cache.put(event.request,network.clone());
      return network;
    }catch{
      return (await cache.match(event.request))||(isNavigation?await cache.match('./index.html'):undefined)||Response.error();
    }
  })());
});
