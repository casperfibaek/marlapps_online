// Service Worker for offline support - MarlApps v2.0

const CACHE_NAME = 'marlapps-v21';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',

  // PWA Icons
  './icons/icon.svg',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',

  // Theme system
  './themes/tokens.css',
  './themes/dark.css',
  './themes/light.css',
  './themes/futuristic.css',
  './themes/amalfi.css',
  './themes/app-common.css',

  // Launcher
  './launcher/launcher.css',
  './launcher/theme-manager.js',
  './launcher/app-loader.js',
  './launcher/search.js',
  './launcher/settings.js',
  './launcher/launcher.js',
  './launcher/pwa-install.js',

  // App Registry
  './registry/apps.json',

  // Pomodoro Timer App
  './apps/pomodoro-timer/manifest.json',
  './apps/pomodoro-timer/index.html',
  './apps/pomodoro-timer/styles.css',
  './apps/pomodoro-timer/app.js',
  './apps/pomodoro-timer/icon.svg',

  // Kanban Board App
  './apps/kanban-board/manifest.json',
  './apps/kanban-board/index.html',
  './apps/kanban-board/styles.css',
  './apps/kanban-board/app.js',
  './apps/kanban-board/icon.svg',

  // Todo List App
  './apps/todo-list/manifest.json',
  './apps/todo-list/index.html',
  './apps/todo-list/styles.css',
  './apps/todo-list/app.js',
  './apps/todo-list/icon.svg',

  // Notes App
  './apps/notes/manifest.json',
  './apps/notes/index.html',
  './apps/notes/styles.css',
  './apps/notes/app.js',
  './apps/notes/icon.svg',

  // Habits App
  './apps/habits/manifest.json',
  './apps/habits/index.html',
  './apps/habits/styles.css',
  './apps/habits/app.js',
  './apps/habits/icon.svg',

  // Mirror App
  './apps/mirror/manifest.json',
  './apps/mirror/index.html',
  './apps/mirror/styles.css',
  './apps/mirror/app.js',
  './apps/mirror/icon.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch(() => {})
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
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
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          return caches.match('./index.html');
        });
      })
  );
});

// Message event - handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
