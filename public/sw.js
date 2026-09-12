// Simple Service Worker for AudioCast APK & PWA installation
const CACHE_NAME = 'audiocast-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let streaming & media requests bypass caching directly
  if (
    event.request.url.includes('.m3u8') ||
    event.request.url.includes('.ts') ||
    event.request.url.includes('.mp3') ||
    event.request.url.includes('.aac') ||
    event.request.destination === 'audio' ||
    event.request.destination === 'video'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
