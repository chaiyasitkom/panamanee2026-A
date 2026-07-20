const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "defaultRole": "admin"
}/*EDITMODE-END*/;

function WorkspacePicker({user,onContinue,onLogout}){
  const erpSystems = window.__DATA.erpSystems || [];
  const projects = window.userProjects(user);
  const [step,setStep] = React.useState("system");
  const [erpId,setErpId] = React.useState("");
  const [project,setProject] = React.useState("");
  const selected = erpSystems.find(x=>x.id===erpId);
  const readySystems = erpSystems.filter(x=>x.status==="ready");
  const inProject = (item, projectName) => !projectName || !item?.project || item.project === projectName;
  const rowsForSystem = (sys, projectName="") => {
    const id = sys?.id;
    let rows = [];
    if(id==="repairs") rows = window.__DATA.repairs||[];
    else if(id==="assets") rows = window.__DATA.machines||[];
    else if(id==="consume") rows = window.__DATA.withdrawals||[];
    else if(id==="hr-time") return window.__DATA.users||[];
    else return [];
    if(projectName) return rows.filter(x=>inProject(x, projectName));
    return window.filterByUserProjects(user, rows, "project");
  };
  const linkedStats = (projectName="") => ({
    repairs:(window.__DATA.repairs||[]).filter(x=>inProject(x, projectName)).length,
    assets:(window.__DATA.machines||[]).filter(x=>inProject(x, projectName)).length,
    users:(window.__DATA.users||[]).length,
    withdrawals:(window.__DATA.withdrawals||[]).filter(x=>inProject(x, projectName)).length,
  });
  const systemLine = (sys) => {
    const stats = linkedStats("");
    if(sys.id==="repairs") return `${stats.repairs} ใบงาน · เชื่อม Asset ${stats.assets} รายการ`;
    if(sys.id==="assets") return `${stats.assets} รายการ · เชื่อมงานซ่อม ${stats.repairs} ใบงาน`;
    if(sys.id==="production") return `เตรียมเชื่อม Asset ${stats.assets} รายการ`;
    if(sys.id==="consume") return `เตรียมเชื่อมสต๊อก/เบิกจ่าย ${stats.withdrawals} รายการ`;
    if(sys.id==="pc") return `เตรียมเชื่อมผู้ใช้งาน ${stats.users} คน`;
    if(sys.id==="hr-time") return `เชื่อมข้อมูลผู้ใช้งาน ${stats.users} คน`;
    return "พร้อมเชื่อมข้อมูล";
  };
  const optionCount = (projectName) => selected ? rowsForSystem(selected, projectName).length : 0;
  const projectOptions = [{value:"",label:`ดูจัดการทั้งหมด${selected ? ` (${optionCount("")} รายการ)` : ""}`}].concat(
    projects.map(p=>({value:p,label:`${p}${selected ? ` (${optionCount(p)} รายการ)` : ""}`}))
  );
  const selectedProjectLabel = projectOptions.find(p=>p.value===project)?.label || "ดูจัดการทั้งหมด";
  const currentStats = linkedStats(project);

  const submit = (e) => {
    e.preventDefault();
    if(!selected || selected.status!=="ready"){
      Swal.fire({icon:"warning",title:"กรุณาเลือกระบบงานที่พร้อมใช้งาน"});
      return;
    }
    onContinue({erp:selected, project, projectLabel:selectedProjectLabel});
  };

  const selectSystem = (sys) => {
    if(sys.status!=="ready"){
      Swal.fire({icon:"info",title:"ระบบนี้รอพัฒนา",text:sys.name});
      return;
    }
    setErpId(sys.id);
    setStep("project");
  };

  return (
    <div className="login-wrap">
      <div className="login-brand">
        <div className="grid-bg"></div>
        <div className="login-logo">
          <div className="mark"><i className="fa-solid fa-layer-group"></i></div>
          <div style={{lineHeight:1.3}}>
            <div>ศูนย์ระบบงาน</div>
            <div style={{fontSize:12,fontWeight:300,color:"rgba(255,255,255,.6)",marginTop:2}}>เลือกงานและโครงการ</div>
          </div>
        </div>
        <div className="login-hero">
          <h1>{step==="system" ? "เลือกระบบงาน" : "เลือกโครงการ"}<br/>ก่อนเข้าใช้งาน</h1>
          <p>{step==="system" ? "เลือกว่าจะเข้าใช้งานระบบใด รายการที่รอพัฒนาจะแสดงไว้เพื่อเตรียมต่อยอดในอนาคต" : "เลือกโครงการที่ต้องการทำงาน หรือเลือกดูจัดการทั้งหมดตามสิทธิ์ของบัญชีนี้"}</p>
          <div className="chips">
            <span className="chip"><i className="fa-solid fa-user-check" style={{marginRight:6}}></i>{user.name}</span>
            <span className="chip"><i className="fa-solid fa-shield-halved" style={{marginRight:6}}></i>{user.role}</span>
            {selected && <span className="chip"><i className={`fa-solid ${selected.icon}`} style={{marginRight:6}}></i>{selected.name}</span>}
          </div>
        </div>
        <div className="login-foot">Repair Management System</div>
      </div>
      <div className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          {step==="system" ? (
            <>
              <h2>เลือกระบบงาน</h2>
              <p className="sub">ระบบที่พร้อมใช้งานเลือกต่อได้ทันที</p>
              <div style={{display:"grid",gap:10,marginBottom:16}}>
                {erpSystems.map(s=>{
                  const ready = s.status==="ready";
                  return (
                    <button key={s.id} type="button" onClick={()=>selectSystem(s)}
                      style={{display:"flex",alignItems:"center",gap:12,textAlign:"left",padding:"13px 14px",border:"1.5px solid var(--line)",borderRadius:10,background:ready?"#fff":"#F8FAFC",color:ready?"var(--text)":"var(--muted)",opacity:ready?1:.75}}>
                      <span style={{width:38,height:38,borderRadius:10,display:"grid",placeItems:"center",background:ready?"var(--accent-soft)":"var(--line-soft)",color:ready?"var(--primary)":"var(--muted)",flex:"0 0 auto"}}>
                        <i className={`fa-solid ${s.icon}`}></i>
                      </span>
                      <span style={{flex:1,minWidth:0}}>
                        <span style={{display:"flex",alignItems:"center",gap:8,fontWeight:600}}>
                          {s.name}
                          {!ready && <span className="badge" style={{fontSize:11,background:"#FEF3C7",color:"#92400E"}}>รอพัฒนา</span>}
                        </span>
                        <span style={{display:"block",fontSize:12.5,color:"var(--muted)",marginTop:2}}>{s.desc}</span>
                        <span style={{display:"block",fontSize:12,color:ready?"var(--primary)":"var(--muted)",marginTop:4}}>
                          <i className="fa-solid fa-link" style={{marginRight:5}}></i>{systemLine(s)}
                        </span>
                      </span>
                      {ready && <i className="fa-solid fa-chevron-right" style={{color:"var(--muted)"}}></i>}
                    </button>
                  );
                })}
              </div>
              {readySystems.length===0 && <div style={{fontSize:13,color:"var(--danger)",marginBottom:14}}>ยังไม่มีระบบที่พร้อมใช้งาน</div>}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={()=>setStep("system")} style={{marginBottom:14}}>
                <i className="fa-solid fa-arrow-left"></i> กลับไปเลือกระบบงาน
              </button>
              <h2>{selected?.name || "เลือกระบบงาน"}</h2>
              <p className="sub">เลือกโครงการที่จะเข้าใช้งาน หรือดูจัดการทั้งหมด</p>
              <div className="field">
                <label>โครงการ</label>
                <i className="fa-solid fa-diagram-project"></i>
                <select value={project} onChange={e=>setProject(e.target.value)} style={{width:"100%",padding:"13px 14px 13px 42px",border:"1.5px solid var(--line)",borderRadius:10,background:"#fff",outline:"none"}}>
                  {projectOptions.map(p=><option key={p.value || "__all"} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {projects.length===0 && <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>ไม่มีโครงการแยกในระบบ จะเข้าเป็นมุมมองจัดการทั้งหมด</div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,margin:"0 0 14px"}}>
                {[
                  {label:"งานซ่อม",value:currentStats.repairs,icon:"fa-screwdriver-wrench"},
                  {label:"Asset",value:currentStats.assets,icon:"fa-boxes-stacked"},
                  {label:"ผู้ใช้งาน",value:currentStats.users,icon:"fa-users"},
                ].map(x=>(
                  <div key={x.label} style={{border:"1px solid var(--line)",borderRadius:10,padding:"10px 11px",background:"#fff"}}>
                    <div style={{fontSize:12,color:"var(--muted)",display:"flex",alignItems:"center",gap:6}}><i className={`fa-solid ${x.icon}`}></i>{x.label}</div>
                    <div style={{fontSize:20,fontWeight:700,marginTop:2}}>{x.value.toLocaleString("th-TH")}</div>
                  </div>
                ))}
              </div>
              <button className="login-btn" type="submit"><i className="fa-solid fa-arrow-right-to-bracket"></i> เข้าใช้งาน</button>
            </>
          )}
          <button className="btn btn-ghost" type="button" onClick={onLogout} style={{width:"100%",marginTop:10}}>ออกจากระบบ</button>
        </form>
      </div>
    </div>
  );
}

function App(){
  const [user,setUser] = React.useState(null);
  const [workspace,setWorkspace] = React.useState(null);
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
    if(booting) return;
    const s = localStorage.getItem("rms_user");
    if(s){
      try{
        const u = JSON.parse(s);
        const fresh = window.__DATA.users.find(x=>x.id===u.id);
        if(fresh) {
          setUser(fresh);
          const ws = localStorage.getItem("rms_workspace");
          if(ws) {
            const parsed = JSON.parse(ws);
            window.__DATA.activeErp = parsed.erp;
            window.__DATA.activeProject = parsed.project;
            setWorkspace(parsed);
          }
        }
      }catch(e){}
    }
  },[booting]);

  const login = (u) => {
    setUser(u); localStorage.setItem("rms_user",JSON.stringify(u));
    setWorkspace(null); localStorage.removeItem("rms_workspace");
    setPage(["Admin","Officer","Director"].includes(u.role) ? "dashboard" : u.role==="Technician" ? "dashboard" : "r-dashboard");
  };
  const enterWorkspace = (ws) => {
    window.__DATA.activeErp = ws.erp;
    window.__DATA.activeProject = ws.project;
    setWorkspace(ws);
    localStorage.setItem("rms_workspace", JSON.stringify(ws));
    if(ws.erp?.startPage) {
      setPage(ws.erp.startPage);
    } else {
      setPage(["Admin","Officer","Director"].includes(user.role) ? "dashboard" : user.role==="Technician" ? "dashboard" : "r-dashboard");
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
      title:"ออกจากระบบ?",
      icon:"question",
      showCancelButton:true,
      confirmButtonText:"ออกจากระบบ",
      cancelButtonText:"ยกเลิก",
      confirmButtonColor:"#EF4444"
    }).then(r=>{
      if(r.isConfirmed){
        setUser(null); localStorage.removeItem("rms_user");
        setWorkspace(null); localStorage.removeItem("rms_workspace");
        window.__DATA.activeErp = null;
        window.__DATA.activeProject = "";
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
      clearWorkspace();
      setPage(["Admin","Officer","Director"].includes(u.role) ? "dashboard" : u.role==="Technician" ? "dashboard" : "r-dashboard");
    } else {
      Swal.fire({icon:"warning",title:"ไม่พบบัญชี",text:`ไม่พบ username "${username}" ใน Firebase`});
    }
  };

  const roleKey = (u) => ({Admin:"admin",Officer:"officer",Technician:"tech",Reporter:"user",Engineer:"user",Director:"director"})[u?.role];

  if(booting) return <div style={{display:"grid",placeItems:"center",minHeight:"100vh",gap:14,background:"var(--bg)",fontFamily:"Kanit"}}>
    <div className="spinner" style={{width:40,height:40,borderWidth:4}}></div>
    <div style={{color:"var(--muted)"}}>กำลังเชื่อมต่อ Firebase...</div>
  </div>;
  if(bootErr) return <div style={{display:"grid",placeItems:"center",minHeight:"100vh",padding:20,background:"var(--bg)"}}>
    <div className="card" style={{maxWidth:520,padding:28,textAlign:"center"}}>
      <i className="fa-solid fa-triangle-exclamation" style={{fontSize:36,color:"var(--danger)",marginBottom:10}}></i>
      <h3 style={{margin:"0 0 6px"}}>เชื่อมต่อ Backend ไม่สำเร็จ</h3>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:14,wordBreak:"break-word"}}>{bootErr}</div>
      <div style={{color:"var(--muted)",fontSize:12.5,textAlign:"left",background:"#FAFBFC",border:"1px solid var(--line)",borderRadius:10,padding:14}}>
        <div style={{fontWeight:500,color:"var(--text)",marginBottom:6}}>ตรวจสอบ:</div>
        1. Firebase Realtime Database Rules อนุญาต read/write แล้วหรือยัง?<br/>
        2. Firebase config ใน <span className="mono">src/config.jsx</span> ถูกต้องหรือยัง?<br/>
        3. เชื่อมต่ออินเตอร์เน็ตอยู่หรือไม่?
      </div>
      <button className="btn btn-primary" style={{marginTop:14}} onClick={()=>location.reload()}><i className="fa-solid fa-rotate"></i> ลองใหม่</button>
    </div>
  </div>;
  if(!user) return <Login onLogin={login}/>;
  if(!workspace) return <WorkspacePicker user={user} onContinue={enterWorkspace} onLogout={()=>{setUser(null);setWorkspace(null);localStorage.removeItem("rms_user");localStorage.removeItem("rms_workspace");window.__DATA.activeErp=null;window.__DATA.activeProject="";}}/>;

  const activeUser = {...user, activeErp:workspace.erp, activeProject:workspace.project};
  const systemId = workspace.erp?.id || "repairs";
  const allowedPages = systemId==="assets"
    ? ["machines"]
    : ["dashboard","repairs","machines","users","categories","r-dashboard","r-new","r-mine"];
  const safePage = allowedPages.includes(page) ? page : (workspace.erp?.startPage || allowedPages[0]);

  const pageTitles = {
    "dashboard":{t:"แดชบอร์ด",c:"ภาพรวมและสถิติงานซ่อม"},
    "repairs":{t:"รายการแจ้งซ่อม",c:"จัดการและติดตามงานซ่อมทั้งหมด"},
    "users":{t:"จัดการผู้ใช้งาน",c:"Users · เพิ่ม / แก้ไข / ลบ"},
    "categories":{t:"จัดการหมวดหมู่งาน",c:"Categories · เพิ่ม / แก้ไข / ลบ"},
    "machines":{t:"ทะเบียนเครื่องจักร",c:"Machines · ข้อมูลจาก Firebase"},
    "r-dashboard":{t:"แดชบอร์ด",c:"สรุปงานแจ้งซ่อมของฉัน"},
    "r-new":{t:"แจ้งซ่อมใหม่",c:"กรอกแบบฟอร์มแจ้งซ่อม"},
    "r-mine":{t:"ติดตามสถานะ",c:"รายการแจ้งซ่อมของฉัน"},
  };
  const pt = pageTitles[safePage] || pageTitles.dashboard;

  const renderPage = () => {
    if(safePage==="dashboard") return <Dashboard user={activeUser} goTo={setPage}/>;
    if(safePage==="repairs") return <Repairs user={activeUser}/>;
    if(safePage==="users") return <Users user={activeUser}/>;
    if(safePage==="categories") return <Categories user={activeUser}/>;
    if(safePage==="machines") return <Machines user={activeUser}/>;
    if(safePage==="r-dashboard") return <ReporterDashboard user={activeUser} goTo={setPage}/>;
    if(safePage==="r-new") return <NewRequest user={activeUser} goTo={setPage}/>;
    if(safePage==="r-mine") return <MyRepairs user={activeUser}/>;
    return null;
  };

  const currentRoleKey = roleKey(user);

  return (
    <div className="shell">
      <button className="sidebar-toggle" onClick={()=>setSbOpen(true)}><i className="fa-solid fa-bars"></i></button>
      <Sidebar user={activeUser} active={safePage} onNav={setPage} onLogout={logout} open={sbOpen} onClose={()=>setSbOpen(false)}/>
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
            <button className="btn btn-ghost" title={`${workspace.erp?.name || "ระบบงาน"} · ${workspace.projectLabel || workspace.project || "ดูจัดการทั้งหมด"}`} onClick={clearWorkspace} style={{maxWidth:320,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              <i className={`fa-solid ${workspace.erp?.icon || "fa-layer-group"}`}></i> {workspace.erp?.name || "ระบบงาน"} · {workspace.projectLabel || workspace.project || "ดูจัดการทั้งหมด"}
            </button>
            {(safePage==="repairs" && systemId==="repairs" && ["Admin","Officer"].includes(user.role)) && (
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
