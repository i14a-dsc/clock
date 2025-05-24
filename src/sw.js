const CACHE_NAME = 'clock-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/reset.css',
    '/css/common.css',
    '/css/material.css',
    '/js/clock.js',
    '/sound.mp3',
    '/end.mp3',
    '/lunch.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                // Important: Cloned response must be used only once for the cache.put()!
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Important: Cloned response must be used only once for the cache.put()!
                        const responseToCache = response.clone();

                        // Only cache http(s) requests
                        if (responseToCache.url.startsWith('http')) {
                             caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }

                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // Optionally, return a custom offline page
                        // return caches.match('/offline.html');
                    })
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
}); 