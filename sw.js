/* Service worker for Prism.
 *
 * Two jobs, and deliberately not a third:
 *
 *   1. Make the app installable, so it can be added to a phone's home screen. That is what
 *      unlocks notifications on iOS at all -- Safari only allows them for an installed PWA.
 *   2. Own the notifications. registration.showNotification() is the only path that works on
 *      Android and on an installed iOS PWA; `new Notification(...)` throws there.
 *
 * The third job it does NOT do is offline caching. A stale cached app.js that keeps serving
 * itself after a deploy is its own genre of bug, and this app's whole state lives in a remote
 * file it has to fetch anyway, so there is nothing useful to serve offline. Requests are left
 * to the network untouched -- there is no fetch handler here on purpose.
 *
 * Push-while-closed is not possible from this host: Web Push needs a server holding VAPID keys
 * to send from, and the app is served as static files from GitHub Pages. Everything here fires
 * from the page while it is open or recently backgrounded.
 */
const VERSION = 'prism-sw-1';

self.addEventListener('install', function (event) {
  /* take over straight away rather than waiting for every old tab to close -- there is no cache
     to migrate, so there is nothing for a slow handover to protect */
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      /* an earlier build of this file did cache; drop anything it left behind so a stale entry
         can't outlive it */
      const names = await caches.keys();
      await Promise.all(names.map(function (n) { return caches.delete(n); }));
      await self.clients.claim();
    })()
  );
});

/* clicking a notification should bring the app forward rather than opening a second copy */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    (async function () {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })()
  );
});
