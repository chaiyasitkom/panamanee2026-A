import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set, update, push, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBhcH8DyubFWzX93b7sD4GYuDK3TUTFI4Y',
  authDomain: 'uesr-panamanee.firebaseapp.com',
  databaseURL: 'https://uesr-panamanee-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'uesr-panamanee',
  storageBucket: 'uesr-panamanee.firebasestorage.app',
  messagingSenderId: '845019270186',
  appId: '1:845019270186:web:a7c33f347831b422e64753',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

async function nextId(collection, prefix, pad) {
  const snap = await get(ref(db, '/' + collection));
  const items = Object.values(snap.val() || {});
  let max = 0;
  items.forEach(item => {
    const m = String(item.id || '').match(/\d+/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  });
  return prefix + String(max + 1).padStart(pad, '0');
}

export async function api(action, payload = {}) {
  switch (action) {

    case 'login': {
      const { username, password } = payload;
      const snap = await get(ref(db, '/users'));
      const user = Object.values(snap.val() || {}).find(
        u => String(u.username) === String(username) && String(u.password) === String(password)
      );
      if (!user) throw new Error('Username หรือ Password ไม่ถูกต้อง');
      const safe = { ...user };
      delete safe.password;
      return safe;
    }

    case 'bootstrap': {
      const [usersSnap, catSnap, machSnap, repSnap, projSnap] = await Promise.all([
        get(ref(db, '/users')),
        get(ref(db, '/categories')),
        get(ref(db, '/machines')),
        get(ref(db, '/repairs')),
        get(ref(db, '/projects')),
      ]);
      const users = Object.values(usersSnap.val() || {}).map(u => {
        const x = { ...u }; delete x.password; return x;
      });
      const categories = Object.values(catSnap.val() || {});
      const machines = Object.values(machSnap.val() || {});
      const repairs = Object.values(repSnap.val() || {}).map(r => ({
        ...r,
        timeline: r.timeline ? Object.values(r.timeline) : [],
        photos: r.photos || [],
        afterPhotos: r.afterPhotos || [],
      }));
      const projects = Object.values(projSnap.val() || {});
      return { users, categories, machines, repairs, projects };
    }

    case 'createRepair': {
      const { repair } = payload;
      if (!repair.id) repair.id = await nextId('repairs', 'R', 4);
      const repSnap = await get(ref(db, '/repairs'));
      const count = Object.keys(repSnap.val() || {}).length + 1;
      repair.running = 'RE-69/' + String(count).padStart(3, '0');
      repair.createdAt = new Date().toISOString();
      repair.updatedAt = new Date().toISOString();
      repair.status = 'new';
      repair.photos = [];
      repair.afterPhotos = [];
      const tlRef = push(ref(db, '/repairs/' + repair.id + '/timeline'));
      repair.timeline = {
        [tlRef.key]: { id: tlRef.key, status: 'new', when: new Date().toISOString(), by: repair.reporterName || '', note: 'แจ้งเข้าระบบ' }
      };
      await set(ref(db, '/repairs/' + repair.id), repair);
      return { ...repair, timeline: Object.values(repair.timeline) };
    }

    case 'updateRepairStatus': {
      const { id, status, by, note, cost } = payload;
      const clean = { updatedAt: new Date().toISOString() };
      if (status !== undefined) clean.status = status;
      if (cost !== undefined) clean.cost = cost;
      const tlRef = push(ref(db, '/repairs/' + id + '/timeline'));
      clean['timeline/' + tlRef.key] = {
        id: tlRef.key, status: status || '', when: new Date().toISOString(), by: by || '', note: note || ''
      };
      await update(ref(db, '/repairs/' + id), clean);
      return { ok: true };
    }

    case 'createUser': {
      const { user } = payload;
      if (!user.id) user.id = await nextId('users', 'U', 3);
      user.createdAt = new Date().toISOString();
      await set(ref(db, '/users/' + user.id), user);
      const safe = { ...user };
      delete safe.password;
      return safe;
    }

    case 'updateUser': {
      const { id, patch } = payload;
      const upd = { ...patch };
      if (!upd.password) delete upd.password;
      await update(ref(db, '/users/' + id), upd);
      return { updated: true };
    }

    case 'deleteUser': {
      const { id } = payload;
      await remove(ref(db, '/users/' + id));
      return { deleted: true };
    }

    case 'createCategory': {
      const { cat } = payload;
      if (!cat.id) cat.id = await nextId('categories', 'C', 2);
      await set(ref(db, '/categories/' + cat.id), cat);
      return cat;
    }

    case 'updateCategory': {
      const { id, patch } = payload;
      await update(ref(db, '/categories/' + id), patch);
      return { updated: true };
    }

    case 'deleteCategory': {
      const { id } = payload;
      await remove(ref(db, '/categories/' + id));
      return { deleted: true };
    }

    case 'createMachine': {
      const { m } = payload;
      if (!m.id) m.id = await nextId('machines', 'M', 3);
      await set(ref(db, '/machines/' + m.id), m);
      return m;
    }

    case 'updateMachine': {
      const { id, patch } = payload;
      await update(ref(db, '/machines/' + id), patch);
      return { updated: true };
    }

    case 'deleteMachine': {
      const { id } = payload;
      await remove(ref(db, '/machines/' + id));
      return { deleted: true };
    }

    default:
      throw new Error('Unknown action: ' + action);
  }
}
