/**
 * ระบบแจ้งซ่อมเครื่องจักร — ตัวส่งแจ้งเตือน Push (Firebase Cloud Messaging)
 * ========================================================================
 *
 * ไฟล์นี้เป็น "ฝั่งเซิร์ฟเวอร์" ของการแจ้งเตือน — ทำให้เตือนได้แม้ผู้ใช้ปิดแอปไปแล้ว
 *
 *   เว็บ (sw.js + window.__FCM)  ──เก็บ token──>  Firebase /fcmTokens/{userId}/{token}
 *                                                        │
 *   Apps Script (ไฟล์นี้) ──อ่าน token + งานซ่อม──────────┘
 *          └──ยิง HTTP v1──> FCM ──push──> มือถือ/คอมของผู้ใช้
 *
 * สิ่งที่ส่ง
 *   1) pushNewRepairs      — มีใบแจ้งซ่อมใหม่เข้าระบบ (trigger ทุก 5 นาที)
 *   2) pushPendingDigest   — สรุปงานค้าง (trigger 08:00 / 11:00 / 13:00 / 17:00)
 *
 * ติดตั้งครั้งเดียว: ดูขั้นตอนทั้งหมดใน backend/FCM-SETUP.md
 *   - ตั้ง Script Property ชื่อ FCM_SERVICE_ACCOUNT = เนื้อหาไฟล์ service account JSON
 *   - รันฟังก์ชัน setupNotifyTriggers() หนึ่งครั้งเพื่อสร้าง trigger
 */

// ===== CONFIG =====
const FB_DB_URL     = 'https://uesr-panamanee-default-rtdb.asia-southeast1.firebasedatabase.app';
const NOTIFY_ROLES  = ['Admin', 'Technician'];   // ตำแหน่งที่จะได้รับแจ้งเตือน
const DIGEST_HOURS  = [8, 11, 13, 17];           // รอบสรุปงานค้าง
const NEW_JOB_MAX_AGE_MS = 6 * 60 * 60 * 1000;   // ใบงานเก่ากว่านี้ไม่ต้องเตือนย้อนหลัง

// ─────────────────────────────────────────────────────────────────────────
// ติดตั้ง trigger (รันมือครั้งเดียว)
// ─────────────────────────────────────────────────────────────────────────
function setupNotifyTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'pushNewRepairs' || fn === 'pushPendingDigest') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('pushNewRepairs').timeBased().everyMinutes(5).create();
  DIGEST_HOURS.forEach(function (hr) {
    ScriptApp.newTrigger('pushPendingDigest').timeBased().atHour(hr).nearMinute(0).everyDays(1).create();
  });

  // รอบแรกยังไม่รู้ว่าเคยเตือนถึงไหน — ตั้งหมุดเวลาไว้ กันยิงย้อนหลังทั้งกอง
  PropertiesService.getScriptProperties().setProperty('FCM_LAST_REPAIR_TS', String(Date.now()));
  Logger.log('ตั้ง trigger เรียบร้อย: เช็คใบงานใหม่ทุก 5 นาที + สรุปงานค้าง ' + DIGEST_HOURS.join(', ') + ' น.');
}

