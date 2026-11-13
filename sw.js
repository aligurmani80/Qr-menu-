/* ==========================================================================
   APP-SHELL SERVICE WORKER

   Keeps the menu, admin shell and static assets available offline. HTML and
   config.js are network-first so copy changes and plan dates update as soon
   as a device is online again.
   ========================================================================== */

"use strict";

const CACHE_NAME = "qr-menu-shell-20261113i";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./landing.html",
  "./config.js",
  "./manifest.json",
  "./css/style.css",
  "./css/landing.css",
  "./js/tenant.js",
  "./js/main.js",
  "./js/landing.js",
  "./js/pwa.js",
  "./assets/logo.svg",
  "./assets/favicon.ico",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./admin/login.html",
  "./admin/super-login.html",
  "./admin/super.html",
  "./admin/css/admin.css",
  "./admin/js/admin.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          CORE_ASSETS.map((url) =>
            fetch(url, { cache: "reload" }).then((response) => {
              if (response.ok) return cache.put(url, response);
            })
          )
        )
      )
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isNetworkFirst(url, request) {
  return request.mode === "navigate" || url.pathname.endsWith("/config.js");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkFirst(url, request)) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            return caches.match("./index.html");
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
