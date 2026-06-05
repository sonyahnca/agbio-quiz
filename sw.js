/* 오프라인 캐시 (https/localhost에서만 등록됨)
   network-first: 온라인이면 항상 최신, 오프라인이면 캐시 폴백 → 업데이트 누락 방지 */
const CACHE='quiz-v6';
const ASSETS=['./','./index.html','./soil.html','./gen.html','./style.css','./app.js',
  './manifest-agbio.webmanifest','./manifest-soil.webmanifest','./manifest-gen.webmanifest',
  './icon-agbio.svg','./icon-soil.svg','./icon-gen.svg',
  './data/농업생물화학.js','./data/토양학.js','./data/농업유전학.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;
    }).catch(()=>caches.match(e.request))
  );
});
