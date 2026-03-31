/**
 * SERVICE WORKER - PWA
 * Permet le fonctionnement hors-ligne et la mise en cache
 */

const CACHE_NAME = 'loup-garou-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/app.js',
    '/js/roles.js',
    '/js/gameLogic.js',
    '/js/bluetooth.js',
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
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retourner la version en cache si disponible
                if (response) {
                    return response;
                }

                // Sinon, faire une requête réseau
                return fetch(event.request
                ).then((response) => {
                    // Ne pas cacher les réponses non-réussies
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    // Cacher la version en réseau
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch((err) => {
                    console.error('Erreur fetch:', err);
                    // Retourner une page hors-ligne si nécessaire
                    return new Response('Application hors-ligne', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
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
