function ReporterDashboard({user,goTo}){
  // Engineer เห็นทุกรายการในโครงการที่ได้รับสิทธิ์; Reporter เห็นเฉพาะของตัวเอง
  const mine = React.useMemo(()=>{
    if(user.role==="Engineer"){
      return window.filterByUserProjects(user, window.__DATA.repairs, "project");
    }
    return window.__DATA.repairs.filter(r=>r.reporterId===user.id);
  },[user]);
  const counts = {
    all: mine.length,
    progress: mine.filter(r=>["progress","assess","new"].includes(r.status)).length,
    parts: mine.filter(r=>r.status==="parts").length,
    done: mine.filter(r=>r.status==="done").length,
  };
  const recent = mine.slice(0,5);
  const stats = [
    { label:"รายการทั้งหมด", val:counts.all, icon:"fa-clipboard-list", color:"#3B82F6" },
    { label:"กำลังดำเนินการ", val:counts.progress, icon:"fa-screwdriver-wrench", color:"#F59E0B" },
    { label:"รออะไหล่", val:counts.parts, icon:"fa-box-open", color:"#EF4444" },
    { label:"เสร็จสิ้น", val:counts.done, icon:"fa-circle-check", color:"#10B981" },
  ];
  return (
    <>
      <div className="stat-grid">
        {stats.map((s,i)=>(
          <div className="stat" key={i}>
            <div className="ic" style={{background:s.color+"1a",color:s.color}}><i className={`fa-solid ${s.icon}`}></i></div>
            <div className="label">{s.label}</div>
            <div className="val">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:18}}>
        <div className="card-body" style={{display:"flex",alignItems:"center",gap:22,flexWrap:"wrap"}}>
          <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#3B82F6,#1E40AF)",color:"#fff",display:"grid",placeItems:"center",fontSize:24}}>
            <i className="fa-solid fa-circle-plus"></i>
          </div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:17,fontWeight:600,marginBottom:4}}>พบปัญหาเครื่องจักร?</div>
            <div style={{color:"var(--muted)",fontSize:13.5}}>แจ้งซ่อมได้ทันที ระบบจะส่งต่อให้ช่างประเมินและดำเนินการ</div>
          </div>
          <button className="btn btn-primary" onClick={()=>goTo("r-new")}>
            <i className="fa-solid fa-plus"></i> แจ้งซ่อมใหม่
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div><h3>งานแจ้งซ่อมล่าสุดของฉัน</h3><div className="sub">{mine.length} รายการทั้งหมด</div></div>
          <button className="btn btn-ghost btn-sm" onClick={()=>goTo("r-mine")}>ดูทั้งหมด <i className="fa-solid fa-arrow-right"></i></button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>เลขที่</th><th>วันที่</th><th>อาการ</th><th>หมวดหมู่</th><th>สถานะ</th></tr></thead>
            <tbody>
              {recent.map(r=>(
                <tr key={r.id}>
                  <td><span className="ticket-id">{r.running}</span></td>
                  <td style={{color:"var(--muted)",whiteSpace:"nowrap"}}>{window.__DATA.fmtDate(r.createdAt)}</td>
                  <td><div className="cell-title">{r.title}</div></td>
                  <td><CategoryChip categoryId={r.categoryId}/></td>
                  <td><Badge status={r.status}/></td>
                </tr>
              ))}
              {recent.length===0 && (
                <tr><td colSpan="5"><div className="empty">
                  <i className="fa-solid fa-clipboard"></i>
                  <div className="t">ยังไม่มีรายการ</div>
                  <div>คลิก "แจ้งซ่อมใหม่" เพื่อเริ่มต้น</div>
                </div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function NewRequest({user,goTo}){
  // โครงการ: ดึงเฉพาะจาก machines + จำกัดตามสิทธิ์ของ user
  const allProjects = React.useMemo(()=>{
    const all = Array.from(new Set((window.__DATA.machines||[]).map(m=>m.project).filter(Boolean)));
    if(window.userCanSeeAllProjects(user)) return all;
    const allowed = new Set(user.projects||[]);
    return all.filter(p=>allowed.has(p));
  },[user]);

  const [f,setF] = React.useState({title:"",desc:"",categoryId:"",project:"",machineCode:"",siteId:""});
  const [files,setFiles] = React.useState([]);
  const [loading,setLoading] = React.useState(false);
  const fileRef = React.useRef(null);

  // เครื่องจักร: กรองตามโครงการ + หมวดหมู่
  const projectMachines = React.useMemo(()=>{
    if(!f.project) return [];
    return (window.__DATA.machines||[]).filter(m=>m.project===f.project);
  },[f.project]);

  const filteredMachines = React.useMemo(()=>{
    if(!f.categoryId) return projectMachines;
    return projectMachines.filter(m=>m.categoryId===f.categoryId);
  },[projectMachines, f.categoryId]);

  // หมวดหมู่: ดึงเฉพาะหมวดที่มีในเครื่องจักรของโครงการที่เลือก
  const projectCategories = React.useMemo(()=>{
    const ids = new Set(projectMachines.map(m=>m.categoryId).filter(Boolean));
    return (window.__DATA.categories||[]).filter(c=>ids.has(c.id));
  },[projectMachines]);

  // เมื่อเปลี่ยนโครงการ ให้เคลียร์หมวดหมู่ + เครื่องจักรที่เลือก
  const onProjectChange = (p) => {
    setF(prev => ({...prev, project:p, categoryId:"", machineCode:""}));
  };

  const onCategoryChange = (cid) => {
    setF(prev => ({...prev, categoryId:cid, machineCode:""}));
  };

  const onMachineChange = (code) => {
    setF(prev => ({...prev, machineCode: code}));
  };

  const onFiles = (e) => {
    const list = Array.from(e.target.files||[]);
    setFiles([...files,...list.map(x=>({name:x.name,size:x.size,file:x,status:"ready"}))]);
  };
  const removeFile = (i) => setFiles(files.filter((_,idx)=>idx!==i));

  const submit = async () => {
    if(!f.project){
      Swal.fire({icon:"warning",title:"กรอกข้อมูลไม่ครบ",text:"กรุณาเลือกโครงการ/หน่วยงานก่อน"});
      return;
    }
    if(!f.categoryId){
      Swal.fire({icon:"warning",title:"กรอกข้อมูลไม่ครบ",text:"กรุณาเลือกหมวดหมู่"});
      return;
    }
    if(!f.title || !f.desc){
      Swal.fire({icon:"warning",title:"กรอกข้อมูลไม่ครบ",text:"กรุณาระบุอาการและรายละเอียดเพิ่มเติม"});
      return;
    }
    setLoading(true);
    try{
      const uploads = await Promise.all(files.map(x => window.fileToBase64(x.file)));
      const repair = {
        siteId:f.siteId,
        title:f.title, desc:f.desc,
        project:f.project, categoryId:f.categoryId,
        status:"new", reporterId:user.id, reporterName:user.name,
        assignedId:"", cost:"", machineCode:f.machineCode,
      };
      const saved = await window.api("createRepair", { repair, uploads });
      saved.createdAt = new Date(saved.createdAt);
      saved.timeline = [{status:"new",when:new Date(),by:user.name,note:"แจ้งเข้าระบบ"}];
      if(!Array.isArray(saved.photos)) saved.photos = [];
      if(!Array.isArray(saved.afterPhotos)) saved.afterPhotos = [];
      window.__DATA.repairs = [saved, ...window.__DATA.repairs];
      setLoading(false);
      Swal.fire({
        icon:"success",
        title:"แจ้งซ่อมสำเร็จ!",
        html:`เลขที่ใบแจ้งซ่อม: <strong class="mono" style="color:#1E40AF">${saved.running}</strong>`,
        confirmButtonColor:"#1E40AF"
      }).then(()=>goTo("r-mine"));
    }catch(err){
      setLoading(false);
      Swal.fire({icon:"error",title:"บันทึกไม่สำเร็จ",text:err.message});
    }
  };

  return (
    <>
    <Loading show={loading} text="กำลังบันทึก และอัพโหลดไฟล์..."/>
    <div className="card">
      <div className="card-h">
        <div>
          <h3>แบบฟอร์มแจ้งซ่อม</h3>
          <div className="sub">ระบบจะออกเลขที่ใบแจ้งซ่อมให้อัตโนมัติหลังส่งแบบฟอร์ม</div>
        </div>
      </div>
      <div className="card-body">
        {/* Step indicator */}
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          {[
            {n:1,l:"เลือกโครงการ",done:!!f.project},
            {n:2,l:"เลือกหมวดหมู่",done:!!f.categoryId,disabled:!f.project},
            {n:3,l:"เลือกเครื่องจักร",done:!!f.machineCode,disabled:!f.categoryId},
            {n:4,l:"รายละเอียดอาการ",done:!!f.title && !!f.desc,disabled:!f.machineCode},
          ].map(s=>(
            <div key={s.n} style={{
              display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:999,
              background:s.done?"rgba(16,185,129,.1)":s.disabled?"var(--bg)":"var(--accent-soft)",
              border:`1px solid ${s.done?"rgba(16,185,129,.3)":s.disabled?"var(--line)":"rgba(30,64,175,.2)"}`,
              color:s.done?"#047857":s.disabled?"var(--muted)":"var(--primary)",
              fontSize:13,fontWeight:500,opacity:s.disabled?0.55:1
            }}>
              <span style={{
                width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:11,
                background:s.done?"#10B981":s.disabled?"var(--line)":"var(--primary)",color:"#fff"
              }}>
                {s.done ? <i className="fa-solid fa-check"></i> : s.n}
              </span>
              {s.l}
            </div>
          ))}
        </div>

        <div className="form-grid">
          {/* STEP 1: โครงการ */}
          <div className="form-field full">
            <label>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <span style={{width:20,height:20,borderRadius:"50%",background:"var(--primary)",color:"#fff",fontSize:11,display:"inline-grid",placeItems:"center",fontWeight:600}}>1</span>
                โครงการ/หน่วยงาน *
              </span>
            </label>
            <select value={f.project} onChange={e=>onProjectChange(e.target.value)}>
              <option value="">— กรุณาเลือกโครงการ —</option>
              {allProjects.map(p=>(<option key={p} value={p}>{p}</option>))}
            </select>
            <div className="hint">เลือกโครงการก่อน เพื่อกรองหมวดหมู่และเครื่องจักรในโครงการนั้น</div>
          </div>

          {/* STEP 2: หมวดหมู่ */}
          <div className="form-field full">
            <label>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <span style={{width:20,height:20,borderRadius:"50%",background:f.project?"var(--primary)":"var(--line)",color:"#fff",fontSize:11,display:"inline-grid",placeItems:"center",fontWeight:600}}>2</span>
                หมวดหมู่ *
              </span>
            </label>
            <select value={f.categoryId} onChange={e=>onCategoryChange(e.target.value)} disabled={!f.project}>
              <option value="">
                {!f.project ? "— กรุณาเลือกโครงการก่อน —" : projectCategories.length===0 ? "— ไม่พบหมวดหมู่ในโครงการนี้ —" : "— เลือกหมวดหมู่ —"}
              </option>
              {projectCategories.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {f.project && projectCategories.length>0 && (
              <div className="hint">พบ {projectCategories.length} หมวดหมู่ในโครงการ "{f.project}"</div>
            )}
          </div>

          {/* STEP 3: เครื่องจักร */}
          <div className="form-field full">
            <label>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <span style={{width:20,height:20,borderRadius:"50%",background:f.categoryId?"var(--primary)":"var(--line)",color:"#fff",fontSize:11,display:"inline-grid",placeItems:"center",fontWeight:600}}>3</span>
                เครื่องจักร
              </span>
            </label>
            <select value={f.machineCode} onChange={e=>onMachineChange(e.target.value)} disabled={!f.categoryId}>
              <option value="">
                {!f.project ? "— กรุณาเลือกโครงการก่อน —" : !f.categoryId ? "— กรุณาเลือกหมวดหมู่ก่อน —" : filteredMachines.length===0 ? "— ไม่พบเครื่องจักร —" : "— เลือกเครื่องจักร —"}
              </option>
              {filteredMachines.map(m=>(
                <option key={m.id} value={m.code}>
                  {m.code} — {m.name}{m.brand?` (${m.brand}${m.model?` ${m.model}`:""})`:""}
                </option>
              ))}
            </select>
            {f.categoryId && filteredMachines.length>0 && (
              <div className="hint">พบ {filteredMachines.length} เครื่องจักรในหมวดหมู่นี้</div>
            )}
          </div>

          {/* STEP 4: รายละเอียด */}
          <div className="form-field full" style={{opacity:f.machineCode?1:0.5,pointerEvents:f.machineCode?"auto":"none"}}>
            <label>อาการ/ปัญหา *</label>
            <input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="เช่น มอเตอร์ไหม้ ใช้งานไม่ได้" />
          </div>
          <div className="form-field full" style={{opacity:f.machineCode?1:0.5,pointerEvents:f.machineCode?"auto":"none"}}>
            <label>เลขที่ใบแจ้งซ่อม (ที่ไซต์งาน)</label>
            <input value={f.siteId} onChange={e=>setF({...f,siteId:e.target.value})} placeholder="เช่น WR-1234" />
            <div className="hint">ไม่บังคับ · กรอกเลขที่จากใบงานจริงที่ไซต์</div>
          </div>
          <div className="form-field full" style={{opacity:f.machineCode?1:0.5,pointerEvents:f.machineCode?"auto":"none"}}>
            <label>รายละเอียดเพิ่มเติม *</label>
            <textarea value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} placeholder="อธิบายอาการ ลักษณะปัญหา ช่วงเวลาที่เกิด ผลกระทบต่อการผลิต..." />
          </div>

          <div className="form-field full" style={{opacity:f.machineCode?1:0.5,pointerEvents:f.machineCode?"auto":"none"}}>
            <label>รูปภาพ "ก่อนซ่อม" (บันทึกลง Google Drive)</label>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <button className="btn btn-ghost" type="button" onClick={()=>fileRef.current?.click()}>
                <i className="fa-solid fa-paperclip"></i> เลือกไฟล์
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*" style={{display:"none"}} onChange={onFiles}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>รองรับหลายไฟล์ · สูงสุด 10MB/ไฟล์</span>
            </div>
            {files.length>0 && (
              <div style={{border:"1px solid var(--line)",borderRadius:10,overflow:"hidden"}}>
                {files.map((x,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderBottom:i<files.length-1?"1px solid var(--line-soft)":""}}>
                    <i className="fa-regular fa-image" style={{color:"var(--primary)"}}></i>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.name}</div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{(x.size/1024).toFixed(1)} KB · จะอัพโหลดเมื่อกดส่ง</div>
                    </div>
                    <button className="ia danger" onClick={()=>removeFile(i)}><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{padding:"14px 22px",borderTop:"1px solid var(--line)",display:"flex",justifyContent:"flex-end",gap:10,background:"#FAFBFC"}}>
        <button className="btn btn-ghost" onClick={()=>goTo("r-dashboard")}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={submit}><i className="fa-solid fa-paper-plane"></i> ส่งคำร้องแจ้งซ่อม</button>
      </div>
    </div>
    </>
  );
}

function MyRepairs({user}){
  const [rows,setRows] = React.useState(()=>{
    if(user.role==="Engineer"){
      return window.filterByUserProjects(user, window.__DATA.repairs, "project");
    }
    return window.__DATA.repairs.filter(r=>r.reporterId===user.id);
  });
  const [detail,setDetail] = React.useState(null);

  const cancel = (r) => {
    Swal.fire({
      title:"ยกเลิกคำร้อง?",
      text:`ต้องการยกเลิกคำร้อง "${r.running}" ใช่หรือไม่?`,
      icon:"warning",
      showCancelButton:true,
      confirmButtonText:"ยกเลิกคำร้อง",
      cancelButtonText:"ไม่",
      confirmButtonColor:"#EF4444"
    }).then(async res=>{
      if(res.isConfirmed){
        try{
          await window.api("updateRepairStatus",{id:r.id,status:"cancel",by:user.name,note:"ผู้แจ้งยกเลิกคำร้อง"});
          const upd = rows.map(x=>x.id===r.id?{...x,status:"cancel",timeline:[...x.timeline,{status:"cancel",when:new Date(),by:user.name,note:"ผู้แจ้งยกเลิกคำร้อง"}]}:x);
          setRows(upd);
          window.__DATA.repairs = window.__DATA.repairs.map(x=>x.id===r.id?upd.find(y=>y.id===x.id):x);
          Swal.fire({icon:"success",title:"ยกเลิกแล้ว",timer:1200,showConfirmButton:false,toast:true,position:"top-end"});
        }catch(err){ Swal.fire({icon:"error",title:"ไม่สำเร็จ",text:err.message}); }
      }
    });
  };

  return (
    <>
      <div className="card">
        <div className="filters">
          <div style={{color:"var(--muted)",fontSize:13,alignSelf:"center"}}>
            คำร้องแจ้งซ่อมของฉัน ({rows.length} รายการ)
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>เลขที่</th><th>วันที่แจ้ง</th><th>อาการ/ปัญหา</th><th>หมวดหมู่</th><th>สถานะ</th><th>อัปเดตล่าสุด</th><th>จัดการ</th></tr></thead>
            <tbody>
              {rows.map(r=>{
                const last = r.timeline[r.timeline.length-1];
                return (
                  <tr key={r.id}>
                    <td><span className="ticket-id">{r.running}</span></td>
                    <td style={{color:"var(--muted)",whiteSpace:"nowrap"}}>{window.__DATA.fmtDate(r.createdAt)}</td>
                    <td><div className="cell-title">{r.title}</div></td>
                    <td><CategoryChip categoryId={r.categoryId}/></td>
                    <td><Badge status={r.status}/></td>
                    <td style={{color:"var(--muted)",fontSize:12,whiteSpace:"nowrap"}}>{window.__DATA.fmtDateTime(last.when)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="ia" onClick={()=>setDetail(r)}><i className="fa-solid fa-eye"></i></button>
                        {r.status==="new" && <button className="ia danger" onClick={()=>cancel(r)} title="ยกเลิกคำร้อง"><i className="fa-solid fa-ban"></i></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length===0 && (
                <tr><td colSpan="7"><div className="empty">
                  <i className="fa-solid fa-clipboard"></i>
                  <div className="t">ยังไม่มีคำร้อง</div>
                  <div>คลิก "แจ้งซ่อมใหม่" ในเมนูด้านซ้ายเพื่อเริ่มต้น</div>
                </div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {detail && <RepairDetail r={detail} user={user} onClose={()=>setDetail(null)} onQuick={()=>{}}/>}
    </>
  );
}

Object.assign(window,{ReporterDashboard,NewRequest,MyRepairs});
