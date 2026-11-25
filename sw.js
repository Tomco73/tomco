/* TOMCO Service Worker - v7 (auto-update) */
const CACHE = 'tomco-v17';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

/* 1) التثبيت: لو ملف واحد فشل (مثلاً أيقونة)، باقي الملفات تتخزن عادي
   القديم كان: addAll — لو ملف واحد فشل، التثبيت كلو بيفشل */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

/* 2) التفعيل: مسح أي كاش قديم + استلام التحكم فوراً */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 3) السماح للتطبيق يطلب التحديث بزر واحد */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

/* 4) الجلب:
   - الصفحات (/, /index.html): الشبكة أولاً، والكاش احتياطي
     القديم كان: الكاش أولاً — وده سبب بقاء النسخة القديمة للأبد
   - باقي الملفات (أيقونات، manifest): الكاش أولاً، والشبكة احتياطي
     مع ignoreSearch عشان روابط زي ?v=37 ما تعمل نسخ مخزنة مكررة */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');

  if (isPage) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy));
        }
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    )
  );
});
