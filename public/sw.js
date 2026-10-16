// Service Worker para Portal de Clientes PWA (Scope exclusivo /clientes)
const CACHE_NAME = 'portal-clientes-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Static assets: Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Strict scope: no interceptar ninguna página o recurso de la web pública
  if (!url.pathname.startsWith('/clientes')) {
    return;
  }

  // Navigation and dynamic pages within /clientes: Network First with graceful cache fallback if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
});

// ── Web Push Notifications ─────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Nuevo Lead Recibido';
  const options = {
    body: data.body || 'Tienes un nuevo contacto esperando en el portal.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/clientes/leads',
      leadId: data.leadId,
    },
    tag: data.tag || (data.leadId ? `lead-${data.leadId}` : 'edp-lead-new'),
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/clientes/leads';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña del portal abierta, enfocarla y navegar
      for (const client of clientList) {
        if (client.url.includes('/clientes') && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Si no hay ninguna abierta, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

