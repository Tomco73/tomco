const CACHE='tomco-v8';
const CORE=['/','/index.html','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  const isNav=e.request.mode==='navigate' || url.pathname==='/' || url.pathname.endsWith('/index.html');
  if(isNav){
    e.respondWith(fetch(e.request).then(res=>{ const copy=res.clone(); if(res.ok && url.origin===location.origin){ caches.open(CACHE).then(c=>c.put(e.request,copy)); } return res; }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('/index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit=> hit || fetch(e.request).then(res=>{ const copy=res.clone(); if(res.ok && url.origin===location.origin){ caches.open(CACHE).then(c=>c.put(e.request,copy)); } return res; }).catch(()=>caches.match('/index.html'))));
});
