/* Service Worker — จำเป็นต้องมีเพื่อให้เบราว์เซอร์ยอมให้ "ติดตั้งแอป" ได้
 *
 * กลยุทธ์: เอาจากเน็ตก่อนเสมอ (network-first) แล้วค่อยถอยไปใช้แคชเมื่อออฟไลน์
 * เลือกแบบนี้เพราะ app.build.js ถูกสร้างใหม่ทุกครั้งที่ commit — ถ้าใช้แคชก่อน
 * ผู้ใช้จะติดโค้ดเก่าและไม่เห็นการแก้ไขจนกว่าจะล้างแคชเอง
 *
 * เวลาแก้ไฟล์นี้ ให้เปลี่ยนเลข CACHE ด้วย เพื่อล้างแคชเก่าทิ้ง
 */
const CACHE = "rms-v3";

/* ── แจ้งเตือนแบบ push (Firebase Cloud Messaging) ─────────────────────────
 * รวมไว้ใน service worker ตัวเดียวกัน ไม่แยกเป็น firebase-messaging-sw.js
 * เพราะ scope ชนกัน (ตัวหลังจะไปแทนที่ตัวนี้ แล้วแคชออฟไลน์จะหาย)
 * โหลดไลบรารีไม่ได้ (ออฟไลน์/บล็อก) ก็ข้ามไป ส่วนแคชยังทำงานตามปกติ
 * ────────────────────────────────────────────────────────────────────── */
try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");
  firebase.initializeApp({
    apiKey: "AIzaSyBhcH8DyubFWzX93b7sD4GYuDK3TUTFI4Y",
    authDomain: "uesr-panamanee.firebaseapp.com",
    databaseURL: "https://uesr-panamanee-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "uesr-panamanee",
    storageBucket: "uesr-panamanee.firebasestorage.app",
    messagingSenderId: "845019270186",
    appId: "1:845019270186:web:a7c33f347831b422e64753",
  });
  // ฝั่งเซิร์ฟเวอร์ส่งมาเป็น data ล้วน เบราว์เซอร์จึงไม่เด้งให้เอง ต้องโชว์ตรงนี้
  firebase.messaging().onBackgroundMessage(function (payload) {
    var d = (payload && payload.data) || {};
    self.registration.showNotification(d.title || "ระบบแจ้งซ่อม", {
      body: d.body || "",
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: d.tag || "rms-push",
      renotify: true,
      data: { url: d.url || "./" },
    });
  });
} catch (e) {
  /* ไม่มีเน็ตตอนติดตั้ง SW หรือเบราว์เซอร์ไม่รองรับ — ข้ามส่วนแจ้งเตือนไป */
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

const ASSETS = [
  "./",
  "./index.html",
  "./app.build.js",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .catch(() => {})           // ไฟล์ไหนโหลดไม่ได้ก็ข้ามไป ไม่ให้ติดตั้ง SW ล้มทั้งก้อน
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // ปล่อยให้ Firebase / CDN / Apps Script วิ่งตรงตามปกติ ไม่แตะต้อง
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match("./index.html"))
      )
  );
});
