/* สร้างอัตโนมัติโดย build.js — ห้ามแก้ไฟล์นี้ตรงๆ
   แก้ที่ ระบบแจ้งซ่อมเครื่องจักร.html แล้ว commit (hook จะ build ให้เอง) */

/* ---- block 1 (ต้นฉบับบรรทัด 570) ---- */
const firebaseConfig = {
  apiKey: "AIzaSyBhcH8DyubFWzX93b7sD4GYuDK3TUTFI4Y",
  authDomain: "uesr-panamanee.firebaseapp.com",
  databaseURL: "https://uesr-panamanee-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "uesr-panamanee",
  storageBucket: "uesr-panamanee.firebasestorage.app",
  messagingSenderId: "845019270186",
  appId: "1:845019270186:web:a7c33f347831b422e64753",
  measurementId: "G-NKDMSMYGSX"
};
const assetFirebaseConfig = {
  apiKey: "AIzaSyA9mmyYLiK_bhMFH7CJafC81d8OfaY4myw",
  authDomain: "panamanee-3a15a.firebaseapp.com",
  databaseURL: "https://panamanee-3a15a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "panamanee-3a15a",
  storageBucket: "panamanee-3a15a.firebasestorage.app",
  messagingSenderId: "71431313537",
  appId: "1:71431313537:web:2ff3a2a959a1875375d580",
  measurementId: "G-S8K1KMT9JN"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const _db = firebase.database();
const _assetApp = firebase.apps.find(a => a.name === 'assets') || firebase.initializeApp(assetFirebaseConfig, 'assets');
const _assetDb = _assetApp.database();
const CONFIG_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOLdoS83MVCh5ThGUf7WbR3IrNU2dfKL2P-dcde4PjJ8o6-tsb7ZItHdo8TmVBn_w6/exec';
async function getAppsScriptUrl() {
  const current = window.APPS_SCRIPT_URL || localStorage.getItem('APPS_SCRIPT_URL') || CONFIG_APPS_SCRIPT_URL;
  if (current) return current;
  if (!window.Swal) return '';
  const r = await Swal.fire({
    icon: 'info',
    title: 'ตั้งค่า Google Apps Script URL',
    input: 'url',
    inputPlaceholder: 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec',
    text: 'วาง Web app URL ที่ Deploy จาก backend/Code.gs เพื่อให้อัปโหลดไฟล์ไป Google Drive ได้',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    inputValidator: v => {
      if (!v) return 'กรุณาวาง Web app URL';
      if (!String(v).includes('script.google.com') || !String(v).includes('/exec')) return 'URL ต้องเป็น Google Apps Script Web app ที่ลงท้าย /exec';
      return null;
    }
  });
  if (!r.isConfirmed) return '';
  localStorage.setItem('APPS_SCRIPT_URL', r.value);
  window.APPS_SCRIPT_URL = r.value;
  return r.value;
}
async function callAppsScript(action, payload = {}) {
  const APPS_SCRIPT_URL = await getAppsScriptUrl();
  if (!APPS_SCRIPT_URL) {
    throw new Error('ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL สำหรับอัปโหลดไฟล์ไป Google Drive');
  }
  const body = JSON.stringify({
    action,
    ...payload
  });
  let res;
  try {
    res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body
    });
  } catch (firstErr) {
    try {
      const form = new FormData();
      form.append('payload', body);
      res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: form
      });
    } catch (secondErr) {
      throw new Error('เชื่อมต่อ Apps Script ไม่สำเร็จ: ตรวจสอบว่า Web app URL ลงท้าย /exec, Deploy เป็น New version แล้ว, Execute as: Me และ Who has access: Anyone');
    }
  }
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Apps Script ตอบ 401 Unauthorized: Deployment ยังบังคับให้ login อยู่ กรุณาตั้ง Who has access: Anyone');
    }
    if (res.status === 403) {
      throw new Error('Apps Script ตอบ 403 Forbidden: กรุณา Deploy เป็น Web app โดยตั้ง Execute as: Me และ Who has access: Anyone');
    }
    throw new Error(`Apps Script HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Apps Script error');
  return json.data;
}
async function _nextId(collection, prefix, pad) {
  const snap = await _db.ref('/' + collection).get();
  const items = Object.values(snap.val() || {});
  let max = 0;
  items.forEach(item => {
    const m = String(item.id || '').match(/\d+/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  });
  return prefix + String(max + 1).padStart(pad, '0');
}
function _buildRunning(projectName, repairs, projects) {
  const proj = (projects || []).find(p => p && p.name === projectName);
  const code = String(proj && proj.code || projectName || 'GEN').trim().replace(/\s+/g, '-').toUpperCase();
  const d = new Date();
  const ym = String(d.getFullYear() + 543) + String(d.getMonth() + 1).padStart(2, '0');
  const prefix = 'RE-' + code + '-' + ym + '/';
  let max = 0;
  (repairs || []).forEach(r => {
    const s = String(r && r.running || '');
    if (s.slice(0, prefix.length) === prefix) {
      const n = parseInt(s.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + String(max + 1).padStart(3, '0');
}
async function _seedIfEmpty() {
  const snap = await _db.ref('/users').get();
  if (snap.val()) return;
  const now = new Date().toISOString();
  await _db.ref('/users/U001').set({
    id: 'U001',
    username: 'admin',
    password: 'komdevil99',
    name: 'ผู้ดูแลระบบ',
    role: 'Admin',
    dept: 'ฝ่ายไอที',
    email: 'admin@company.co.th',
    projects: [],
    createdAt: now
  });
  const cats = [{
    id: 'C01',
    name: 'ไฟฟ้า',
    color: '#F59E0B',
    icon: 'fa-bolt'
  }, {
    id: 'C02',
    name: 'เครื่องจักรกล',
    color: '#3B82F6',
    icon: 'fa-solid fa-tractor'
  }, {
    id: 'C03',
    name: 'ระบบลม/ไฮดรอลิก',
    color: '#0EA5E9',
    icon: 'fa-wind'
  }, {
    id: 'C04',
    name: 'ระบบน้ำ',
    color: '#06B6D4',
    icon: 'fa-droplet'
  }, {
    id: 'C05',
    name: 'คอมพิวเตอร์/IT',
    color: '#8B5CF6',
    icon: 'fa-desktop'
  }, {
    id: 'C06',
    name: 'อาคาร/สาธารณูปโภค',
    color: '#10B981',
    icon: 'fa-building'
  }, {
    id: 'C07',
    name: 'ยานพาหนะ',
    color: '#EF4444',
    icon: 'fa-truck'
  }, {
    id: 'C08',
    name: 'อื่นๆ',
    color: '#64748B',
    icon: 'fa-wrench'
  }];
  for (const c of cats) await _db.ref('/categories/' + c.id).set(c);
  const projects = [{
    id: 'PJ001',
    name: 'โรงงาน A - สายการผลิต 1',
    shortName: 'โรงงาน A1',
    code: 'PRJ-A1',
    desc: '',
    status: 'active',
    color: '#3B82F6',
    createdAt: now
  }, {
    id: 'PJ002',
    name: 'โรงงาน A - สายการผลิต 2',
    shortName: 'โรงงาน A2',
    code: 'PRJ-A2',
    desc: '',
    status: 'active',
    color: '#8B5CF6',
    createdAt: now
  }, {
    id: 'PJ003',
    name: 'โรงงาน B - ห้องบรรจุ',
    shortName: 'โรงงาน B1',
    code: 'PRJ-B1',
    desc: '',
    status: 'active',
    color: '#10B981',
    createdAt: now
  }, {
    id: 'PJ004',
    name: 'โรงงาน B - คลังสินค้า',
    shortName: 'โรงงาน B2',
    code: 'PRJ-B2',
    desc: '',
    status: 'active',
    color: '#F59E0B',
    createdAt: now
  }];
  for (const p of projects) await _db.ref('/projects/' + p.id).set(p);
}
window.setupDatabase = async function () {
  await _db.ref('/users').remove();
  await _db.ref('/categories').remove();
  await _db.ref('/projects').remove();
  await _seedIfEmpty();
  console.log('✅ Database seeded. Admin: admin / komdevil99');
};
const _DELETE_OPS = {
  deleteProject: {
    label: 'โครงการ',
    key: 'id',
    exec: async p => {
      await _db.ref('/projects/' + p.id).remove();
    }
  },
  deleteUser: {
    label: 'ผู้ใช้งาน',
    key: 'id',
    exec: async p => {
      await _db.ref('/users/' + p.id).remove();
    }
  },
  deleteCategory: {
    label: 'หมวดหมู่งาน',
    key: 'id',
    exec: async p => {
      await _db.ref('/categories/' + p.id).remove();
    }
  },
  deleteMachine: {
    label: 'เครื่องจักร',
    key: 'id',
    exec: async p => {
      await _db.ref('/machines/' + p.id).remove();
    }
  },
  deleteRepair: {
    label: 'ใบแจ้งซ่อม',
    key: 'id',
    exec: async p => {
      await _db.ref('/repairs/' + p.id).remove();
    }
  },
  deleteWithdrawal: {
    label: 'รายการเบิกของ',
    key: 'key',
    exec: async p => {
      await _db.ref('/withdrawals/' + p.key).remove();
    }
  },
  deleteAssetRegistry: {
    label: 'ทะเบียนทรัพย์สิน',
    key: 'key',
    exec: async p => {
      await _assetDb.ref('/assets/' + p.key).remove();
    }
  },
  deleteDeliveryOrder: {
    label: 'ใบส่งของ (DO)',
    key: 'key',
    exec: async p => {
      await _assetDb.ref('/deliveryOrders/' + p.key).remove();
    }
  },
  deleteTransferEntry: {
    label: 'ประวัติการย้ายเครื่องจักร',
    key: 'machineId',
    exec: async p => {
      const ref = _db.ref('/machines/' + p.machineId + '/transferHistory');
      const raw = (await ref.get()).val();
      const arr = Array.isArray(raw) ? raw.slice() : Object.values(raw || {});
      let idx = -1;
      if (typeof p.index === 'number' && arr[p.index] && String(arr[p.index].when || '') === String(p.when || '')) idx = p.index;
      if (idx < 0) idx = arr.findIndex(t => t && String(t.when || '') === String(p.when || '') && String(t.to || '') === String(p.to || ''));
      if (idx < 0) throw new Error('ไม่พบรายการประวัติการย้ายนี้ (อาจถูกลบไปแล้ว)');
      arr.splice(idx, 1);
      await ref.set(arr);
      return {
        transferHistory: arr
      };
    }
  }
};
const _CHANGE_OPS = {
  updateRepair: {
    label: 'ใบแจ้งซ่อม',
    key: 'id'
  },
  updateMachine: {
    label: 'เครื่องจักร',
    key: 'id'
  },
  saveAssetRegistry: {
    label: 'ทะเบียนทรัพย์สิน',
    key: 'key'
  }
};
function _delTargetKey(action, payload = {}) {
  const op = _DELETE_OPS[action];
  const base = String(op && payload[op.key] || payload.id || payload.key || '');
  return action === 'deleteTransferEntry' ? base + '|' + String(payload.when || '') : base;
}
const LOGIN_LOG_KEEP = 100;
async function _pruneLoginLogs() {
  try {
    const snap = await _db.ref('/loginLogs').get();
    const all = Object.entries(snap.val() || {});
    if (all.length <= LOGIN_LOG_KEEP) return 0;
    const ts = e => {
      const t = Date.parse(e[1] && e[1].when || '');
      return isNaN(t) ? 0 : t;
    };
    all.sort((a, b) => ts(b) - ts(a));
    const updates = {};
    all.slice(LOGIN_LOG_KEEP).forEach(([key]) => {
      updates[key] = null;
    });
    await _db.ref('/loginLogs').update(updates);
    return Object.keys(updates).length;
  } catch (e) {
    console.warn('[loginLogs] ลบประวัติเก่าไม่สำเร็จ:', e && e.message);
    return 0;
  }
}
async function _logDelete(entry) {
  try {
    const ref = _db.ref('/deleteLogs').push();
    await ref.set({
      id: ref.key,
      when: new Date().toISOString(),
      ...entry
    });
  } catch (e) {}
}
async function api(action, payload = {}) {
  switch (action) {
    case 'deleteProject':
    case 'deleteUser':
    case 'deleteCategory':
    case 'deleteMachine':
    case 'deleteRepair':
    case 'deleteWithdrawal':
    case 'deleteAssetRegistry':
    case 'deleteDeliveryOrder':
    case 'deleteTransferEntry':
      {
        const by = payload.by || {};
        const role = String(payload.role || by.role || '');
        if (role !== 'Admin') {
          throw new Error('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ลบข้อมูลได้ · กรุณาส่งคำขออนุมัติลบ');
        }
        const result = await _DELETE_OPS[action].exec(payload);
        const targetKey = _delTargetKey(action, payload);
        await _logDelete({
          action,
          via: 'admin',
          entityLabel: _DELETE_OPS[action].label,
          targetKey,
          targetName: payload.targetName || '',
          byId: by.id || '',
          byName: by.name || '',
          byRole: role
        });
        try {
          const all = (await _db.ref('/deleteRequests').get()).val() || {};
          const closes = Object.values(all).filter(x => x && x.status === 'pending' && x.action === action && String(x.targetKey) === targetKey);
          for (const c of closes) {
            await _db.ref('/deleteRequests/' + c.id).update({
              status: 'approved',
              decidedAt: new Date().toISOString(),
              decidedById: by.id || '',
              decidedByName: by.name || '',
              decideNote: 'ผู้ดูแลระบบลบข้อมูลนี้เองแล้ว',
              lastError: null
            });
          }
        } catch (e) {}
        return {
          deleted: true,
          ...(result || {})
        };
      }
    case 'requestDelete':
      {
        const req = payload.req || {};
        const op = _DELETE_OPS[req.action];
        if (!op) throw new Error('ไม่รองรับการขอลบข้อมูลประเภทนี้');
        if (!String(req.reason || '').trim()) throw new Error('กรุณาระบุเหตุผลที่ต้องการลบ');
        const targetKey = _delTargetKey(req.action, req.payload || {});
        const all = Object.values((await _db.ref('/deleteRequests').get()).val() || {});
        if (all.some(x => x && x.status === 'pending' && x.action === req.action && String(x.targetKey) === targetKey)) {
          throw new Error('รายการนี้มีคำขอลบรออนุมัติอยู่แล้ว');
        }
        const ref = _db.ref('/deleteRequests').push();
        const rec = {
          id: ref.key,
          kind: 'delete',
          action: req.action,
          entityLabel: req.entityLabel || op.label,
          targetKey,
          targetName: String(req.targetName || ''),
          targetInfo: String(req.targetInfo || ''),
          project: String(req.project || ''),
          payload: JSON.parse(JSON.stringify(req.payload || {})),
          reason: String(req.reason).trim(),
          requesterId: String(req.requesterId || ''),
          requesterName: String(req.requesterName || ''),
          requesterRole: String(req.requesterRole || ''),
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };
        await ref.set(rec);
        return rec;
      }
    case 'requestChange':
      {
        const req = payload.req || {};
        if (!_CHANGE_OPS[req.action]) throw new Error('ไม่รองรับการขอแก้ไขข้อมูลประเภทนี้');
        if (!String(req.reason || '').trim()) throw new Error('กรุณาระบุเหตุผลที่ต้องการแก้ไข');
        const idKey = _CHANGE_OPS[req.action].key || 'id';
        const targetKey = String(req.payload && req.payload[idKey] || '');
        if (!targetKey) throw new Error('ไม่พบรายการที่ต้องการแก้ไข');
        const all = Object.values((await _db.ref('/deleteRequests').get()).val() || {});
        if (all.some(x => x && x.status === 'pending' && x.kind === 'edit' && x.action === req.action && String(x.targetKey) === targetKey)) {
          throw new Error('รายการนี้มีคำขอแก้ไขรออนุมัติอยู่แล้ว กรุณารอผลอนุมัติก่อน');
        }
        const ref = _db.ref('/deleteRequests').push();
        const rec = {
          id: ref.key,
          kind: 'edit',
          action: req.action,
          entityLabel: req.entityLabel || _CHANGE_OPS[req.action].label,
          targetKey,
          targetName: String(req.targetName || ''),
          targetInfo: String(req.targetInfo || ''),
          project: String(req.project || ''),
          payload: JSON.parse(JSON.stringify(req.payload || {})),
          changes: JSON.parse(JSON.stringify(req.changes || [])),
          reason: String(req.reason).trim(),
          requesterId: String(req.requesterId || ''),
          requesterName: String(req.requesterName || ''),
          requesterRole: String(req.requesterRole || ''),
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };
        await ref.set(rec);
        return rec;
      }
    case 'listDeleteRequests':
      {
        const all = Object.values((await _db.ref('/deleteRequests').get()).val() || {});
        return all.sort((a, b) => String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')));
      }
    case 'approveDelete':
      {
        const {
          id,
          note
        } = payload;
        const by = payload.by || {};
        if (String(by.role || '') !== 'Admin') throw new Error('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่อนุมัติได้');
        const ref = _db.ref('/deleteRequests/' + id);
        const rec = (await ref.get()).val();
        if (!rec) throw new Error('ไม่พบคำขอนี้');
        if (rec.status !== 'pending') throw new Error('คำขอนี้ถูกดำเนินการไปแล้ว');
        const isEdit = rec.kind === 'edit';
        const op = isEdit ? _CHANGE_OPS[rec.action] : _DELETE_OPS[rec.action];
        if (!op) throw new Error(isEdit ? 'ไม่รองรับการแก้ไขข้อมูลประเภทนี้' : 'ไม่รองรับการลบข้อมูลประเภทนี้');
        let result = null;
        try {
          result = isEdit ? await api(rec.action, {
            ...(rec.payload || {}),
            by: by.name || 'ผู้ดูแลระบบ',
            note: 'อนุมัติคำขอแก้ไขของ ' + (rec.requesterName || 'ผู้แจ้ง')
          }) : await op.exec(rec.payload || {});
        } catch (e) {
          await ref.update({
            lastError: String(e && e.message || e)
          });
          throw e;
        }
        const patch = {
          status: 'approved',
          decidedAt: new Date().toISOString(),
          decidedById: by.id || '',
          decidedByName: by.name || '',
          decideNote: String(note || ''),
          lastError: null
        };
        await ref.update(patch);
        if (!isEdit) await _logDelete({
          action: rec.action,
          via: 'approved',
          requestId: rec.id,
          entityLabel: rec.entityLabel,
          targetKey: rec.targetKey,
          targetName: rec.targetName,
          byId: by.id || '',
          byName: by.name || '',
          byRole: 'Admin',
          requesterId: rec.requesterId,
          requesterName: rec.requesterName,
          reason: rec.reason
        });
        return {
          ...rec,
          ...patch,
          result
        };
      }
    case 'rejectDelete':
      {
        const {
          id,
          note
        } = payload;
        const by = payload.by || {};
        if (String(by.role || '') !== 'Admin') throw new Error('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ปฏิเสธคำขอได้');
        const ref = _db.ref('/deleteRequests/' + id);
        const rec = (await ref.get()).val();
        if (!rec) throw new Error('ไม่พบคำขอนี้');
        if (rec.status !== 'pending') throw new Error('คำขอนี้ถูกดำเนินการไปแล้ว');
        const patch = {
          status: 'rejected',
          decidedAt: new Date().toISOString(),
          decidedById: by.id || '',
          decidedByName: by.name || '',
          decideNote: String(note || ''),
          lastError: null
        };
        await ref.update(patch);
        return {
          ...rec,
          ...patch
        };
      }
    case 'login':
      {
        const {
          username,
          password
        } = payload;
        const snap = await _db.ref('/users').get();
        const user = Object.values(snap.val() || {}).find(u => String(u.username) === String(username) && String(u.password) === String(password));
        if (!user) throw new Error('Username หรือ Password ไม่ถูกต้อง');
        const logRef = _db.ref('/loginLogs').push();
        await logRef.set({
          id: logRef.key,
          userId: user.id || "",
          username: user.username || "",
          name: user.name || "",
          role: user.role || "",
          dept: user.dept || "",
          when: new Date().toISOString()
        });
        _pruneLoginLogs();
        const safe = {
          ...user
        };
        delete safe.password;
        return safe;
      }
    case 'verifyPassword':
      {
        const {
          userId,
          password
        } = payload;
        const snap = await _db.ref('/users/' + userId).get();
        const user = snap.val();
        if (!user) throw new Error('ไม่พบบัญชีผู้ใช้นี้');
        if (String(user.password) !== String(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');
        return {
          ok: true
        };
      }
    case 'bootstrap':
      {
        let [usersSnap, catSnap, machSnap, repSnap, projSnap, wdSnap] = await Promise.all([_db.ref('/users').get(), _db.ref('/categories').get(), _db.ref('/machines').get(), _db.ref('/repairs').get(), _db.ref('/projects').get(), _db.ref('/withdrawals').get()]);
        if (!usersSnap.val()) {
          await _seedIfEmpty();
          [usersSnap, catSnap, projSnap] = await Promise.all([_db.ref('/users').get(), _db.ref('/categories').get(), _db.ref('/projects').get()]);
        }
        const users = Object.values(usersSnap.val() || {}).map(u => {
          const x = {
            ...u
          };
          delete x.password;
          return x;
        });
        const categories = Object.values(catSnap.val() || {});
        const machines = Object.values(machSnap.val() || {});
        const repairs = Object.values(repSnap.val() || {}).map(r => ({
          ...r,
          timeline: r.timeline ? Object.values(r.timeline) : []
        }));
        const projects = Object.values(projSnap.val() || {});
        const withdrawals = Object.entries(wdSnap.val() || {}).map(([key, value]) => ({
          ...value,
          key
        }));
        return {
          users,
          categories,
          machines,
          repairs,
          projects,
          withdrawals
        };
      }
    case 'upsertWithdrawal':
      {
        const {
          key,
          doc
        } = payload;
        const cleanKey = String(key || doc.docNo || doc.id || Date.now()).replace(/[.#$/\[\]]/g, '-').replace(/\s+/g, '-');
        await _db.ref('/withdrawals/' + cleanKey).update({
          ...doc,
          updatedAt: new Date().toISOString()
        });
        return {
          ...doc,
          key: cleanKey
        };
      }
    case 'createProject':
      {
        const {
          project
        } = payload;
        if (!project.id) project.id = await _nextId('projects', 'PJ', 3);
        project.createdAt = new Date().toISOString();
        await _db.ref('/projects/' + project.id).set(project);
        return project;
      }
    case 'updateProject':
      {
        const {
          id,
          patch
        } = payload;
        await _db.ref('/projects/' + id).update(patch);
        return {
          updated: true
        };
      }
    case 'createUser':
      {
        const {
          user
        } = payload;
        if (!user.id) user.id = await _nextId('users', 'U', 3);
        user.createdAt = new Date().toISOString();
        await _db.ref('/users/' + user.id).set(user);
        const safe = {
          ...user
        };
        delete safe.password;
        return safe;
      }
    case 'updateUser':
      {
        const {
          id,
          patch
        } = payload;
        const update = {
          ...patch
        };
        if (!update.password) delete update.password;
        await _db.ref('/users/' + id).update(update);
        return {
          updated: true
        };
      }
    case 'getUserPassword':
      {
        const {
          id
        } = payload;
        const snap = await _db.ref('/users/' + id + '/password').get();
        return {
          password: snap.val() || ""
        };
      }
    case 'createCategory':
      {
        const {
          cat
        } = payload;
        if (!cat.id) cat.id = await _nextId('categories', 'C', 2);
        await _db.ref('/categories/' + cat.id).set(cat);
        return cat;
      }
    case 'updateCategory':
      {
        const {
          id,
          patch
        } = payload;
        await _db.ref('/categories/' + id).update(patch);
        return {
          updated: true
        };
      }
    case 'createMachine':
      {
        const {
          m
        } = payload;
        if (!m.id) m.id = await _nextId('machines', 'M', 3);
        await _db.ref('/machines/' + m.id).set(m);
        return m;
      }
    case 'updateMachine':
      {
        const {
          id,
          patch
        } = payload;
        await _db.ref('/machines/' + id).update(patch);
        return {
          updated: true
        };
      }
    case 'uploadPJ2Document':
      {
        return callAppsScript('uploadPJ2Document', payload);
      }
    case 'uploadRepairPhoto':
      {
        return callAppsScript('uploadRepairPhoto', payload);
      }
    case 'uploadPartPhoto':
      {
        return callAppsScript('uploadPartPhoto', payload);
      }
    case 'createRepair':
      {
        const {
          repair
        } = payload;
        if (!repair.id) repair.id = await _nextId('repairs', 'R', 4);
        if (!repair.running) {
          const [repSnap, projSnap] = await Promise.all([_db.ref('/repairs').get(), _db.ref('/projects').get()]);
          repair.running = _buildRunning(repair.project, Object.values(repSnap.val() || {}), Object.values(projSnap.val() || {}));
        }
        repair.createdAt = repair.createdAt || new Date().toISOString();
        repair.updatedAt = new Date().toISOString();
        repair.status = repair.status || 'new';
        repair.photos = Array.isArray(repair.photos) ? repair.photos.filter(Boolean).slice(0, 5) : [];
        const tlKey = _db.ref('/repairs/' + repair.id + '/timeline').push().key;
        repair.timeline = {
          [tlKey]: {
            id: tlKey,
            status: 'new',
            when: new Date().toISOString(),
            by: repair.reporterName || '',
            note: 'แจ้งเข้าระบบ'
          }
        };
        await _db.ref('/repairs/' + repair.id).set(repair);
        return {
          ...repair,
          timeline: Object.values(repair.timeline)
        };
      }
    case 'loadAssetRegistry':
      {
        const snap = await _assetDb.ref('/assets').get();
        return Object.entries(snap.val() || {}).map(([key, v]) => ({
          key,
          ...(v || {})
        }));
      }
    case 'saveAssetRegistry':
      {
        const {
          key,
          asset
        } = payload;
        const clean = {
          ...(asset || {})
        };
        delete clean.key;
        const ref = key ? _assetDb.ref('/assets/' + key) : _assetDb.ref('/assets').push();
        const id = key || ref.key;
        clean.id = clean.id || clean.assetCode || id;
        clean.quantity = Number(clean.quantity) || 0;
        clean.updatedAt = new Date().toISOString();
        await ref.set(clean);
        return {
          key: id,
          ...clean
        };
      }
    case 'transferAssets':
      {
        const {
          moves,
          toProject,
          toSubSite,
          note,
          by,
          doc
        } = payload;
        const dstSubSite = toSubSite || '';
        const when = new Date().toISOString();
        const snap = await _assetDb.ref('/assets').get();
        const all = snap.val() || {};
        const updates = {};
        const items = [];
        (moves || []).forEach(mv => {
          const k = mv && mv.key;
          const a = k && all[k];
          if (!a) return;
          const total = Number(a.quantity) || 0;
          const qty = Math.min(Math.max(Number(mv.qty) || 0, 0), total || Number(mv.qty) || 0);
          if (qty <= 0) return;
          const from = a.site || '';
          const fromSub = a.subSite || '';
          const partial = total > 0 && qty < total;
          const entry = {
            from,
            to: toProject,
            fromSubSite: fromSub,
            toSubSite: dstSubSite,
            when,
            by: by || '',
            note: note || '',
            docNo: doc && doc.docNo || '',
            qty,
            partial
          };
          const hist = Array.isArray(a.transferHistory) ? a.transferHistory.slice() : [];
          if (!partial) {
            updates['/assets/' + k + '/site'] = toProject;
            updates['/assets/' + k + '/subSite'] = dstSubSite;
            updates['/assets/' + k + '/transferHistory'] = hist.concat([entry]);
            updates['/assets/' + k + '/updatedAt'] = when;
          } else {
            updates['/assets/' + k + '/quantity'] = total - qty;
            updates['/assets/' + k + '/transferHistory'] = hist.concat([{
              ...entry,
              splitOut: qty
            }]);
            updates['/assets/' + k + '/updatedAt'] = when;
            const newKey = _assetDb.ref('/assets').push().key;
            updates['/assets/' + newKey] = {
              ...a,
              quantity: qty,
              site: toProject,
              subSite: dstSubSite,
              updatedAt: when,
              splitFrom: k,
              transferHistory: hist.concat([entry])
            };
          }
          items.push({
            key: k,
            assetCode: a.assetCode || a.id || '',
            name: a.name || '',
            brand: a.brand || '',
            model: a.model || '',
            serial: a.serial || '',
            quantity: qty,
            totalBefore: total,
            partial,
            unit: a.unit || '',
            from,
            fromSubSite: fromSub
          });
        });
        if (!items.length) throw new Error('ไม่พบทรัพย์สินที่เลือก หรือจำนวนที่ย้ายเป็น 0');
        const docKey = String(doc && doc.docNo || 'DO-' + when).replace(/[.#$/\[\]]/g, '-');
        const record = {
          ...(doc || {}),
          key: docKey,
          toProject,
          toSubSite: dstSubSite,
          note: note || '',
          by: by || '',
          when,
          items
        };
        updates['/deliveryOrders/' + docKey] = record;
        await _assetDb.ref().update(updates);
        return {
          doc: record,
          when,
          items
        };
      }
    case 'loadDeliveryOrders':
      {
        const snap = await _assetDb.ref('/deliveryOrders').get();
        return Object.entries(snap.val() || {}).map(([key, v]) => ({
          key,
          ...(v || {})
        }));
      }
    case 'cancelDeliveryOrder':
      {
        const {
          key,
          by,
          reason,
          restoreStock
        } = payload;
        if (!key) throw new Error('ไม่พบรหัสใบส่งของ');
        const when = new Date().toISOString();
        const [doSnap, aSnap] = await Promise.all([_assetDb.ref('/deliveryOrders/' + key).get(), _assetDb.ref('/assets').get()]);
        const old = doSnap.val();
        if (!old) throw new Error('ไม่พบใบส่งของนี้ (อาจถูกลบไปแล้ว)');
        if (old.cancelled) throw new Error('ใบส่งของนี้ถูกยกเลิกไปแล้ว');
        const updates = {};
        const warnings = [];
        let restoredSummary = [];
        if (restoreStock) {
          const assets = aSnap.val() || {};
          const toArr = v => Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : [];
          const items = toArr(old.items);
          const destSite = old.toProject || '';
          const docNo = old.docNo || '';
          const curQty = {};
          const getQty = k => curQty[k] !== undefined ? curQty[k] : Number((assets[k] || {}).quantity) || 0;
          const histAdd = {};
          const pushHist = (k, e) => {
            (histAdd[k] = histAdd[k] || []).push(e);
          };
          const newAssets = {};
          const siteBack = {};
          const subSiteBack = {};
          const dropKeys = {};
          const findAsset = (code, site) => Object.keys(assets).find(k => {
            const a = assets[k] || {};
            return String(a.assetCode || a.id || '') === String(code) && String(a.site || '') === String(site);
          });
          const restored = [];
          items.forEach((it, i) => {
            const need = Number(it.quantity) || 0;
            if (need <= 0) return;
            const code = it.assetCode || '';
            const srcSite = it.from || '';
            const srcKey = it.key || '';
            const label = it.name || code || 'รายการที่ ' + (i + 1);
            if (srcSite && srcSite === destSite) {
              warnings.push(label + ': ต้นทางกับปลายทางเป็นโครงการเดียวกัน จึงไม่ต้องคืน');
              return;
            }
            if (!srcSite) {
              warnings.push(label + ': ไม่ทราบโครงการต้นทาง จึงคืนของให้อัตโนมัติไม่ได้');
              return;
            }
            const hist = {
              from: destSite,
              to: srcSite,
              when,
              by: by || '',
              note: 'คืนจากการยกเลิกใบส่งของ',
              docNo,
              qty: need,
              adjust: true,
              cancel: true
            };
            if (!it.partial) {
              const k = srcKey && assets[srcKey] ? srcKey : code ? findAsset(code, destSite) : null;
              if (!k) {
                warnings.push(`${label}: ไม่พบแถวทรัพย์สินเดิมในทะเบียน จึงคืนให้อัตโนมัติไม่ได้`);
                return;
              }
              const nowSite = String((assets[k] || {}).site || '');
              if (nowSite !== String(destSite)) {
                warnings.push(`${label}: ขณะนี้อยู่ที่ "${nowSite || '-'}" ไม่ใช่ "${destSite}" (อาจถูกย้ายต่อไปแล้ว) จึงไม่คืนให้อัตโนมัติ`);
                return;
              }
              siteBack[k] = srcSite;
              subSiteBack[k] = it.fromSubSite || '';
              pushHist(k, hist);
              restored.push({
                key: k,
                code,
                name: label,
                qty: need,
                to: srcSite,
                mode: 'site'
              });
            } else {
              const dk = Object.keys(assets).find(k => {
                const a = assets[k] || {};
                return String(a.splitFrom || '') === String(srcKey) && String(a.site || '') === String(destSite);
              }) || (code ? findAsset(code, destSite) : null);
              if (!dk) {
                warnings.push(`${label}: ไม่พบทรัพย์สินที่ ${destSite || '-'} จึงคืนของกลับต้นทางไม่ได้`);
                return;
              }
              const have = getQty(dk);
              if (have < need) throw new Error(`จำนวนที่ ${destSite} ไม่พอคืนสำหรับ ${code || label} (มี ${have}, ต้องคืน ${need}) — ตรวจสอบสต๊อกก่อนยกเลิก`);
              curQty[dk] = have - need;
              if (curQty[dk] === 0 && (assets[dk] || {}).splitFrom) dropKeys[dk] = true;else pushHist(dk, {
                ...hist,
                splitOut: need
              });
              const sk = srcKey && assets[srcKey] && String(assets[srcKey].site || '') === String(srcSite) ? srcKey : code ? findAsset(code, srcSite) : null;
              if (sk) {
                curQty[sk] = getQty(sk) + need;
                pushHist(sk, {
                  ...hist,
                  note: 'รับคืนจากการยกเลิกใบส่งของ'
                });
                restored.push({
                  key: sk,
                  code,
                  name: label,
                  qty: need,
                  to: srcSite,
                  mode: 'qty'
                });
              } else {
                const base = assets[dk] || {
                  assetCode: code,
                  name: it.name || '',
                  unit: it.unit || '',
                  brand: it.brand || '',
                  model: it.model || '',
                  serial: it.serial || ''
                };
                const nk = _assetDb.ref('/assets').push().key;
                const {
                  splitFrom,
                  ...cleanBase
                } = base;
                newAssets[nk] = {
                  ...cleanBase,
                  quantity: need,
                  site: srcSite,
                  subSite: it.fromSubSite || '',
                  updatedAt: when,
                  transferHistory: [{
                    ...hist,
                    note: 'สร้างคืนจากการยกเลิกใบส่งของ'
                  }]
                };
                restored.push({
                  key: nk,
                  code,
                  name: label,
                  qty: need,
                  to: srcSite,
                  mode: 'new'
                });
              }
            }
          });
          Object.keys(curQty).forEach(k => {
            if (dropKeys[k]) return;
            updates['/assets/' + k + '/quantity'] = curQty[k];
            updates['/assets/' + k + '/updatedAt'] = when;
          });
          Object.keys(siteBack).forEach(k => {
            updates['/assets/' + k + '/site'] = siteBack[k];
            updates['/assets/' + k + '/subSite'] = subSiteBack[k] || '';
            updates['/assets/' + k + '/updatedAt'] = when;
          });
          Object.keys(histAdd).forEach(k => {
            if (dropKeys[k]) return;
            const cur = Array.isArray(assets[k] && assets[k].transferHistory) ? assets[k].transferHistory.slice() : [];
            updates['/assets/' + k + '/transferHistory'] = cur.concat(histAdd[k]);
          });
          Object.keys(newAssets).forEach(k => {
            updates['/assets/' + k] = newAssets[k];
          });
          Object.keys(dropKeys).forEach(k => {
            updates['/assets/' + k] = null;
          });
          restoredSummary = restored;
        }
        const mark = {
          cancelled: true,
          cancelledAt: when,
          cancelledBy: by || '',
          cancelReason: reason || '',
          stockRestored: !!restoreStock
        };
        Object.keys(mark).forEach(kk => {
          updates['/deliveryOrders/' + key + '/' + kk] = mark[kk];
        });
        await _assetDb.ref().update(updates);
        return {
          ok: true,
          warnings,
          restored: restoredSummary,
          ...mark
        };
      }
    case 'updateDeliveryOrder':
      {
        const {
          key,
          patch,
          by,
          adjustStock
        } = payload;
        if (!key) throw new Error('ไม่พบรหัสใบส่งของ');
        const when = new Date().toISOString();
        const updates = {};
        const warnings = [];
        if (adjustStock) {
          const [doSnap, aSnap] = await Promise.all([_assetDb.ref('/deliveryOrders/' + key).get(), _assetDb.ref('/assets').get()]);
          const old = doSnap.val() || {};
          if (old.cancelled) throw new Error('ใบส่งของนี้ถูกยกเลิกแล้ว จึงแก้ไขจำนวนไม่ได้');
          const assets = aSnap.val() || {};
          const toArr = v => Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : [];
          const oldItems = toArr(old.items);
          const newItems = Array.isArray(patch.items) ? patch.items : oldItems;
          const destSite = old.toProject || '';
          const docNo = old.docNo || patch && patch.docNo || '';
          const curQty = {};
          const getQty = k => curQty[k] !== undefined ? curQty[k] : Number(assets[k].quantity) || 0;
          const histAdd = {};
          const pushHist = (k, e) => {
            (histAdd[k] = histAdd[k] || []).push(e);
          };
          const newAssets = {};
          const findAsset = (code, site) => Object.keys(assets).find(k => {
            const a = assets[k] || {};
            return String(a.assetCode || a.id || '') === String(code) && String(a.site || '') === String(site);
          });
          newItems.forEach((ni, i) => {
            const oi = oldItems[i] || {};
            const oldQty = Number(oi.quantity) || 0;
            const newQty = Number(ni.quantity) || 0;
            const delta = newQty - oldQty;
            if (delta === 0) return;
            const code = ni.assetCode || oi.assetCode || '';
            const srcSite = oi.from || ni.from || '';
            const label = ni.name || oi.name || code || 'รายการที่ ' + (i + 1);
            if (!code) {
              warnings.push(label + ': ไม่มีรหัสทรัพย์สิน จึงไม่ปรับสต๊อกให้');
              return;
            }
            if (delta > 0) {
              const sk = srcSite ? findAsset(code, srcSite) : null;
              if (sk) {
                const have = getQty(sk);
                if (have < delta) throw new Error(`สต๊อกต้นทางไม่พอสำหรับ ${code} ที่ ${srcSite} (มี ${have}, ต้องเพิ่ม ${delta})`);
                curQty[sk] = have - delta;
                pushHist(sk, {
                  from: srcSite,
                  to: destSite,
                  when,
                  by: by || '',
                  note: 'ปรับลดจากการแก้ไขใบส่งของ',
                  docNo,
                  qty: delta,
                  adjust: true,
                  splitOut: delta
                });
              } else {
                warnings.push(`${code}: ไม่พบทรัพย์สินต้นทางที่ ${srcSite || '-'} จึงเพิ่มจำนวนปลายทางโดยไม่ตัดต้นทาง`);
              }
              const dk = findAsset(code, destSite);
              if (dk) {
                curQty[dk] = getQty(dk) + delta;
                pushHist(dk, {
                  from: srcSite,
                  to: destSite,
                  when,
                  by: by || '',
                  note: 'ปรับเพิ่มจากการแก้ไขใบส่งของ',
                  docNo,
                  qty: delta,
                  adjust: true
                });
              } else {
                const base = sk ? assets[sk] : {
                  assetCode: code,
                  name: ni.name || '',
                  unit: ni.unit || '',
                  brand: ni.brand || '',
                  model: ni.model || '',
                  serial: ni.serial || ''
                };
                const nk = _assetDb.ref('/assets').push().key;
                newAssets[nk] = {
                  ...base,
                  quantity: delta,
                  site: destSite,
                  updatedAt: when,
                  transferHistory: [{
                    from: srcSite,
                    to: destSite,
                    when,
                    by: by || '',
                    note: 'สร้างจากการแก้ไขใบส่งของ',
                    docNo,
                    qty: delta,
                    adjust: true
                  }]
                };
              }
            } else {
              const need = -delta;
              const dk = findAsset(code, destSite);
              if (!dk) throw new Error(`ไม่พบทรัพย์สินปลายทางที่ ${destSite || '-'} สำหรับ ${code} จึงลดจำนวนไม่ได้`);
              const have = getQty(dk);
              if (have < need) throw new Error(`จำนวนปลายทางไม่พอลดสำหรับ ${code} ที่ ${destSite} (มี ${have}, ต้องลด ${need})`);
              curQty[dk] = have - need;
              pushHist(dk, {
                from: destSite,
                to: srcSite,
                when,
                by: by || '',
                note: 'ปรับลด/คืนจากการแก้ไขใบส่งของ',
                docNo,
                qty: need,
                adjust: true,
                splitOut: need
              });
              const sk = srcSite ? findAsset(code, srcSite) : null;
              if (sk) {
                curQty[sk] = getQty(sk) + need;
                pushHist(sk, {
                  from: destSite,
                  to: srcSite,
                  when,
                  by: by || '',
                  note: 'คืนจำนวนจากการแก้ไขใบส่งของ',
                  docNo,
                  qty: need,
                  adjust: true
                });
              } else if (srcSite) {
                const base = assets[dk] ? assets[dk] : {
                  assetCode: code,
                  name: ni.name || '',
                  unit: ni.unit || ''
                };
                const nk = _assetDb.ref('/assets').push().key;
                newAssets[nk] = {
                  ...base,
                  quantity: need,
                  site: srcSite,
                  updatedAt: when,
                  transferHistory: [{
                    from: destSite,
                    to: srcSite,
                    when,
                    by: by || '',
                    note: 'คืนจากการแก้ไขใบส่งของ',
                    docNo,
                    qty: need,
                    adjust: true
                  }]
                };
              } else {
                warnings.push(`${code}: ไม่ทราบโครงการต้นทาง จึงลดปลายทางโดยไม่คืนต้นทาง`);
              }
            }
          });
          Object.keys(curQty).forEach(k => {
            updates['/assets/' + k + '/quantity'] = curQty[k];
            updates['/assets/' + k + '/updatedAt'] = when;
          });
          Object.keys(histAdd).forEach(k => {
            const cur = Array.isArray(assets[k] && assets[k].transferHistory) ? assets[k].transferHistory.slice() : [];
            updates['/assets/' + k + '/transferHistory'] = cur.concat(histAdd[k]);
          });
          Object.keys(newAssets).forEach(k => {
            updates['/assets/' + k] = newAssets[k];
          });
        }
        const clean = {
          ...(patch || {})
        };
        delete clean.key;
        delete clean.when;
        clean.updatedAt = when;
        clean.updatedBy = by || '';
        Object.keys(clean).forEach(kk => {
          updates['/deliveryOrders/' + key + '/' + kk] = clean[kk];
        });
        await _assetDb.ref().update(updates);
        return {
          ok: true,
          warnings
        };
      }
    case 'updateRepairProblems':
      {
        const {
          id,
          problems,
          status,
          by,
          note
        } = payload;
        const tlKey = _db.ref('/repairs/' + id + '/timeline').push().key;
        const upd = {
          problems: problems || [],
          updatedAt: new Date().toISOString(),
          ['timeline/' + tlKey]: {
            id: tlKey,
            status: status || '',
            when: new Date().toISOString(),
            by: by || '',
            note: note || 'ปรับสถานะรายการอาการ'
          }
        };
        if (status !== undefined) upd.status = status;
        await _db.ref('/repairs/' + id).update(upd);
        return {
          ok: true
        };
      }
    case 'updateRepair':
      {
        const {
          id,
          patch,
          by,
          note
        } = payload;
        const clean = {
          ...patch
        };
        clean.updatedAt = new Date().toISOString();
        delete clean.id;
        delete clean.running;
        delete clean.timeline;
        const tlKey = _db.ref('/repairs/' + id + '/timeline').push().key;
        clean['timeline/' + tlKey] = {
          id: tlKey,
          status: clean.status || '',
          when: new Date().toISOString(),
          by: by || '',
          note: note || 'แก้ไขข้อมูลโดย Admin'
        };
        await _db.ref('/repairs/' + id).update(clean);
        return {
          ok: true
        };
      }
    case 'updateRepairStatus':
      {
        const {
          id,
          status,
          by,
          note,
          cost,
          patch: extraPatch
        } = payload;
        const ALLOW = ['title', 'desc', 'repairNote', 'siteId', 'subSite', 'machineCode', 'project', 'categoryId', 'reporterName', 'assignedId', 'parts', 'laborCost', 'odometerKm', 'hourMeter', 'driverName'];
        const clean = {};
        ALLOW.forEach(k => {
          if (extraPatch && extraPatch[k] !== undefined) clean[k] = extraPatch[k];
        });
        clean.updatedAt = new Date().toISOString();
        if (status !== undefined) clean.status = status;
        if (cost !== undefined) clean.cost = cost;
        const tlKey = _db.ref('/repairs/' + id + '/timeline').push().key;
        clean['timeline/' + tlKey] = {
          id: tlKey,
          status: status || '',
          when: new Date().toISOString(),
          by: by || '',
          note: note || ''
        };
        await _db.ref('/repairs/' + id).update(clean);
        return {
          ok: true
        };
      }
    case 'getLoginLogs':
      {
        const removed = await _pruneLoginLogs();
        const snap = await _db.ref('/loginLogs').get();
        const logs = snap.val() ? Object.values(snap.val()) : [];
        logs.sort((a, b) => new Date(b.when) - new Date(a.when));
        return {
          logs: logs.slice(0, LOGIN_LOG_KEEP),
          keep: LOGIN_LOG_KEEP,
          removed
        };
      }
    default:
      throw new Error('Unknown action: ' + action);
  }
}
window.api = api;

/* ---- block 2 (ต้นฉบับบรรทัด 1538) ---- */
const STATUSES = [{
  key: "new",
  label: "ใหม่",
  className: "b-new",
  icon: "fa-circle-plus"
}, {
  key: "assess",
  label: "รอประเมินราคา",
  className: "b-assess",
  icon: "fa-magnifying-glass-dollar"
}, {
  key: "progress",
  label: "กำลังดำเนินการ",
  className: "b-progress",
  icon: "fa-screwdriver-wrench"
}, {
  key: "parts",
  label: "รอชิ้นส่วน",
  className: "b-parts",
  icon: "fa-box-open"
}, {
  key: "done",
  label: "เสร็จสมบูรณ์",
  className: "b-done",
  icon: "fa-circle-check"
}, {
  key: "cancel",
  label: "ยกเลิก",
  className: "b-cancel",
  icon: "fa-ban"
}];
const ERP_SYSTEMS = [{
  id: "repairs",
  name: "งานซ่อม",
  desc: "แจ้งซ่อม ติดตามงาน และบริหารงานซ่อม",
  icon: "fa-screwdriver-wrench",
  status: "ready",
  startPage: "dashboard"
}, {
  id: "production",
  name: "Production",
  desc: "รอพัฒนา",
  icon: "fa-industry",
  status: "soon"
}, {
  id: "assets",
  name: "Asset",
  desc: "ทะเบียนและข้อมูลทรัพย์สิน/เครื่องจักร",
  icon: "fa-boxes-stacked",
  status: "ready",
  startPage: "machines"
}, {
  id: "consume",
  name: "Consume",
  desc: "เบิกจ่าย/เช็คสต๊อก · เปิดใช้เฉพาะผู้ดูแลระบบ (Admin)",
  icon: "fa-box-open",
  status: "ready",
  startPage: "withdrawals",
  roles: ["Admin"]
}, {
  id: "pc",
  name: "PC (Petty Cash)",
  desc: "รอพัฒนา",
  icon: "fa-money-bill-wave",
  status: "soon"
}, {
  id: "hr-time",
  name: "บุคลากร/เวลาทำงาน",
  desc: "รอพัฒนา",
  icon: "fa-users",
  status: "soon"
}];
function fmtDate(d) {
  if (!d) return "";
  if (typeof d === "string") d = new Date(d);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDateTime(d) {
  if (!d) return "";
  if (typeof d === "string") d = new Date(d);
  return `${fmtDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
window.__DATA = {
  users: [],
  categories: [],
  machines: [],
  repairs: [],
  projects: [],
  withdrawals: [],
  assetRegistry: null,
  deliveryOrders: null,
  statuses: STATUSES,
  erpSystems: ERP_SYSTEMS,
  activeErp: null,
  activeProject: "",
  fmtDate,
  fmtDateTime
};
window.__DATA.bootstrap = async function () {
  const d = await window.api("bootstrap");
  (d.repairs || []).forEach(r => {
    r.createdAt = r.createdAt ? new Date(r.createdAt) : new Date();
    if (!Array.isArray(r.timeline)) r.timeline = [];
    r.timeline.forEach(t => {
      if (t.when) t.when = new Date(t.when);
    });
    r.timeline.sort((a, b) => (a.when || 0) - (b.when || 0));
  });
  (d.repairs || []).sort((a, b) => b.createdAt - a.createdAt);
  window.__DATA.users = d.users || [];
  window.__DATA.categories = d.categories || [];
  window.__DATA.machines = d.machines || [];
  window.__DATA.repairs = d.repairs || [];
  window.__DATA.projects = d.projects || [];
  window.__DATA.withdrawals = d.withdrawals || [];
  return window.__DATA;
};
window.getStatus = key => STATUSES.find(s => s.key === key) || STATUSES[0];
window.getCategory = id => window.__DATA.categories.find(c => c.id === id) || {
  name: "-",
  color: "#64748B",
  icon: "fa-circle"
};
window.getUser = id => window.__DATA.users.find(u => u.id === id);
window.getProjectCode = name => {
  if (!name) return "";
  const p = (window.__DATA.projects || []).find(x => (typeof x === "string" ? x : x.name) === name);
  return p && p.code ? String(p.code) : "";
};
window.projectShort = name => {
  const p = window.getProject(name);
  return p && (p.shortName || p.code) || String(name || "");
};
window.projectFull = name => String(name || "");
window.getActiveProject = user => user?.activeProject || window.__DATA.activeProject || "";
window.getActiveErp = user => user?.activeErp || window.__DATA.activeErp || null;
window.canUseErp = (user, sys) => {
  if (!sys || sys.status !== "ready") return false;
  if (Array.isArray(sys.roles) && sys.roles.length) return sys.roles.includes(user?.role);
  return true;
};
window.effectiveRole = user => {
  if (!user) return "";
  const sysId = (window.getActiveErp(user) || {}).id || "";
  if (user.role === "Reporter" && sysId === "assets") return "Engineer";
  return user.role;
};
window.PROJECT_LOCKED_ROLES = ["Engineer", "Safety Officer"];
window.userCanSeeAllProjects = user => {
  if (!user) return false;
  if (window.getActiveProject(user)) return false;
  if (["Admin", "Director"].includes(user.role)) return true;
  if (window.PROJECT_LOCKED_ROLES.includes(user.role)) return false;
  return !user.projects || !Array.isArray(user.projects) || user.projects.length === 0;
};
window.userProjects = user => {
  if (!user) return [];
  const activeProject = window.getActiveProject(user);
  if (activeProject) return [activeProject];
  const fromProjects = (window.__DATA.projects || []).map(p => typeof p === "string" ? p : p.name).filter(Boolean);
  const allNames = fromProjects.length ? fromProjects : Array.from(new Set((window.__DATA.machines || []).map(m => m.project).filter(Boolean)));
  if (window.userCanSeeAllProjects(user)) return allNames;
  return (Array.isArray(user.projects) ? user.projects : []).filter(p => allNames.includes(p));
};
window.getProject = name => (window.__DATA.projects || []).find(p => p.name === name) || null;
window.isOpsRole = user => ["Admin", "Officer", "Engineer", "Safety Officer"].includes(user?.role);
window.defaultPageFor = user => user?.role === "Reporter" ? "r-dashboard" : "dashboard";
window.userCanSeeProject = (user, project) => {
  const activeProject = window.getActiveProject(user);
  if (activeProject) return !project || project === activeProject;
  if (window.userCanSeeAllProjects(user)) return true;
  if (!project) return true;
  return (user.projects || []).includes(project);
};
window.filterByUserProjects = (user, items, projectKey = "project") => {
  const activeProject = window.getActiveProject(user);
  if (activeProject) return items.filter(x => !x[projectKey] || x[projectKey] === activeProject);
  if (window.userCanSeeAllProjects(user)) return items;
  const allowed = new Set(user.projects || []);
  return items.filter(x => !x[projectKey] || allowed.has(x[projectKey]));
};
window.allowedProjectNames = user => {
  const all = (window.__DATA.projects || []).map(p => p.name).filter(Boolean);
  if (!user) return [];
  if (["Admin", "Director"].includes(user.role)) return all;
  const assigned = (Array.isArray(user.projects) ? user.projects : []).filter(p => all.includes(p));
  if (window.PROJECT_LOCKED_ROLES.includes(user.role)) return assigned;
  return assigned.length ? assigned : all;
};
window.visibleProjects = (user, {
  includeInactive = false
} = {}) => {
  const allowed = new Set(window.allowedProjectNames(user));
  return (window.__DATA.projects || []).filter(p => includeInactive || p.status !== "inactive").filter(p => allowed.has(p.name));
};
window.projectSites = projectOrName => {
  const p = projectOrName && typeof projectOrName === "object" ? projectOrName : (window.__DATA.projects || []).find(x => x.name === projectOrName);
  const raw = p && p.sites;
  if (Array.isArray(raw)) return raw.map(s => String(s || "").trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map(s => s.trim()).filter(Boolean);
  if (raw && typeof raw === "object") return Object.values(raw).map(s => String(s || "").trim()).filter(Boolean);
  return [];
};
window.avatarColor = name => {
  const colors = ["#3B82F6", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#06B6D4", "#EC4899", "#6366F1"];
  let h = 0;
  for (const c of name || "") h = h * 31 + c.charCodeAt(0) >>> 0;
  return colors[h % colors.length];
};
window.initials = name => (name || "").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
const KW_STOP = new Set(["และ", "หรือ", "แต่", "กับ", "ของ", "ที่", "ใน", "จาก", "เมื่อ", "ตอน", "ช่วง", "เพราะ", "ถ้า", "จะ", "ให้", "ได้", "มี", "เป็น", "อยู่", "แล้ว", "ยัง", "มา", "ไป", "ขึ้น", "ลง", "ออก", "เข้า", "อีก", "ด้วย", "เลย", "พอ", "มาก", "น้อย", "ทั้ง", "ทุก", "บาง", "นี้", "นั้น", "การ", "ความ", "ทำ", "ต้อง", "ช่วย", "ขอ", "หน่อย", "ครับ", "ค่ะ", "คะ", "ก็", "คือ", "ว่า", "ดู", "ใช้", "ใช่", "แจ้ง", "ซ่อม", "งาน", "เครื่อง", "ตัว", "ชิ้น", "จุด", "อัน", "ราย", "หมายเลข", "เบอร์", "ประมาณ", "วันที่", "เวลา", "ปัญหา", "อาการ", "สาเหตุ", "ตรวจ", "สอบ", "ไม่มี", "อะไร", "เกิด", "ปกติ", "มัน", "ควร", "น่าจะ", "คาด", "อาจ", "ตาม", "ที", "the", "and", "for", "with", "not", "are", "was", "this", "that", "have", "has", "from", "out", "been", "also", "only", "very"]);
const KW_NEG = new Set(["ไม่", "ไม่ได้", "มิ"]);
const KW_DICT = [{
  k: "สายไฮดรอลิคแตก",
  g: "ไฮดรอลิค",
  a: ["สายไฮดรอลิกแตก", "สายไฮโดรลิคแตก", "สายไฮโดรลิกแตก", "ท่อไฮดรอลิคแตก", "ท่อไฮดรอลิกแตก", "สายไฮดรอลิคระเบิด", "สายไฮดรอลิกระเบิด", "สายไฮดรอลิคขาด", "สายไฮดรอลิกขาด"]
}, {
  k: "สายไฮดรอลิครั่ว",
  g: "ไฮดรอลิค",
  a: ["สายไฮดรอลิกรั่ว", "ท่อไฮดรอลิครั่ว", "ท่อไฮดรอลิกรั่ว", "สายไฮดรอลิคซึม", "สายไฮดรอลิกซึม"]
}, {
  k: "น้ำมันไฮดรอลิครั่ว",
  g: "ไฮดรอลิค",
  a: ["น้ำมันไฮดรอลิกรั่ว", "น้ำมันไฮดรอลิคซึม", "น้ำมันไฮโดรลิครั่ว"]
}, {
  k: "ปั๊มไฮดรอลิคเสีย",
  g: "ไฮดรอลิค",
  a: ["ปั๊มไฮดรอลิกเสีย", "ปั๊มไฮดรอลิคไม่ทำงาน", "ปั๊มไฮดรอลิกไม่ทำงาน"]
}, {
  k: "กระบอกไฮดรอลิครั่ว",
  g: "ไฮดรอลิค",
  a: ["กระบอกไฮดรอลิกรั่ว", "กระบอกไฮดรอลิคซึม"]
}, {
  k: "ไฮดรอลิค",
  a: ["ไฮดรอลิก", "ไฮโดรลิค", "ไฮโดรลิก", "ไฮดรอลิกส์", "ไฮดรอริค"]
}, {
  k: "สลิงเครนเจาะแตก",
  g: "สลิง",
  a: ["สลิงเครนเจาะขาด", "สลิงเจาะแตก", "สลิงเจาะขาด", "สลิงเครนแตก", "สลิงเครนขาด"]
}, {
  k: "สลิงขาด",
  g: "สลิง",
  a: ["สลิงแตก", "สลิงชำรุด", "ลวดสลิงขาด", "ลวดสลิงแตก"]
}, {
  k: "เครนยกไม่ขึ้น",
  g: "เครน",
  a: ["ยกของไม่ขึ้น", "ยกไม่ขึ้น", "เครนยกของไม่ขึ้น", "บูมยกไม่ขึ้น"]
}, {
  k: "บูมตก",
  g: "เครน",
  a: ["แขนบูมตก", "บูมทรุด", "บูมไหล"]
}, {
  k: "ดอกเจาะสึก",
  g: "งานเจาะ",
  a: ["ดอกเจาะหมด", "ดอกเจาะสึกหรอ", "หัวเจาะสึก"]
}, {
  k: "ก้านเจาะคด",
  g: "งานเจาะ",
  a: ["ก้านเจาะงอ", "ก้านเจาะหัก"]
}, {
  k: "สลิง",
  a: ["ลวดสลิง"]
}, {
  k: "เครน",
  a: ["รถเครน", "เครนเจาะ"]
}, {
  k: "รอก",
  a: ["รอกไฟฟ้า", "ตะขอรอก"]
}, {
  k: "สตาร์ทไม่ติด",
  g: "สตาร์ท",
  a: ["สตาร์ทไม่ได้", "สตาร์ทไม่ออก", "ติดเครื่องไม่ได้", "ติดเครื่องไม่ติด", "สตาร์ทแล้วไม่ติด", "สตาร์ตไม่ติด"]
}, {
  k: "เครื่องโหลด",
  g: "เครื่องยนต์",
  a: ["เครื่องมีโหลด", "เครื่องกินโหลด", "โหลดเครื่อง", "เครื่องโหลดหนัก", "รอบตกเวลาโหลด"]
}, {
  k: "เครื่องดับเอง",
  g: "เครื่องยนต์",
  a: ["เครื่องดับ", "ดับเอง", "เครื่องดับกลางทาง", "เครื่องน็อค"]
}, {
  k: "เครื่องร้อนจัด",
  g: "เครื่องยนต์",
  a: ["ความร้อนขึ้นสูง", "ความร้อนสูง", "โอเวอร์ฮีท", "น้ำเดือด", "ความร้อนขึ้น"]
}, {
  k: "รอบเครื่องตก",
  g: "เครื่องยนต์",
  a: ["รอบตก", "กำลังตก", "แรงตก", "เครื่องไม่มีกำลัง", "กำลังไม่พอ"]
}, {
  k: "ควันดำ",
  g: "เครื่องยนต์",
  a: ["ควันดำมาก", "ควันออกดำ"]
}, {
  k: "ควันขาว",
  g: "เครื่องยนต์",
  a: ["ควันขาวมาก"]
}, {
  k: "เครื่องสั่น",
  g: "เครื่องยนต์",
  a: ["สั่นสะเทือน", "สั่นผิดปกติ", "เครื่องสั่นผิดปกติ"]
}, {
  k: "ไฟไม่ติด",
  g: "ระบบไฟฟ้า",
  a: ["ไฟไม่เข้า", "ไฟไม่มา", "ไม่มีไฟเข้า", "ไฟดับ"]
}, {
  k: "ไฟรั่ว",
  g: "ระบบไฟฟ้า",
  a: ["ไฟรั่วลงกราวด์", "ไฟช็อต", "ไฟดูด"]
}, {
  k: "เบรกเกอร์ทริป",
  g: "ระบบไฟฟ้า",
  a: ["เบรกเกอร์ตัด", "เบรกเกอร์เด้ง", "เบรกเกอร์ตัดบ่อย", "เมนตัด"]
}, {
  k: "แบตเตอรี่เสื่อม",
  g: "แบตเตอรี่",
  a: ["แบตเสื่อม", "แบตหมด", "แบตเตอรี่หมด", "แบตไฟอ่อน", "แบตเตอรี่ไฟอ่อน"]
}, {
  k: "ไดชาร์จไม่ชาร์จ",
  g: "ระบบไฟฟ้า",
  a: ["ไดชาร์จเสีย", "ไฟไม่ชาร์จ"]
}, {
  k: "มอเตอร์ไหม้",
  g: "มอเตอร์",
  a: ["มอเตอร์ไหม้เสียหาย", "ขดลวดไหม้"]
}, {
  k: "ลัดวงจร",
  g: "ระบบไฟฟ้า",
  a: ["ช็อต", "ไฟช็อตวงจร"]
}, {
  k: "สายพานขาด",
  g: "สายพาน",
  a: ["สายพานหลุด", "สายพานหย่อน", "สายพานเปื่อย"]
}, {
  k: "โซ่ขาด",
  g: "โซ่",
  a: ["โซ่หลุด", "โซ่ยืด"]
}, {
  k: "เบรกไม่อยู่",
  g: "เบรก",
  a: ["เบรกหาย", "เบรกจม", "เบรกไม่ค่อยอยู่", "ผ้าเบรกหมด"]
}, {
  k: "เกียร์เข้ายาก",
  g: "เกียร์",
  a: ["เข้าเกียร์ไม่ได้", "เกียร์หลุด", "เกียร์ค้าง"]
}, {
  k: "คลัตช์ลื่น",
  g: "คลัตช์",
  a: ["ครัชลื่น", "คลัชลื่น"]
}, {
  k: "ยางแตก",
  g: "ยาง",
  a: ["ยางระเบิด", "ยางรั่ว", "ยางแบน"]
}, {
  k: "ลูกปืนแตก",
  g: "ลูกปืน",
  a: ["แบริ่งแตก", "ลูกปืนเสีย", "แบริ่งเสีย"]
}, {
  k: "น้ำมันเครื่องรั่ว",
  g: "น้ำมัน",
  a: ["น้ำมันเครื่องซึม", "น้ำมันรั่ว", "น้ำมันซึม"]
}, {
  k: "น้ำรั่ว",
  a: ["น้ำซึม", "หม้อน้ำรั่ว", "ท่อน้ำรั่ว"]
}, {
  k: "ลมรั่ว",
  a: ["ลมซึม", "ท่อลมรั่ว"]
}, {
  k: "ซีลรั่ว",
  a: ["ซีลแตก", "ปะเก็นรั่ว", "ปะเก็นแตก", "โอริงแตก"]
}, {
  k: "แอร์ไม่เย็น",
  g: "แอร์",
  a: ["แอร์เย็นน้อย", "แอร์ไม่ค่อยเย็น"]
}, {
  k: "คอมเพรสเซอร์ไม่ทำงาน",
  g: "คอมเพรสเซอร์",
  a: ["คอมแอร์ไม่ทำงาน", "คอมเพรสเซอร์เสีย"]
}, {
  k: "ปั๊มน้ำไม่ทำงาน",
  g: "ปั๊ม",
  a: ["ปั๊มน้ำเสีย", "ปั๊มไม่ทำงาน"]
}, {
  k: "เสียงดังผิดปกติ",
  a: ["มีเสียงดัง", "เสียงดัง", "เสียงผิดปกติ", "เสียงครูดๆ"]
}, {
  k: "อุดตัน",
  a: ["ตัน", "ไส้กรองตัน", "กรองตัน"]
}, {
  k: "รีโมทไม่ทำงาน",
  a: ["รีโมทเสีย", "รีโมทกดไม่ติด"]
}, {
  k: "ลิมิตสวิตช์เสีย",
  a: ["ลิมิตสวิตซ์เสีย", "ลิมิตเสีย"]
}, {
  k: "มอเตอร์"
}, {
  k: "เกียร์"
}, {
  k: "คลัตช์",
  a: ["ครัช", "คลัช"]
}, {
  k: "สายพาน"
}, {
  k: "โซ่"
}, {
  k: "เพลา"
}, {
  k: "ปั๊ม"
}, {
  k: "วาล์ว"
}, {
  k: "รีเลย์"
}, {
  k: "ฟิวส์"
}, {
  k: "คอนแทกเตอร์"
}, {
  k: "แมกเนติก"
}, {
  k: "อินเวอร์เตอร์"
}, {
  k: "โซลินอยด์"
}, {
  k: "เซ็นเซอร์",
  a: ["เซนเซอร์"]
}, {
  k: "สายไฟ"
}, {
  k: "กราวด์"
}, {
  k: "หัวฉีด"
}, {
  k: "หัวเทียน"
}, {
  k: "พัดลม"
}, {
  k: "ใบพัด"
}, {
  k: "คอยล์"
}, {
  k: "ข้อต่อ"
}, {
  k: "ล้อ"
}, {
  k: "ยาง"
}, {
  k: "เบรก"
}, {
  k: "แอร์"
}, {
  k: "แบตเตอรี่",
  a: ["แบต"]
}, {
  k: "คอมเพรสเซอร์",
  a: ["คอมแอร์"]
}, {
  k: "เรดิเอเตอร์"
}, {
  k: "หม้อน้ำ"
}, {
  k: "ไส้กรอง",
  a: ["กรองน้ำมัน", "กรองอากาศ"]
}, {
  k: "กระบอกสูบ"
}, {
  k: "ลูกสูบ"
}, {
  k: "ลูกปืน"
}, {
  k: "แบริ่ง"
}, {
  k: "ปะเก็น"
}, {
  k: "ตู้คอนโทรล",
  a: ["ตู้ควบคุม"]
}, {
  k: "จอแสดงผล"
}, {
  k: "นิวเมติก"
}, {
  k: "น้ำมัน"
}, {
  k: "น้ำหล่อเย็น"
}, {
  k: "จาระบี"
}, {
  k: "ตีนตะขาบ"
}, {
  k: "บุ้งกี๋"
}, {
  k: "บูม",
  a: ["แขนบูม"]
}, {
  k: "สตาร์ท",
  a: ["สตาร์ต"]
}, {
  k: "ไดสตาร์ท"
}, {
  k: "ไดชาร์จ"
}, {
  k: "รั่ว",
  a: ["ซึม"]
}, {
  k: "แตก"
}, {
  k: "ขาด"
}, {
  k: "ไหม้"
}, {
  k: "หลวม"
}, {
  k: "สึกหรอ",
  a: ["สึก"]
}, {
  k: "ติดขัด"
}, {
  k: "ระเบิด"
}, {
  k: "แตกร้าว",
  a: ["ร้าว"]
}, {
  k: "ผิดปกติ"
}, {
  k: "เข้าปกติ"
}];
const KW_LOOKUP = [];
KW_DICT.forEach(e => {
  [e.k].concat(e.a || []).forEach(alias => KW_LOOKUP.push({
    alias,
    k: e.k,
    g: e.g || ""
  }));
});
KW_LOOKUP.sort((x, y) => y.alias.length - x.alias.length);
window.extractKeywords = function (text) {
  let raw = String(text || "").toLowerCase().replace(/[0-9๐-๙]+/g, " ").replace(/[^\p{L}\p{M}\s]+/gu, " ");
  if (!raw.trim()) return [];
  for (let i = 0; i < 4; i++) {
    const next = raw.replace(/([฀-๿])[ \t]+([฀-๿])/g, "$1$2");
    if (next === raw) break;
    raw = next;
  }
  const found = [];
  const add = w => {
    if (w && found.indexOf(w) < 0) found.push(w);
  };
  for (const e of KW_LOOKUP) {
    if (raw.indexOf(e.alias) >= 0) {
      add(e.k);
      if (e.g) add(e.g);
      raw = raw.split(e.alias).join(" ");
    }
  }
  let toks = [];
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = window.__thSeg || (window.__thSeg = new Intl.Segmenter("th", {
        granularity: "word"
      }));
      for (const s of seg.segment(raw)) if (s.isWordLike) toks.push(String(s.segment).trim());
    } else {
      toks = raw.split(/\s+/);
    }
  } catch (e) {
    toks = raw.split(/\s+/);
  }
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    let t = toks[i];
    if (!t) continue;
    if (KW_NEG.has(t)) {
      const nxt = toks[i + 1];
      if (nxt && !KW_STOP.has(nxt) && nxt.length >= 2) {
        out.push(t + nxt);
        i++;
        continue;
      }
      continue;
    }
    if (KW_STOP.has(t)) continue;
    const isThai = /[฀-๿]/.test(t);
    if (t.length < (isThai ? 2 : 3)) continue;
    out.push(t);
  }
  return found.concat(out);
};

/* ---- block 3 (ต้นฉบับบรรทัด 1880) ---- */
const DELREQ_SEEN_KEY = "rms_delreq_seen";
window.__DELREQ = {
  list: [],
  ready: false,
  user: null,
  _subs: new Set(),
  _ref: null,
  _prev: null,
  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  },
  _emit() {
    this._subs.forEach(fn => {
      try {
        fn(this.list);
      } catch (e) {}
    });
  },
  start(user) {
    this.user = user || null;
    if (this._ref) {
      this._emit();
      return;
    }
    try {
      this._ref = firebase.database().ref("/deleteRequests").limitToLast(400);
      this._ref.on("value", snap => {
        const arr = Object.values(snap.val() || {}).filter(Boolean).sort((a, b) => String(b.requestedAt || "").localeCompare(String(a.requestedAt || "")));
        const prev = this._prev;
        this.list = arr;
        this.ready = true;
        if (prev) arr.forEach(r => {
          const before = prev.get(r.id);
          if (before === undefined && r.status === "pending") this._announceNew(r);else if (before === "pending" && r.status !== "pending") {
            if (r.status === "approved") {
              try {
                if (r.kind === "edit") window.applyEditLocally(r.action, r.payload || {});else window.applyDeleteLocally(r.action, r.payload || {});
              } catch (e) {}
            }
            this._announceDecision(r);
          }
        });
        this._prev = new Map(arr.map(r => [r.id, r.status]));
        this._emit();
      }, err => {
        console.warn("[deleteRequests] ฟังข้อมูลไม่สำเร็จ:", err && err.message);
      });
    } catch (e) {
      console.warn("[deleteRequests]", e);
    }
  },
  stop() {
    if (this._ref) {
      try {
        this._ref.off();
      } catch (e) {}
    }
    this._ref = null;
    this._prev = null;
    this.list = [];
    this.ready = false;
    this.user = null;
    this._emit();
  },
  pending() {
    return this.list.filter(r => r.status === "pending");
  },
  visibleTo(user) {
    if (!user) return [];
    if (user.role === "Admin") return this.list;
    return this.list.filter(r => r.requesterId === user.id);
  },
  badgeFor(user) {
    if (!user) return 0;
    if (user.role === "Admin") return this.pending().length;
    const seen = Number(localStorage.getItem(DELREQ_SEEN_KEY + ":" + user.id) || 0);
    return this.list.filter(r => r.requesterId === user.id && r.status !== "pending" && new Date(r.decidedAt || 0).getTime() > seen).length;
  },
  markSeen(user) {
    if (!user) return;
    localStorage.setItem(DELREQ_SEEN_KEY + ":" + user.id, String(Date.now()));
    this._emit();
  },
  _announceNew(r) {
    if (!this.user || this.user.role !== "Admin") return;
    const isEdit = r.kind === "edit";
    const title = isEdit ? "มีคำขอแก้ไขข้อมูลรออนุมัติ" : "มีคำขอลบข้อมูลรออนุมัติ";
    const text = `${r.requesterName || "ผู้ใช้งาน"} ขอ${isEdit ? "แก้ไข" : "ลบ"}${r.entityLabel || "ข้อมูล"} "${r.targetName || "-"}"`;
    if (window.Swal) Swal.fire({
      toast: true,
      position: "top-end",
      icon: "warning",
      title,
      text,
      showConfirmButton: false,
      timer: 6000,
      timerProgressBar: true
    });
    this._beep();
    this._push(title, text);
  },
  _announceDecision(r) {
    if (!this.user || r.requesterId !== this.user.id) return;
    const ok = r.status === "approved";
    const kindTxt = r.kind === "edit" ? "คำขอแก้ไข" : "คำขอลบ";
    const title = ok ? `${kindTxt}ได้รับการอนุมัติแล้ว` : `${kindTxt}ไม่ได้รับอนุมัติ`;
    const text = `${r.entityLabel || "ข้อมูล"} "${r.targetName || "-"}" · โดย ${r.decidedByName || "ผู้ดูแลระบบ"}`;
    if (window.Swal) Swal.fire({
      toast: true,
      position: "top-end",
      icon: ok ? "success" : "info",
      title,
      text,
      showConfirmButton: false,
      timer: 6000,
      timerProgressBar: true
    });
    this._push(title, text);
  },
  _push(title, body) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      new Notification(title, {
        body,
        icon: "logo.png",
        tag: "rms-delete-request"
      });
    } catch (e) {}
  },
  _beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx(),
        osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      setTimeout(() => {
        try {
          ctx.close();
        } catch (e) {}
      }, 600);
    } catch (e) {}
  }
};
window.askNotifyPermission = function (user) {
  try {
    if (!user || user.role !== "Admin") return;
    if (!("Notification" in window) || Notification.permission !== "default") return;
    Notification.requestPermission().catch(() => {});
  } catch (e) {}
};
window.useDeleteRequests = function (user) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    window.__DELREQ.start(user);
    return window.__DELREQ.subscribe(() => setTick(t => t + 1));
  }, [user && user.id]);
  return {
    all: window.__DELREQ.list,
    mine: window.__DELREQ.visibleTo(user),
    badge: window.__DELREQ.badgeFor(user),
    ready: window.__DELREQ.ready,
    _tick: tick
  };
};
window.applyDeleteLocally = function (action, payload = {}) {
  const D = window.__DATA;
  const byId = arr => (arr || []).filter(x => x.id !== payload.id);
  const byKey = arr => (arr || []).filter(x => x.key !== payload.key);
  if (action === "deleteProject") D.projects = byId(D.projects);else if (action === "deleteUser") D.users = byId(D.users);else if (action === "deleteCategory") D.categories = byId(D.categories);else if (action === "deleteMachine") D.machines = byId(D.machines);else if (action === "deleteRepair") D.repairs = byId(D.repairs);else if (action === "deleteWithdrawal") D.withdrawals = byKey(D.withdrawals);else if (action === "deleteAssetRegistry") {
    if (Array.isArray(D.assetRegistry)) D.assetRegistry = byKey(D.assetRegistry);
  } else if (action === "deleteDeliveryOrder") {
    if (Array.isArray(D.deliveryOrders)) D.deliveryOrders = byKey(D.deliveryOrders);
  } else if (action === "deleteTransferEntry") {
    const m = (D.machines || []).find(x => x.id === payload.machineId);
    if (m) m.transferHistory = (m.transferHistory || []).filter(t => !(String(t.when || "") === String(payload.when || "") && String(t.to || "") === String(payload.to || "")));
  }
};
window.applyEditLocally = function (action, payload = {}) {
  const D = window.__DATA;
  if (action === "updateRepair") {
    const patch = payload.patch || {};
    D.repairs = (D.repairs || []).map(x => x.id === payload.id ? {
      ...x,
      ...patch
    } : x);
  } else if (action === "updateMachine") {
    const patch = payload.patch || {};
    D.machines = (D.machines || []).map(x => x.id === payload.id ? {
      ...x,
      ...patch
    } : x);
  } else if (action === "saveAssetRegistry") {
    if (Array.isArray(D.assetRegistry)) {
      const asset = payload.asset || {};
      D.assetRegistry = D.assetRegistry.map(x => x.key === payload.key ? {
        ...x,
        ...asset,
        key: x.key
      } : x);
    }
  }
};
window.REPAIR_FIELD_LABELS = {
  title: {
    label: "อาการ/ปัญหา",
    fmt: v => String(v || "").split("\n").filter(Boolean).join(" · ")
  },
  desc: {
    label: "รายละเอียดปัญหา"
  },
  siteId: {
    label: "เลขที่ไซต์งาน"
  },
  subSite: {
    label: "ไซต์งานย่อย"
  },
  machineCode: {
    label: "รหัสเครื่องจักร"
  },
  odometerKm: {
    label: "เลขมิเตอร์กิโลเมตร"
  },
  hourMeter: {
    label: "เลขมิเตอร์ชั่วโมง"
  },
  driverName: {
    label: "พนักงานขับ / ผู้ควบคุม"
  },
  categoryId: {
    label: "หมวดหมู่",
    fmt: v => (window.getCategory(v) || {}).name || "—"
  },
  createdAt: {
    label: "วันที่แจ้ง",
    fmt: v => window.__DATA.fmtDate(v)
  },
  photos: {
    label: "รูปภาพประกอบ",
    fmt: v => `${(v || []).filter(Boolean).length} รูป`
  }
};
window.MACHINE_FIELD_LABELS = {
  code: {
    label: "รหัสเครื่องจักร"
  },
  name: {
    label: "ชื่อเครื่องจักร"
  },
  brand: {
    label: "ยี่ห้อ"
  },
  model: {
    label: "รุ่น"
  },
  year: {
    label: "ปีที่ผลิต"
  },
  size: {
    label: "ขนาด / ความยาว"
  },
  serial: {
    label: "ซีเรียล"
  },
  ownership: {
    label: "กรรมสิทธิ์/เช่า"
  },
  categoryId: {
    label: "หมวดหมู่",
    fmt: v => (window.getCategory(v) || {}).name || "—"
  },
  status: {
    label: "สถานะ"
  },
  project: {
    label: "โครงการ"
  },
  subSite: {
    label: "ไซต์งานย่อย"
  },
  location: {
    label: "สถานที่ติดตั้ง"
  },
  hours: {
    label: "ชั่วโมงทำงานสะสม"
  },
  lastService: {
    label: "ซ่อมบำรุงล่าสุด"
  },
  inspectionDate: {
    label: "วันที่ตรวจสอบ (ปจ2)"
  },
  nextInspectionDate: {
    label: "วันที่ตรวจสอบครั้งถัดไป"
  },
  driverName: {
    label: "พนักงานขับ / ผู้ควบคุม"
  },
  drivePhoto: {
    label: "ลิงก์รูปภาพ"
  },
  driveLink1: {
    label: "ลิงก์เอกสาร (1)"
  },
  driveLink2: {
    label: "ลิงก์เอกสาร (2)"
  },
  driveLinkPL: {
    label: "ลิงก์ PL (ประกัน)"
  },
  note: {
    label: "หมายเหตุ"
  },
  icon: {
    label: "ไอคอน"
  }
};
window.ASSET_FIELD_LABELS = {
  assetCode: {
    label: "รหัสทรัพย์สิน"
  },
  name: {
    label: "ชื่อทรัพย์สิน"
  },
  brand: {
    label: "ยี่ห้อ"
  },
  model: {
    label: "รุ่น"
  },
  serial: {
    label: "Serial No."
  },
  size: {
    label: "ขนาด"
  },
  quantity: {
    label: "จำนวน"
  },
  unit: {
    label: "หน่วย"
  },
  ownership: {
    label: "กรรมสิทธิ์"
  },
  holder: {
    label: "ผู้ถือครอง"
  },
  site: {
    label: "สถานที่ (โครงการ)"
  },
  subSite: {
    label: "ไซต์งานย่อย"
  },
  receivedAt: {
    label: "วันที่รับเข้า"
  },
  note: {
    label: "หมายเหตุ"
  }
};
window.diffFields = function (before, patch, labels) {
  const out = [];
  Object.keys(labels || {}).forEach(k => {
    if (!(k in (patch || {}))) return;
    const meta = labels[k];
    const fmt = meta.fmt || (v => v === 0 || v ? String(v) : "");
    const a = fmt(before ? before[k] : "");
    const b = fmt(patch[k]);
    if (String(a) !== String(b)) out.push({
      field: k,
      label: meta.label,
      from: a || "— ว่าง —",
      to: b || "— ว่าง —"
    });
  });
  return out;
};
window.requestEditApproval = async function (opts) {
  const {
    user,
    action,
    payload = {},
    entityLabel = "ข้อมูล",
    targetName = "",
    targetInfo = "",
    project = "",
    changes = []
  } = opts || {};
  if (!user) {
    Swal.fire({
      icon: "error",
      title: "ไม่พบข้อมูลผู้ใช้งาน"
    });
    return false;
  }
  if (!changes.length) {
    Swal.fire({
      icon: "info",
      title: "ยังไม่ได้แก้ไขอะไร",
      text: "ปรับข้อมูลที่ต้องการก่อนส่งคำขอ"
    });
    return false;
  }
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rowsHtml = changes.map(c => `
    <div style="padding:6px 0;border-bottom:1px dashed #E2E8F0">
      <div style="font-size:12px;color:#64748B">${esc(c.label)}</div>
      <div style="font-size:13px"><span style="color:#B91C1C;text-decoration:line-through">${esc(c.from)}</span>
        <i class="fa-solid fa-arrow-right" style="margin:0 6px;color:#94A3B8;font-size:10px"></i>
        <span style="color:#047857;font-weight:500">${esc(c.to)}</span></div>
    </div>`).join("");
  const r = await Swal.fire({
    title: "ขออนุมัติแก้ไขข้อมูล",
    html: `<div style="text-align:left;font-size:14px">
             <div style="background:#FEF3C7;border:1px solid #FDE68A;color:#92400E;border-radius:8px;padding:10px 12px;margin-bottom:12px">
               <i class="fa-solid fa-shield-halved" style="margin-right:6px"></i>
               การแก้ไขต้องได้รับอนุมัติจากผู้ดูแลระบบ (Admin) ก่อน ข้อมูลเดิมจะยังไม่เปลี่ยนจนกว่าจะอนุมัติ
             </div>
             <div style="color:#64748B;font-size:12px">รายการที่ขอแก้</div>
             <div style="margin-top:2px">${esc(entityLabel)}${targetName ? " · <b>" + esc(targetName) + "</b>" : ""}</div>
             <div style="margin-top:10px;color:#64748B;font-size:12px">สิ่งที่เปลี่ยน (${changes.length} รายการ)</div>
             <div style="max-height:190px;overflow:auto;margin-top:4px">${rowsHtml}</div>
           </div>`,
    input: "textarea",
    inputLabel: "เหตุผลที่ต้องการแก้ไข",
    inputPlaceholder: "ระบุเหตุผล เช่น กรอกอาการผิด / ใส่เลขมิเตอร์ผิด",
    inputValidator: v => !String(v || "").trim() ? "กรุณาระบุเหตุผลที่ต้องการแก้ไข" : null,
    showCancelButton: true,
    confirmButtonText: "ส่งคำขออนุมัติ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#2563EB"
  });
  if (!r.isConfirmed) return false;
  try {
    await window.api("requestChange", {
      req: {
        action,
        payload,
        entityLabel,
        targetName,
        targetInfo,
        changes,
        project: project || window.getActiveProject(user) || "",
        reason: r.value,
        requesterId: user.id,
        requesterName: user.name,
        requesterRole: user.role
      }
    });
    Swal.fire({
      icon: "success",
      title: "ส่งคำขอแก้ไขแล้ว",
      html: `ระบบแจ้งผู้ดูแลระบบ (Admin) แล้ว<br/><span style="color:#64748B;font-size:13px">ข้อมูลจะเปลี่ยนเมื่อได้รับอนุมัติ · ติดตามได้ที่เมนู "การแจ้งเตือน"</span>`,
      confirmButtonText: "รับทราบ"
    });
    return true;
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "ส่งคำขอไม่สำเร็จ",
      text: err.message
    });
    return false;
  }
};
window.confirmWithPassword = async function (user, {
  title,
  html,
  confirmText
} = {}) {
  if (!user || !user.id) {
    Swal.fire({
      icon: "error",
      title: "ไม่พบข้อมูลผู้ใช้งาน"
    });
    return false;
  }
  const r = await Swal.fire({
    title: title || "ยืนยันตัวตนก่อนลบ",
    html: `<div style="text-align:left;font-size:13.5px">
             <div style="background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:8px;padding:10px 12px;margin-bottom:12px">
               <i class="fa-solid fa-shield-halved" style="margin-right:6px"></i>
               ${html || "การลบข้อมูลต้องกรอกรหัสผ่านของบัญชีคุณเพื่อยืนยันทุกครั้ง"}
             </div>
             <div style="color:#64748B;font-size:12px">บัญชี</div>
             <div style="margin-top:2px;font-weight:500">${user.name || ""} <span style="color:#64748B;font-weight:400">(${user.username || ""})</span></div>
           </div>`,
    icon: "warning",
    input: "password",
    inputLabel: "รหัสผ่านของคุณ",
    inputPlaceholder: "กรอกรหัสผ่านเพื่อยืนยัน",
    inputAttributes: {
      autocomplete: "current-password",
      "aria-label": "รหัสผ่านยืนยันการลบ"
    },
    showCancelButton: true,
    confirmButtonText: confirmText || "ยืนยันการลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#EF4444",
    allowOutsideClick: () => !Swal.isLoading(),
    showLoaderOnConfirm: true,
    preConfirm: async pw => {
      if (!String(pw || "")) {
        Swal.showValidationMessage("กรุณากรอกรหัสผ่าน");
        return false;
      }
      try {
        await window.api("verifyPassword", {
          userId: user.id,
          password: pw
        });
        return true;
      } catch (err) {
        Swal.showValidationMessage(err.message || "ยืนยันรหัสผ่านไม่สำเร็จ");
        return false;
      }
    }
  });
  return !!(r.isConfirmed && r.value);
};
window.deleteWithApproval = async function (opts) {
  const {
    user,
    action,
    payload = {},
    entityLabel,
    targetName = "",
    targetInfo = "",
    project = "",
    confirmHtml,
    warnHtml
  } = opts || {};
  if (!user) {
    Swal.fire({
      icon: "error",
      title: "ไม่พบข้อมูลผู้ใช้งาน"
    });
    return false;
  }
  const label = entityLabel || "ข้อมูล";
  const nameLine = targetName ? `<b>${targetName}</b>` : "";
  const infoLine = targetInfo ? `<div style="color:#64748B;font-size:13px;margin-top:2px">${targetInfo}</div>` : "";
  if (user.role === "Admin") {
    const r = await Swal.fire({
      title: `ลบ${label}?`,
      html: confirmHtml || `${nameLine}${infoLine}<div style="color:#64748B;font-size:13px;margin-top:6px">${warnHtml || "การลบไม่สามารถกู้คืนได้"}</div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ลบเลย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#EF4444"
    });
    if (!r.isConfirmed) return false;
    const ok = await window.confirmWithPassword(user, {
      html: `ยืนยันการลบ<b> ${label}${targetName ? " · " + targetName : ""}</b><div style="margin-top:4px">การลบไม่สามารถกู้คืนได้</div>`
    });
    if (!ok) return false;
    try {
      const res = await window.api(action, {
        ...payload,
        role: "Admin",
        by: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        targetName
      });
      window.applyDeleteLocally(action, payload);
      Swal.fire({
        icon: "success",
        title: "ลบข้อมูลแล้ว",
        timer: 1300,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
      return res || true;
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: err.message
      });
      return false;
    }
  }
  const r = await Swal.fire({
    title: "ขออนุมัติลบข้อมูล",
    html: `<div style="text-align:left;font-size:14px">
             <div style="background:#FEF3C7;border:1px solid #FDE68A;color:#92400E;border-radius:8px;padding:10px 12px;margin-bottom:12px">
               <i class="fa-solid fa-shield-halved" style="margin-right:6px"></i>
               การลบข้อมูลต้องได้รับอนุมัติจากผู้ดูแลระบบ (Admin) ก่อนเสมอ
             </div>
             <div style="color:#64748B;font-size:12px">รายการที่ขอลบ</div>
             <div style="margin-top:2px">${label}${nameLine ? " · " + nameLine : ""}</div>
             ${infoLine}
           </div>`,
    input: "textarea",
    inputLabel: "เหตุผลที่ต้องการลบ",
    inputPlaceholder: "ระบุเหตุผล เช่น บันทึกซ้ำ / กรอกผิด / ยกเลิกงาน",
    inputAttributes: {
      "aria-label": "เหตุผลที่ต้องการลบ"
    },
    inputValidator: v => !String(v || "").trim() ? "กรุณาระบุเหตุผลที่ต้องการลบ" : null,
    showCancelButton: true,
    confirmButtonText: "ส่งคำขออนุมัติ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#2563EB"
  });
  if (!r.isConfirmed) return false;
  try {
    await window.api("requestDelete", {
      req: {
        action,
        payload,
        entityLabel: label,
        targetName,
        targetInfo,
        project: project || window.getActiveProject(user) || "",
        reason: r.value,
        requesterId: user.id,
        requesterName: user.name,
        requesterRole: user.role
      }
    });
    Swal.fire({
      icon: "success",
      title: "ส่งคำขอลบแล้ว",
      html: `ระบบแจ้งผู้ดูแลระบบ (Admin) แล้ว<br/><span style="color:#64748B;font-size:13px">ข้อมูลจะถูกลบเมื่อได้รับอนุมัติ · ติดตามได้ที่เมนู "การแจ้งเตือน"</span>`,
      confirmButtonText: "รับทราบ"
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "ส่งคำขอไม่สำเร็จ",
      text: err.message
    });
  }
  return false;
};

/* ---- block 4 (ต้นฉบับบรรทัด 2299) ---- */
const DELREQ_STATUS = {
  pending: {
    label: "รออนุมัติ",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "fa-hourglass-half"
  },
  approved: {
    label: "อนุมัติแล้ว",
    color: "#047857",
    bg: "#D1FAE5",
    icon: "fa-circle-check"
  },
  rejected: {
    label: "ไม่อนุมัติ",
    color: "#B91C1C",
    bg: "#FEE2E2",
    icon: "fa-circle-xmark"
  }
};
const escReq = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function DeleteApprovals({
  user
}) {
  const {
    mine
  } = window.useDeleteRequests(user);
  const [tab, setTab] = React.useState("pending");
  const [busy, setBusy] = React.useState("");
  const [q, setQ] = React.useState("");
  const isAdmin = user.role === "Admin";
  React.useEffect(() => {
    window.__DELREQ.markSeen(user);
  }, [user && user.id]);
  const counts = {
    pending: mine.filter(r => r.status === "pending").length,
    approved: mine.filter(r => r.status === "approved").length,
    rejected: mine.filter(r => r.status === "rejected").length
  };
  const kw = q.trim().toLowerCase();
  const rows = mine.filter(r => tab === "all" || r.status === tab).filter(r => !kw || [r.entityLabel, r.targetName, r.targetInfo, r.requesterName, r.reason, r.project].some(v => String(v || "").toLowerCase().includes(kw)));
  const approve = async r => {
    const isEdit = r.kind === "edit";
    const changeHtml = isEdit && (r.changes || []).length ? `<div style="margin-top:8px;color:#64748B;font-size:12px">สิ่งที่จะเปลี่ยน</div>
         <div style="max-height:170px;overflow:auto;margin-top:2px">${(r.changes || []).map(c => `
           <div style="padding:5px 0;border-bottom:1px dashed #E2E8F0">
             <div style="font-size:12px;color:#64748B">${escReq(c.label)}</div>
             <div style="font-size:13px"><span style="color:#B91C1C;text-decoration:line-through">${escReq(c.from)}</span>
               <i class="fa-solid fa-arrow-right" style="margin:0 6px;color:#94A3B8;font-size:10px"></i>
               <span style="color:#047857;font-weight:500">${escReq(c.to)}</span></div>
           </div>`).join("")}</div>` : "";
    const res = await Swal.fire({
      title: isEdit ? "อนุมัติให้แก้ไขข้อมูล?" : "อนุมัติให้ลบข้อมูล?",
      html: `<div style="text-align:left;font-size:14px">
              <div><b>${escReq(r.entityLabel || "ข้อมูล")}</b> · ${escReq(r.targetName || "-")}</div>
              <div style="color:#64748B;font-size:13px;margin-top:4px">ผู้ขอ: ${escReq(r.requesterName || "-")} (${escReq(r.requesterRole || "-")})</div>
              <div style="color:#64748B;font-size:13px">เหตุผล: ${escReq(r.reason || "-")}</div>
              ${changeHtml}
              <div style="color:${isEdit ? "#1D4ED8" : "#B91C1C"};font-size:13px;margin-top:8px">${isEdit ? "เมื่ออนุมัติ ข้อมูลจะถูกแก้ตามรายการด้านบนทันที" : "เมื่ออนุมัติ ข้อมูลจะถูกลบทันทีและกู้คืนไม่ได้"}</div>
            </div>`,
      icon: "warning",
      showCancelButton: true,
      input: "text",
      inputLabel: "หมายเหตุ (ถ้ามี)",
      inputPlaceholder: "เช่น ตรวจสอบแล้วถูกต้อง",
      confirmButtonText: isEdit ? "อนุมัติและแก้ไข" : "อนุมัติและลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: isEdit ? "#2563EB" : "#EF4444"
    });
    if (!res.isConfirmed) return;
    if (!isEdit) {
      const ok = await window.confirmWithPassword(user, {
        html: `ยืนยันการอนุมัติลบ<b> ${escReq(r.entityLabel || "ข้อมูล")} · ${escReq(r.targetName || "-")}</b><div style="margin-top:4px">ข้อมูลจะถูกลบทันทีและกู้คืนไม่ได้</div>`,
        confirmText: "ยืนยันอนุมัติและลบ"
      });
      if (!ok) return;
    }
    setBusy(r.id);
    try {
      await window.api("approveDelete", {
        id: r.id,
        note: res.value || "",
        by: {
          id: user.id,
          name: user.name,
          role: user.role
        }
      });
      if (isEdit) window.applyEditLocally(r.action, r.payload || {});else window.applyDeleteLocally(r.action, r.payload || {});
      Swal.fire({
        icon: "success",
        title: isEdit ? "อนุมัติและแก้ไขข้อมูลแล้ว" : "อนุมัติและลบข้อมูลแล้ว",
        timer: 1600,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "อนุมัติไม่สำเร็จ",
        text: err.message
      });
    } finally {
      setBusy("");
    }
  };
  const reject = async r => {
    const res = await Swal.fire({
      title: "ไม่อนุมัติคำขอนี้?",
      html: `<div style="text-align:left;font-size:14px"><b>${r.entityLabel || "ข้อมูล"}</b> · ${r.targetName || "-"}<div style="color:#64748B;font-size:13px;margin-top:4px">ผู้ขอ: ${r.requesterName || "-"}</div></div>`,
      icon: "question",
      showCancelButton: true,
      input: "text",
      inputLabel: "เหตุผลที่ไม่อนุมัติ",
      inputPlaceholder: "แจ้งให้ผู้ขอทราบ",
      inputValidator: v => !String(v || "").trim() ? "กรุณาระบุเหตุผล" : null,
      confirmButtonText: "ไม่อนุมัติ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#64748B"
    });
    if (!res.isConfirmed) return;
    setBusy(r.id);
    try {
      await window.api("rejectDelete", {
        id: r.id,
        note: res.value || "",
        by: {
          id: user.id,
          name: user.name,
          role: user.role
        }
      });
      Swal.fire({
        icon: "success",
        title: "บันทึกแล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    } finally {
      setBusy("");
    }
  };
  const canPush = typeof Notification !== "undefined";
  const [pushState, setPushState] = React.useState(canPush ? Notification.permission : "unsupported");
  const enablePush = async () => {
    try {
      const p = await Notification.requestPermission();
      setPushState(p);
    } catch (e) {}
  };
  const tabs = [{
    key: "pending",
    label: "รออนุมัติ",
    n: counts.pending
  }, {
    key: "approved",
    label: "อนุมัติแล้ว",
    n: counts.approved
  }, {
    key: "rejected",
    label: "ไม่อนุมัติ",
    n: counts.rejected
  }, {
    key: "all",
    label: "ทั้งหมด",
    n: mine.length
  }];
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, React.createElement("div", {
    className: "card-body",
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 11,
      display: "grid",
      placeItems: "center",
      background: "#FEF3C7",
      color: "#B45309",
      flex: "0 0 auto"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-shield-halved"
  })), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, isAdmin ? "คำขออนุมัติลบ / แก้ไขข้อมูล" : "คำขอของฉัน"), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      marginTop: 2
    }
  }, isAdmin ? "การลบข้อมูลของผู้ใช้งานอื่น และการแก้ไขใบแจ้งซ่อมของผู้แจ้ง ต้องผ่านการอนุมัติที่นี่ · ข้อมูลจะเปลี่ยนเมื่อกดอนุมัติเท่านั้น" : "การลบข้อมูล และการแก้ไขใบแจ้งซ่อม ต้องได้รับอนุมัติจากผู้ดูแลระบบ (Admin) ก่อน")), isAdmin && canPush && pushState === "default" && React.createElement("button", {
    className: "btn btn-ghost",
    onClick: enablePush,
    title: "\u0E40\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C"
  }, React.createElement("i", {
    className: "fa-solid fa-bell"
  }), " \u0E40\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C"), isAdmin && canPush && pushState === "granted" && React.createElement("span", {
    className: "badge",
    style: {
      background: "#D1FAE5",
      color: "#047857"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-bell",
    style: {
      marginRight: 5
    }
  }), "\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E22\u0E39\u0E48"))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, tabs.map(t => React.createElement("button", {
    key: t.key,
    className: `btn btn-sm ${tab === t.key ? "btn-primary" : "btn-ghost"}`,
    onClick: () => setTab(t.key)
  }, t.label, t.n > 0 && React.createElement("span", {
    style: {
      marginLeft: 6,
      opacity: .85
    }
  }, "(", t.n, ")")))), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E0A\u0E19\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 / \u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 / \u0E1C\u0E39\u0E49\u0E02\u0E2D / \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25..."
  }))), React.createElement("div", {
    className: "card-body",
    style: {
      display: "grid",
      gap: 12
    }
  }, rows.length === 0 && React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-inbox"
  }), React.createElement("div", {
    className: "t"
  }, tab === "pending" ? "ไม่มีคำขอรออนุมัติ" : "ไม่มีรายการ"), React.createElement("div", null, isAdmin ? "เมื่อมีผู้ใช้งานขอลบหรือขอแก้ไขข้อมูล จะแสดงที่นี่ทันที" : "คำขอลบ/แก้ไขข้อมูลของคุณจะแสดงที่นี่")), rows.map(r => {
    const st = DELREQ_STATUS[r.status] || DELREQ_STATUS.pending;
    const isEdit = r.kind === "edit";
    return React.createElement("div", {
      key: r.id,
      style: {
        border: "1px solid var(--line)",
        borderLeft: `4px solid ${st.color}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "#fff"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        flexWrap: "wrap"
      }
    }, React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 240
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
      }
    }, React.createElement("span", {
      className: "badge",
      style: {
        background: st.bg,
        color: st.color
      }
    }, React.createElement("i", {
      className: `fa-solid ${st.icon}`,
      style: {
        marginRight: 5
      }
    }), st.label), React.createElement("span", {
      className: "badge",
      style: isEdit ? {
        background: "#DBEAFE",
        color: "#1D4ED8"
      } : {
        background: "#FEE2E2",
        color: "#B91C1C"
      }
    }, React.createElement("i", {
      className: `fa-solid ${isEdit ? "fa-pen" : "fa-trash"}`,
      style: {
        marginRight: 5
      }
    }), isEdit ? "ขอแก้ไข" : "ขอลบ"), React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, r.entityLabel || "ข้อมูล"), r.targetName && React.createElement("span", {
      style: {
        color: "var(--text)"
      }
    }, "\xB7 ", r.targetName), r.project && React.createElement("span", {
      className: "badge",
      style: {
        background: "#EFF6FF",
        color: "#1E40AF"
      },
      title: r.project
    }, window.projectShort(r.project))), r.targetInfo && React.createElement("div", {
      style: {
        color: "var(--muted)",
        fontSize: 13,
        marginTop: 3
      }
    }, r.targetInfo), React.createElement("div", {
      style: {
        fontSize: 13,
        marginTop: 6
      }
    }, React.createElement("i", {
      className: "fa-solid fa-user",
      style: {
        color: "var(--muted)",
        marginRight: 6
      }
    }), r.requesterName || "-", " ", React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "(", r.requesterRole || "-", ")"), React.createElement("span", {
      style: {
        color: "var(--muted)",
        marginLeft: 10
      }
    }, React.createElement("i", {
      className: "fa-regular fa-clock",
      style: {
        marginRight: 5
      }
    }), window.__DATA.fmtDateTime(r.requestedAt))), React.createElement("div", {
      style: {
        fontSize: 13,
        marginTop: 4,
        background: "#F8FAFC",
        border: "1px solid var(--line-soft)",
        borderRadius: 8,
        padding: "7px 10px"
      }
    }, React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25:"), " ", r.reason || "-"), isEdit && (r.changes || []).length > 0 && React.createElement("div", {
      style: {
        marginTop: 6,
        border: "1px solid var(--line-soft)",
        borderRadius: 8,
        padding: "7px 10px",
        background: "#FAFBFC"
      }
    }, React.createElement("div", {
      style: {
        color: "var(--muted)",
        fontSize: 12,
        marginBottom: 3
      }
    }, "\u0E2A\u0E34\u0E48\u0E07\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E41\u0E01\u0E49 (", r.changes.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)"), r.changes.map((c, i) => React.createElement("div", {
      key: i,
      style: {
        fontSize: 12.5,
        padding: "3px 0",
        borderBottom: i < r.changes.length - 1 ? "1px dashed var(--line)" : "none"
      }
    }, React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, c.label, ": "), React.createElement("span", {
      style: {
        color: "#B91C1C",
        textDecoration: "line-through"
      }
    }, c.from), React.createElement("i", {
      className: "fa-solid fa-arrow-right",
      style: {
        margin: "0 6px",
        color: "var(--muted)",
        fontSize: 10
      }
    }), React.createElement("span", {
      style: {
        color: "#047857",
        fontWeight: 500
      }
    }, c.to)))), r.status !== "pending" && React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--muted)",
        marginTop: 6
      }
    }, React.createElement("i", {
      className: `fa-solid ${st.icon}`,
      style: {
        marginRight: 5,
        color: st.color
      }
    }), st.label, "\u0E42\u0E14\u0E22 ", r.decidedByName || "-", " \xB7 ", window.__DATA.fmtDateTime(r.decidedAt), r.decideNote ? ` · ${r.decideNote}` : ""), r.status === "pending" && r.lastError && React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "#B91C1C",
        marginTop: 6
      }
    }, React.createElement("i", {
      className: "fa-solid fa-triangle-exclamation",
      style: {
        marginRight: 5
      }
    }), "\u0E25\u0E1A\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E04\u0E23\u0E31\u0E49\u0E07\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14: ", r.lastError)), isAdmin && r.status === "pending" && React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, React.createElement("button", {
      className: "btn btn-sm btn-ghost",
      disabled: busy === r.id,
      onClick: () => reject(r)
    }, React.createElement("i", {
      className: "fa-solid fa-xmark"
    }), " \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"), React.createElement("button", {
      className: "btn btn-sm btn-primary",
      disabled: busy === r.id,
      style: isEdit ? undefined : {
        background: "#EF4444",
        borderColor: "#EF4444"
      },
      onClick: () => approve(r)
    }, busy === r.id ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "spinner",
      style: {
        width: 13,
        height: 13,
        borderWidth: 2
      }
    }), " ", isEdit ? "กำลังแก้ไข..." : "กำลังลบ...") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-check"
    }), " ", isEdit ? "อนุมัติและแก้ไข" : "อนุมัติและลบ")))));
  }))));
}
window.DeleteApprovals = DeleteApprovals;

/* ---- block 5 (ต้นฉบับบรรทัด 2535) ---- */
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
function Badge({
  status
}) {
  const s = window.getStatus(status);
  return React.createElement("span", {
    className: `badge ${s.className}`
  }, React.createElement("span", {
    className: "dot"
  }), s.label);
}
function CategoryChip({
  categoryId
}) {
  const c = window.getCategory(categoryId);
  return React.createElement("span", {
    className: "cat-chip",
    style: {
      background: c.color + "22",
      color: c.color
    }
  }, React.createElement("i", {
    className: `fa-solid ${c.icon}`
  }), c.name);
}
function Avatar({
  name,
  size = 28
}) {
  const bg = window.avatarColor(name);
  return React.createElement("span", {
    className: "avatar-xs",
    style: {
      background: bg,
      width: size,
      height: size
    }
  }, window.initials(name));
}
function ProblemLines({
  title,
  max = 0
}) {
  const list = String(title || "").split("\n").map(s => s.trim()).filter(Boolean);
  if (!list.length) return React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u2014");
  const shown = max > 0 ? list.slice(0, max) : list;
  return React.createElement("div", {
    style: {
      display: "grid",
      gap: 3
    }
  }, shown.map((t, i) => React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 5,
      alignItems: "baseline",
      lineHeight: 1.4,
      overflowWrap: "anywhere",
      wordBreak: "break-word"
    }
  }, list.length > 1 && React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 11.5,
      flexShrink: 0
    }
  }, i + 1, "."), React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, t))), shown.length < list.length && React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 11.5
    }
  }, "+ \u0E2D\u0E35\u0E01 ", list.length - shown.length, " \u0E2D\u0E32\u0E01\u0E32\u0E23"));
}
function ProjectLabel({
  name
}) {
  if (!name) return React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u2014");
  const short = window.projectShort(name);
  const isCode = short !== name;
  return React.createElement("span", {
    className: isCode ? "mono" : "",
    title: name,
    style: isCode ? {
      fontWeight: 500
    } : undefined
  }, short);
}
function SubSiteField({
  project,
  value,
  onChange,
  className = "form-field",
  style,
  label,
  hint,
  disabled,
  placeholder,
  showWhenEmpty
}) {
  const sites = window.projectSites(project);
  const legacy = value && !sites.includes(value);
  if (!sites.length && !legacy && !showWhenEmpty) return null;
  const empty = !sites.length && !legacy;
  return React.createElement("div", {
    className: className,
    style: style
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), label || "ไซต์งานย่อย"), React.createElement("select", {
    value: value || "",
    onChange: e => onChange(e.target.value),
    disabled: disabled || empty
  }, React.createElement("option", {
    value: ""
  }, empty ? project ? "— โครงการนี้ยังไม่มีไซต์งานย่อย —" : "— เลือกโครงการก่อน —" : placeholder || "— ทั้งโครงการ (ไม่ระบุไซต์) —"), sites.map(s => React.createElement("option", {
    key: s,
    value: s
  }, s)), legacy && React.createElement("option", {
    value: value
  }, value, " (\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27)")), empty && project ? React.createElement("div", {
    className: "hint",
    style: {
      color: "#B45309"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info",
    style: {
      marginRight: 5
    }
  }), "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22 (\u0E40\u0E0A\u0E48\u0E19 Rig1, Rig2) \u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E40\u0E21\u0E19\u0E39 ", React.createElement("b", null, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), " \u2192 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49 \u2192 \u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22") : hint && React.createElement("div", {
    className: "hint"
  }, hint));
}
function SubSiteTag({
  value,
  project,
  style
}) {
  if (!value) return null;
  const p = (window.__DATA.projects || []).find(x => x.name === project);
  const c = p && p.color || "#7C3AED";
  return React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "1px 8px",
      borderRadius: 6,
      background: c + "18",
      color: c,
      fontSize: 11.5,
      fontWeight: 500,
      whiteSpace: "nowrap",
      ...(style || {})
    }
  }, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      fontSize: 9,
      opacity: .8
    }
  }), value);
}
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = ""
}) {
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return React.createElement("div", {
    className: "modal-scrim",
    onClick: onClose
  }, React.createElement("div", {
    className: `modal ${size}`,
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    className: "modal-h"
  }, React.createElement("h3", null, title), React.createElement("button", {
    className: "close",
    onClick: onClose
  }, React.createElement("i", {
    className: "fa-solid fa-xmark"
  }))), React.createElement("div", {
    className: "modal-b"
  }, children), footer && React.createElement("div", {
    className: "modal-f"
  }, footer)));
}
function Loading({
  show,
  text = "กำลังโหลด..."
}) {
  if (!show) return null;
  return React.createElement("div", {
    className: "loading-scrim"
  }, React.createElement("div", {
    className: "loading-box"
  }, React.createElement("div", {
    className: "spinner"
  }), React.createElement("span", null, text)));
}
function simulate(ms = 500) {
  return new Promise(r => setTimeout(r, ms));
}
Object.assign(window, {
  Badge,
  CategoryChip,
  Avatar,
  ProjectLabel,
  Modal,
  Loading,
  simulate
});

/* ---- block 6 (ต้นฉบับบรรทัด 2638) ---- */
function InstallAppButton() {
  const [, force] = React.useReducer(x => x + 1, 0);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => window.__pwa.on(force), []);
  const pwa = window.__pwa;
  if (pwa.isStandalone() || pwa.installed) return null;
  const canInstallNow = !!pwa.prompt;
  if (!canInstallNow && !pwa.isMobile()) return null;
  const iosHowTo = () => Swal.fire({
    icon: "info",
    title: "ติดตั้งบน iPhone / iPad",
    html: `<div style="text-align:left;font-size:14px;line-height:1.9">
            <div>1. กดปุ่ม <b>แชร์</b> <i class="fa-solid fa-arrow-up-from-bracket" style="color:#1E40AF"></i> ที่แถบล่างของ Safari</div>
            <div>2. เลื่อนหาแล้วกด <b>เพิ่มไปยังหน้าจอโฮม</b></div>
            <div>3. กด <b>เพิ่ม</b> มุมขวาบน</div>
            <div style="margin-top:10px;color:#64748B;font-size:13px">
              จะได้ไอคอนแอปบนหน้าจอ เปิดใช้งานได้เหมือนแอปทั่วไป
            </div>
          </div>`,
    confirmButtonText: "เข้าใจแล้ว",
    confirmButtonColor: "#1E40AF"
  });
  const androidHowTo = () => Swal.fire({
    icon: "info",
    title: "ติดตั้งแอป",
    html: `<div style="text-align:left;font-size:14px;line-height:1.9">
            <div>1. กดปุ่มเมนู <b>⋮</b> มุมขวาบนของเบราว์เซอร์</div>
            <div>2. เลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></div>
            <div style="margin-top:10px;color:#64748B;font-size:13px">
              ถ้าไม่เจอเมนูนี้ ให้เปิดเว็บด้วย Chrome แล้วลองใหม่อีกครั้ง
            </div>
          </div>`,
    confirmButtonText: "เข้าใจแล้ว",
    confirmButtonColor: "#1E40AF"
  });
  const click = async () => {
    if (pwa.isIOS()) return iosHowTo();
    if (!canInstallNow) return androidHowTo();
    setBusy(true);
    try {
      const outcome = await pwa.install();
      if (outcome === "accepted") {
        Swal.fire({
          icon: "success",
          title: "ติดตั้งแอปแล้ว",
          text: "เปิดใช้งานจากไอคอนบนหน้าจอมือถือได้เลย",
          timer: 2600,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      } else if (outcome === "unavailable") {
        androidHowTo();
      }
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("button", {
    type: "button",
    onClick: click,
    disabled: busy,
    style: {
      width: "100%",
      marginTop: 12,
      padding: "12px 14px",
      borderRadius: 12,
      border: "1.5px solid var(--primary)",
      background: "var(--accent-soft)",
      color: "var(--primary)",
      fontFamily: "Kanit",
      fontSize: 14.5,
      fontWeight: 500,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 9
    }
  }, React.createElement("i", {
    className: `fa-solid ${busy ? "fa-spinner fa-spin" : "fa-mobile-screen-button"}`
  }), canInstallNow ? "ติดตั้งแอปบนมือถือ" : "เปิดบนมือถือ · วิธีติดตั้งแอป");
}
function Login({
  onLogin
}) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const submit = async e => {
    e?.preventDefault();
    setLoading(true);
    try {
      const u = await window.api("login", {
        username,
        password
      });
      setLoading(false);
      onLogin(u);
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        text: err.message || "กรุณาตรวจสอบ Username และ Password",
        confirmButtonColor: "#1E40AF"
      });
    }
  };
  const [showPw, setShowPw] = React.useState(false);
  const modules = window.__DATA && window.__DATA.erpSystems || [];
  return React.createElement("div", {
    className: "ow-login"
  }, React.createElement(Loading, {
    show: loading,
    text: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A..."
  }), React.createElement("div", {
    className: "ow-brand"
  }, React.createElement("div", {
    className: "ow-aurora"
  }), React.createElement("div", {
    className: "ow-grid-bg"
  }), React.createElement("div", {
    className: "ow-top"
  }, React.createElement("div", {
    className: "ow-logo"
  }, React.createElement("div", {
    className: "ow-logo-mark is-img"
  }, React.createElement("img", {
    src: window.PNM_LOGO_DATAURL,
    alt: "\u0E42\u0E25\u0E42\u0E01\u0E49 \u0E1E\u0E32\u0E19\u0E32\u0E21\u0E13\u0E35"
  })), React.createElement("div", null, React.createElement("div", {
    className: "ow-logo-name"
  }, "One Workspace"), React.createElement("div", {
    className: "ow-logo-sub"
  }, "Unified Operations Platform")))), React.createElement("div", {
    className: "ow-hero"
  }, React.createElement("span", {
    className: "ow-eyebrow"
  }, React.createElement("i", {
    className: "fa-solid fa-sparkles"
  }), " \u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E04\u0E23\u0E1A\u0E17\u0E38\u0E01\u0E07\u0E32\u0E19"), React.createElement("h1", null, "\u0E17\u0E38\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19", React.createElement("br", null), "\u0E23\u0E27\u0E21\u0E44\u0E27\u0E49\u0E43\u0E19", React.createElement("span", {
    className: "ow-accent"
  }, " \u0E17\u0E35\u0E48\u0E40\u0E14\u0E35\u0E22\u0E27")), React.createElement("p", null, "\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 \u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19 \u0E04\u0E25\u0E31\u0E07 \u0E08\u0E31\u0E14\u0E0B\u0E37\u0E49\u0E2D \u0E41\u0E25\u0E30\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23 \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E01\u0E31\u0E19\u0E1A\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E17\u0E33\u0E07\u0E32\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27 \u2014 \u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E17\u0E38\u0E01\u0E42\u0E21\u0E14\u0E39\u0E25"), React.createElement("div", {
    className: "ow-modules"
  }, modules.map(m => {
    const ready = m.status === "ready";
    return React.createElement("div", {
      key: m.id,
      className: `ow-mod ${ready ? "is-ready" : "is-soon"}`
    }, React.createElement("span", {
      className: "ow-mod-icon"
    }, React.createElement("i", {
      className: `fa-solid ${m.icon}`
    })), React.createElement("span", {
      className: "ow-mod-name"
    }, m.name), ready ? React.createElement("span", {
      className: "ow-mod-dot",
      title: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
    }) : React.createElement("span", {
      className: "ow-mod-soon"
    }, "\u0E40\u0E23\u0E47\u0E27\u0E46\u0E19\u0E35\u0E49"));
  }))), React.createElement("div", {
    className: "ow-foot"
  }, React.createElement("span", null, React.createElement("i", {
    className: "fa-solid fa-shield-halved"
  }), " \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Firebase \u0E41\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E25\u0E44\u0E17\u0E21\u0E4C"), React.createElement("span", null, "\xA9 2026 \xB7 v3.011"))), React.createElement("div", {
    className: "ow-auth"
  }, React.createElement("form", {
    className: "ow-card",
    onSubmit: submit
  }, React.createElement("div", {
    className: "ow-card-badge is-img"
  }, React.createElement("img", {
    src: window.PNM_LOGO_DATAURL,
    alt: "\u0E42\u0E25\u0E42\u0E01\u0E49 \u0E1E\u0E32\u0E19\u0E32\u0E21\u0E13\u0E35"
  })), React.createElement("h2", null, "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E17\u0E33\u0E07\u0E32\u0E19"), React.createElement("p", {
    className: "ow-card-sub"
  }, "\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19\u0E41\u0E25\u0E30\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13"), React.createElement("label", {
    className: "ow-field"
  }, React.createElement("span", {
    className: "ow-field-label"
  }, "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49"), React.createElement("span", {
    className: "ow-input"
  }, React.createElement("i", {
    className: "fa-solid fa-user"
  }), React.createElement("input", {
    type: "text",
    value: username,
    onChange: e => setUsername(e.target.value),
    placeholder: "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49",
    autoComplete: "username"
  }))), React.createElement("label", {
    className: "ow-field"
  }, React.createElement("span", {
    className: "ow-field-label"
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"), React.createElement("span", {
    className: "ow-input"
  }, React.createElement("i", {
    className: "fa-solid fa-lock"
  }), React.createElement("input", {
    type: showPw ? "text" : "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19",
    autoComplete: "current-password"
  }), React.createElement("button", {
    type: "button",
    className: "ow-eye",
    onClick: () => setShowPw(v => !v),
    title: showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน",
    "aria-label": "\u0E2A\u0E25\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"
  }, React.createElement("i", {
    className: `fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`
  })))), React.createElement("button", {
    className: "ow-submit",
    type: "submit"
  }, React.createElement("i", {
    className: "fa-solid fa-arrow-right-to-bracket"
  }), " \u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A"), React.createElement(InstallAppButton, null), React.createElement("div", {
    className: "ow-hint"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info"
  }), React.createElement("span", null, "\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A \u0E04\u0E38\u0E13\u0E08\u0E30\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35")))));
}
window.Login = Login;

/* ---- block 7 (ต้นฉบับบรรทัด 2821) ---- */
function ChangePasswordModal({
  user,
  onClose
}) {
  const [oldPw, setOldPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showOld, setShowOld] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const inSt = {
    width: "100%",
    padding: "10px 40px 10px 12px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontFamily: "Kanit",
    fontSize: 14,
    outline: "none",
    background: "#fff"
  };
  const eyeBtn = (show, toggle) => React.createElement("button", {
    type: "button",
    onClick: toggle,
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--muted)",
      padding: 4,
      lineHeight: 1
    }
  }, React.createElement("i", {
    className: `fa-solid ${show ? "fa-eye-slash" : "fa-eye"}`
  }));
  const submit = async () => {
    if (!oldPw || !newPw || !confirmPw) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูลให้ครบทุกช่อง"
      });
      return;
    }
    if (newPw.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "รหัสผ่านใหม่สั้นเกินไป",
        text: "ต้องมีอย่างน้อย 6 ตัวอักษร"
      });
      return;
    }
    if (newPw !== confirmPw) {
      Swal.fire({
        icon: "warning",
        title: "รหัสผ่านใหม่ไม่ตรงกัน",
        text: "กรุณากรอกรหัสผ่านใหม่และยืนยันให้ตรงกัน"
      });
      return;
    }
    setLoading(true);
    try {
      await window.api("login", {
        username: user.username,
        password: oldPw
      });
      await window.api("updateUser", {
        id: user.id,
        patch: {
          password: newPw
        }
      });
      setLoading(false);
      onClose();
      Swal.fire({
        icon: "success",
        title: "เปลี่ยนรหัสผ่านสำเร็จ",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      setLoading(false);
      const msg = /Username หรือ Password/i.test(err.message) ? "รหัสผ่านเดิมไม่ถูกต้อง" : err.message;
      Swal.fire({
        icon: "error",
        title: "ไม่สำเร็จ",
        text: msg
      });
    }
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-key",
      style: {
        color: "var(--primary)",
        marginRight: 8
      }
    }), "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"),
    size: "sm",
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose,
      disabled: loading
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit,
      disabled: loading
    }, loading ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "spinner",
      style: {
        width: 14,
        height: 14,
        borderWidth: 2
      }
    }), " \u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01...") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-check"
    }), " \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19")))
  }, React.createElement("div", {
    style: {
      display: "grid",
      gap: 14
    }
  }, React.createElement("div", {
    style: {
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 13,
      color: "#1E40AF"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-user",
    style: {
      marginRight: 6
    }
  }), "\u0E1A\u0E31\u0E0D\u0E0A\u0E35: ", React.createElement("strong", null, user.username), " \xB7 ", user.name), React.createElement("div", null, React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      display: "block",
      marginBottom: 5
    }
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E14\u0E34\u0E21 ", React.createElement("span", {
    style: {
      color: "#EF4444"
    }
  }, "*")), React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("input", {
    style: inSt,
    type: showOld ? "text" : "password",
    value: oldPw,
    onChange: e => setOldPw(e.target.value),
    placeholder: "\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E14\u0E34\u0E21",
    autoComplete: "current-password"
  }), eyeBtn(showOld, () => setShowOld(v => !v)))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      display: "block",
      marginBottom: 5
    }
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 ", React.createElement("span", {
    style: {
      color: "#EF4444"
    }
  }, "*"), " ", React.createElement("span", {
    style: {
      fontWeight: 400
    }
  }, "(\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 6 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23)")), React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("input", {
    style: inSt,
    type: showNew ? "text" : "password",
    value: newPw,
    onChange: e => setNewPw(e.target.value),
    placeholder: "\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48",
    autoComplete: "new-password"
  }), eyeBtn(showNew, () => setShowNew(v => !v)))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      display: "block",
      marginBottom: 5
    }
  }, "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 ", React.createElement("span", {
    style: {
      color: "#EF4444"
    }
  }, "*")), React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("input", {
    style: {
      ...inSt,
      borderColor: confirmPw && confirmPw !== newPw ? "#EF4444" : "var(--line)"
    },
    type: showNew ? "text" : "password",
    value: confirmPw,
    onChange: e => setConfirmPw(e.target.value),
    placeholder: "\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
    autoComplete: "new-password"
  }), confirmPw && confirmPw === newPw && React.createElement("i", {
    className: "fa-solid fa-circle-check",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#10B981",
      pointerEvents: "none"
    }
  }), confirmPw && confirmPw !== newPw && React.createElement("i", {
    className: "fa-solid fa-circle-xmark",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#EF4444",
      pointerEvents: "none"
    }
  })), confirmPw && confirmPw !== newPw && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#EF4444",
      marginTop: 4
    }
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19"))));
}
function Sidebar({
  user,
  active,
  onNav,
  onLogout,
  open,
  onClose
}) {
  const [changePwModal, setChangePwModal] = React.useState(false);
  const delReq = window.useDeleteRequests(user);
  const isAdminish = ["Admin", "Officer", "Director"].includes(user.role);
  const isTech = ["Technician", "Engineer"].includes(user.role);
  const isSafety = user.role === "Safety Officer";
  const systemId = user.activeErp?.id || "repairs";
  const adminNav = [{
    key: "dashboard",
    icon: "fa-gauge-high",
    label: "แดชบอร์ด"
  }, {
    key: "repairs",
    icon: "fa-clipboard-list",
    label: "รายการแจ้งซ่อม",
    badge: window.__DATA.repairs.filter(r => ["new", "assess"].includes(r.status)).length
  }, {
    key: "spare-parts",
    icon: "fa-box-open",
    label: "อะไหล่ที่ใช้ซ่อม"
  }, {
    key: "machines",
    icon: "fa-industry",
    label: "ทะเบียนเครื่องจักร"
  }, {
    key: "users",
    icon: "fa-users-gear",
    label: "จัดการผู้ใช้งาน"
  }, {
    key: "categories",
    icon: "fa-tags",
    label: "จัดการหมวดหมู่"
  }, ...(user.role === "Admin" ? [{
    key: "login-logs",
    icon: "fa-shield-halved",
    label: "ประวัติการล็อกอิน"
  }] : [])];
  const techNav = [{
    key: "dashboard",
    icon: "fa-gauge-high",
    label: "แดชบอร์ด"
  }, {
    key: "repairs",
    icon: "fa-clipboard-list",
    label: "งานที่รับผิดชอบ"
  }, {
    key: "spare-parts",
    icon: "fa-box-open",
    label: "อะไหล่ที่ใช้ซ่อม"
  }, {
    key: "machines",
    icon: "fa-industry",
    label: "ทะเบียนเครื่องจักร"
  }];
  const reporterNav = [{
    key: "dashboard",
    icon: "fa-gauge-high",
    label: "แดชบอร์ด"
  }, {
    key: "r-dashboard",
    icon: "fa-chart-pie",
    label: "สรุปงานของฉัน"
  }, {
    key: "r-new",
    icon: "fa-circle-plus",
    label: "แจ้งซ่อมใหม่"
  }, {
    key: "r-mine",
    icon: "fa-clipboard-check",
    label: "ติดตามสถานะ"
  }, {
    key: "machines",
    icon: "fa-industry",
    label: "ทะเบียนเครื่องจักร"
  }, {
    key: "spare-parts",
    icon: "fa-box-open",
    label: "อะไหล่ที่ใช้ซ่อม"
  }];
  const safetyNav = [{
    key: "dashboard",
    icon: "fa-gauge-high",
    label: "แดชบอร์ด"
  }, {
    key: "repairs",
    icon: "fa-clipboard-list",
    label: "รายการแจ้งซ่อม"
  }, {
    key: "r-new",
    icon: "fa-circle-plus",
    label: "แจ้งซ่อมใหม่"
  }, {
    key: "spare-parts",
    icon: "fa-box-open",
    label: "อะไหล่ที่ใช้ซ่อม"
  }, {
    key: "machines",
    icon: "fa-industry",
    label: "ทะเบียนเครื่องจักร"
  }];
  const safetyAssetNav = [{
    key: "doc-pj2",
    icon: "fa-certificate",
    label: "ปจ2-เอกสารรับรอง"
  }, {
    key: "machines",
    icon: "fa-industry",
    label: "ทะเบียนเครื่องจักร"
  }, {
    key: "transfer-history",
    icon: "fa-clock-rotate-left",
    label: "ประวัติการย้ายเครื่องจักร"
  }];
  const assetNav = [{
    key: "machines",
    icon: "fa-industry",
    label: "ทะเบียนเครื่องจักร"
  }, {
    key: "asset-registry",
    icon: "fa-boxes-stacked",
    label: "ทะเบียนทรัพย์สิน"
  }, {
    key: "asset-do",
    icon: "fa-file-export",
    label: "ใบส่งของ (DO)"
  }, {
    key: "doc-pj2",
    icon: "fa-certificate",
    label: "ปจ2-เอกสารรับรอง"
  }, {
    key: "transfer-history",
    icon: "fa-clock-rotate-left",
    label: "ประวัติการย้ายเครื่องจักร"
  }, {
    key: "projects",
    icon: "fa-diagram-project",
    label: "โครงการ"
  }];
  const consumeNav = [{
    key: "withdrawals",
    icon: "fa-file-invoice",
    label: "รายการเบิกของ"
  }];
  const nav = systemId === "assets" ? isSafety ? safetyAssetNav : assetNav : systemId === "consume" ? consumeNav : isSafety ? safetyNav : isAdminish ? adminNav : isTech ? techNav : reporterNav;
  return React.createElement(React.Fragment, null, open && React.createElement("div", {
    className: "sidebar-scrim show",
    onClick: onClose
  }), React.createElement("aside", {
    className: `sidebar ${open ? "open" : ""}`
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement("div", {
    className: "mark"
  }, React.createElement("i", {
    className: `fa-solid ${user.activeErp?.icon || "fa-screwdriver-wrench"}`
  })), React.createElement("div", {
    className: "t"
  }, user.activeErp?.name || "ระบบแจ้งซ่อม", React.createElement("small", null, systemId === "assets" ? "Asset Management" : systemId === "consume" ? "Consume / Stock" : "Machine Repair"))), React.createElement("nav", {
    className: "nav"
  }, React.createElement("div", {
    className: "section"
  }, "\u0E40\u0E21\u0E19\u0E39\u0E2B\u0E25\u0E31\u0E01"), nav.map(n => React.createElement("div", {
    key: n.key,
    className: `nav-item ${active === n.key ? "active" : ""}`,
    onClick: () => {
      onNav(n.key);
      onClose && onClose();
    }
  }, React.createElement("i", {
    className: `fa-solid ${n.icon}`
  }), React.createElement("span", null, n.label), n.badge > 0 && React.createElement("span", {
    className: "badge"
  }, n.badge))), React.createElement("div", {
    className: "section"
  }, "\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B"), React.createElement("div", {
    className: `nav-item ${active === "notifications" ? "active" : ""}`,
    onClick: () => {
      onNav("notifications");
      onClose && onClose();
    },
    title: user.role === "Admin" ? "คำขออนุมัติลบ / แก้ไขข้อมูล" : "สถานะคำขอลบ / แก้ไขข้อมูลของฉัน"
  }, React.createElement("i", {
    className: "fa-solid fa-bell"
  }), React.createElement("span", null, "\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19"), delReq.badge > 0 && React.createElement("span", {
    className: "badge",
    style: {
      background: "#FEE2E2",
      color: "#B91C1C"
    }
  }, delReq.badge)), React.createElement("div", {
    className: "nav-item",
    onClick: () => setChangePwModal(true)
  }, React.createElement("i", {
    className: "fa-solid fa-gear"
  }), React.createElement("span", null, "\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32"))), React.createElement("div", {
    className: "me"
  }, React.createElement("div", {
    className: "avatar"
  }, window.initials(user.name)), React.createElement("div", {
    className: "who"
  }, React.createElement("div", {
    className: "name"
  }, user.name), React.createElement("div", {
    className: "role"
  }, user.role, " \xB7 ", user.dept)), React.createElement("button", {
    className: "logout",
    onClick: onLogout,
    title: "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A"
  }, React.createElement("i", {
    className: "fa-solid fa-right-from-bracket"
  })))), changePwModal && React.createElement(ChangePasswordModal, {
    user: user,
    onClose: () => setChangePwModal(false)
  }));
}
window.Sidebar = Sidebar;

/* ---- block 8 (ต้นฉบับบรรทัด 2983) ---- */
function Projects({
  user
}) {
  const [rows, setRows] = React.useState(() => window.visibleProjects(user, {
    includeInactive: true
  }));
  const [edit, setEdit] = React.useState(null);
  const [q, setQ] = React.useState("");
  const filtered = rows.filter(p => {
    if (!q) return true;
    const kw = q.toLowerCase();
    return [p.name, p.shortName, p.code, p.desc, ...window.projectSites(p)].some(v => String(v || "").toLowerCase().includes(kw));
  });
  const syncCache = fn => {
    window.__DATA.projects = fn(window.__DATA.projects || []);
  };
  const save = async form => {
    try {
      if (form.id) {
        await window.api("updateProject", {
          id: form.id,
          patch: form
        });
        setRows(rows.map(x => x.id === form.id ? form : x));
        syncCache(all => all.map(x => x.id === form.id ? form : x));
      } else {
        const nu = await window.api("createProject", {
          project: form
        });
        setRows([...rows, nu]);
        syncCache(all => [...all, nu]);
      }
      setEdit(null);
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const del = async p => {
    const machineCount = (window.__DATA.machines || []).filter(m => m.project === p.name).length;
    const done = await window.deleteWithApproval({
      user,
      action: "deleteProject",
      payload: {
        id: p.id
      },
      entityLabel: "โครงการ",
      targetName: p.name,
      project: p.name,
      targetInfo: machineCount > 0 ? `มีเครื่องจักรในโครงการนี้ ${machineCount} รายการ` : ""
    });
    if (done) setRows(rows.filter(x => x.id !== p.id));
  };
  const STATUS_COLOR = {
    active: "#10B981",
    inactive: "#94A3B8"
  };
  const STATUS_LABEL = {
    active: "ดำเนินการ",
    inactive: "ปิดโครงการ"
  };
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E23\u0E2B\u0E31\u0E2A / \u0E0A\u0E37\u0E48\u0E2D\u0E22\u0E48\u0E2D / \u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E47\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("div", {
    className: "spacer"
  }), ["Admin", "Officer"].includes(user.role) && React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setEdit({
      name: "",
      shortName: "",
      code: "",
      desc: "",
      status: "active",
      color: "#3B82F6"
    })
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: 110
    }
  }, "\u0E23\u0E2B\u0E31\u0E2A"), React.createElement("th", {
    style: {
      width: 150
    }
  }, "\u0E0A\u0E37\u0E48\u0E2D\u0E22\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E47\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      width: 190
    }
  }, "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14"), React.createElement("th", {
    style: {
      width: 100
    }
  }, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("th", {
    style: {
      width: 80
    },
    className: "hide-on-mobile"
  }, "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("th", {
    style: {
      width: 80
    },
    className: "hide-on-mobile"
  }, "\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("th", {
    style: {
      width: 90
    }
  }, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, filtered.map(p => {
    const mCnt = (window.__DATA.machines || []).filter(m => m.project === p.name).length;
    const rCnt = (window.__DATA.repairs || []).filter(r => r.project === p.name).length;
    const sc = STATUS_COLOR[p.status] || "#94A3B8";
    const sites = window.projectSites(p);
    return React.createElement("tr", {
      key: p.id
    }, React.createElement("td", null, React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--primary)",
        background: "var(--accent-soft)",
        padding: "2px 8px",
        borderRadius: 6
      }
    }, p.code || "—")), React.createElement("td", null, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: p.color || "#3B82F6",
        flexShrink: 0,
        display: "inline-block"
      }
    }), React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, p.shortName || React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontWeight: 400
      }
    }, "\u2014")))), React.createElement("td", null, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("span", null, p.name), window.hasLatLng(p) ? React.createElement("i", {
      className: "fa-solid fa-location-dot",
      title: `ปักหมุดแล้ว · ${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}`,
      style: {
        color: "#10B981",
        fontSize: 12
      }
    }) : React.createElement("i", {
      className: "fa-solid fa-location-crosshairs",
      title: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E1B\u0E31\u0E01\u0E2B\u0E21\u0E38\u0E14\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07 \u2014 \u0E08\u0E30\u0E44\u0E21\u0E48\u0E02\u0E36\u0E49\u0E19\u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14",
      style: {
        color: "#CBD5E1",
        fontSize: 12
      }
    }))), React.createElement("td", null, sites.length ? React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 4
      }
    }, sites.map(s => React.createElement("span", {
      key: s,
      style: {
        fontSize: 11.5,
        padding: "2px 8px",
        borderRadius: 6,
        background: (p.color || "#3B82F6") + "18",
        color: p.color || "#3B82F6",
        fontWeight: 500,
        whiteSpace: "nowrap"
      }
    }, s))) : React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u2014")), React.createElement("td", {
      className: "hide-on-mobile",
      style: {
        color: "var(--muted)",
        fontSize: 13,
        maxWidth: 260
      }
    }, React.createElement("div", {
      style: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, p.desc || "—")), React.createElement("td", null, React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: 999,
        background: sc + "22",
        color: sc
      }
    }, React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: sc
      }
    }), STATUS_LABEL[p.status] || p.status)), React.createElement("td", {
      className: "hide-on-mobile",
      style: {
        textAlign: "center"
      }
    }, React.createElement("strong", null, mCnt), " ", React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("td", {
      className: "hide-on-mobile",
      style: {
        textAlign: "center"
      }
    }, React.createElement("strong", null, rCnt), " ", React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("td", null, React.createElement("div", {
      className: "row-actions"
    }, ["Admin", "Officer"].includes(user.role) && React.createElement(React.Fragment, null, React.createElement("button", {
      className: "ia",
      onClick: () => setEdit(p),
      title: "\u0E41\u0E01\u0E49\u0E44\u0E02"
    }, React.createElement("i", {
      className: "fa-solid fa-pen"
    })), React.createElement("button", {
      className: "ia danger",
      onClick: () => del(p),
      title: "\u0E25\u0E1A"
    }, React.createElement("i", {
      className: "fa-solid fa-trash"
    }))))));
  }), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "9"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-diagram-project"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", null, "\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21 \"\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19"))))))), edit && React.createElement(ProjectForm, {
    init: edit,
    onClose: () => setEdit(null),
    onSave: save
  }));
}
function ProjectForm({
  init,
  onClose,
  onSave
}) {
  const [f, setF] = React.useState(init);
  const palette = ["#3B82F6", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#06B6D4", "#EC4899", "#6366F1", "#F97316", "#14B8A6", "#A855F7", "#0EA5E9", "#DC2626", "#16A34A", "#D97706", "#64748B"];
  const [siteInput, setSiteInput] = React.useState("");
  const sites = window.projectSites(f);
  const addSites = raw => {
    const parts = String(raw || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = sites.slice();
    parts.forEach(s => {
      if (!next.some(x => x.toLowerCase() === s.toLowerCase())) next.push(s);
    });
    setF(prev => ({
      ...prev,
      sites: next
    }));
    setSiteInput("");
  };
  const removeSite = s => setF(prev => ({
    ...prev,
    sites: sites.filter(x => x !== s)
  }));
  const moveSite = (i, dir) => {
    const next = sites.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setF(prev => ({
      ...prev,
      sites: next
    }));
  };
  const submit = () => {
    const merged = sites.slice();
    String(siteInput || "").split(",").map(s => s.trim()).filter(Boolean).forEach(s => {
      if (!merged.some(x => x.toLowerCase() === s.toLowerCase())) merged.push(s);
    });
    onSave({
      ...f,
      sites: merged.length ? merged : null
    });
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: init.id ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่",
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"))
  }, React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E47\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 *"), React.createElement("input", {
    value: f.name || "",
    onChange: e => setF({
      ...f,
      name: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E42\u0E23\u0E07\u0E07\u0E32\u0E19 A - \u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15 1"
  }), React.createElement("div", {
    className: "hint"
  }, "\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23 \xB7 \u0E43\u0E0A\u0E49\u0E43\u0E19\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E17\u0E38\u0E01\u0E0A\u0E19\u0E34\u0E14 (\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 \xB7 \u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 \xB7 Excel)")), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E22\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("input", {
    value: f.shortName || "",
    onChange: e => setF({
      ...f,
      shortName: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E42\u0E23\u0E07\u0E07\u0E32\u0E19 A1"
  }), React.createElement("div", {
    className: "hint"
  }, "\u0E43\u0E0A\u0E49\u0E41\u0E2A\u0E14\u0E07\u0E1A\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E27\u0E47\u0E1A\u0E41\u0E17\u0E19\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E47\u0E21 \xB7 \u0E40\u0E27\u0E49\u0E19\u0E27\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49 (\u0E08\u0E30\u0E43\u0E0A\u0E49\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E41\u0E17\u0E19)")), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("input", {
    className: "mono",
    value: f.code || "",
    onChange: e => setF({
      ...f,
      code: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 PRJ-001"
  }), React.createElement("div", {
    className: "hint"
  }, "\u0E43\u0E0A\u0E49\u0E2D\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 \u0E40\u0E0A\u0E48\u0E19 RE-PRJ-001-256808/001")), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("select", {
    value: f.status || "active",
    onChange: e => setF({
      ...f,
      status: e.target.value
    })
  }, React.createElement("option", {
    value: "active"
  }, "\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"), React.createElement("option", {
    value: "inactive"
  }, "\u0E1B\u0E34\u0E14\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"))), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("input", {
    style: {
      flex: "1 1 200px",
      minWidth: 0
    },
    value: siteInput,
    onChange: e => {
      const v = e.target.value;
      if (v.includes(",")) addSites(v);else setSiteInput(v);
    },
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSites(siteInput);
      }
    },
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 Rig1 \u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 Enter"
  }), React.createElement("button", {
    type: "button",
    className: "btn btn-ghost",
    onClick: () => addSites(siteInput),
    disabled: !siteInput.trim()
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E44\u0E0B\u0E15\u0E4C")), sites.length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10
    }
  }, sites.map((s, i) => React.createElement("span", {
    key: s,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 6px 4px 11px",
      borderRadius: 999,
      background: (f.color || "#3B82F6") + "1A",
      color: f.color || "#3B82F6",
      fontSize: 12.5,
      fontWeight: 500
    }
  }, React.createElement("span", {
    style: {
      cursor: "default"
    }
  }, s), React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: 2
    }
  }, React.createElement("button", {
    type: "button",
    title: "\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E02\u0E36\u0E49\u0E19",
    onClick: () => moveSite(i, -1),
    disabled: i === 0,
    style: {
      border: "none",
      background: "none",
      cursor: i === 0 ? "default" : "pointer",
      color: "inherit",
      opacity: i === 0 ? .25 : .65,
      padding: "0 1px",
      fontSize: 10
    }
  }, React.createElement("i", {
    className: "fa-solid fa-chevron-left"
  })), React.createElement("button", {
    type: "button",
    title: "\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E25\u0E07",
    onClick: () => moveSite(i, 1),
    disabled: i === sites.length - 1,
    style: {
      border: "none",
      background: "none",
      cursor: i === sites.length - 1 ? "default" : "pointer",
      color: "inherit",
      opacity: i === sites.length - 1 ? .25 : .65,
      padding: "0 1px",
      fontSize: 10
    }
  }, React.createElement("i", {
    className: "fa-solid fa-chevron-right"
  })), React.createElement("button", {
    type: "button",
    title: "\u0E25\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E19\u0E35\u0E49",
    onClick: () => removeSite(s),
    style: {
      border: "none",
      background: "none",
      cursor: "pointer",
      color: "inherit",
      opacity: .75,
      padding: "0 3px",
      fontSize: 11
    }
  }, React.createElement("i", {
    className: "fa-solid fa-xmark"
  })))))), React.createElement("div", {
    className: "hint"
  }, "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22\u0E20\u0E32\u0E22\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E40\u0E0A\u0E48\u0E19 Rig1 \xB7 Rig2 \xB7 \u0E41\u0E04\u0E21\u0E1B\u0E4C\u0E04\u0E19\u0E07\u0E32\u0E19 \u2014 \u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E49\u0E32\u0E21\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E19\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E40\u0E14\u0E35\u0E22\u0E27 \xB7 \u0E40\u0E27\u0E49\u0E19\u0E27\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49\u0E16\u0E49\u0E32\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E21\u0E35\u0E44\u0E0B\u0E15\u0E4C\u0E22\u0E48\u0E2D\u0E22")), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14"), React.createElement("textarea", {
    rows: "2",
    value: f.desc || "",
    onChange: e => setF({
      ...f,
      desc: e.target.value
    }),
    placeholder: "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07 \u0E2F\u0E25\u0E2F"
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E2A\u0E35\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", {
    className: "color-grid"
  }, palette.map(c => React.createElement("button", {
    key: c,
    className: f.color === c ? "sel" : "",
    style: {
      background: c
    },
    onClick: () => setF({
      ...f,
      color: c
    })
  })))), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-map-location-dot",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 (\u0E41\u0E2A\u0E14\u0E07\u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14)"), React.createElement("input", {
    value: f.address || "",
    onChange: e => setF({
      ...f,
      address: e.target.value
    }),
    placeholder: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48/\u0E08\u0E38\u0E14\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15 (\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A)",
    style: {
      marginBottom: 10
    }
  }), React.createElement(LocationPicker, {
    value: {
      lat: f.lat,
      lng: f.lng
    },
    onChange: pos => setF(prev => ({
      ...prev,
      lat: pos.lat,
      lng: pos.lng
    }))
  }))), React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 14,
      background: "#FAFBFC",
      borderRadius: 10,
      border: "1px dashed var(--line)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted)",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 8,
      fontWeight: 500
    }
  }, "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07"), React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 14px",
      borderRadius: 999,
      background: (f.color || "#3B82F6") + "22",
      color: f.color || "#3B82F6",
      fontWeight: 500,
      fontSize: 13
    }
  }, React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: f.color || "#3B82F6"
    }
  }), f.code && React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12
    }
  }, f.code), React.createElement("span", null, f.name || "ชื่อโครงการ"))));
}
window.Projects = Projects;

/* ---- block 9 (ต้นฉบับบรรทัด 3236) ---- */
window.parseLatLng = function (text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const pats = [/@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/, /[?&](?:q|ll|center|daddr)=(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/i, /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/, /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = parseFloat(m[1]),
        lng = parseFloat(m[2]);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return {
        lat,
        lng
      };
    }
  }
  return null;
};
window.hasLatLng = p => p && isFinite(Number(p.lat)) && isFinite(Number(p.lng)) && !(Number(p.lat) === 0 && Number(p.lng) === 0);
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MAP_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAP_CENTER_TH = [13.7563, 100.5018];
function pinIcon(color, count, dim) {
  return window.L.divIcon({
    className: "",
    html: `<div class="map-pin-wrap${dim ? " dim" : ""}">
             <div class="map-pin" style="background:${color}"><i class="fa-solid fa-location-dot"></i></div>
             ${count > 0 ? `<div class="map-pin-count">${count > 99 ? "99+" : count}</div>` : ""}
           </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30]
  });
}
function LocationPicker({
  value,
  onChange
}) {
  const boxRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const [paste, setPaste] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [err, setErr] = React.useState("");
  const has = window.hasLatLng(value);
  React.useEffect(() => {
    let dead = false;
    window.__loadMap().then(() => {
      if (dead || !boxRef.current || mapRef.current) return;
      const start = window.hasLatLng(value) ? [Number(value.lat), Number(value.lng)] : MAP_CENTER_TH;
      const map = window.L.map(boxRef.current, {
        scrollWheelZoom: false
      }).setView(start, window.hasLatLng(value) ? 15 : 6);
      window.L.tileLayer(MAP_TILE, {
        attribution: MAP_ATTR,
        maxZoom: 19
      }).addTo(map);
      map.on("click", e => onChangeRef.current({
        lat: +e.latlng.lat.toFixed(6),
        lng: +e.latlng.lng.toFixed(6)
      }));
      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 150);
    }).catch(e => setErr(e.message || String(e)));
    return () => {
      dead = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!has) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }
    const pos = [Number(value.lat), Number(value.lng)];
    if (markerRef.current) markerRef.current.setLatLng(pos);else {
      markerRef.current = window.L.marker(pos, {
        icon: pinIcon("#EF4444", 0, false),
        draggable: true
      }).addTo(map);
      markerRef.current.on("dragend", e => {
        const ll = e.target.getLatLng();
        onChangeRef.current({
          lat: +ll.lat.toFixed(6),
          lng: +ll.lng.toFixed(6)
        });
      });
    }
    map.setView(pos, Math.max(map.getZoom(), 15));
  }, [ready, has, value && value.lat, value && value.lng]);
  const applyPaste = () => {
    const got = window.parseLatLng(paste);
    if (!got) {
      Swal.fire({
        icon: "warning",
        title: "อ่านพิกัดไม่ออก",
        html: 'วางได้ทั้งลิงก์ Google Maps (แบบเต็ม ไม่ใช่ลิงก์ย่อ goo.gl)<br/>หรือพิมพ์เป็น <b>13.7563, 100.5018</b>'
      });
      return;
    }
    onChange(got);
    setPaste("");
  };
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: "info",
        title: "เบราว์เซอร์นี้ไม่รองรับการหาตำแหน่ง"
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(p => onChange({
      lat: +p.coords.latitude.toFixed(6),
      lng: +p.coords.longitude.toFixed(6)
    }), () => Swal.fire({
      icon: "error",
      title: "หาตำแหน่งไม่สำเร็จ",
      text: "อนุญาตให้เว็บเข้าถึงตำแหน่งก่อน แล้วลองใหม่"
    }), {
      enableHighAccuracy: true,
      timeout: 8000
    });
  };
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 8
    }
  }, React.createElement("input", {
    style: {
      flex: "1 1 240px",
      minWidth: 0
    },
    value: paste,
    onChange: e => setPaste(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyPaste();
      }
    },
    placeholder: "\u0E27\u0E32\u0E07\u0E25\u0E34\u0E07\u0E01\u0E4C Google Maps \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C 13.7563, 100.5018"
  }), React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    onClick: applyPaste
  }, React.createElement("i", {
    className: "fa-solid fa-location-crosshairs"
  }), " \u0E43\u0E0A\u0E49\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E19\u0E35\u0E49"), React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    onClick: useMyLocation
  }, React.createElement("i", {
    className: "fa-solid fa-crosshairs"
  }), " \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19"), has && React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    style: {
      color: "#EF4444"
    },
    onClick: () => onChange({
      lat: "",
      lng: ""
    })
  }, React.createElement("i", {
    className: "fa-solid fa-eraser"
  }), " \u0E25\u0E49\u0E32\u0E07\u0E1E\u0E34\u0E01\u0E31\u0E14")), err ? React.createElement("div", {
    style: {
      padding: 14,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      borderRadius: 10,
      fontSize: 13,
      color: "#B91C1C"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      marginRight: 6
    }
  }), "\u0E42\u0E2B\u0E25\u0E14\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ", err, " \xB7 \u0E22\u0E31\u0E07\u0E01\u0E23\u0E2D\u0E01\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49") : React.createElement("div", {
    ref: boxRef,
    className: "map-box sm"
  }), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 6
    }
  }, has ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-location-dot",
    style: {
      color: "#EF4444",
      marginRight: 5
    }
  }), "\u0E1E\u0E34\u0E01\u0E31\u0E14 ", React.createElement("span", {
    className: "mono"
  }, Number(value.lat).toFixed(6), ", ", Number(value.lng).toFixed(6)), " \xB7 \u0E04\u0E25\u0E34\u0E01\u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E32\u0E01\u0E2B\u0E21\u0E38\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E49\u0E32\u0E22") : React.createElement(React.Fragment, null, "\u0E04\u0E25\u0E34\u0E01\u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E31\u0E01\u0E2B\u0E21\u0E38\u0E14\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \xB7 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E08\u0E30\u0E44\u0E21\u0E48\u0E02\u0E36\u0E49\u0E19\u0E1A\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14")));
}
window.LocationPicker = LocationPicker;
function ProjectMap({
  projects,
  byProject,
  selected,
  onSelect
}) {
  const boxRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layerRef = React.useRef(null);
  const [err, setErr] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;
  React.useEffect(() => {
    let dead = false;
    window.__loadMap().then(() => {
      if (dead || !boxRef.current || mapRef.current) return;
      const map = window.L.map(boxRef.current, {
        scrollWheelZoom: false
      }).setView(MAP_CENTER_TH, 6);
      window.L.tileLayer(MAP_TILE, {
        attribution: MAP_ATTR,
        maxZoom: 19
      }).addTo(map);
      layerRef.current = window.L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 150);
    }).catch(e => setErr(e.message || String(e)));
    return () => {
      dead = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);
  React.useEffect(() => {
    if (!ready || !layerRef.current || !mapRef.current) return;
    const L = window.L,
      map = mapRef.current;
    layerRef.current.clearLayers();
    const pts = [];
    projects.filter(window.hasLatLng).forEach(p => {
      const info = byProject[p.name] || {
        open: 0,
        urgent: 0
      };
      const pos = [Number(p.lat), Number(p.lng)];
      pts.push(pos);
      const dim = !!selected && selected !== p.name;
      const m = L.marker(pos, {
        icon: pinIcon(p.color || "#1E40AF", info.open, dim),
        title: p.name
      }).addTo(layerRef.current);
      m.bindTooltip(`${esc(window.projectShort(p.name))}${info.open ? `<span class="ml-n">${info.open} ใบ</span>` : ""}`, {
        permanent: true,
        direction: "right",
        offset: [13, -13],
        opacity: 1,
        className: `map-label${selected === p.name ? " on" : dim ? " dim" : ""}`
      });
      m.bindPopup(`
        <div style="min-width:170px">
          <div style="font-weight:600;margin-bottom:4px">${esc(window.projectShort(p.name))}</div>
          <div style="font-size:11.5px;color:#64748B">${esc(p.name)}</div>
          <div style="margin-top:7px;font-size:13px">
            งานที่ยังไม่เสร็จ <b style="color:${info.open ? "#EF4444" : "#10B981"}">${info.open}</b> ใบ
          </div>
          ${p.address ? `<div style="margin-top:5px;font-size:12px;color:#64748B">${esc(p.address)}</div>` : ""}
          <div style="margin-top:8px;font-size:12px;color:#1E40AF">คลิกหมุดเพื่อกรองการ์ดด้านล่าง</div>
        </div>`);
      m.on("click", () => onSelectRef.current(selected === p.name ? "" : p.name));
    });
    if (pts.length === 1) map.setView(pts[0], 14);else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.25));
  }, [ready, projects, byProject, selected]);
  if (err) return React.createElement("div", {
    className: "card-body"
  }, React.createElement("div", {
    className: "empty",
    style: {
      padding: 26
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      color: "#EF4444"
    }
  }), React.createElement("div", {
    className: "t",
    style: {
      fontSize: 14
    }
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"), React.createElement("div", null, err, " \xB7 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2D\u0E34\u0E19\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E47\u0E15")));
  return React.createElement("div", {
    ref: boxRef,
    className: "map-box"
  });
}
window.ProjectMap = ProjectMap;
function JobCard({
  r,
  onOpen
}) {
  const st = window.getStatus(r.status);
  const cat = window.getCategory(r.categoryId);
  const mach = (window.__DATA.machines || []).find(m => m.code === r.machineCode);
  const days = Math.max(0, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000));
  const stColor = {
    new: "#3B82F6",
    assess: "#F59E0B",
    progress: "#8B5CF6",
    parts: "#EC4899",
    done: "#10B981",
    cancel: "#94A3B8"
  }[r.status] || "#64748B";
  return React.createElement("div", {
    className: `job-card${r.status === "cancel" ? " is-cancel" : ""}`,
    style: {
      "--job-color": stColor
    },
    onClick: () => onOpen(r)
  }, React.createElement("div", {
    className: "jc-top"
  }, React.createElement("span", {
    className: "jc-run"
  }, r.running || r.id), React.createElement("span", {
    className: `badge ${st.className}`
  }, React.createElement("i", {
    className: `fa-solid ${st.icon}`,
    style: {
      marginRight: 4
    }
  }), st.label)), React.createElement("div", {
    className: "jc-title"
  }, React.createElement(ProblemLines, {
    title: r.title,
    max: 2
  })), React.createElement("div", {
    className: "jc-meta"
  }, React.createElement("div", {
    className: "row"
  }, React.createElement("i", {
    className: "fa-solid fa-diagram-project",
    style: {
      color: "#1E40AF"
    }
  }), React.createElement("span", {
    title: r.project || ""
  }, r.project ? window.projectShort(r.project) : "ไม่ระบุโครงการ")), React.createElement("div", {
    className: "row"
  }, React.createElement("i", {
    className: "fa-solid fa-industry",
    style: {
      color: "#64748B"
    }
  }), React.createElement("span", null, r.machineCode || "—", mach ? ` · ${mach.name}` : "")), React.createElement("div", {
    className: "row"
  }, React.createElement("i", {
    className: `fa-solid ${cat.icon}`,
    style: {
      color: cat.color
    }
  }), React.createElement("span", null, cat.name))), React.createElement("div", {
    className: "jc-foot"
  }, React.createElement("span", null, React.createElement("i", {
    className: "fa-solid fa-user",
    style: {
      marginRight: 5
    }
  }), r.reporterName || "—"), React.createElement("span", {
    className: "jc-age",
    style: {
      color: days > 7 ? "#EF4444" : days > 3 ? "#B45309" : "var(--muted)"
    }
  }, React.createElement("i", {
    className: "fa-regular fa-clock"
  }), days === 0 ? "วันนี้" : `${days} วัน`)));
}
window.JobCard = JobCard;

/* ---- block 10 (ต้นฉบับบรรทัด 3482) ---- */
function Dashboard({
  user,
  goTo
}) {
  const [loading, setLoading] = React.useState(true);
  const [costView, setCostView] = React.useState("category");
  const [dashDetail, setDashDetail] = React.useState(null);
  const [tick, setTick] = React.useState(0);
  const [mapProject, setMapProject] = React.useState("");
  const [jobStatus, setJobStatus] = React.useState("all");
  const [jobLimit, setJobLimit] = React.useState(36);
  const [symptomMode, setSymptomMode] = React.useState("keyword");
  const [symptomLimit, setSymptomLimit] = React.useState(10);
  const [openKw, setOpenKw] = React.useState("");
  const doughnutRef = React.useRef(null);
  const barRef = React.useRef(null);
  const costRef = React.useRef(null);
  const chartsRef = React.useRef({});
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);
  const repairs = React.useMemo(() => {
    return window.filterByUserProjects(user, window.__DATA.repairs, "project");
  }, [user, tick]);
  const openJobs = React.useMemo(() => repairs.filter(r => r.status !== "done").slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [repairs]);
  const jobsByProject = React.useMemo(() => {
    const map = {};
    openJobs.forEach(r => {
      const key = r.project || "";
      if (!key) return;
      if (!map[key]) map[key] = {
        open: 0
      };
      map[key].open++;
    });
    return map;
  }, [openJobs]);
  const mapProjects = React.useMemo(() => {
    const allowed = new Set(window.userProjects(user));
    return (window.__DATA.projects || []).filter(p => allowed.has(p.name));
  }, [user, tick]);
  const pinned = React.useMemo(() => mapProjects.filter(window.hasLatLng), [mapProjects]);
  const jobCards = React.useMemo(() => openJobs.filter(r => !mapProject || r.project === mapProject).filter(r => jobStatus === "all" || r.status === jobStatus), [openJobs, mapProject, jobStatus]);
  React.useEffect(() => {
    setJobLimit(36);
  }, [mapProject, jobStatus]);
  const jobStatusChips = React.useMemo(() => {
    const list = window.__DATA.statuses.filter(s => s.key !== "done");
    return [{
      key: "all",
      label: "ทั้งหมด",
      n: openJobs.filter(r => !mapProject || r.project === mapProject).length
    }].concat(list.map(s => ({
      key: s.key,
      label: s.label,
      n: openJobs.filter(r => (!mapProject || r.project === mapProject) && r.status === s.key).length
    }))).filter(c => c.key === "all" || c.n > 0);
  }, [openJobs, mapProject]);
  const costStats = React.useMemo(() => {
    const total = repairs.reduce((s, r) => s + (Number(r.cost) || 0), 0);
    const done = repairs.filter(r => r.status === "done").reduce((s, r) => s + (Number(r.cost) || 0), 0);
    const pending = total - done;
    const avg = repairs.length ? total / repairs.length : 0;
    const byCatMap = {};
    repairs.forEach(r => {
      const c = r.categoryId || "uncat";
      if (!byCatMap[c]) byCatMap[c] = {
        count: 0,
        cost: 0
      };
      byCatMap[c].count++;
      byCatMap[c].cost += Number(r.cost) || 0;
    });
    const byCat = Object.entries(byCatMap).map(([id, v]) => {
      const cat = window.getCategory(id);
      return {
        id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        ...v
      };
    }).sort((a, b) => b.cost - a.cost);
    const byProjMap = {};
    repairs.forEach(r => {
      const p = r.project || "ไม่ระบุโครงการ";
      if (!byProjMap[p]) byProjMap[p] = {
        count: 0,
        cost: 0
      };
      byProjMap[p].count++;
      byProjMap[p].cost += Number(r.cost) || 0;
    });
    const projColors = ["#1E40AF", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#06B6D4", "#EC4899", "#6366F1", "#14B8A6", "#F97316"];
    const byProj = Object.entries(byProjMap).map(([name, v], i) => ({
      name: window.projectShort(name),
      fullName: name,
      color: projColors[i % projColors.length],
      ...v
    })).sort((a, b) => b.cost - a.cost);
    const byMachMap = {};
    repairs.forEach(r => {
      const mc = r.machineCode || "ไม่ระบุ";
      if (!byMachMap[mc]) byMachMap[mc] = {
        count: 0,
        cost: 0
      };
      byMachMap[mc].count++;
      byMachMap[mc].cost += Number(r.cost) || 0;
    });
    const machColors = ["#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#1E40AF", "#EC4899", "#6366F1", "#14B8A6", "#F97316"];
    const byMach = Object.entries(byMachMap).map(([name, v], i) => ({
      name,
      color: machColors[i % machColors.length],
      ...v
    })).sort((a, b) => b.cost - a.cost);
    return {
      total,
      done,
      pending,
      avg,
      byCat,
      byProj,
      byMach
    };
  }, [repairs]);
  const fmtBaht = n => "฿" + Math.round(Number(n) || 0).toLocaleString();
  const symptomStats = React.useMemo(() => {
    const map = {};
    repairs.forEach(r => {
      window.getProblems(r).forEach(p => {
        const label = String(p.text || "").trim();
        if (!label) return;
        const key = label.toLowerCase().replace(/\s+/g, " ");
        if (!map[key]) map[key] = {
          label,
          count: 0,
          open: 0,
          jobs: []
        };
        map[key].count++;
        if (p.status !== "done") map[key].open++;
        if (!map[key].jobs.some(x => x.id === r.id)) map[key].jobs.push(r);
      });
    });
    const list = Object.values(map).sort((a, b) => b.count - a.count);
    return {
      list,
      total: list.reduce((s, x) => s + x.count, 0),
      max: list.length ? list[0].count : 0
    };
  }, [repairs]);
  const keywordStats = React.useMemo(() => {
    const map = {};
    repairs.forEach(r => {
      const text = window.getProblems(r).map(p => p.text).filter(Boolean).join(" ") || r.title || "";
      new Set(window.extractKeywords(text)).forEach(kw => {
        if (!map[kw]) map[kw] = {
          label: kw,
          count: 0,
          open: 0,
          jobs: []
        };
        map[kw].count++;
        if (r.status !== "done") map[kw].open++;
        map[kw].jobs.push(r);
      });
    });
    const all = Object.values(map).sort((a, b) => b.count - a.count || b.open - a.open);
    const repeated = all.filter(x => x.count > 1);
    const list = repeated.length ? repeated : all;
    return {
      list,
      total: repairs.length,
      max: list.length ? list[0].count : 0
    };
  }, [repairs]);
  const symptomView = symptomMode === "keyword" ? keywordStats : symptomStats;
  const symptomTop = symptomView.list.slice(0, symptomLimit);
  const counts = {
    all: repairs.length,
    assess: repairs.filter(r => r.status === "assess").length,
    approve: repairs.filter(r => r.status === "new").length,
    progress: repairs.filter(r => ["progress", "parts"].includes(r.status)).length,
    done: repairs.filter(r => r.status === "done").length
  };
  React.useEffect(() => {
    if (loading) return;
    let dead = false;
    (async () => {
      await window.__loadChart();
      if (dead) return;
      if (doughnutRef.current) {
        if (chartsRef.current.d) chartsRef.current.d.destroy();
        const catCount = {};
        repairs.forEach(r => {
          catCount[r.categoryId] = (catCount[r.categoryId] || 0) + 1;
        });
        const cats = window.__DATA.categories.filter(c => catCount[c.id]);
        chartsRef.current.d = new Chart(doughnutRef.current, {
          type: "doughnut",
          data: {
            labels: cats.map(c => c.name),
            datasets: [{
              data: cats.map(c => catCount[c.id]),
              backgroundColor: cats.map(c => c.color),
              borderWidth: 0,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
              legend: {
                position: "right",
                labels: {
                  font: {
                    family: "Kanit",
                    size: 12
                  },
                  usePointStyle: true,
                  pointStyle: "circle",
                  padding: 12
                }
              },
              tooltip: {
                titleFont: {
                  family: "Kanit"
                },
                bodyFont: {
                  family: "Kanit"
                }
              }
            }
          }
        });
      }
      if (barRef.current) {
        if (chartsRef.current.b) chartsRef.current.b.destroy();
        const now = new Date();
        const months = [];
        const labels = [];
        const data = [];
        const dataDone = [];
        const mThai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(d);
          labels.push(mThai[d.getMonth()] + " " + (d.getFullYear() + 543 - 2500));
        }
        months.forEach(m => {
          const total = repairs.filter(r => {
            const d = new Date(r.createdAt);
            return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
          }).length;
          const done = repairs.filter(r => {
            const d = new Date(r.createdAt);
            return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth() && r.status === "done";
          }).length;
          data.push(total);
          dataDone.push(done);
        });
        chartsRef.current.b = new Chart(barRef.current, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "งานทั้งหมด",
              data,
              backgroundColor: "#3B82F6",
              borderRadius: 6,
              barThickness: 18
            }, {
              label: "ปิดงานแล้ว",
              data: dataDone,
              backgroundColor: "#10B981",
              borderRadius: 6,
              barThickness: 18
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  font: {
                    family: "Kanit"
                  },
                  usePointStyle: true,
                  pointStyle: "circle"
                }
              },
              tooltip: {
                titleFont: {
                  family: "Kanit"
                },
                bodyFont: {
                  family: "Kanit"
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    family: "Kanit"
                  }
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: "#F1F5F9"
                },
                ticks: {
                  font: {
                    family: "Kanit"
                  },
                  precision: 0
                }
              }
            }
          }
        });
      }
    })();
    return () => {
      dead = true;
      if (chartsRef.current.d) chartsRef.current.d.destroy();
      if (chartsRef.current.b) chartsRef.current.b.destroy();
      if (chartsRef.current.c) chartsRef.current.c.destroy();
    };
  }, [loading]);
  React.useEffect(() => {
    if (loading) return;
    if (!costRef.current) return;
    let dead = false;
    (async () => {
      await window.__loadChart();
      if (dead || !costRef.current) return;
      if (chartsRef.current.c) chartsRef.current.c.destroy();
      const src = costView === "category" ? costStats.byCat.map(x => ({
        label: x.name,
        val: x.cost,
        color: x.color
      })) : costView === "project" ? costStats.byProj.map(x => ({
        label: x.name,
        val: x.cost,
        color: x.color
      })) : costStats.byMach.map(x => ({
        label: x.name,
        val: x.cost,
        color: x.color
      }));
      chartsRef.current.c = new Chart(costRef.current, {
        type: "bar",
        data: {
          labels: src.map(x => x.label),
          datasets: [{
            label: "ค่าใช้จ่าย (บาท)",
            data: src.map(x => x.val),
            backgroundColor: src.map(x => x.color),
            borderRadius: 6,
            barThickness: 22
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              titleFont: {
                family: "Kanit"
              },
              bodyFont: {
                family: "Kanit"
              },
              callbacks: {
                label: ctx => " ฿" + Math.round(ctx.parsed.x).toLocaleString()
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                color: "#F1F5F9"
              },
              ticks: {
                font: {
                  family: "Kanit"
                },
                callback: v => "฿" + Number(v).toLocaleString()
              }
            },
            y: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  family: "Kanit",
                  size: 11.5
                }
              }
            }
          }
        }
      });
    })();
    return () => {
      dead = true;
    };
  }, [loading, costView, costStats]);
  const recent = repairs.filter(r => r.status !== "done");
  const stats = [{
    key: "all",
    label: "รายการทั้งหมด",
    val: counts.all,
    icon: "fa-clipboard-list",
    color: "#3B82F6",
    delta: "+12% vs เดือนก่อน",
    up: true
  }, {
    key: "assess",
    label: "รอประเมินราคา",
    val: counts.assess,
    icon: "fa-magnifying-glass-dollar",
    color: "#8B5CF6"
  }, {
    key: "approve",
    label: "รออนุมัติ",
    val: counts.approve,
    icon: "fa-hourglass-half",
    color: "#F59E0B"
  }, {
    key: "progress",
    label: "กำลังซ่อม",
    val: counts.progress,
    icon: "fa-screwdriver-wrench",
    color: "#EF4444"
  }, {
    key: "done",
    label: "เสร็จสิ้น",
    val: counts.done,
    icon: "fa-circle-check",
    color: "#10B981",
    delta: "-3% vs เดือนก่อน",
    up: false
  }];
  return React.createElement(React.Fragment, null, React.createElement(Loading, {
    show: loading
  }), !loading && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "stat-grid"
  }, stats.map(s => React.createElement("div", {
    className: "stat",
    key: s.key
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: s.color + "1a",
      color: s.color
    }
  }, React.createElement("i", {
    className: `fa-solid ${s.icon}`
  })), React.createElement("div", {
    className: "label"
  }, s.label), React.createElement("div", {
    className: "val"
  }, s.val), s.delta && React.createElement("div", {
    className: "delta"
  }, React.createElement("span", {
    className: s.up ? "up" : "down"
  }, React.createElement("i", {
    className: `fa-solid fa-arrow-${s.up ? "up" : "down"}`
  })), " ", s.delta)))), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, React.createElement("i", {
    className: "fa-solid fa-map-location-dot",
    style: {
      color: "var(--primary)",
      marginRight: 8
    }
  }), "\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", {
    className: "sub"
  }, "\u0E1B\u0E31\u0E01\u0E2B\u0E21\u0E38\u0E14\u0E41\u0E25\u0E49\u0E27 ", pinned.length, "/", mapProjects.length, " \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \xB7 \u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E1A\u0E19\u0E2B\u0E21\u0E38\u0E14\u0E04\u0E37\u0E2D\u0E08\u0E33\u0E19\u0E27\u0E19\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C")), mapProject && React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setMapProject("")
  }, React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " \u0E40\u0E25\u0E34\u0E01\u0E01\u0E23\u0E2D\u0E07: ", React.createElement("span", {
    title: mapProject
  }, window.projectShort(mapProject)))), pinned.length === 0 ? React.createElement("div", {
    className: "card-body"
  }, React.createElement("div", {
    className: "empty",
    style: {
      padding: 30
    }
  }, React.createElement("i", {
    className: "fa-solid fa-map-pin"
  }), React.createElement("div", {
    className: "t",
    style: {
      fontSize: 14
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E1B\u0E31\u0E01\u0E2B\u0E21\u0E38\u0E14\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", null, "\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E1A Asset \u2192 \u0E40\u0E21\u0E19\u0E39 \"\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\" \u2192 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u2192 \u0E1B\u0E31\u0E01\u0E2B\u0E21\u0E38\u0E14\u0E43\u0E19\u0E0A\u0E48\u0E2D\u0E07 \"\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\""))) : React.createElement(ProjectMap, {
    projects: pinned,
    byProject: jobsByProject,
    selected: mapProject,
    onSelect: setMapProject
  })), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, React.createElement("i", {
    className: "fa-solid fa-clipboard-list",
    style: {
      color: "#B45309",
      marginRight: 8
    }
  }), "\u0E07\u0E32\u0E19\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C"), React.createElement("div", {
    className: "sub"
  }, jobCards.length.toLocaleString("th-TH"), " \u0E43\u0E1A", mapProject ? ` · เฉพาะโครงการ ${window.projectShort(mapProject)}` : "", " \xB7 \u0E44\u0E21\u0E48\u0E23\u0E27\u0E21\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E34\u0E14\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, jobStatusChips.map(c => React.createElement("button", {
    key: c.key,
    className: `btn btn-sm ${jobStatus === c.key ? "btn-primary" : "btn-ghost"}`,
    onClick: () => setJobStatus(c.key)
  }, c.label, " ", React.createElement("span", {
    style: {
      opacity: .8,
      marginLeft: 4
    }
  }, "(", c.n, ")"))))), React.createElement("div", {
    className: "card-body"
  }, jobCards.length === 0 ? React.createElement("div", {
    className: "empty",
    style: {
      padding: 30
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    style: {
      color: "#10B981"
    }
  }), React.createElement("div", {
    className: "t",
    style: {
      fontSize: 14
    }
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E07\u0E32\u0E19\u0E04\u0E49\u0E32\u0E07\u0E43\u0E19\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E19\u0E35\u0E49"), React.createElement("div", null, "\u0E07\u0E32\u0E19\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E41\u0E25\u0E49\u0E27")) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "job-grid"
  }, jobCards.slice(0, jobLimit).map(r => React.createElement(JobCard, {
    key: r.id,
    r: r,
    onOpen: setDashDetail
  }))), jobCards.length > jobLimit && React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 16
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setJobLimit(n => n + 36)
  }, React.createElement("i", {
    className: "fa-solid fa-chevron-down"
  }), " \u0E41\u0E2A\u0E14\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21 (\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2D\u0E35\u0E01 ", (jobCards.length - jobLimit).toLocaleString("th-TH"), " \u0E43\u0E1A)"))))), React.createElement("div", {
    className: "charts-grid"
  }, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, "\u0E2A\u0E16\u0E34\u0E15\u0E34\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07 6 \u0E40\u0E14\u0E37\u0E2D\u0E19"), React.createElement("div", {
    className: "sub"
  }, "\u0E40\u0E1B\u0E23\u0E35\u0E22\u0E1A\u0E40\u0E17\u0E35\u0E22\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E07\u0E32\u0E19\u0E41\u0E08\u0E49\u0E07\u0E40\u0E02\u0E49\u0E32\u0E41\u0E25\u0E30\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E34\u0E14\u0E41\u0E25\u0E49\u0E27")), React.createElement("button", {
    className: "btn btn-ghost btn-sm"
  }, React.createElement("i", {
    className: "fa-solid fa-download"
  }), " Export")), React.createElement("div", {
    className: "card-body",
    style: {
      height: 320
    }
  }, React.createElement("canvas", {
    ref: barRef
  }))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, "\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E32\u0E21\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("div", {
    className: "sub"
  }, "\u0E07\u0E32\u0E19\u0E0B\u0E48\u0E2D\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E41\u0E22\u0E01\u0E15\u0E32\u0E21\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17"))), React.createElement("div", {
    className: "card-body",
    style: {
      height: 320
    }
  }, React.createElement("canvas", {
    ref: doughnutRef
  })))), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass-chart",
    style: {
      color: "#EF4444",
      marginRight: 8
    }
  }), "\u0E2A\u0E23\u0E38\u0E1B\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E40\u0E2A\u0E35\u0E22\u0E17\u0E35\u0E48\u0E1E\u0E1A\u0E1A\u0E48\u0E2D\u0E22"), React.createElement("div", {
    className: "sub"
  }, symptomMode === "keyword" ? React.createElement(React.Fragment, null, "\u0E41\u0E22\u0E01\u0E04\u0E35\u0E22\u0E4C\u0E40\u0E27\u0E34\u0E23\u0E4C\u0E14\u0E08\u0E32\u0E01\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \xB7 \u0E1E\u0E1A ", symptomView.list.length, " \u0E04\u0E35\u0E22\u0E4C\u0E40\u0E27\u0E34\u0E23\u0E4C\u0E14 \u0E08\u0E32\u0E01 ", symptomView.total, " \u0E43\u0E1A\u0E07\u0E32\u0E19") : React.createElement(React.Fragment, null, "\u0E08\u0E31\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E21\u0E32\u0E01\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14 \xB7 ", symptomView.list.length, " \u0E2D\u0E32\u0E01\u0E32\u0E23 \xB7 ", symptomView.total, " \u0E04\u0E23\u0E31\u0E49\u0E07"))), React.createElement("div", {
    className: "seg",
    style: {
      display: "inline-flex",
      background: "var(--bg)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: 3
    }
  }, [{
    k: "keyword",
    l: "คีย์เวิร์ด",
    i: "fa-key"
  }, {
    k: "full",
    l: "ข้อความเต็ม",
    i: "fa-align-left"
  }].map(t => React.createElement("button", {
    key: t.k,
    onClick: () => {
      setSymptomMode(t.k);
      setOpenKw("");
      setSymptomLimit(10);
    },
    style: {
      padding: "7px 14px",
      borderRadius: 7,
      border: "none",
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "Kanit",
      background: symptomMode === t.k ? "var(--primary)" : "transparent",
      color: symptomMode === t.k ? "#fff" : "var(--muted)"
    }
  }, React.createElement("i", {
    className: `fa-solid ${t.i}`
  }), " ", t.l)))), React.createElement("div", {
    className: "card-body"
  }, symptomView.list.length === 0 ? React.createElement("div", {
    className: "empty",
    style: {
      padding: 30
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clipboard-question"
  }), React.createElement("div", {
    className: "t",
    style: {
      fontSize: 14
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21"), symptomMode === "keyword" && React.createElement("div", null, "\u0E04\u0E35\u0E22\u0E4C\u0E40\u0E27\u0E34\u0E23\u0E4C\u0E14\u0E08\u0E30\u0E02\u0E36\u0E49\u0E19\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E21\u0E35\u0E04\u0E33\u0E17\u0E35\u0E48\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E19\u0E15\u0E31\u0E49\u0E07\u0E41\u0E15\u0E48 2 \u0E43\u0E1A\u0E07\u0E32\u0E19\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B")) : React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "grid",
      gap: 12
    }
  }, symptomTop.map((s, i) => {
    const pct = symptomView.max ? s.count / symptomView.max * 100 : 0;
    const share = symptomView.total ? s.count / symptomView.total * 100 : 0;
    const rankColor = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#0EA5E9", "#10B981", "#EC4899", "#6366F1"][i % 8];
    const isOpen = openKw === s.label;
    return React.createElement("div", {
      key: s.label
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer"
      },
      onClick: () => setOpenKw(isOpen ? "" : s.label),
      title: "\u0E01\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E43\u0E1A\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49"
    }, React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: "50%",
        background: rankColor + "1a",
        color: rankColor,
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        fontWeight: 600
      }
    }, i + 1), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 5
      }
    }, React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 500,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, React.createElement("i", {
      className: `fa-solid fa-chevron-${isOpen ? "down" : "right"}`,
      style: {
        fontSize: 10,
        color: "var(--muted)",
        marginRight: 7
      }
    }), s.label, s.open > 0 && React.createElement("span", {
      className: "badge",
      style: {
        background: "#FEF3C7",
        color: "#B45309",
        marginLeft: 8,
        fontSize: 11
      }
    }, "\u0E04\u0E49\u0E32\u0E07 ", s.open)), React.createElement("span", {
      style: {
        flexShrink: 0,
        fontSize: 13,
        color: "var(--muted)"
      }
    }, React.createElement("strong", {
      style: {
        color: rankColor,
        fontSize: 15
      }
    }, s.count), " ", symptomMode === "keyword" ? "ใบงาน" : "ครั้ง", " \xB7 ", share.toFixed(0), "%")), React.createElement("div", {
      style: {
        height: 8,
        borderRadius: 999,
        background: "var(--bg)",
        overflow: "hidden"
      }
    }, React.createElement("div", {
      style: {
        height: "100%",
        width: pct + "%",
        background: rankColor,
        borderRadius: 999,
        transition: "width .4s"
      }
    })))), isOpen && React.createElement("div", {
      style: {
        margin: "10px 0 4px 38px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        overflow: "hidden"
      }
    }, s.jobs.slice(0, 15).map(r => {
      const st = window.getStatus(r.status);
      return React.createElement("div", {
        key: r.id,
        onClick: () => setDashDetail(r),
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid var(--line-soft)",
          cursor: "pointer",
          fontSize: 13,
          flexWrap: "wrap"
        }
      }, React.createElement("span", {
        className: "mono",
        style: {
          color: "var(--primary)",
          fontSize: 12,
          fontWeight: 600
        }
      }, r.running || r.id), React.createElement("span", {
        className: `badge ${st.className}`,
        style: {
          fontSize: 11
        }
      }, st.label), React.createElement("span", {
        style: {
          flex: 1,
          minWidth: 120,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--text)"
        }
      }, String(r.title || "").split("\n")[0]), React.createElement("span", {
        style: {
          color: "var(--muted)",
          fontSize: 12
        }
      }, React.createElement(ProjectLabel, {
        name: r.project
      })), React.createElement("span", {
        style: {
          color: "var(--muted)",
          fontSize: 12
        }
      }, window.__DATA.fmtDate(r.createdAt)));
    }), s.jobs.length > 15 && React.createElement("div", {
      style: {
        padding: "7px 12px",
        fontSize: 12,
        color: "var(--muted)",
        background: "#FAFBFC"
      }
    }, "\u0E41\u0E25\u0E30\u0E2D\u0E35\u0E01 ", s.jobs.length - 15, " \u0E43\u0E1A\u0E07\u0E32\u0E19")));
  })), symptomView.list.length > symptomLimit && React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 14
    }
  }, React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setSymptomLimit(n => n + 10)
  }, React.createElement("i", {
    className: "fa-solid fa-chevron-down"
  }), " \u0E14\u0E39\u0E40\u0E1E\u0E34\u0E48\u0E21 (\u0E2D\u0E35\u0E01 ", symptomView.list.length - symptomLimit, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)"))))), React.createElement("div", {
    className: "stat-grid",
    style: {
      gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "stat"
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: "rgba(30,64,175,.1)",
      color: "#1E40AF"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-sack-dollar"
  })), React.createElement("div", {
    className: "label"
  }, "\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E23\u0E27\u0E21"), React.createElement("div", {
    className: "val",
    style: {
      fontSize: 22
    }
  }, fmtBaht(costStats.total))), React.createElement("div", {
    className: "stat"
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: "rgba(16,185,129,.1)",
      color: "#10B981"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check"
  })), React.createElement("div", {
    className: "label"
  }, "\u0E1B\u0E34\u0E14\u0E07\u0E32\u0E19/\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27"), React.createElement("div", {
    className: "val",
    style: {
      fontSize: 22
    }
  }, fmtBaht(costStats.done))), React.createElement("div", {
    className: "stat"
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: "rgba(245,158,11,.1)",
      color: "#F59E0B"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clock"
  })), React.createElement("div", {
    className: "label"
  }, "\u0E04\u0E49\u0E32\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A"), React.createElement("div", {
    className: "val",
    style: {
      fontSize: 22
    }
  }, fmtBaht(costStats.pending))), React.createElement("div", {
    className: "stat"
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: "rgba(139,92,246,.1)",
      color: "#8B5CF6"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-chart-line"
  })), React.createElement("div", {
    className: "label"
  }, "\u0E40\u0E09\u0E25\u0E35\u0E48\u0E22/\u0E07\u0E32\u0E19"), React.createElement("div", {
    className: "val",
    style: {
      fontSize: 22
    }
  }, fmtBaht(costStats.avg)))), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, "\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22"), React.createElement("div", {
    className: "sub"
  }, "\u0E41\u0E22\u0E01\u0E15\u0E32\u0E21", costView === "category" ? "หมวดหมู่" : costView === "project" ? "โครงการ" : "เครื่องจักร", " \xB7 ", repairs.length, " \u0E07\u0E32\u0E19 \xB7 \u0E23\u0E27\u0E21 ", fmtBaht(costStats.total))), React.createElement("div", {
    className: "seg",
    style: {
      display: "inline-flex",
      background: "var(--bg)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: 3
    }
  }, React.createElement("button", {
    onClick: () => setCostView("category"),
    style: {
      padding: "7px 14px",
      borderRadius: 7,
      border: "none",
      fontSize: 13,
      cursor: "pointer",
      background: costView === "category" ? "var(--primary)" : "transparent",
      color: costView === "category" ? "#fff" : "var(--muted)",
      fontFamily: "Kanit"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-tags"
  }), " \u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("button", {
    onClick: () => setCostView("project"),
    style: {
      padding: "7px 14px",
      borderRadius: 7,
      border: "none",
      fontSize: 13,
      cursor: "pointer",
      background: costView === "project" ? "var(--primary)" : "transparent",
      color: costView === "project" ? "#fff" : "var(--muted)",
      fontFamily: "Kanit"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-diagram-project"
  }), " \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("button", {
    onClick: () => setCostView("machine"),
    style: {
      padding: "7px 14px",
      borderRadius: 7,
      border: "none",
      fontSize: 13,
      cursor: "pointer",
      background: costView === "machine" ? "var(--primary)" : "transparent",
      color: costView === "machine" ? "#fff" : "var(--muted)",
      fontFamily: "Kanit"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-industry"
  }), " \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr",
      gap: 0
    }
  }, React.createElement("div", {
    className: "card-body",
    style: {
      height: 360,
      borderRight: "1px solid var(--line)"
    }
  }, React.createElement("canvas", {
    ref: costRef
  })), React.createElement("div", {
    style: {
      maxHeight: 360,
      overflowY: "auto"
    }
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, costView === "category" ? "หมวดหมู่" : costView === "project" ? "โครงการ" : "เครื่องจักร"), React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "\u0E07\u0E32\u0E19"), React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22"), React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "%"))), React.createElement("tbody", null, (costView === "category" ? costStats.byCat : costView === "project" ? costStats.byProj : costStats.byMach).map((x, i) => {
    const pct = costStats.total ? x.cost / costStats.total * 100 : 0;
    return React.createElement("tr", {
      key: i
    }, React.createElement("td", null, React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: x.color,
        display: "inline-block"
      }
    }), React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, x.name))), React.createElement("td", {
      style: {
        textAlign: "right",
        color: "var(--muted)",
        fontSize: 12.5
      }
    }, x.count), React.createElement("td", {
      style: {
        textAlign: "right",
        fontWeight: 500,
        fontSize: 13
      }
    }, fmtBaht(x.cost)), React.createElement("td", {
      style: {
        textAlign: "right",
        color: "var(--muted)",
        fontSize: 12
      }
    }, pct.toFixed(1), "%"));
  }), (costView === "category" ? costStats.byCat : costView === "project" ? costStats.byProj : costStats.byMach).length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "4"
  }, React.createElement("div", {
    className: "empty",
    style: {
      padding: 30
    }
  }, React.createElement("i", {
    className: "fa-solid fa-chart-column"
  }), React.createElement("div", {
    className: "t",
    style: {
      fontSize: 14
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22"))))))))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E39\u0E48"), React.createElement("div", {
    className: "sub"
  }, recent.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \xB7 \u0E22\u0E01\u0E40\u0E27\u0E49\u0E19\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E41\u0E25\u0E49\u0E27")), React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => goTo("repairs")
  }, "\u0E14\u0E39\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ", React.createElement("i", {
    className: "fa-solid fa-arrow-right"
  }))), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("th", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E1C\u0E39\u0E49\u0E41\u0E08\u0E49\u0E07"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"))), React.createElement("tbody", null, recent.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("span", {
    className: "ticket-id",
    style: {
      cursor: "pointer",
      textDecoration: "underline"
    },
    onClick: () => setDashDetail(r)
  }, r.running)), React.createElement("td", null, React.createElement("div", {
    className: "cell-title"
  }, React.createElement(ProblemLines, {
    title: r.title,
    max: 4
  }))), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement(CategoryChip, {
    categoryId: r.categoryId
  })), React.createElement("td", null, React.createElement(Badge, {
    status: r.status
  })), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement(Avatar, {
    name: r.reporterName
  }), r.reporterName), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      color: "var(--muted)"
    }
  }, window.__DATA.fmtDate(r.createdAt)))), recent.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "6"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-circle-check",
    style: {
      color: "#10B981"
    }
  }), React.createElement("div", {
    className: "t"
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E07\u0E32\u0E19\u0E04\u0E49\u0E32\u0E07\u0E2D\u0E22\u0E39\u0E48"), React.createElement("div", null, "\u0E07\u0E32\u0E19\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E41\u0E25\u0E49\u0E27"))))))))), dashDetail && React.createElement(window.RepairDetail, {
    r: dashDetail,
    onClose: () => setDashDetail(null),
    user: user,
    onQuick: null,
    onProblems: () => setTick(t => t + 1),
    onEdit: null,
    onEditParts: null
  }));
}
window.Dashboard = Dashboard;

/* ---- block 11 (ต้นฉบับบรรทัด 3975) ---- */
function Repairs({
  user
}) {
  const visibleRows = React.useMemo(() => window.filterByUserProjects(user, window.__DATA.repairs, "project"), [user]);
  const [rows, setRows] = React.useState(visibleRows);
  React.useEffect(() => {
    setRows(visibleRows);
  }, [visibleRows]);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [cat, setCat] = React.useState("all");
  const [filterProj, setFilterProj] = React.useState("all");
  const [filterMachType, setFilterMachType] = React.useState("all");
  const [detail, setDetail] = React.useState(null);
  const [editFor, setEditFor] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const machCatMap = React.useMemo(() => {
    const m = {};
    (window.__DATA.machines || []).forEach(x => {
      if (x.code) m[x.code] = x.categoryId || "";
    });
    return m;
  }, []);
  const projOptions = React.useMemo(() => [...new Set(rows.map(r => r.project).filter(Boolean))].sort(), [rows]);
  const machTypeOptions = React.useMemo(() => {
    const ids = new Set(rows.map(r => machCatMap[r.machineCode]).filter(Boolean));
    return window.__DATA.categories.filter(c => ids.has(c.id));
  }, [rows, machCatMap]);
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      if (q) {
        const qq = q.toLowerCase();
        if (!(r.running.toLowerCase().includes(qq) || r.title.toLowerCase().includes(qq) || (r.siteId || "").toLowerCase().includes(qq) || (r.subSite || "").toLowerCase().includes(qq))) return false;
      }
      if (status !== "all" && r.status !== status) return false;
      if (cat !== "all" && r.categoryId !== cat) return false;
      if (filterProj !== "all" && (r.project || "") !== filterProj) return false;
      if (filterMachType !== "all" && machCatMap[r.machineCode] !== filterMachType) return false;
      if (user.role === "Technician") {
        if (!(r.assignedId === user.id || r.status === "new" || r.status === "assess")) return false;
      }
      return true;
    });
  }, [rows, q, status, cat, filterProj, filterMachType, machCatMap, user]);
  const [assessFor, setAssessFor] = React.useState(null);
  const quickAction = async (r, next, actionLabel) => {
    if (next === "assess") {
      setDetail(null);
      setAssessFor(r);
      return;
    }
    let cost = r.cost;
    if (next === "progress") {
      const {
        value,
        isConfirmed
      } = await Swal.fire({
        title: "อนุมัติซ่อม",
        input: "number",
        inputLabel: "ค่าใช้จ่ายโดยประมาณ (บาท)",
        inputValue: cost || "",
        inputPlaceholder: "เช่น 5000",
        showCancelButton: true,
        confirmButtonText: "อนุมัติและเริ่มซ่อม",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#1E40AF"
      });
      if (!isConfirmed) return;
      cost = Number(value) || cost;
    }
    if (next === "done") {
      const {
        isConfirmed
      } = await Swal.fire({
        title: "ปิดงานนี้หรือไม่?",
        text: "ยืนยันว่างานซ่อมเสร็จสมบูรณ์แล้ว",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ใช่, ปิดงาน",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#10B981"
      });
      if (!isConfirmed) return;
    }
    setLoading(true);
    try {
      await window.api("updateRepairStatus", {
        id: r.id,
        status: next,
        by: user.name,
        note: actionLabel,
        cost
      });
      const updated = {
        ...r,
        status: next,
        cost,
        timeline: [...r.timeline, {
          status: next,
          when: new Date(),
          by: user.name,
          note: actionLabel
        }]
      };
      const newRows = rows.map(x => x.id === r.id ? updated : x);
      setRows(newRows);
      window.__DATA.repairs = newRows;
      setLoading(false);
      Swal.fire({
        icon: "success",
        title: "อัปเดตสถานะสำเร็จ",
        text: actionLabel,
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const saveAssess = async (r, {
    parts,
    laborCost,
    cost
  }) => {
    setLoading(true);
    try {
      await window.api("updateRepairStatus", {
        id: r.id,
        status: "assess",
        by: user.name,
        note: "เริ่มประเมินราคา",
        cost,
        patch: {
          parts,
          laborCost
        }
      });
      const updated = {
        ...r,
        status: "assess",
        cost,
        parts,
        laborCost,
        timeline: [...r.timeline, {
          status: "assess",
          when: new Date(),
          by: user.name,
          note: "เริ่มประเมินราคา"
        }]
      };
      const newRows = rows.map(x => x.id === r.id ? updated : x);
      setRows(newRows);
      window.__DATA.repairs = newRows;
      setAssessFor(null);
      setLoading(false);
      Swal.fire({
        icon: "success",
        title: "บันทึกการประเมินแล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const [editPartsFor, setEditPartsFor] = React.useState(null);
  const saveEditParts = async (r, {
    parts,
    laborCost,
    cost
  }) => {
    setLoading(true);
    try {
      await window.api("updateRepairStatus", {
        id: r.id,
        status: r.status,
        by: user.name,
        note: "แก้ไขรายการอะไหล่",
        cost,
        patch: {
          parts,
          laborCost
        }
      });
      const updated = {
        ...r,
        cost,
        parts,
        laborCost,
        timeline: [...r.timeline, {
          status: r.status,
          when: new Date(),
          by: user.name,
          note: "แก้ไขรายการอะไหล่"
        }]
      };
      const newRows = rows.map(x => x.id === r.id ? updated : x);
      setRows(newRows);
      window.__DATA.repairs = newRows;
      setEditPartsFor(null);
      setLoading(false);
      Swal.fire({
        icon: "success",
        title: "บันทึกรายการอะไหล่แล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const saveEdit = async (r, patch) => {
    setLoading(true);
    try {
      try {
        await window.api("updateRepair", {
          id: r.id,
          patch,
          by: user.name
        });
      } catch (e1) {
        if (/Unknown action/i.test(String(e1.message || e1))) {
          const {
            status,
            cost,
            ...rest
          } = patch;
          await window.api("updateRepairStatus", {
            id: r.id,
            status: status || r.status,
            cost,
            by: user.name,
            note: "แก้ไขข้อมูลโดย Admin",
            patch: rest
          });
        } else {
          throw e1;
        }
      }
      const updated = {
        ...r,
        ...patch,
        timeline: [...r.timeline, {
          status: patch.status || r.status,
          when: new Date(),
          by: user.name,
          note: "แก้ไขข้อมูลโดย Admin"
        }]
      };
      const newRows = rows.map(x => x.id === r.id ? updated : x);
      setRows(newRows);
      window.__DATA.repairs = window.__DATA.repairs.map(x => x.id === r.id ? updated : x);
      setEditFor(null);
      setLoading(false);
      Swal.fire({
        icon: "success",
        title: "บันทึกการแก้ไขแล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const deleteRepair = async r => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteRepair",
      payload: {
        id: r.id
      },
      entityLabel: "ใบแจ้งซ่อม",
      targetName: r.running || r.id,
      project: r.project || "",
      targetInfo: [r.machineCode, r.problems && r.problems[0] && r.problems[0].text || r.problem || ""].filter(Boolean).join(" · ")
    });
    if (done) {
      setRows(rows.filter(x => x.id !== r.id));
      window.__DATA.repairs = window.__DATA.repairs.filter(x => x.id !== r.id);
    }
  };
  return React.createElement(React.Fragment, null, React.createElement(Loading, {
    show: loading,
    text: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01..."
  }), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E07\u0E32\u0E19 / \u0E2D\u0E32\u0E01\u0E32\u0E23...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("select", {
    value: status,
    onChange: e => setStatus(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01\u0E2A\u0E16\u0E32\u0E19\u0E30"), window.__DATA.statuses.map(s => React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label))), React.createElement("select", {
    value: cat,
    onChange: e => setCat(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), window.__DATA.categories.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), React.createElement("select", {
    value: filterProj,
    onChange: e => setFilterProj(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), projOptions.map(p => React.createElement("option", {
    key: p,
    value: p
  }, p))), machTypeOptions.length > 0 && React.createElement("select", {
    value: filterMachType,
    onChange: e => setFilterMachType(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), machTypeOptions.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, filtered.length, " / ", rows.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19"), React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07"), React.createElement("th", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32"), React.createElement("th", null, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("th", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E1C\u0E39\u0E49\u0E41\u0E08\u0E49\u0E07"), React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, filtered.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("span", {
    className: "ticket-id",
    style: {
      cursor: "pointer",
      textDecoration: "underline"
    },
    onClick: () => setDetail(r)
  }, r.running)), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement("span", {
    className: "site-id"
  }, r.siteId || "—")), React.createElement("td", {
    style: {
      color: "var(--muted)",
      whiteSpace: "nowrap"
    }
  }, window.__DATA.fmtDate(r.createdAt)), React.createElement("td", null, React.createElement("div", {
    className: "cell-title"
  }, React.createElement(ProblemLines, {
    title: r.title,
    max: 4
  }), React.createElement("div", {
    className: "desc"
  }, r.machineCode && React.createElement("span", {
    className: "mono",
    style: {
      marginRight: 6
    }
  }, r.machineCode), r.desc.slice(0, 60), r.desc.length > 60 ? "…" : ""))), React.createElement("td", {
    style: {
      fontSize: 13
    }
  }, React.createElement(ProjectLabel, {
    name: r.project
  }), r.subSite && React.createElement("div", {
    style: {
      marginTop: 3
    }
  }, React.createElement(SubSiteTag, {
    value: r.subSite,
    project: r.project
  }))), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement(CategoryChip, {
    categoryId: r.categoryId
  })), React.createElement("td", null, React.createElement(Badge, {
    status: r.status
  })), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement(Avatar, {
    name: r.reporterName
  }), r.reporterName), React.createElement("td", null, React.createElement("div", {
    className: "row-actions"
  }, React.createElement("button", {
    className: "ia",
    title: "\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14",
    onClick: () => setDetail(r)
  }, React.createElement("i", {
    className: "fa-solid fa-eye"
  })), user.role === "Admin" && React.createElement("button", {
    className: "ia",
    title: "\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19)",
    onClick: () => deleteRepair(r),
    style: {
      color: "#EF4444"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  })))))), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "9"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-folder-open"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), React.createElement("div", null, "\u0E25\u0E2D\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32")))))))), detail && React.createElement(RepairDetail, {
    r: detail,
    onClose: () => setDetail(null),
    user: user,
    onQuick: quickAction,
    onProblems: (id, next, st) => {
      const upd = rows.map(x => x.id === id ? {
        ...x,
        problems: next,
        status: st
      } : x);
      setRows(upd);
      window.__DATA.repairs = window.__DATA.repairs.map(x => x.id === id ? {
        ...x,
        problems: next,
        status: st
      } : x);
    },
    onEdit: ["Admin", "Officer", "Engineer"].includes(user.role) ? r => {
      setDetail(null);
      setEditFor(r);
    } : null,
    onEditParts: ["Admin", "Officer", "Engineer"].includes(user.role) ? r => {
      setDetail(null);
      setEditPartsFor(r);
    } : null
  }), editFor && React.createElement(EditRepairModal, {
    r: editFor,
    onClose: () => setEditFor(null),
    onSave: saveEdit
  }), assessFor && React.createElement(AssessModal, {
    r: assessFor,
    onClose: () => setAssessFor(null),
    onSave: saveAssess
  }), editPartsFor && React.createElement(AssessModal, {
    r: editPartsFor,
    mode: "edit",
    onClose: () => setEditPartsFor(null),
    onSave: saveEditParts
  }));
}
function RepairDetail({
  r,
  onClose,
  user,
  onQuick,
  onEdit,
  onEditParts,
  onProblems
}) {
  const canAct = ["Admin", "Officer", "Technician"].includes(user.role) && !!onQuick;
  const [probs, setProbs] = React.useState(() => window.getProblems(r));
  const setProbStatus = async (i, st) => {
    const next = probs.map((p, idx) => idx === i ? {
      ...p,
      status: st
    } : p);
    const newStatus = window.deriveStatus(next, r.status);
    setProbs(next);
    try {
      await window.api("updateRepairProblems", {
        id: r.id,
        problems: next,
        status: newStatus,
        by: user.name,
        note: `ปรับสถานะ "${next[i].text}" → ${window.getStatus(st).label}`
      });
      const idx = window.__DATA.repairs.findIndex(x => x.id === r.id);
      if (idx > -1) {
        window.__DATA.repairs[idx].problems = next;
        window.__DATA.repairs[idx].status = newStatus;
      }
      r.problems = next;
      r.status = newStatus;
      if (onProblems) onProblems(r.id, next, newStatus);
    } catch (err) {
      setProbs(probs);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const doneCount = probs.filter(p => p.status === "done").length;
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: React.createElement(React.Fragment, null, "\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 ", React.createElement("span", {
      className: "ticket-id",
      style: {
        marginLeft: 6
      }
    }, r.running)),
    size: "lg",
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E1B\u0E34\u0E14"), onEditParts && React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => onEditParts(r),
      style: {
        color: "var(--primary)"
      }
    }, React.createElement("i", {
      className: "fa-solid fa-list-check"
    }), " \u0E41\u0E01\u0E49\u0E44\u0E02\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48"), onEdit && React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => onEdit(r),
      style: {
        color: "#1E40AF"
      }
    }, React.createElement("i", {
      className: "fa-solid fa-user-pen"
    }), " ", user.role === "Reporter" ? "ขอแก้ไขข้อมูล" : "แก้ไขข้อมูล"), React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => window.shareRepairImage(r, user)
    }, React.createElement("i", {
      className: "fa-solid fa-share-nodes"
    }), " \u0E41\u0E0A\u0E23\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E"))
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 14,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement(Badge, {
    status: r.status
  }), React.createElement(CategoryChip, {
    categoryId: r.categoryId
  }), React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 13
    }
  }, React.createElement("i", {
    className: "fa-solid fa-calendar"
  }), " ", window.__DATA.fmtDateTime(r.createdAt))), React.createElement("div", {
    className: "detail-grid"
  }, React.createElement("div", {
    className: "full"
  }, React.createElement("div", {
    className: "k",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("span", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32"), probs.length > 1 && React.createElement("span", {
    style: {
      color: doneCount === probs.length ? "#047857" : "var(--muted)",
      fontSize: 12,
      fontWeight: 500
    }
  }, "\u0E40\u0E2A\u0E23\u0E47\u0E08 ", doneCount, "/", probs.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("div", {
    style: {
      display: "grid",
      gap: 8,
      margin: "6px 0 4px"
    }
  }, probs.map((p, i) => React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      padding: "6px 0",
      borderBottom: i < probs.length - 1 ? "1px dashed var(--line)" : "none"
    }
  }, React.createElement("span", {
    style: {
      width: 18,
      textAlign: "right",
      color: "var(--muted)",
      fontSize: 13,
      flexShrink: 0
    }
  }, i + 1, "."), React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 120,
      fontSize: 15,
      fontWeight: 500
    }
  }, p.text), React.createElement(Badge, {
    status: p.status
  }), user.role !== "Reporter" && React.createElement("select", {
    className: "inp",
    style: {
      width: "auto",
      padding: "4px 8px",
      fontSize: 13,
      flexShrink: 0
    },
    value: p.status,
    onChange: e => setProbStatus(i, e.target.value)
  }, window.__DATA.statuses.map(s => React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label)))))), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      marginTop: 4,
      lineHeight: 1.5
    }
  }, r.desc)), r.repairNote && React.createElement("div", {
    className: "full"
  }, React.createElement("div", {
    className: "k",
    style: {
      color: "var(--primary)"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-screwdriver-wrench",
    style: {
      marginRight: 5
    }
  }), "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("div", {
    className: "v",
    style: {
      fontSize: 13,
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      borderRadius: 8,
      padding: "10px 12px",
      marginTop: 4
    }
  }, r.repairNote)), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19"), React.createElement("div", {
    className: "v mono"
  }, r.siteId || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("div", {
    className: "v mono"
  }, r.machineCode || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E40\u0E25\u0E02\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E01\u0E34\u0E42\u0E25\u0E40\u0E21\u0E15\u0E23"), React.createElement("div", {
    className: "v"
  }, r.odometerKm ? Number(r.odometerKm).toLocaleString("th-TH") : "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E40\u0E25\u0E02\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07"), React.createElement("div", {
    className: "v"
  }, r.hourMeter ? Number(r.hourMeter).toLocaleString("th-TH") : "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A / \u0E1C\u0E39\u0E49\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21"), React.createElement("div", {
    className: "v"
  }, r.driverName || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("div", {
    className: "v"
  }, React.createElement(ProjectLabel, {
    name: r.project
  }), r.subSite && React.createElement(SubSiteTag, {
    value: r.subSite,
    project: r.project,
    style: {
      marginLeft: 6
    }
  }))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("div", {
    className: "v"
  }, React.createElement(CategoryChip, {
    categoryId: r.categoryId
  }))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1C\u0E39\u0E49\u0E41\u0E08\u0E49\u0E07"), React.createElement("div", {
    className: "v"
  }, React.createElement(Avatar, {
    name: r.reporterName
  }), r.reporterName)), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A"), React.createElement("div", {
    className: "v"
  }, r.assignedId ? React.createElement(React.Fragment, null, React.createElement(Avatar, {
    name: window.getUser(r.assignedId)?.name
  }), window.getUser(r.assignedId)?.name) : React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22"))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E23\u0E27\u0E21"), React.createElement("div", {
    className: "v"
  }, r.cost ? React.createElement("span", {
    style: {
      color: "var(--primary)",
      fontWeight: 500
    }
  }, Number(r.cost).toLocaleString(), " \u0E1A\u0E32\u0E17") : React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u2014"))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19"), React.createElement("div", {
    className: "v"
  }, React.createElement(Badge, {
    status: r.status
  })))), r.parts && r.parts.length > 0 && React.createElement("div", {
    style: {
      marginTop: 18,
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#FAFBFC",
      borderBottom: "1px solid var(--line)",
      fontWeight: 500,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, React.createElement("span", null, React.createElement("i", {
    className: "fa-solid fa-box-open",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 (", r.parts.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)"), React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 12
    }
  }, "\u0E23\u0E27\u0E21\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48: \u0E3F", r.parts.reduce((s, p) => s + (Number(p.total) || 0), 0).toLocaleString())), React.createElement("div", {
    className: "table-scroll",
    style: {
      overflowX: "auto",
      WebkitOverflowScrolling: "touch"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      minWidth: 480,
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "#F8FAFC"
    }
  }, React.createElement("th", {
    style: {
      padding: "8px 14px",
      textAlign: "left",
      color: "var(--muted)",
      fontWeight: 500,
      borderBottom: "1px solid var(--line-soft)"
    }
  }, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      padding: "8px 12px",
      textAlign: "left",
      color: "var(--muted)",
      fontWeight: 500,
      borderBottom: "1px solid var(--line-soft)",
      width: 130
    }
  }, "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D"), React.createElement("th", {
    style: {
      padding: "8px 10px",
      textAlign: "center",
      color: "var(--muted)",
      fontWeight: 500,
      borderBottom: "1px solid var(--line-soft)",
      width: 60
    }
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", {
    style: {
      padding: "8px 12px",
      textAlign: "right",
      color: "var(--muted)",
      fontWeight: 500,
      borderBottom: "1px solid var(--line-soft)",
      width: 110
    }
  }, "\u0E23\u0E32\u0E04\u0E32/\u0E2B\u0E19\u0E48\u0E27\u0E22"), React.createElement("th", {
    style: {
      padding: "8px 14px",
      textAlign: "right",
      color: "var(--muted)",
      fontWeight: 500,
      borderBottom: "1px solid var(--line-soft)",
      width: 100
    }
  }, "\u0E23\u0E27\u0E21"))), React.createElement("tbody", null, r.parts.map((p, i) => React.createElement("tr", {
    key: i,
    style: {
      borderBottom: i < r.parts.length - 1 ? "1px solid var(--line-soft)" : ""
    }
  }, React.createElement("td", {
    style: {
      padding: "9px 14px",
      fontWeight: 500
    }
  }, p.name, Array.isArray(p.photos) && p.photos.filter(Boolean).length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      marginTop: 5,
      flexWrap: "wrap"
    }
  }, p.photos.filter(Boolean).map((url, pi) => React.createElement(PhotoThumb, {
    key: pi,
    url: url,
    size: 40
  })))), React.createElement("td", {
    style: {
      padding: "9px 12px",
      color: "var(--muted)",
      fontSize: 12
    }
  }, p.supplier || React.createElement("span", {
    style: {
      opacity: .45
    }
  }, "\u2014")), React.createElement("td", {
    style: {
      padding: "9px 10px",
      textAlign: "center",
      color: "var(--muted)"
    }
  }, p.qty), React.createElement("td", {
    style: {
      padding: "9px 12px",
      textAlign: "right",
      color: "var(--muted)",
      fontFamily: "JetBrains Mono,monospace",
      fontSize: 12
    }
  }, "\u0E3F", Number(p.unitPrice || 0).toLocaleString()), React.createElement("td", {
    style: {
      padding: "9px 14px",
      textAlign: "right",
      fontWeight: 500,
      color: "var(--primary)",
      fontFamily: "JetBrains Mono,monospace",
      fontSize: 12
    }
  }, "\u0E3F", Number(p.total || 0).toLocaleString())))))), r.laborCost > 0 && React.createElement("div", {
    style: {
      padding: "10px 14px",
      borderTop: "1px solid var(--line-soft)",
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      background: "#FFFBF0"
    }
  }, React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-person-digging",
    style: {
      marginRight: 6
    }
  }), "\u0E04\u0E48\u0E32\u0E41\u0E23\u0E07\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("span", {
    style: {
      fontWeight: 500,
      fontFamily: "JetBrains Mono,monospace",
      fontSize: 12
    }
  }, "\u0E3F", Number(r.laborCost).toLocaleString()))), Array.isArray(r.photos) && r.photos.filter(Boolean).length > 0 && React.createElement("div", {
    className: "detail-grid",
    style: {
      marginTop: 18
    }
  }, React.createElement(PhotoGallery, {
    photos: r.photos
  })), React.createElement("div", {
    className: "timeline"
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      marginBottom: 12,
      fontSize: 14
    }
  }, React.createElement("i", {
    className: "fa-solid fa-timeline",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"), r.timeline.map((t, i) => {
    const s = window.getStatus(t.status);
    const color = {
      new: "#0EA5E9",
      assess: "#8B5CF6",
      progress: "#F59E0B",
      parts: "#EF4444",
      done: "#10B981",
      cancel: "#64748B"
    }[t.status];
    return React.createElement("div", {
      className: "t-item",
      key: i
    }, React.createElement("div", {
      className: "t-dot",
      style: {
        background: color
      }
    }, React.createElement("i", {
      className: `fa-solid ${s.icon}`
    })), React.createElement("div", {
      className: "t-body"
    }, React.createElement("div", null, React.createElement("strong", null, s.label), " \u2014 ", t.note), React.createElement("div", {
      className: "when"
    }, "\u0E42\u0E14\u0E22 ", t.by, " \xB7 ", window.__DATA.fmtDateTime(t.when))));
  })), canAct && r.status !== "done" && r.status !== "cancel" && React.createElement("div", {
    className: "status-actions"
  }, r.status === "new" && React.createElement("button", {
    className: "quick-action",
    onClick: () => onQuick(r, "assess", "เริ่มประเมินราคา")
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass-dollar"
  }), " \u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E23\u0E32\u0E04\u0E32"), r.status === "assess" && React.createElement("button", {
    className: "quick-action",
    onClick: () => onQuick(r, "progress", "อนุมัติซ่อม เริ่มดำเนินการ")
  }, React.createElement("i", {
    className: "fa-solid fa-check"
  }), " \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E0B\u0E48\u0E2D\u0E21"), r.status === "progress" && React.createElement(React.Fragment, null, React.createElement("button", {
    className: "quick-action",
    onClick: () => onQuick(r, "parts", "รออะไหล่")
  }, React.createElement("i", {
    className: "fa-solid fa-box-open"
  }), " \u0E23\u0E2D\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48"), React.createElement("button", {
    className: "quick-action",
    onClick: () => onQuick(r, "done", "ปิดงาน")
  }, React.createElement("i", {
    className: "fa-solid fa-flag-checkered"
  }), " \u0E1B\u0E34\u0E14\u0E07\u0E32\u0E19")), r.status === "parts" && React.createElement("button", {
    className: "quick-action",
    onClick: () => onQuick(r, "progress", "อะไหล่พร้อม กลับมาดำเนินการ")
  }, React.createElement("i", {
    className: "fa-solid fa-play"
  }), " \u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23")));
}
window.getProblems = function (r) {
  if (Array.isArray(r.problems) && r.problems.length) {
    return r.problems.map(p => ({
      text: String(p.text || ""),
      status: p.status || r.status || "new"
    }));
  }
  return String(r.title || "").split("\n").map(s => s.trim()).filter(Boolean).map(t => ({
    text: t,
    status: r.status || "new"
  }));
};
window.deriveStatus = function (problems, fallback) {
  const list = (problems || []).filter(p => p && p.status);
  if (!list.length) return fallback || "new";
  const active = list.filter(p => p.status !== "cancel");
  if (!active.length) return "cancel";
  if (active.every(p => p.status === "done")) return "done";
  const order = {
    new: 0,
    assess: 1,
    parts: 2,
    progress: 3,
    done: 4
  };
  let best = fallback || "new",
    bestRank = 99;
  active.forEach(p => {
    if (p.status === "done") return;
    const rank = p.status in order ? order[p.status] : 0;
    if (rank < bestRank) {
      bestRank = rank;
      best = p.status;
    }
  });
  return best;
};
window.getRepairPlace = function (r) {
  const base = {
    mode: "",
    onsite: "",
    other: "",
    reportAt: "",
    note: ""
  };
  const p = r.repairPlace;
  return p && typeof p === "object" && !Array.isArray(p) ? Object.assign(base, p) : base;
};
window.PNM_LOGO_DATAURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQUFBAYFBQUHBgYHCQ8KCQgICRMNDgsPFhMXFxYTFRUYGyMeGBohGhUVHikfISQlJygnGB0rLismLiMmJyb/2wBDAQYHBwkICRIKChImGRUZJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJib/wAARCADgAPADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooqtfX1np9q93fXUVrbx8tLM4RR+JoAs0V5F4o+OnhvTmeDRLebWZxx5i/uoR/wI8n8BXlmv/GTxvqpZbe8h0mE9Es4/mH/AANsn8sV208DWqa2t6nHUxlKGl7n1bNLFChkmkSNB1Z2AA/OsG/8a+EtPOLvxJpsRHb7SpP5A18a6hqepalIZNR1G6vHPUzzM/8AM1TCqOigfhXbHK/5pHHLMn9mJ9fy/Fb4fRtg+Jbdv9xHb+S1Gnxc+Hz/APMwxrzj5oZB/wCy18i0Vr/ZlLuzP+0anZH2Ra/EnwLdECHxRYZPA3ybP/QgK6Gx1bS9QANjqNpdA/8APCZX/ka+FvwojJicPExjYdGQ7SPxFRLK4/ZkXHMpfaife2aK+MtD+IHjPRSosfEN0Y16RXDecn5NmvS/DXx+uUKQ+JNGWVehuLFsN9Sjf0NclTL60NtTqp4+lLfQ+gqK5zwr418NeKYwdG1WKaUDLW7/ACSr9UPP5cV0defKLi7NWO6MlJXTCiiikMKKKKACiiigAooooAKKKKACiiigAooooAKRiACScAcmq2qahZaVp8+oahcx2trApeSWQ4VRXzD8UfitqPimSXTNIeWw0TO0gHbLcj1c9l/2fzrpoYedeVo7HPXxEKKvLc9K+IXxo0rRWl0/w4qatqC5Vpt3+jxH6j759hx718/+JvEuueJrv7Vrmoy3bZysZOI0/wB1BwKx+AMCivoaGFp0V7u/c8KtialXd6dgooorqOYKKnsbO8v5hBYWk93KeNkEZc/pXY6X8KfHuoqGTQXtlPe7lWL9Cc/pWcqsIfE7Fxpzn8KucPRXrFv8CPGUgzLd6XB7GV2P6LU8vwD8VqMx6rpTn0zIP/Zax+uUP5jb6rW/lPIKK9Jvvgr48tgTFaWd4B/zxugCfwYCuQ1nwr4l0XJ1XQb61Qf8tGhJT/voZFaRr0p/DJGcqNSPxRZi0UgIPIINWtNsL3VL6HT9OtZLu7mO2OGIZZv8B71q3ZXZkk29CCOSSGVJ4pHiljOVkRirKfUEdK+gvgr4u+IWqvFbX2myatowO06nOfKeMezH/W/ln3q38OvgpYacsWo+LAmoXvDLZqcwRH/a/vn9PrXskUaQxrHEioiDCqowAPQCvDxmLp1FyRV/P/I9rCYWpB80nbyH0UUV5B6gUUUUAFFFFABRRRQAUUUUAFFFFABVe/vLWws57y8nSC3gQySSucBVHUmrFfNv7QHjttV1F/CemTf6BZv/AKY6HiaUfwf7q/qfpW9CjKtPlRhXrKjDmZzHxW+IV5411MwwM8GiW7/6PbngyH/no/uew7D3rgqKK+pp0404qMdj5upOVSXNIKKPc1678KPhHP4hWLWvEiyWukthobb7slyPU/3U/U+1TVrQox5pjpUpVZcsTgvCHg/xB4tuvJ0axaSNTiS5k+WGL6t6+wya938I/A3w/p6pceIJ31i54JjGY4FP0HLfifwr1bTrCz02zisrC2itbaJdqRRKFVR9Ks14NfHVKmkdEe5RwVOnrLVlTTdN0/TLcW+nWNvZwgYCQRhB+lW8UyaaKCJpp5UijQZZ3YKoHuTXnviX4w+DNFLxQ3rarcrx5diu8Z93OF/U1xRhOo7RVzrlOFNe87HotFfNHiD48eJLwsmi6fa6XEejyfv5P1wv6GvPdY8YeKtYYnUvEF/OD/AJiif98rgV3wy2rL4tDhnmFKPw6n2hNf2MBInvIIsdd8qr/M0kN9YXPyQ3lvNu42pKrZ/WvhN/nO5yXJ6ljk0J8jbkJQjoVODXR/Zf978DH+0v7v4n2D4p+Gfg/wARq73WlR2ty3S5s/3T59Tjg/iDU3w/8A6J4KtHSwVri8m/117MB5jjso/ur7CvmHw74/8AGHh+RTp+t3DxL/y73LedGfwbp+BFfQHwx+LGm+LZI9L1CJdN1kj5Y92Y5/8AcJ7/AOyefrXPXw+IpQs3eJvRr0Ks72tI9NooorzT0AqC7u7azgae7nSCJeryMFFcj4t8c2uls9npyrd3q8M2f3cR9z3PsK8u1TU7/Vbgz6hdPO/YMflX6DoK8TGZvSw75Ie9L8D2cHlFbELnn7sfxZ6tN8QdBW+jto2mljZ9r3ATCJ788kV1yOrqGUgqRkEHIIr5vr0r4Y+I2fGhXkmWUZtXY9R3T8O1cuX5vKtV9nWsr7f5HXmGURo0vaUbu2/+Z6RRRRX0p82FFFFABRRRQAUUUUAcT8XvFh8JeD7i6gcDULo/Z7Qdw5HLf8BGT+VfIDEsSzMWYnJZjkk+pr039oLxC2seOG02J82ukJ5IAPBlOC5/kPwrzGvpcBR9nS5nuz57G1faVbdEFFFdD4C8NT+LfFNnosRZY5G33Ei/8s4l+8fr2HuRXbKShFylsjjjFyaitzvfgb8OF8QXC+JNbg3aVA/+jQOOLmQH7x/2AfzP0r6XUBVCgAADAAqvptla6dY29jZQrDbW8YjijUYCqBgCrNfK4ivKvPmfyPpqFGNGHKgry/40fEPU/BS2FrpVpbyT3yO3nz5Ij2kdFHU8+teoV89ftSf8hHw9/wBcpv5rVYSEZ1lGWqJxU5QpOUdzyfxH4o8QeI5jLrer3F2M5ERbbGv0QcCtPTPhz421KzhvbLw9O9vOoeN2ZE3KehwSDiuT619Gfs/+Pf7Rs18JatNm9tU/0KRj/roh/B/vL/L6V72IlKhT5qSR4tCMa07VGzy1fhJ8Qm6eH8f71zGP/Zqmj+DvxCfH/EmiX/eu4/8AGvraivJ/tKt5Hpf2fS7s+UF+C3xAbrp9mv1vFqVfgj48b70Gnpz3u8/0r6oL84Ubj7VHKVjjeaeRUjRSzknCqB1Jo/tGv5D+oUfM+NfGngnXfBr2q6ykG27DeVJBLvUlcZHYg8iubjkkhlSaGRo5Y2DpIhwysOQQfWut+KXi1/GHiye/jZvsEH7iyQ9owfvfVjz+VchXu0ed017Tc8aqoKb5Nj6/+EPi1/F/g+C8uWB1C1b7Pd47uBw//Ahg/XNdsyq6lWGQRgivnn9l26kXV9escnynt4psf7QYj+Rr6Hr5nFU1TrSitj6HDVHUpKT3PFvHXhltCvfPtlJ0+4Y7D18tv7p/pXLV9C6vp1vqmnT2FyuY5lxnup7Ee4NeB6lZT6dqFxY3IxLA5Q+/ofxHNfn2bYH6vU9pD4Zfgz7/ACjHPEQ9nP4o/iitUlvNLbzx3ED7JYmDow7EdKZRXiJtO6PcaTVme++GtVj1nR7e/TAZ1xIo/hccEVqV5X8JtUMOoXGkyN8lwvmxg9mHX8x/KvVK/RcBiPrGHjN79fU/Ocdh/q2IlTW3T0Ciiiu44gooooAKraneR2GnXV9Kf3dtC8rfRQSf5VZri/jLeGx+GevSq2Ge38of8DYL/WqhHmko9yZy5YtnyHfXct/e3F/cNulupWmcn1Yk/wBahoor7FKysj5Nu+rCvo/9mjw+lp4fvPEUyfv9QlMMRPaJD/Vs/kK+b2OFJHYV9seAdNXSPBeiaeox5NnHu/3iuT+pNeZmVRxpqK6no5fDmqOXY36KKK+fPdA189ftSf8AIR8Pf9cpv5rX0LXlPxg8B6t431/Q47KSO2s7aOX7TdSc7MlcAL1YnB9q6sJOMKylLY5sVBzpOMdz5ighluJkt7eJ5ppDtSONSzMfQAda9o+G3wb11r201vXbyTRRbyLNFBAR9oJByMnon05P0r17wR4C8O+Drcf2daiS8ZcSXs+Glf8AH+EewrqiGI/uj9a68RmDneNPRHLQwKj709WKWAOOp9KTDN97gegrlfGHj7wv4Pj26peg3R5FpbjzJj7kdvqcV0mmX1rqen2+oWMyz2tzGJIpFPDKRXmOEklJrRnoqUW7J6lgAKMDgV45+0T4x/szR08L2E2LzUk3XLKeY4M9Pqx4+gNep+ItYstA0W81fUH2W1pGZH9T6KPcnAH1r4s8Sa1e+IddvNZv2Jnu5C+3PCL/AAqPYDArvwFD2k+aWyOLG1/Zw5VuzNooq7oul32t6rbaVpsJmu7p9kajoPUn0AHJNfRN2V2eCld2R7h+y7pcixa5rbrhJGjtYz67cs381r3msPwX4dtvC3hqy0S1O5bdP3kmOZHPLMfqa3K+TxFT2tVzXU+noU/Z01EK8w+LemCO4tNWjXHm/uZfqOVP5ZFen1zfxDtRdeEr7jLQgSr9VP8AhmvIzGiq2GnHyv8Acerl9Z0cTCS72+88Rooor88P0Uv6De/2drVlfZwIZVLf7vQ/pmvfLO7tr2Bbi0njnibo8bZFfOlXNM1K/wBLn8/T7qS3fuFPyt9R0Nexl2ZfVLwkrpni5llv1u04u0kfQ1FedaB8RoX2w63B5LdPtEIyp+q9R+Ga76zvLa9gW4tJ0nibo8bZFfY4fF0cQr05X/M+OxGFrYd2qxt+RPRRRXUcwV5t+0IxX4Y3wAPzTwg/99ivSa8/+PFubj4Xaxj/AJZeVL+Ui1tQdqsfVGNdXpS9D5Jooor64+WHRKGljU9GdQfzFfd9qoS2iQdFRQPyr4NYlRuHUcivunQblb3RNPvEOVnto5AR7qDXi5ovhfqexlr+JF6iiivFPXCiiuM+JHj/AErwTpwef/SdRmB+zWSNhn/2m/ur7/lVRhKcuWKuyZSUVzS2Oi1zWdL0HTpNR1e9is7aPq8jYyfQDqT7Cvnzx98bdU1NpLHwsj6ZZnKm7cDz5B/sjog/M/SvOPFvijWvFepHUNZujKw/1UK8RQj0Re316msSvew+AjD3qmr/AAPFr46U/dp6IdLJJLK80sjySudzyOxZmPqSeteu/Af4gx6FdHw5rdyI9LuGL208rYW3k7qT2Vv0P1ryCjjHOMV3VqMa0OSRxUqsqU+ZHsP7QHjqDXLy38O6PdpcadakS3E0TZSWXsoI6hR+p9q8erd8M+EfEfiWQJomkT3KZwZiNkS/Vzx+Vey+EPgNaxFLnxVqP2phz9jtCUj+jP1P4YrmVWhhIKFzodOtip89jxTwx4b1rxPqIsNEsXuZc/O/SOIert0H86+pPhh8OtO8E2ZkLC81adcT3ZXAA/uIOy/qe9ddpGlabo9iljpdlDZW0f3Y4U2j6+59zV2vIxONnW91aI9TD4SNHV6sKKKK4TtCszxIofw/qSt0NtJ1/wB01p1i+MZxb+F9TlJ/5YMo+p4/rWNdpUpN9ma0U3Uil3R4Ov3R9KKB0xRX5kfpwUUUUDCrmmalf6XP59hdSW799p+VvqOhqfRdC1TWpNthas6ZwZm+WNfx/wAK9G0D4e6dabZtVf7fN18vGIlP07/jXpYPAYms1Knou+x5eMx+Fopxqe8+25N4J8V3+tkQ3WlyfLwbuEfuiffPQ/TNdnTYo44o1jijWNFGFVRgD8KdX3VCnOnBRnLmfc+FrzhUm5U48q7BWL4003+1/CWsaaBlrm0kRR/tbTj9cVtUV0J2dzBq6sfBC52jcMEdR6GlrqfifoZ8PeO9X04JthaYzwe8b/MPyyR+FctX2EJKcVJdT5SceSTj2CvrL4C6yNW+HVjCzZn05mtJBnn5eV/8dIr5Nr1P9nrxK2j+Mv7HlLG11hRGAoztmXJU49xkH8K48fS9pRut1qdWCqclXXrofUdFFFfNH0Rznj/xRaeEPDNzrNyBI6fJBDnBllP3V/qfYGvlfTdL8VfEnxRcTRKbu9mbfc3Mh2xQL2BPYAdFHNeo/tCR6hrnjDwt4UsjzchnQHpvZtu4+wUE/nW/8QYrP4a/CSTS9CHkzXRW1E/R3dwd8hPrtB+nFerh5KjBcvxy/BHmV06s3zfDH8TwLxRb6Jpdw+kaPKdSkgO251J+FkcdViXsgP8AEck/SsHOOta/hTw3q3ijVk0rRrbzZiMu7cJEv95j2H86+gvD3gnwh8PYo7m/UazruAQ7qCEP+wp4Qe55ruxONo4KF6ktTzqdCVZ82yPI/Bvwq8WeJglx9l/suwbn7TegqWHqqdT+gr23wj8G/COiBJ72Jtau158y7/1YPtGOPzzWfrXifVdT3qZvs8B/5ZQnHHuepr1DRf8AkEWX/XBP/QRXzNPO5Y6coQ0SPUw9CinorvzLMMUcMSxRRrHGgwqKoAA9hT6KKs9AKKKKACiiigArhfixfiDRIbBTh7qUEj/ZXk/riu5JA5PFeG+N9YGs+IJpo23W0P7qH3A6n8TXj5viFRwzj1lp/metlOHdbEp9I6/5GBzRRRXwh98SQRSTzxwRjMkrhFHuTivVfD/w90+z2zao/wBumHPl4xGD9O/41xvw5083/iiByuYrQGZj79F/U/pXtdfU5NgadSDrVFfXQ+UzrG1IVFRpu2moyGKOGNY4o1RFGFVRgD8KfRRX1KVtEfLBRRRTAKKKKAPFf2k/DDXmj2vii1j3Taf+6udo5MLHhv8AgLfoxr5zr7vvrS3vrOezu4hNbzxtHJG3RlIwRXxr8QvCl14O8TXGkzBmtyfMtJj/AMtYiePxHQ+4r3cur3j7KXTY8XH0bS9otnuc1X0X+zz4H+wWX/CW6nDi7u0K2SMOY4T1f6t/L615f8IPBL+MfEq/aYz/AGRYkSXbdn/uxg+/f2zX1zGixxqiKFVRhVUYAHYClmGJsvZR+Y8Bh7v2svkOooorwz2Tj/Fnh17jxT4f8V2sPn3Gku8c0P8AE8Lgglf9pTzjuM1yX7SdpLd+Abe+twZI7K8SSXb2UqVz+ZH5167VPV9NtNW0y60y+iEtrdxNFKh7qRitqdVwnGXYxqUlOEo9zzbwjY2/w/8Ah7ZRwRodY1NBPNIRzuIzz7KCAB61gSySTSvNM7SSOcs7HJJrrfiBYTWqaY25pIYYBB5h/vDufqK4+vis5xFSriZKeyOKp7rUFsgb7p+le16L/wAgey/64J/6CK8Tb7p+le2aL/yB7L/rgn/oIrfJPjn6G2G3Zcooor6g7QooooAKKKRwWUgEqSMZHagDhfiV4kFjatpFnJ/pc6/vWU/6tD/U/wAq8oHHAFdN4w8NarpN5Ndzs97bSuW+19Tk/wB/0P6VzNfn+Z1a1TEP2qtbZeR+gZXSo08OvZO9935i0GkrovA+gtrmsKJVP2K2Iedux9F/H+VcNGlKtUVOG7O2vWjQpupPZHoHw00c6doYupl23F6RIc9Qn8I/r+NdhSKoUAKAAOABS1+kUKMaNONOOyPzivVlWqSqS3YUUUVsYhRRRQAUUUUAFcf8TvBVp418PtZsVhv4MyWdwR9x/Q/7J6H8+1dhRVRk4SUo7omUVJOL2Phi+g1bQtQudLumubC6t5CssKyMvzevB5B7H0qH+0NQ/wCgjef+BD/419W/FX4c2XjSx+0QFLTWrdcQXOOHH9x/Ue/UV8razpeo6LqU2maraSWl3CcPG47eoPcHsRX0uGxEMQtV7x89iKE6L8iP+0NQ/wCgjef+BD/41Jb6tq1tcR3EGq3sc0TB0dbh8qR361Sorr5I9jl5pdz37wB8co2WKw8ZR+W4+UajAnyn/rog6fUcewr27Tb+y1O0S70+7hu7eQZWWFw6n8RXwnWloWvazoFz9p0XU7iwkPJ8l8K3+8vQ/iK8ytl0Ja03b8j0aOPlHSep9u3lrb3ts9tcxLJE4wytXAaz4Iu4GaXS5BcR9fKc4cfj0NeZ+H/j1r1oqx65pVtqSjrLC3kyH8OVP6V3el/HTwZcqBeR3+nuevmQb1H4qTXgYzJ3WX7yF/NHd9Yw9XdmLeWt1ZkpdW8kDekikV7Jov8AyB7L/rgn/oIrk0+J/wAO7yPa/iKzKt/BMjL+hWpv+Fl/D+GMAeJ7AKOAqk8fgBXBg8rnhJyau0/I0p+zg21JHZ0V5zffGbwDag7NTmuyO1vbOc/iQBXH61+0DbKGTQ/D8srdpL2UIP8Avlcn9a9iGFrT2iypYmjHeR7tSIyuoZWDKehByK+PfFHxM8ZeIg8V1qrWlq3BtrIeUpHoSPmP4mtH4YfE/UvB0i2N2r3+iM3zQFsvBnq0ZP8A6D0+ldTy2qoc19exzLH03K3TufWVFZfh3X9J8Raamo6Pex3dsw5KHlD/AHWHVT7GtSvNaadmegmmroR0V1KOoZWGCCMg1w+vfD7T70tPpj/YJ252YzGfw7fhXc0VzV8NSxEeWornRQxFXDy5qbseIzeCvEUV9HamzDLI20To26NR6k9RXrfh3R7XRNMjsbYZ28vIesjdya06K5sJl1HCycobvudWLzCtioqM9l2CiiivRPOCiiigAooooAKKKKACiiigArmPHXgnQ/Gen/ZtUgKzxg+RdxYEsJ9j3HseK6eiqjJxd4uzFKKkrM+PPHvw58Q+Dpmkuoftmm5+S+t1JTH+2OqH68e9cZ16GvvSSNJY2jkRXRhhlYZBHoRXlXjX4KeHtZaS70Rzot42SVjXdA590/h/D8q9mhmS2q/eeRWy970/uPmCiuy8U/DXxj4cLvdaU93ar/y82X71MepA+YfiK4zIyR3HUdxXrQqQqK8Xc8ucJQdpKwtFFFWQFFFFABRRRQAUUfWtHRND1nXZxBo2l3N+5OP3MZKj6t0H4mlKSirspJt2Q/w7r+seG9QGoaJfSWc/8W3lZB6MvRh9a+hfhp8YY/Et7Bouq6XNDqcnAls4zJC3uwHKD65HvXJ+EPgPf3DR3HirUFs4uptLQh5D7F+g/DNe4+GfDWieGbL7HounxWkZ+8yjLyH1ZjyT9a8TG18PPRK77/1uexhKNeDu3ZdjYooorxz1QooooAKKKKACiiigAooooAKKKKACiiigAooqlZ6pYXz3kdpcrM9jMYbgL/yzcAEqfwIoC5dorhvEXju3srXT73SrnTLu0vldomnnkV32nBKokbEgYOScYrR0zxKL/SrPZd6Z/aupwzSWEcE7SwzFB13bQcDjPAIquSVrtEKcW7I6iue1/wAFeFNfydV0K0uJD/y1CbJP++lwayrXxZqFjdTweKW0WxSxhjkvZLe7kdot52odpQfKzZ78Vq6T4z8MatqQ0zT9Ximu2Uske1l8wDqUJAD49s1SU46oTlCWjOA1b4C+F7kltN1DUNPJ/hLCZPyYZ/WuVvf2fdXQn7D4js5R2E8DIf0Jr3y41Wwg1S10qa5VL67R3ghOcyKmNxHbjIqgvi3w4+myammrQNZxXX2N5lJIE24Ls6ZzkgV0QxeIjs7nPLC0Huj58m+BPjRGIjuNLlHqJ2X+a1GvwM8cE8tpi+/2lv8A4mvoKLxp4Xm1caRFrEDXhlMIUZ2mQdUD42lvbOa1LPVtOvLe7uLW7SWKzleGdlziN0+8p+lbPH4hb/kZrBYd7fmfPFr8AfE0mPtOs6ZAO+0O5/kK6LTf2fbFcNqniO4m9UtoFjH5kmvTLzx54StIbWefW4Ql3CLiLYrOTEf+WhABKr7nArXt9a0u4vorGC9iluZrb7XGiHO+HON4PQjNRLGYlrV2+RUcJh10/E5HQ/hJ4E0oq40cX0q9JL2Qy/ofl/Su5tra3tYVhtYI4Il+7HEgVR+ArKvPFPh+yS/kutVghXTpFhudxP7t2AKrjuSCMAZrFt/Ft3rd7NF4TTS9RjgVTKt1dSW8yE+sZjJA9D3rlk6lTWV36nQlTp6RR2lFc54K1LUdSsLyXU7qxnuIr6aHbYsWSEKR+7JIGWHc4rG8YeNLEwy6XoHiSwtNXW4WEyTqTErZ5j8zaUV/rUKDbsi3NJXZ3lFcv/wmfh/T7mHSNW1y1GqoI4rnYreWspA4LYwmT0BOapeNvG1tokqWdhf6c2oROrXUF0ZSI4SDklo1bYemN3amoSbtYHOKV7na0Vylr4thtNHTVvElzplna3LKLOSzuWuBcAjPy/KCT7AGtbQfEOj6/DLLpF8l0IW2SqAVeNvRlYAj8RScWtRqSehq0UUVJQUUUUAFFFFABRRRQAUUUUAB6V5nY6lP4T1zxZDqGjapP/aN8byyks7RpknDRquzK/dYFe+K9Moq4y5bruRKN7HilrpF1oWkeFxqVhremahbWEi/2rpK/aDCzyFzbyxBWyOQc4xkVNYxa5ZxeFfEGq6HcwwWcl/DcDT7PZMiSjEc7Qr90nGWAzgnpXsuKRuBWntm91/X9MyVG2z/AK0/yPAr/wAPanf6b4qv7WPXr6xuIbK0tRqUZM92FmDOxXaGKqCcE479a9J8aafNJ4k8EyWlk7w2eoOXaKPKwp5LDnHQdB+VP0bxRqFzZjUr2yC2ItHnklWNohGwPChnOHzzyMdPercHioXNrE1vps0lxJdtaeRvVcMqbySTjjb+tVKpJvb+rWFGEF13/wAzK+LFtqUVhpniHRbKa91LR7ovHBAu53SRDGwA/wCBKfwrktL8I6lp/ijQ/Dv2GVtHY22rXdyFPli4hiZWUn1Z9rYr0CbxjYx/2awt5WjvkifcCMxCRti5H1/+tmkufFhglnX+yLl4oTNmTzEAKxMFdgM56kYHelGpOMeVL+v+AEoQcuZsy/iTo+3w7pVpo2mfLHrdpO0NrD90ebud8Dp3JNZFjqd3oMfi3Q5tB1W4v73Ubu4sxb2rPFOko+UiQfKPfJGK7Z/EtsviAaOYJCzFkEwIK7xH5hXHb5fx9qqxeLof7PlvLnT7i3CwQ3EcZZWMiSsVToeDuHNKM2o8rVynFN3TM7wNo4tPhrY+dpgh1RtHWCffDiU4Q4Ru/BJ4964vwc2peG73wrfX+g6o9rF4ZFrcvDas7W7+dkBlHPboORXos/jC3hs4JvsFy000ksfkYwQYxljnuOmPXPatLVdXFp4f/teGLfvWMxrKdoG8gAv6AbgT7A01Ukr3W4uSLtZ7HkupW2qXS3/ii30bUEjn8UWd3ao1s3n+TGgR5PLxkAjPUdK67xNNJo3xI0vxK+m31xp82lyWbyWds0rCTzFZQ6rzyM4J710T6xdaf9pTUTa3UyNCsSWbFWZpDtUMrH5eehzyPpWjpGpR6jbvJ5TQSRyvDJE5BKupwQCOD9RSdR9gjTS66nL/AAngvotF1Z9Q0+fT5rnWLqcQTrhgrMCP8iuV8U6Pr4vLzwJbWMtzomtzwTQ3kdsqx2SeYWnVioAz8oKk8nNetXk3kWU9ygDGKNnAzwcAmsu51meLR9Lv47RZpL17dGjEm0J5mMkE9cZpRqNS5ktynTXLytmH8S9Gj/4V1r9ppGmBri6VXMVvFl5n3rliByzYHX2p/gywns/F/jAvZyQ2dzLayxsyYSVzCBIQT15ABrSXxC82uWthBaEW8tzNbtcOw5aNCWAUHPUYyf8ACujxip52o8r/AK2/yHyJy5l0PAtN0vxTa2XhSPTtGuxeQy6rDE0kexLMyPiOViRhVAORxz0HWu98J6Vqen/EPUnv5J7zdo1pFJqDxbFuZlZ9x44zyOOwxXoGBRgVcqzkrW/q9yY0VF3uFFFFYG4UUUUAFFFFABRRRQAUUUUAFFFFABQRkYoooAgNpam0NmbeL7MV2eTsGzb6Y6YqK20ywtUVLezgiCuZBsjAwxGC31xxmrlFAWKEmj6XI8Lvp9szQACImIfIAcjHpg8j0qZrG0bcGtoSGDBgUHIY5b8zyfWrNFAWKf8AZen/AG37d9ig+1f89tg3dMdfpx9KVtOsmjMTWkJjaMRFTGMFB0X6DPSrdFFxWRRfSNMe1S0ewt2t423LGYxgHuf1NWnhieAwPGjRFdpjKgqR6Y9KkooHYoRaRpkVrLaRWFukE3+sjEYw/wBfWpYLCzt1hWG1ijW3z5QVANmeuPr3q1RQFiva2dva2i2kMQWBQQE6jkknr9TUEejaVHC0Een26xMVJQRjBKnK8e3ar9FAWKa6Zp63pvxZQC7Of34jG/pg8/TirlFFABRRRQAUUUUAFFFFABRRRQB//9k=";
window.buildRepairFormDoc = function (r, user) {
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const m = (window.__DATA.machines || []).find(x => x.code === r.machineCode) || {};
  const cat = window.getCategory && window.getCategory(r.categoryId) || {};
  const probs = window.getProblems(r);
  const fmtDate = d => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    const y = (dt.getFullYear() + 543) % 100;
    return dt.getDate() + "/" + (dt.getMonth() + 1) + "/" + String(y).padStart(2, "0");
  };
  const dateStr = fmtDate(r.createdAt);
  const fill = v => v ? "<span class='fld'>" + esc(v) + "</span>" : "";
  const rp = window.getRepairPlace(r);
  const projLabel = window.projectFull(r.project);
  const box = on => "<span class='chk'>" + (on ? "✓" : "") + "</span>";
  const rowCount = Math.max(5, probs.length);
  let rows = "";
  for (let i = 0; i < rowCount; i++) {
    const p = probs[i];
    rows += "<tr><td class='c-no'>" + (i + 1) + "</td><td class='c-item'>" + fill(p && p.text) + "</td><td class='c-insp'></td></tr>";
  }
  const logo = "<img src='" + window.PNM_LOGO_DATAURL + "' width='92' alt='' style='display:block'>";
  const html = "<!doctype html><html lang='th'><head><meta charset='utf-8'><title>ใบแจ้งซ่อม " + esc(r.running) + "</title><style>" + "@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:'Sarabun',Tahoma,Arial,sans-serif;color:#000;font-size:13px;margin:0}" + ".sheet{width:186mm;margin:0 auto}.hd{display:flex;align-items:center;gap:14px;margin-bottom:2px}.hd-title{flex:1;text-align:center}.cn-th{font-size:22px;font-weight:700}.cn-en{font-size:15px;font-weight:700;letter-spacing:.5px}.hd-sp{width:92px}" + ".doc-title{text-align:center;font-size:16px;font-weight:700;margin:6px 0 12px}" + ".row2{display:flex;justify-content:space-between;margin-bottom:8px}" + ".info .ln{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:5px 0}" + "b{font-weight:600;white-space:nowrap}" + ".dot{border-bottom:1px dotted #000;min-height:16px;padding:0 4px;text-align:center;display:inline-block}" + ".f1{flex:1;min-width:70px}.f2{flex:2;min-width:120px}.w180{width:180px}.w120{width:120px}.fwide{flex:1;min-width:300px}" + ".box{border:1.5px solid #000;margin:10px 0}.box-hd{text-align:center;font-weight:700;border-bottom:1.5px solid #000;padding:5px;background:#f2f2f2}" + ".rt{width:100%;border-collapse:collapse;table-layout:fixed}.rt th,.rt td{border:1px solid #000;padding:5px 8px;font-size:13px;word-break:break-word;overflow-wrap:anywhere}.rt thead th{background:#fafafa}.rt .c-no{width:8%;text-align:center;vertical-align:top}.rt .c-item{width:64%;white-space:pre-wrap;line-height:1.45}.rt .c-insp{width:28%;text-align:center}.rt tbody td{height:26px;vertical-align:top}" + ".sig{width:100%;border-collapse:collapse;margin:10px 0}.sig th,.sig td{border:1px solid #000;text-align:center;padding:6px 4px;font-size:12px}.sig th{font-weight:600}.sig .sig-name td{height:34px;vertical-align:bottom;font-weight:600}.sig .sig-paren td{color:#000}.sig .sig-date td{font-size:12px}" + ".loc{padding:8px 10px}.loc .ln{display:flex;align-items:baseline;gap:6px;margin:6px 0;flex-wrap:wrap}.loc .indent{padding-left:120px}" + ".chk{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1.3px solid #000;margin-right:5px;font-size:11px;line-height:1;font-weight:700;vertical-align:middle}" + ".fld{color:#1D4ED8;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}" + "</style></head><body><div class='sheet'>" + "<div class='hd'><div>" + logo + "</div><div class='hd-title'><div class='cn-th'>บริษัท พานามณี จำกัด</div><div class='cn-en'>PANAMANEE COMPANY LIMITED</div></div><div class='hd-sp'></div></div>" + "<div class='doc-title'>ใบแจ้งซ่อมเครื่องจักรและอุปกรณ์</div>" + "<div class='row2'><div>เลขที่ <span class='dot w180'>" + fill(r.running) + "</span></div><div>วันที่ <span class='dot w120'>" + fill(dateStr) + "</span></div></div>" + "<div class='info'>" + "<div class='ln'><b>ประเภทเครื่องจักร</b><span class='dot f2'>" + fill(cat.name) + "</span><b>หมายเลขเครื่องจักร</b><span class='dot f2'>" + fill(r.machineCode) + "</span><b>กรรมสิทธิ์</b><span class='dot f1'>" + fill(m.ownership) + "</span></div>" + "<div class='ln'><b>ยี่ห้อ</b><span class='dot f1'>" + fill(m.brand) + "</span><b>รุ่น</b><span class='dot f1'>" + fill(m.model) + "</span><b>ขนาด</b><span class='dot f1'>" + fill(m.size) + "</span><b>ปี</b><span class='dot f1'>" + fill(m.year) + "</span><b>ทะเบียน</b><span class='dot f1'></span></div>" + "<div class='ln'><b>Serial No.</b><span class='dot f1'>" + fill(m.serial) + "</span><b>Engine No.</b><span class='dot f1'></span><b>Chassis No.</b><span class='dot f1'></span></div>" + "<div class='ln'><b>เลขมิเตอร์กิโลเมตร</b><span class='dot f1'>" + fill(r.odometerKm) + "</span><b>เลขมิเตอร์ชั่วโมง</b><span class='dot f1'>" + fill(r.hourMeter || m.hours) + "</span></div>" + "<div class='ln'><b>หน่วยงาน</b><span class='dot f1'>" + fill(projLabel) + "</span><b>ไซต์งาน</b><span class='dot f1'>" + fill(r.subSite || m.subSite) + "</span><b>สถานที่</b><span class='dot f1'>" + fill(m.location) + "</span></div>" + "</div>" + "<div class='box'><div class='box-hd'>รายการซ่อม (อาการผิดปกติ)</div><table class='rt'><thead><tr><th class='c-no'></th><th class='c-item'>รายการ</th><th class='c-insp'>ผู้ตรวจพบ</th></tr></thead><tbody>" + rows + "</tbody></table></div>" + "<table class='sig'><tr><th>พนักงานขับ</th><th>ผู้จัดทำเอกสาร/ ผู้รับแจ้ง</th><th>หัวหน้าแผนกปฏิบัติการ</th><th>ผู้จัดการฝ่ายบริหาร</th></tr>" + "<tr class='sig-name'><td>" + fill(r.driverName || m.driverName) + "</td><td>" + fill(r.reporterName) + "</td><td></td><td></td></tr>" + "<tr class='sig-paren'><td>( ...................... )</td><td>( ...................... )</td><td>( ...................... )</td><td>( ...................... )</td></tr>" + "<tr class='sig-date'><td>วันที่ " + fill(dateStr) + "</td><td>วันที่ " + fill(dateStr) + "</td><td>วันที่ ..............</td><td>วันที่ ..............</td></tr></table>" + "<div class='box'><div class='box-hd'>สถานที่ทำการซ่อม</div><div class='loc'>" + "<div class='ln'><b>แจ้งซ่อมที่</b><span class='dot fwide'>" + fill(rp.reportAt) + "</span></div>" + "<div class='ln'><b>สถานที่ทำการซ่อม</b>" + box(rp.mode === "onsite") + "ส่งช่างซ่อมหน้างาน ที่ <span class='dot f1'>" + fill(rp.onsite) + "</span></div>" + "<div class='ln indent'>" + box(rp.mode === "workshop") + "โรงซ่อมของบริษัทที่แจ้งซ่อม</div>" + "<div class='ln indent'>" + box(rp.mode === "other") + "อื่นๆ <span class='dot f1'>" + fill(rp.other) + "</span></div>" + "<div class='ln'><b>หมายเหตุ</b><span class='dot fwide'>" + fill(rp.note) + "</span></div>" + "</div></div>" + "</div></body></html>";
  return html;
};
window.printRepairForm = function (r, user) {
  const w = window.open("", "_blank");
  if (!w) {
    Swal.fire({
      icon: "warning",
      title: "เปิดหน้าต่างพิมพ์ไม่ได้",
      text: "กรุณาอนุญาต popup ของเบราว์เซอร์"
    });
    return;
  }
  w.document.open();
  w.document.write(window.buildRepairFormDoc(r, user));
  w.document.close();
  w.focus();
  w.onload = () => {
    try {
      w.print();
    } catch (e) {}
  };
  setTimeout(() => {
    try {
      w.print();
    } catch (e) {}
  }, 500);
};
window.shareRepairImage = async function (r, user) {
  const ensureH2C = async () => {
    if (window.html2canvas) return window.html2canvas;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.onload = res;
      s.onerror = () => rej(new Error("โหลดตัวแปลงรูปไม่ได้"));
      document.head.appendChild(s);
    });
    return window.html2canvas;
  };
  let iframe;
  try {
    Swal.fire({
      title: "กำลังสร้างรูป...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    const H2C = await ensureH2C();
    iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-100000px;top:0;width:760px;height:1200px;border:0;background:#fff";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(window.buildRepairFormDoc(r, user));
    doc.close();
    await new Promise(res => setTimeout(res, 500));
    doc.body.style.padding = "28px 24px";
    doc.body.style.background = "#ffffff";
    const node = doc.body;
    const canvas = await H2C(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: node.scrollWidth || 760
    });
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    const dataUrl = canvas.toDataURL("image/png");
    const fname = "ใบแจ้งซ่อม-" + String(r.running || "").replace(/[\\/]/g, "-") + ".png";
    const file = new File([blob], fname, {
      type: "image/png"
    });
    Swal.close();
    window.__showShareSheet(r, blob, dataUrl, file, fname);
  } catch (err) {
    Swal.close();
    if (!(err && err.name === "AbortError")) Swal.fire({
      icon: "error",
      title: "แชร์รูปไม่สำเร็จ",
      text: err && err.message || String(err)
    });
  } finally {
    if (iframe) iframe.remove();
  }
};
window.__showShareSheet = function (r, blob, dataUrl, file, fname) {
  const runTxt = String(r.running || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const canShareFiles = !!(navigator.canShare && navigator.canShare({
    files: [file]
  }));
  const canCopy = !!(navigator.clipboard && window.ClipboardItem && window.isSecureContext);
  const hint = canShareFiles ? "มือถือ: กด &quot;ส่ง / แชร์&quot; แล้วเลือก LINE&nbsp;&nbsp;·&nbsp;&nbsp;คอม: กด &quot;คัดลอกรูป&quot; แล้ววางในแชท (Ctrl+V)" : canCopy ? "กด &quot;คัดลอกรูป&quot; แล้ววางในแชท LINE ได้เลย (Ctrl+V)" : "กด &quot;ดาวน์โหลด&quot; แล้วส่งรูปเข้า LINE เอง";
  const dl = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const btn = (act, bg, color, border, label, icon) => "<button data-act='" + act + "' style='flex:1;min-width:120px;padding:11px 14px;border:" + border + ";border-radius:8px;background:" + bg + ";color:" + color + ";font-weight:600;cursor:pointer'><i class='fa-solid " + icon + "'></i> " + label + "</button>";
  const scrim = document.createElement("div");
  scrim.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px";
  scrim.innerHTML = "<div style='background:#fff;color:#111827;border-radius:14px;max-width:460px;width:100%;max-height:92vh;overflow:auto;padding:16px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)'>" + "<div style='font-weight:700;font-size:15px;margin-bottom:2px'>ใบแจ้งซ่อม " + runTxt + "</div>" + "<div style='font-size:12px;color:#64748B;margin-bottom:10px'>" + hint + "</div>" + "<img src='" + dataUrl + "' style='max-width:100%;border:1px solid #e5e7eb;border-radius:8px'/>" + "<div style='display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;justify-content:center'>" + (canShareFiles ? btn("share", "#06C755", "#fff", "0", "ส่ง / แชร์", "fa-share-nodes") : "") + (canCopy ? btn("copy", "#1E40AF", "#fff", "0", "คัดลอกรูป", "fa-copy") : "") + btn("dl", "#fff", "#111", "1px solid #cbd5e1", "ดาวน์โหลด", "fa-download") + "</div>" + "<button data-act='close' style='margin-top:8px;width:100%;padding:9px;border:0;border-radius:8px;background:#f1f5f9;color:#475569;cursor:pointer'>ปิด</button>" + "</div>";
  document.body.appendChild(scrim);
  const close = () => scrim.remove();
  scrim.addEventListener("click", e => {
    if (e.target === scrim) close();
  });
  scrim.querySelector("[data-act='close']").onclick = close;
  scrim.querySelector("[data-act='dl']").onclick = () => {
    dl();
    close();
  };
  const sb = scrim.querySelector("[data-act='share']");
  if (sb) sb.onclick = async () => {
    try {
      await navigator.share({
        files: [file],
        title: "ใบแจ้งซ่อม " + (r.running || ""),
        text: "ใบแจ้งซ่อม " + (r.running || "")
      });
      close();
    } catch (err) {
      if (err && err.name !== "AbortError") Swal.fire({
        icon: "error",
        title: "แชร์ไม่สำเร็จ",
        text: err && err.message || String(err)
      });
    }
  };
  const cp = scrim.querySelector("[data-act='copy']");
  if (cp) cp.onclick = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        [blob.type || "image/png"]: blob
      })]);
      close();
      Swal.fire({
        icon: "success",
        title: "คัดลอกรูปแล้ว",
        text: "ไปที่แชท LINE แล้ววาง (Ctrl+V) ได้เลย",
        timer: 2600,
        showConfirmButton: false
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "คัดลอกไม่ได้",
        text: "เบราว์เซอร์นี้อาจไม่รองรับ ลองใช้ดาวน์โหลดแทน"
      });
    }
  };
};
function ProblemsField({
  value,
  onChange,
  disabled,
  placeholder
}) {
  const list = value && value.length ? value.split("\n") : [""];
  const refs = React.useRef([]);
  const focusNext = React.useRef(null);
  const commit = arr => onChange(arr.join("\n"));
  const fit = el => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  React.useLayoutEffect(() => {
    refs.current.forEach(fit);
    if (focusNext.current !== null) {
      const el = refs.current[focusNext.current];
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
      focusNext.current = null;
    }
  });
  const setAt = (i, v) => {
    const parts = String(v).split(/\r?\n/);
    const a = list.slice();
    a.splice(i, 1, ...parts);
    if (parts.length > 1) focusNext.current = i + parts.length - 1;
    commit(a);
  };
  const addAfter = i => {
    const a = list.slice();
    a.splice(i + 1, 0, "");
    focusNext.current = i + 1;
    commit(a);
  };
  const add = () => {
    focusNext.current = list.length;
    commit(list.concat([""]));
  };
  const removeAt = i => {
    const a = list.filter((_, idx) => idx !== i);
    refs.current.splice(i, 1);
    commit(a.length ? a : [""]);
  };
  const taSt = {
    flex: 1,
    width: "100%",
    padding: "9px 11px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontFamily: "Kanit",
    fontSize: 13.5,
    lineHeight: 1.5,
    background: "#fff",
    resize: "none",
    overflow: "hidden",
    minHeight: 38,
    display: "block",
    outline: "none"
  };
  return React.createElement("div", {
    style: {
      display: "grid",
      gap: 8
    }
  }, list.map((p, i) => React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-start"
    }
  }, React.createElement("span", {
    style: {
      width: 20,
      textAlign: "right",
      color: "var(--muted)",
      fontSize: 13,
      flexShrink: 0,
      paddingTop: 10
    }
  }, i + 1, "."), React.createElement("textarea", {
    ref: el => {
      refs.current[i] = el;
      fit(el);
    },
    rows: 1,
    style: taSt,
    value: p,
    disabled: disabled,
    onChange: e => setAt(i, e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        addAfter(i);
      }
    },
    onFocus: e => {
      e.target.style.borderColor = "var(--primary)";
      e.target.style.boxShadow = "0 0 0 3px rgba(30,64,175,.1)";
    },
    onBlur: e => {
      e.target.style.borderColor = "var(--line)";
      e.target.style.boxShadow = "none";
    },
    placeholder: placeholder || "เช่น มอเตอร์ไหม้ ใช้งานไม่ได้"
  }), React.createElement("button", {
    type: "button",
    className: "ia",
    title: "\u0E25\u0E1A\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49",
    disabled: disabled || list.length <= 1,
    onClick: () => removeAt(i),
    style: {
      color: "#EF4444",
      opacity: disabled || list.length <= 1 ? 0.35 : 1,
      flexShrink: 0,
      marginTop: 2
    }
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  })))), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    disabled: disabled,
    onClick: add
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E32\u0E01\u0E32\u0E23"), React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--muted)"
    }
  }, "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E08\u0E30\u0E02\u0E36\u0E49\u0E19\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E43\u0E2B\u0E21\u0E48\u0E43\u0E19\u0E0A\u0E48\u0E2D\u0E07\u0E40\u0E14\u0E34\u0E21 \xB7 \u0E01\u0E14 Enter \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E36\u0E49\u0E19\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E16\u0E31\u0E14\u0E44\u0E1B")));
}
function EditRepairModal({
  r,
  onClose,
  onSave,
  scope
}) {
  const toDateStr = d => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toISOString().slice(0, 10);
  };
  const [f, setF] = React.useState({
    title: r.title || "",
    desc: r.desc || "",
    repairNote: r.repairNote || "",
    siteId: r.siteId || "",
    subSite: r.subSite || "",
    machineCode: r.machineCode || "",
    odometerKm: r.odometerKm || "",
    hourMeter: r.hourMeter || "",
    driverName: r.driverName || "",
    project: r.project || "",
    categoryId: r.categoryId || "",
    status: r.status || "new",
    reporterName: r.reporterName || "",
    assignedId: r.assignedId || "",
    cost: r.cost || "",
    photos: Array.isArray(r.photos) ? r.photos.filter(Boolean) : [],
    createdAt: toDateStr(r.createdAt)
  });
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const isReporter = scope === "reporter";
  const REPORTER_FIELDS = ["title", "desc", "siteId", "subSite", "machineCode", "odometerKm", "hourMeter", "driverName", "categoryId", "createdAt", "photos", "problems"];
  const submit = () => {
    const title = (f.title || "").split("\n").map(s => s.trim()).filter(Boolean).join("\n");
    const existing = window.getProblems(r);
    const problems = title.split("\n").filter(Boolean).map((t, i) => ({
      text: t,
      status: existing[i] && existing[i].status || r.status || "new"
    }));
    const full = {
      ...f,
      title,
      problems,
      photos: (f.photos || []).filter(Boolean).slice(0, 5),
      cost: f.cost === "" ? "" : Number(f.cost) || 0,
      createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : r.createdAt
    };
    if (!isReporter) {
      onSave(r, full);
      return;
    }
    const patch = {};
    REPORTER_FIELDS.forEach(k => {
      if (k in full) patch[k] = full[k];
    });
    onSave(r, patch);
  };
  const technicians = (window.__DATA.users || []).filter(u => ["Technician", "Officer", "Admin", "Engineer"].includes(u.role));
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-user-pen",
      style: {
        color: "#1E40AF",
        marginRight: 8
      }
    }), isReporter ? "ขอแก้ไขใบแจ้งซ่อม" : "แก้ไขข้อมูล", " \xB7 ", React.createElement("span", {
      className: "ticket-id",
      style: {
        marginLeft: 6
      }
    }, r.running)),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit
    }, React.createElement("i", {
      className: `fa-solid ${isReporter ? "fa-paper-plane" : "fa-floppy-disk"}`
    }), " ", isReporter ? "ส่งคำขอแก้ไข" : "บันทึกการแก้ไข"))
  }, isReporter ? React.createElement("div", {
    style: {
      background: "#FEF3C7",
      border: "1px solid #FDE68A",
      color: "#92400E",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 13,
      marginBottom: 16
    }
  }, React.createElement("i", {
    className: "fa-solid fa-shield-halved",
    style: {
      marginRight: 6
    }
  }), "\u0E41\u0E01\u0E49\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E01\u0E23\u0E2D\u0E01\u0E15\u0E2D\u0E19\u0E41\u0E08\u0E49\u0E07 \xB7 \u0E01\u0E14\u0E2A\u0E48\u0E07\u0E41\u0E25\u0E49\u0E27 ", React.createElement("b", null, "\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A (Admin) \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"), " \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E14\u0E34\u0E21\u0E08\u0E30\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E08\u0E19\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34") : React.createElement("div", {
    style: {
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      color: "#1E40AF",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 13,
      marginBottom: 16
    }
  }, React.createElement("i", {
    className: "fa-solid fa-pen-to-square",
    style: {
      marginRight: 6
    }
  }), "\u0E42\u0E2B\u0E21\u0E14\u0E41\u0E01\u0E49\u0E44\u0E02 \u2014 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E44\u0E14\u0E49\u0E17\u0E38\u0E01\u0E1F\u0E34\u0E25\u0E14\u0E4C \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02\u0E08\u0E30\u0E16\u0E39\u0E01\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49\u0E43\u0E19 Timeline"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: 14
    }
  }, React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, React.createElement("label", {
    className: "k"
  }, "\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32"), React.createElement(ProblemsField, {
    value: f.title,
    onChange: v => set("title", v)
  })), React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, React.createElement("label", {
    className: "k"
  }, "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E1B\u0E31\u0E0D\u0E2B\u0E32"), React.createElement("textarea", {
    className: "inp",
    rows: "2",
    value: f.desc,
    onChange: e => set("desc", e.target.value)
  })), !isReporter && React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, React.createElement("label", {
    className: "k",
    style: {
      color: "var(--primary)",
      fontWeight: 500
    }
  }, "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21 ", React.createElement("span", {
    style: {
      fontWeight: 400,
      color: "var(--muted)"
    }
  }, "(\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E42\u0E14\u0E22\u0E0A\u0E48\u0E32\u0E07/\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48)")), React.createElement("textarea", {
    className: "inp",
    rows: "3",
    placeholder: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21 \u0E27\u0E34\u0E18\u0E35\u0E41\u0E01\u0E49\u0E44\u0E02 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49...",
    value: f.repairNote,
    onChange: e => set("repairNote", e.target.value)
  })), React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, React.createElement("label", {
    className: "k"
  }, React.createElement("i", {
    className: "fa-solid fa-images",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A ", React.createElement("span", {
    style: {
      fontWeight: 400,
      color: "var(--muted)"
    }
  }, "(\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 5 \u0E23\u0E39\u0E1B)")), React.createElement(PhotosField, {
    value: f.photos,
    onChange: v => set("photos", v),
    uploadContext: {
      running: r.running
    }
  })), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19"), React.createElement("input", {
    className: "inp",
    value: f.siteId,
    onChange: e => set("siteId", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("input", {
    className: "inp",
    list: "edit-machine-dl",
    value: f.machineCode,
    onChange: e => {
      const code = e.target.value;
      const m = (window.__DATA.machines || []).find(x => x.code === code);
      setF(p => ({
        ...p,
        machineCode: code,
        ...(m && !p.project ? {
          project: m.project || ""
        } : {})
      }));
    },
    placeholder: "\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23..."
  }), React.createElement("datalist", {
    id: "edit-machine-dl"
  }, (window.__DATA.machines || []).map(m => React.createElement("option", {
    key: m.id,
    value: m.code
  }, m.name, m.project ? ` · ${m.project}` : "")))), isReporter ? React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("input", {
    className: "inp",
    value: f.project || "— ไม่ระบุ —",
    disabled: true,
    style: {
      background: "#F8FAFC",
      color: "var(--muted)"
    }
  })) : React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("select", {
    className: "inp",
    value: f.project,
    onChange: e => setF(p => ({
      ...p,
      project: e.target.value,
      subSite: ""
    }))
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38 \u2014"), Array.from(new Set((window.__DATA.machines || []).map(m => m.project).filter(Boolean))).sort().map(p => React.createElement("option", {
    key: p,
    value: p
  }, p)))), (() => {
    const sites = window.projectSites(f.project);
    const legacy = f.subSite && !sites.includes(f.subSite);
    return sites.length || legacy ? React.createElement("div", null, React.createElement("label", {
      className: "k"
    }, "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"), React.createElement("select", {
      className: "inp",
      value: f.subSite,
      onChange: e => set("subSite", e.target.value)
    }, React.createElement("option", {
      value: ""
    }, "\u2014 \u0E17\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 (\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E44\u0E0B\u0E15\u0E4C) \u2014"), sites.map(s => React.createElement("option", {
      key: s,
      value: s
    }, s)), legacy && React.createElement("option", {
      value: f.subSite
    }, f.subSite, " (\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27)"))) : null;
  })(), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E40\u0E25\u0E02\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E01\u0E34\u0E42\u0E25\u0E40\u0E21\u0E15\u0E23"), React.createElement("input", {
    className: "inp",
    type: "number",
    min: "0",
    step: "any",
    value: f.odometerKm,
    onChange: e => set("odometerKm", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E40\u0E25\u0E02\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07"), React.createElement("input", {
    className: "inp",
    type: "number",
    min: "0",
    step: "any",
    value: f.hourMeter,
    onChange: e => set("hourMeter", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A / \u0E1C\u0E39\u0E49\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21"), React.createElement("input", {
    className: "inp",
    value: f.driverName,
    onChange: e => set("driverName", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("select", {
    className: "inp",
    value: f.categoryId,
    onChange: e => set("categoryId", e.target.value)
  }, window.__DATA.categories.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), !isReporter && React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("select", {
    className: "inp",
    value: f.status,
    onChange: e => set("status", e.target.value)
  }, window.__DATA.statuses.map(s => React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label)))), !isReporter && React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22 (\u0E1A\u0E32\u0E17)"), React.createElement("input", {
    className: "inp",
    type: "number",
    value: f.cost,
    onChange: e => set("cost", e.target.value)
  })), React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07"), React.createElement("input", {
    className: "inp",
    type: "date",
    value: f.createdAt,
    onChange: e => set("createdAt", e.target.value)
  })), !isReporter && React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E1C\u0E39\u0E49\u0E41\u0E08\u0E49\u0E07"), React.createElement("input", {
    className: "inp",
    value: f.reporterName,
    onChange: e => set("reporterName", e.target.value)
  })), !isReporter && React.createElement("div", null, React.createElement("label", {
    className: "k"
  }, "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A"), React.createElement("select", {
    className: "inp",
    value: f.assignedId,
    onChange: e => set("assignedId", e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22 \u2014"), technicians.map(u => React.createElement("option", {
    key: u.id,
    value: u.id
  }, u.name, " (", u.role, ")"))))), React.createElement("style", null, `.inp{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font-family:Kanit;font-size:13.5;background:#fff}.inp:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,64,175,.1)}label.k{display:block;font-size:12px;color:var(--muted);margin-bottom:5px}`));
}
function AssessModal({
  r,
  onClose,
  onSave,
  mode = "assess"
}) {
  const initParts = r.parts && r.parts.length > 0 ? r.parts.map(p => ({
    name: p.name || "",
    qty: p.qty || 1,
    unitPrice: p.unitPrice || 0,
    supplier: p.supplier || "",
    photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : []
  })) : [{
    name: "",
    qty: 1,
    unitPrice: 0,
    supplier: "",
    photos: []
  }];
  const [parts, setParts] = React.useState(initParts);
  const [laborCost, setLaborCost] = React.useState(r.laborCost || "");
  const addPart = () => setParts(p => [...p, {
    name: "",
    qty: 1,
    unitPrice: 0,
    supplier: "",
    photos: []
  }]);
  const removePart = i => setParts(p => p.filter((_, idx) => idx !== i));
  const upPart = (i, k, v) => setParts(p => {
    const a = [...p];
    a[i] = {
      ...a[i],
      [k]: v
    };
    return a;
  });
  const partsTotal = parts.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.unitPrice) || 0), 0);
  const total = partsTotal + (Number(laborCost) || 0);
  const fmt = n => Math.round(Number(n) || 0).toLocaleString();
  const inStyle = {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid var(--line)",
    borderRadius: 7,
    fontFamily: "Kanit",
    fontSize: 13,
    outline: "none",
    background: "#fff"
  };
  const submit = () => {
    const cleanParts = parts.filter(p => p.name.trim()).map(p => ({
      name: p.name.trim(),
      qty: Number(p.qty) || 1,
      unitPrice: Number(p.unitPrice) || 0,
      total: (Number(p.qty) || 1) * (Number(p.unitPrice) || 0),
      supplier: p.supplier.trim(),
      photos: (p.photos || []).filter(Boolean).slice(0, 2)
    }));
    onSave(r, {
      parts: cleanParts,
      laborCost: Number(laborCost) || 0,
      cost: total
    });
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: mode === "edit" ? React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-list-check",
      style: {
        color: "var(--primary)",
        marginRight: 8
      }
    }), "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 \xB7 ", React.createElement("span", {
      className: "ticket-id",
      style: {
        marginLeft: 4
      }
    }, r.running)) : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-magnifying-glass-dollar",
      style: {
        color: "#8B5CF6",
        marginRight: 8
      }
    }), "\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E23\u0E32\u0E04\u0E32 \xB7 ", React.createElement("span", {
      className: "ticket-id",
      style: {
        marginLeft: 4
      }
    }, r.running)),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " ", mode === "edit" ? "บันทึกการแก้ไข" : "บันทึกการประเมิน"))
  }, React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, React.createElement("i", {
    className: "fa-solid fa-box-open",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48"), React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: addPart
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("div", {
    style: {
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    style: {
      width: "100%",
      minWidth: 520,
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "#FAFBFC"
    }
  }, React.createElement("th", {
    style: {
      padding: "9px 12px",
      textAlign: "left",
      fontWeight: 500,
      color: "var(--muted)",
      fontSize: 12,
      borderBottom: "1px solid var(--line)"
    }
  }, "\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 / \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      padding: "9px 10px",
      textAlign: "left",
      fontWeight: 500,
      color: "var(--muted)",
      fontSize: 12,
      borderBottom: "1px solid var(--line)",
      width: 150
    }
  }, "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D"), React.createElement("th", {
    style: {
      padding: "9px 8px",
      textAlign: "center",
      fontWeight: 500,
      color: "var(--muted)",
      fontSize: 12,
      borderBottom: "1px solid var(--line)",
      width: 72
    }
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", {
    style: {
      padding: "9px 10px",
      textAlign: "right",
      fontWeight: 500,
      color: "var(--muted)",
      fontSize: 12,
      borderBottom: "1px solid var(--line)",
      width: 130
    }
  }, "\u0E23\u0E32\u0E04\u0E32/\u0E2B\u0E19\u0E48\u0E27\u0E22 (\u0E3F)"), React.createElement("th", {
    style: {
      padding: "9px 12px",
      textAlign: "right",
      fontWeight: 500,
      color: "var(--muted)",
      fontSize: 12,
      borderBottom: "1px solid var(--line)",
      width: 100
    }
  }, "\u0E23\u0E27\u0E21 (\u0E3F)"), React.createElement("th", {
    style: {
      padding: "9px 10px",
      textAlign: "left",
      fontWeight: 500,
      color: "var(--muted)",
      fontSize: 12,
      borderBottom: "1px solid var(--line)",
      width: 120
    }
  }, "\u0E23\u0E39\u0E1B (\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 2)"), React.createElement("th", {
    style: {
      width: 36,
      borderBottom: "1px solid var(--line)"
    }
  }))), React.createElement("tbody", null, parts.map((p, i) => React.createElement("tr", {
    key: i,
    style: {
      borderBottom: i < parts.length - 1 ? "1px solid var(--line-soft)" : ""
    }
  }, React.createElement("td", {
    style: {
      padding: "7px 10px"
    }
  }, React.createElement("input", {
    value: p.name,
    onChange: e => upPart(i, "name", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E2A\u0E32\u0E22\u0E1E\u0E32\u0E19, \u0E19\u0E49\u0E33\u0E21\u0E31\u0E19\u0E44\u0E2E\u0E14\u0E23\u0E2D\u0E25\u0E34\u0E01...",
    style: inStyle
  })), React.createElement("td", {
    style: {
      padding: "7px 6px"
    }
  }, React.createElement("input", {
    value: p.supplier || "",
    onChange: e => upPart(i, "supplier", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E23\u0E49\u0E32\u0E19 A, \u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17 B",
    style: inStyle
  })), React.createElement("td", {
    style: {
      padding: "7px 6px"
    }
  }, React.createElement("input", {
    type: "number",
    min: "1",
    value: p.qty,
    onChange: e => upPart(i, "qty", e.target.value),
    style: {
      ...inStyle,
      textAlign: "center"
    }
  })), React.createElement("td", {
    style: {
      padding: "7px 6px"
    }
  }, React.createElement("input", {
    type: "number",
    min: "0",
    value: p.unitPrice,
    onChange: e => upPart(i, "unitPrice", e.target.value),
    style: {
      ...inStyle,
      textAlign: "right"
    }
  })), React.createElement("td", {
    style: {
      padding: "7px 12px",
      textAlign: "right",
      fontWeight: 600,
      color: "var(--primary)",
      fontFamily: "JetBrains Mono,monospace",
      fontSize: 12.5
    }
  }, fmt((Number(p.qty) || 0) * (Number(p.unitPrice) || 0))), React.createElement("td", {
    style: {
      padding: "7px 10px"
    }
  }, React.createElement(PartPhotosCell, {
    photos: p.photos,
    onChange: v => upPart(i, "photos", v),
    max: 2,
    uploadContext: {
      running: r.running
    }
  })), React.createElement("td", {
    style: {
      padding: "4px 6px 4px 0"
    }
  }, parts.length > 1 && React.createElement("button", {
    className: "ia danger",
    onClick: () => removePart(i),
    title: "\u0E25\u0E1A"
  }, React.createElement("i", {
    className: "fa-solid fa-xmark"
  })))))))))), React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 10
    }
  }, React.createElement("i", {
    className: "fa-solid fa-person-digging",
    style: {
      color: "var(--warning)",
      marginRight: 6
    }
  }), "\u0E04\u0E48\u0E32\u0E41\u0E23\u0E07\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, React.createElement("input", {
    type: "number",
    min: "0",
    value: laborCost,
    onChange: e => setLaborCost(e.target.value),
    placeholder: "0",
    style: {
      width: "100%",
      maxWidth: 200,
      padding: "9px 12px",
      border: "1px solid var(--line)",
      borderRadius: 10,
      fontFamily: "Kanit",
      fontSize: 14,
      outline: "none"
    }
  }), React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 13
    }
  }, "\u0E1A\u0E32\u0E17"))), React.createElement("div", {
    style: {
      background: "linear-gradient(135deg,rgba(30,64,175,.06),rgba(139,92,246,.06))",
      border: "1px solid rgba(30,64,175,.18)",
      borderRadius: 12,
      padding: "16px 20px"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "var(--primary)",
      marginBottom: 12
    }
  }, React.createElement("i", {
    className: "fa-solid fa-calculator",
    style: {
      marginRight: 6
    }
  }), "\u0E2A\u0E23\u0E38\u0E1B\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22"), React.createElement("div", {
    style: {
      display: "grid",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13
    }
  }, React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u0E04\u0E48\u0E32\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48\u0E23\u0E27\u0E21 (", parts.filter(p => p.name.trim()).length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)"), React.createElement("span", {
    style: {
      fontWeight: 500,
      fontFamily: "JetBrains Mono,monospace",
      fontSize: 12.5
    }
  }, "\u0E3F", fmt(partsTotal))), React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13
    }
  }, React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u0E04\u0E48\u0E32\u0E41\u0E23\u0E07\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("span", {
    style: {
      fontWeight: 500,
      fontFamily: "JetBrains Mono,monospace",
      fontSize: 12.5
    }
  }, "\u0E3F", fmt(laborCost))), React.createElement("div", {
    style: {
      borderTop: "1px solid rgba(30,64,175,.2)",
      marginTop: 4,
      paddingTop: 10,
      display: "flex",
      justifyContent: "space-between",
      fontSize: 17,
      fontWeight: 700
    }
  }, React.createElement("span", null, "\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19"), React.createElement("span", {
    style: {
      color: "var(--primary)"
    }
  }, "\u0E3F", fmt(total))))));
}
window.Repairs = Repairs;
window.RepairDetail = RepairDetail;
window.EditRepairModal = EditRepairModal;

/* ---- block 12 (ต้นฉบับบรรทัด 4723) ---- */
function Users({
  user
}) {
  const [rows, setRows] = React.useState(window.__DATA.users);
  const [edit, setEdit] = React.useState(null);
  const [q, setQ] = React.useState("");
  const filtered = rows.filter(u => !q || (u.name.toLowerCase() + u.username).includes(q.toLowerCase()));
  const save = async form => {
    try {
      if (form.id) {
        await window.api("updateUser", {
          id: form.id,
          patch: form
        });
        const upd = rows.map(x => x.id === form.id ? form : x);
        setRows(upd);
        window.__DATA.users = upd;
        try {
          const cur = JSON.parse(localStorage.getItem("rms_user") || "null");
          if (cur && cur.id === form.id) {
            localStorage.setItem("rms_user", JSON.stringify(form));
            Swal.fire({
              icon: "info",
              title: "อัปเดตสิทธิ์แล้ว",
              text: "กำลังโหลดหน้าใหม่เพื่อใช้สิทธิ์ล่าสุด",
              timer: 1500,
              showConfirmButton: false
            }).then(() => location.reload());
            return;
          }
        } catch (e) {}
      } else {
        const nu = await window.api("createUser", {
          user: form
        });
        const upd = [...rows, nu];
        setRows(upd);
        window.__DATA.users = upd;
      }
      setEdit(null);
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const del = async u => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteUser",
      payload: {
        id: u.id
      },
      entityLabel: "ผู้ใช้งาน",
      targetName: u.name,
      targetInfo: `${u.username || "-"} · ${u.role || "-"} · ${u.dept || "-"}`
    });
    if (done) {
      const upd = rows.filter(x => x.id !== u.id);
      setRows(upd);
      window.__DATA.users = upd;
    }
  };
  const [revealedPw, setRevealedPw] = React.useState({});
  const togglePw = async u => {
    if (revealedPw[u.id] !== undefined) {
      setRevealedPw(p => {
        const n = {
          ...p
        };
        delete n[u.id];
        return n;
      });
      return;
    }
    try {
      const {
        password
      } = await window.api("getUserPassword", {
        id: u.id
      });
      setRevealedPw(p => ({
        ...p,
        [u.id]: password
      }));
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const roleColors = {
    Admin: "#1E40AF",
    Officer: "#8B5CF6",
    Technician: "#F59E0B",
    Engineer: "#06B6D4",
    "Safety Officer": "#DB2777",
    Reporter: "#10B981",
    Director: "#EF4444"
  };
  const renderProjectAccess = u => {
    const hasAll = ["Admin", "Director"].includes(u.role) || !Array.isArray(u.projects) || u.projects.length === 0;
    if (hasAll) return React.createElement("span", {
      className: "badge",
      style: {
        background: "rgba(30,64,175,.1)",
        color: "#1E40AF",
        fontSize: 11.5
      }
    }, React.createElement("i", {
      className: "fa-solid fa-globe",
      style: {
        marginRight: 4
      }
    }), "\u0E17\u0E38\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    if (u.projects.length <= 2) return React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap"
      }
    }, u.projects.map(p => React.createElement("span", {
      key: p,
      className: "badge",
      style: {
        background: "var(--line-soft)",
        color: "var(--text)",
        fontSize: 11.5
      }
    }, p)));
    return React.createElement("span", {
      className: "badge",
      style: {
        background: "var(--line-soft)",
        color: "var(--text)",
        fontSize: 11.5
      },
      title: u.projects.join(", ")
    }, React.createElement("i", {
      className: "fa-solid fa-folder",
      style: {
        marginRight: 4
      }
    }), u.projects.length, " \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
  };
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E0A\u0E37\u0E48\u0E2D \u0E2B\u0E23\u0E37\u0E2D username...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setEdit({
      username: "",
      password: "",
      name: "",
      role: "Reporter",
      dept: "",
      email: "",
      projects: []
    })
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Username"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2D\u0E35\u0E40\u0E21\u0E25"), user.role === "Admin" && React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19"), React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, filtered.map(u => React.createElement("tr", {
    key: u.id
  }, React.createElement("td", null, React.createElement("span", {
    className: "mono",
    style: {
      background: "var(--line-soft)",
      padding: "2px 7px",
      borderRadius: 6,
      fontSize: 12.5
    }
  }, u.username)), React.createElement("td", null, React.createElement(Avatar, {
    name: u.name
  }), u.name), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement("span", {
    className: "badge",
    style: {
      background: roleColors[u.role] + "22",
      color: roleColors[u.role]
    }
  }, React.createElement("span", {
    className: "dot"
  }), u.role)), React.createElement("td", {
    className: "hide-on-mobile"
  }, u.dept), React.createElement("td", {
    className: "hide-on-mobile"
  }, renderProjectAccess(u)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      color: "var(--muted)",
      fontSize: 13
    }
  }, u.email), user.role === "Admin" && React.createElement("td", null, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      minWidth: 100
    }
  }, React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12.5,
      letterSpacing: revealedPw[u.id] !== undefined ? ".01em" : ".1em"
    }
  }, revealedPw[u.id] !== undefined ? revealedPw[u.id] : "••••••"), React.createElement("button", {
    className: "ia",
    title: revealedPw[u.id] !== undefined ? "ซ่อน" : "แสดงรหัสผ่าน",
    onClick: () => togglePw(u),
    style: {
      color: revealedPw[u.id] !== undefined ? "var(--primary)" : "var(--muted)"
    }
  }, React.createElement("i", {
    className: `fa-solid ${revealedPw[u.id] !== undefined ? "fa-eye-slash" : "fa-eye"}`
  })))), React.createElement("td", null, React.createElement("div", {
    className: "row-actions"
  }, React.createElement("button", {
    className: "ia",
    title: "\u0E41\u0E01\u0E49\u0E44\u0E02",
    onClick: () => setEdit({
      ...u,
      projects: Array.isArray(u.projects) ? u.projects : []
    })
  }, React.createElement("i", {
    className: "fa-solid fa-pen"
  })), React.createElement("button", {
    className: "ia danger",
    title: "\u0E25\u0E1A",
    onClick: () => del(u)
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  }))))))))), edit && React.createElement(UserForm, {
    init: edit,
    onClose: () => setEdit(null),
    onSave: save
  }));
}
function UserForm({
  init,
  onClose,
  onSave
}) {
  const [f, setF] = React.useState({
    ...init,
    projects: Array.isArray(init.projects) ? init.projects : []
  });
  const roles = ["Admin", "Officer", "Engineer", "Safety Officer", "Technician", "Reporter", "Director"];
  const allProjects = React.useMemo(() => Array.from(new Set((window.__DATA.machines || []).map(m => m.project).filter(Boolean))).sort(), []);
  const isSuperRole = ["Admin", "Director"].includes(f.role);
  const isProjectLocked = (window.PROJECT_LOCKED_ROLES || []).includes(f.role);
  const toggleProject = p => setF(prev => {
    const cur = prev.projects || [];
    return {
      ...prev,
      projects: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]
    };
  });
  const selectAll = () => setF(prev => ({
    ...prev,
    projects: [...allProjects]
  }));
  const clearAll = () => setF(prev => ({
    ...prev,
    projects: []
  }));
  const submit = () => {
    if (!f.username || !f.name) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณาใส่ Username และชื่อ-นามสกุล"
      });
      return;
    }
    if (isProjectLocked && !(f.projects || []).length) {
      Swal.fire({
        icon: "warning",
        title: "ยังไม่ได้กำหนดโครงการ",
        text: `บทบาท ${f.role} เห็นได้เฉพาะโครงการที่มอบหมาย — ถ้าไม่เลือกจะไม่เห็นข้อมูลใดเลย`
      });
      return;
    }
    onSave(f);
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: init.id ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่",
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"))
  }, React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "Username *"), React.createElement("input", {
    value: f.username,
    onChange: e => setF({
      ...f,
      username: e.target.value
    })
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "Password ", init.id && React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontWeight: 400
    }
  }, "(\u0E40\u0E27\u0E49\u0E19\u0E27\u0E48\u0E32\u0E07\u0E2B\u0E32\u0E01\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19)")), React.createElement("input", {
    type: "password",
    value: f.password,
    onChange: e => setF({
      ...f,
      password: e.target.value
    })
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25 *"), React.createElement("input", {
    value: f.name,
    onChange: e => setF({
      ...f,
      name: e.target.value
    })
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07/\u0E1A\u0E17\u0E1A\u0E32\u0E17"), React.createElement("select", {
    value: f.role,
    onChange: e => setF({
      ...f,
      role: e.target.value
    })
  }, roles.map(r => React.createElement("option", {
    key: r,
    value: r
  }, r)))), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("input", {
    value: f.dept,
    onChange: e => setF({
      ...f,
      dept: e.target.value
    })
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, "\u0E2D\u0E35\u0E40\u0E21\u0E25"), React.createElement("input", {
    value: f.email,
    onChange: e => setF({
      ...f,
      email: e.target.value
    })
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8
    }
  }, React.createElement("span", null, React.createElement("i", {
    className: "fa-solid fa-folder-tree",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), !isSuperRole && React.createElement("span", {
    style: {
      fontWeight: 400,
      fontSize: 12,
      color: isProjectLocked && !f.projects?.length ? "#B91C1C" : "var(--muted)"
    }
  }, f.projects?.length ? `เลือกแล้ว ${f.projects.length}/${allProjects.length}` : isProjectLocked ? `ยังไม่เลือก = ไม่เห็นข้อมูลเลย` : `ไม่เลือก = เห็นทุกโครงการ`)), isSuperRole ? React.createElement("div", {
    style: {
      padding: 14,
      background: "rgba(30,64,175,.06)",
      border: "1px solid rgba(30,64,175,.2)",
      borderRadius: 10,
      fontSize: 13,
      color: "var(--primary)"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-shield-halved",
    style: {
      marginRight: 8
    }
  }), "\u0E1A\u0E17\u0E1A\u0E32\u0E17 ", React.createElement("strong", null, f.role), " \u0E40\u0E2B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49\u0E17\u0E38\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E42\u0E14\u0E22\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34") : React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    onClick: selectAll
  }, React.createElement("i", {
    className: "fa-solid fa-check-double"
  }), " \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14"), React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    onClick: clearAll
  }, React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14"), React.createElement("div", {
    style: {
      flex: 1
    }
  }), React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: isProjectLocked ? "#B45309" : "var(--muted)",
      alignSelf: "center"
    }
  }, isProjectLocked ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-lock",
    style: {
      marginRight: 5
    }
  }), "\u0E1A\u0E17\u0E1A\u0E32\u0E17 ", f.role, " \u0E16\u0E39\u0E01\u0E25\u0E47\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u2014 \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23") : "ไม่เลือกเลย = เห็นทุกโครงการ")), allProjects.length === 0 ? React.createElement("div", {
    style: {
      padding: 14,
      background: "var(--bg)",
      border: "1px dashed var(--line)",
      borderRadius: 10,
      fontSize: 13,
      color: "var(--muted)",
      textAlign: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-info"
  }), " \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A") : React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
      gap: 8,
      padding: 12,
      background: "var(--bg)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      maxHeight: 260,
      overflowY: "auto"
    }
  }, allProjects.map(p => {
    const on = (f.projects || []).includes(p);
    return React.createElement("label", {
      key: p,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
        background: on ? "rgba(30,64,175,.08)" : "#fff",
        border: `1px solid ${on ? "rgba(30,64,175,.4)" : "var(--line)"}`,
        fontSize: 13,
        transition: "all .15s"
      }
    }, React.createElement("input", {
      type: "checkbox",
      checked: on,
      onChange: () => toggleProject(p),
      style: {
        margin: 0,
        cursor: "pointer",
        accentColor: "var(--primary)",
        width: 16,
        height: 16
      }
    }), React.createElement("span", {
      style: {
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, p));
  }))))));
}
window.Users = Users;

/* ---- block 13 (ต้นฉบับบรรทัด 4891) ---- */
function Categories({
  user
}) {
  const [rows, setRows] = React.useState(window.__DATA.categories);
  const [edit, setEdit] = React.useState(null);
  const save = async form => {
    try {
      if (form.id) {
        await window.api("updateCategory", {
          id: form.id,
          patch: form
        });
        const upd = rows.map(x => x.id === form.id ? form : x);
        setRows(upd);
        window.__DATA.categories = upd;
      } else {
        const nu = await window.api("createCategory", {
          cat: form
        });
        const upd = [...rows, nu];
        setRows(upd);
        window.__DATA.categories = upd;
      }
      setEdit(null);
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const del = async c => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteCategory",
      payload: {
        id: c.id
      },
      entityLabel: "หมวดหมู่งาน",
      targetName: c.name
    });
    if (done) {
      const upd = rows.filter(x => x.id !== c.id);
      setRows(upd);
      window.__DATA.categories = upd;
    }
  };
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, "\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ", rows.length, " \u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setEdit({
      name: "",
      color: "#3B82F6",
      icon: "fa-wrench"
    })
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: 80
    },
    className: "hide-on-mobile"
  }, "\u0E2A\u0E35"), React.createElement("th", {
    style: {
      width: 80
    }
  }, "\u0E44\u0E2D\u0E04\u0E2D\u0E19"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "FontAwesome Class"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E07\u0E32\u0E19"), React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, rows.map(c => {
    const cnt = window.__DATA.repairs.filter(r => r.categoryId === c.id).length;
    return React.createElement("tr", {
      key: c.id
    }, React.createElement("td", {
      className: "hide-on-mobile"
    }, React.createElement("span", {
      className: "color-swatch",
      style: {
        background: c.color
      }
    }), " ", React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 12,
        color: "var(--muted)"
      }
    }, c.color)), React.createElement("td", null, React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: c.color + "22",
        color: c.color,
        display: "grid",
        placeItems: "center",
        fontSize: 16
      }
    }, React.createElement("i", {
      className: `fa-solid ${c.icon}`
    }))), React.createElement("td", {
      style: {
        fontWeight: 500
      }
    }, c.name), React.createElement("td", {
      className: "hide-on-mobile"
    }, React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 12,
        color: "var(--muted)"
      }
    }, c.icon)), React.createElement("td", {
      className: "hide-on-mobile"
    }, React.createElement("strong", null, cnt), " ", React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u0E07\u0E32\u0E19")), React.createElement("td", null, React.createElement("div", {
      className: "row-actions"
    }, React.createElement("button", {
      className: "ia",
      onClick: () => setEdit(c)
    }, React.createElement("i", {
      className: "fa-solid fa-pen"
    })), React.createElement("button", {
      className: "ia danger",
      onClick: () => del(c)
    }, React.createElement("i", {
      className: "fa-solid fa-trash"
    })))));
  })))), edit && React.createElement(CatForm, {
    init: edit,
    onClose: () => setEdit(null),
    onSave: save
  }));
}
function CatForm({
  init,
  onClose,
  onSave
}) {
  const [f, setF] = React.useState(init);
  const palette = ["#3B82F6", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#06B6D4", "#EC4899", "#6366F1", "#F97316", "#14B8A6", "#A855F7", "#0EA5E9", "#DC2626", "#16A34A", "#D97706", "#64748B"];
  const icons = ["fa-bolt", "fa-solid fa-tractor", "fa-wind", "fa-droplet", "fa-desktop", "fa-building", "fa-truck", "fa-wrench", "fa-screwdriver", "fa-hammer", "fa-fan", "fa-temperature-high", "fa-car-battery", "fa-plug", "fa-fire", "fa-snowflake"];
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: init.id ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่",
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: () => onSave(f)
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"))
  }, React.createElement("div", {
    className: "form-field",
    style: {
      marginBottom: 16
    }
  }, React.createElement("label", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("input", {
    value: f.name,
    onChange: e => setF({
      ...f,
      name: e.target.value
    })
  })), React.createElement("div", {
    className: "form-field",
    style: {
      marginBottom: 16
    }
  }, React.createElement("label", null, "\u0E2A\u0E35"), React.createElement("div", {
    className: "color-grid"
  }, palette.map(c => React.createElement("button", {
    key: c,
    className: f.color === c ? "sel" : "",
    style: {
      background: c
    },
    onClick: () => setF({
      ...f,
      color: c
    })
  })))), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E44\u0E2D\u0E04\u0E2D\u0E19 (FontAwesome)"), React.createElement("div", {
    className: "color-grid",
    style: {
      gridTemplateColumns: "repeat(8,1fr)"
    }
  }, icons.map(ic => React.createElement("button", {
    key: ic,
    className: f.icon === ic ? "sel" : "",
    style: {
      background: f.icon === ic ? f.color + "33" : "#F8FAFC",
      color: f.icon === ic ? f.color : "#64748B"
    },
    onClick: () => setF({
      ...f,
      icon: ic
    })
  }, React.createElement("i", {
    className: `fa-solid ${ic}`
  })))), React.createElement("div", {
    className: "hint mono"
  }, f.icon)), React.createElement("div", {
    style: {
      marginTop: 20,
      padding: 16,
      background: "#FAFBFC",
      borderRadius: 10,
      border: "1px dashed var(--line)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted)",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 8,
      fontWeight: 500
    }
  }, "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07"), React.createElement("span", {
    className: "cat-chip",
    style: {
      background: f.color + "22",
      color: f.color
    }
  }, React.createElement("i", {
    className: `fa-solid ${f.icon}`
  }), f.name || "ชื่อหมวดหมู่")));
}
window.Categories = Categories;

/* ---- block 14 (ต้นฉบับบรรทัด 4979) ---- */
function gdriveThumb(url, sz = 600) {
  if (!url) return null;
  let m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${sz}`;
}
window.REPAIR_PHOTOS_FOLDER = "https://drive.google.com/drive/folders/1pKk6d1dGdw1637D2ZjbZiHF9hdBbpy_5?usp=sharing";
window.fileToDrivePayload = async function (file, {
  maxDim = 1600,
  quality = 0.85
} = {}) {
  const isImg = /^image\//.test(file.type || "");
  const readBase64 = () => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const d = String(r.result || "");
      res(d.includes(",") ? d.split(",").pop() : d);
    };
    r.onerror = () => rej(r.error || new Error("อ่านไฟล์ไม่สำเร็จ"));
    r.readAsDataURL(file);
  });
  if (!isImg || typeof document === "undefined") {
    return {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data: await readBase64()
    };
  }
  try {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ""));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("โหลดรูปไม่ได้"));
      im.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const cw = Math.max(1, Math.round(img.width * scale)),
      ch = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
    const out = canvas.toDataURL("image/jpeg", quality);
    const base = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
    return {
      name: base,
      mimeType: "image/jpeg",
      data: out.split(",").pop()
    };
  } catch (e) {
    return {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data: await readBase64()
    };
  }
};
window.uploadPhotoToDrive = async function (action, context, file) {
  const upload = await window.fileToDrivePayload(file);
  const saved = await window.api(action, {
    ...(context || {}),
    upload
  });
  return {
    url: saved && saved.url,
    shared: !(saved && saved.sharing && saved.sharing.ok === false)
  };
};
function gdriveId(url) {
  if (!url) return null;
  let m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function PhotoThumb({
  url,
  size = 96,
  onRemove,
  index
}) {
  const id = gdriveId(url);
  const thumb = id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${Math.max(200, Math.round(size * 2))}` : null;
  const alt = id ? `https://lh3.googleusercontent.com/d/${id}=w${Math.max(200, Math.round(size * 2))}` : null;
  return React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size,
      borderRadius: 10,
      overflow: "hidden",
      border: "1px solid var(--line)",
      background: "var(--bg)",
      flexShrink: 0
    }
  }, React.createElement("a", {
    href: url,
    target: "_blank",
    rel: "noreferrer",
    title: "\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E39\u0E1B\u0E40\u0E15\u0E47\u0E21\u0E43\u0E19 Google Drive",
    style: {
      display: "block",
      width: "100%",
      height: "100%",
      position: "absolute",
      inset: 0
    }
  }, React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      color: "#94A3B8",
      fontSize: 22
    }
  }, React.createElement("i", {
    className: `fa-solid ${thumb ? "fa-image" : "fa-link"}`
  })), thumb && React.createElement("img", {
    src: thumb,
    alt: "",
    loading: "lazy",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    onError: e => {
      if (alt && e.target.src !== alt && !e.target.dataset.tried) {
        e.target.dataset.tried = "1";
        e.target.src = alt;
      } else {
        e.target.style.display = "none";
      }
    }
  })), typeof index === "number" && React.createElement("span", {
    style: {
      position: "absolute",
      left: 4,
      top: 4,
      background: "rgba(15,23,42,.6)",
      color: "#fff",
      borderRadius: 6,
      fontSize: 11,
      padding: "0 6px",
      lineHeight: "17px"
    }
  }, index + 1), onRemove && React.createElement("button", {
    type: "button",
    onClick: onRemove,
    title: "\u0E25\u0E1A\u0E23\u0E39\u0E1B\u0E19\u0E35\u0E49",
    style: {
      position: "absolute",
      right: 4,
      top: 4,
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: "none",
      background: "rgba(220,38,38,.92)",
      color: "#fff",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      fontSize: 11
    }
  }, React.createElement("i", {
    className: "fa-solid fa-xmark"
  })));
}
function PhotosField({
  value,
  onChange,
  max = 5,
  disabled,
  uploadAction = "uploadRepairPhoto",
  uploadContext,
  folder
}) {
  const list = Array.isArray(value) ? value : [];
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);
  const full = list.length >= max;
  const folderLink = folder || window.REPAIR_PHOTOS_FOLDER;
  const onFiles = async files => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    const room = max - list.length;
    if (room <= 0) {
      Swal.fire({
        icon: "info",
        title: `แนบได้สูงสุด ${max} รูป`
      });
      return;
    }
    const take = arr.slice(0, room);
    setBusy(true);
    const added = [];
    try {
      for (let i = 0; i < take.length; i++) {
        Swal.fire({
          title: `กำลังอัปโหลดรูป ${i + 1}/${take.length}...`,
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        try {
          const res = await window.uploadPhotoToDrive(uploadAction, uploadContext, take[i]);
          if (res && res.url) {
            added.push(res.url);
          }
        } catch (err) {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "อัปโหลดไม่สำเร็จ",
            text: err && err.message || String(err)
          });
          break;
        }
      }
      if (added.length) {
        onChange([...list, ...added]);
      }
      Swal.close();
      if (arr.length > room) {
        Swal.fire({
          icon: "info",
          title: `เพิ่มได้อีก ${room} รูปเท่านั้น`,
          timer: 1900,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      } else if (added.length) {
        Swal.fire({
          icon: "success",
          title: `เพิ่มรูปแล้ว ${added.length} รูป`,
          timer: 1200,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      }
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("div", {
    style: {
      display: "grid",
      gap: 10
    }
  }, list.length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10
    }
  }, list.map((url, i) => React.createElement(PhotoThumb, {
    key: i,
    url: url,
    index: i,
    onRemove: disabled ? null : () => onChange(list.filter((_, idx) => idx !== i))
  }))), !disabled && React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("input", {
    ref: inputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    style: {
      display: "none"
    },
    onChange: e => {
      const fs = Array.from(e.target.files || []);
      e.target.value = "";
      onFiles(fs);
    }
  }), React.createElement("button", {
    type: "button",
    className: "btn btn-primary btn-sm",
    onClick: () => inputRef.current && inputRef.current.click(),
    disabled: full || busy
  }, busy ? React.createElement(React.Fragment, null, React.createElement("div", {
    className: "spinner",
    style: {
      width: 13,
      height: 13,
      borderWidth: 2
    }
  }), " \u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14...") : React.createElement(React.Fragment, null, React.createElement("i", {
    className: "fa-solid fa-camera"
  }), " ", full ? `ครบ ${max} รูปแล้ว` : "เพิ่มรูป")), React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--muted)"
    }
  }, "\u0E16\u0E48\u0E32\u0E22/\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E39\u0E1B\u0E08\u0E32\u0E01\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 \u0E2D\u0E31\u0E1B\u0E02\u0E36\u0E49\u0E19 Google Drive \u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34")), React.createElement("div", {
    className: "hint",
    style: {
      margin: 0
    }
  }, "\u0E41\u0E19\u0E1A\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 ", max, " \u0E23\u0E39\u0E1B (", list.length, "/", max, ") \xB7 \u0E23\u0E39\u0E1B\u0E16\u0E39\u0E01\u0E40\u0E01\u0E47\u0E1A\u0E43\u0E19", React.createElement("a", {
    href: folderLink,
    target: "_blank",
    rel: "noreferrer",
    style: {
      color: "var(--primary)",
      marginLeft: 4,
      fontWeight: 500
    }
  }, React.createElement("i", {
    className: "fa-brands fa-google-drive"
  }), " \u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C Drive")));
}
window.PART_PHOTOS_FOLDER = "https://drive.google.com/drive/folders/1Br_yEp-N2kN2TQep87UuEcMyd3hf1EXW?usp=sharing";
function PartPhotosCell({
  photos,
  onChange,
  max = 2,
  uploadContext
}) {
  const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);
  const onFiles = async files => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    const room = max - list.length;
    if (room <= 0) {
      Swal.fire({
        icon: "info",
        title: `ใส่ได้สูงสุด ${max} รูป`
      });
      return;
    }
    const take = arr.slice(0, room);
    setBusy(true);
    const added = [];
    try {
      for (let i = 0; i < take.length; i++) {
        Swal.fire({
          title: `กำลังอัปโหลดรูป ${i + 1}/${take.length}...`,
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        try {
          const res = await window.uploadPhotoToDrive("uploadPartPhoto", uploadContext, take[i]);
          if (res && res.url) {
            added.push(res.url);
          }
        } catch (err) {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "อัปโหลดไม่สำเร็จ",
            text: err && err.message || String(err)
          });
          break;
        }
      }
      if (added.length) onChange([...list, ...added]);
      Swal.close();
      if (added.length) {
        Swal.fire({
          icon: "success",
          title: `เพิ่มรูปแล้ว ${added.length} รูป`,
          timer: 1000,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      }
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      flexWrap: "wrap"
    }
  }, list.map((url, i) => React.createElement(PhotoThumb, {
    key: i,
    url: url,
    size: 40,
    onRemove: () => onChange(list.filter((_, idx) => idx !== i))
  })), React.createElement("input", {
    ref: inputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    style: {
      display: "none"
    },
    onChange: e => {
      const fs = Array.from(e.target.files || []);
      e.target.value = "";
      onFiles(fs);
    }
  }), list.length < max && React.createElement("button", {
    type: "button",
    onClick: () => inputRef.current && inputRef.current.click(),
    disabled: busy,
    title: "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E39\u0E1B\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 (\u0E2D\u0E31\u0E1B\u0E02\u0E36\u0E49\u0E19 Drive)",
    style: {
      width: 40,
      height: 40,
      borderRadius: 8,
      border: "1px dashed var(--line)",
      background: "var(--bg)",
      color: busy ? "var(--primary)" : "var(--muted)",
      cursor: busy ? "default" : "pointer",
      display: "grid",
      placeItems: "center",
      fontSize: 14,
      flexShrink: 0
    }
  }, busy ? React.createElement("div", {
    className: "spinner",
    style: {
      width: 14,
      height: 14,
      borderWidth: 2
    }
  }) : React.createElement("i", {
    className: "fa-solid fa-camera"
  })));
}
function PhotoGallery({
  photos
}) {
  const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (!list.length) return null;
  return React.createElement("div", {
    className: "full"
  }, React.createElement("div", {
    className: "k"
  }, React.createElement("i", {
    className: "fa-solid fa-images",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A (", list.length, ")"), React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 6
    }
  }, list.map((url, i) => React.createElement(PhotoThumb, {
    key: i,
    url: url,
    size: 104,
    index: i
  }))));
}
async function ensureXLSX() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = res;
    s.onerror = () => rej(new Error("โหลดตัวสร้างไฟล์ Excel ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต"));
    document.head.appendChild(s);
  });
  return window.XLSX;
}
async function exportMachinesExcel(list) {
  if (!list || list.length === 0) {
    Swal.fire({
      icon: "info",
      title: "ไม่มีข้อมูลให้ส่งออก"
    });
    return;
  }
  try {
    Swal.fire({
      title: "กำลังสร้างไฟล์ Excel...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    const XLSX = await ensureXLSX();
    const data = list.map((m, i) => ({
      "ลำดับ": i + 1,
      "รหัสเครื่องจักร": m.code || "",
      "ชื่อเครื่องจักร": m.name || "",
      "หมวดหมู่": (window.getCategory(m.categoryId) || {}).name || "",
      "ยี่ห้อ": m.brand || "",
      "รุ่น": m.model || "",
      "ปีที่ผลิต": m.year || "",
      "ขนาด": m.size || "",
      "หมายเลขเครื่อง (Serial)": m.serial || "",
      "โครงการ": m.project || "",
      "ไซต์งานย่อย": m.subSite || "",
      "สถานที่": m.location || "",
      "กรรมสิทธิ์": m.ownership || "",
      "สถานะ": m.status || "",
      "พนักงานขับ/ผู้ควบคุม": m.driverName || "",
      "ชั่วโมงใช้งาน": Number(m.hours) || 0,
      "บำรุงรักษาล่าสุด": m.lastService || "",
      "วันที่ตรวจสภาพ": m.inspectionDate || "",
      "ตรวจสภาพครั้งถัดไป": m.nextInspectionDate || "",
      "ลิงก์รูปภาพ": m.drivePhoto || "",
      "ลิงก์เอกสาร 1": m.driveLink1 || "",
      "ลิงก์เอกสาร 2": m.driveLink2 || "",
      "ลิงก์ Part List": m.driveLinkPL || "",
      "หมายเหตุ": m.note || ""
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0]).map(k => ({
      wch: Math.min(40, Math.max(k.length + 4, ...data.map(r => String(r[k] ?? "").length + 2)))
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ทะเบียนเครื่องจักร");
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `ทะเบียนเครื่องจักร_${stamp}.xlsx`);
    Swal.fire({
      icon: "success",
      title: `ส่งออกแล้ว ${data.length} รายการ`,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: "top-end"
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "ส่งออกไม่สำเร็จ",
      text: err.message
    });
  }
}
function CheckFilter({
  label,
  icon,
  options,
  selected,
  onChange,
  minWidth = 170
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = e => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const active = selected.length > 0;
  return React.createElement("div", {
    ref: ref,
    style: {
      position: "relative",
      display: "flex"
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => setOpen(o => !o),
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 12px",
      minWidth,
      borderRadius: 10,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13.5,
      textAlign: "left",
      border: `1px solid ${active ? "var(--primary)" : "var(--line)"}`,
      background: active ? "var(--accent-soft)" : "#fff",
      color: active ? "var(--primary)" : "inherit"
    }
  }, icon && React.createElement("i", {
    className: `fa-solid ${icon}`,
    style: {
      opacity: .7
    }
  }), React.createElement("span", {
    style: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, label), active && React.createElement("span", {
    style: {
      background: "var(--primary)",
      color: "#fff",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      padding: "1px 7px"
    }
  }, selected.length), React.createElement("i", {
    className: `fa-solid fa-chevron-${open ? "up" : "down"}`,
    style: {
      fontSize: 10,
      opacity: .6
    }
  })), open && React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      zIndex: 60,
      minWidth: Math.max(minWidth, 230),
      background: "#fff",
      border: "1px solid var(--line)",
      borderRadius: 12,
      boxShadow: "0 12px 32px rgba(15,23,42,.16)",
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      padding: "8px 10px",
      borderBottom: "1px solid var(--line)",
      background: "#FAFBFC"
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => onChange(options.map(o => o.value)),
    style: {
      flex: 1,
      padding: "5px 8px",
      fontSize: 12,
      fontFamily: "inherit",
      border: "1px solid var(--line)",
      borderRadius: 7,
      background: "#fff",
      cursor: "pointer"
    }
  }, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14"), React.createElement("button", {
    type: "button",
    onClick: () => onChange([]),
    style: {
      flex: 1,
      padding: "5px 8px",
      fontSize: 12,
      fontFamily: "inherit",
      border: "1px solid var(--line)",
      borderRadius: 7,
      background: "#fff",
      cursor: "pointer"
    }
  }, "\u0E25\u0E49\u0E32\u0E07")), React.createElement("div", {
    style: {
      maxHeight: 280,
      overflowY: "auto",
      padding: 6
    }
  }, options.length === 0 && React.createElement("div", {
    style: {
      padding: "12px 10px",
      fontSize: 12.5,
      color: "var(--muted)",
      textAlign: "center"
    }
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), options.map(o => {
    const on = selected.includes(o.value);
    return React.createElement("label", {
      key: o.value,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 10px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
        background: on ? "var(--accent-soft)" : "transparent"
      }
    }, React.createElement("input", {
      type: "checkbox",
      checked: on,
      onChange: () => toggle(o.value),
      style: {
        margin: 0,
        cursor: "pointer",
        accentColor: "var(--primary)",
        width: 16,
        height: 16
      }
    }), o.color && React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: o.color,
        flexShrink: 0
      }
    }), o.icon && React.createElement("i", {
      className: `fa-solid ${o.icon}`,
      style: {
        color: o.color || "var(--muted)",
        fontSize: 12,
        width: 14
      }
    }), React.createElement("span", {
      style: {
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, o.label));
  })), React.createElement("div", {
    style: {
      padding: "7px 12px",
      borderTop: "1px solid var(--line)",
      background: "#FAFBFC",
      fontSize: 11,
      color: "var(--muted)"
    }
  }, "\u0E44\u0E21\u0E48\u0E15\u0E34\u0E4A\u0E01\u0E40\u0E25\u0E22 = \u0E41\u0E2A\u0E14\u0E07\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14")));
}
function Machines({
  user
}) {
  const visibleRows = React.useMemo(() => window.filterByUserProjects(user, window.__DATA.machines, "project"), [user]);
  const [rows, setRows] = React.useState(visibleRows);
  const [q, setQ] = React.useState("");
  const [catF, setCatF] = React.useState([]);
  const [ownF, setOwnF] = React.useState([]);
  const [siteF, setSiteF] = React.useState([]);
  const [sortF, setSortF] = React.useState("none");
  const [detail, setDetail] = React.useState(null);
  const [edit, setEdit] = React.useState(null);
  React.useEffect(() => {
    setRows(visibleRows);
  }, [visibleRows]);
  const {
    mine: myReqs
  } = window.useDeleteRequests(user);
  const pendingEditIds = React.useMemo(() => new Set((myReqs || []).filter(x => x.kind === "edit" && x.status === "pending" && x.action === "updateMachine").map(x => String(x.targetKey))), [myReqs]);
  const decidedCount = (myReqs || []).filter(x => x.status !== "pending").length;
  React.useEffect(() => {
    setRows(window.filterByUserProjects(user, window.__DATA.machines, "project"));
  }, [decidedCount]);
  const catOptions = React.useMemo(() => {
    const count = id => rows.filter(m => (m.categoryId || "") === id).length;
    const opts = (window.__DATA.categories || []).map(c => ({
      value: c.id,
      label: `${c.name} (${count(c.id)})`,
      color: c.color,
      icon: c.icon
    }));
    const none = count("");
    if (none) opts.push({
      value: "__none__",
      label: `— ไม่ระบุ — (${none})`
    });
    return opts;
  }, [rows]);
  const ownOptions = React.useMemo(() => {
    const tally = {};
    rows.forEach(m => {
      const o = (m.ownership || "").trim() || "__none__";
      tally[o] = (tally[o] || 0) + 1;
    });
    const opts = Object.keys(tally).filter(o => o !== "__none__").sort((a, b) => a.localeCompare(b, "th")).map(o => ({
      value: o,
      label: `${o} (${tally[o]})`
    }));
    if (tally.__none__) opts.push({
      value: "__none__",
      label: `— ไม่ระบุ — (${tally.__none__})`
    });
    return opts;
  }, [rows]);
  const siteOptions = React.useMemo(() => {
    const tally = {};
    rows.forEach(m => {
      const s = (m.subSite || "").trim() || "__none__";
      tally[s] = (tally[s] || 0) + 1;
    });
    const opts = Object.keys(tally).filter(s => s !== "__none__").sort((a, b) => a.localeCompare(b, "th", {
      numeric: true
    })).map(s => ({
      value: s,
      label: `${s} (${tally[s]})`
    }));
    if (opts.length && tally.__none__) opts.push({
      value: "__none__",
      label: `— ไม่ระบุไซต์ — (${tally.__none__})`
    });
    return opts;
  }, [rows]);
  const filtered = rows.filter(m => {
    if (q) {
      const qq = q.toLowerCase();
      const hay = [m.name, m.code, m.brand, m.model, m.year, m.serial, m.project, m.subSite].map(x => String(x || "").toLowerCase()).join(" ");
      if (!hay.includes(qq)) return false;
    }
    if (catF.length && !catF.includes(m.categoryId || "__none__")) return false;
    if (ownF.length && !ownF.includes((m.ownership || "").trim() || "__none__")) return false;
    if (siteF.length && !siteF.includes((m.subSite || "").trim() || "__none__")) return false;
    return true;
  });
  if (sortF !== "none") {
    const txt = v => String(v ?? "").trim();
    const cmp = {
      ownership: (a, b) => {
        const x = txt(a.ownership),
          y = txt(b.ownership);
        if (!x !== !y) return x ? -1 : 1;
        return x.localeCompare(y, "th") || txt(a.name).localeCompare(txt(b.name), "th");
      },
      name: (a, b) => txt(a.name).localeCompare(txt(b.name), "th"),
      code: (a, b) => txt(a.code).localeCompare(txt(b.code), "th", {
        numeric: true
      }),
      status: (a, b) => txt(a.status).localeCompare(txt(b.status), "th"),
      yearDesc: (a, b) => {
        const x = Number(a.year) || 0,
          y = Number(b.year) || 0;
        if (!x !== !y) return x ? -1 : 1;
        return y - x;
      }
    }[sortF];
    if (cmp) filtered.sort(cmp);
  }
  const statusColor = s => ({
    "ใช้งาน": "#10B981",
    "ซ่อม": "#EF4444",
    "รอซ่อม": "#F59E0B"
  })[s] || "#64748B";
  const syncCache = fn => {
    window.__DATA.machines = fn(window.__DATA.machines || []);
  };
  const save = async form => {
    try {
      if (form.id) {
        if (user.role !== "Admin") {
          const before = (window.__DATA.machines || []).find(x => x.id === form.id) || {};
          const changes = window.diffFields(before, form, window.MACHINE_FIELD_LABELS);
          const sent = await window.requestEditApproval({
            user,
            action: "updateMachine",
            payload: {
              id: form.id,
              patch: form
            },
            entityLabel: "เครื่องจักร",
            targetName: `${form.name || ""} (${form.code || ""})`.trim(),
            project: form.project || "",
            targetInfo: [form.brand, form.model, form.serial].filter(Boolean).join(" · "),
            changes
          });
          if (sent) setEdit(null);
          return;
        }
        await window.api("updateMachine", {
          id: form.id,
          patch: form
        });
        setRows(rows.map(x => x.id === form.id ? form : x));
        syncCache(all => all.map(x => x.id === form.id ? form : x));
      } else {
        const nu = await window.api("createMachine", {
          m: form
        });
        setRows([...rows, nu]);
        syncCache(all => [...all, nu]);
      }
      setEdit(null);
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const remove = async m => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteMachine",
      payload: {
        id: m.id
      },
      entityLabel: "เครื่องจักร",
      targetName: `${m.name} (${m.code})`,
      project: m.project || "",
      targetInfo: [m.brand, m.model, m.serial].filter(Boolean).join(" · ")
    });
    if (done) {
      setRows(rows.filter(x => x.id !== m.id));
      setDetail(null);
    }
  };
  const handleTransfer = async (machine, {
    toProject,
    toSubSite,
    note
  }) => {
    const entry = {
      from: machine.project || "ไม่ระบุ",
      to: toProject,
      fromSubSite: machine.subSite || "",
      toSubSite: toSubSite || "",
      when: new Date().toISOString(),
      by: user.name,
      note: note || ""
    };
    const transferHistory = [...(machine.transferHistory || []), entry];
    const patch = {
      project: toProject,
      subSite: toSubSite || "",
      transferHistory
    };
    try {
      await window.api("updateMachine", {
        id: machine.id,
        patch
      });
      const updated = {
        ...machine,
        ...patch
      };
      setRows(rows.map(x => x.id === machine.id ? updated : x));
      syncCache(all => all.map(x => x.id === machine.id ? updated : x));
      setDetail(updated);
      Swal.fire({
        icon: "success",
        title: "ย้ายโครงการสำเร็จ",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E0A\u0E37\u0E48\u0E2D / \u0E23\u0E2B\u0E31\u0E2A / \u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D / \u0E0B\u0E35\u0E40\u0E23\u0E35\u0E22\u0E25 / \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement(CheckFilter, {
    label: "\u0E17\u0E38\u0E01\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48",
    icon: "fa-layer-group",
    selected: catF,
    onChange: setCatF,
    options: catOptions
  }), React.createElement(CheckFilter, {
    label: "\u0E17\u0E38\u0E01\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C",
    icon: "fa-handshake",
    selected: ownF,
    onChange: setOwnF,
    options: ownOptions
  }), siteOptions.length > 0 && React.createElement(CheckFilter, {
    label: "\u0E17\u0E38\u0E01\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22",
    icon: "fa-sitemap",
    selected: siteF,
    onChange: setSiteF,
    options: siteOptions
  }), React.createElement("select", {
    value: sortF,
    onChange: e => setSortF(e.target.value),
    title: "\u0E40\u0E23\u0E35\u0E22\u0E07\u0E25\u0E33\u0E14\u0E31\u0E1A"
  }, React.createElement("option", {
    value: "none"
  }, "\u0E40\u0E23\u0E35\u0E22\u0E07: \u0E04\u0E48\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19"), React.createElement("option", {
    value: "ownership"
  }, "\u0E40\u0E23\u0E35\u0E22\u0E07: \u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"), React.createElement("option", {
    value: "name"
  }, "\u0E40\u0E23\u0E35\u0E22\u0E07: \u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("option", {
    value: "code"
  }, "\u0E40\u0E23\u0E35\u0E22\u0E07: \u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("option", {
    value: "status"
  }, "\u0E40\u0E23\u0E35\u0E22\u0E07: \u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("option", {
    value: "yearDesc"
  }, "\u0E40\u0E23\u0E35\u0E22\u0E07: \u0E1B\u0E35\u0E17\u0E35\u0E48\u0E1C\u0E25\u0E34\u0E15 (\u0E43\u0E2B\u0E21\u0E48\u2192\u0E40\u0E01\u0E48\u0E32)")), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => exportMachinesExcel(filtered),
    title: "\u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E41\u0E2A\u0E14\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E1F\u0E25\u0E4C Excel"
  }, React.createElement("i", {
    className: "fa-solid fa-file-excel",
    style: {
      color: "#1D6F42"
    }
  }), " \u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E01 Excel"), ["Admin", "Officer", "Engineer"].includes(window.effectiveRole(user)) && React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setEdit({
      mode: "create",
      m: {
        id: "",
        project: "",
        subSite: "",
        code: "",
        name: "",
        brand: "",
        model: "",
        year: "",
        size: "",
        serial: "",
        ownership: "",
        categoryId: "",
        note: "",
        status: "ใช้งาน",
        location: "",
        lastService: window.__DATA.fmtDate(new Date()),
        hours: 0,
        icon: "fa-gears",
        driverName: "",
        drivePhoto: "",
        driveLink1: "",
        driveLink2: "",
        driveLinkPL: "",
        inspectionDate: "",
        nextInspectionDate: ""
      }
    })
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"))), React.createElement("div", {
    className: "machines-grid"
  }, filtered.map(m => {
    const cat = window.getCategory(m.categoryId);
    return React.createElement("div", {
      className: "machine-card",
      key: m.id,
      onClick: () => setDetail(m)
    }, React.createElement("div", {
      className: "machine-thumb"
    }, React.createElement("div", {
      className: "pattern"
    }), React.createElement("div", {
      className: "ic"
    }, React.createElement("i", {
      className: `fa-solid ${m.icon || "fa-gears"}`
    })), m.drivePhoto && React.createElement("img", {
      src: gdriveThumb(m.drivePhoto),
      alt: "",
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover"
      },
      onError: e => e.target.style.display = "none"
    }), m.categoryId && React.createElement("div", {
      className: "drive-tag",
      style: {
        background: cat.color,
        color: "#fff"
      }
    }, React.createElement("i", {
      className: `fa-solid ${cat.icon}`
    }), " ", cat.name), pendingEditIds.has(String(m.id)) && React.createElement("div", {
      style: {
        position: "absolute",
        left: 8,
        bottom: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#FEF3C7",
        color: "#B45309",
        fontSize: 10.5,
        fontWeight: 600
      },
      title: "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
    }, React.createElement("i", {
      className: "fa-solid fa-hourglass-half"
    }), " \u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E01\u0E49\u0E44\u0E02"), React.createElement("div", {
      className: "status-dot",
      style: {
        background: statusColor(m.status)
      }
    }, React.createElement("span", {
      style: {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "#fff"
      }
    }), m.status)), React.createElement("div", {
      className: "machine-info"
    }, React.createElement("div", {
      className: "n"
    }, m.name), React.createElement("div", {
      className: "m"
    }, m.code, m.brand ? ` · ${m.brand}` : "", m.model ? ` ${m.model}` : ""), m.serial && React.createElement("div", {
      className: "m mono",
      style: {
        fontSize: 11,
        marginTop: 1,
        opacity: .75
      }
    }, m.serial), React.createElement("div", {
      className: "meta"
    }, React.createElement("span", null, React.createElement("i", {
      className: "fa-solid fa-diagram-project"
    }), " ", React.createElement(ProjectLabel, {
      name: m.project
    })), m.subSite && React.createElement("span", null, React.createElement("i", {
      className: "fa-solid fa-sitemap"
    }), " ", m.subSite), m.ownership && React.createElement("span", null, React.createElement("i", {
      className: "fa-solid fa-handshake"
    }), " ", m.ownership))));
  }), filtered.length === 0 && React.createElement("div", {
    style: {
      gridColumn: "1/-1"
    },
    className: "card"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-industry"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A"), React.createElement("div", null, ["Admin", "Officer", "Engineer"].includes(window.effectiveRole(user)) ? "กดปุ่ม 'เพิ่มเครื่องจักร' ด้านบนเพื่อเริ่มต้น" : "รอผู้ดูแลระบบเพิ่มข้อมูล")))), detail && React.createElement(MachineDetail, {
    m: detail,
    user: user,
    onClose: () => setDetail(null),
    onEdit: () => {
      setEdit({
        mode: "edit",
        m: detail
      });
      setDetail(null);
    },
    onDelete: () => remove(detail),
    onTransfer: payload => handleTransfer(detail, payload),
    onPatchMachine: async (patch, localOnly) => {
      try {
        if (!localOnly) await window.api("updateMachine", {
          id: detail.id,
          patch
        });
        const updated = {
          ...detail,
          ...patch
        };
        setRows(rows.map(x => x.id === detail.id ? updated : x));
        syncCache(all => all.map(x => x.id === detail.id ? updated : x));
        setDetail(updated);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "บันทึกไม่สำเร็จ",
          text: err.message
        });
      }
    }
  }), edit && React.createElement(MachineForm, {
    initial: edit.m,
    mode: edit.mode,
    user: user,
    onClose: () => setEdit(null),
    onSave: save
  }));
}
function MachineForm({
  initial,
  mode,
  user,
  onClose,
  onSave
}) {
  const [f, setF] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const projects = React.useMemo(() => window.visibleProjects(user), [user]);
  const up = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const submit = async e => {
    e?.preventDefault();
    if (!f.code?.trim() || !f.name?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณากรอก รหัสเครื่องจักร และ ชื่อเครื่องจักร"
      });
      return;
    }
    setBusy(true);
    try {
      await onSave({
        ...f,
        hours: Number(f.hours) || 0
      });
    } finally {
      setBusy(false);
    }
  };
  const icons = ["fa-solid fa-tractor", "fa-industry", "fa-wind", "fa-droplet", "fa-snowflake", "fa-bolt", "fa-truck", "fa-boxes-packing", "fa-fan", "fa-plug", "fa-screwdriver-wrench", "fa-gauge", "fa-tractor", "fa-helmet-safety"];
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: `fa-solid ${mode === "edit" ? "fa-pen-to-square" : "fa-plus"}`,
      style: {
        marginRight: 8,
        color: "var(--primary)"
      }
    }), mode === "edit" ? "แก้ไขเครื่องจักร" : "เพิ่มเครื่องจักรใหม่"),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose,
      disabled: busy
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit,
      disabled: busy
    }, busy ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "spinner",
      style: {
        width: 14,
        height: 14,
        borderWidth: 2
      }
    }), " \u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01...") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01")))
  }, React.createElement("form", {
    onSubmit: submit
  }, React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), projects.length === 0 ? React.createElement("div", {
    style: {
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px dashed var(--line)",
      background: "#FFFBEB",
      fontSize: 13,
      color: "#92400E"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      marginRight: 6
    }
  }), "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E19\u0E40\u0E21\u0E19\u0E39 ", React.createElement("strong", null, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), " \u0E01\u0E48\u0E2D\u0E19") : React.createElement(React.Fragment, null, React.createElement("select", {
    value: f.project || "",
    onChange: e => setF(p => ({
      ...p,
      project: e.target.value,
      subSite: ""
    }))
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u2014"), projects.map(p => React.createElement("option", {
    key: p.id,
    value: p.name
  }, p.code ? `[${p.code}] ` : "", p.name))), f.project && (() => {
    const proj = projects.find(p => p.name === f.project);
    return proj ? React.createElement("div", {
      style: {
        marginTop: 6,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: (proj.color || "#3B82F6") + "22",
        color: proj.color || "#3B82F6",
        fontSize: 12,
        fontWeight: 500
      }
    }, React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: proj.color || "#3B82F6"
      }
    }), proj.code && React.createElement("span", {
      className: "mono"
    }, proj.code), proj.name) : null;
  })())), React.createElement(SubSiteField, {
    project: f.project,
    value: f.subSite,
    onChange: v => up("subSite", v),
    showWhenEmpty: true,
    hint: "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22\u0E17\u0E35\u0E48\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E2D\u0E22\u0E39\u0E48 \xB7 \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E43\u0E2B\u0E21\u0E48"
  }), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23 *"), React.createElement("input", {
    value: f.code || "",
    onChange: e => up("code", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 XCMG-001"
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23 (\u0E0A\u0E37\u0E48\u0E2D) *"), React.createElement("input", {
    value: f.name || "",
    onChange: e => up("name", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 Drilling Rig, \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E01\u0E25\u0E36\u0E07 CNC"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D"), React.createElement("input", {
    value: f.brand || "",
    onChange: e => up("brand", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 XCMG, Komatsu, HITACHI"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E23\u0E38\u0E48\u0E19"), React.createElement("input", {
    value: f.model || "",
    onChange: e => up("model", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 XR220D"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E1B\u0E35\u0E17\u0E35\u0E48\u0E1C\u0E25\u0E34\u0E15"), React.createElement("input", {
    type: "number",
    min: "1900",
    max: "2200",
    value: f.year || "",
    onChange: e => up("year", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 2018"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E02\u0E19\u0E32\u0E14 / \u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27"), React.createElement("input", {
    value: f.size || "",
    onChange: e => up("size", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 22 \u0E15\u0E31\u0E19 / 12 \u0E40\u0E21\u0E15\u0E23"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E0B\u0E35\u0E40\u0E23\u0E35\u0E22\u0E25"), React.createElement("input", {
    className: "mono",
    value: f.serial || "",
    onChange: e => up("serial", e.target.value),
    placeholder: "Serial Number"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C/\u0E40\u0E0A\u0E48\u0E32"), React.createElement("input", {
    value: f.ownership || "",
    onChange: e => up("ownership", e.target.value),
    placeholder: "\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C, \u0E40\u0E0A\u0E48\u0E32, \u0E22\u0E37\u0E21..."
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("select", {
    value: f.categoryId || "",
    onChange: e => up("categoryId", e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48 \u2014"), (window.__DATA.categories || []).map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("select", {
    value: f.status || "ใช้งาน",
    onChange: e => up("status", e.target.value)
  }, React.createElement("option", {
    value: "\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
  }, "\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"), React.createElement("option", {
    value: "\u0E0B\u0E48\u0E2D\u0E21"
  }, "\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("option", {
    value: "\u0E23\u0E2D\u0E0B\u0E48\u0E2D\u0E21"
  }, "\u0E23\u0E2D\u0E0B\u0E48\u0E2D\u0E21"))), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07"), React.createElement("input", {
    value: f.location || "",
    onChange: e => up("location", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E42\u0E23\u0E07\u0E07\u0E32\u0E19 A - \u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15 1"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07\u0E17\u0E33\u0E07\u0E32\u0E19\u0E2A\u0E30\u0E2A\u0E21"), React.createElement("input", {
    type: "number",
    min: "0",
    value: f.hours || 0,
    onChange: e => up("hours", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E0B\u0E48\u0E2D\u0E21\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"), React.createElement("input", {
    type: "date",
    value: f.lastService || "",
    onChange: e => up("lastService", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-certificate",
    style: {
      marginRight: 5,
      color: "#7C3AED"
    }
  }), "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A (\u0E1B\u0E082)"), React.createElement("input", {
    type: "date",
    value: f.inspectionDate || "",
    onChange: e => up("inspectionDate", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-calendar-check",
    style: {
      marginRight: 5,
      color: "#EF4444"
    }
  }), "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E23\u0E31\u0E49\u0E07\u0E16\u0E31\u0E14\u0E44\u0E1B"), React.createElement("input", {
    type: "date",
    value: f.nextInspectionDate || "",
    onChange: e => up("nextInspectionDate", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A / \u0E1C\u0E39\u0E49\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21"), React.createElement("input", {
    value: f.driverName || "",
    onChange: e => up("driverName", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E19\u0E32\u0E22\u0E2A\u0E21\u0E0A\u0E32\u0E22 \u0E43\u0E08\u0E14\u0E35"
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-image",
    style: {
      marginRight: 6,
      color: "#10B981"
    }
  }), "\u0E25\u0E34\u0E07\u0E04\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E Google Drive ", React.createElement("span", {
    style: {
      fontWeight: 400,
      fontSize: 12,
      color: "var(--muted)"
    }
  }, "\u0E23\u0E39\u0E1B\u0E16\u0E48\u0E32\u0E22\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23 (\u0E08\u0E30\u0E41\u0E2A\u0E14\u0E07\u0E43\u0E19\u0E01\u0E32\u0E23\u0E4C\u0E14)")), React.createElement("input", {
    value: f.drivePhoto || "",
    onChange: e => up("drivePhoto", e.target.value),
    placeholder: "https://drive.google.com/file/d/..."
  }), gdriveThumb(f.drivePhoto) && React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, React.createElement("img", {
    src: gdriveThumb(f.drivePhoto),
    alt: "preview",
    style: {
      height: 100,
      borderRadius: 8,
      objectFit: "cover",
      border: "1px solid var(--line)"
    },
    onError: e => e.target.style.display = "none"
  }))), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-brands fa-google-drive",
    style: {
      marginRight: 6,
      color: "#4285F4"
    }
  }), "\u0E25\u0E34\u0E07\u0E04\u0E4C\u0E44\u0E1F\u0E25\u0E4C Google Drive (1) ", React.createElement("span", {
    style: {
      fontWeight: 400,
      fontSize: 12,
      color: "var(--muted)"
    }
  }, "\u0E40\u0E0A\u0E48\u0E19 \u0E04\u0E39\u0E48\u0E21\u0E37\u0E2D, \u0E43\u0E1A\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19")), React.createElement("input", {
    value: f.driveLink1 || "",
    onChange: e => up("driveLink1", e.target.value),
    placeholder: "https://drive.google.com/..."
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-brands fa-google-drive",
    style: {
      marginRight: 6,
      color: "#4285F4"
    }
  }), "\u0E25\u0E34\u0E07\u0E04\u0E4C\u0E44\u0E1F\u0E25\u0E4C Google Drive (2) ", React.createElement("span", {
    style: {
      fontWeight: 400,
      fontSize: 12,
      color: "var(--muted)"
    }
  }, "\u0E40\u0E0A\u0E48\u0E19 \u0E41\u0E1A\u0E1A\u0E41\u0E1B\u0E25\u0E19, \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E0B\u0E48\u0E2D\u0E21\u0E1A\u0E33\u0E23\u0E38\u0E07")), React.createElement("input", {
    value: f.driveLink2 || "",
    onChange: e => up("driveLink2", e.target.value),
    placeholder: "https://drive.google.com/..."
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-shield-halved",
    style: {
      marginRight: 6,
      color: "#059669"
    }
  }), "PL (\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19) ", React.createElement("span", {
    style: {
      fontWeight: 400,
      fontSize: 12,
      color: "var(--muted)"
    }
  }, "\u0E25\u0E34\u0E07\u0E04\u0E4C\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19")), React.createElement("input", {
    value: f.driveLinkPL || "",
    onChange: e => up("driveLinkPL", e.target.value),
    placeholder: "https://drive.google.com/..."
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
    rows: "3",
    value: f.note || "",
    onChange: e => up("note", e.target.value),
    placeholder: "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21..."
  }))), React.createElement("div", {
    className: "form-field",
    style: {
      marginTop: 14
    }
  }, React.createElement("label", null, "\u0E44\u0E2D\u0E04\u0E2D\u0E19 (\u0E43\u0E0A\u0E49\u0E41\u0E17\u0E19\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E39\u0E1B)"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(58px,1fr))",
      gap: 8,
      padding: 12,
      background: "var(--bg)",
      border: "1px solid var(--line)",
      borderRadius: 10
    }
  }, icons.map(ic => React.createElement("button", {
    type: "button",
    key: ic,
    onClick: () => up("icon", ic),
    style: {
      height: 50,
      borderRadius: 10,
      border: f.icon === ic ? "2px solid var(--primary)" : "1px solid var(--line)",
      background: f.icon === ic ? "var(--accent-soft)" : "#fff",
      color: f.icon === ic ? "var(--primary)" : "var(--muted)",
      fontSize: 18,
      cursor: "pointer",
      display: "grid",
      placeItems: "center"
    }
  }, React.createElement("i", {
    className: `fa-solid ${ic}`
  })))))));
}
function TransferMachineModal({
  m,
  user,
  onClose,
  onSave
}) {
  const projects = window.visibleProjects(user).filter(p => p.name !== m.project);
  const [toProject, setToProject] = React.useState("");
  const [toSubSite, setToSubSite] = React.useState("");
  const [note, setNote] = React.useState("");
  const toSites = window.projectSites(toProject);
  const inSt = {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontFamily: "Kanit",
    fontSize: 13.5,
    background: "#fff"
  };
  const submit = () => {
    if (!toProject) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกโครงการปลายทาง"
      });
      return;
    }
    onSave({
      toProject,
      toSubSite,
      note
    });
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-right-left",
      style: {
        color: "#7C3AED",
        marginRight: 8
      }
    }), "\u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"),
    size: "sm",
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit
    }, React.createElement("i", {
      className: "fa-solid fa-check"
    }), " \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22"))
  }, React.createElement("div", {
    style: {
      display: "grid",
      gap: 16
    }
  }, React.createElement("div", {
    style: {
      background: "#FFF7ED",
      border: "1px solid #FED7AA",
      borderRadius: 10,
      padding: "12px 14px"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#92400E",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 4
    }
  }, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19"), React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: "#78350F"
    }
  }, m.project ? window.projectShort(m.project) : "— ไม่ระบุ —"), m.project && window.projectShort(m.project) !== m.project && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#B45309",
      marginTop: 2
    }
  }, m.project), m.subSite && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#B45309",
      marginTop: 3
    }
  }, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      marginRight: 5
    }
  }), "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22: ", m.subSite)), React.createElement("div", null, React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      display: "block",
      marginBottom: 5
    }
  }, "\u0E22\u0E49\u0E32\u0E22\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 ", React.createElement("span", {
    style: {
      color: "#EF4444"
    }
  }, "*")), React.createElement("select", {
    style: inSt,
    value: toProject,
    onChange: e => {
      setToProject(e.target.value);
      setToSubSite("");
    }
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07 \u2014"), projects.map(p => React.createElement("option", {
    key: p.id,
    value: p.name
  }, p.name))), projects.length === 0 && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 5
    }
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E37\u0E48\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19")), toSites.length > 0 && React.createElement("div", null, React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      display: "block",
      marginBottom: 5
    }
  }, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      marginRight: 5
    }
  }), "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07"), React.createElement("select", {
    style: inSt,
    value: toSubSite,
    onChange: e => setToSubSite(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E17\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 (\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E44\u0E0B\u0E15\u0E4C) \u2014"), toSites.map(s => React.createElement("option", {
    key: s,
    value: s
  }, s)))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      display: "block",
      marginBottom: 5
    }
  }, "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25 / \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
    style: {
      ...inSt,
      resize: "vertical"
    },
    rows: "3",
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E22\u0E49\u0E32\u0E22\u0E15\u0E32\u0E21\u0E41\u0E1C\u0E19\u0E1B\u0E23\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07, \u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 B..."
  }))));
}
function MachineDetail({
  m,
  user,
  onClose,
  onEdit,
  onDelete,
  onTransfer,
  onPatchMachine
}) {
  const [relatedRows, setRelatedRows] = React.useState(() => window.__DATA.repairs.filter(r => r.machineCode === m.code).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  const statusColor = {
    "ใช้งาน": "#10B981",
    "ซ่อม": "#EF4444",
    "รอซ่อม": "#F59E0B"
  }[m.status] || "#64748B";
  const canEdit = ["Admin", "Officer", "Engineer"].includes(window.effectiveRole(user));
  const canEditRepairs = ["Admin", "Officer", "Engineer"].includes(user.role);
  const [viewRepair, setViewRepair] = React.useState(null);
  const [editRepair, setEditRepair] = React.useState(null);
  const [transferModal, setTransferModal] = React.useState(false);
  const [editTrIdx, setEditTrIdx] = React.useState(null);
  const [editTrForm, setEditTrForm] = React.useState(null);
  const [savingTr, setSavingTr] = React.useState(false);
  const projectNames = React.useMemo(() => {
    const names = window.visibleProjects(user).map(p => p.name);
    (m.transferHistory || []).forEach(t => {
      [t.from, t.to].forEach(n => {
        if (n && !names.includes(n)) names.push(n);
      });
    });
    return names;
  }, [m.transferHistory, user]);
  const toDateStr = d => {
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };
  const trLabelSt = {
    fontSize: 10.5,
    color: "#6D28D9",
    fontWeight: 500,
    marginBottom: 2
  };
  const trInputSt = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #C4B5FD",
    borderRadius: 6,
    fontSize: 12.5,
    fontFamily: "Kanit",
    color: "#3B0764",
    background: "#fff",
    outline: "none"
  };
  const [editDateField, setEditDateField] = React.useState(null);
  const [editDateValue, setEditDateValue] = React.useState("");
  const [savingDate, setSavingDate] = React.useState(false);
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const nextDateColor = val => {
    if (!val) return null;
    const d = new Date(val);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "#EF4444";
    if (diff <= 30) return "#F59E0B";
    return "#10B981";
  };
  const saveInspectionDate = async () => {
    if (!editDateField) return;
    setSavingDate(true);
    try {
      await onPatchMachine({
        [editDateField]: editDateValue
      });
      setEditDateField(null);
    } catch (e) {}
    setSavingDate(false);
  };
  const renderInspectionCell = field => {
    const val = m[field] || "";
    const color = field === "nextInspectionDate" ? nextDateColor(val) : null;
    if (editDateField === field) return React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap"
      }
    }, React.createElement("input", {
      type: "date",
      value: editDateValue,
      onChange: e => setEditDateValue(e.target.value),
      style: {
        padding: "3px 7px",
        border: "1px solid var(--primary)",
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "Kanit"
      },
      autoFocus: true
    }), React.createElement("button", {
      onClick: saveInspectionDate,
      disabled: savingDate,
      style: {
        padding: "3px 10px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, savingDate ? "..." : "บันทึก"), React.createElement("button", {
      onClick: () => setEditDateField(null),
      style: {
        padding: "3px 8px",
        background: "none",
        border: "1px solid var(--line)",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"));
    return React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, val ? React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: color ? "600" : "400",
        color: color || "inherit",
        background: color ? color + "18" : "transparent",
        padding: color ? "2px 7px" : "0",
        borderRadius: 5,
        display: "inline-flex",
        alignItems: "center",
        gap: 4
      }
    }, window.__DATA.fmtDate(val), color === "#EF4444" && React.createElement("span", {
      style: {
        fontSize: 10
      }
    }, "\u26A0 \u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14"), color === "#F59E0B" && React.createElement("span", {
      style: {
        fontSize: 10
      }
    }, "\u0E43\u0E01\u0E25\u0E49\u0E16\u0E36\u0E07\u0E01\u0E33\u0E2B\u0E19\u0E14")) : React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u2014"), canEdit && React.createElement("button", {
      onClick: () => {
        setEditDateField(field);
        setEditDateValue(val || toDateStr(new Date()));
      },
      style: {
        padding: "1px 5px",
        background: "none",
        border: "1px solid var(--line)",
        borderRadius: 4,
        fontSize: 10,
        cursor: "pointer",
        color: "var(--muted)"
      },
      title: "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"
    }, React.createElement("i", {
      className: `fa-solid ${val ? "fa-pen" : "fa-plus"}`
    })));
  };
  const startEditTransfer = (idx, t) => {
    setEditTrIdx(idx);
    setEditTrForm({
      from: t.from || "",
      to: t.to || "",
      when: toDateStr(t.when),
      note: t.note || "",
      by: t.by || ""
    });
  };
  const saveTransferEntry = async () => {
    if (editTrIdx === null || !editTrForm) return;
    if (!editTrForm.to.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุโครงการปลายทาง"
      });
      return;
    }
    const hist = m.transferHistory || [];
    const newHistory = hist.map((t, i) => i !== editTrIdx ? t : {
      ...t,
      from: editTrForm.from.trim(),
      to: editTrForm.to.trim(),
      note: editTrForm.note,
      by: editTrForm.by.trim(),
      when: editTrForm.when ? new Date(editTrForm.when).toISOString() : t.when,
      editedBy: user.name,
      editedAt: new Date().toISOString()
    });
    const patch = {
      transferHistory: newHistory
    };
    if (editTrIdx === hist.length - 1) patch.project = newHistory[editTrIdx].to;
    setSavingTr(true);
    try {
      await onPatchMachine(patch);
      setEditTrIdx(null);
      setEditTrForm(null);
      Swal.fire({
        icon: "success",
        title: "แก้ไขประวัติแล้ว",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } finally {
      setSavingTr(false);
    }
  };
  const deleteTransferEntry = async (idx, t) => {
    const res = await window.deleteWithApproval({
      user,
      action: "deleteTransferEntry",
      payload: {
        machineId: m.id,
        index: idx,
        when: t.when,
        to: t.to || ""
      },
      entityLabel: "ประวัติการย้ายเครื่องจักร",
      targetName: `${m.name || ""} (${m.code || ""})`,
      project: m.project || "",
      targetInfo: `${t.from || "ไม่ระบุ"} → ${t.to || ""} · ${window.__DATA.fmtDate(t.when)}`,
      warnHtml: "ลบแล้วกู้คืนไม่ได้ และไม่กระทบโครงการปัจจุบันของเครื่องจักร"
    });
    if (!res) return;
    const history = res && res.transferHistory || (m.transferHistory || []).filter((_, i) => i !== idx);
    await onPatchMachine({
      transferHistory: history
    }, true);
    setEditTrIdx(null);
    setEditTrForm(null);
  };
  const saveEdit = async (r, patch) => {
    try {
      try {
        await window.api("updateRepair", {
          id: r.id,
          patch,
          by: user.name
        });
      } catch (e1) {
        if (/Unknown action/i.test(String(e1.message || e1))) {
          const {
            status,
            cost,
            ...rest
          } = patch;
          await window.api("updateRepairStatus", {
            id: r.id,
            status: status || r.status,
            cost,
            by: user.name,
            note: "แก้ไขข้อมูล",
            patch: rest
          });
        } else {
          throw e1;
        }
      }
      const updated = {
        ...r,
        ...patch,
        timeline: [...r.timeline, {
          status: patch.status || r.status,
          when: new Date(),
          by: user.name,
          note: "แก้ไขข้อมูล"
        }]
      };
      setRelatedRows(prev => prev.map(x => x.id === r.id ? updated : x));
      window.__DATA.repairs = window.__DATA.repairs.map(x => x.id === r.id ? updated : x);
      setEditRepair(null);
      Swal.fire({
        icon: "success",
        title: "บันทึกการแก้ไขแล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  return React.createElement(React.Fragment, null, React.createElement(Modal, {
    open: true,
    onClose: onClose,
    title: React.createElement(React.Fragment, null, "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23 ", React.createElement("span", {
      className: "mono",
      style: {
        marginLeft: 6,
        color: "var(--primary)"
      }
    }, m.code)),
    size: "lg",
    footer: React.createElement(React.Fragment, null, canEdit && React.createElement("button", {
      className: "btn btn-danger",
      onClick: onDelete
    }, React.createElement("i", {
      className: "fa-solid fa-trash"
    }), " \u0E25\u0E1A"), React.createElement("div", {
      style: {
        flex: 1
      }
    }), React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E1B\u0E34\u0E14"), canEdit && React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        color: "#7C3AED",
        border: "1px solid #DDD6FE"
      },
      onClick: () => setTransferModal(true)
    }, React.createElement("i", {
      className: "fa-solid fa-right-left"
    }), " \u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), canEdit && React.createElement("button", {
      className: "btn btn-primary",
      onClick: onEdit
    }, React.createElement("i", {
      className: "fa-solid fa-pen-to-square"
    }), " \u0E41\u0E01\u0E49\u0E44\u0E02"))
  }, React.createElement("div", {
    className: "detail-header",
    style: {
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      gap: 22,
      marginBottom: 18
    }
  }, React.createElement("div", {
    style: {
      borderRadius: 12,
      overflow: "hidden",
      aspectRatio: "1",
      background: "var(--bg)",
      position: "relative"
    }
  }, React.createElement("div", {
    className: "machine-thumb",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: 0
    }
  }, React.createElement("div", {
    className: "pattern"
  }), React.createElement("div", {
    className: "ic"
  }, React.createElement("i", {
    className: `fa-solid ${m.icon || "fa-gears"}`
  })), m.drivePhoto && React.createElement("img", {
    src: gdriveThumb(m.drivePhoto),
    alt: "",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    onError: e => e.target.style.display = "none"
  }))), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 4
    }
  }, m.name), React.createElement("div", {
    style: {
      color: "var(--muted)",
      marginBottom: 14
    }
  }, m.brand || "—", " ", m.model || "", " ", m.size ? `· ${m.size}` : ""), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("span", {
    className: "badge",
    style: {
      background: statusColor + "22",
      color: statusColor,
      fontSize: 13
    }
  }, React.createElement("span", {
    className: "dot"
  }), m.status), m.categoryId && (() => {
    const cat = window.getCategory(m.categoryId);
    return React.createElement("span", {
      className: "badge",
      style: {
        background: cat.color + "22",
        color: cat.color,
        fontSize: 13
      }
    }, React.createElement("i", {
      className: `fa-solid ${cat.icon}`,
      style: {
        marginRight: 4
      }
    }), cat.name);
  })(), m.ownership && React.createElement("span", {
    className: "badge",
    style: {
      background: "var(--accent-soft)",
      color: "var(--primary)",
      fontSize: 13
    }
  }, React.createElement("i", {
    className: "fa-solid fa-handshake",
    style: {
      marginRight: 4
    }
  }), m.ownership)), React.createElement("div", {
    className: "detail-grid",
    style: {
      marginTop: 16,
      gridTemplateColumns: "1fr 1fr"
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", {
    className: "v"
  }, React.createElement(ProjectLabel, {
    name: m.project
  }))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"), React.createElement("div", {
    className: "v"
  }, m.subSite ? React.createElement(SubSiteTag, {
    value: m.subSite,
    project: m.project
  }) : "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E0B\u0E35\u0E40\u0E23\u0E35\u0E22\u0E25"), React.createElement("div", {
    className: "v mono",
    style: {
      fontSize: 12
    }
  }, m.serial || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1B\u0E35\u0E17\u0E35\u0E48\u0E1C\u0E25\u0E34\u0E15"), React.createElement("div", {
    className: "v"
  }, m.year || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07"), React.createElement("div", {
    className: "v"
  }, m.location || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E0B\u0E48\u0E2D\u0E21\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"), React.createElement("div", {
    className: "v"
  }, m.lastService || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07\u0E17\u0E33\u0E07\u0E32\u0E19"), React.createElement("div", {
    className: "v"
  }, Number(m.hours || 0).toLocaleString(), " \u0E0A\u0E21.")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A / \u0E1C\u0E39\u0E49\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21"), React.createElement("div", {
    className: "v"
  }, m.driverName || "—"))), React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "10px 14px",
      background: "#F5F3FF",
      border: "1px solid #DDD6FE",
      borderRadius: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#7C3AED",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement("i", {
    className: "fa-solid fa-certificate"
  }), "\u0E1B\u0E082 \u2014 \u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E17\u0E14\u0E2A\u0E2D\u0E1A"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted)",
      marginBottom: 3
    }
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A"), renderInspectionCell("inspectionDate")), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted)",
      marginBottom: 3
    }
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E23\u0E31\u0E49\u0E07\u0E16\u0E31\u0E14\u0E44\u0E1B"), renderInspectionCell("nextInspectionDate")))), (m.driveLink1 || m.driveLink2 || m.driveLinkPL) && React.createElement("div", {
    style: {
      marginTop: 14,
      display: "grid",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--muted)",
      textTransform: "uppercase",
      letterSpacing: ".05em"
    }
  }, React.createElement("i", {
    className: "fa-brands fa-google-drive",
    style: {
      color: "#4285F4",
      marginRight: 6
    }
  }), "\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 Google Drive"), m.driveLink1 && React.createElement("a", {
    href: m.driveLink1,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 8,
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      color: "#1E40AF",
      fontSize: 13,
      textDecoration: "none"
    }
  }, React.createElement("i", {
    className: "fa-brands fa-google-drive",
    style: {
      color: "#4285F4"
    }
  }), "\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 (1)", React.createElement("i", {
    className: "fa-solid fa-arrow-up-right-from-square",
    style: {
      fontSize: 10,
      opacity: .6,
      marginLeft: "auto"
    }
  })), m.driveLink2 && React.createElement("a", {
    href: m.driveLink2,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 8,
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
      color: "#1E40AF",
      fontSize: 13,
      textDecoration: "none"
    }
  }, React.createElement("i", {
    className: "fa-brands fa-google-drive",
    style: {
      color: "#4285F4"
    }
  }), "\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 (2)", React.createElement("i", {
    className: "fa-solid fa-arrow-up-right-from-square",
    style: {
      fontSize: 10,
      opacity: .6,
      marginLeft: "auto"
    }
  })), m.driveLinkPL && React.createElement("a", {
    href: m.driveLinkPL,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 8,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#047857",
      fontSize: 13,
      textDecoration: "none"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-shield-halved",
    style: {
      color: "#059669"
    }
  }), "PL (\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19)", React.createElement("i", {
    className: "fa-solid fa-arrow-up-right-from-square",
    style: {
      fontSize: 10,
      opacity: .6,
      marginLeft: "auto"
    }
  }))), m.note && React.createElement("div", {
    style: {
      marginTop: 14,
      padding: 12,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      borderRadius: 10,
      fontSize: 13
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      color: "#92400E",
      marginBottom: 4
    }
  }, React.createElement("i", {
    className: "fa-solid fa-note-sticky"
  }), " \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("div", {
    style: {
      color: "#78350F",
      whiteSpace: "pre-wrap"
    }
  }, m.note)), m.transferHistory && m.transferHistory.length > 0 && React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "#7C3AED",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 8
    }
  }, React.createElement("i", {
    className: "fa-solid fa-right-left",
    style: {
      marginRight: 6
    }
  }), "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 (", m.transferHistory.length, ")"), React.createElement("datalist", {
    id: "tr-projects"
  }, projectNames.map(n => React.createElement("option", {
    key: n,
    value: n
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gap: 6
    }
  }, [...m.transferHistory].reverse().map((t, i) => {
    const actualIdx = m.transferHistory.length - 1 - i;
    const isEditing = editTrIdx === actualIdx;
    return React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        background: "#F5F3FF",
        border: `1px solid ${isEditing ? "#A78BFA" : "#DDD6FE"}`,
        borderRadius: 8,
        fontSize: 13
      }
    }, React.createElement("div", {
      style: {
        color: "#7C3AED",
        marginTop: 1,
        flexShrink: 0
      }
    }, React.createElement("i", {
      className: "fa-solid fa-circle-arrow-right"
    })), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, isEditing ? React.createElement("div", {
      style: {
        display: "grid",
        gap: 8
      }
    }, React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: trLabelSt
    }, "\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("input", {
      list: "tr-projects",
      value: editTrForm.from,
      onChange: e => setEditTrForm(p => ({
        ...p,
        from: e.target.value
      })),
      placeholder: "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38",
      style: trInputSt
    })), React.createElement("div", null, React.createElement("div", {
      style: trLabelSt
    }, "\u0E44\u0E1B\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 *"), React.createElement("input", {
      list: "tr-projects",
      value: editTrForm.to,
      onChange: e => setEditTrForm(p => ({
        ...p,
        to: e.target.value
      })),
      placeholder: "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07",
      style: trInputSt
    })), React.createElement("div", null, React.createElement("div", {
      style: trLabelSt
    }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E22\u0E49\u0E32\u0E22"), React.createElement("input", {
      type: "date",
      value: editTrForm.when,
      onChange: e => setEditTrForm(p => ({
        ...p,
        when: e.target.value
      })),
      style: trInputSt
    })), React.createElement("div", null, React.createElement("div", {
      style: trLabelSt
    }, "\u0E1C\u0E39\u0E49\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"), React.createElement("input", {
      value: editTrForm.by,
      onChange: e => setEditTrForm(p => ({
        ...p,
        by: e.target.value
      })),
      placeholder: "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01",
      style: trInputSt
    }))), React.createElement("div", null, React.createElement("div", {
      style: trLabelSt
    }, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
      rows: "2",
      value: editTrForm.note,
      onChange: e => setEditTrForm(p => ({
        ...p,
        note: e.target.value
      })),
      placeholder: "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22...",
      style: {
        ...trInputSt,
        resize: "vertical"
      }
    })), actualIdx === m.transferHistory.length - 1 && editTrForm.to.trim() && editTrForm.to.trim() !== m.project && React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#B45309",
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderRadius: 6,
        padding: "5px 8px"
      }
    }, React.createElement("i", {
      className: "fa-solid fa-triangle-exclamation"
    }), " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14 \u2014 \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E49\u0E27\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E08\u0E30\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19 ", React.createElement("strong", null, editTrForm.to.trim())), React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap"
      }
    }, React.createElement("button", {
      onClick: saveTransferEntry,
      disabled: savingTr,
      style: {
        padding: "4px 12px",
        background: "#7C3AED",
        color: "#fff",
        border: "none",
        borderRadius: 5,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " ", savingTr ? "กำลังบันทึก..." : "บันทึก"), React.createElement("button", {
      onClick: () => {
        setEditTrIdx(null);
        setEditTrForm(null);
      },
      disabled: savingTr,
      style: {
        padding: "4px 10px",
        background: "none",
        border: "1px solid #DDD6FE",
        borderRadius: 5,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("div", {
      style: {
        flex: 1
      }
    }), React.createElement("button", {
      onClick: () => deleteTransferEntry(actualIdx, t),
      disabled: savingTr,
      style: {
        padding: "4px 10px",
        background: "none",
        border: "1px solid #FECACA",
        color: "#DC2626",
        borderRadius: 5,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, React.createElement("i", {
      className: "fa-solid fa-trash"
    }), " \u0E25\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49"))) : React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap"
      }
    }, React.createElement("span", {
      style: {
        color: "#6D28D9",
        fontWeight: 500
      }
    }, t.from || "ไม่ระบุ", t.fromSubSite ? ` · ${t.fromSubSite}` : ""), React.createElement("i", {
      className: "fa-solid fa-arrow-right",
      style: {
        fontSize: 10,
        color: "var(--muted)"
      }
    }), React.createElement("span", {
      style: {
        color: "#1E40AF",
        fontWeight: 600
      }
    }, t.to, t.toSubSite ? ` · ${t.toSubSite}` : "")), t.note && React.createElement("div", {
      style: {
        color: "#4B5563",
        marginTop: 3,
        fontSize: 12
      }
    }, t.note), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 3,
        flexWrap: "wrap"
      }
    }, React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 11
      }
    }, window.__DATA.fmtDate(t.when), " \xB7 ", t.by), t.editedAt && React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 10,
        fontStyle: "italic"
      },
      title: `แก้ไขโดย ${t.editedBy} เมื่อ ${window.__DATA.fmtDate(t.editedAt)}`
    }, React.createElement("i", {
      className: "fa-solid fa-pen-to-square"
    }), " \u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27"), canEdit && React.createElement("button", {
      onClick: () => startEditTransfer(actualIdx, t),
      title: "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49",
      style: {
        padding: "1px 6px",
        background: "none",
        border: "1px solid #DDD6FE",
        borderRadius: 4,
        fontSize: 10,
        cursor: "pointer",
        color: "#7C3AED",
        lineHeight: 1.6
      }
    }, React.createElement("i", {
      className: "fa-solid fa-pen"
    })), canEdit && React.createElement("button", {
      onClick: () => deleteTransferEntry(actualIdx, t),
      title: "\u0E25\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49",
      style: {
        padding: "1px 6px",
        background: "none",
        border: "1px solid #FECACA",
        borderRadius: 4,
        fontSize: 10,
        cursor: "pointer",
        color: "#DC2626",
        lineHeight: 1.6
      }
    }, React.createElement("i", {
      className: "fa-solid fa-trash"
    }))))));
  }))))), React.createElement("div", {
    style: {
      borderTop: "1px dashed var(--line)",
      paddingTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      marginBottom: 10,
      fontSize: 14
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clock-rotate-left",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 (", relatedRows.length, ")"), relatedRows.length > 0 ? React.createElement("table", {
    className: "data",
    style: {
      border: "1px solid var(--line)",
      borderRadius: 8
    }
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), canEditRepairs && React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, relatedRows.map(r => React.createElement("tr", {
    key: r.id,
    style: {
      cursor: "pointer"
    }
  }, React.createElement("td", {
    onClick: () => setViewRepair(r)
  }, React.createElement("span", {
    className: "ticket-id",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, r.running, React.createElement("i", {
    className: "fa-solid fa-arrow-up-right-from-square",
    style: {
      fontSize: 9,
      opacity: .5
    }
  }))), React.createElement("td", {
    onClick: () => setViewRepair(r),
    style: {
      color: "var(--muted)"
    }
  }, window.__DATA.fmtDate(r.createdAt)), React.createElement("td", {
    onClick: () => setViewRepair(r),
    style: {
      fontSize: 13
    }
  }, React.createElement(ProblemLines, {
    title: r.title,
    max: 4
  })), React.createElement("td", {
    onClick: () => setViewRepair(r)
  }, React.createElement(Badge, {
    status: r.status
  })), canEditRepairs && React.createElement("td", null, React.createElement("button", {
    className: "ia",
    title: "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25",
    onClick: e => {
      e.stopPropagation();
      setEditRepair(r);
    },
    style: {
      color: "#1E40AF"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-user-pen"
  }))))))) : React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      padding: "12px 0"
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21"))), viewRepair && React.createElement(window.RepairDetail, {
    r: viewRepair,
    user: user,
    onClose: () => setViewRepair(null),
    onQuick: null,
    onEdit: canEditRepairs ? r => {
      setViewRepair(null);
      setEditRepair(r);
    } : null,
    onEditParts: null
  }), editRepair && React.createElement(window.EditRepairModal, {
    r: editRepair,
    onClose: () => setEditRepair(null),
    onSave: saveEdit
  }), transferModal && React.createElement(TransferMachineModal, {
    m: m,
    user: user,
    onClose: () => setTransferModal(false),
    onSave: payload => {
      setTransferModal(false);
      onTransfer(payload);
    }
  }));
}
window.Machines = Machines;

/* ---- block 15 (ต้นฉบับบรรทัด 5866) ---- */
function WithdrawalLogo() {
  return React.createElement("svg", {
    className: "paper-logo",
    viewBox: "0 0 180 210",
    "aria-label": "Panamanee logo"
  }, React.createElement("path", {
    d: "M107 24A70 70 0 1 0 77 158",
    fill: "none",
    stroke: "#155E95",
    strokeWidth: "18",
    strokeLinecap: "butt"
  }), React.createElement("path", {
    d: "M127 47a70 70 0 0 1 0 86",
    fill: "none",
    stroke: "#F28A23",
    strokeWidth: "18",
    strokeLinecap: "butt"
  }), React.createElement("path", {
    d: "M42 130c25-53 61-67 107-63-25 16-40 34-47 59 17-8 32-19 46-36-12 50-50 74-104 78 15-12 26-25 35-41-13 2-25 3-37 3z",
    fill: "#155E95"
  }), React.createElement("path", {
    d: "M57 147c20-24 45-39 78-48-12 22-18 43-17 69-19-18-37-24-61-21z",
    fill: "#7BC043"
  }), React.createElement("path", {
    d: "M83 83l72-7-47 52 2-29-49 40z",
    fill: "#fff"
  }), React.createElement("text", {
    x: "90",
    y: "188",
    textAnchor: "middle",
    fontFamily: "Tahoma,Arial,sans-serif",
    fontSize: "14",
    fontWeight: "700",
    fill: "#155E95"
  }, "\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17 \u0E1E\u0E32\u0E19\u0E32\u0E21\u0E13\u0E35 \u0E08\u0E33\u0E01\u0E31\u0E14"), React.createElement("text", {
    x: "90",
    y: "204",
    textAnchor: "middle",
    fontFamily: "Tahoma,Arial,sans-serif",
    fontSize: "12",
    fill: "#155E95"
  }, "Panamanee Co., Ltd"));
}
function WithdrawalPaperPreview({
  doc,
  items
}) {
  const clean = v => String(v ?? "").trim();
  const formatThaiDate = value => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };
  const rows = (items || []).map((x, i) => ({
    no: i + 1,
    name: clean(x.name),
    qty: clean(x.qty),
    unit: clean(x.unit),
    remark: clean(x.remark)
  })).filter(x => x.name || x.qty || x.unit || x.remark);
  while (rows.length < 24) rows.push({
    no: rows.length + 1,
    name: "",
    qty: "",
    unit: "",
    remark: ""
  });
  return React.createElement("div", {
    className: "withdrawal-paper-wrap"
  }, React.createElement("div", {
    className: "withdrawal-paper"
  }, React.createElement("div", {
    className: "paper-head"
  }, React.createElement("div", null, React.createElement(WithdrawalLogo, null)), React.createElement("div", {
    className: "paper-title-block"
  }, React.createElement("div", {
    className: "company"
  }, "\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17 \u0E1E\u0E32\u0E19\u0E32\u0E21\u0E13\u0E35 \u0E08\u0E33\u0E01\u0E31\u0E14"), React.createElement("div", {
    className: "doc-title"
  }, "\u0E43\u0E1A\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01/\u0E02\u0E2D\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D")), React.createElement("div", null)), React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end"
    }
  }, React.createElement("div", {
    className: "paper-meta-row"
  }, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01 ", React.createElement("span", {
    className: "paper-line"
  }, doc.docNo || "")), React.createElement("div", {
    className: "paper-meta-row"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ", React.createElement("span", {
    className: "paper-line"
  }, formatThaiDate(doc.docDate)))), React.createElement("div", {
    className: "paper-meta-row full"
  }, "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19 ", React.createElement("span", {
    className: "paper-line"
  }, doc.department || doc.project || "")), React.createElement("table", {
    className: "item-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    rowSpan: "2",
    style: {
      width: "8%"
    }
  }, "\u0E25\u0E33\u0E14\u0E31\u0E1A"), React.createElement("th", {
    rowSpan: "2",
    style: {
      width: "28%"
    }
  }, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    colSpan: "2",
    style: {
      width: "18%"
    }
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E1A\u0E34\u0E01/\u0E02\u0E2D\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D"), React.createElement("th", {
    rowSpan: "2",
    style: {
      width: "12%"
    }
  }, "\u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D"), React.createElement("th", {
    rowSpan: "2",
    style: {
      width: "12%"
    }
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1A\u0E34\u0E01\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"), React.createElement("th", {
    rowSpan: "2",
    style: {
      width: "8%"
    }
  }, "\u0E23\u0E32\u0E04\u0E32"), React.createElement("th", {
    rowSpan: "2",
    style: {
      width: "9%"
    }
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19"), React.createElement("th", {
    rowSpan: "2"
  }, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38")), React.createElement("tr", null, React.createElement("th", null, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", null, "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A"))), React.createElement("tbody", null, rows.map(item => React.createElement("tr", {
    key: item.no
  }, React.createElement("td", null, item.no), React.createElement("td", {
    className: "item-name"
  }, item.name), React.createElement("td", null, item.qty), React.createElement("td", null, item.unit), React.createElement("td", null, "-"), React.createElement("td", null, "-"), React.createElement("td", null, "-"), React.createElement("td", null, "-"), React.createElement("td", null, item.remark))))), React.createElement("div", {
    className: "sign-grid"
  }, React.createElement("div", null, React.createElement("div", {
    className: "sign-line"
  }), React.createElement("div", null, "\u0E1C\u0E39\u0E49\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01/\u0E02\u0E2D\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D")), React.createElement("div", null, React.createElement("div", {
    className: "sign-line"
  }), React.createElement("div", null, "\u0E1C\u0E39\u0E49\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A")), React.createElement("div", null, React.createElement("div", {
    className: "sign-line"
  }), React.createElement("div", null, "\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34")))));
}
function Withdrawals({
  user
}) {
  const canEdit = ["Admin", "Officer", "Director", "Engineer"].includes(user.role);
  const [rows, setRows] = React.useState(() => window.__DATA.withdrawals || []);
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState(null);
  const clean = v => String(v ?? "").trim();
  const safeKey = v => (clean(v) || `WD-${Date.now()}`).replace(/[.#$/\[\]]/g, "-").replace(/\s+/g, "-");
  const parseItems = doc => Array.isArray(doc.items) ? doc.items : [];
  const logoSvg = `<svg width="31mm" height="36mm" viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg"><path d="M107 24A70 70 0 1 0 77 158" fill="none" stroke="#155E95" stroke-width="18"/><path d="M127 47a70 70 0 0 1 0 86" fill="none" stroke="#F28A23" stroke-width="18"/><path d="M42 130c25-53 61-67 107-63-25 16-40 34-47 59 17-8 32-19 46-36-12 50-50 74-104 78 15-12 26-25 35-41-13 2-25 3-37 3z" fill="#155E95"/><path d="M57 147c20-24 45-39 78-48-12 22-18 43-17 69-19-18-37-24-61-21z" fill="#7BC043"/><path d="M83 83l72-7-47 52 2-29-49 40z" fill="#fff"/><text x="90" y="188" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="14" font-weight="700" fill="#155E95">บริษัท พานามณี จำกัด</text><text x="90" y="204" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="12" fill="#155E95">Panamanee Co., Ltd</text></svg>`;
  const buildPdfHtml = doc => {
    const fmt = v => {
      const d = new Date(v);
      return v && !isNaN(d) ? d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }) : v || "";
    };
    const items = parseItems(doc).map((x, i) => ({
      ...x,
      no: i + 1
    }));
    while (items.length < 24) items.push({
      no: items.length + 1,
      name: "",
      qty: "",
      unit: "",
      remark: ""
    });
    const trs = items.map(item => `<tr><td>${item.no}</td><td style="text-align:left;padding-left:8px">${item.name || ""}</td><td>${item.qty || ""}</td><td>${item.unit || ""}</td><td>-</td><td>-</td><td>-</td><td>-</td><td style="text-align:left">${item.remark || ""}</td></tr>`).join("");
    return `<div style="font-family:'TH Sarabun PSK','TH Sarabun New','Sarabun','Kanit',Arial,sans-serif;color:#000;width:210mm;min-height:297mm;padding:21mm 9mm 12mm;background:#fff;box-sizing:border-box;position:relative"><style>table.wd{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;margin-top:40px}table.wd th,table.wd td{border:1px solid #000;padding:1px 4px;height:24px;line-height:1.05;text-align:center;vertical-align:middle}table.wd th{background:#F3A26E;font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden}</style><div style="display:grid;grid-template-columns:38mm 1fr 50mm;gap:5mm;align-items:start;margin-bottom:6mm;position:relative;min-height:32mm"><div>${logoSvg}</div><div style="position:absolute;left:50%;top:2mm;transform:translateX(-50%);width:90mm;text-align:center"><div style="font-size:25px;font-weight:400">บริษัท พานามณี จำกัด</div><div style="font-size:24px;font-weight:400;margin-top:1mm">ใบขอเบิก/ขอสั่งซื้อ</div></div><div></div></div><div style="display:flex;justify-content:space-between;align-items:flex-end;font-size:18px;font-weight:400;margin-bottom:7mm"><div>เลขที่ใบเบิก <span style="border-bottom:1px dotted #000;display:inline-block;min-width:34mm;text-align:center">${doc.docNo || ""}</span></div><div>วันที่ <span style="border-bottom:1px dotted #000;display:inline-block;min-width:36mm;text-align:center">${fmt(doc.docDate)}</span></div></div><div style="display:flex;align-items:flex-end;gap:2mm;font-size:18px;font-weight:400;margin-bottom:10mm"><span>หน่วยงาน</span><span style="border-bottom:1px dotted #000;display:inline-block;flex:1;padding-left:4mm">${doc.department || doc.project || ""}</span></div><table class="wd"><thead><tr><th rowspan="2" style="width:11mm">ลำดับ</th><th rowspan="2" style="width:53mm">รายการ</th><th colspan="2" style="width:34mm">จำนวนเบิก/ขอสั่งซื้อ</th><th rowspan="2" style="width:21mm">ยอดคงเหลือ</th><th rowspan="2" style="width:22mm">วันที่เบิกล่าสุด</th><th rowspan="2" style="width:15mm">ราคา</th><th rowspan="2" style="width:18mm">จำนวนเงิน</th><th rowspan="2">หมายเหตุ</th></tr><tr><th>จำนวน</th><th>หน่วยนับ</th></tr></thead><tbody>${trs}</tbody></table><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12mm;margin-top:7mm;font-size:17px;text-align:center"><div><div style="height:10mm;border-bottom:1px dotted #000"></div><div style="margin-top:2mm">ผู้ขอเบิก/ขอสั่งซื้อ</div></div><div><div style="height:10mm;border-bottom:1px dotted #000"></div><div style="margin-top:2mm">ผู้ตรวจสอบ</div></div><div><div style="height:10mm;border-bottom:1px dotted #000"></div><div style="margin-top:2mm">ผู้อนุมัติ</div></div></div></div>`;
  };
  const pdfName = doc => `${clean(doc.docNo || "withdrawal").replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
  const downloadPdf = async doc => {
    try {
      Swal.fire({
        title: "กำลังเตรียมไฟล์ PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      await window.__loadPdf();
      Swal.close();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "ไม่พบตัวสร้าง PDF",
        text: "โหลดไลบรารีไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
      });
      return;
    }
    const el = document.createElement("div");
    el.innerHTML = buildPdfHtml(doc);
    document.body.appendChild(el);
    try {
      await html2pdf().set({
        margin: 0,
        filename: pdfName(doc),
        image: {
          type: "jpeg",
          quality: .98
        },
        html2canvas: {
          scale: 2,
          useCORS: true
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        }
      }).from(el.firstElementChild).save();
    } finally {
      el.remove();
    }
  };
  const save = async form => {
    const key = form.key || safeKey(form.docNo);
    const saved = await window.api("upsertWithdrawal", {
      key,
      doc: {
        ...form,
        id: form.docNo || key
      }
    });
    const upd = rows.some(x => x.key === saved.key) ? rows.map(x => x.key === saved.key ? saved : x) : [saved, ...rows];
    setRows(upd);
    window.__DATA.withdrawals = upd;
    setEdit(null);
    Swal.fire({
      icon: "success",
      title: "บันทึกรายการเบิกแล้ว",
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: "top-end"
    });
  };
  const remove = async doc => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteWithdrawal",
      payload: {
        key: doc.key
      },
      entityLabel: "รายการเบิกของ",
      targetName: doc.docNo || doc.key,
      project: doc.project || "",
      targetInfo: [doc.docDate, doc.department || doc.project, doc.requester].filter(Boolean).join(" · ")
    });
    if (done) {
      const upd = rows.filter(x => x.key !== doc.key);
      setRows(upd);
      window.__DATA.withdrawals = upd;
    }
  };
  const filtered = rows.filter(x => !q || [x.docNo, x.docDate, x.project, x.department, x.requester].join(" ").toLowerCase().includes(q.toLowerCase()));
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01 / \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 / \u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19..."
  })), React.createElement("div", {
    className: "spacer"
  }), canEdit && React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setEdit({
      docNo: "",
      docDate: window.__DATA.fmtDate(new Date()),
      project: "",
      department: "",
      requester: "",
      items: [{
        name: "",
        qty: "",
        unit: "",
        remark: ""
      }],
      note: ""
    })
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19/\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E1C\u0E39\u0E49\u0E40\u0E1A\u0E34\u0E01"), React.createElement("th", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", null, "PDF"), React.createElement("th", null))), React.createElement("tbody", null, filtered.map(doc => React.createElement("tr", {
    key: doc.key || doc.docNo
  }, React.createElement("td", null, React.createElement("span", {
    className: "ticket-id"
  }, doc.docNo || "-")), React.createElement("td", null, doc.docDate || "-"), React.createElement("td", null, doc.department || doc.project || "-"), React.createElement("td", null, doc.requester || "-"), React.createElement("td", null, parseItems(doc).length.toLocaleString("th-TH")), React.createElement("td", null, React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    onClick: () => downloadPdf(doc)
  }, React.createElement("i", {
    className: "fa-solid fa-file-pdf"
  }), " PDF")), React.createElement("td", null, canEdit && React.createElement("div", {
    className: "row-actions"
  }, React.createElement("button", {
    className: "ia",
    onClick: () => setEdit(doc)
  }, React.createElement("i", {
    className: "fa-solid fa-pen"
  })), React.createElement("button", {
    className: "ia danger",
    onClick: () => remove(doc)
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  })))))), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-file-invoice"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E02\u0E2D\u0E07"), React.createElement("div", null, "\u0E01\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19")))))))), edit && React.createElement(WithdrawalForm, {
    initial: edit,
    onClose: () => setEdit(null),
    onSave: save
  }));
}
function WithdrawalForm({
  initial,
  onClose,
  onSave
}) {
  const [f, setF] = React.useState(initial);
  const [items, setItems] = React.useState(() => Array.isArray(initial.items) && initial.items.length ? initial.items : [{
    name: "",
    qty: "",
    unit: "",
    remark: ""
  }]);
  const up = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const upItem = (i, k, v) => setItems(prev => prev.map((x, idx) => idx === i ? {
    ...x,
    [k]: v
  } : x));
  const addItem = () => setItems(prev => [...prev, {
    name: "",
    qty: "",
    unit: "",
    remark: ""
  }]);
  const removeItem = i => setItems(prev => prev.length <= 1 ? [{
    name: "",
    qty: "",
    unit: "",
    remark: ""
  }] : prev.filter((_, idx) => idx !== i));
  const cleanItems = items.map(x => ({
    name: String(x.name || "").trim(),
    qty: String(x.qty || "").trim(),
    unit: String(x.unit || "").trim(),
    remark: String(x.remark || "").trim()
  })).filter(x => x.name || x.qty || x.unit || x.remark);
  const submit = e => {
    e.preventDefault();
    if (!String(f.docNo || "").trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรอกเลขที่ใบเบิกก่อน"
      });
      return;
    }
    if (!cleanItems.length) {
      Swal.fire({
        icon: "warning",
        title: "เพิ่มรายการอย่างน้อย 1 รายการ"
      });
      return;
    }
    onSave({
      ...f,
      items: cleanItems
    });
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "xl",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-file-invoice",
      style: {
        marginRight: 8,
        color: "var(--primary)"
      }
    }), f.key ? "แก้ไขรายการเบิก" : "เพิ่มรายการเบิก"),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"))
  }, React.createElement("form", {
    onSubmit: submit
  }, React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01 *"), React.createElement("input", {
    value: f.docNo || "",
    onChange: e => up("docNo", e.target.value),
    placeholder: "PN-202604-017"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("input", {
    type: "date",
    value: f.docDate || "",
    onChange: e => up("docDate", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E1C\u0E39\u0E49\u0E40\u0E1A\u0E34\u0E01"), React.createElement("input", {
    value: f.requester || "",
    onChange: e => up("requester", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19"), React.createElement("input", {
    value: f.department || "",
    onChange: e => up("department", e.target.value)
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("input", {
    value: f.project || "",
    onChange: e => up("project", e.target.value)
  })), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01"), React.createElement("div", {
    className: "table-wrap",
    style: {
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: 44
    }
  }, "#"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      width: 120
    }
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", {
    style: {
      width: 120
    }
  }, "\u0E2B\u0E19\u0E48\u0E27\u0E22"), React.createElement("th", null, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("th", {
    style: {
      width: 48
    }
  }))), React.createElement("tbody", null, items.map((item, idx) => React.createElement("tr", {
    key: idx
  }, React.createElement("td", {
    style: {
      textAlign: "center"
    }
  }, idx + 1), React.createElement("td", null, React.createElement("input", {
    value: item.name || "",
    onChange: e => upItem(idx, "name", e.target.value)
  })), React.createElement("td", null, React.createElement("input", {
    value: item.qty || "",
    onChange: e => upItem(idx, "qty", e.target.value)
  })), React.createElement("td", null, React.createElement("input", {
    value: item.unit || "",
    onChange: e => upItem(idx, "unit", e.target.value)
  })), React.createElement("td", null, React.createElement("input", {
    value: item.remark || "",
    onChange: e => upItem(idx, "remark", e.target.value)
  })), React.createElement("td", null, React.createElement("button", {
    type: "button",
    className: "ia danger",
    onClick: () => removeItem(idx)
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  })))))))), React.createElement("button", {
    type: "button",
    className: "btn btn-ghost btn-sm",
    style: {
      marginTop: 10
    },
    onClick: addItem
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E41\u0E16\u0E27\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("div", {
    className: "form-field",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", null, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
    rows: "3",
    value: f.note || "",
    onChange: e => up("note", e.target.value)
  }))), React.createElement("div", {
    className: "withdrawal-preview-title"
  }, React.createElement("span", null, React.createElement("i", {
    className: "fa-solid fa-file-lines",
    style: {
      color: "var(--primary)",
      marginRight: 8
    }
  }), "\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01\u0E17\u0E35\u0E48\u0E08\u0E30\u0E2D\u0E2D\u0E01\u0E40\u0E1B\u0E47\u0E19 PDF"), React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      fontWeight: 400
    }
  }, "24 \u0E41\u0E16\u0E27\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32")), React.createElement(WithdrawalPaperPreview, {
    doc: f,
    items: items
  })));
}
function DocPJ2({
  user
}) {
  const [rows, setRows] = React.useState(() => window.filterByUserProjects(user, window.__DATA.machines, "project"));
  const [q, setQ] = React.useState("");
  const [filterProj, setFilterProj] = React.useState("all");
  const [editCell, setEditCell] = React.useState(null);
  const [uploading, setUploading] = React.useState(null);
  const canEdit = ["Admin", "Officer", "Engineer", "Safety Officer"].includes(window.effectiveRole(user));
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const toDateStr = d => {
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };
  const fileToUpload = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        data: dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl
      });
    };
    reader.onerror = () => reject(reader.error || new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
  const uploadDoc = async (m, slot, file) => {
    if (!file) return;
    const field = slot === "PL" ? "driveLinkPL" : slot === 2 ? "driveLink2" : "driveLink1";
    const key = `${m.id}:${slot}`;
    setUploading(key);
    try {
      const upload = await fileToUpload(file);
      const saved = await window.api("uploadPJ2Document", {
        machineId: m.id,
        machineCode: m.code,
        slot,
        upload
      });
      const patch = {
        [field]: saved.url
      };
      await window.api("updateMachine", {
        id: m.id,
        patch
      });
      const upd = rows.map(x => x.id === m.id ? {
        ...x,
        ...patch
      } : x);
      setRows(upd);
      window.__DATA.machines = window.__DATA.machines.map(x => x.id === m.id ? {
        ...x,
        ...patch
      } : x);
      if (saved.sharing && saved.sharing.ok === false) {
        Swal.fire({
          icon: "warning",
          title: "อัปโหลดสำเร็จ แต่แชร์ลิงก์ไม่ได้",
          text: "ไฟล์ถูกบันทึกใน Drive แล้ว แต่บัญชี Google/Workspace ไม่อนุญาตให้แชร์ Anyone with link",
          confirmButtonColor: "#1E40AF"
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "อัปโหลดเอกสารสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "อัปโหลดไม่สำเร็จ",
        text: err.message
      });
    } finally {
      setUploading(null);
    }
  };
  const projects = React.useMemo(() => [...new Set(rows.map(m => m.project).filter(Boolean))].sort(), [rows]);
  const filtered = React.useMemo(() => rows.filter(m => {
    if (filterProj !== "all" && m.project !== filterProj) return false;
    if (q) {
      const qq = q.toLowerCase();
      if (![m.code, m.name, m.project, m.subSite, m.serial].map(x => (x || "").toLowerCase()).join(" ").includes(qq)) return false;
    }
    return true;
  }).sort((a, b) => {
    const da = a.nextInspectionDate ? new Date(a.nextInspectionDate) : null;
    const db = b.nextInspectionDate ? new Date(b.nextInspectionDate) : null;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  }), [rows, q, filterProj]);
  const saveDate = async () => {
    if (!editCell) return;
    const {
      id,
      field,
      value
    } = editCell;
    try {
      await window.api("updateMachine", {
        id,
        patch: {
          [field]: value
        }
      });
      const upd = rows.map(m => m.id === id ? {
        ...m,
        [field]: value
      } : m);
      setRows(upd);
      window.__DATA.machines = window.__DATA.machines.map(m => m.id === id ? {
        ...m,
        [field]: value
      } : m);
      setEditCell(null);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const nextDateColor = val => {
    if (!val) return null;
    const d = new Date(val);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "#EF4444";
    if (diff <= 30) return "#F59E0B";
    return "#10B981";
  };
  const renderDateCell = (m, field) => {
    const val = m[field] || "";
    const isEditing = editCell && editCell.id === m.id && editCell.field === field;
    const color = field === "nextInspectionDate" ? nextDateColor(val) : null;
    if (isEditing) return React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap"
      }
    }, React.createElement("input", {
      type: "date",
      value: editCell.value,
      onChange: e => setEditCell(ec => ({
        ...ec,
        value: e.target.value
      })),
      style: {
        padding: "3px 7px",
        border: "1px solid var(--primary)",
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "Kanit"
      },
      autoFocus: true
    }), React.createElement("button", {
      onClick: saveDate,
      style: {
        padding: "3px 10px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01"), React.createElement("button", {
      onClick: () => setEditCell(null),
      style: {
        padding: "3px 8px",
        background: "none",
        border: "1px solid var(--line)",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Kanit"
      }
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"));
    return React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, val ? React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: color ? "600" : "400",
        color: color ? color : "inherit",
        background: color ? color + "18" : "transparent",
        padding: color ? "2px 7px" : "0",
        borderRadius: 5,
        display: "inline-flex",
        alignItems: "center",
        gap: 4
      }
    }, window.__DATA.fmtDate(val), color === "#EF4444" && React.createElement("span", {
      style: {
        fontSize: 10
      }
    }, "\u26A0 \u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14"), color === "#F59E0B" && React.createElement("span", {
      style: {
        fontSize: 10
      }
    }, "\u0E43\u0E01\u0E25\u0E49\u0E16\u0E36\u0E07\u0E01\u0E33\u0E2B\u0E19\u0E14")) : React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u2014"), canEdit && React.createElement("button", {
      onClick: () => setEditCell({
        id: m.id,
        field,
        value: val || toDateStr(new Date())
      }),
      style: {
        padding: "1px 5px",
        background: "none",
        border: "1px solid var(--line)",
        borderRadius: 4,
        fontSize: 10,
        cursor: "pointer",
        color: "var(--muted)"
      }
    }, React.createElement("i", {
      className: `fa-solid ${val ? "fa-pen" : "fa-plus"}`
    })));
  };
  const linkBtn = (m, slot) => {
    const url = slot === "PL" ? m.driveLinkPL : slot === 2 ? m.driveLink2 : m.driveLink1;
    const key = `${m.id}:${slot}`;
    return React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap"
      }
    }, url ? React.createElement("a", {
      href: url,
      target: "_blank",
      rel: "noreferrer",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 6,
        background: "#EFF6FF",
        border: "1px solid #BFDBFE",
        color: "#1E40AF",
        fontSize: 12,
        textDecoration: "none",
        whiteSpace: "nowrap"
      }
    }, React.createElement("i", {
      className: "fa-brands fa-google-drive",
      style: {
        color: "#4285F4"
      }
    }), "\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C", React.createElement("i", {
      className: "fa-solid fa-arrow-up-right-from-square",
      style: {
        fontSize: 9,
        opacity: .6
      }
    })) : React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "\u2014"), canEdit && React.createElement("label", {
      className: "btn btn-sm btn-ghost",
      style: {
        padding: "4px 8px",
        fontSize: 12,
        cursor: uploading ? "not-allowed" : "pointer",
        opacity: uploading && uploading !== key ? .7 : 1
      }
    }, uploading === key ? React.createElement(React.Fragment, null, React.createElement("span", {
      className: "spinner",
      style: {
        width: 12,
        height: 12,
        borderWidth: 2
      }
    }), " \u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14...") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-upload"
    }), " \u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14"), React.createElement("input", {
      type: "file",
      style: {
        display: "none"
      },
      disabled: !!uploading,
      onChange: e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        uploadDoc(m, slot, file);
      }
    })));
  };
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E23\u0E2B\u0E31\u0E2A / \u0E0A\u0E37\u0E48\u0E2D / \u0E0B\u0E35\u0E40\u0E23\u0E35\u0E22\u0E25...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("select", {
    value: filterProj,
    onChange: e => setFilterProj(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), projects.map(p => React.createElement("option", {
    key: p,
    value: p
  }, p))), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, filtered.length, " / ", rows.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("div", {
    style: {
      padding: "8px 16px",
      borderBottom: "1px solid var(--line)",
      background: "#FAFBFC",
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      fontSize: 12,
      color: "var(--muted)"
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 500,
      color: "var(--text)"
    }
  }, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38:"), React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#10B981",
      display: "inline-block"
    }
  }), "\u0E40\u0E02\u0E35\u0E22\u0E27 \u2014 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E16\u0E36\u0E07\u0E01\u0E33\u0E2B\u0E19\u0E14 (>30 \u0E27\u0E31\u0E19)"), React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#F59E0B",
      display: "inline-block"
    }
  }), "\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E07 \u2014 \u0E43\u0E01\u0E25\u0E49\u0E16\u0E36\u0E07\u0E01\u0E33\u0E2B\u0E19\u0E14 (\u226430 \u0E27\u0E31\u0E19)"), React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#EF4444",
      display: "inline-block"
    }
  }), "\u0E41\u0E14\u0E07 \u2014 \u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E41\u0E25\u0E49\u0E27 \u26A0")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A / \u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("th", null, "\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 (1)"), React.createElement("th", null, "\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 (2)"), React.createElement("th", null, "PL (\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19)"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A"), React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E23\u0E31\u0E49\u0E07\u0E16\u0E31\u0E14\u0E44\u0E1B"))), React.createElement("tbody", null, filtered.map(m => React.createElement("tr", {
    key: m.id
  }, React.createElement("td", null, React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, m.code || "—"), React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 13,
      marginTop: 2
    }
  }, m.name || "—"), m.subSite && React.createElement("div", {
    style: {
      marginTop: 3
    }
  }, React.createElement(SubSiteTag, {
    value: m.subSite,
    project: m.project
  })), m.brand && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted)"
    }
  }, m.brand, m.model ? ` ${m.model}` : ""), m.serial && React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: "var(--muted)",
      marginTop: 3
    }
  }, "SN: ", m.serial)), React.createElement("td", null, linkBtn(m, 1)), React.createElement("td", null, linkBtn(m, 2)), React.createElement("td", null, linkBtn(m, "PL")), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, React.createElement(ProjectLabel, {
    name: m.project
  })), React.createElement("td", null, renderDateCell(m, "inspectionDate")), React.createElement("td", null, renderDateCell(m, "nextInspectionDate")))), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-file-circle-xmark"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), React.createElement("div", null, "\u0E25\u0E2D\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32"))))))));
}
function LoginLogs() {
  const [logs, setLogs] = React.useState([]);
  const [keep, setKeep] = React.useState(100);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [q, setQ] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("all");
  const [filterUser, setFilterUser] = React.useState("all");
  const fetchLogs = () => {
    setLoading(true);
    setErr(null);
    window.api("getLoginLogs").then(r => {
      setLogs(r.logs || []);
      if (r.keep) setKeep(r.keep);
      if (r.removed > 0) Swal.fire({
        icon: "info",
        title: `ลบประวัติเก่า ${r.removed} รายการ`,
        text: `ระบบเก็บประวัติการล็อกอินล่าสุด ${r.keep} รายการ`,
        timer: 2600,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
      setLoading(false);
    }).catch(e => {
      setErr(e.message || "โหลดข้อมูลไม่สำเร็จ");
      setLoading(false);
    });
  };
  React.useEffect(() => {
    fetchLogs();
  }, []);
  const roleColor = {
    "Admin": "#7C3AED",
    "Officer": "#1D4ED8",
    "Engineer": "#0369A1",
    "Safety Officer": "#DB2777",
    "Technician": "#047857",
    "Director": "#B45309",
    "Reporter": "#64748B"
  };
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => (l.when || "").slice(0, 10) === todayStr);
  const uniqueToday = new Set(todayLogs.map(l => l.userId)).size;
  const userNames = React.useMemo(() => [...new Set(logs.map(l => l.username).filter(Boolean))].sort(), [logs]);
  const roles = React.useMemo(() => [...new Set(logs.map(l => l.role).filter(Boolean))].sort(), [logs]);
  const filtered = React.useMemo(() => logs.filter(l => {
    if (filterRole !== "all" && l.role !== filterRole) return false;
    if (filterUser !== "all" && l.username !== filterUser) return false;
    if (q) {
      const qq = q.toLowerCase();
      if (![l.username, l.name, l.role, l.dept].map(x => (x || "").toLowerCase()).join(" ").includes(qq)) return false;
    }
    return true;
  }), [logs, q, filterRole, filterUser]);
  const fmtWhen = iso => {
    if (!iso) return "—";
    const d = new Date(iso);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    return `${date} ${time}`;
  };
  const stats = [{
    label: "ล็อกอินทั้งหมด",
    val: logs.length,
    icon: "fa-clock-rotate-left",
    color: "#3B82F6"
  }, {
    label: "ล็อกอินวันนี้",
    val: todayLogs.length,
    icon: "fa-calendar-day",
    color: "#10B981"
  }, {
    label: "ผู้ใช้ที่ active วันนี้",
    val: uniqueToday,
    icon: "fa-user-check",
    color: "#8B5CF6"
  }, {
    label: "ผู้ใช้ทั้งหมด",
    val: userNames.length,
    icon: "fa-users",
    color: "#F59E0B"
  }];
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "stat-grid",
    style: {
      marginBottom: 18
    }
  }, stats.map((s, i) => React.createElement("div", {
    className: "stat",
    key: i
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: s.color + "1a",
      color: s.color
    }
  }, React.createElement("i", {
    className: `fa-solid ${s.icon}`
  })), React.createElement("div", {
    className: "label"
  }, s.label), React.createElement("div", {
    className: "val"
  }, s.val)))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E0A\u0E37\u0E48\u0E2D / Username / \u0E41\u0E1C\u0E19\u0E01...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("select", {
    value: filterUser,
    onChange: e => setFilterUser(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01 Username"), userNames.map(u => React.createElement("option", {
    key: u,
    value: u
  }, u))), React.createElement("select", {
    value: filterRole,
    onChange: e => setFilterRole(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01 Role"), roles.map(r => React.createElement("option", {
    key: r,
    value: r
  }, r))), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, filtered.length, " / ", logs.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", React.createElement("span", {
    title: `ระบบเก็บประวัติล่าสุด ${keep} รายการ ที่เกินมาจะถูกลบอัตโนมัติ`,
    style: {
      marginLeft: 8,
      color: "#B45309"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clock-rotate-left",
    style: {
      marginRight: 4
    }
  }), "\u0E40\u0E01\u0E47\u0E1A\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14 ", keep, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: fetchLogs,
    disabled: loading,
    title: "\u0E42\u0E2B\u0E25\u0E14\u0E43\u0E2B\u0E21\u0E48"
  }, React.createElement("i", {
    className: `fa-solid fa-rotate${loading ? " fa-spin" : ""}`
  }))), loading ? React.createElement("div", {
    style: {
      display: "grid",
      placeItems: "center",
      padding: 60,
      gap: 12
    }
  }, React.createElement("div", {
    className: "spinner",
    style: {
      width: 32,
      height: 32,
      borderWidth: 3
    }
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13
    }
  }, "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...")) : err ? React.createElement("div", {
    style: {
      padding: 32,
      textAlign: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      fontSize: 32,
      color: "var(--danger)",
      marginBottom: 10,
      display: "block"
    }
  }), React.createElement("div", {
    style: {
      fontWeight: 500,
      marginBottom: 6
    }
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--muted)",
      marginBottom: 14
    }
  }, err), React.createElement("button", {
    className: "btn btn-primary",
    onClick: fetchLogs
  }, React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48")) : logs.length === 0 ? React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clock-rotate-left",
    style: {
      fontSize: 36,
      color: "var(--muted)",
      marginBottom: 12,
      display: "block"
    }
  }), React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginBottom: 6
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E47\u0E2D\u0E01\u0E2D\u0E34\u0E19"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--muted)",
      marginBottom: 4
    }
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E07\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1F\u0E35\u0E40\u0E08\u0E2D\u0E23\u0E4C\u0E19\u0E35\u0E49"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--muted)"
    }
  }, "Log \u0E08\u0E30\u0E40\u0E23\u0E34\u0E48\u0E21\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E21\u0E37\u0E48\u0E2D user \u0E41\u0E15\u0E48\u0E25\u0E30\u0E04\u0E19 ", React.createElement("strong", null, "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27\u0E25\u0E47\u0E2D\u0E01\u0E2D\u0E34\u0E19\u0E43\u0E2B\u0E21\u0E48"))) : React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: 36
    }
  }, "#"), React.createElement("th", null, "\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E25\u0E47\u0E2D\u0E01\u0E2D\u0E34\u0E19"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D-\u0E2A\u0E01\u0E38\u0E25"), React.createElement("th", null, "Username"), React.createElement("th", null, "Role"), React.createElement("th", null, "\u0E41\u0E1C\u0E19\u0E01"))), React.createElement("tbody", null, filtered.map((l, i) => {
    const rc = roleColor[l.role] || "#64748B";
    const isToday = (l.when || "").slice(0, 10) === todayStr;
    return React.createElement("tr", {
      key: l.id || i,
      style: isToday ? {
        background: "#F0FDF4"
      } : {}
    }, React.createElement("td", {
      style: {
        color: "var(--muted)",
        fontSize: 11,
        textAlign: "center"
      }
    }, i + 1), React.createElement("td", null, React.createElement("div", {
      style: {
        fontFamily: "JetBrains Mono,monospace",
        fontSize: 12,
        fontWeight: isToday ? 600 : 400,
        color: isToday ? "#065F46" : "var(--text)"
      }
    }, fmtWhen(l.when)), isToday && React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#10B981",
        fontWeight: 500,
        marginTop: 1
      }
    }, "\u25CF \u0E27\u0E31\u0E19\u0E19\u0E35\u0E49")), React.createElement("td", null, React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, l.name || "—")), React.createElement("td", null, React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 12,
        padding: "2px 7px",
        background: "#F1F5F9",
        borderRadius: 5
      }
    }, l.username || "—")), React.createElement("td", null, React.createElement("span", {
      style: {
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: rc + "18",
        color: rc
      }
    }, l.role || "—")), React.createElement("td", {
      style: {
        fontSize: 13,
        color: "var(--muted)"
      }
    }, l.dept || "—"));
  }), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "6"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E04\u0E49\u0E19\u0E2B\u0E32"), React.createElement("div", null, "\u0E25\u0E2D\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32")))))))));
}
function MachineTransferHistory({
  user
}) {
  const allTransfers = React.useMemo(() => {
    const visible = window.filterByUserProjects(user, window.__DATA.machines, "project");
    const list = [];
    visible.forEach(m => {
      (m.transferHistory || []).forEach(t => list.push({
        ...t,
        machineCode: m.code,
        machineName: m.name,
        currentProject: m.project
      }));
    });
    return list.sort((a, b) => new Date(b.when) - new Date(a.when));
  }, [user]);
  const [q, setQ] = React.useState("");
  const [filterProj, setFilterProj] = React.useState("all");
  const projects = React.useMemo(() => {
    const s = new Set();
    allTransfers.forEach(t => {
      if (t.from) s.add(t.from);
      if (t.to) s.add(t.to);
    });
    return [...s].sort();
  }, [allTransfers]);
  const filtered = React.useMemo(() => allTransfers.filter(t => {
    if (filterProj !== "all" && t.from !== filterProj && t.to !== filterProj) return false;
    if (q) {
      const qq = q.toLowerCase();
      if (![t.machineCode, t.machineName, t.from, t.to, t.fromSubSite, t.toSubSite, t.by, t.note].map(x => (x || "").toLowerCase()).join(" ").includes(qq)) return false;
    }
    return true;
  }), [allTransfers, q, filterProj]);
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E23\u0E2B\u0E31\u0E2A / \u0E0A\u0E37\u0E48\u0E2D / \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("select", {
    value: filterProj,
    onChange: e => setFilterProj(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "\u0E17\u0E38\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), projects.map(p => React.createElement("option", {
    key: p,
    value: p
  }, p))), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, filtered.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E22\u0E49\u0E32\u0E22"), React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("th", null, "\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      width: 24
    }
  }), React.createElement("th", null, "\u0E44\u0E1B\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E42\u0E14\u0E22"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25"))), React.createElement("tbody", null, filtered.map((t, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", {
    style: {
      color: "var(--muted)",
      whiteSpace: "nowrap",
      fontSize: 13
    }
  }, window.__DATA.fmtDate(t.when)), React.createElement("td", null, React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12
    }
  }, t.machineCode || "—")), React.createElement("td", {
    style: {
      fontWeight: 500,
      fontSize: 13
    }
  }, t.machineName || "—"), React.createElement("td", null, React.createElement("span", {
    style: {
      background: "#F5F3FF",
      color: "#6D28D9",
      padding: "2px 8px",
      borderRadius: 5,
      fontSize: 12,
      fontWeight: 500
    }
  }, t.from || "ไม่ระบุ"), t.fromSubSite && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6D28D9",
      marginTop: 3
    }
  }, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      fontSize: 9,
      marginRight: 3
    }
  }), t.fromSubSite)), React.createElement("td", {
    style: {
      textAlign: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-arrow-right",
    style: {
      color: "var(--muted)",
      fontSize: 11
    }
  })), React.createElement("td", null, React.createElement("span", {
    style: {
      background: "#EFF6FF",
      color: "#1E40AF",
      padding: "2px 8px",
      borderRadius: 5,
      fontSize: 12,
      fontWeight: 600
    }
  }, t.to), t.toSubSite && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#1E40AF",
      marginTop: 3
    }
  }, React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      fontSize: 9,
      marginRight: 3
    }
  }), t.toSubSite)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, t.by || "—"), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 12,
      color: "#4B5563",
      maxWidth: 200
    }
  }, t.note || "—"))), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "8"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-right-left"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22"), React.createElement("div", null, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"))))))));
}

/* ---- block 16 (ต้นฉบับบรรทัด 6371) ---- */
function ReporterDashboard({
  user,
  goTo
}) {
  const mine = React.useMemo(() => {
    if (user.role === "Engineer") return window.filterByUserProjects(user, window.__DATA.repairs, "project");
    return window.filterByUserProjects(user, window.__DATA.repairs.filter(r => r.reporterId === user.id), "project");
  }, [user]);
  const counts = {
    all: mine.length,
    progress: mine.filter(r => ["progress", "assess", "new"].includes(r.status)).length,
    parts: mine.filter(r => r.status === "parts").length,
    done: mine.filter(r => r.status === "done").length
  };
  const recent = mine.slice(0, 5);
  const stats = [{
    label: "รายการทั้งหมด",
    val: counts.all,
    icon: "fa-clipboard-list",
    color: "#3B82F6"
  }, {
    label: "กำลังดำเนินการ",
    val: counts.progress,
    icon: "fa-screwdriver-wrench",
    color: "#F59E0B"
  }, {
    label: "รออะไหล่",
    val: counts.parts,
    icon: "fa-box-open",
    color: "#EF4444"
  }, {
    label: "เสร็จสิ้น",
    val: counts.done,
    icon: "fa-circle-check",
    color: "#10B981"
  }];
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "stat-grid"
  }, stats.map((s, i) => React.createElement("div", {
    className: "stat",
    key: i
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: s.color + "1a",
      color: s.color
    }
  }, React.createElement("i", {
    className: `fa-solid ${s.icon}`
  })), React.createElement("div", {
    className: "label"
  }, s.label), React.createElement("div", {
    className: "val"
  }, s.val)))), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 18
    }
  }, React.createElement("div", {
    className: "card-body",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 22,
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 14,
      background: "linear-gradient(135deg,#3B82F6,#1E40AF)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontSize: 24
    }
  }, React.createElement("i", {
    className: "fa-solid fa-circle-plus"
  })), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220
    }
  }, React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      marginBottom: 4
    }
  }, "\u0E1E\u0E1A\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23?"), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13.5
    }
  }, "\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35 \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E2A\u0E48\u0E07\u0E15\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E0A\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E41\u0E25\u0E30\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23")), React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => goTo("r-new")
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E21\u0E48"))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, "\u0E07\u0E32\u0E19\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19"), React.createElement("div", {
    className: "sub"
  }, mine.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14")), React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => goTo("r-mine")
  }, "\u0E14\u0E39\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ", React.createElement("i", {
    className: "fa-solid fa-arrow-right"
  }))), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("th", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"))), React.createElement("tbody", null, recent.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("span", {
    className: "ticket-id"
  }, r.running)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      color: "var(--muted)",
      whiteSpace: "nowrap"
    }
  }, window.__DATA.fmtDate(r.createdAt)), React.createElement("td", null, React.createElement("div", {
    className: "cell-title"
  }, React.createElement(ProblemLines, {
    title: r.title,
    max: 4
  }))), React.createElement("td", {
    className: "hide-on-mobile"
  }, React.createElement(CategoryChip, {
    categoryId: r.categoryId
  })), React.createElement("td", null, React.createElement(Badge, {
    status: r.status
  })))), recent.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "5"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-clipboard"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("div", null, "\u0E04\u0E25\u0E34\u0E01 \"\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E21\u0E48\" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19")))))))));
}
function NewRequest({
  user,
  goTo
}) {
  const allProjects = React.useMemo(() => {
    return window.userProjects(user);
  }, [user]);
  const initProject = window.getActiveProject(user) || "";
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const [f, setF] = React.useState({
    title: "",
    categoryId: "",
    project: initProject,
    subSite: "",
    machineCode: "",
    siteId: "",
    odometerKm: "",
    hourMeter: "",
    driverName: "",
    reportDate: todayStr,
    placeMode: "onsite",
    placeOnsite: initProject,
    placeOther: "",
    photos: []
  });
  const [loading, setLoading] = React.useState(false);
  const projectMachines = React.useMemo(() => {
    if (!f.project) return [];
    return (window.__DATA.machines || []).filter(m => {
      if (m.project !== f.project) return false;
      if (f.subSite && (m.subSite || "") && m.subSite !== f.subSite) return false;
      return true;
    });
  }, [f.project, f.subSite]);
  const filteredMachines = React.useMemo(() => {
    if (!f.categoryId) return projectMachines;
    return projectMachines.filter(m => m.categoryId === f.categoryId);
  }, [projectMachines, f.categoryId]);
  const projectCategories = React.useMemo(() => {
    const ids = new Set(projectMachines.map(m => m.categoryId).filter(Boolean));
    return (window.__DATA.categories || []).filter(c => ids.has(c.id));
  }, [projectMachines]);
  const onProjectChange = p => setF(prev => ({
    ...prev,
    project: p,
    subSite: "",
    categoryId: "",
    machineCode: "",
    placeOnsite: !prev.placeOnsite || prev.placeOnsite === prev.project ? p : prev.placeOnsite
  }));
  const onSubSiteChange = s => setF(prev => ({
    ...prev,
    subSite: s,
    machineCode: ""
  }));
  const onCategoryChange = cid => setF(prev => ({
    ...prev,
    categoryId: cid,
    machineCode: ""
  }));
  const onMachineChange = code => setF(prev => {
    const sel = projectMachines.find(m => m.code === code);
    return {
      ...prev,
      machineCode: code,
      subSite: prev.subSite || sel && sel.subSite || "",
      hourMeter: sel && sel.hours != null && sel.hours !== "" ? String(sel.hours) : "",
      driverName: sel && sel.driverName || "",
      odometerKm: ""
    };
  });
  const submit = async () => {
    if (!f.project) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณาเลือกโครงการ/หน่วยงานก่อน"
      });
      return;
    }
    if (!f.categoryId) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณาเลือกหมวดหมู่"
      });
      return;
    }
    const title = (f.title || "").split("\n").map(s => s.trim()).filter(Boolean).join("\n");
    if (!title) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณาระบุอาการ/ปัญหาอย่างน้อย 1 รายการ"
      });
      return;
    }
    setLoading(true);
    try {
      const repairPlace = {
        mode: f.placeMode,
        onsite: f.placeMode === "onsite" ? f.placeOnsite || f.project : "",
        other: f.placeMode === "other" ? f.placeOther : "",
        reportAt: "",
        note: ""
      };
      const createdAt = f.reportDate ? new Date(f.reportDate + "T00:00:00").toISOString() : undefined;
      const repair = {
        siteId: f.siteId,
        title,
        desc: "",
        problems: title.split("\n").filter(Boolean).map(t => ({
          text: t,
          status: "new"
        })),
        project: f.project,
        subSite: f.subSite || "",
        categoryId: f.categoryId,
        status: "new",
        reporterId: user.id,
        reporterName: user.name,
        assignedId: "",
        cost: "",
        machineCode: f.machineCode,
        odometerKm: f.odometerKm || "",
        hourMeter: f.hourMeter || "",
        driverName: f.driverName || "",
        repairPlace,
        photos: (f.photos || []).filter(Boolean),
        createdAt
      };
      const saved = await window.api("createRepair", {
        repair
      });
      saved.createdAt = new Date(saved.createdAt);
      saved.timeline = [{
        status: "new",
        when: new Date(),
        by: user.name,
        note: "แจ้งเข้าระบบ"
      }];
      window.__DATA.repairs = [saved, ...window.__DATA.repairs];
      setLoading(false);
      Swal.fire({
        icon: "success",
        title: "แจ้งซ่อมสำเร็จ!",
        html: `เลขที่ใบแจ้งซ่อม: <strong class="mono" style="color:#1E40AF">${saved.running}</strong>`,
        confirmButtonColor: "#1E40AF"
      }).then(async () => {
        await window.shareRepairImage(saved, user);
        goTo(window.isOpsRole(user) ? "repairs" : "r-mine");
      });
    } catch (err) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  return React.createElement(React.Fragment, null, React.createElement(Loading, {
    show: loading,
    text: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01..."
  }), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-h"
  }, React.createElement("div", null, React.createElement("h3", null, "\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("div", {
    className: "sub"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E2D\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E2B\u0E25\u0E31\u0E07\u0E2A\u0E48\u0E07\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21"))), React.createElement("div", {
    className: "card-body"
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 18,
      flexWrap: "wrap"
    }
  }, [{
    n: 1,
    l: "เลือกโครงการ",
    done: !!f.project
  }, {
    n: 2,
    l: "เลือกหมวดหมู่",
    done: !!f.categoryId,
    disabled: !f.project
  }, {
    n: 3,
    l: "เลือกเครื่องจักร",
    done: !!f.machineCode,
    disabled: !f.categoryId
  }, {
    n: 4,
    l: "รายละเอียดอาการ",
    done: (f.title || "").split("\n").some(s => s.trim()),
    disabled: !f.machineCode
  }].map(s => React.createElement("div", {
    key: s.n,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 999,
      background: s.done ? "rgba(16,185,129,.1)" : s.disabled ? "var(--bg)" : "var(--accent-soft)",
      border: `1px solid ${s.done ? "rgba(16,185,129,.3)" : s.disabled ? "var(--line)" : "rgba(30,64,175,.2)"}`,
      color: s.done ? "#047857" : s.disabled ? "var(--muted)" : "var(--primary)",
      fontSize: 13,
      fontWeight: 500,
      opacity: s.disabled ? 0.55 : 1
    }
  }, React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      fontSize: 11,
      background: s.done ? "#10B981" : s.disabled ? "var(--line)" : "var(--primary)",
      color: "#fff"
    }
  }, s.done ? React.createElement("i", {
    className: "fa-solid fa-check"
  }) : s.n), s.l))), React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "var(--primary)",
      color: "#fff",
      fontSize: 11,
      display: "inline-grid",
      placeItems: "center",
      fontWeight: 600
    }
  }, "1"), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19 *")), React.createElement("select", {
    value: f.project,
    onChange: e => onProjectChange(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u2014"), allProjects.map(p => React.createElement("option", {
    key: p,
    value: p
  }, p))), React.createElement("div", {
    className: "hint"
  }, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E23\u0E2D\u0E07\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E19\u0E31\u0E49\u0E19")), React.createElement(SubSiteField, {
    project: f.project,
    value: f.subSite,
    onChange: onSubSiteChange,
    className: "form-field full",
    hint: "\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E0B\u0E15\u0E4C\u0E41\u0E25\u0E49\u0E27\u0E08\u0E30\u0E40\u0E2B\u0E47\u0E19\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E17\u0E35\u0E48\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E44\u0E0B\u0E15\u0E4C\u0E19\u0E31\u0E49\u0E19 (\u0E23\u0E27\u0E21\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E44\u0E0B\u0E15\u0E4C)"
  }), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: f.project ? "var(--primary)" : "var(--line)",
      color: "#fff",
      fontSize: 11,
      display: "inline-grid",
      placeItems: "center",
      fontWeight: 600
    }
  }, "2"), "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48 *")), React.createElement("select", {
    value: f.categoryId,
    onChange: e => onCategoryChange(e.target.value),
    disabled: !f.project
  }, React.createElement("option", {
    value: ""
  }, !f.project ? "— กรุณาเลือกโครงการก่อน —" : projectCategories.length === 0 ? "— ไม่พบหมวดหมู่ในโครงการนี้ —" : "— เลือกหมวดหมู่ —"), projectCategories.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), f.project && projectCategories.length > 0 && React.createElement("div", {
    className: "hint"
  }, "\u0E1E\u0E1A ", projectCategories.length, " \u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \"", f.project, "\"")), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: f.categoryId ? "var(--primary)" : "var(--line)",
      color: "#fff",
      fontSize: 11,
      display: "inline-grid",
      placeItems: "center",
      fontWeight: 600
    }
  }, "3"), "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23")), React.createElement("select", {
    value: f.machineCode,
    onChange: e => onMachineChange(e.target.value),
    disabled: !f.categoryId
  }, React.createElement("option", {
    value: ""
  }, !f.project ? "— กรุณาเลือกโครงการก่อน —" : !f.categoryId ? "— กรุณาเลือกหมวดหมู่ก่อน —" : filteredMachines.length === 0 ? "— ไม่พบเครื่องจักร —" : "— เลือกเครื่องจักร —"), filteredMachines.map(m => React.createElement("option", {
    key: m.id,
    value: m.code
  }, m.code, " \u2014 ", m.name, m.brand ? ` (${m.brand}${m.model ? ` ${m.model}` : ""})` : "", m.serial ? ` · S/N ${m.serial}` : ""))), f.categoryId && filteredMachines.length > 0 && React.createElement("div", {
    className: "hint"
  }, "\u0E1E\u0E1A ", filteredMachines.length, " \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E43\u0E19\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48\u0E19\u0E35\u0E49"), (() => {
    const sel = filteredMachines.find(m => m.code === f.machineCode);
    return sel ? React.createElement("div", {
      style: {
        marginTop: 8,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "9px 12px",
        background: "var(--accent-soft)",
        border: "1px solid rgba(30,64,175,.15)",
        borderRadius: 8,
        fontSize: 13
      }
    }, React.createElement("span", null, React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "\u0E23\u0E2B\u0E31\u0E2A:"), " ", React.createElement("span", {
      className: "mono"
    }, sel.code)), React.createElement("span", {
      style: {
        color: "var(--line)"
      }
    }, "\xB7"), React.createElement("span", null, React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "\u0E0B\u0E35\u0E40\u0E23\u0E35\u0E22\u0E25:"), " ", sel.serial ? React.createElement("span", {
      className: "mono"
    }, sel.serial) : React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "\u2014 \u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38 \u2014")), sel.brand && React.createElement(React.Fragment, null, React.createElement("span", {
      style: {
        color: "var(--line)"
      }
    }, "\xB7"), React.createElement("span", null, React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, "\u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D:"), " ", sel.brand, sel.model ? ` ${sel.model}` : ""))) : null;
  })()), React.createElement("div", {
    className: "form-field full",
    style: {
      opacity: f.machineCode ? 1 : 0.5,
      pointerEvents: f.machineCode ? "auto" : "none"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-gauge",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 \u0E13 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
      gap: 10
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginBottom: 4
    }
  }, "\u0E40\u0E25\u0E02\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E01\u0E34\u0E42\u0E25\u0E40\u0E21\u0E15\u0E23"), React.createElement("input", {
    type: "number",
    min: "0",
    step: "any",
    value: f.odometerKm,
    onChange: e => setF({
      ...f,
      odometerKm: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 125400"
  })), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginBottom: 4
    }
  }, "\u0E40\u0E25\u0E02\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07"), React.createElement("input", {
    type: "number",
    min: "0",
    step: "any",
    value: f.hourMeter,
    onChange: e => setF({
      ...f,
      hourMeter: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 8320"
  })), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginBottom: 4
    }
  }, "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A / \u0E1C\u0E39\u0E49\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21"), React.createElement("input", {
    value: f.driverName,
    onChange: e => setF({
      ...f,
      driverName: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E19\u0E32\u0E22\u0E2A\u0E21\u0E0A\u0E32\u0E22 \u0E43\u0E08\u0E14\u0E35"
  }))), React.createElement("div", {
    className: "hint"
  }, "\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A \xB7 \u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E15\u0E34\u0E21\u0E40\u0E25\u0E02\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07\u0E41\u0E25\u0E30\u0E0A\u0E37\u0E48\u0E2D\u0E04\u0E19\u0E02\u0E31\u0E1A\u0E08\u0E32\u0E01\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E43\u0E2B\u0E49 \u0E41\u0E01\u0E49\u0E43\u0E2B\u0E49\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49")), React.createElement("div", {
    className: "form-field full",
    style: {
      opacity: f.machineCode ? 1 : 0.5,
      pointerEvents: f.machineCode ? "auto" : "none"
    }
  }, React.createElement("label", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32 * ", React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontWeight: 400,
      fontSize: 12
    }
  }, "(\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E44\u0E14\u0E49\u0E2B\u0E25\u0E32\u0E22\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)")), React.createElement(ProblemsField, {
    value: f.title,
    onChange: v => setF({
      ...f,
      title: v
    })
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-images",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A ", React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontWeight: 400,
      fontSize: 12
    }
  }, "(\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A \xB7 \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 5 \u0E23\u0E39\u0E1B)")), React.createElement(PhotosField, {
    value: f.photos,
    onChange: v => setF({
      ...f,
      photos: v
    })
  })), React.createElement("div", {
    className: "form-field full",
    style: {
      opacity: f.machineCode ? 1 : 0.5,
      pointerEvents: f.machineCode ? "auto" : "none"
    }
  }, React.createElement("label", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 (\u0E17\u0E35\u0E48\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19)"), React.createElement("input", {
    value: f.siteId,
    onChange: e => setF({
      ...f,
      siteId: e.target.value
    }),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 WR-1234"
  }), React.createElement("div", {
    className: "hint"
  }, "\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A \xB7 \u0E01\u0E23\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E08\u0E32\u0E01\u0E43\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07\u0E17\u0E35\u0E48\u0E44\u0E0B\u0E15\u0E4C")), React.createElement("div", {
    className: "form-field full",
    style: {
      opacity: f.machineCode ? 1 : 0.5,
      pointerEvents: f.machineCode ? "auto" : "none"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-calendar-day",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07"), React.createElement("input", {
    type: "date",
    value: f.reportDate,
    onChange: e => setF({
      ...f,
      reportDate: e.target.value
    })
  }), React.createElement("div", {
    className: "hint"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E15\u0E34\u0E21\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E43\u0E2B\u0E49 \xB7 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E44\u0E14\u0E49")), React.createElement("div", {
    className: "form-field full",
    style: {
      opacity: f.machineCode ? 1 : 0.5,
      pointerEvents: f.machineCode ? "auto" : "none"
    }
  }, React.createElement("label", null, React.createElement("i", {
    className: "fa-solid fa-location-dot",
    style: {
      color: "var(--primary)",
      marginRight: 6
    }
  }), "\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E17\u0E33\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("div", {
    style: {
      display: "grid",
      gap: 10,
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: "12px 14px"
    }
  }, React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      margin: 0,
      fontWeight: 400
    }
  }, React.createElement("input", {
    type: "radio",
    name: "np-place",
    style: {
      width: "auto",
      flexShrink: 0,
      margin: 0
    },
    checked: f.placeMode === "onsite",
    onChange: () => setF({
      ...f,
      placeMode: "onsite"
    })
  }), React.createElement("span", {
    style: {
      whiteSpace: "nowrap"
    }
  }, "\u0E2A\u0E48\u0E07\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E07\u0E32\u0E19 \u0E17\u0E35\u0E48"), React.createElement("input", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 150
    },
    value: f.placeOnsite,
    onChange: e => setF({
      ...f,
      placeOnsite: e.target.value
    }),
    placeholder: "\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E07\u0E32\u0E19"
  })), React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      margin: 0,
      fontWeight: 400
    }
  }, React.createElement("input", {
    type: "radio",
    name: "np-place",
    style: {
      width: "auto",
      flexShrink: 0,
      margin: 0
    },
    checked: f.placeMode === "workshop",
    onChange: () => setF({
      ...f,
      placeMode: "workshop"
    })
  }), React.createElement("span", null, "\u0E42\u0E23\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E02\u0E2D\u0E07\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21")), React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      margin: 0,
      fontWeight: 400
    }
  }, React.createElement("input", {
    type: "radio",
    name: "np-place",
    style: {
      width: "auto",
      flexShrink: 0,
      margin: 0
    },
    checked: f.placeMode === "other",
    onChange: () => setF({
      ...f,
      placeMode: "other"
    })
  }), React.createElement("span", null, "\u0E2D\u0E37\u0E48\u0E19\u0E46"), React.createElement("input", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 150
    },
    value: f.placeOther,
    onChange: e => setF({
      ...f,
      placeOther: e.target.value
    }),
    placeholder: "\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48"
  }))), React.createElement("div", {
    className: "hint"
  }, "\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E15\u0E34\u0E21\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E49\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 \xB7 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E44\u0E14\u0E49")))), React.createElement("div", {
    style: {
      padding: "14px 22px",
      borderTop: "1px solid var(--line)",
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      background: "#FAFBFC"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => goTo(window.isOpsRole(user) ? "repairs" : "r-dashboard")
  }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
    className: "btn btn-primary",
    onClick: submit
  }, React.createElement("i", {
    className: "fa-solid fa-paper-plane"
  }), " \u0E2A\u0E48\u0E07\u0E04\u0E33\u0E23\u0E49\u0E2D\u0E07\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21"))));
}
function MyRepairs({
  user
}) {
  const [rows, setRows] = React.useState(() => {
    if (user.role === "Engineer") return window.filterByUserProjects(user, window.__DATA.repairs, "project");
    return window.filterByUserProjects(user, window.__DATA.repairs.filter(r => r.reporterId === user.id), "project");
  });
  const [detail, setDetail] = React.useState(null);
  const [editFor, setEditFor] = React.useState(null);
  const needApproval = user.role === "Reporter";
  const {
    mine: myReqs
  } = window.useDeleteRequests(user);
  const pendingEditIds = React.useMemo(() => new Set((myReqs || []).filter(x => x.kind === "edit" && x.status === "pending" && x.action === "updateRepair").map(x => String(x.targetKey))), [myReqs]);
  const pendingDeleteIds = React.useMemo(() => new Set((myReqs || []).filter(x => x.kind !== "edit" && x.status === "pending" && x.action === "deleteRepair").map(x => String(x.targetKey))), [myReqs]);
  const decidedCount = (myReqs || []).filter(x => x.status !== "pending").length;
  React.useEffect(() => {
    const src = user.role === "Engineer" ? window.__DATA.repairs : window.__DATA.repairs.filter(r => r.reporterId === user.id);
    setRows(window.filterByUserProjects(user, src, "project"));
  }, [decidedCount]);
  const saveEdit = async (r, patch) => {
    const changes = window.diffFields(r, patch, window.REPAIR_FIELD_LABELS);
    if (!changes.length) {
      Swal.fire({
        icon: "info",
        title: "ยังไม่ได้แก้ไขอะไร",
        text: "ปรับข้อมูลที่ต้องการก่อนบันทึก"
      });
      return;
    }
    if (needApproval) {
      const sent = await window.requestEditApproval({
        user,
        action: "updateRepair",
        payload: {
          id: r.id,
          patch
        },
        entityLabel: "ใบแจ้งซ่อม",
        targetName: r.running || r.id,
        project: r.project || "",
        targetInfo: [r.machineCode, r.subSite].filter(Boolean).join(" · "),
        changes
      });
      if (sent) setEditFor(null);
      return;
    }
    try {
      await window.api("updateRepair", {
        id: r.id,
        patch,
        by: user.name
      });
      const updated = {
        ...r,
        ...patch,
        timeline: [...(r.timeline || []), {
          status: patch.status || r.status,
          when: new Date(),
          by: user.name,
          note: "แก้ไขข้อมูล"
        }]
      };
      setRows(prev => prev.map(x => x.id === r.id ? updated : x));
      window.__DATA.repairs = window.__DATA.repairs.map(x => x.id === r.id ? updated : x);
      setEditFor(null);
      Swal.fire({
        icon: "success",
        title: "บันทึกการแก้ไขแล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const remove = async r => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteRepair",
      payload: {
        id: r.id
      },
      entityLabel: "ใบแจ้งซ่อม",
      targetName: r.running || r.id,
      project: r.project || "",
      targetInfo: [r.machineCode, (window.getProblems(r)[0] || {}).text].filter(Boolean).join(" · ")
    });
    if (done) {
      setRows(prev => prev.filter(x => x.id !== r.id));
      setDetail(null);
    }
  };
  const openEdit = r => {
    if (pendingEditIds.has(String(r.id))) {
      Swal.fire({
        icon: "info",
        title: "มีคำขอแก้ไขรออนุมัติอยู่แล้ว",
        text: 'ใบนี้ส่งคำขอไปแล้ว รอผู้ดูแลระบบอนุมัติก่อนจึงจะขอแก้ใหม่ได้ · ติดตามได้ที่เมนู "การแจ้งเตือน"'
      });
      return;
    }
    setDetail(null);
    setEditFor(r);
  };
  const cancel = r => {
    Swal.fire({
      title: "ยกเลิกคำร้อง?",
      text: `ต้องการยกเลิกคำร้อง "${r.running}" ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยกเลิกคำร้อง",
      cancelButtonText: "ไม่",
      confirmButtonColor: "#EF4444"
    }).then(async res => {
      if (res.isConfirmed) {
        try {
          await window.api("updateRepairStatus", {
            id: r.id,
            status: "cancel",
            by: user.name,
            note: "ผู้แจ้งยกเลิกคำร้อง"
          });
          const upd = rows.map(x => x.id === r.id ? {
            ...x,
            status: "cancel",
            timeline: [...x.timeline, {
              status: "cancel",
              when: new Date(),
              by: user.name,
              note: "ผู้แจ้งยกเลิกคำร้อง"
            }]
          } : x);
          setRows(upd);
          window.__DATA.repairs = window.__DATA.repairs.map(x => x.id === r.id ? upd.find(y => y.id === x.id) : x);
          Swal.fire({
            icon: "success",
            title: "ยกเลิกแล้ว",
            timer: 1200,
            showConfirmButton: false,
            toast: true,
            position: "top-end"
          });
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "ไม่สำเร็จ",
            text: err.message
          });
        }
      }
    });
  };
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, "\u0E04\u0E33\u0E23\u0E49\u0E2D\u0E07\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19 (", rows.length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07"), React.createElement("th", null, "\u0E2D\u0E32\u0E01\u0E32\u0E23/\u0E1B\u0E31\u0E0D\u0E2B\u0E32"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48"), React.createElement("th", null, "\u0E2A\u0E16\u0E32\u0E19\u0E30"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"), React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, rows.map(r => {
    const last = r.timeline[r.timeline.length - 1];
    const waiting = pendingEditIds.has(String(r.id));
    const waitingDel = pendingDeleteIds.has(String(r.id));
    return React.createElement("tr", {
      key: r.id
    }, React.createElement("td", null, React.createElement("span", {
      className: "ticket-id"
    }, r.running), waiting && React.createElement("div", {
      style: {
        marginTop: 3,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        borderRadius: 999,
        background: "#FEF3C7",
        color: "#B45309",
        fontSize: 10.5,
        fontWeight: 600
      },
      title: "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
    }, React.createElement("i", {
      className: "fa-solid fa-hourglass-half"
    }), " \u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E01\u0E49\u0E44\u0E02"), waitingDel && React.createElement("div", {
      style: {
        marginTop: 3,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        borderRadius: 999,
        background: "#FEE2E2",
        color: "#B91C1C",
        fontSize: 10.5,
        fontWeight: 600
      },
      title: "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
    }, React.createElement("i", {
      className: "fa-solid fa-hourglass-half"
    }), " \u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E25\u0E1A")), React.createElement("td", {
      className: "hide-on-mobile",
      style: {
        color: "var(--muted)",
        whiteSpace: "nowrap"
      }
    }, window.__DATA.fmtDate(r.createdAt)), React.createElement("td", null, React.createElement("div", {
      className: "cell-title"
    }, React.createElement(ProblemLines, {
      title: r.title,
      max: 4
    }))), React.createElement("td", {
      className: "hide-on-mobile"
    }, React.createElement(CategoryChip, {
      categoryId: r.categoryId
    })), React.createElement("td", null, React.createElement(Badge, {
      status: r.status
    })), React.createElement("td", {
      className: "hide-on-mobile",
      style: {
        color: "var(--muted)",
        fontSize: 12,
        whiteSpace: "nowrap"
      }
    }, window.__DATA.fmtDateTime(last.when)), React.createElement("td", null, React.createElement("div", {
      className: "row-actions"
    }, React.createElement("button", {
      className: "ia",
      title: "\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14",
      onClick: () => setDetail(r)
    }, React.createElement("i", {
      className: "fa-solid fa-eye"
    })), React.createElement("button", {
      className: "ia",
      title: needApproval ? "ขอแก้ไข (ต้องรออนุมัติ)" : "แก้ไขข้อมูล",
      style: {
        color: waiting ? "#B45309" : "#1E40AF"
      },
      onClick: () => openEdit(r)
    }, React.createElement("i", {
      className: "fa-solid fa-pen"
    })), r.status === "new" && React.createElement("button", {
      className: "ia",
      style: {
        color: "#D97706"
      },
      onClick: () => cancel(r),
      title: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E04\u0E33\u0E23\u0E49\u0E2D\u0E07"
    }, React.createElement("i", {
      className: "fa-solid fa-ban"
    })), React.createElement("button", {
      className: "ia danger",
      title: needApproval ? "ขอลบใบนี้ (ต้องรออนุมัติ)" : "ลบใบแจ้งซ่อม",
      onClick: () => remove(r)
    }, React.createElement("i", {
      className: "fa-solid fa-trash"
    })))));
  }), rows.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-clipboard"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E33\u0E23\u0E49\u0E2D\u0E07"), React.createElement("div", null, "\u0E04\u0E25\u0E34\u0E01 \"\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E21\u0E48\" \u0E43\u0E19\u0E40\u0E21\u0E19\u0E39\u0E14\u0E49\u0E32\u0E19\u0E0B\u0E49\u0E32\u0E22\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19")))))))), detail && React.createElement(RepairDetail, {
    r: detail,
    user: user,
    onClose: () => setDetail(null),
    onQuick: () => {},
    onEdit: openEdit
  }), editFor && React.createElement(EditRepairModal, {
    r: editFor,
    scope: needApproval ? "reporter" : undefined,
    onClose: () => setEditFor(null),
    onSave: saveEdit
  }));
}
Object.assign(window, {
  ReporterDashboard,
  NewRequest,
  MyRepairs
});

/* ---- block 17 (ต้นฉบับบรรทัด 6678) ---- */
function AssetRegistry({
  user
}) {
  const canEdit = ["Admin", "Officer", "Engineer"].includes(window.effectiveRole(user));
  const [rows, setRows] = React.useState(() => window.__DATA.assetRegistry || null);
  const [err, setErr] = React.useState("");
  const [q, setQ] = React.useState("");
  const [site, setSite] = React.useState("");
  const [subSite, setSubSite] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [groupBy, setGroupBy] = React.useState("site");
  const [collapsed, setCollapsed] = React.useState({});
  const [edit, setEdit] = React.useState(null);
  const [history, setHistory] = React.useState(null);
  const {
    mine: myReqs
  } = window.useDeleteRequests(user);
  const pendingEditKeys = React.useMemo(() => new Set((myReqs || []).filter(x => x.kind === "edit" && x.status === "pending" && x.action === "saveAssetRegistry").map(x => String(x.targetKey))), [myReqs]);
  const decidedCount = (myReqs || []).filter(x => x.status !== "pending").length;
  React.useEffect(() => {
    if (Array.isArray(window.__DATA.assetRegistry)) setRows(window.__DATA.assetRegistry.slice());
  }, [decidedCount]);
  React.useEffect(() => {
    if (rows) return;
    let alive = true;
    window.api("loadAssetRegistry").then(list => {
      if (!alive) return;
      const sorted = list.slice().sort((a, b) => String(a.assetCode || a.id || "").localeCompare(String(b.assetCode || b.id || ""), "th"));
      window.__DATA.assetRegistry = sorted;
      setRows(sorted);
    }).catch(e => {
      if (alive) setErr(e.message || String(e));
    });
    return () => {
      alive = false;
    };
  }, [rows]);
  const scoped = React.useMemo(() => window.filterByUserProjects(user, rows || [], "site"), [rows, user]);
  const sites = React.useMemo(() => [...new Set(scoped.map(r => r.site).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "th")), [scoped]);
  const owners = React.useMemo(() => [...new Set(scoped.map(r => r.ownership).filter(Boolean))].sort(), [scoped]);
  const subSites = React.useMemo(() => {
    const pool = site ? scoped.filter(r => r.site === site) : scoped;
    return [...new Set(pool.map(r => r.subSite).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "th", {
      numeric: true
    }));
  }, [scoped, site]);
  const filtered = React.useMemo(() => {
    const kw = q.trim().toLowerCase();
    return scoped.filter(r => {
      if (site && r.site !== site) return false;
      if (subSite && (r.subSite || "") !== subSite) return false;
      if (owner && r.ownership !== owner) return false;
      if (!kw) return true;
      return [r.assetCode, r.name, r.brand, r.model, r.serial, r.site, r.subSite, r.holder, r.note].some(v => String(v || "").toLowerCase().includes(kw));
    });
  }, [scoped, q, site, subSite, owner]);
  const totalQty = React.useMemo(() => filtered.reduce((s, r) => s + (Number(r.quantity) || 0), 0), [filtered]);
  const GROUP_META = {
    site: {
      label: "สถานที่ (โครงการ)",
      empty: "— ไม่ระบุสถานที่ —",
      field: r => r.site
    },
    subSite: {
      label: "ไซต์งานย่อย",
      empty: "— ไม่ระบุไซต์งานย่อย —",
      field: r => r.subSite
    },
    ownership: {
      label: "กรรมสิทธิ์",
      empty: "— ไม่ระบุกรรมสิทธิ์ —",
      field: r => r.ownership
    },
    name: {
      label: "ชื่อทรัพย์สิน",
      empty: "— ไม่ระบุชื่อ —",
      field: r => r.name
    }
  };
  const groups = React.useMemo(() => {
    if (groupBy === "none") return null;
    const meta = GROUP_META[groupBy];
    const map = new Map();
    filtered.forEach(r => {
      const raw = String(meta.field(r) || "").trim();
      const gkey = raw || meta.empty;
      if (!map.has(gkey)) map.set(gkey, {
        key: gkey,
        label: gkey,
        rows: [],
        qty: 0
      });
      const g = map.get(gkey);
      g.rows.push(r);
      g.qty += Number(r.quantity) || 0;
    });
    return [...map.values()].sort((a, b) => String(a.label).localeCompare(String(b.label), "th"));
  }, [filtered, groupBy]);
  const toggleGroup = k => setCollapsed(prev => ({
    ...prev,
    [k]: !prev[k]
  }));
  const colCount = canEdit ? 9 : 8;
  const renderRow = r => React.createElement("tr", {
    key: r.key
  }, React.createElement("td", null, React.createElement("span", {
    className: "ticket-id"
  }, r.assetCode || r.id || "—"), pendingEditKeys.has(String(r.key)) && React.createElement("div", {
    style: {
      marginTop: 3,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "1px 7px",
      borderRadius: 999,
      background: "#FEF3C7",
      color: "#B45309",
      fontSize: 10.5,
      fontWeight: 600
    },
    title: "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
  }, React.createElement("i", {
    className: "fa-solid fa-hourglass-half"
  }), " \u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E01\u0E49\u0E44\u0E02")), React.createElement("td", null, React.createElement("div", {
    className: "cell-title"
  }, r.name || "—", r.serial && React.createElement("div", {
    className: "desc"
  }, React.createElement("span", {
    className: "mono"
  }, "S/N ", r.serial)))), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, [r.brand, r.model].filter(Boolean).join(" ") || "—"), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, r.size || "—"), React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, (Number(r.quantity) || 0).toLocaleString("th-TH"), " ", r.unit || ""), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, r.ownership || "—"), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, r.holder || "—"), React.createElement("td", {
    style: {
      fontSize: 13
    }
  }, r.site ? React.createElement(ProjectLabel, {
    name: r.site
  }) : React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u2014"), r.subSite && React.createElement("div", {
    style: {
      marginTop: 3
    }
  }, React.createElement(SubSiteTag, {
    value: r.subSite,
    project: r.site
  })), (r.transferHistory || []).length > 0 && React.createElement("button", {
    className: "ia",
    title: "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22",
    onClick: () => setHistory(r),
    style: {
      color: "#7C3AED",
      marginLeft: 4
    }
  }, React.createElement("i", {
    className: "fa-solid fa-clock-rotate-left"
  }))), canEdit && React.createElement("td", null, React.createElement("div", {
    className: "row-actions"
  }, React.createElement("button", {
    className: "ia",
    title: "\u0E41\u0E01\u0E49\u0E44\u0E02",
    onClick: () => setEdit({
      mode: "edit",
      data: {
        ...r
      }
    })
  }, React.createElement("i", {
    className: "fa-solid fa-pen"
  })), React.createElement("button", {
    className: "ia danger",
    title: "\u0E25\u0E1A",
    onClick: () => remove(r)
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  })))));
  const sortRows = list => list.slice().sort((a, b) => String(a.assetCode || a.id || "").localeCompare(String(b.assetCode || b.id || ""), "th"));
  const commit = list => {
    const sorted = sortRows(list);
    window.__DATA.assetRegistry = sorted;
    setRows(sorted);
  };
  const save = async form => {
    if (form.key && user.role !== "Admin") {
      const before = (rows || []).find(x => x.key === form.key) || {};
      const changes = window.diffFields(before, form, window.ASSET_FIELD_LABELS);
      const sent = await window.requestEditApproval({
        user,
        action: "saveAssetRegistry",
        payload: {
          key: form.key,
          asset: form
        },
        entityLabel: "ทะเบียนทรัพย์สิน",
        targetName: `${form.assetCode || form.id || ""} ${form.name || ""}`.trim(),
        project: form.site || "",
        targetInfo: [form.brand, form.model, form.serial, form.holder].filter(Boolean).join(" · "),
        changes
      });
      if (sent) setEdit(null);
      return;
    }
    const saved = await window.api("saveAssetRegistry", {
      key: form.key || "",
      asset: form
    });
    const base = rows || [];
    commit(base.some(x => x.key === saved.key) ? base.map(x => x.key === saved.key ? saved : x) : base.concat([saved]));
    setEdit(null);
    Swal.fire({
      icon: "success",
      title: form.key ? "บันทึกการแก้ไขแล้ว" : "เพิ่มทรัพย์สินแล้ว",
      timer: 1400,
      showConfirmButton: false,
      toast: true,
      position: "top-end"
    });
  };
  const remove = async r => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteAssetRegistry",
      payload: {
        key: r.key
      },
      entityLabel: "ทะเบียนทรัพย์สิน",
      targetName: `${r.assetCode || r.id || ""} ${r.name || ""}`.trim(),
      project: r.site || "",
      targetInfo: [r.brand, r.model, r.serial, r.holder].filter(Boolean).join(" · ")
    });
    if (done) commit((rows || []).filter(x => x.key !== r.key));
  };
  const blank = {
    assetCode: "",
    name: "",
    brand: "",
    model: "",
    serial: "",
    size: "",
    quantity: 1,
    unit: "",
    ownership: "",
    holder: "",
    site: "",
    subSite: "",
    receivedAt: "",
    note: ""
  };
  if (err) return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-body"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      color: "#EF4444"
    }
  }), React.createElement("div", {
    className: "t"
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"), React.createElement("div", null, err), React.createElement("button", {
    className: "btn btn-primary btn-sm",
    style: {
      marginTop: 12
    },
    onClick: () => {
      setErr("");
      setRows(null);
    }
  }, React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48"))));
  if (!rows) return React.createElement(Loading, {
    show: true,
    text: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19..."
  });
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E23\u0E2B\u0E31\u0E2A / \u0E0A\u0E37\u0E48\u0E2D / \u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D / \u0E23\u0E38\u0E48\u0E19 / Serial / \u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("select", {
    value: site,
    onChange: e => {
      setSite(e.target.value);
      setSubSite("");
    }
  }, React.createElement("option", {
    value: ""
  }, "\u0E17\u0E38\u0E01\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48"), sites.map(s => React.createElement("option", {
    key: s,
    value: s
  }, s))), subSites.length > 0 && React.createElement("select", {
    value: subSite,
    onChange: e => setSubSite(e.target.value),
    title: "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"
  }, React.createElement("option", {
    value: ""
  }, "\u0E17\u0E38\u0E01\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"), subSites.map(s => React.createElement("option", {
    key: s,
    value: s
  }, s))), React.createElement("select", {
    value: owner,
    onChange: e => setOwner(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u0E17\u0E38\u0E01\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"), owners.map(o => React.createElement("option", {
    key: o,
    value: o
  }, o))), React.createElement("select", {
    value: groupBy,
    onChange: e => setGroupBy(e.target.value),
    title: "\u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19"
  }, React.createElement("option", {
    value: "none"
  }, "\u0E44\u0E21\u0E48\u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21"), React.createElement("option", {
    value: "site"
  }, "\u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48"), React.createElement("option", {
    value: "subSite"
  }, "\u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E32\u0E21\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22"), React.createElement("option", {
    value: "ownership"
  }, "\u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E32\u0E21\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"), React.createElement("option", {
    value: "name"
  }, "\u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E32\u0E21\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19")), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, filtered.length.toLocaleString("th-TH"), " / ", scoped.length.toLocaleString("th-TH"), " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \xB7 \u0E23\u0E27\u0E21 ", totalQty.toLocaleString("th-TH"), " \u0E2B\u0E19\u0E48\u0E27\u0E22"), React.createElement("button", {
    className: "btn btn-ghost",
    title: "\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E08\u0E32\u0E01\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (\u0E40\u0E0A\u0E48\u0E19 \u0E2B\u0E25\u0E31\u0E07\u0E2D\u0E2D\u0E01/\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07)",
    onClick: () => {
      window.__DATA.assetRegistry = null;
      setRows(null);
    }
  }, React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " \u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A"), canEdit && React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setEdit({
      mode: "add",
      data: {
        ...blank
      }
    })
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19"), React.createElement("th", null, "\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D / \u0E23\u0E38\u0E48\u0E19"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E02\u0E19\u0E32\u0E14"), React.createElement("th", null, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E1C\u0E39\u0E49\u0E16\u0E37\u0E2D\u0E04\u0E23\u0E2D\u0E07"), React.createElement("th", null, "\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48 (\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23)"), canEdit && React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, !groups && filtered.map(r => renderRow(r)), groups && groups.map(g => {
    const isCollapsed = !!collapsed[g.key];
    return React.createElement(React.Fragment, {
      key: g.key
    }, React.createElement("tr", {
      className: "group-row",
      onClick: () => toggleGroup(g.key),
      style: {
        cursor: "pointer",
        background: "var(--bg)"
      }
    }, React.createElement("td", {
      colSpan: colCount,
      style: {
        fontWeight: 600,
        fontSize: 13.5,
        padding: "9px 14px",
        borderTop: "2px solid var(--line)"
      }
    }, React.createElement("span", {
      className: "group-label"
    }, React.createElement("i", {
      className: `fa-solid ${isCollapsed ? "fa-chevron-right" : "fa-chevron-down"}`,
      style: {
        marginRight: 8,
        color: "var(--muted)",
        fontSize: 11
      }
    }), groupBy === "site" ? React.createElement(ProjectLabel, {
      name: g.label
    }) : g.label, React.createElement("span", {
      style: {
        marginLeft: 10,
        fontWeight: 400,
        color: "var(--muted)",
        fontSize: 12.5
      }
    }, g.rows.length.toLocaleString("th-TH"), " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \xB7 \u0E23\u0E27\u0E21 ", g.qty.toLocaleString("th-TH"), " \u0E2B\u0E19\u0E48\u0E27\u0E22")))), !isCollapsed && g.rows.map(r => renderRow(r)));
  }), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: colCount
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-boxes-stacked"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), React.createElement("div", null, rows.length === 0 ? "ยังไม่มีทรัพย์สินในทะเบียน" : "ลองเปลี่ยนเงื่อนไขการค้นหา")))))))), edit && React.createElement(AssetForm, {
    mode: edit.mode,
    initial: edit.data,
    sites: sites,
    owners: owners,
    user: user,
    onClose: () => setEdit(null),
    onSave: save
  }), history && React.createElement(AssetHistoryModal, {
    asset: history,
    onClose: () => setHistory(null)
  }));
}
function AssetHistoryModal({
  asset,
  onClose
}) {
  const list = (asset.transferHistory || []).slice().reverse();
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "sm",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-clock-rotate-left",
      style: {
        color: "#7C3AED",
        marginRight: 8
      }
    }), "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"),
    footer: React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E1B\u0E34\u0E14")
  }, React.createElement("div", {
    style: {
      marginBottom: 12,
      fontSize: 13,
      color: "var(--muted)"
    }
  }, React.createElement("span", {
    className: "ticket-id"
  }, asset.assetCode || asset.id), " ", asset.name), React.createElement("div", {
    style: {
      display: "grid",
      gap: 8
    }
  }, list.map((t, i) => React.createElement("div", {
    key: i,
    style: {
      border: "1px solid var(--line)",
      borderRadius: 8,
      padding: "10px 12px"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, t.from || "— ไม่ระบุ —", t.fromSubSite ? ` · ${t.fromSubSite}` : "", " ", React.createElement("i", {
    className: "fa-solid fa-arrow-right",
    style: {
      color: "#7C3AED",
      margin: "0 6px"
    }
  }), " ", t.to, t.toSubSite ? ` · ${t.toSubSite}` : ""), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 4
    }
  }, window.__DATA.fmtDateTime(t.when), " \xB7 \u0E42\u0E14\u0E22 ", t.by || "—", t.docNo && React.createElement(React.Fragment, null, " \xB7 \u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 ", React.createElement("span", {
    className: "mono"
  }, t.docNo))), t.note && React.createElement("div", {
    style: {
      fontSize: 12,
      marginTop: 4
    }
  }, t.note))), list.length === 0 && React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22")));
}
function TransferAssetsModal({
  user,
  onClose,
  onSaved
}) {
  const projects = React.useMemo(() => window.visibleProjects(user), [user]);
  const [assets, setAssets] = React.useState(() => window.__DATA.assetRegistry || null);
  const [loadErr, setLoadErr] = React.useState("");
  const [toProject, setToProject] = React.useState("");
  const [docNo, setDocNo] = React.useState("");
  const [docDate, setDocDate] = React.useState(() => window.__DATA.fmtDate(new Date()));
  const [sender, setSender] = React.useState(user.name || "");
  const [receiver, setReceiver] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [fromProject, setFromProject] = React.useState("");
  const [fromSubSite, setFromSubSite] = React.useState("");
  const [toSubSite, setToSubSite] = React.useState("");
  const [qty, setQty] = React.useState({});
  React.useEffect(() => {
    if (assets) return;
    let alive = true;
    window.api("loadAssetRegistry").then(list => {
      if (!alive) return;
      window.__DATA.assetRegistry = list;
      setAssets(list);
    }).catch(e => {
      if (alive) setLoadErr(e.message || String(e));
    });
    return () => {
      alive = false;
    };
  }, [assets]);
  React.useEffect(() => {
    if (!toProject) {
      setDocNo("");
      return;
    }
    let alive = true;
    window.api("loadDeliveryOrders").then(list => {
      if (!alive) return;
      const code = String(window.getProjectCode(toProject) || toProject).trim().replace(/\s+/g, "-").toUpperCase();
      const d = new Date();
      const prefix = "DO-" + code + "-" + String(d.getFullYear() + 543) + String(d.getMonth() + 1).padStart(2, "0") + "/";
      let max = 0;
      list.forEach(x => {
        const t = String(x.docNo || "");
        if (t.slice(0, prefix.length) === prefix) {
          const n = parseInt(t.slice(prefix.length), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });
      setDocNo(prefix + String(max + 1).padStart(3, "0"));
    }).catch(() => setDocNo(""));
    return () => {
      alive = false;
    };
  }, [toProject]);
  const sites = React.useMemo(() => [...new Set((assets || []).map(a => a.site).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "th")), [assets]);
  const fromOptions = React.useMemo(() => {
    const counts = {};
    (assets || []).forEach(a => {
      if (a.site) counts[a.site] = (counts[a.site] || 0) + 1;
    });
    const named = projects.map(p => ({
      value: p.name,
      label: (p.code ? `[${p.code}] ` : "") + p.name,
      n: counts[p.name] || 0
    }));
    const legacy = sites.filter(s => !projects.some(p => p.name === s)).map(s => ({
      value: s,
      label: s + " (ข้อมูลเดิม)",
      n: counts[s] || 0
    }));
    return named.concat(legacy);
  }, [projects, sites, assets]);
  const changeFrom = v => {
    setFromProject(v);
    setFromSubSite("");
    setQty({});
  };
  const changeFromSubSite = v => {
    setFromSubSite(v);
    setQty({});
  };
  const candidates = React.useMemo(() => {
    if (!fromProject) return [];
    const kw = q.trim().toLowerCase();
    return (assets || []).filter(a => {
      if (a.site !== fromProject) return false;
      if (fromSubSite && (a.subSite || "") !== fromSubSite) return false;
      if (!kw) return true;
      return [a.assetCode, a.name, a.brand, a.model, a.serial, a.site, a.subSite].some(v => String(v || "").toLowerCase().includes(kw));
    });
  }, [assets, q, fromProject, fromSubSite]);
  const picked = React.useMemo(() => (assets || []).filter(a => qty[a.key] !== undefined), [assets, qty]);
  const totalMoving = picked.reduce((s, a) => s + (Number(qty[a.key]) || 0), 0);
  const toggle = a => setQty(prev => {
    const n = {
      ...prev
    };
    if (n[a.key] !== undefined) delete n[a.key];else n[a.key] = Number(a.quantity) || 0;
    return n;
  });
  const setQtyFor = (a, v) => {
    const max = Number(a.quantity) || 0;
    setQty(prev => ({
      ...prev,
      [a.key]: v === "" ? "" : Math.min(Math.max(Number(v) || 0, 0), max)
    }));
  };
  const allShown = candidates.length > 0 && candidates.every(a => qty[a.key] !== undefined);
  const pickAllShown = () => setQty(prev => {
    const n = {
      ...prev
    };
    candidates.forEach(a => {
      if (allShown) delete n[a.key];else n[a.key] = Number(a.quantity) || 0;
    });
    return n;
  });
  const submit = async () => {
    if (!fromProject) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกโครงการต้นทาง"
      });
      return;
    }
    if (!toProject) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกโครงการปลายทาง"
      });
      return;
    }
    if (fromProject === toProject) {
      Swal.fire({
        icon: "warning",
        title: "ต้นทางกับปลายทางซ้ำกัน",
        text: "กรุณาเลือกโครงการปลายทางที่ต่างจากต้นทาง"
      });
      return;
    }
    if (!docNo) {
      Swal.fire({
        icon: "warning",
        title: "ยังออกเลขที่ใบส่งของไม่สำเร็จ",
        text: "กรุณารอสักครู่แล้วลองใหม่"
      });
      return;
    }
    const moves = picked.map(a => ({
      key: a.key,
      qty: Number(qty[a.key]) || 0
    })).filter(x => x.qty > 0);
    if (!moves.length) {
      Swal.fire({
        icon: "warning",
        title: "ยังไม่ได้เลือกทรัพย์สิน",
        text: "เลือกรายการและระบุจำนวนที่จะย้ายอย่างน้อย 1 รายการ"
      });
      return;
    }
    setBusy(true);
    try {
      const res = await window.api("transferAssets", {
        moves,
        toProject,
        toSubSite,
        note,
        by: user.name,
        doc: {
          docNo,
          docDate,
          sender,
          receiver,
          fromProject,
          fromSubSite,
          toSubSite,
          fromProjectLabel: fromProject + (fromSubSite ? ` · ${fromSubSite}` : "")
        }
      });
      window.__DATA.assetRegistry = null;
      window.__DATA.deliveryOrders = null;
      onSaved && onSaved(res);
      const {
        isConfirmed
      } = await Swal.fire({
        icon: "success",
        title: "ย้ายโครงการสำเร็จ",
        html: "ย้าย <b>" + res.items.length + "</b> รายการ จาก <b>" + fromProject + (fromSubSite ? " · " + fromSubSite : "") + "</b> ไปยัง <b>" + toProject + (toSubSite ? " · " + toSubSite : "") + "</b><br/>ออกใบส่งของเลขที่ <b class='mono'>" + docNo + "</b>",
        showCancelButton: true,
        confirmButtonText: "<i class='fa-solid fa-file-pdf'></i> ดาวน์โหลดใบส่งของ",
        cancelButtonText: "ปิด",
        confirmButtonColor: "#1E40AF"
      });
      if (isConfirmed) window.downloadDeliveryOrderPdf(res.doc);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ย้ายไม่สำเร็จ",
        text: err.message
      });
    } finally {
      setBusy(false);
    }
  };
  const inSt = {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontFamily: "Kanit",
    fontSize: 13.5,
    background: "#fff"
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-right-left",
      style: {
        color: "#7C3AED",
        marginRight: 8
      }
    }), "\u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 / \u0E2D\u0E2D\u0E01\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07"),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose,
      disabled: busy
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit,
      disabled: busy
    }, busy ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "spinner",
      style: {
        width: 14,
        height: 14,
        borderWidth: 2
      }
    }), " \u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01...") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-check"
    }), " \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22 + \u0E2D\u0E2D\u0E01\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07")))
  }, React.createElement("div", {
    style: {
      display: "grid",
      gap: 14
    }
  }, React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, "\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07 \u2014 \u0E08\u0E32\u0E01\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07 \u0E44\u0E1B\u0E22\u0E31\u0E07\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07 *"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, React.createElement("select", {
    style: {
      ...inSt,
      flex: "1 1 200px",
      minWidth: 0
    },
    value: fromProject,
    onChange: e => changeFrom(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07 \u2014"), fromOptions.map(o => React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label, o.n ? ` · ${o.n} รายการ` : " · ไม่มีทรัพย์สิน"))), React.createElement("i", {
    className: "fa-solid fa-arrow-right",
    style: {
      color: "#7C3AED",
      flex: "0 0 auto"
    }
  }), React.createElement("select", {
    style: {
      ...inSt,
      flex: "1 1 200px",
      minWidth: 0
    },
    value: toProject,
    onChange: e => {
      setToProject(e.target.value);
      setToSubSite("");
    }
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07 \u2014"), projects.filter(p => p.name !== fromProject).map(p => React.createElement("option", {
    key: p.id,
    value: p.name
  }, p.code ? `[${p.code}] ` : "", p.name)))), (window.projectSites(fromProject).length > 0 || window.projectSites(toProject).length > 0) && React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 8
    }
  }, React.createElement("select", {
    style: {
      ...inSt,
      flex: "1 1 200px",
      minWidth: 0
    },
    value: fromSubSite,
    onChange: e => changeFromSubSite(e.target.value),
    disabled: !window.projectSites(fromProject).length
  }, React.createElement("option", {
    value: ""
  }, window.projectSites(fromProject).length ? "— ทุกไซต์งานย่อยของต้นทาง —" : "— ต้นทางไม่มีไซต์งานย่อย —"), window.projectSites(fromProject).map(s => React.createElement("option", {
    key: s,
    value: s
  }, s))), React.createElement("i", {
    className: "fa-solid fa-sitemap",
    style: {
      color: "#7C3AED",
      flex: "0 0 auto",
      fontSize: 12
    }
  }), React.createElement("select", {
    style: {
      ...inSt,
      flex: "1 1 200px",
      minWidth: 0
    },
    value: toSubSite,
    onChange: e => setToSubSite(e.target.value),
    disabled: !window.projectSites(toProject).length
  }, React.createElement("option", {
    value: ""
  }, window.projectSites(toProject).length ? "— ทั้งโครงการ (ไม่ระบุไซต์) —" : "— ปลายทางไม่มีไซต์งานย่อย —"), window.projectSites(toProject).map(s => React.createElement("option", {
    key: s,
    value: s
  }, s)))), React.createElement("div", {
    className: "hint"
  }, "\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07\u0E43\u0E0A\u0E49\u0E40\u0E1B\u0E47\u0E19 \"\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\" \u0E1A\u0E19\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07\u0E01\u0E48\u0E2D\u0E19 \u0E41\u0E25\u0E49\u0E27\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E14\u0E49\u0E32\u0E19\u0E25\u0E48\u0E32\u0E07\u0E08\u0E30\u0E41\u0E2A\u0E14\u0E07\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E02\u0E2D\u0E07\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E44\u0E0B\u0E15\u0E4C\u0E19\u0E31\u0E49\u0E19 \xB7 \u0E44\u0E0B\u0E15\u0E4C\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07\u0E08\u0E30\u0E16\u0E39\u0E01\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E43\u0E2B\u0E49\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E17\u0E38\u0E01\u0E0A\u0E34\u0E49\u0E19\u0E17\u0E35\u0E48\u0E22\u0E49\u0E32\u0E22")), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07"), React.createElement("input", {
    value: docNo,
    onChange: e => setDocNo(e.target.value),
    placeholder: toProject ? "กำลังออกเลขที่..." : "เลือกโครงการปลายทางก่อน"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("input", {
    type: "date",
    value: docDate,
    onChange: e => setDocDate(e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A"), React.createElement("input", {
    value: sender,
    onChange: e => setSender(e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A"), React.createElement("input", {
    value: receiver,
    onChange: e => setReceiver(e.target.value)
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25 / \u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
    rows: "2",
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E22\u0E49\u0E32\u0E22\u0E15\u0E32\u0E21\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19, \u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07..."
  }))), React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    className: "search-input",
    style: {
      flex: 1,
      minWidth: 180
    }
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E23\u0E2B\u0E31\u0E2A / \u0E0A\u0E37\u0E48\u0E2D / \u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D / Serial...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--muted)",
      whiteSpace: "nowrap"
    }
  }, "\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07: ", React.createElement("b", {
    style: {
      color: fromProject ? "var(--text)" : "#B45309"
    }
  }, fromProject || "ยังไม่ได้เลือก", fromSubSite ? ` · ${fromSubSite}` : ""))), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginBottom: 6,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8
    }
  }, React.createElement("span", null, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E17\u0E35\u0E48\u0E08\u0E30\u0E22\u0E49\u0E32\u0E22 \xB7 \u0E23\u0E30\u0E1A\u0E38\u0E08\u0E33\u0E19\u0E27\u0E19\u0E44\u0E14\u0E49 \u0E22\u0E49\u0E32\u0E22\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E01\u0E47\u0E44\u0E14\u0E49"), React.createElement("span", null, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27 ", React.createElement("b", {
    style: {
      color: "var(--primary)"
    }
  }, picked.length), " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \xB7 \u0E23\u0E27\u0E21 ", React.createElement("b", {
    style: {
      color: "var(--primary)"
    }
  }, totalMoving.toLocaleString("th-TH")), " \u0E2B\u0E19\u0E48\u0E27\u0E22")), loadErr && React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#B91C1C",
      marginBottom: 8
    }
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ", loadErr), !assets ? React.createElement("div", {
    style: {
      padding: 20,
      textAlign: "center",
      color: "var(--muted)",
      fontSize: 13
    }
  }, "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19...") : React.createElement("div", {
    style: {
      maxHeight: 260,
      overflow: "auto",
      border: "1px solid var(--line)",
      borderRadius: 8
    }
  }, React.createElement("table", {
    className: "data",
    style: {
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    style: {
      width: 36
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: allShown,
    onChange: pickAllShown,
    title: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E17\u0E35\u0E48\u0E41\u0E2A\u0E14\u0E07"
  })), React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A"), React.createElement("th", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      width: 60
    }
  }, "\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48"), React.createElement("th", {
    style: {
      width: 110
    }
  }, "\u0E22\u0E49\u0E32\u0E22\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", null, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19"))), React.createElement("tbody", null, candidates.map(a => {
    const max = Number(a.quantity) || 0;
    const on = qty[a.key] !== undefined;
    const v = qty[a.key];
    const partial = on && Number(v) > 0 && Number(v) < max;
    return React.createElement("tr", {
      key: a.key,
      style: on ? {
        background: "var(--accent-soft)"
      } : null
    }, React.createElement("td", null, React.createElement("input", {
      type: "checkbox",
      checked: on,
      onChange: () => toggle(a)
    })), React.createElement("td", null, a.assetCode ? React.createElement("span", {
      className: "ticket-id"
    }, a.assetCode) : React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A")), React.createElement("td", null, a.name || "—"), React.createElement("td", {
      style: {
        whiteSpace: "nowrap"
      }
    }, max.toLocaleString("th-TH"), " ", a.unit || ""), React.createElement("td", null, on ? React.createElement(React.Fragment, null, React.createElement("input", {
      type: "number",
      min: "0",
      max: max,
      value: v,
      onChange: e => setQtyFor(a, e.target.value),
      style: {
        width: "100%",
        padding: "5px 8px",
        border: "1px solid var(--line)",
        borderRadius: 6,
        fontFamily: "Kanit",
        fontSize: 13
      }
    }), partial && React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#B45309",
        marginTop: 2
      }
    }, "\u0E41\u0E1A\u0E48\u0E07\u0E22\u0E49\u0E32\u0E22 \xB7 \u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07 ", (max - Number(v)).toLocaleString("th-TH"))) : React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, "\u2014")), React.createElement("td", {
      style: {
        color: "var(--muted)"
      }
    }, a.site || "—", a.subSite ? ` · ${a.subSite}` : ""));
  }), candidates.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "6"
  }, React.createElement("div", {
    className: "empty",
    style: {
      padding: "18px 10px"
    }
  }, React.createElement("div", {
    className: "t"
  }, fromProject ? fromSubSite ? `ไม่พบทรัพย์สินในไซต์ ${fromSubSite}` : "ไม่พบทรัพย์สินในโครงการต้นทาง" : "ยังไม่ได้เลือกโครงการต้นทาง"), React.createElement("div", null, fromProject ? "ลองเปลี่ยนคำค้น เลือกไซต์งานย่อยอื่น หรือเลือกโครงการต้นทางอื่น" : "เลือกโครงการต้นทางด้านบนก่อน แล้วรายการทรัพย์สินจะแสดงที่นี่"))))))))));
}
function AssetForm({
  mode,
  initial,
  sites,
  owners,
  user,
  onClose,
  onSave
}) {
  const [f, setF] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const projects = React.useMemo(() => window.visibleProjects(user), [user]);
  const up = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const submit = async e => {
    e?.preventDefault();
    if (!String(f.assetCode || "").trim() || !String(f.name || "").trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณากรอก รหัสทรัพย์สิน และ ชื่อทรัพย์สิน"
      });
      return;
    }
    setBusy(true);
    try {
      await onSave(f);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: err.message
      });
    } finally {
      setBusy(false);
    }
  };
  const txt = (k, label, ph) => React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, label), React.createElement("input", {
    value: f[k] || "",
    onChange: e => up(k, e.target.value),
    placeholder: ph || ""
  }));
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: `fa-solid ${mode === "edit" ? "fa-pen-to-square" : "fa-plus"}`,
      style: {
        marginRight: 8,
        color: "var(--primary)"
      }
    }), mode === "edit" ? "แก้ไขทรัพย์สิน" : "เพิ่มทรัพย์สินใหม่"),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose,
      disabled: busy
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit,
      disabled: busy
    }, busy ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "spinner",
      style: {
        width: 14,
        height: 14,
        borderWidth: 2
      }
    }), " \u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01...") : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01")))
  }, React.createElement("form", {
    onSubmit: submit
  }, React.createElement("div", {
    className: "form-grid"
  }, txt("assetCode", "รหัสทรัพย์สิน *", "เช่น ASSET-0123"), txt("name", "ชื่อทรัพย์สิน *", "เช่น ถังไซโล"), txt("brand", "ยี่ห้อ"), txt("model", "รุ่น"), txt("serial", "Serial No."), txt("size", "ขนาด"), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("input", {
    type: "number",
    min: "0",
    value: f.quantity ?? "",
    onChange: e => up("quantity", e.target.value)
  })), txt("unit", "หน่วย", "เช่น ถัง / ชุด / ตัว"), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"), React.createElement("input", {
    list: "asset-owners",
    value: f.ownership || "",
    onChange: e => up("ownership", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 PNM / TFB"
  }), React.createElement("datalist", {
    id: "asset-owners"
  }, (owners || []).map(o => React.createElement("option", {
    key: o,
    value: o
  })))), txt("holder", "ผู้ถือครอง"), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48 (\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23)"), React.createElement("select", {
    value: f.site || "",
    onChange: e => setF(p => ({
      ...p,
      site: e.target.value,
      subSite: ""
    }))
  }, React.createElement("option", {
    value: ""
  }, "\u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u2014"), projects.map(p => React.createElement("option", {
    key: p.id,
    value: p.name
  }, p.code ? `[${p.code}] ` : "", p.name)), f.site && !projects.some(p => p.name === f.site) && React.createElement("option", {
    value: f.site
  }, f.site, " (\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E14\u0E34\u0E21)"))), React.createElement(SubSiteField, {
    project: f.site,
    value: f.subSite,
    onChange: v => up("subSite", v),
    showWhenEmpty: true,
    hint: "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22\u0E17\u0E35\u0E48\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48 \xB7 \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E43\u0E2B\u0E21\u0E48"
  }), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E23\u0E31\u0E1A\u0E40\u0E02\u0E49\u0E32"), React.createElement("input", {
    type: "date",
    value: String(f.receivedAt || "").slice(0, 10),
    onChange: e => up("receivedAt", e.target.value)
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
    rows: "2",
    value: f.note || "",
    onChange: e => up("note", e.target.value)
  })))));
}
const DO_LOGO_SVG = `<svg width="31mm" height="36mm" viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg"><path d="M107 24A70 70 0 1 0 77 158" fill="none" stroke="#155E95" stroke-width="18"/><path d="M127 47a70 70 0 0 1 0 86" fill="none" stroke="#F28A23" stroke-width="18"/><path d="M42 130c25-53 61-67 107-63-25 16-40 34-47 59 17-8 32-19 46-36-12 50-50 74-104 78 15-12 26-25 35-41-13 2-25 3-37 3z" fill="#155E95"/><path d="M57 147c20-24 45-39 78-48-12 22-18 43-17 69-19-18-37-24-61-21z" fill="#7BC043"/><path d="M83 83l72-7-47 52 2-29-49 40z" fill="#fff"/><text x="90" y="188" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="14" font-weight="700" fill="#155E95">บริษัท พานามณี จำกัด</text><text x="90" y="204" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-size="12" fill="#155E95">Panamanee Co., Ltd</text></svg>`;
window.buildDeliveryOrderHtml = function (doc) {
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = v => {
    const d = new Date(v);
    return v && !isNaN(d) ? d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : v || "";
  };
  const items = (doc.items || []).map((x, i) => ({
    ...x,
    no: i + 1
  }));
  const rows = items.slice();
  while (rows.length < 18) rows.push({
    no: rows.length + 1
  });
  const trs = rows.map(it => `<tr>
    <td>${it.no}</td>
    <td style="text-align:left;padding-left:6px">${esc(it.assetCode || "")}</td>
    <td style="text-align:left;padding-left:6px">${esc(it.name || "")}</td>
    <td style="text-align:left;padding-left:6px">${esc([it.brand, it.model].filter(Boolean).join(" "))}</td>
    <td style="text-align:left;padding-left:6px">${esc(it.serial || "")}</td>
    <td>${it.quantity != null ? esc(it.quantity) : ""}</td>
    <td>${esc(it.unit || "")}</td>
    <td style="text-align:left;padding-left:6px">${esc((it.from || "") + (it.fromSubSite ? " · " + it.fromSubSite : ""))}</td>
  </tr>`).join("");
  const totalQty = items.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const cancelStamp = doc.cancelled ? `
    <div style="position:absolute;top:95mm;left:50%;transform:translateX(-50%) rotate(-22deg);border:6px solid #DC2626;color:#DC2626;padding:6mm 18mm;font-size:52px;font-weight:700;letter-spacing:6px;border-radius:6mm;opacity:.32;white-space:nowrap;pointer-events:none">ยกเลิก</div>
    <div style="position:absolute;top:8mm;right:10mm;border:2px solid #DC2626;color:#DC2626;padding:2mm 5mm;font-size:15px;border-radius:2mm;text-align:right;line-height:1.4">
      <div style="font-weight:700">เอกสารถูกยกเลิก</div>
      <div style="font-size:12px">${fmt(doc.cancelledAt)}${doc.cancelledBy ? " · " + esc(doc.cancelledBy) : ""}</div>
      ${doc.cancelReason ? `<div style="font-size:12px">เหตุผล: ${esc(doc.cancelReason)}</div>` : ""}
    </div>` : "";
  return `<div style="position:relative;font-family:'TH Sarabun PSK','TH Sarabun New','Sarabun','Kanit',Arial,sans-serif;color:#000;width:210mm;min-height:297mm;padding:16mm 10mm 12mm;background:#fff;box-sizing:border-box">${cancelStamp}
    <style>table.do{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;margin-top:6mm}table.do th,table.do td{border:1px solid #000;padding:1px 4px;height:23px;line-height:1.05;text-align:center;vertical-align:middle;overflow:hidden}table.do th{background:#F3A26E;font-size:12px;font-weight:400;white-space:nowrap}</style>
    <div style="display:grid;grid-template-columns:38mm 1fr 40mm;gap:5mm;align-items:start;margin-bottom:4mm;position:relative;min-height:32mm">
      <div>${DO_LOGO_SVG}</div>
      <div style="position:absolute;left:50%;top:2mm;transform:translateX(-50%);width:110mm;text-align:center">
        <div style="font-size:25px">บริษัท พานามณี จำกัด</div>
        <div style="font-size:24px;margin-top:1mm">ใบส่งของ / Delivery Order</div>
      </div><div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;font-size:18px;margin-bottom:4mm">
      <div>เลขที่ <span style="border-bottom:1px dotted #000;display:inline-block;min-width:52mm;text-align:center">${esc(doc.docNo || "")}</span></div>
      <div>วันที่ <span style="border-bottom:1px dotted #000;display:inline-block;min-width:40mm;text-align:center">${fmt(doc.docDate || doc.when)}</span></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:2mm;font-size:18px;margin-bottom:2mm"><span>จากโครงการ</span><span style="border-bottom:1px dotted #000;flex:1;padding-left:4mm">${esc(doc.fromProjectLabel || "")}</span></div>
    <div style="display:flex;align-items:flex-end;gap:2mm;font-size:18px;margin-bottom:2mm"><span>ส่งไปยังโครงการ</span><span style="border-bottom:1px dotted #000;flex:1;padding-left:4mm">${esc((doc.toProject || "") + (doc.toSubSite ? " · " + doc.toSubSite : ""))}</span></div>
    <table class="do">
      <thead><tr>
        <th style="width:10mm">ลำดับ</th><th style="width:26mm">รหัสทรัพย์สิน</th><th>รายการ</th>
        <th style="width:30mm">ยี่ห้อ / รุ่น</th><th style="width:26mm">Serial No.</th>
        <th style="width:15mm">จำนวน</th><th style="width:16mm">หน่วย</th><th style="width:32mm">จากโครงการ</th>
      </tr></thead>
      <tbody>${trs}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right;padding-right:6px">รวม</td><td>${totalQty.toLocaleString("th-TH")}</td><td colspan="2"></td></tr></tfoot>
    </table>
    ${doc.note ? `<div style="font-size:16px;margin-top:3mm">หมายเหตุ: ${esc(doc.note)}</div>` : ""}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12mm;margin-top:10mm;font-size:17px;text-align:center">
      <div><div style="height:12mm;border-bottom:1px dotted #000"></div><div style="margin-top:2mm">ผู้ส่งมอบ</div><div style="font-size:14px;color:#333">${esc(doc.sender || "")}</div></div>
      <div><div style="height:12mm;border-bottom:1px dotted #000"></div><div style="margin-top:2mm">ผู้รับมอบ</div><div style="font-size:14px;color:#333">${esc(doc.receiver || "")}</div></div>
      <div><div style="height:12mm;border-bottom:1px dotted #000"></div><div style="margin-top:2mm">ผู้อนุมัติ</div><div style="font-size:14px;color:#333">&nbsp;</div></div>
    </div>
  </div>`;
};
window.downloadDeliveryOrderPdf = async function (doc) {
  try {
    Swal.fire({
      title: "กำลังเตรียมไฟล์ PDF...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    await window.__loadPdf();
    Swal.close();
  } catch (e) {
    Swal.fire({
      icon: "error",
      title: "ไม่พบตัวสร้าง PDF",
      text: "โหลดไลบรารีไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
    });
    return;
  }
  const name = String(doc.docNo || "delivery-order").replace(/[\\/:*?"<>|]/g, "-") + ".pdf";
  const el = document.createElement("div");
  el.innerHTML = window.buildDeliveryOrderHtml(doc);
  document.body.appendChild(el);
  try {
    await html2pdf().set({
      margin: 0,
      filename: name,
      image: {
        type: "jpeg",
        quality: .98
      },
      html2canvas: {
        scale: 2,
        useCORS: true
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      }
    }).from(el.firstElementChild).save();
  } finally {
    el.remove();
  }
};
function DeliveryOrders({
  user
}) {
  const canEdit = ["Admin", "Officer", "Engineer"].includes(window.effectiveRole(user));
  const [rows, setRows] = React.useState(() => window.__DATA.deliveryOrders || null);
  const [err, setErr] = React.useState("");
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState(null);
  const [edit, setEdit] = React.useState(null);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [hideCancelled, setHideCancelled] = React.useState(false);
  const saveEdit = async (doc, patch) => {
    const res = await window.api("updateDeliveryOrder", {
      key: doc.key,
      patch,
      by: user.name,
      adjustStock: true
    });
    const upd = rows.map(x => x.key === doc.key ? {
      ...x,
      ...patch
    } : x);
    window.__DATA.deliveryOrders = upd;
    setRows(upd);
    window.__DATA.assetRegistry = null;
    setEdit(null);
    const warns = res && res.warnings || [];
    if (warns.length) {
      Swal.fire({
        icon: "warning",
        title: "บันทึกแล้ว · แต่มีบางรายการที่ปรับสต๊อกไม่ได้",
        html: "<div style='text-align:left;font-size:13px'>" + warns.map(w => "• " + w).join("<br/>") + "</div>",
        confirmButtonColor: "#1E40AF"
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "บันทึกและปรับสต๊อกแล้ว",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    }
  };
  React.useEffect(() => {
    if (rows) return;
    let alive = true;
    window.api("loadDeliveryOrders").then(list => {
      if (!alive) return;
      const sorted = list.slice().sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
      window.__DATA.deliveryOrders = sorted;
      setRows(sorted);
    }).catch(e => {
      if (alive) setErr(e.message || String(e));
    });
    return () => {
      alive = false;
    };
  }, [rows]);
  const cancel = async doc => {
    const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const totalQty = (doc.items || []).reduce((s, x) => s + (Number(x.quantity) || 0), 0);
    const res = await Swal.fire({
      title: "ยกเลิกใบส่งของนี้?",
      html: `
        <div style="text-align:left;font-size:13.5px">
          <div>เลขที่ <b class="mono">${esc(doc.docNo || doc.key)}</b> → <b>${esc(doc.toProject || "")}</b></div>
          <div style="color:#64748B;font-size:12.5px;margin-bottom:10px">${(doc.items || []).length} รายการ · ${totalQty.toLocaleString("th-TH")} หน่วย</div>
          <label style="display:flex;align-items:flex-start;gap:8px;padding:9px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="do-restore" checked style="margin-top:3px;width:16px;height:16px;accent-color:#B45309" />
            <span>คืนทรัพย์สินกลับโครงการต้นทางด้วย<br/><span style="color:#92400E;font-size:11.5px">ไม่ติ๊ก = ยกเลิกเฉพาะเอกสาร ไม่แตะสต๊อก</span></span>
          </label>
          <div style="margin-top:10px">
            <div style="font-size:12px;color:#475569;margin-bottom:3px">เหตุผลการยกเลิก</div>
            <textarea id="do-reason" rows="2" placeholder="เช่น ออกใบผิด, ยกเลิกการส่ง..." style="width:100%;padding:7px 9px;border:1px solid #CBD5E1;border-radius:7px;font-family:Kanit;font-size:13px;resize:vertical"></textarea>
          </div>
          <div style="margin-top:8px;font-size:11.5px;color:#64748B">เอกสารจะยังอยู่ในระบบและพิมพ์ได้ แต่จะมีตรา "ยกเลิก" กำกับ</div>
        </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันยกเลิกใบส่งของ",
      cancelButtonText: "ไม่ยกเลิก",
      confirmButtonColor: "#D97706",
      focusConfirm: false,
      preConfirm: () => ({
        restoreStock: document.getElementById("do-restore").checked,
        reason: document.getElementById("do-reason").value.trim()
      })
    });
    if (!res.isConfirmed) return;
    try {
      const out = await window.api("cancelDeliveryOrder", {
        key: doc.key,
        by: user.name,
        reason: res.value.reason,
        restoreStock: res.value.restoreStock
      });
      const patch = {
        cancelled: true,
        cancelledAt: out.cancelledAt,
        cancelledBy: out.cancelledBy,
        cancelReason: out.cancelReason,
        stockRestored: out.stockRestored
      };
      const upd = rows.map(x => x.key === doc.key ? {
        ...x,
        ...patch
      } : x);
      window.__DATA.deliveryOrders = upd;
      setRows(upd);
      if (res.value.restoreStock) window.__DATA.assetRegistry = null;
      const warns = out && out.warnings || [];
      const nRestored = (out && out.restored || []).length;
      if (warns.length) {
        Swal.fire({
          icon: "warning",
          title: "ยกเลิกแล้ว · แต่มีบางรายการที่คืนสต๊อกไม่ได้",
          html: `<div style='text-align:left;font-size:13px'>${nRestored ? `<div style="color:#047857;margin-bottom:6px">✓ คืนเข้าทะเบียนทรัพย์สินแล้ว ${nRestored} รายการ</div>` : ""}` + warns.map(w => "• " + w).join("<br/>") + "</div>",
          confirmButtonColor: "#1E40AF"
        });
      } else {
        Swal.fire({
          icon: "success",
          title: res.value.restoreStock ? `ยกเลิกและคืนของแล้ว ${nRestored} รายการ` : "ยกเลิกเอกสารแล้ว",
          text: res.value.restoreStock ? "ทะเบียนทรัพย์สินอัพเดตแล้ว" : "",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "ยกเลิกไม่สำเร็จ",
        text: e.message
      });
    }
  };
  const remove = async doc => {
    const done = await window.deleteWithApproval({
      user,
      action: "deleteDeliveryOrder",
      payload: {
        key: doc.key
      },
      entityLabel: "ใบส่งของ (DO)",
      targetName: doc.docNo || doc.key,
      project: doc.toProject || "",
      targetInfo: [doc.toProject && "ปลายทาง: " + doc.toProject, doc.by && "ผู้ทำรายการ: " + doc.by].filter(Boolean).join(" · "),
      warnHtml: "ประวัติการย้ายของทรัพย์สินจะยังอยู่ · การลบไม่สามารถกู้คืนได้"
    });
    if (done) {
      const upd = rows.filter(x => x.key !== doc.key);
      window.__DATA.deliveryOrders = upd;
      setRows(upd);
    }
  };
  if (err) return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "card-body"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      color: "#EF4444"
    }
  }), React.createElement("div", {
    className: "t"
  }, "\u0E42\u0E2B\u0E25\u0E14\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"), React.createElement("div", null, err), React.createElement("button", {
    className: "btn btn-primary btn-sm",
    style: {
      marginTop: 12
    },
    onClick: () => {
      setErr("");
      setRows(null);
    }
  }, React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48"))));
  if (!rows) return React.createElement(Loading, {
    show: true,
    text: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07..."
  });
  const scoped = rows.filter(d => window.userCanSeeProject(user, d.toProject) || (d.items || []).some(it => window.userCanSeeProject(user, it.from)));
  const cancelledCount = scoped.filter(d => d.cancelled).length;
  const filtered = scoped.filter(d => {
    if (hideCancelled && d.cancelled) return false;
    return !q || [d.docNo, d.toProject, d.fromProjectLabel, d.sender, d.receiver, d.note].join(" ").toLowerCase().includes(q.toLowerCase());
  });
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 / \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 / \u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07 / \u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), cancelledCount > 0 && React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "9px 12px",
      border: `1px solid ${hideCancelled ? "var(--primary)" : "var(--line)"}`,
      borderRadius: 10,
      background: hideCancelled ? "var(--accent-soft)" : "#fff",
      fontSize: 13,
      cursor: "pointer",
      whiteSpace: "nowrap"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: hideCancelled,
    onChange: e => setHideCancelled(e.target.checked),
    style: {
      margin: 0,
      cursor: "pointer",
      accentColor: "var(--primary)",
      width: 15,
      height: 15
    }
  }), "\u0E0B\u0E48\u0E2D\u0E19\u0E43\u0E1A\u0E17\u0E35\u0E48\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 (", cancelledCount, ")"), React.createElement("div", {
    className: "spacer"
  }), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      alignSelf: "center"
    }
  }, filtered.length.toLocaleString("th-TH"), " / ", scoped.length.toLocaleString("th-TH"), " \u0E43\u0E1A"), canEdit && React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setTransferOpen(true)
  }, React.createElement("i", {
    className: "fa-solid fa-right-left"
  }), " \u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 / \u0E2D\u0E2D\u0E01\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07")), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48"), React.createElement("th", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A"), React.createElement("th", null, "PDF"), canEdit && React.createElement("th", null, "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, filtered.map(d => React.createElement("tr", {
    key: d.key,
    style: d.cancelled ? {
      background: "#FEF2F2",
      opacity: .85
    } : null
  }, React.createElement("td", null, React.createElement("span", {
    className: "ticket-id",
    style: {
      cursor: "pointer",
      textDecoration: d.cancelled ? "line-through" : "underline",
      opacity: d.cancelled ? .7 : 1
    },
    onClick: () => setView(d)
  }, d.docNo || d.key), d.cancelled && React.createElement("div", {
    style: {
      marginTop: 3,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "1px 7px",
      borderRadius: 999,
      background: "#FEE2E2",
      color: "#B91C1C",
      fontSize: 10.5,
      fontWeight: 600
    },
    title: `ยกเลิกโดย ${d.cancelledBy || "—"} เมื่อ ${window.__DATA.fmtDate(d.cancelledAt)}${d.cancelReason ? " · " + d.cancelReason : ""}${d.stockRestored ? " · คืนของแล้ว" : " · ไม่ได้คืนของ"}`
  }, React.createElement("i", {
    className: "fa-solid fa-ban"
  }), " \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27")), React.createElement("td", {
    style: {
      whiteSpace: "nowrap",
      color: "var(--muted)"
    }
  }, d.docDate || window.__DATA.fmtDate(d.when)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, d.fromProjectLabel || "—"), React.createElement("td", {
    style: {
      fontSize: 13
    }
  }, React.createElement(ProjectLabel, {
    name: d.toProject
  }), d.toSubSite && React.createElement("div", {
    style: {
      marginTop: 3
    }
  }, React.createElement(SubSiteTag, {
    value: d.toSubSite,
    project: d.toProject
  }))), React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, (d.items || []).length, " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \xB7 ", (d.items || []).reduce((s, x) => s + (Number(x.quantity) || 0), 0).toLocaleString("th-TH"), " \u0E2B\u0E19\u0E48\u0E27\u0E22"), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, d.sender || "—"), React.createElement("td", null, React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    onClick: () => window.downloadDeliveryOrderPdf(d)
  }, React.createElement("i", {
    className: "fa-solid fa-file-pdf"
  }), " PDF")), canEdit && React.createElement("td", null, React.createElement("div", {
    className: "row-actions"
  }, !d.cancelled && React.createElement("button", {
    className: "ia",
    title: "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25",
    onClick: () => setEdit(d)
  }, React.createElement("i", {
    className: "fa-solid fa-pen"
  })), !d.cancelled && React.createElement("button", {
    className: "ia",
    title: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07",
    style: {
      color: "#D97706"
    },
    onClick: () => cancel(d)
  }, React.createElement("i", {
    className: "fa-solid fa-ban"
  })), React.createElement("button", {
    className: "ia danger",
    title: "\u0E25\u0E1A\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07",
    onClick: () => remove(d)
  }, React.createElement("i", {
    className: "fa-solid fa-trash"
  })))))), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: canEdit ? 8 : 7
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-file-export"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07"), React.createElement("div", null, "\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21 \"\u0E22\u0E49\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 / \u0E2D\u0E2D\u0E01\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\" \u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19")))))))), view && React.createElement(DeliveryOrderView, {
    doc: view,
    onClose: () => setView(null),
    onEdit: canEdit ? d => {
      setView(null);
      setEdit(d);
    } : null
  }), edit && React.createElement(DeliveryOrderEdit, {
    doc: edit,
    onClose: () => setEdit(null),
    onSave: saveEdit
  }), transferOpen && React.createElement(TransferAssetsModal, {
    user: user,
    onClose: () => setTransferOpen(false),
    onSaved: () => {
      setTransferOpen(false);
      setRows(null);
    }
  }));
}
function DeliveryOrderView({
  doc,
  onClose,
  onEdit
}) {
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-file-export",
      style: {
        color: "var(--primary)",
        marginRight: 8
      }
    }), "\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 ", React.createElement("span", {
      className: "ticket-id",
      style: {
        marginLeft: 6
      }
    }, doc.docNo || doc.key)),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E1B\u0E34\u0E14"), onEdit && !doc.cancelled && React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => onEdit(doc),
      style: {
        color: "#1E40AF"
      }
    }, React.createElement("i", {
      className: "fa-solid fa-pen"
    }), " \u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: () => window.downloadDeliveryOrderPdf(doc)
    }, React.createElement("i", {
      className: "fa-solid fa-file-pdf"
    }), " \u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14 PDF"))
  }, doc.cancelled && React.createElement("div", {
    style: {
      marginBottom: 14,
      padding: "12px 14px",
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      borderRadius: 10
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: "#B91C1C",
      fontWeight: 600,
      fontSize: 14
    }
  }, React.createElement("i", {
    className: "fa-solid fa-ban"
  }), " \u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27"), React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "#7F1D1D",
      marginTop: 5
    }
  }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E42\u0E14\u0E22 ", React.createElement("b", null, doc.cancelledBy || "—"), " \u0E40\u0E21\u0E37\u0E48\u0E2D ", window.__DATA.fmtDate(doc.cancelledAt), doc.cancelReason && React.createElement(React.Fragment, null, " \xB7 \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ", doc.cancelReason)), React.createElement("div", {
    style: {
      fontSize: 12,
      color: doc.stockRestored ? "#047857" : "#B45309",
      marginTop: 3
    }
  }, React.createElement("i", {
    className: `fa-solid ${doc.stockRestored ? "fa-rotate-left" : "fa-triangle-exclamation"}`
  }), " ", doc.stockRestored ? "คืนทรัพย์สินกลับโครงการต้นทางแล้ว" : "ยกเลิกเฉพาะเอกสาร — ไม่ได้คืนทรัพย์สินกลับต้นทาง")), React.createElement("div", {
    className: "detail-grid",
    style: {
      marginBottom: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("div", {
    className: "v"
  }, doc.docDate || window.__DATA.fmtDate(doc.when))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", {
    className: "v"
  }, doc.fromProjectLabel || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("div", {
    className: "v"
  }, React.createElement(ProjectLabel, {
    name: doc.toProject
  }), doc.toSubSite && React.createElement(SubSiteTag, {
    value: doc.toSubSite,
    project: doc.toProject,
    style: {
      marginLeft: 6
    }
  }))), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A"), React.createElement("div", {
    className: "v"
  }, doc.sender || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A"), React.createElement("div", {
    className: "v"
  }, doc.receiver || "—")), React.createElement("div", null, React.createElement("div", {
    className: "k"
  }, "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E42\u0E14\u0E22"), React.createElement("div", {
    className: "v"
  }, doc.by || "—"))), doc.note && React.createElement("div", {
    style: {
      marginBottom: 14,
      fontSize: 13,
      background: "#F8FAFC",
      border: "1px solid var(--line)",
      borderRadius: 8,
      padding: "10px 12px"
    }
  }, doc.note), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data",
    style: {
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A"), React.createElement("th", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", null, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", null, "\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"))), React.createElement("tbody", null, (doc.items || []).map((it, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", null, it.assetCode ? React.createElement("span", {
    className: "ticket-id"
  }, it.assetCode) : React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 12
    }
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A")), React.createElement("td", null, it.name, it.partial && React.createElement("span", {
    style: {
      color: "#B45309",
      fontSize: 11,
      marginLeft: 6
    }
  }, "(\u0E41\u0E1A\u0E48\u0E07\u0E22\u0E49\u0E32\u0E22\u0E08\u0E32\u0E01 ", it.totalBefore, ")")), React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, (Number(it.quantity) || 0).toLocaleString("th-TH"), " ", it.unit || ""), React.createElement("td", {
    style: {
      color: "var(--muted)"
    }
  }, it.from || "—", it.fromSubSite ? ` · ${it.fromSubSite}` : "")))))));
}
function DeliveryOrderEdit({
  doc,
  onClose,
  onSave
}) {
  const toDateStr = d => {
    if (!d) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(String(d))) return String(d).slice(0, 10);
    const dt = new Date(d);
    return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
  };
  const [f, setF] = React.useState({
    docNo: doc.docNo || "",
    docDate: toDateStr(doc.docDate || doc.when),
    fromProjectLabel: doc.fromProjectLabel || "",
    toProject: doc.toProject || "",
    toSubSite: doc.toSubSite || "",
    sender: doc.sender || "",
    receiver: doc.receiver || "",
    note: doc.note || ""
  });
  const [items, setItems] = React.useState(() => (doc.items || []).map(it => ({
    ...it
  })));
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setF(prev => ({
    ...prev,
    [k]: v
  }));
  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? {
    ...it,
    [k]: v
  } : it));
  const submit = async () => {
    if (!String(f.docNo || "").trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกเลขที่ใบส่งของ"
      });
      return;
    }
    const patch = {
      docNo: f.docNo.trim(),
      docDate: f.docDate,
      fromProjectLabel: f.fromProjectLabel,
      toProject: f.toProject,
      toSubSite: f.toSubSite,
      sender: f.sender,
      receiver: f.receiver,
      note: f.note,
      items: items.map(it => ({
        ...it,
        name: it.name,
        quantity: Number(it.quantity) || 0,
        unit: it.unit || ""
      }))
    };
    const changedQty = (doc.items || []).some((oi, i) => (Number(oi.quantity) || 0) !== (Number((items[i] || {}).quantity) || 0));
    if (changedQty) {
      const {
        isConfirmed
      } = await Swal.fire({
        title: "ยืนยันปรับสต๊อกตามจำนวนใหม่?",
        text: "ระบบจะย้ายส่วนต่างของจำนวนระหว่างโครงการต้นทางและปลายทางให้ตรงกับใบส่งของ",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ใช่, บันทึกและปรับสต๊อก",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#1E40AF"
      });
      if (!isConfirmed) return;
    }
    setSaving(true);
    try {
      await onSave(doc, patch);
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: e.message
      });
      setSaving(false);
    }
  };
  return React.createElement(Modal, {
    open: true,
    onClose: onClose,
    size: "lg",
    title: React.createElement(React.Fragment, null, React.createElement("i", {
      className: "fa-solid fa-pen",
      style: {
        color: "var(--primary)",
        marginRight: 8
      }
    }), "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 ", React.createElement("span", {
      className: "ticket-id",
      style: {
        marginLeft: 6
      }
    }, doc.docNo || doc.key)),
    footer: React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: onClose
    }, "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"), React.createElement("button", {
      className: "btn btn-primary",
      onClick: submit,
      disabled: saving
    }, React.createElement("i", {
      className: "fa-solid fa-floppy-disk"
    }), " ", saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"))
  }, React.createElement("div", {
    className: "form-grid"
  }, React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07"), React.createElement("input", {
    value: f.docNo,
    onChange: e => set("docNo", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"), React.createElement("input", {
    type: "date",
    value: f.docDate,
    onChange: e => set("docDate", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E08\u0E32\u0E01\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("input", {
    value: f.fromProjectLabel,
    onChange: e => set("fromProjectLabel", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 [PRJ-A1] \u0E42\u0E23\u0E07\u0E07\u0E32\u0E19 A"
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23"), React.createElement("input", {
    value: f.toProject,
    onChange: e => set("toProject", e.target.value)
  })), (() => {
    const sites = window.projectSites(f.toProject);
    const legacy = f.toSubSite && !sites.includes(f.toSubSite);
    return sites.length || legacy ? React.createElement("div", {
      className: "form-field"
    }, React.createElement("label", null, "\u0E44\u0E0B\u0E15\u0E4C\u0E07\u0E32\u0E19\u0E22\u0E48\u0E2D\u0E22\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07"), React.createElement("select", {
      value: f.toSubSite,
      onChange: e => set("toSubSite", e.target.value)
    }, React.createElement("option", {
      value: ""
    }, "\u2014 \u0E17\u0E31\u0E49\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 (\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E44\u0E0B\u0E15\u0E4C) \u2014"), sites.map(s => React.createElement("option", {
      key: s,
      value: s
    }, s)), legacy && React.createElement("option", {
      value: f.toSubSite
    }, f.toSubSite, " (\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27)")), React.createElement("div", {
      className: "hint"
    }, "\u0E41\u0E01\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E1A\u0E19\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 \u0E44\u0E21\u0E48\u0E22\u0E49\u0E32\u0E22\u0E2A\u0E15\u0E4A\u0E2D\u0E01\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19")) : null;
  })(), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A"), React.createElement("input", {
    value: f.sender,
    onChange: e => set("sender", e.target.value)
  })), React.createElement("div", {
    className: "form-field"
  }, React.createElement("label", null, "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A"), React.createElement("input", {
    value: f.receiver,
    onChange: e => set("receiver", e.target.value)
  })), React.createElement("div", {
    className: "form-field full"
  }, React.createElement("label", null, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"), React.createElement("textarea", {
    className: "inp",
    rows: 2,
    value: f.note,
    onChange: e => set("note", e.target.value)
  }))), React.createElement("div", {
    style: {
      marginTop: 16,
      fontWeight: 500,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement("i", {
    className: "fa-solid fa-boxes-stacked",
    style: {
      color: "var(--primary)"
    }
  }), "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E19\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 (", items.length, ")"), React.createElement("div", {
    className: "hint",
    style: {
      margin: "4px 0 10px",
      color: "#B45309"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      marginRight: 5
    }
  }), "\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49 \"\u0E08\u0E33\u0E19\u0E27\u0E19\" \u0E08\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E15\u0E4A\u0E2D\u0E01\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19\u0E15\u0E32\u0E21\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 (\u0E22\u0E49\u0E32\u0E22\u0E40\u0E1E\u0E34\u0E48\u0E21/\u0E04\u0E37\u0E19\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07-\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07) \u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E25\u0E07\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E22\u0E49\u0E32\u0E22 \xB7 \u0E08\u0E31\u0E1A\u0E04\u0E39\u0E48\u0E14\u0E49\u0E27\u0E22\u0E23\u0E2B\u0E31\u0E2A\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E34\u0E19 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E08\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E15\u0E4A\u0E2D\u0E01\u0E43\u0E2B\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49"), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", {
    className: "data",
    style: {
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E23\u0E2B\u0E31\u0E2A"), React.createElement("th", null, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    style: {
      width: 110
    }
  }, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", {
    style: {
      width: 110
    }
  }, "\u0E2B\u0E19\u0E48\u0E27\u0E22"))), React.createElement("tbody", null, items.map((it, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, it.assetCode ? React.createElement("span", {
    className: "ticket-id"
  }, it.assetCode) : React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 12
    }
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A")), React.createElement("td", null, React.createElement("input", {
    className: "inp",
    value: it.name || "",
    onChange: e => setItem(i, "name", e.target.value)
  })), React.createElement("td", null, React.createElement("input", {
    className: "inp",
    type: "number",
    min: "0",
    value: it.quantity,
    onChange: e => setItem(i, "quantity", e.target.value)
  })), React.createElement("td", null, React.createElement("input", {
    className: "inp",
    value: it.unit || "",
    onChange: e => setItem(i, "unit", e.target.value),
    placeholder: "\u0E40\u0E0A\u0E48\u0E19 \u0E0A\u0E34\u0E49\u0E19"
  })))), items.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "4"
  }, React.createElement("div", {
    className: "empty",
    style: {
      padding: 20
    }
  }, React.createElement("div", {
    className: "t",
    style: {
      fontSize: 13
    }
  }, "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"))))))));
}
window.AssetRegistry = AssetRegistry;
window.DeliveryOrders = DeliveryOrders;

/* ---- block 18 (ต้นฉบับบรรทัด 7666) ---- */
function WorkspacePicker({
  user,
  onContinue,
  onLogout
}) {
  const erpSystems = window.__DATA.erpSystems || [];
  const projects = window.userProjects(user);
  const readySystems = erpSystems.filter(x => window.canUseErp(user, x));
  const seesAll = window.userCanSeeAllProjects(user);
  const stats = {
    repairs: (window.__DATA.repairs || []).length,
    assets: (window.__DATA.machines || []).length,
    users: (window.__DATA.users || []).length,
    withdrawals: (window.__DATA.withdrawals || []).length
  };
  const systemLine = sys => {
    if (sys.id === "repairs") return `${stats.repairs} ใบงาน · เชื่อม Asset ${stats.assets} รายการ`;
    if (sys.id === "assets") return `${stats.assets} รายการ · เชื่อมงานซ่อม ${stats.repairs} ใบงาน`;
    if (sys.id === "production") return `เตรียมเชื่อม Asset ${stats.assets} รายการ`;
    if (sys.id === "consume") return `เตรียมเชื่อมสต๊อก/เบิกจ่าย ${stats.withdrawals} รายการ`;
    if (sys.id === "pc") return `เตรียมเชื่อมผู้ใช้งาน ${stats.users} คน`;
    if (sys.id === "hr-time") return `เชื่อมข้อมูลผู้ใช้งาน ${stats.users} คน`;
    return "พร้อมเชื่อมข้อมูล";
  };
  const selectSystem = sys => {
    if (!window.canUseErp(user, sys)) {
      if (sys.status === "ready") Swal.fire({
        icon: "info",
        title: "ไม่มีสิทธิ์เข้าใช้ระบบนี้",
        text: `${sys.name} เปิดใช้เฉพาะ ${(sys.roles || []).join(" / ")}`
      });else Swal.fire({
        icon: "info",
        title: "ระบบนี้รอพัฒนา",
        text: sys.name
      });
      return;
    }
    onContinue({
      erp: sys,
      project: "",
      projectLabel: ""
    });
  };
  return React.createElement("div", {
    className: "login-wrap"
  }, React.createElement("div", {
    className: "login-brand"
  }, React.createElement("div", {
    className: "grid-bg"
  }), React.createElement("div", {
    className: "login-logo"
  }, React.createElement("div", {
    className: "mark"
  }, React.createElement("i", {
    className: "fa-solid fa-layer-group"
  })), React.createElement("div", {
    style: {
      lineHeight: 1.3
    }
  }, React.createElement("div", null, "\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19"), React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 300,
      color: "rgba(255,255,255,.6)",
      marginTop: 2
    }
  }, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E08\u0E30\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49"))), React.createElement("div", {
    className: "login-hero"
  }, React.createElement("h1", null, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19", React.createElement("br", null), "\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"), React.createElement("p", null, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E14 \u0E01\u0E14\u0E41\u0E25\u0E49\u0E27\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35 \xB7 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E23\u0E2D\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E08\u0E30\u0E41\u0E2A\u0E14\u0E07\u0E44\u0E27\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E15\u0E48\u0E2D\u0E22\u0E2D\u0E14\u0E43\u0E19\u0E2D\u0E19\u0E32\u0E04\u0E15"), React.createElement("div", {
    className: "chips"
  }, React.createElement("span", {
    className: "chip"
  }, React.createElement("i", {
    className: "fa-solid fa-user-check",
    style: {
      marginRight: 6
    }
  }), user.name), React.createElement("span", {
    className: "chip"
  }, React.createElement("i", {
    className: "fa-solid fa-shield-halved",
    style: {
      marginRight: 6
    }
  }), user.role), React.createElement("span", {
    className: "chip"
  }, React.createElement("i", {
    className: "fa-solid fa-diagram-project",
    style: {
      marginRight: 6
    }
  }), seesAll ? "ทุกโครงการ" : `${projects.length} โครงการที่ได้รับมอบหมาย`))), React.createElement("div", {
    className: "login-foot"
  }, "Repair Management System")), React.createElement("div", {
    className: "login-card-wrap"
  }, React.createElement("form", {
    className: "login-card",
    onSubmit: e => e.preventDefault()
  }, React.createElement("h2", null, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19"), React.createElement("p", {
    className: "sub"
  }, "\u0E01\u0E14\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E07\u0E32\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E17\u0E31\u0E19\u0E17\u0E35"), React.createElement("div", {
    style: {
      display: "grid",
      gap: 10,
      marginBottom: 16
    }
  }, erpSystems.map(s => {
    const ready = window.canUseErp(user, s);
    const restricted = !ready && s.status === "ready";
    return React.createElement("button", {
      key: s.id,
      type: "button",
      onClick: () => selectSystem(s),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        padding: "13px 14px",
        border: "1.5px solid var(--line)",
        borderRadius: 10,
        background: ready ? "#fff" : "#F8FAFC",
        color: ready ? "var(--text)" : "var(--muted)",
        opacity: ready ? 1 : .75
      }
    }, React.createElement("span", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        background: ready ? "var(--accent-soft)" : "var(--line-soft)",
        color: ready ? "var(--primary)" : "var(--muted)",
        flex: "0 0 auto"
      }
    }, React.createElement("i", {
      className: `fa-solid ${s.icon}`
    })), React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontWeight: 600
      }
    }, s.name, restricted ? React.createElement("span", {
      className: "badge",
      style: {
        fontSize: 11,
        background: "#E0E7FF",
        color: "#3730A3"
      }
    }, "\u0E40\u0E09\u0E1E\u0E32\u0E30 ", (s.roles || []).join(" / ")) : !ready && React.createElement("span", {
      className: "badge",
      style: {
        fontSize: 11,
        background: "#FEF3C7",
        color: "#92400E"
      }
    }, "\u0E23\u0E2D\u0E1E\u0E31\u0E12\u0E19\u0E32")), React.createElement("span", {
      style: {
        display: "block",
        fontSize: 12.5,
        color: "var(--muted)",
        marginTop: 2
      }
    }, s.desc), React.createElement("span", {
      style: {
        display: "block",
        fontSize: 12,
        color: ready ? "var(--primary)" : "var(--muted)",
        marginTop: 4
      }
    }, React.createElement("i", {
      className: "fa-solid fa-link",
      style: {
        marginRight: 5
      }
    }), systemLine(s))), ready && React.createElement("i", {
      className: "fa-solid fa-chevron-right",
      style: {
        color: "var(--muted)"
      }
    }));
  })), readySystems.length === 0 && React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--danger)",
      marginBottom: 14
    }
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E30\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"), !seesAll && projects.length === 0 && React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#B45309",
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 14
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      marginRight: 6
    }
  }), "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E08\u0E30\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E14\u0E40\u0E25\u0E22 \xB7 \u0E41\u0E08\u0E49\u0E07\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E49\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19"), React.createElement("button", {
    className: "btn btn-ghost",
    type: "button",
    onClick: onLogout,
    style: {
      width: "100%",
      marginTop: 10
    }
  }, "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A"))));
}
function SpareParts({
  user
}) {
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState("list");
  const [detail, setDetail] = React.useState(null);
  const machineName = code => {
    const m = (window.__DATA.machines || []).find(x => x.code === code);
    return m ? m.name : "";
  };
  const rows = React.useMemo(() => {
    const visible = window.filterByUserProjects(user, window.__DATA.repairs, "project");
    const out = [];
    visible.forEach(r => {
      (r.parts || []).forEach((p, idx) => {
        if (!p || !String(p.name || "").trim()) return;
        const qty = Number(p.qty) || 0,
          unitPrice = Number(p.unitPrice) || 0;
        out.push({
          key: `${r.id}:${idx}`,
          repair: r,
          running: r.running,
          machineCode: r.machineCode || "",
          machineName: machineName(r.machineCode),
          project: r.project || "",
          status: r.status,
          createdAt: r.createdAt,
          name: String(p.name).trim(),
          qty,
          unitPrice,
          total: Number(p.total) || qty * unitPrice,
          supplier: String(p.supplier || "").trim(),
          photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : []
        });
      });
    });
    return out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [user]);
  const kw = q.trim().toLowerCase();
  const filtered = rows.filter(r => !kw || [r.name, r.supplier, r.running, r.machineCode, r.machineName, r.project].some(v => String(v || "").toLowerCase().includes(kw)));
  const grouped = React.useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.name.toLowerCase();
      if (!map[k]) map[k] = {
        name: r.name,
        qty: 0,
        total: 0,
        count: 0,
        suppliers: new Set(),
        photos: []
      };
      const g = map[k];
      g.qty += r.qty;
      g.total += r.total;
      g.count += 1;
      if (r.supplier) g.suppliers.add(r.supplier);
      r.photos.forEach(u => {
        if (g.photos.length < 4) g.photos.push(u);
      });
    });
    return Object.values(map).map(g => ({
      ...g,
      suppliers: [...g.suppliers]
    })).sort((a, b) => b.total - a.total);
  }, [filtered]);
  const totalQty = filtered.reduce((s, r) => s + r.qty, 0);
  const totalCost = filtered.reduce((s, r) => s + r.total, 0);
  const fmt = n => Math.round(Number(n) || 0).toLocaleString("th-TH");
  const exportExcel = async () => {
    if (!filtered.length) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลให้ส่งออก"
      });
      return;
    }
    try {
      Swal.fire({
        title: "กำลังสร้างไฟล์ Excel...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      const XLSX = await ensureXLSX();
      let data, sheetName;
      if (view === "grouped") {
        sheetName = "อะไหล่รวมตามชื่อ";
        data = grouped.map((g, i) => ({
          "ลำดับ": i + 1,
          "อะไหล่/รายการ": g.name,
          "จำนวนครั้งที่ใช้": g.count,
          "จำนวนรวม": g.qty,
          "มูลค่ารวม (บาท)": Math.round(g.total),
          "แหล่งซื้อ": g.suppliers.join(", ")
        }));
      } else {
        sheetName = "อะไหล่ที่ใช้ซ่อม";
        data = filtered.map((r, i) => ({
          "ลำดับ": i + 1,
          "อะไหล่/รายการ": r.name,
          "จำนวน": r.qty,
          "ราคา/หน่วย": r.unitPrice,
          "รวม (บาท)": Math.round(r.total),
          "แหล่งซื้อ": r.supplier,
          "ใบแจ้งซ่อม": r.running,
          "เครื่องจักร": [r.machineCode, r.machineName].filter(Boolean).join(" "),
          "โครงการ": r.project,
          "วันที่": window.__DATA.fmtDate(r.createdAt),
          "จำนวนรูป": r.photos.length
        }));
      }
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = Object.keys(data[0]).map(k => ({
        wch: Math.min(40, Math.max(k.length + 4, ...data.map(row => String(row[k] ?? "").length + 2)))
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      XLSX.writeFile(wb, `อะไหล่ที่ใช้ซ่อม_${stamp}.xlsx`);
      Swal.fire({
        icon: "success",
        title: `ส่งออกแล้ว ${data.length} รายการ`,
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ส่งออกไม่สำเร็จ",
        text: err.message
      });
    }
  };
  const stats = [{
    label: view === "grouped" ? "ชนิดอะไหล่" : "รายการอะไหล่",
    val: view === "grouped" ? grouped.length : filtered.length,
    icon: "fa-box-open",
    color: "#3B82F6"
  }, {
    label: "จำนวนชิ้นรวม",
    val: totalQty,
    icon: "fa-cubes-stacked",
    color: "#8B5CF6"
  }, {
    label: "มูลค่าอะไหล่รวม",
    val: totalCost,
    icon: "fa-coins",
    color: "#10B981",
    money: true
  }];
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "stat-grid",
    style: {
      marginBottom: 16
    }
  }, stats.map((s, i) => React.createElement("div", {
    className: "stat",
    key: i
  }, React.createElement("div", {
    className: "ic",
    style: {
      background: s.color + "1a",
      color: s.color
    }
  }, React.createElement("i", {
    className: `fa-solid ${s.icon}`
  })), React.createElement("div", {
    className: "label"
  }, s.label), React.createElement("div", {
    className: "val"
  }, s.money ? `฿${fmt(s.val)}` : s.val.toLocaleString("th-TH"))))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "filters"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32 \u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 / \u0E41\u0E2B\u0E25\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D / \u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21 / \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("div", {
    style: {
      display: "inline-flex",
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      borderRadius: 0,
      background: view === "list" ? "var(--accent-soft)" : "#fff",
      color: view === "list" ? "var(--primary)" : "var(--muted)"
    },
    onClick: () => setView("list")
  }, React.createElement("i", {
    className: "fa-solid fa-list"
  }), " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14"), React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      borderRadius: 0,
      background: view === "grouped" ? "var(--accent-soft)" : "#fff",
      color: view === "grouped" ? "var(--primary)" : "var(--muted)"
    },
    onClick: () => setView("grouped")
  }, React.createElement("i", {
    className: "fa-solid fa-layer-group"
  }), " \u0E23\u0E27\u0E21\u0E15\u0E32\u0E21\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48")), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: exportExcel,
    title: "\u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E01\u0E17\u0E35\u0E48\u0E41\u0E2A\u0E14\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E40\u0E1B\u0E47\u0E19 Excel"
  }, React.createElement("i", {
    className: "fa-solid fa-file-excel",
    style: {
      color: "#1D6F42"
    }
  }), " \u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E01 Excel")), React.createElement("div", {
    className: "table-wrap"
  }, view === "list" ? React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 / \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E23\u0E39\u0E1B"), React.createElement("th", null, "\u0E08\u0E33\u0E19\u0E27\u0E19"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E23\u0E32\u0E04\u0E32/\u0E2B\u0E19\u0E48\u0E27\u0E22"), React.createElement("th", null, "\u0E23\u0E27\u0E21"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D"), React.createElement("th", null, "\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"))), React.createElement("tbody", null, filtered.map(r => React.createElement("tr", {
    key: r.key
  }, React.createElement("td", {
    style: {
      fontWeight: 500
    }
  }, r.name), React.createElement("td", {
    className: "hide-on-mobile"
  }, r.photos.length > 0 ? React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, r.photos.slice(0, 2).map((u, i) => React.createElement(PhotoThumb, {
    key: i,
    url: u,
    size: 36
  })), r.photos.length > 2 && React.createElement("span", {
    style: {
      alignSelf: "center",
      fontSize: 11,
      color: "var(--muted)"
    }
  }, "+", r.photos.length - 2)) : React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 12
    }
  }, "\u2014")), React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, r.qty.toLocaleString("th-TH")), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      whiteSpace: "nowrap"
    }
  }, "\u0E3F", fmt(r.unitPrice)), React.createElement("td", {
    style: {
      whiteSpace: "nowrap",
      fontWeight: 600,
      color: "var(--primary)"
    }
  }, "\u0E3F", fmt(r.total)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, r.supplier || React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u2014")), React.createElement("td", null, React.createElement("span", {
    className: "ticket-id",
    style: {
      cursor: "pointer",
      textDecoration: "underline"
    },
    onClick: () => setDetail(r.repair)
  }, r.running)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 13
    }
  }, r.machineCode ? React.createElement(React.Fragment, null, r.machineCode, r.machineName ? React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--muted)"
    }
  }, r.machineName) : null) : React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "\u2014")), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      color: "var(--muted)",
      whiteSpace: "nowrap"
    }
  }, window.__DATA.fmtDate(r.createdAt)))), filtered.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "9"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-box-open"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48\u0E17\u0E35\u0E48\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49"), React.createElement("div", null, "\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48\u0E08\u0E30\u0E1B\u0E23\u0E32\u0E01\u0E0F\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E21\u0E35\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19/\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48\u0E43\u0E19\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21")))))) : React.createElement("table", {
    className: "data"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48 / \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E23\u0E39\u0E1B"), React.createElement("th", null, "\u0E43\u0E0A\u0E49 (\u0E04\u0E23\u0E31\u0E49\u0E07)"), React.createElement("th", null, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E23\u0E27\u0E21"), React.createElement("th", null, "\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E23\u0E27\u0E21"), React.createElement("th", {
    className: "hide-on-mobile"
  }, "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D"))), React.createElement("tbody", null, grouped.map((g, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", {
    style: {
      fontWeight: 500
    }
  }, g.name), React.createElement("td", {
    className: "hide-on-mobile"
  }, g.photos.length > 0 ? React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, g.photos.slice(0, 2).map((u, k) => React.createElement(PhotoThumb, {
    key: k,
    url: u,
    size: 36
  }))) : React.createElement("span", {
    style: {
      color: "var(--muted)",
      fontSize: 12
    }
  }, "\u2014")), React.createElement("td", null, g.count.toLocaleString("th-TH")), React.createElement("td", {
    style: {
      whiteSpace: "nowrap"
    }
  }, g.qty.toLocaleString("th-TH")), React.createElement("td", {
    style: {
      whiteSpace: "nowrap",
      fontWeight: 600,
      color: "var(--primary)"
    }
  }, "\u0E3F", fmt(g.total)), React.createElement("td", {
    className: "hide-on-mobile",
    style: {
      fontSize: 12.5,
      color: "var(--muted)"
    }
  }, g.suppliers.join(", ") || "—"))), grouped.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "6"
  }, React.createElement("div", {
    className: "empty"
  }, React.createElement("i", {
    className: "fa-solid fa-box-open"
  }), React.createElement("div", {
    className: "t"
  }, "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48\u0E17\u0E35\u0E48\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49")))))))), detail && React.createElement(RepairDetail, {
    r: detail,
    onClose: () => setDetail(null),
    user: user,
    onQuick: null,
    onEdit: null,
    onEditParts: null,
    onProblems: () => {}
  }));
}
window.SpareParts = SpareParts;
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const IDLE_KEY = "rms_last_active";
function touchActivity() {
  try {
    localStorage.setItem(IDLE_KEY, String(Date.now()));
  } catch (e) {}
}
function isSessionExpired() {
  const t = Number(localStorage.getItem(IDLE_KEY) || 0);
  return !t || Date.now() - t > IDLE_LIMIT_MS;
}
function clearSession() {
  localStorage.removeItem("rms_user");
  localStorage.removeItem("rms_workspace");
  localStorage.removeItem(IDLE_KEY);
}
window.touchActivity = touchActivity;
window.isSessionExpired = isSessionExpired;
window.clearSession = clearSession;
function App() {
  const [user, setUser] = React.useState(null);
  const [workspace, setWorkspace] = React.useState(null);
  const [page, setPage] = React.useState("dashboard");
  const [sbOpen, setSbOpen] = React.useState(false);
  const [booting, setBooting] = React.useState(true);
  const [bootErr, setBootErr] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        await window.__DATA.bootstrap();
        setBooting(false);
      } catch (err) {
        setBootErr(err.message || String(err));
        setBooting(false);
      }
    })();
  }, []);
  React.useEffect(() => {
    if (booting) return;
    if (localStorage.getItem("rms_user") && isSessionExpired()) {
      clearSession();
      return;
    }
    const s = localStorage.getItem("rms_user");
    if (s) {
      try {
        const u = JSON.parse(s);
        const fresh = window.__DATA.users.find(x => x.id === u.id);
        if (fresh) {
          setUser(fresh);
          const ws = localStorage.getItem("rms_workspace");
          if (ws) {
            const parsed = JSON.parse(ws);
            const erp = (window.__DATA.erpSystems || []).find(x => x.id === parsed.erp?.id) || parsed.erp;
            if (window.canUseErp(fresh, erp)) {
              window.__DATA.activeErp = erp;
              window.__DATA.activeProject = "";
              setWorkspace({
                ...parsed,
                erp,
                project: "",
                projectLabel: ""
              });
            } else {
              localStorage.removeItem("rms_workspace");
            }
          }
        }
      } catch (e) {}
    }
  }, [booting]);
  React.useEffect(() => {
    if (!user) {
      window.__DELREQ.stop();
      return;
    }
    window.__DELREQ.start(user);
    window.askNotifyPermission(user);
  }, [user && user.id, user && user.role]);
  React.useEffect(() => {
    if (!user) return;
    touchActivity();
    const checkIdle = () => {
      if (!isSessionExpired()) return;
      clearSession();
      setUser(null);
      setWorkspace(null);
      window.__DATA.activeErp = null;
      window.__DATA.activeProject = "";
      Swal.fire({
        icon: "info",
        title: "หมดเวลาใช้งาน",
        text: "ไม่ได้ใช้งานเกิน 15 นาที กรุณาเข้าสู่ระบบใหม่",
        confirmButtonText: "ตกลง"
      });
    };
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      touchActivity();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkIdle();
    };
    const events = ["mousedown", "keydown", "touchstart", "click", "scroll", "wheel"];
    events.forEach(ev => window.addEventListener(ev, onActivity, {
      passive: true,
      capture: true
    }));
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(checkIdle, 30000);
    return () => {
      events.forEach(ev => window.removeEventListener(ev, onActivity, {
        capture: true
      }));
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [user && user.id]);
  const login = u => {
    setUser(u);
    localStorage.setItem("rms_user", JSON.stringify(u));
    setWorkspace(null);
    localStorage.removeItem("rms_workspace");
    touchActivity();
    setPage(window.defaultPageFor(u));
  };
  const enterWorkspace = ws => {
    window.__DATA.activeErp = ws.erp;
    window.__DATA.activeProject = ws.project;
    setWorkspace(ws);
    localStorage.setItem("rms_workspace", JSON.stringify(ws));
    if (ws.erp?.startPage) {
      setPage(ws.erp.startPage);
    } else {
      setPage(window.defaultPageFor(user));
    }
  };
  const clearWorkspace = () => {
    window.__DATA.activeErp = null;
    window.__DATA.activeProject = "";
    setWorkspace(null);
    localStorage.removeItem("rms_workspace");
  };
  const logout = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#EF4444"
    }).then(r => {
      if (r.isConfirmed) {
        setUser(null);
        setWorkspace(null);
        clearSession();
        window.__DATA.activeErp = null;
        window.__DATA.activeProject = "";
      }
    });
  };
  if (booting) return React.createElement("div", {
    style: {
      display: "grid",
      placeItems: "center",
      minHeight: "100vh",
      gap: 14,
      background: "var(--bg)",
      fontFamily: "Kanit"
    }
  }, React.createElement("div", {
    className: "spinner",
    style: {
      width: 40,
      height: 40,
      borderWidth: 4
    }
  }), React.createElement("div", {
    style: {
      color: "var(--muted)"
    }
  }, "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Firebase..."));
  if (bootErr) return React.createElement("div", {
    style: {
      display: "grid",
      placeItems: "center",
      minHeight: "100vh",
      padding: 20,
      background: "var(--bg)"
    }
  }, React.createElement("div", {
    className: "card",
    style: {
      maxWidth: 520,
      padding: 28,
      textAlign: "center"
    }
  }, React.createElement("i", {
    className: "fa-solid fa-triangle-exclamation",
    style: {
      fontSize: 36,
      color: "var(--danger)",
      marginBottom: 10
    }
  }), React.createElement("h3", {
    style: {
      margin: "0 0 6px"
    }
  }, "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Firebase \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      marginBottom: 14,
      wordBreak: "break-word"
    }
  }, bootErr), React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 12.5,
      textAlign: "left",
      background: "#FAFBFC",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: 14
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      color: "var(--text)",
      marginBottom: 6
    }
  }, "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A:"), "1. \u0E44\u0E1B\u0E17\u0E35\u0E48 Firebase Console \u2192 Realtime Database \u2192 ", React.createElement("strong", null, "Rules"), React.createElement("br", null), "2. \u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 ", React.createElement("span", {
    className: "mono"
  }, '"'.repeat(1), ".read", '"'.repeat(1), ": true, ", '"'.repeat(1), ".write", '"'.repeat(1), ": true"), React.createElement("br", null), "3. \u0E01\u0E14 Publish \u0E41\u0E25\u0E49\u0E27\u0E42\u0E2B\u0E25\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48"), React.createElement("button", {
    className: "btn btn-primary",
    style: {
      marginTop: 14
    },
    onClick: () => location.reload()
  }, React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48")));
  if (!user) return React.createElement(Login, {
    onLogin: login
  });
  if (!workspace) return React.createElement(WorkspacePicker, {
    user: user,
    onContinue: enterWorkspace,
    onLogout: () => {
      setUser(null);
      setWorkspace(null);
      clearSession();
      window.__DATA.activeErp = null;
      window.__DATA.activeProject = "";
    }
  });
  const activeUser = {
    ...user,
    activeErp: workspace.erp,
    activeProject: workspace.project
  };
  const systemId = workspace.erp?.id || "repairs";
  const isSafety = user.role === "Safety Officer";
  const allowedPages = (systemId === "assets" ? isSafety ? ["doc-pj2", "machines", "transfer-history"] : ["machines", "asset-registry", "asset-do", "doc-pj2", "transfer-history", "projects"] : systemId === "consume" ? ["withdrawals"] : isSafety ? ["dashboard", "repairs", "spare-parts", "machines", "r-new"] : ["dashboard", "repairs", "spare-parts", "machines", "users", "categories", "login-logs", "r-dashboard", "r-new", "r-mine"]).concat("notifications");
  const safePage = allowedPages.includes(page) ? page : workspace.erp?.startPage || allowedPages[0];
  const pageTitles = {
    "dashboard": {
      t: "แดชบอร์ด",
      c: "ภาพรวมและสถิติงานซ่อม"
    },
    "repairs": {
      t: "รายการแจ้งซ่อม",
      c: "จัดการและติดตามงานซ่อมทั้งหมด"
    },
    "spare-parts": {
      t: "อะไหล่ที่ใช้ซ่อม",
      c: "สรุปอะไหล่ที่ใช้จากทุกใบแจ้งซ่อม · ค่าใช้จ่ายและแหล่งซื้อ"
    },
    "users": {
      t: "จัดการผู้ใช้งาน",
      c: "Users · เพิ่ม / แก้ไข / ลบ"
    },
    "categories": {
      t: "จัดการหมวดหมู่งาน",
      c: "Categories · เพิ่ม / แก้ไข / ลบ"
    },
    "machines": {
      t: "ทะเบียนเครื่องจักร",
      c: "Machines · ข้อมูลจาก Firebase"
    },
    "asset-registry": {
      t: "ทะเบียนทรัพย์สิน",
      c: "Asset Registry · ข้อมูลจาก Firebase panamanee-3a15a"
    },
    "asset-do": {
      t: "ใบส่งของ (DO)",
      c: "Delivery Order · บันทึกการย้ายทรัพย์สินระหว่างโครงการ"
    },
    "withdrawals": {
      t: "รายการเบิกของ",
      c: "ERP Withdrawal · ใบขอเบิก/ขอสั่งซื้อ 24 แถวต่อหน้า"
    },
    "doc-pj2": {
      t: "ปจ2 - เอกสารรับรองการตรวจสอบและทดสอบ",
      c: "ลิงค์ไฟล์เอกสารตามรายการเครื่องจักร"
    },
    "transfer-history": {
      t: "ประวัติการย้ายเครื่องจักร",
      c: "บันทึกการย้ายโครงการของเครื่องจักรทั้งหมด"
    },
    "login-logs": {
      t: "ประวัติการล็อกอิน",
      c: "บันทึกการเข้าสู่ระบบล่าสุด 100 รายการ · ที่เกินมาระบบลบทิ้งอัตโนมัติ · เฉพาะ Admin"
    },
    "projects": {
      t: "โครงการ",
      c: "Projects · จัดการข้อมูลโครงการทั้งหมด"
    },
    "r-dashboard": {
      t: "สรุปงานของฉัน",
      c: "ภาพรวมงานแจ้งซ่อมที่ฉันเป็นผู้แจ้ง"
    },
    "r-new": {
      t: "แจ้งซ่อมใหม่",
      c: "กรอกแบบฟอร์มแจ้งซ่อม"
    },
    "r-mine": {
      t: "ติดตามสถานะ",
      c: "รายการแจ้งซ่อมของฉัน"
    },
    "notifications": {
      t: "การแจ้งเตือน",
      c: "คำขออนุมัติลบ / แก้ไขข้อมูล · ต้องได้รับอนุมัติจากผู้ดูแลระบบ (Admin) ก่อนเสมอ"
    }
  };
  const pt = pageTitles[safePage] || pageTitles.dashboard;
  const renderPage = () => {
    if (safePage === "dashboard") return React.createElement(Dashboard, {
      user: activeUser,
      goTo: setPage
    });
    if (safePage === "repairs") return React.createElement(Repairs, {
      user: activeUser
    });
    if (safePage === "spare-parts") return React.createElement(SpareParts, {
      user: activeUser
    });
    if (safePage === "users") return React.createElement(Users, {
      user: activeUser
    });
    if (safePage === "categories") return React.createElement(Categories, {
      user: activeUser
    });
    if (safePage === "machines") return React.createElement(Machines, {
      user: activeUser
    });
    if (safePage === "asset-registry") return React.createElement(AssetRegistry, {
      user: activeUser
    });
    if (safePage === "asset-do") return React.createElement(DeliveryOrders, {
      user: activeUser
    });
    if (safePage === "withdrawals") return user.role === "Admin" ? React.createElement(Withdrawals, {
      user: activeUser
    }) : null;
    if (safePage === "doc-pj2") return React.createElement(DocPJ2, {
      user: activeUser
    });
    if (safePage === "transfer-history") return React.createElement(MachineTransferHistory, {
      user: activeUser
    });
    if (safePage === "login-logs") return user.role === "Admin" ? React.createElement(LoginLogs, null) : null;
    if (safePage === "projects") return React.createElement(Projects, {
      user: activeUser
    });
    if (safePage === "r-dashboard") return React.createElement(ReporterDashboard, {
      user: activeUser,
      goTo: setPage
    });
    if (safePage === "r-new") return React.createElement(NewRequest, {
      user: activeUser,
      goTo: setPage
    });
    if (safePage === "r-mine") return React.createElement(MyRepairs, {
      user: activeUser
    });
    if (safePage === "notifications") return React.createElement(DeleteApprovals, {
      user: activeUser
    });
    return null;
  };
  return React.createElement("div", {
    className: "shell"
  }, React.createElement("button", {
    className: "sidebar-toggle",
    onClick: () => setSbOpen(true)
  }, React.createElement("i", {
    className: "fa-solid fa-bars"
  })), React.createElement(Sidebar, {
    user: activeUser,
    active: safePage,
    onNav: setPage,
    onLogout: logout,
    open: sbOpen,
    onClose: () => setSbOpen(false)
  }), React.createElement("main", {
    className: "main"
  }, React.createElement("div", {
    className: "topbar"
  }, React.createElement("div", {
    className: "title"
  }, React.createElement("h1", null, pt.t), React.createElement("div", {
    className: "crumb"
  }, pt.c)), React.createElement("div", {
    className: "actions"
  }, React.createElement("div", {
    className: "search-input"
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass"
  }), React.createElement("input", {
    placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E17\u0E31\u0E49\u0E07\u0E23\u0E30\u0E1A\u0E1A..."
  })), React.createElement("button", {
    className: "btn btn-ghost",
    title: `${workspace.erp?.name || "ระบบงาน"} · กดเพื่อเปลี่ยนระบบงาน`,
    onClick: clearWorkspace,
    style: {
      maxWidth: 320,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, React.createElement("i", {
    className: `fa-solid ${workspace.erp?.icon || "fa-layer-group"}`
  }), " ", workspace.erp?.name || "ระบบงาน"), safePage === "repairs" && systemId === "repairs" && window.isOpsRole(user) && React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setPage("r-new")
  }, React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " \u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E21\u0E48"))), renderPage()));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));