const CACHE_NAME = 'clock-cache-v2';
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

// Service Worker インストール時の処理
self.addEventListener('install', (event) => {
    console.log('Service Worker: インストール中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: アセットをプリキャッシュ中');
                // addAllでプリキャッシュ
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('Service Worker: インストール完了');
                // 新しいService Workerを即座にアクティベート
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: インストールまたはプリキャッシュに失敗しました', error);
            })
    );
});

// Service Worker アクティベート時の処理
self.addEventListener('activate', (event) => {
    console.log('Service Worker: アクティベート中...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 現在のキャッシュ名以外のキャッシュを削除（クリーンアップ）
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 古いキャッシュを削除中', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: アクティベート完了');
            // 全てのクライアントに制御を要求
            return self.clients.claim();
        })
    );
});

// Service Worker フェッチ時の処理
self.addEventListener('fetch', (event) => {
    // http(s)スキーム以外のリクエストは無視する (例: chrome-extension://)
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // キャッシュに一致するリソースがあればそれを返す
                if (cachedResponse) {
                    console.log('Service Worker: キャッシュから取得', event.request.url);
                    return cachedResponse;
                }

                // キャッシュになければネットワークから取得
                console.log('Service Worker: ネットワークから取得', event.request.url);
                const fetchRequest = event.request.clone(); // リクエストをクローン

                return fetch(fetchRequest)
                    .then((response) => {
                        // レスポンスが無効ならそのまま返す
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 有効なレスポンスならキャッシュに保存するためにクローン
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                console.log('Service Worker: レスポンスをキャッシュ', event.request.url);
                                cache.put(event.request, responseToCache);
                            });

                        // ネットワークレスポンスをクライアントに返す
                        return response;
                    });
            })
            .catch((error) => {
                console.error('Service Worker: Fetch失敗:', event.request.url, error);
                // オフライン時など、ネットワーク取得に失敗した場合のフォールバック
                // 必要であればここでオフラインページなどを返せます
                // 例: return caches.match('/offline.html');
                // 現在は何も返さない（ブラウザのデフォルトオフライン表示）
            })
    );
}); 