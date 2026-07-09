/**
 * ระบบแจ้งซ่อมเครื่องจักร — Google Apps Script Backend
 * =====================================================
 *
 * วิธี Deploy:
 *  1. ไปที่ https://script.google.com → New Project
 *  2. เปลี่ยนชื่อโปรเจคเป็น "Repair System Backend"
 *  3. ลบ Code.gs เดิม แล้ววางโค้ดนี้ทั้งหมด
 *  4. เมนู File → Project properties → ใส่ timezone "Asia/Bangkok"
 *  5. กดปุ่ม Deploy → New deployment → เลือก "Web app"
 *     - Description: "v1"
 *     - Execute as: "Me (your-email@gmail.com)"
 *     - Who has access: "Anyone"  (หรือ "Anyone with Google account" ถ้าต้องการ login)
 *  6. กด Deploy → อนุญาตสิทธิ์ทั้งหมด
 *  7. คัดลอก Web app URL (จะลงท้ายด้วย /exec)
 *  8. นำ URL นั้นไปใส่ในไฟล์ src/data.jsx ของ Frontend
 *
 *  9. รันครั้งแรก: เลือกฟังก์ชัน setupSheets ใน dropdown แล้วกด Run
 *     ระบบจะสร้าง tab ทั้งหมดใน Google Sheet ให้อัตโนมัติ พร้อมข้อมูล seed
 */

// ========== CONFIG ==========
// Sheet สำหรับเก็บข้อมูลหลัก (Repairs, Machines, Categories, Timeline)
const SHEET_ID_MAIN  = '1TK9qhEbPhMNjygRD2dvibW2IY8MrSI0ORqW2nIbbUFw';
// Sheet สำหรับเก็บ User แยกต่างหาก
const SHEET_ID_USERS = '1CngMtXwDz8v0whavy_8bC481-npc3hROPpjk6tTHv4w';
const FOLDER_ID      = '1jZPV5NDh374VMnm4H_hOLkA6tWArjIQW';
const PJ2_FOLDER_ID  = '1VmAbHD3wktQ0vqcpixnDXGVf4mWwXqiD';
// Drive folder สำหรับเอกสารประกัน (PL)
const PL_FOLDER_ID   = '1xNxRoBKbjvu-bVl-C8_Rin2etfFEcSuD';

// map แต่ละ tab ไปยัง spreadsheet ที่ต้องการ
const TAB_SHEET = {
  Users:      SHEET_ID_USERS,
  Repairs:    SHEET_ID_MAIN,
  Categories: SHEET_ID_MAIN,
  Machines:   SHEET_ID_MAIN,
  Timeline:   SHEET_ID_MAIN,
};

const TABS = {
  USERS:      'Users',
  REPAIRS:    'Repairs',
  CATEGORIES: 'Categories',
  MACHINES:   'Machines',
  TIMELINE:   'Timeline',
};

const HEADERS = {
  Users:      ['id','username','password','name','role','dept','email','projects','createdAt'],
  Repairs:    ['id','running','siteId','createdAt','title','desc','project','categoryId',
               'status','reporterId','reporterName','assignedId','cost','machineCode',
               'photos','afterPhotos','updatedAt'],
  Categories: ['id','name','color','icon'],
  Machines:   ['id','project','code','name','brand','model','size','serial','ownership','categoryId','note','status','location','lastService','hours','icon','photo','driveId','driverName','drivePhoto','driveLink1','driveLink2','driveLinkPL','inspectionDate','nextInspectionDate'],
  Timeline:   ['id','repairId','status','when','by','note'],
};

// ========== ROUTER (Web App entry points) ==========
function doGet(e)  { return handle_(e, 'GET'); }
function doPost(e) { return handle_(e, 'POST'); }