// ─────────────────────────────────────────────────────────────────────────
// 1) ใบแจ้งซ่อมใหม่
// ─────────────────────────────────────────────────────────────────────────
function pushNewRepairs() {
  var props = PropertiesService.getScriptProperties();
  var last = Number(props.getProperty('FCM_LAST_REPAIR_TS') || 0);
  var now = Date.now();

  if (!last) {                                   // รันครั้งแรก = ตั้งหมุดเฉย ๆ ไม่เตือนย้อนหลัง
    props.setProperty('FCM_LAST_REPAIR_TS', String(now));
    return;
  }

  var repairs = fbGet_('/repairs') || {};
  var fresh = Object.keys(repairs).map(function (k) { return repairs[k]; }).filter(function (r) {
    if (!r || !r.createdAt) return false;
    var t = Date.parse(r.createdAt) || 0;
    return t > last && (now - t) < NEW_JOB_MAX_AGE_MS;
  });

  props.setProperty('FCM_LAST_REPAIR_TS', String(now));
  if (!fresh.length) return;

  fresh.sort(function (a, b) { return Date.parse(a.createdAt) - Date.parse(b.createdAt); });

  var targets = tokensForRoles_(NOTIFY_ROLES);
  if (!targets.length) return;

  fresh.forEach(function (r) {
    var what = firstProblem_(r);
    var title = 'มีใบแจ้งซ่อมใหม่ ' + (r.running || r.id || '');
    var body = [what, r.machineCode || 'ไม่ระบุเครื่องจักร', r.project || 'ไม่ระบุโครงการ']
      .filter(String).join(' · ');
    // ไม่ส่งให้คนที่เป็นผู้แจ้งเอง
    var list = targets.filter(function (t) { return String(t.userId) !== String(r.reporterId || ''); });
    sendToTokens_(list, title, body, { kind: 'new', id: String(r.id || ''), tag: 'rms-new-repair' });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2) สรุปงานค้างตามรอบเวลา
// ─────────────────────────────────────────────────────────────────────────
function pushPendingDigest() {
  var repairs = fbGet_('/repairs') || {};
  var open = Object.keys(repairs).map(function (k) { return repairs[k]; }).filter(function (r) {
    return r && r.status !== 'done' && r.status !== 'cancel';
  });
  if (!open.length) return;                      // ไม่มีงานค้าง ไม่ต้องกวน

  var byStatus = {};
  open.forEach(function (r) { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  var labels = {
    'new': 'ใหม่', 'assess': 'รอประเมินราคา', 'progress': 'กำลังดำเนินการ', 'parts': 'รอชิ้นส่วน'
  };
  var parts = Object.keys(byStatus).map(function (k) { return (labels[k] || k) + ' ' + byStatus[k]; });

  var hh = ('0' + new Date().getHours()).slice(-2);
  var title = 'งานซ่อมค้าง ' + open.length + ' ใบ (รอบ ' + hh + ':00)';

  tokensForRoles_(NOTIFY_ROLES).forEach(function (t) {
    var mine = open.filter(function (r) { return String(r.assignedId || '') === String(t.userId); }).length;
    var body = parts.join(' · ') + (mine ? ' · ที่คุณรับผิดชอบ ' + mine + ' ใบ' : '');
    sendToTokens_([t], title, body, { kind: 'digest', tag: 'rms-job-digest' });
  });
}

// ส่งข้อความทดสอบหาตัวเองทุกเครื่องที่ลงทะเบียนไว้ (ใช้ตอนตั้งค่าเสร็จใหม่ ๆ)
function pushTestMessage() {
  var targets = tokensForRoles_(NOTIFY_ROLES);
  Logger.log('พบ token ที่จะส่ง: ' + targets.length + ' เครื่อง');
  if (!targets.length) { Logger.log('ยังไม่มีใครเปิดรับแจ้งเตือนบนเว็บเลย'); return; }
  var sent = sendToTokens_(targets, 'ทดสอบการแจ้งเตือน', 'ถ้าเห็นข้อความนี้ แปลว่าตั้งค่า FCM สำเร็จแล้ว', { kind: 'test', tag: 'rms-test' });
  Logger.log('ส่งสำเร็จ ' + sent + ' เครื่อง');
}

// ─────────────────────────────────────────────────────────────────────────
// ตัวช่วย: อ่าน Firebase ผ่าน REST
// ─────────────────────────────────────────────────────────────────────────
function fbGet_(path) {
  var url = FB_DB_URL.replace(/\/$/, '') + path + '.json';
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    Logger.log('อ่าน Firebase ไม่สำเร็จ ' + path + ' → HTTP ' + res.getResponseCode());
    return null;
  }
  try { return JSON.parse(res.getContentText()); } catch (e) { return null; }
}

function firstProblem_(r) {
  if (r.problems) {
    var list = Array.isArray(r.problems) ? r.problems : Object.keys(r.problems).map(function (k) { return r.problems[k]; });
    if (list.length && list[0] && list[0].text) return String(list[0].text);
  }
  return String(r.title || 'ไม่ระบุอาการ').split('\n')[0];
}

// token ทั้งหมดของตำแหน่งที่ต้องการ → [{userId, token, role, name}]
function tokensForRoles_(roles) {
  var all = fbGet_('/fcmTokens') || {};
  var out = [];
  Object.keys(all).forEach(function (uid) {
    var perUser = all[uid] || {};
    Object.keys(perUser).forEach(function (k) {
      var rec = perUser[k];
      if (!rec || !rec.token) return;
      if (roles.indexOf(String(rec.role)) === -1) return;
      out.push({ userId: uid, token: rec.token, role: rec.role, name: rec.name, key: k });
    });
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// ตัวช่วย: ยิงเข้า FCM HTTP v1
// ─────────────────────────────────────────────────────────────────────────
function serviceAccount_() {
  var raw = PropertiesService.getScriptProperties().getProperty('FCM_SERVICE_ACCOUNT');
  if (!raw) throw new Error('ยังไม่ได้ตั้ง Script Property ชื่อ FCM_SERVICE_ACCOUNT (ดู backend/FCM-SETUP.md)');
  return JSON.parse(raw);
}

function fcmAccessToken_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('FCM_TOKEN');
  if (hit) return hit;

  var sa = serviceAccount_();
  var now = Math.floor(Date.now() / 1000);
  var header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=+$/, '');
  var claim = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).replace(/=+$/, '');
  var sig = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(header + '.' + claim, sa.private_key)
  ).replace(/=+$/, '');

  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claim + '.' + sig,
    },
    muteHttpExceptions: true,
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (!body.access_token) throw new Error('ขอ access token ไม่สำเร็จ: ' + res.getContentText());
  cache.put('FCM_TOKEN', body.access_token, 3000);   // อายุจริง 1 ชม. เก็บไว้ 50 นาทีพอ
  return body.access_token;
}

/**
 * ส่งข้อความหาหลาย token — ส่งเป็น data message ล้วน
 * (ถ้าใส่ notification มาด้วย Chrome จะเด้งเองซ้ำกับที่ sw.js เด้ง กลายเป็น 2 อัน)
 */
function sendToTokens_(targets, title, body, data) {
  if (!targets || !targets.length) return 0;
  var accessToken = fcmAccessToken_();
  var sa = serviceAccount_();
  var url = 'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send';
  var sent = 0;

  targets.forEach(function (t) {
    var payload = { message: { token: t.token, data: {} } };
    payload.message.data.title = String(title || '');
    payload.message.data.body = String(body || '');
    Object.keys(data || {}).forEach(function (k) { payload.message.data[k] = String(data[k]); });
    payload.message.webpush = { headers: { Urgency: 'high', TTL: '3600' } };

    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    if (code === 200) { sent++; return; }

    // token ตายแล้ว (ถอนแอป/ล้างข้อมูลเบราว์เซอร์) → เก็บกวาดออกจากฐานข้อมูล
    if (code === 404 || code === 400) {
      Logger.log('ลบ token ที่ใช้ไม่ได้ของ ' + (t.name || t.userId) + ' → ' + res.getContentText().slice(0, 160));
      deleteToken_(t.userId, t.key);
    } else {
      Logger.log('ส่งไม่สำเร็จ HTTP ' + code + ' → ' + res.getContentText().slice(0, 200));
    }
  });
  return sent;
}

function deleteToken_(userId, key) {
  try {
    var url = FB_DB_URL.replace(/\/$/, '') + '/fcmTokens/' + userId + '/' + key + '.json';
    UrlFetchApp.fetch(url, { method: 'delete', muteHttpExceptions: true });
  } catch (e) { /* ลบไม่ได้ก็ปล่อยไว้ รอบหน้าค่อยลบใหม่ */ }
}
