/**
 * SERVICE WORKER - PWA
 * Permet le fonctionnement hors-ligne et la mise en cache
 */

const CACHE_NAME = 'loup-garou-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/app.js',
    '/js/roles.js',
    '/js/gameLogic.js',
    '/js/network.js',
    '/manifest.json'
];

/**
 * Installation du Service Worker
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .catch((err) => {
                console.error('Erreur cache install:', err);
            })
    );

    // Forcer l'activation immédiate
    self.skipWaiting();
});

/**
 * Activation du Service Worker
 */
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

    // Reprendre le contrôle immédiatement
    self.clients.claim();
});

/**
 * Interception des requêtes (Stratégie Cache First)
 */
self.addEventListener('fetch', (event) => {
    // Ne pas gérer les requêtes non-GET ou les requêtes vers l'API
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    // Stratégie: Network First pour les assets critiques, Cache First pour les autres
    // On simplifie: essayer réseau, si échec (offline), essayer cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Ne pas cacher si pas ok
                if (!response || response.status !== 200) return response;

                // Cacher pour plus tard
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                return response;
            })
            .catch(() => {
                // Échec réseau (hors ligne), tenter le cache
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // Fallback ultime
                    return new Response('Absent du cache et hors-ligne', { status: 404 });
                });
            })
    );
});

/**
 * Gestion des messages depuis le client
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker chargé');
