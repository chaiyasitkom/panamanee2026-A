// Firebase API client — เชื่อมต่อ Firebase Realtime Database และ Storage

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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const _db = firebase.database();
const _storage = firebase.storage();

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

async function _uploadPhoto(path, upload) {
  const byteStr = atob(upload.data);
  const bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
  const ref = _storage.ref(path);
  await ref.put(new Blob([bytes], { type: upload.mimeType }));
  return await ref.getDownloadURL();
}

async function api(action, payload = {}) {
  switch (action) {

    case 'login': {
      const { username, password } = payload;
      const snap = await _db.ref('/users').get();
      const user = Object.values(snap.val() || {}).find(
        u => String(u.username) === String(username) && String(u.password) === String(password)
      );
      if (!user) throw new Error('Username หรือ Password ไม่ถูกต้อง');
      const safe = { ...user };
      delete safe.password;
      return safe;
    }

    case 'bootstrap': {
      await _seedIfEmpty();
      const [usersSnap, catSnap, machSnap, repSnap] = await Promise.all([
        _db.ref('/users').get(),
        _db.ref('/categories').get(),
        _db.ref('/machines').get(),
        _db.ref('/repairs').get(),
      ]);
      const users = Object.values(usersSnap.val() || {}).map(u => {
        const x = { ...u }; delete x.password; return x;
      });
      const categories = Object.values(catSnap.val() || {});
      const machines = Object.values(machSnap.val() || {});
      const repairs = Object.values(repSnap.val() || {}).map(r => ({
        ...r,
        timeline: r.timeline ? Object.values(r.timeline) : [],
      }));
      return { users, categories, machines, repairs };
    }

    case 'createUser': {
      const { user } = payload;
      if (!user.id) user.id = await _nextId('users', 'U', 3);
      user.createdAt = new Date().toISOString();
      await _db.ref('/users/' + user.id).set(user);
      const safe = { ...user };
      delete safe.password;
      return safe;
    }

    case 'updateUser': {
      const { id, patch } = payload;
      const update = { ...patch };
      if (!update.password) delete update.password;
      await _db.ref('/users/' + id).update(update);
      return { updated: true };
    }

    case 'deleteUser': {
      const { id } = payload;
      await _db.ref('/users/' + id).remove();
      return { deleted: true };
    }

    case 'createCategory': {
      const { cat } = payload;
      if (!cat.id) cat.id = await _nextId('categories', 'C', 2);
      await _db.ref('/categories/' + cat.id).set(cat);
      return cat;
    }

    case 'updateCategory': {
      const { id, patch } = payload;
      await _db.ref('/categories/' + id).update(patch);
      return { updated: true };
    }

    case 'deleteCategory': {
      const { id } = payload;
      await _db.ref('/categories/' + id).remove();
      return { deleted: true };
    }

    case 'createMachine': {
      const { m, photoUpload } = payload;
      if (!m.id) m.id = await _nextId('machines', 'M', 3);
      if (photoUpload && photoUpload.data) {
        m.photo = await _uploadPhoto(
          'machines/' + (m.code || m.id) + '/' + photoUpload.name,
          photoUpload
        );
      }
      await _db.ref('/machines/' + m.id).set(m);
      return m;
    }

    case 'updateMachine': {
      const { id, patch, photoUpload } = payload;
      if (photoUpload && photoUpload.data) {
        patch.photo = await _uploadPhoto(
          'machines/' + (patch.code || id) + '/' + photoUpload.name,
          photoUpload
        );
      }
      await _db.ref('/machines/' + id).update(patch);
      return { updated: true, photo: patch.photo };
    }

    case 'deleteMachine': {
      const { id } = payload;
      await _db.ref('/machines/' + id).remove();
      return { deleted: true };
    }

    case 'createRepair': {
      const { repair, uploads } = payload;
      if (!repair.id) repair.id = await _nextId('repairs', 'R', 4);
      if (!repair.running) {
        const snap = await _db.ref('/repairs').get();
        const count = Object.keys(snap.val() || {}).length + 1;
        repair.running = 'RE-69/' + String(count).padStart(3, '0');
      }
      repair.createdAt = repair.createdAt || new Date().toISOString();
      repair.updatedAt = new Date().toISOString();
      repair.status = repair.status || 'new';
      const photoUrls = [];
      if (uploads && uploads.length) {
        for (const u of uploads) {
          photoUrls.push(await _uploadPhoto('repairs/' + repair.running + '/' + u.name, u));
        }
      }
      repair.photos = photoUrls;
      repair.afterPhotos = [];
      const tlKey = _db.ref('/repairs/' + repair.id + '/timeline').push().key;
      repair.timeline = {
        [tlKey]: { id: tlKey, status: 'new', when: new Date().toISOString(), by: repair.reporterName || '', note: 'แจ้งเข้าระบบ' }
      };
      await _db.ref('/repairs/' + repair.id).set(repair);
      return { ...repair, timeline: Object.values(repair.timeline) };
    }

    case 'updateRepair': {
      const { id, patch, by } = payload;
      const clean = { ...patch };
      clean.updatedAt = new Date().toISOString();
      delete clean.id; delete clean.running; delete clean.createdAt; delete clean.timeline;
      const tlKey = _db.ref('/repairs/' + id + '/timeline').push().key;
      clean['timeline/' + tlKey] = {
        id: tlKey, status: clean.status || '', when: new Date().toISOString(), by: by || '', note: 'แก้ไขข้อมูลโดย Admin'
      };
      await _db.ref('/repairs/' + id).update(clean);
      return { ok: true };
    }

    case 'updateRepairStatus': {
      const { id, status, by, note, cost, patch: extraPatch } = payload;
      const ALLOW = ['title','desc','siteId','machineCode','project','categoryId','reporterName','assignedId'];
      const clean = {};
      ALLOW.forEach(k => { if (extraPatch && extraPatch[k] !== undefined) clean[k] = extraPatch[k]; });
      clean.updatedAt = new Date().toISOString();
      if (status !== undefined) clean.status = status;
      if (cost !== undefined) clean.cost = cost;
      const tlKey = _db.ref('/repairs/' + id + '/timeline').push().key;
      clean['timeline/' + tlKey] = {
        id: tlKey, status: status || '', when: new Date().toISOString(), by: by || '', note: note || ''
      };
      await _db.ref('/repairs/' + id).update(clean);
      return { ok: true };
    }

    default:
      throw new Error('Unknown action: ' + action);
  }
}

