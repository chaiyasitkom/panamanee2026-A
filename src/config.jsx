// API client — talks to Google Apps Script backend
// ถ้าอยากกลับไปใช้ mock data ให้ตั้ง USE_MOCK = true

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvTCi-GGM1gE-SZLGb5icbaDpGlpP6MNbo-LwYO2ri8-ShZ_KcAcszSzNcm9rRC927ew/exec";
const USE_MOCK = false;

async function api(action, payload = {}) {
  if (USE_MOCK) return mockApi(action, payload);
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    // Apps Script ปิด CORS preflight ถ้า content-type เป็น text/plain
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "Unknown error");
  return j.data;
}

function mockApi(action, p) {
  return new Promise(r => setTimeout(() => r(null), 200));
}

// Read file as base64 (for photo uploads)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = fr.result;
      const i = s.indexOf(",");
      resolve({ name: file.name, mimeType: file.type, data: s.slice(i + 1) });
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

window.api = api;
window.fileToBase64 = fileToBase64;
window.APPS_SCRIPT_URL = APPS_SCRIPT_URL;
