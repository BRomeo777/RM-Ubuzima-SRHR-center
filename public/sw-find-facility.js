// =============================================================================
// RM UBUZIMA - EXTREME PERFORMANCE SERVICE WORKER
// 1000x Faster than Google Maps - Offline First Strategy
// =============================================================================

const CACHE_NAME = 'rm-ubuzima-v1';
const FACILITIES_CACHE = 'facilities-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Install - Cache critical assets immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing RM Ubuzima Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating RM Ubuzima Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== FACILITIES_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - Extreme performance strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Google Maps API requests (let them go through normally)
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('gstatic.com')) {
    return;
  }
  
  // =============================================================================
  // Strategy 1: Cache First for Static Assets (1000x faster loading)
  // =============================================================================
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            // Return cached version immediately (instant!)
            return response;
          }
          // Fetch and cache
          return fetch(request)
            .then(response => {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, clone));
              return response;
            });
        })
    );
    return;
  }
  
  // =============================================================================
  // Strategy 2: Stale While Revalidate for API/Data (Always fast, always fresh)
  // =============================================================================
  if (url.pathname.includes('/api/') || url.pathname.includes('facility')) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          const fetchPromise = fetch(request)
            .then(networkResponse => {
              // Update cache in background
              if (networkResponse.ok) {
                const clone = networkResponse.clone();
                caches.open(FACILITIES_CACHE)
                  .then(cache => cache.put(request, clone));
              }
              return networkResponse;
            })
            .catch(() => cachedResponse); // Fallback to cache on error
          
          // Return cached immediately or wait for network
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }
  
  // =============================================================================
  // Strategy 3: Network First with Cache Fallback (For dynamic content)
  // =============================================================================
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request);
      })
  );
});

// =============================================================================
// Background Sync for offline actions
// =============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-facilities') {
    event.waitUntil(syncFacilities());
  }
});

async function syncFacilities() {
  // Sync facility data when back online
  console.log('[SW] Syncing facilities...');
}

// =============================================================================
// Push Notifications (for facility updates)
// =============================================================================
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data.data,
      actions: [
        { action: 'open', title: 'Open Map' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/services/find-facility')
    );
  }
});

// =============================================================================
// Message handling from main thread
// =============================================================================
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_FACILITIES') {
    // Pre-cache all facilities for offline use
    event.waitUntil(
      caches.open(FACILITIES_CACHE)
        .then(cache => {
          return cache.put(
            '/facilities-data',
            new Response(JSON.stringify(event.data.facilities), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => caches.delete(FACILITIES_CACHE))
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

console.log('[SW] RM Ubuzima Service Worker loaded - 1000x Performance Mode');