// ===== SEED DATA (รันครั้งเดียวเมื่อ database ว่าง) =====

async function _seedIfEmpty() {
  const snap = await _db.ref('/users').get();
  if (snap.val()) return; // มีข้อมูลแล้ว ไม่ต้อง seed

  const now = new Date().toISOString();

  // Admin user — กำหนดโดยผู้ดูแลระบบ
  await _db.ref('/users/U001').set({
    id: 'U001', username: 'admin', password: 'komdevil99',
    name: 'ผู้ดูแลระบบ', role: 'Admin', dept: 'ฝ่ายไอที',
    email: 'admin@company.co.th', projects: [], createdAt: now,
  });

  // Default categories
  const cats = [
    { id:'C01', name:'ไฟฟ้า',              color:'#F59E0B', icon:'fa-bolt' },
    { id:'C02', name:'เครื่องจักรกล',      color:'#3B82F6', icon:'fa-gears' },
    { id:'C03', name:'ระบบลม/ไฮดรอลิก',    color:'#0EA5E9', icon:'fa-wind' },
    { id:'C04', name:'ระบบน้ำ',             color:'#06B6D4', icon:'fa-droplet' },
    { id:'C05', name:'คอมพิวเตอร์/IT',      color:'#8B5CF6', icon:'fa-desktop' },
    { id:'C06', name:'อาคาร/สาธารณูปโภค',  color:'#10B981', icon:'fa-building' },
    { id:'C07', name:'ยานพาหนะ',            color:'#EF4444', icon:'fa-truck' },
    { id:'C08', name:'อื่นๆ',               color:'#64748B', icon:'fa-wrench' },
  ];
  for (const c of cats) await _db.ref('/categories/' + c.id).set(c);
}

// เรียก window.setupDatabase() จาก Console เพื่อ reset และ seed ใหม่
window.setupDatabase = async function() {
  await _db.ref('/users').remove();
  await _db.ref('/categories').remove();
  await _seedIfEmpty();
  console.log('✅ Database seeded. Admin: admin / komdevil99');
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = fr.result;
      const i = s.indexOf(',');
      resolve({ name: file.name, mimeType: file.type, data: s.slice(i + 1) });
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

window.api = api;
window.fileToBase64 = fileToBase64;
