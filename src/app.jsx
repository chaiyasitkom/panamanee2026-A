const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "defaultRole": "admin"
}/*EDITMODE-END*/;

function App(){
  const [user,setUser] = React.useState(null);
  const [page,setPage] = React.useState("dashboard");
  const [sbOpen,setSbOpen] = React.useState(false);
  const [tweakOpen,setTweakOpen] = React.useState(false);
  const [density,setDensity] = React.useState(TWEAK_DEFAULTS.density);
  const [booting,setBooting] = React.useState(true);
  const [bootErr,setBootErr] = React.useState(null);

  React.useEffect(()=>{
    (async()=>{
      try{
        await window.__DATA.bootstrap();
        setBooting(false);
      }catch(err){
        setBootErr(err.message||String(err));
        setBooting(false);
      }
    })();
  },[]);

  // enable edit mode toggle
  React.useEffect(()=>{
    const h = (e) => {
      if(e.data?.type==="__activate_edit_mode") setTweakOpen(true);
      else if(e.data?.type==="__deactivate_edit_mode") setTweakOpen(false);
    };
    window.addEventListener("message",h);
    window.parent.postMessage({type:"__edit_mode_available"},"*");
    return ()=>window.removeEventListener("message",h);
  },[]);

  React.useEffect(()=>{
    document.body.classList.toggle("density-compact",density==="compact");
  },[density]);

  // persisted session
  React.useEffect(()=>{
    const s = localStorage.getItem("rms_user");
    if(s){
      try{
        const u = JSON.parse(s);
        const fresh = window.__DATA.users.find(x=>x.id===u.id);
        if(fresh) setUser(fresh);
      }catch(e){}
    }
  },[]);

  const login = (u) => {
    setUser(u); localStorage.setItem("rms_user",JSON.stringify(u));
    setPage(["Admin","Officer","Director"].includes(u.role) ? "dashboard" : u.role==="Technician" ? "dashboard" : "r-dashboard");
  };
  const logout = () => {
    Swal.fire({
      title:"ออกจากระบบ?",
      icon:"question",
      showCancelButton:true,
      confirmButtonText:"ออกจากระบบ",
      cancelButtonText:"ยกเลิก",
      confirmButtonColor:"#EF4444"
    }).then(r=>{
      if(r.isConfirmed){
        setUser(null); localStorage.removeItem("rms_user");
      }
    });
  };

  const switchRole = (key) => {
    const map = {admin:"admin",officer:"officer",tech:"tech",user:"user",director:"director"};
    const username = map[key]||"admin";
    const u = window.__DATA.users.find(x=>x.username===username);
    if(u){
      setUser(u);
      localStorage.setItem("rms_user",JSON.stringify(u));
      setPage(["Admin","Officer","Director"].includes(u.role) ? "dashboard" : u.role==="Technician" ? "dashboard" : "r-dashboard");
    } else {
      Swal.fire({icon:"warning",title:"ไม่พบบัญชี",text:`ไม่พบ username "${username}" ใน Google Sheet · ลอง run setupSheets ใน Apps Script`});
    }
  };

  const roleKey = (u) => ({Admin:"admin",Officer:"officer",Technician:"tech",Reporter:"user",Engineer:"user",Director:"director"})[u?.role];

  if(booting) return <div style={{display:"grid",placeItems:"center",minHeight:"100vh",gap:14,background:"var(--bg)",fontFamily:"Kanit"}}>
    <div className="spinner" style={{width:40,height:40,borderWidth:4}}></div>
    <div style={{color:"var(--muted)"}}>กำลังเชื่อมต่อ Google Sheets...</div>
  </div>;
  if(bootErr) return <div style={{display:"grid",placeItems:"center",minHeight:"100vh",padding:20,background:"var(--bg)"}}>
    <div className="card" style={{maxWidth:520,padding:28,textAlign:"center"}}>
      <i className="fa-solid fa-triangle-exclamation" style={{fontSize:36,color:"var(--danger)",marginBottom:10}}></i>
      <h3 style={{margin:"0 0 6px"}}>เชื่อมต่อ Backend ไม่สำเร็จ</h3>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:14,wordBreak:"break-word"}}>{bootErr}</div>
      <div style={{color:"var(--muted)",fontSize:12.5,textAlign:"left",background:"#FAFBFC",border:"1px solid var(--line)",borderRadius:10,padding:14}}>
        <div style={{fontWeight:500,color:"var(--text)",marginBottom:6}}>ตรวจสอบ:</div>
        1. รัน <span className="mono">setupSheets</span> ใน Apps Script แล้วหรือยัง?<br/>
        2. Deploy เป็น Web App และตั้ง <strong>"Anyone"</strong> access แล้วหรือยัง?<br/>
        3. URL ใน <span className="mono">src/config.jsx</span> ถูกต้องหรือยัง?
      </div>
      <button className="btn btn-primary" style={{marginTop:14}} onClick={()=>location.reload()}><i className="fa-solid fa-rotate"></i> ลองใหม่</button>
    </div>
  </div>;
  if(!user) return <Login onLogin={login}/>;

  const pageTitles = {
    "dashboard":{t:"แดชบอร์ด",c:"ภาพรวมและสถิติงานซ่อม"},
    "repairs":{t:"รายการแจ้งซ่อม",c:"จัดการและติดตามงานซ่อมทั้งหมด"},
    "users":{t:"จัดการผู้ใช้งาน",c:"Users · เพิ่ม / แก้ไข / ลบ"},
    "categories":{t:"จัดการหมวดหมู่งาน",c:"Categories · เพิ่ม / แก้ไข / ลบ"},
    "machines":{t:"ทะเบียนเครื่องจักร",c:"Machines · ข้อมูลจาก Google Drive"},
    "r-dashboard":{t:"แดชบอร์ด",c:"สรุปงานแจ้งซ่อมของฉัน"},
    "r-new":{t:"แจ้งซ่อมใหม่",c:"กรอกแบบฟอร์มแจ้งซ่อม"},
    "r-mine":{t:"ติดตามสถานะ",c:"รายการแจ้งซ่อมของฉัน"},
  };
  const pt = pageTitles[page] || pageTitles.dashboard;

  const renderPage = () => {
    if(page==="dashboard") return <Dashboard user={user} goTo={setPage}/>;
    if(page==="repairs") return <Repairs user={user}/>;
    if(page==="users") return <Users user={user}/>;
    if(page==="categories") return <Categories user={user}/>;
    if(page==="machines") return <Machines user={user}/>;
    if(page==="r-dashboard") return <ReporterDashboard user={user} goTo={setPage}/>;
    if(page==="r-new") return <NewRequest user={user} goTo={setPage}/>;
    if(page==="r-mine") return <MyRepairs user={user}/>;
    return null;
  };

  const currentRoleKey = roleKey(user);

  return (
    <div className="shell">
      <button className="sidebar-toggle" onClick={()=>setSbOpen(true)}><i className="fa-solid fa-bars"></i></button>
      <Sidebar user={user} active={page} onNav={setPage} onLogout={logout} open={sbOpen} onClose={()=>setSbOpen(false)}/>
      <main className="main">
        <div className="topbar">
          <div className="title">
            <h1>{pt.t}</h1>
            <div className="crumb">{pt.c}</div>
          </div>
          <div className="actions">
            <div className="search-input"><i className="fa-solid fa-magnifying-glass"></i><input placeholder="ค้นหาทั้งระบบ..."/></div>
            <button className="btn btn-icon btn-ghost" title="Tweaks" onClick={()=>setTweakOpen(v=>!v)}>
              <i className="fa-solid fa-sliders"></i>
            </button>
            {(page==="repairs" && ["Admin","Officer"].includes(user.role)) && (
              <button className="btn btn-primary" onClick={()=>setPage("r-new")}><i className="fa-solid fa-plus"></i> แจ้งซ่อมใหม่</button>
            )}
          </div>
        </div>
        {renderPage()}
      </main>
      <TweaksPanel open={tweakOpen} onClose={()=>setTweakOpen(false)}
        density={density} onDensityChange={setDensity}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
