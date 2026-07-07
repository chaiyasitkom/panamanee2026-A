function Sidebar({user,active,onNav,onLogout,open,onClose}){
  const isAdminish = ["Admin","Officer","Director"].includes(user.role);
  const isTech = user.role==="Technician";
  const isReporter = user.role==="Reporter" || user.role==="Engineer";
  const systemId = user.activeErp?.id || "repairs";

  const adminNav = [
    { key:"dashboard", icon:"fa-gauge-high", label:"แดชบอร์ด" },
    { key:"repairs", icon:"fa-clipboard-list", label:"รายการแจ้งซ่อม", badge: window.__DATA.repairs.filter(r=>["new","assess"].includes(r.status)).length },
    { key:"users", icon:"fa-users-gear", label:"จัดการผู้ใช้งาน" },
    { key:"categories", icon:"fa-tags", label:"จัดการหมวดหมู่" },
  ];
  const techNav = [
    { key:"dashboard", icon:"fa-gauge-high", label:"แดชบอร์ด" },
    { key:"repairs", icon:"fa-clipboard-list", label:"งานที่รับผิดชอบ" },
  ];
  const reporterNav = [
    { key:"r-dashboard", icon:"fa-gauge-high", label:"แดชบอร์ด" },
    { key:"r-new", icon:"fa-circle-plus", label:"แจ้งซ่อมใหม่" },
    { key:"r-mine", icon:"fa-clipboard-check", label:"ติดตามสถานะ" },
  ];
  const assetNav = [
    { key:"machines", icon:"fa-boxes-stacked", label:"Asset" },
  ];
  const nav = systemId==="assets" ? assetNav : isAdminish ? adminNav : isTech ? techNav : reporterNav;

  return (
    <>
      {open && <div className="sidebar-scrim show" onClick={onClose}></div>}
      <aside className={`sidebar ${open?"open":""}`}>
          <div className="brand">
          <div className="mark"><i className={`fa-solid ${user.activeErp?.icon || "fa-screwdriver-wrench"}`}></i></div>
          <div className="t">
            {user.activeErp?.name || "ระบบแจ้งซ่อม"}
            <small>{systemId==="assets" ? "Asset Management" : "Machine Repair"}</small>
          </div>
        </div>
        <nav className="nav">
          <div className="section">เมนูหลัก</div>
          {nav.map(n=>(
            <div key={n.key} className={`nav-item ${active===n.key?"active":""}`} onClick={()=>{onNav(n.key); onClose&&onClose();}}>
              <i className={`fa-solid ${n.icon}`}></i>
              <span>{n.label}</span>
              {n.badge>0 && <span className="badge">{n.badge}</span>}
            </div>
          ))}
          <div className="section">ทั่วไป</div>
          <div className="nav-item"><i className="fa-solid fa-bell"></i><span>การแจ้งเตือน</span><span className="badge">3</span></div>
          <div className="nav-item"><i className="fa-solid fa-gear"></i><span>ตั้งค่า</span></div>
          <div className="nav-item"><i className="fa-solid fa-circle-question"></i><span>ช่วยเหลือ</span></div>
        </nav>
        <div className="me">
          <div className="avatar">{window.initials(user.name)}</div>
          <div className="who">
            <div className="name">{user.name}</div>
            <div className="role">{user.role} · {user.dept}</div>
          </div>
          <button className="logout" onClick={onLogout} title="ออกจากระบบ"><i className="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </aside>
    </>
  );
}
window.Sidebar = Sidebar;
