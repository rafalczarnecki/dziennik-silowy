// Offline: aplikacja zapisana w telefonie. Przy każdym otwarciu z internetem pobiera najnowszą wersję.
const C='dziennik-2026-10-28.2';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put('index.html',c))}return r}).catch(()=>caches.match('index.html')));return}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
    if(r.ok||r.type==='opaque'){const c=r.clone();if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(u.host))caches.open(C).then(x=>x.put(e.request,c))}
    return r})));
});