function handle_(e, method) {
  try {
    const p = (e && e.parameter) || {};
    let body = {};
    if (method === 'POST' && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }
    if (method === 'POST' && p.payload && !Object.keys(body).length) {
      try { body = JSON.parse(p.payload); } catch (err) { body = {}; }
    }
    const action = body.action || p.action || 'ping';
    const fn = ACTIONS[action];
    if (!fn) return json_({ ok:false, error:'Unknown action: ' + action });
    const payload = Object.assign({}, p, body);
    const result = fn(payload);
    return json_({ ok:true, data:result });
  } catch (err) {
    return json_({ ok:false, error: String(err && err.stack || err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== SHEET HELPERS ==========
function sheet_(name) {
  const ssId = TAB_SHEET[name] || SHEET_ID_MAIN;
  const ss = SpreadsheetApp.openById(ssId);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name] || []);
    sh.getRange(1, 1, 1, (HEADERS[name] || []).length)
      .setFontWeight('bold').setBackground('#1E40AF').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * migrateHeaders_ — ตรวจว่าชีตมีคอลัมน์ครบตาม HEADERS[name] หรือยัง
 * ถ้าขาด: แทรกคอลัมน์ใหม่ไว้ท้ายตาราง แล้วย้ายข้อมูลเดิมให้ตรงตามลำดับ HEADERS ใหม่
 * ปลอดภัย: ไม่ลบคอลัมน์เก่าที่ไม่อยู่ใน HEADERS (เก็บไว้ท้ายชีต)
 */
function migrateHeaders_(name) {
  const sh = sheet_(name);
  const need = (HEADERS[name] || []).slice();
  const data = sh.getDataRange().getValues();
  if (data.length === 0) {
    sh.appendRow(need);
    sh.getRange(1, 1, 1, need.length).setFontWeight('bold').setBackground('#1E40AF').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return { name, added:need, kept:[] };
  }
  const oldHeaders = data[0].map(String);
  const oldRows = data.slice(1);

  // รวม header: HEADERS ใหม่ก่อน แล้วตามด้วย extra columns ที่มีในชีตเดิม (ไม่ลบ)
  const extra = oldHeaders.filter(h => h && !need.includes(h));
  const finalHeaders = need.concat(extra);

  // สร้างแถวใหม่โดย map ค่าเดิมไปยังคอลัมน์ตามชื่อ
  const remappedRows = oldRows.map(r => {
    const m = {};
    oldHeaders.forEach((h, i) => { m[h] = r[i]; });
    return finalHeaders.map(h => (m[h] !== undefined ? m[h] : ''));
  });

  // เขียนกลับทั้งหมด
  sh.clear();
  sh.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  if (remappedRows.length > 0) {
    sh.getRange(2, 1, remappedRows.length, finalHeaders.length).setValues(remappedRows);
  }
  sh.getRange(1, 1, 1, finalHeaders.length)
    .setFontWeight('bold').setBackground('#1E40AF').setFontColor('#ffffff');
  sh.setFrozenRows(1);

  const added = need.filter(h => !oldHeaders.includes(h));
  return { name, added, kept:extra };
}

/**
 * migrateAllSheets — รันเพื่อ migrate ทุกชีตให้ตรงกับ HEADERS ปัจจุบัน
 * เรียกใช้ผ่าน Apps Script menu: Run → migrateAllSheets
 */
function migrateAllSheets() {
  const results = Object.keys(HEADERS).map(n => migrateHeaders_(n));
  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function readAll_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(r => r.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    // parse JSON arrays
    if (obj.photos      && typeof obj.photos === 'string')      obj.photos      = safeJson_(obj.photos, []);
    if (obj.afterPhotos && typeof obj.afterPhotos === 'string') obj.afterPhotos = safeJson_(obj.afterPhotos, []);
    if (obj.projects    && typeof obj.projects === 'string')    obj.projects    = safeJson_(obj.projects, []);
    return obj;
  });
}

function appendRow_(name, obj) {
  const sh = sheet_(name);
  const headers = HEADERS[name];
  const row = headers.map(h => {
    let v = obj[h];
    if (Array.isArray(v)) v = JSON.stringify(v);
    if (v instanceof Date) v = v.toISOString();
    return v == null ? '' : v;
  });
  sh.appendRow(row);
  return obj;
}

function updateRow_(name, id, patch) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(id)) {
      headers.forEach((h, c) => {
        if (patch[h] !== undefined) {
          let v = patch[h];
          if (Array.isArray(v)) v = JSON.stringify(v);
          if (v instanceof Date) v = v.toISOString();
          sh.getRange(r+1, c+1).setValue(v);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteRow_(name, id) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(id)) {
      sh.deleteRow(r+1);
      return true;
    }
  }
  return false;
}

function safeJson_(s, fb) { try { return JSON.parse(s); } catch (e) { return fb; } }

function nextId_(name, prefix, pad) {
  const rows = readAll_(name);
  let max = 0;
  rows.forEach(r => {
    const m = String(r.id || '').match(/\d+/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  });
  return prefix + String(max+1).padStart(pad, '0');
}

// ========== ACTIONS ==========
const ACTIONS = {

  ping: () => ({ now: new Date().toISOString(), sheetMain: SHEET_ID_MAIN, sheetUsers: SHEET_ID_USERS, folderId: FOLDER_ID }),

  // ----- Auth -----
  login: ({ username, password }) => {
    const u = readAll_(TABS.USERS).find(x =>
      String(x.username) === String(username) && String(x.password) === String(password));
    if (!u) throw new Error('Username หรือ Password ไม่ถูกต้อง');
    const safe = Object.assign({}, u);
    delete safe.password;
    return safe;
  },

  // ----- Bootstrap (single call from app to load everything) -----
  bootstrap: () => ({
    users:      readAll_(TABS.USERS).map(u => { const x = Object.assign({}, u); delete x.password; return x; }),
    categories: readAll_(TABS.CATEGORIES),
    machines:   readAll_(TABS.MACHINES),
    repairs:    readAll_(TABS.REPAIRS).map(r => Object.assign({}, r, {
      timeline: readAll_(TABS.TIMELINE).filter(t => t.repairId === r.id)
    })),
  }),

  // ----- Users -----
  listUsers:   () => readAll_(TABS.USERS).map(u => { const x = Object.assign({}, u); delete x.password; return x; }),
  createUser:  ({ user }) => {
    user.id = user.id || nextId_(TABS.USERS, 'U', 3);
    user.createdAt = new Date().toISOString();
    appendRow_(TABS.USERS, user);
    return user;
  },
  updateUser:  ({ id, patch }) => ({ updated: updateRow_(TABS.USERS, id, patch) }),
  deleteUser:  ({ id })        => ({ deleted: deleteRow_(TABS.USERS, id) }),

  // ----- Categories -----
  listCategories:  () => readAll_(TABS.CATEGORIES),
  createCategory:  ({ cat }) => {
    cat.id = cat.id || nextId_(TABS.CATEGORIES, 'C', 2);
    appendRow_(TABS.CATEGORIES, cat);
    return cat;
  },
  updateCategory:  ({ id, patch }) => ({ updated: updateRow_(TABS.CATEGORIES, id, patch) }),
  deleteCategory:  ({ id })        => ({ deleted: deleteRow_(TABS.CATEGORIES, id) }),

  // ----- Machines -----
  listMachines:   () => readAll_(TABS.MACHINES),
  createMachine:  ({ m, photoUpload }) => {
    m.id = m.id || nextId_(TABS.MACHINES, 'M', 3);
    if (photoUpload && photoUpload.data) {
      const folder = getOrCreateMachineFolder_(m.code || m.id);
      const blob = Utilities.newBlob(Utilities.base64Decode(photoUpload.data), photoUpload.mimeType, photoUpload.name);
      const file = folder.createFile(blob);
      safeShareFile_(file);
      m.photo = file.getUrl();
    }
    appendRow_(TABS.MACHINES, m);
    return m;
  },
  updateMachine:  ({ id, patch, photoUpload }) => {
    if (photoUpload && photoUpload.data) {
      const folder = getOrCreateMachineFolder_(patch.code || id);
      const blob = Utilities.newBlob(Utilities.base64Decode(photoUpload.data), photoUpload.mimeType, photoUpload.name);
      const file = folder.createFile(blob);
      safeShareFile_(file);
      patch.photo = file.getUrl();
    }
    return { updated: updateRow_(TABS.MACHINES, id, patch), photo: patch.photo };
  },
  deleteMachine:  ({ id })        => ({ deleted: deleteRow_(TABS.MACHINES, id) }),

  // ----- Repairs -----
  listRepairs: () => {
    const repairs = readAll_(TABS.REPAIRS);
    const tl = readAll_(TABS.TIMELINE);
    return repairs.map(r => Object.assign({}, r, {
      timeline: tl.filter(t => t.repairId === r.id)
    }));
  },

  createRepair: ({ repair, uploads }) => {
    repair.id = repair.id || nextId_(TABS.REPAIRS, 'R', 4);
    // generate running number RE-69/xxx
    const running = readAll_(TABS.REPAIRS).length + 1;
    repair.running = repair.running || ('RE-69/' + String(running).padStart(3, '0'));
    repair.createdAt = repair.createdAt || new Date().toISOString();
    repair.updatedAt = new Date().toISOString();
    repair.status = repair.status || 'new';

    // upload photos to Drive
    const photoUrls = [];
    if (uploads && uploads.length) {
      const folder = getOrCreateRepairFolder_(repair.running);
      uploads.forEach(u => {
        const blob = Utilities.newBlob(Utilities.base64Decode(u.data), u.mimeType, u.name);
        const file = folder.createFile(blob);
        safeShareFile_(file);
        photoUrls.push(file.getUrl());
      });
    }
    repair.photos = photoUrls;
    repair.afterPhotos = [];

    appendRow_(TABS.REPAIRS, repair);

    // seed timeline
    appendRow_(TABS.TIMELINE, {
      id:       nextId_(TABS.TIMELINE, 'T', 5),
      repairId: repair.id,
      status:   'new',
      when:     new Date().toISOString(),
      by:       repair.reporterName || '',
      note:     'แจ้งเข้าระบบ',
    });

    return repair;
  },

  // Admin full edit — patch any repair field directly
  updateRepair: ({ id, patch, by }) => {
    const clean = Object.assign({}, patch || {});
    clean.updatedAt = new Date().toISOString();
    // prevent schema drift
    delete clean.id;
    delete clean.running;
    delete clean.createdAt;
    updateRow_(TABS.REPAIRS, id, clean);
    appendRow_(TABS.TIMELINE, {
      id:       nextId_(TABS.TIMELINE, 'T', 5),
      repairId: id,
      status:   clean.status || '',
      when:     new Date().toISOString(),
      by:       by || '',
      note:     'แก้ไขข้อมูลโดย Admin',
    });
    return { ok:true };
  },

  updateRepairStatus: ({ id, status, by, note, cost, patch }) => {
    const extra = Object.assign({}, patch || {});
    // allow-list fields that may be patched together with a status update
    const ALLOW = ['title','desc','siteId','machineCode','project','categoryId','reporterName','assignedId'];
    const clean = {};
    ALLOW.forEach(k => { if (extra[k] !== undefined) clean[k] = extra[k]; });
    clean.updatedAt = new Date().toISOString();
    if (status !== undefined) clean.status = status;
    if (cost !== undefined)   clean.cost = cost;
    updateRow_(TABS.REPAIRS, id, clean);
    appendRow_(TABS.TIMELINE, {
      id:       nextId_(TABS.TIMELINE, 'T', 5),
      repairId: id,
      status:   status || clean.status || '',
      when:     new Date().toISOString(),
      by:       by || '',
      note:     note || '',
    });
    return { ok:true };
  },

  // Admin only — delete a repair and its timeline rows
  deleteRepair: ({ id }) => {
    // remove all timeline rows for this repair
    const sh = sheet_(TABS.TIMELINE);
    const values = sh.getDataRange().getValues();
    const headers = values[0];
    const ridIdx = headers.indexOf('repairId');
    if (ridIdx > -1) {
      for (let r = values.length - 1; r >= 1; r--) {
        if (String(values[r][ridIdx]) === String(id)) sh.deleteRow(r + 1);
      }
    }
    return { deleted: deleteRow_(TABS.REPAIRS, id) };
  },

  uploadAfterPhotos: ({ repairId, running, uploads }) => {
    const folder = getOrCreateRepairFolder_(running);
    const urls = [];
    (uploads || []).forEach(u => {
      const blob = Utilities.newBlob(Utilities.base64Decode(u.data), u.mimeType, 'after-' + u.name);
      const file = folder.createFile(blob);
      safeShareFile_(file);
      urls.push(file.getUrl());
    });
    const rows = readAll_(TABS.REPAIRS).find(r => r.id === repairId);
    const prev = rows && Array.isArray(rows.afterPhotos) ? rows.afterPhotos : [];
    updateRow_(TABS.REPAIRS, repairId, { afterPhotos: prev.concat(urls) });
    return { urls };
  },

  uploadPJ2Document: ({ machineId, machineCode, slot, upload }) => {
    if (!upload || !upload.data) throw new Error('Missing upload data');
    const isPL = String(slot || '').toUpperCase() === 'PL';
    const cleanSlot = isPL ? 'PL' : (String(slot || '').replace(/[^12]/g, '') || '1');
    const folder = isPL
      ? getOrCreatePLFolder_(machineCode || machineId || 'PL')
      : getOrCreatePJ2Folder_(machineCode || machineId || 'PJ2');
    const safeName = String(upload.name || ('document-' + cleanSlot))
      .replace(/[\\/:*?"<>|#%{}]/g, '-');
    const fileName = (isPL ? 'PL-doc-' : ('PJ2-doc' + cleanSlot + '-')) + safeName;
    const blob = Utilities.newBlob(
      Utilities.base64Decode(upload.data),
      upload.mimeType || 'application/octet-stream',
      fileName
    );
    const file = folder.createFile(blob);
    const sharing = safeShareFile_(file);
    return {
      url: file.getUrl(),
      id: file.getId(),
      name: file.getName(),
      sharing,
      machineId,
      machineCode,
      slot: cleanSlot,
    };
  },
};

// ========== DRIVE HELPERS ==========
function getOrCreateRepairFolder_(running) {
  const root = DriveApp.getFolderById(FOLDER_ID);
  const it = root.getFoldersByName(running);
  return it.hasNext() ? it.next() : root.createFolder(running);
}
function getOrCreateMachineFolder_(code) {
  const root = DriveApp.getFolderById(FOLDER_ID);
  const name = 'Machine-' + code;
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function getOrCreatePJ2Folder_(code) {
  const parent = getPJ2RootFolder_();
  const name = 'Machine-' + code;
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
/**
 * หา "โฟลเดอร์แม่" สำหรับเก็บเอกสาร ปจ2
 * ลำดับ fallback (กันปัญหา "Access denied: DriveApp"):
 *  1) ใช้ PJ2_FOLDER_ID ถ้าบัญชีที่รัน Apps Script เข้าถึงได้
 *  2) ถ้าเข้าไม่ได้ → ใช้ FOLDER_ID (โฟลเดอร์เดียวกับที่อัปโหลดรูปซ่อม) โดยสร้างซับโฟลเดอร์ "PJ2"
 *  3) ถ้ายังไม่ได้ → สร้างโฟลเดอร์ "PJ2 Documents (ปจ2)" ไว้ใน Drive ของบัญชีที่รันเอง
 * ทำให้ไฟล์ถูกบันทึกลง Drive ของบัญชีเจ้าของเสมอ ไม่พังเพราะสิทธิ์โฟลเดอร์
 */
function getPJ2RootFolder_() {
  if (PJ2_FOLDER_ID) {
    try { return DriveApp.getFolderById(PJ2_FOLDER_ID); }
    catch (err) { /* เข้าไม่ได้ → ลอง fallback ถัดไป */ }
  }
  if (FOLDER_ID) {
    try {
      const base = DriveApp.getFolderById(FOLDER_ID);
      const it = base.getFoldersByName('PJ2');
      return it.hasNext() ? it.next() : base.createFolder('PJ2');
    } catch (err) { /* เข้าไม่ได้ → ลอง fallback ถัดไป */ }
  }
  const name = 'PJ2 Documents (ปจ2)';
  const it = DriveApp.getRootFolder().getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
/**
 * โฟลเดอร์เก็บเอกสารประกัน (PL) — แยกซับโฟลเดอร์ตามรหัสเครื่องจักร
 * ใช้ fallback แบบเดียวกับ ปจ2 กันปัญหาสิทธิ์เข้าถึง
 */
function getOrCreatePLFolder_(code) {
  const parent = getPLRootFolder_();
  const name = 'Machine-' + code;
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function getPLRootFolder_() {
  if (PL_FOLDER_ID) {
    try { return DriveApp.getFolderById(PL_FOLDER_ID); }
    catch (err) { /* เข้าไม่ได้ → ลอง fallback ถัดไป */ }
  }
  if (FOLDER_ID) {
    try {
      const base = DriveApp.getFolderById(FOLDER_ID);
      const it = base.getFoldersByName('PL');
      return it.hasNext() ? it.next() : base.createFolder('PL');
    } catch (err) { /* เข้าไม่ได้ → ลอง fallback ถัดไป */ }
  }
  const name = 'PL Documents (ประกัน)';
  const it = DriveApp.getRootFolder().getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function safeShareFile_(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ok:true, access:'ANYONE_WITH_LINK' };
  } catch (err) {
    return {
      ok:false,
      access:'PRIVATE',
      error:String(err && err.message || err),
    };
  }
}

// ========== SETUP / SEED (run manually once) ==========
function setupSheets() {
  Object.keys(HEADERS).forEach(n => sheet_(n));
  // auto-migrate: ถ้าชีตเดิมมี header ไม่ครบให้เพิ่มคอลัมน์ใหม่ให้อัตโนมัติ
  Object.keys(HEADERS).forEach(n => migrateHeaders_(n));

  // seed Categories
  if (readAll_(TABS.CATEGORIES).length === 0) {
    [
      { id:'C01', name:'ไฟฟ้า',                 color:'#F59E0B', icon:'fa-bolt' },
      { id:'C02', name:'เครื่องจักรกล',         color:'#3B82F6', icon:'fa-gears' },
      { id:'C03', name:'ระบบลม/ไฮดรอลิก',       color:'#0EA5E9', icon:'fa-wind' },
      { id:'C04', name:'ระบบน้ำ',                color:'#06B6D4', icon:'fa-droplet' },
      { id:'C05', name:'คอมพิวเตอร์/IT',         color:'#8B5CF6', icon:'fa-desktop' },
      { id:'C06', name:'อาคาร/สาธารณูปโภค',     color:'#10B981', icon:'fa-building' },
      { id:'C07', name:'ยานพาหนะ',               color:'#EF4444', icon:'fa-truck' },
      { id:'C08', name:'อื่นๆ',                   color:'#64748B', icon:'fa-wrench' },
    ].forEach(c => appendRow_(TABS.CATEGORIES, c));
  }

  // seed Users (passwords plain for demo — ใน production ควรใช้ hash)
  if (readAll_(TABS.USERS).length === 0) {
    [
      { id:'U001', username:'admin',    password:'admin',    name:'ผู้ดูแลระบบ',            role:'Admin',      dept:'ฝ่ายไอที',       email:'admin@company.co.th',     projects:[] },
      { id:'U002', username:'officer',  password:'officer',  name:'คุณวิชัย ทองดี',         role:'Officer',    dept:'ฝ่ายซ่อมบำรุง',  email:'wichai@company.co.th',    projects:[] },
      { id:'U003', username:'tech',     password:'tech',     name:'คุณธนกร เจริญสุข',       role:'Technician', dept:'ฝ่ายซ่อมบำรุง',  email:'thanakorn@company.co.th', projects:[] },
      { id:'U004', username:'user',     password:'user',     name:'คุณสมหญิง สุขใจ',        role:'Reporter',   dept:'ฝ่ายผลิต',       email:'somying@company.co.th',   projects:['โรงงาน A - สายการผลิต 1'] },
      { id:'U005', username:'director', password:'director', name:'คุณอรุณ รุ่งเรือง',      role:'Director',   dept:'ผู้บริหาร',       email:'arun@company.co.th',      projects:[] },
    ].forEach(u => { u.createdAt = new Date().toISOString(); appendRow_(TABS.USERS, u); });
  }

  // seed Machines — fields ตรงกับ HEADERS.Machines
  // ['id','project','code','name','brand','model','size','serial','ownership','categoryId','note','status','location','lastService','hours','icon','photo','driveId']
  if (readAll_(TABS.MACHINES).length === 0) {
    [
      { id:'M001', project:'โรงงาน A - สายการผลิต 1',    code:'PRD-LINE-01', name:'สายการผลิต A1',               brand:'Siemens',  model:'S-1200',  size:'12 เมตร', serial:'SN-PRD-001', ownership:'กรรมสิทธิ์', categoryId:'C02', note:'',                          status:'ใช้งาน', location:'โรงงาน A - สายการผลิต 1',         lastService:'2026-03-12', hours:2840,  icon:'fa-industry',      photo:'', driveId:'' },
      { id:'M002', project:'โรงงาน A - สายการผลิต 1',    code:'CNC-001',     name:'เครื่องกลึง CNC #1',          brand:'Mazak',    model:'QT-200',  size:'2 ตัน',   serial:'SN-CNC-001', ownership:'กรรมสิทธิ์', categoryId:'C02', note:'รอเปลี่ยนหัวกัด',            status:'ซ่อม',   location:'โรงงาน A - สายการผลิต 1',         lastService:'2026-04-10', hours:5210,  icon:'fa-gears',         photo:'', driveId:'' },
      { id:'M003', project:'โรงงาน B - คลังสินค้า',       code:'CMP-AIR-01',  name:'คอมเพรสเซอร์ลม #1',           brand:'Atlas Copco', model:'GA-75', size:'75 kW', serial:'SN-CMP-001', ownership:'กรรมสิทธิ์', categoryId:'C03', note:'',                          status:'ใช้งาน', location:'โรงงาน B - คลังสินค้า',            lastService:'2026-01-15', hours:8900,  icon:'fa-wind',          photo:'', driveId:'' },
      { id:'M004', project:'โรงงาน B - คลังสินค้า',       code:'FRK-EL-01',   name:'รถยกไฟฟ้า #1',                 brand:'Toyota',   model:'8FBE20',  size:'2 ตัน',   serial:'SN-FRK-001', ownership:'เช่า',       categoryId:'C07', note:'สัญญาเช่าหมด 31/12/2026',    status:'ใช้งาน', location:'โรงงาน B - คลังสินค้า',            lastService:'2026-02-10', hours:1420,  icon:'fa-truck',         photo:'', driveId:'' },
      { id:'M005', project:'สำนักงานใหญ่',                code:'HVAC-AHU-01', name:'เครื่องปรับอากาศ AHU-1',      brand:'Daikin',   model:'FHA100',  size:'100 kBTU', serial:'SN-HVAC-001', ownership:'กรรมสิทธิ์', categoryId:'C06', note:'',                          status:'ใช้งาน', location:'สำนักงานใหญ่ - ชั้น 3',            lastService:'2026-03-05', hours:12400, icon:'fa-snowflake',     photo:'', driveId:'' },
      { id:'M006', project:'โรงงาน A - สายการผลิต 1',    code:'PMP-WTR-01',  name:'ปั๊มน้ำ #1',                   brand:'Grundfos', model:'CR10-4',  size:'5.5 kW',  serial:'SN-PMP-001', ownership:'กรรมสิทธิ์', categoryId:'C04', note:'ต้องเปลี่ยนแบริ่ง',          status:'ซ่อม',   location:'โรงงาน A - สายการผลิต 1',         lastService:'2026-04-14', hours:7820,  icon:'fa-droplet',       photo:'', driveId:'' },
      { id:'M007', project:'โรงงาน B - ห้องบรรจุ',        code:'PCK-AUTO-01', name:'เครื่องบรรจุอัตโนมัติ',        brand:'Bosch',    model:'PCK-500', size:'500 ชิ้น/นาที', serial:'SN-PCK-001', ownership:'กรรมสิทธิ์', categoryId:'C02', note:'',                          status:'ใช้งาน', location:'โรงงาน B - ห้องบรรจุ',             lastService:'2026-03-30', hours:6240,  icon:'fa-boxes-packing', photo:'', driveId:'' },
      { id:'M008', project:'สำนักงานใหญ่',                code:'GEN-SET-01',  name:'เครื่องกำเนิดไฟฟ้าสำรอง',     brand:'Cummins',  model:'C500D5', size:'500 kVA', serial:'SN-GEN-001', ownership:'กรรมสิทธิ์', categoryId:'C01', note:'ทดสอบเดินเครื่องทุกเดือน',  status:'ใช้งาน', location:'สำนักงานใหญ่ - ห้องเซิร์ฟเวอร์',   lastService:'2026-02-20', hours:320,   icon:'fa-bolt',          photo:'', driveId:'' },
    ].forEach(m => appendRow_(TABS.MACHINES, m));
  }

  Logger.log('✅ Setup complete. Tabs: ' + Object.values(TABS).join(', '));
  return { ok:true, tabs: Object.values(TABS) };
}
