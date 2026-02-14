const CACHE_NAME = 'kesehatan-v3';
const ASSETS_TO_CACHE = [
    '/kesehatan/',
    '/kesehatan/index.html',
    '/kesehatan/css/style.css',
    '/kesehatan/js/app.js',
    '/kesehatan/js/auth.js',
    '/kesehatan/js/db.js',
    '/kesehatan/js/utils.js',
    '/kesehatan/js/backup.js',
    '/kesehatan/js/supabase-sync.js',
    '/kesehatan/js/serial-manager.js',
    '/kesehatan/js/treatment.js',
    '/kesehatan/js/moving.js',
    '/kesehatan/js/pengambilan-obat.js',
    '/kesehatan/js/penambahan-obat.js',
    '/kesehatan/js/pen-trial.js',
    '/kesehatan/js/dashboard.js',
    '/kesehatan/libs/xlsx.full.min.js',
    '/kesehatan/manifest.json',
    '/kesehatan/icons/icon-192.png',
    '/kesehatan/icons/icon-512.png'
];

// Install — cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for Supabase API calls
    if (url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for everything else
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
