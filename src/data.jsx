// Data layer — connects to Firebase Realtime Database
// Keeps the same window.__DATA shape + helpers so existing UI works unchanged.

const STATUSES = [
  { key:"new",      label:"ใหม่",             className:"b-new",      icon:"fa-circle-plus" },
  { key:"assess",   label:"รอประเมินราคา",    className:"b-assess",   icon:"fa-magnifying-glass-dollar" },
  { key:"progress", label:"กำลังดำเนินการ",  className:"b-progress", icon:"fa-screwdriver-wrench" },
  { key:"parts",    label:"รอชิ้นส่วน",       className:"b-parts",    icon:"fa-box-open" },
  { key:"done",     label:"เสร็จสมบูรณ์",    className:"b-done",     icon:"fa-circle-check" },
  { key:"cancel",   label:"ยกเลิก",           className:"b-cancel",   icon:"fa-ban" },
];

const PROJECTS = [
  "โรงงาน A - สายการผลิต 1","โรงงาน A - สายการผลิต 2","โรงงาน B - ห้องบรรจุ",
  "โรงงาน B - คลังสินค้า","ไซต์ก่อสร้าง ลาดกระบัง","ไซต์ก่อสร้าง บางนา",
  "สำนักงานใหญ่ - ชั้น 3","สำนักงานใหญ่ - ห้องเซิร์ฟเวอร์","โรงงาน C - แผนก QC"
];

function fmtDate(d){ if(!d) return ""; if(typeof d==="string") d=new Date(d); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtDateTime(d){ if(!d) return ""; if(typeof d==="string") d=new Date(d); return `${fmtDate(d)} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

// Initial empty state — will be populated by bootstrap()
window.__DATA = {
  users: [],
  categories: [],
  machines: [],
  repairs: [],
  statuses: STATUSES,
  projects: PROJECTS,
  fmtDate, fmtDateTime
};

window.__DATA.bootstrap = async function(){
  const d = await window.api("bootstrap");
  // normalize
  (d.repairs||[]).forEach(r=>{
    r.createdAt = r.createdAt ? new Date(r.createdAt) : new Date();
    if (!Array.isArray(r.timeline)) r.timeline = [];
    r.timeline.forEach(t => { if(t.when) t.when = new Date(t.when); });
    r.timeline.sort((a,b) => (a.when||0) - (b.when||0));
  });
  (d.repairs||[]).sort((a,b) => b.createdAt - a.createdAt);

  window.__DATA.users      = d.users      || [];
  window.__DATA.categories = d.categories || [];
  window.__DATA.machines   = d.machines   || [];
  window.__DATA.repairs    = d.repairs    || [];
  return window.__DATA;
};

// helpers
window.getStatus = (key) => STATUSES.find(s=>s.key===key) || STATUSES[0];
window.getCategory = (id) => window.__DATA.categories.find(c=>c.id===id) || {name:"-",color:"#64748B",icon:"fa-circle"};
window.getUser = (id) => window.__DATA.users.find(u=>u.id===id);

// ====== PROJECT ACCESS CONTROL ======
// ถ้า user.projects ว่างหรือเป็น Admin/Director → เห็นทุกโครงการ
// ถ้าไม่ใช่ → เห็นเฉพาะโครงการที่อยู่ใน user.projects
window.userCanSeeAllProjects = (user) => {
  if(!user) return false;
  if(["Admin","Director"].includes(user.role)) return true;
  // Engineer → จำกัดเฉพาะโครงการที่ระบุเท่านั้น (ถ้าไม่ได้ระบุ = ไม่เห็นโครงการใดเลย)
  if(user.role==="Engineer") return false;
  // Officer/Technician/Reporter → ถ้าไม่มี projects ระบุไว้ (ว่าง) ให้เห็นทุกโครงการ (backward-compat)
  return !user.projects || !Array.isArray(user.projects) || user.projects.length===0;
};
window.userProjects = (user) => {
  if(!user) return [];
  if(window.userCanSeeAllProjects(user)) {
    // คืนรายการโครงการที่มีในระบบทั้งหมด (จาก machines)
    return Array.from(new Set((window.__DATA.machines||[]).map(m=>m.project).filter(Boolean)));
  }
  return Array.isArray(user.projects) ? user.projects : [];
};
window.userCanSeeProject = (user, project) => {
  if(window.userCanSeeAllProjects(user)) return true;
  if(!project) return true; // data ที่ไม่ระบุโครงการ ให้เห็นได้
  return (user.projects||[]).includes(project);
};
window.filterByUserProjects = (user, items, projectKey="project") => {
  if(window.userCanSeeAllProjects(user)) return items;
  const allowed = new Set(user.projects||[]);
  return items.filter(x => !x[projectKey] || allowed.has(x[projectKey]));
};

window.avatarColor = (name) => {
  const colors=["#3B82F6","#8B5CF6","#EF4444","#10B981","#F59E0B","#06B6D4","#EC4899","#6366F1"];
  let h=0; for(const c of (name||"")) h=(h*31+c.charCodeAt(0))>>>0;
  return colors[h%colors.length];
};
window.initials = (name) => (name||"").split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase();
