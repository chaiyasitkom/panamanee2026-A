/* Service Worker — จำเป็นต้องมีเพื่อให้เบราว์เซอร์ยอมให้ "ติดตั้งแอป" ได้
 *
 * กลยุทธ์: เอาจากเน็ตก่อนเสมอ (network-first) แล้วค่อยถอยไปใช้แคชเมื่อออฟไลน์
 * เลือกแบบนี้เพราะ app.build.js ถูกสร้างใหม่ทุกครั้งที่ commit — ถ้าใช้แคชก่อน
 * ผู้ใช้จะติดโค้ดเก่าและไม่เห็นการแก้ไขจนกว่าจะล้างแคชเอง
 *
 * เวลาแก้ไฟล์นี้ ให้เปลี่ยนเลข CACHE ด้วย เพื่อล้างแคชเก่าทิ้ง
 */
const CACHE = "rms-v1";
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
