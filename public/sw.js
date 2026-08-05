/*
  SmartInvest Fintech - Public Service Worker
  Scope: Caching, offline support, API request handling, security headers
  NOTE: This is a PUBLIC service worker (no sensitive logic inside)
*/

const CACHE_NAME = "smartinvest-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles.css",
  "/app.js"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy (Network First for API, Cache First for static)
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // API requests (Marketplace, Payments, Analytics)
  if (request.url.includes("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets
  event.respondWith(cacheFirst(request));
});

// Network First Strategy (for dynamic fintech data)
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // Clone and cache response
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match("/offline.html");
  }
}

// Cache First Strategy (for UI assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached || fetch(request);
}

// Background Sync (Order Retry / Payment Retry)
self.addEventListener("sync", (event) => {
  if (event.tag === "retry-payment") {
    event.waitUntil(retryFailedPayments());
  }
});

async function retryFailedPayments() {
  const db = await openDB();
  const failedPayments = await db.getAll("failed-payments");

  for (const payment of failedPayments) {
    try {
      await fetch("/api/payments/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payment)
      });

      await db.delete("failed-payments", payment.id);
    } catch (err) {
      console.error("Retry failed:", err);
    }
  }
}

// Push Notifications (Orders, Payments, Shipping Updates)
self.addEventListener("push", (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge.png",
    data: data.url
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || "/")
  );
});

// Fraud Detection Hint Layer (client-side lightweight signals)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Attach lightweight headers for backend fraud analysis
  const modifiedHeaders = new Headers(req.headers);
  modifiedHeaders.set("x-client-time", Date.now().toString());
  modifiedHeaders.set("x-client-platform", navigator.userAgent);

  const modifiedRequest = new Request(req, {
    headers: modifiedHeaders
  });

  event.respondWith(fetch(modifiedRequest));
});

// IndexedDB Helper (simplified)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("smartinvest-db", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("failed-payments")) {
        db.createObjectStore("failed-payments", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/*
  SECURITY NOTES:
  - No secrets stored here (PUBLIC SW)
  - All auth handled via JWT/API keys server-side
  - Service worker only enhances UX & resilience
*/
