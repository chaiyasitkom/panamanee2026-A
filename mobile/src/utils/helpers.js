const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ${h}:${m}`;
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// อาการ/ปัญหา หลายรายการ + สถานะรายอาการ (backcompat: ใบเก่าที่มีแต่ title)
export function getProblems(r) {
  if (Array.isArray(r.problems) && r.problems.length) {
    return r.problems.map(p => ({ text: String(p.text || ''), status: p.status || r.status || 'new' }));
  }
  return String(r.title || '').split('\n').map(s => s.trim()).filter(Boolean)
    .map(t => ({ text: t, status: r.status || 'new' }));
}

export function getRepairPlace(r) {
  const base = { mode: '', onsite: '', other: '', reportAt: '', note: '' };
  const p = r.repairPlace;
  return (p && typeof p === 'object' && !Array.isArray(p)) ? { ...base, ...p } : base;
}

// รหัสโครงการจากชื่อโครงการ (โครงการที่ยังไม่ได้ตั้งรหัสจะได้ '')
export function getProjectCode(projects, name) {
  if (!name) return '';
  const p = (projects || []).find(x => (typeof x === 'string' ? x : x.name) === name);
  return (p && p.code) ? String(p.code) : '';
}

// ชื่อโครงการพร้อมรหัส เช่น "[PRJ-A1] โรงงาน A" (รหัสเดียวกับที่ใช้ออกเลขที่ใบแจ้งซ่อม)
export function projectLabel(projects, name) {
  if (!name) return '';
  const code = getProjectCode(projects, name);
  return code ? '[' + code + '] ' + name : name;
}

const PALETTE = ['#3B82F6','#8B5CF6','#EF4444','#10B981','#F59E0B','#06B6D4','#EC4899'];
export function avatarColor(name) {
  if (!name) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFF;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
