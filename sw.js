// Troque a versão sempre que alterar algum arquivo
const VERSAO = 'trilha-v1';
const ARQUIVOS = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon.svg',
  'conteudo/m1.html', 'conteudo/m2.html', 'conteudo/m3.html', 'conteudo/m4.html',
  'conteudo/m5.html', 'conteudo/m6.html', 'conteudo/m7.html', 'conteudo/recursos.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copia = res.clone();
        caches.open(VERSAO).then(c => c.put(e.request, copia));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
