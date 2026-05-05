function Machines({user}){
  const allowAll = window.userCanSeeAllProjects(user);
  const allowed = new Set(user.projects||[]);
  const visibleRows = React.useMemo(()=>(
    allowAll ? window.__DATA.machines : window.__DATA.machines.filter(m=>!m.project || allowed.has(m.project))
  ),[allowAll]);

  const [rows,setRows] = React.useState(visibleRows);
  const [q,setQ] = React.useState("");
  const [statusF,setStatusF] = React.useState("all");
  const [catF,setCatF] = React.useState("all");
  const [detail,setDetail] = React.useState(null);
  const [edit,setEdit] = React.useState(null);

  React.useEffect(()=>{ setRows(visibleRows); },[visibleRows]);

  const filtered = rows.filter(m=>{
    if(q){
      const qq=q.toLowerCase();
      const hay = [m.name,m.code,m.brand,m.model,m.serial,m.project].map(x=>(x||"").toLowerCase()).join(" ");
      if(!hay.includes(qq)) return false;
    }
    if(statusF!=="all" && m.status!==statusF) return false;
    if(catF!=="all" && m.categoryId!==catF) return false;
    return true;
  });

  const statusColor = (s) => ({"ใช้งาน":"#10B981","ซ่อม":"#EF4444","รอซ่อม":"#F59E0B"})[s] || "#64748B";

  const save = async (form) => {
    try{
      if(form.id){
        await window.api("updateMachine",{id:form.id, patch:form});
        const upd = rows.map(x=>x.id===form.id?form:x);
        setRows(upd); window.__DATA.machines = upd;
      } else {
        const nu = await window.api("createMachine",{m:form});
        const upd = [...rows, nu];
        setRows(upd); window.__DATA.machines = upd;
      }
      setEdit(null);
      Swal.fire({icon:"success",title:"บันทึกสำเร็จ",timer:1200,showConfirmButton:false,toast:true,position:"top-end"});
    }catch(err){ Swal.fire({icon:"error",title:"บันทึกไม่สำเร็จ",text:err.message}); }
  };

  const remove = (m) => {
    Swal.fire({
      title:"ลบเครื่องจักร?",
      html:`คุณต้องการลบ <strong>${m.name}</strong> (${m.code}) ใช่หรือไม่?`,
      icon:"warning",showCancelButton:true,confirmButtonColor:"#EF4444",
      confirmButtonText:"ลบ",cancelButtonText:"ยกเลิก"
    }).then(async r=>{
      if(r.isConfirmed){
        try{
          await window.api("deleteMachine",{id:m.id});
          const upd = rows.filter(x=>x.id!==m.id);
          setRows(upd); window.__DATA.machines = upd;
          setDetail(null);
          Swal.fire({icon:"success",title:"ลบแล้ว",timer:1000,showConfirmButton:false,toast:true,position:"top-end"});
        }catch(err){ Swal.fire({icon:"error",title:"ลบไม่สำเร็จ",text:err.message}); }
      }
    });
  };

  return (
    <>
    <div className="card" style={{marginBottom:18}}>
      <div className="filters">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="ค้นหา ชื่อ / รหัส / ยี่ห้อ / ซีเรียล / โครงการ..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)}>
          <option value="all">ทุกสถานะ</option>
          <option value="ใช้งาน">ใช้งานอยู่</option>
          <option value="ซ่อม">กำลังซ่อม</option>
          <option value="รอซ่อม">รอซ่อม</option>
        </select>
        <select value={catF} onChange={e=>setCatF(e.target.value)}>
          <option value="all">ทุกหมวดหมู่</option>
          {(window.__DATA.categories||[]).map(c=>(
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="spacer"></div>
        {["Admin","Officer"].includes(user.role) && (
          <button className="btn btn-primary" onClick={()=>setEdit({mode:"create",m:{id:"",project:"",code:"",name:"",brand:"",model:"",size:"",serial:"",ownership:"",categoryId:"",note:"",status:"ใช้งาน",location:"",lastService:window.__DATA.fmtDate(new Date()),hours:0,icon:"fa-gears"}})}>
            <i className="fa-solid fa-plus"></i> เพิ่มเครื่องจักร
          </button>
        )}
      </div>
    </div>

    <div className="machines-grid">
      {filtered.map(m=>{
        const cat = window.getCategory(m.categoryId);
        return (
        <div className="machine-card" key={m.id} onClick={()=>setDetail(m)}>
          <div className="machine-thumb">
            {<><div className="pattern"></div><div className="ic"><i className={`fa-solid ${m.icon||"fa-gears"}`}></i></div></>}
            {m.categoryId && <div className="drive-tag" style={{background:cat.color,color:"#fff"}}><i className={`fa-solid ${cat.icon}`}></i> {cat.name}</div>}
            <div className="status-dot" style={{background:statusColor(m.status)}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:"#fff"}}></span>{m.status}
            </div>
          </div>
          <div className="machine-info">
            <div className="n">{m.name}</div>
            <div className="m">{m.code}{m.brand?` · ${m.brand}`:""}{m.model?` ${m.model}`:""}</div>
            <div className="meta">
              <span><i className="fa-solid fa-diagram-project"></i> {m.project||"—"}</span>
              {m.ownership && <span><i className="fa-solid fa-handshake"></i> {m.ownership}</span>}
            </div>
          </div>
        </div>
        );
      })}
      {filtered.length===0 && (
        <div style={{gridColumn:"1/-1"}} className="card">
          <div className="empty">
            <i className="fa-solid fa-industry"></i>
            <div className="t">ยังไม่มีเครื่องจักรในระบบ</div>
            <div>{["Admin","Officer"].includes(user.role) ? "กดปุ่ม 'เพิ่มเครื่องจักร' ด้านบนเพื่อเริ่มต้น" : "รอผู้ดูแลระบบเพิ่มข้อมูล"}</div>
          </div>
        </div>
      )}
    </div>

    {detail && <MachineDetail m={detail} user={user} onClose={()=>setDetail(null)} onEdit={()=>{setEdit({mode:"edit",m:detail}); setDetail(null);}} onDelete={()=>remove(detail)} />}
    {edit && <MachineForm initial={edit.m} mode={edit.mode} onClose={()=>setEdit(null)} onSave={save} />}
    </>
  );
}

function MachineForm({initial,mode,onClose,onSave}){
  const [f,setF] = React.useState(initial);
  const [busy,setBusy] = React.useState(false);
  const projects = React.useMemo(()=>(window.__DATA.projects||[]).filter(p=>p.status!=="inactive"),[]);
  const up = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e?.preventDefault();
    if(!f.code?.trim() || !f.name?.trim()){
      Swal.fire({icon:"warning",title:"กรอกข้อมูลไม่ครบ",text:"กรุณากรอก รหัสเครื่องจักร และ ชื่อเครื่องจักร"});
      return;
    }
    setBusy(true);
    try{ await onSave({...f, hours:Number(f.hours)||0}); } finally { setBusy(false); }
  };

  const icons = ["fa-gears","fa-industry","fa-wind","fa-droplet","fa-snowflake","fa-bolt","fa-truck","fa-boxes-packing","fa-fan","fa-plug","fa-screwdriver-wrench","fa-gauge","fa-tractor","fa-helmet-safety"];

  return (
    <Modal open={true} onClose={onClose} size="lg"
      title={<><i className={`fa-solid ${mode==="edit"?"fa-pen-to-square":"fa-plus"}`} style={{marginRight:8,color:"var(--primary)"}}></i>{mode==="edit"?"แก้ไขเครื่องจักร":"เพิ่มเครื่องจักรใหม่"}</>}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? <><div className="spinner" style={{width:14,height:14,borderWidth:2}}></div> กำลังบันทึก...</> : <><i className="fa-solid fa-floppy-disk"></i> บันทึก</>}
        </button>
      </>}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field">
            <label>โครงการ</label>
            {projects.length===0 ? (
              <div style={{padding:"10px 12px",borderRadius:8,border:"1px dashed var(--line)",background:"#FFFBEB",fontSize:13,color:"#92400E"}}>
                <i className="fa-solid fa-triangle-exclamation" style={{marginRight:6}}></i>
                ยังไม่มีโครงการในระบบ — กรุณาเพิ่มโครงการในเมนู <strong>โครงการ</strong> ก่อน
              </div>
            ) : (
              <>
                <select value={f.project||""} onChange={e=>up("project",e.target.value)}>
                  <option value="">— เลือกโครงการ —</option>
                  {projects.map(p=>(<option key={p.id} value={p.name}>{p.code ? `[${p.code}] ` : ""}{p.name}</option>))}
                </select>
                {f.project && (()=>{
                  const proj = projects.find(p=>p.name===f.project);
                  return proj ? (
                    <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,background:(proj.color||"#3B82F6")+"22",color:proj.color||"#3B82F6",fontSize:12,fontWeight:500}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:proj.color||"#3B82F6"}}></span>
                      {proj.code && <span className="mono">{proj.code}</span>}
                      {proj.name}
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
          <div className="form-field">
            <label>รหัสเครื่องจักร *</label>
            <input value={f.code||""} onChange={e=>up("code",e.target.value)} placeholder="เช่น XCMG-001" />
          </div>
          <div className="form-field" style={{gridColumn:"1/-1"}}>
            <label>เครื่องจักร (ชื่อ) *</label>
            <input value={f.name||""} onChange={e=>up("name",e.target.value)} placeholder="เช่น Drilling Rig, เครื่องกลึง CNC" />
          </div>
          <div className="form-field">
            <label>ยี่ห้อ</label>
            <input value={f.brand||""} onChange={e=>up("brand",e.target.value)} placeholder="เช่น XCMG, Komatsu, HITACHI" />
          </div>
          <div className="form-field">
            <label>รุ่น</label>
            <input value={f.model||""} onChange={e=>up("model",e.target.value)} placeholder="เช่น XR220D" />
          </div>
          <div className="form-field">
            <label>ขนาด / ความยาว</label>
            <input value={f.size||""} onChange={e=>up("size",e.target.value)} placeholder="เช่น 22 ตัน / 12 เมตร" />
          </div>
          <div className="form-field">
            <label>ซีเรียล</label>
            <input className="mono" value={f.serial||""} onChange={e=>up("serial",e.target.value)} placeholder="Serial Number" />
          </div>
          <div className="form-field">
            <label>กรรมสิทธิ์/เช่า</label>
            <input value={f.ownership||""} onChange={e=>up("ownership",e.target.value)} placeholder="กรอกข้อมูล เช่น กรรมสิทธิ์, เช่า, ยืม..." />
          </div>
          <div className="form-field">
            <label>หมวดหมู่</label>
            <select value={f.categoryId||""} onChange={e=>up("categoryId",e.target.value)}>
              <option value="">— เลือกหมวดหมู่ —</option>
              {(window.__DATA.categories||[]).map(c=>(
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>สถานะ</label>
            <select value={f.status||"ใช้งาน"} onChange={e=>up("status",e.target.value)}>
              <option value="ใช้งาน">ใช้งาน</option>
              <option value="ซ่อม">ซ่อม</option>
              <option value="รอซ่อม">รอซ่อม</option>
            </select>
          </div>
          <div className="form-field" style={{gridColumn:"1/-1"}}>
            <label>สถานที่ติดตั้ง</label>
            <input value={f.location||""} onChange={e=>up("location",e.target.value)} placeholder="เช่น โรงงาน A - สายการผลิต 1" />
          </div>
          <div className="form-field">
            <label>ชั่วโมงทำงานสะสม</label>
            <input type="number" min="0" value={f.hours||0} onChange={e=>up("hours",e.target.value)} />
          </div>
          <div className="form-field">
            <label>ซ่อมบำรุงล่าสุด</label>
            <input type="date" value={f.lastService||""} onChange={e=>up("lastService",e.target.value)} />
          </div>
          <div className="form-field" style={{gridColumn:"1/-1"}}>
            <label>หมายเหตุ</label>
            <textarea rows="3" value={f.note||""} onChange={e=>up("note",e.target.value)} placeholder="หมายเหตุเพิ่มเติม เช่น เงื่อนไขการเช่า วันหมดสัญญา ฯลฯ"></textarea>
          </div>
        </div>

        <div className="form-field" style={{marginTop:14}}>
          <label>ไอคอน (ใช้แทนเมื่อไม่มีรูป)</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(58px,1fr))",gap:8,padding:12,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:10}}>
            {icons.map(ic=>(
              <button type="button" key={ic} onClick={()=>up("icon",ic)}
                style={{height:50,borderRadius:10,border:f.icon===ic?"2px solid var(--primary)":"1px solid var(--line)",background:f.icon===ic?"var(--accent-soft)":"#fff",color:f.icon===ic?"var(--primary)":"var(--muted)",fontSize:18,cursor:"pointer",display:"grid",placeItems:"center"}}>
                <i className={`fa-solid ${ic}`}></i>
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function MachineDetail({m,user,onClose,onEdit,onDelete}){
  const related = window.__DATA.repairs.filter(r=>r.machineCode===m.code).slice(0,5);
  const statusColor = ({"ใช้งาน":"#10B981","ซ่อม":"#EF4444","รอซ่อม":"#F59E0B"})[m.status] || "#64748B";
  const canEdit = ["Admin","Officer"].includes(user.role);
  return (
    <Modal open={true} onClose={onClose} title={<>เครื่องจักร <span className="mono" style={{marginLeft:6,color:"var(--primary)"}}>{m.code}</span></>} size="lg"
      footer={<>
        {canEdit && <button className="btn btn-danger" onClick={onDelete}><i className="fa-solid fa-trash"></i> ลบ</button>}
        <div style={{flex:1}}></div>
        <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
        {canEdit && <button className="btn btn-primary" onClick={onEdit}><i className="fa-solid fa-pen-to-square"></i> แก้ไข</button>}
      </>}>
      <div className="detail-header" style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:22,marginBottom:18}}>
        <div style={{borderRadius:12,overflow:"hidden",aspectRatio:"1",background:"var(--bg)",position:"relative"}}>
          <div className="machine-thumb" style={{position:"absolute",inset:0,borderRadius:0}}>
            <div className="pattern"></div>
            <div className="ic"><i className={`fa-solid ${m.icon||"fa-gears"}`}></i></div>
          </div>
        </div>
        <div>
          <div style={{fontSize:20,fontWeight:600,marginBottom:4}}>{m.name}</div>
          <div style={{color:"var(--muted)",marginBottom:14}}>{m.brand||"—"} {m.model||""} {m.size?`· ${m.size}`:""}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span className="badge" style={{background:statusColor+"22",color:statusColor,fontSize:13}}>
              <span className="dot"></span>{m.status}
            </span>
            {m.categoryId && (()=>{
              const cat = window.getCategory(m.categoryId);
              return <span className="badge" style={{background:cat.color+"22",color:cat.color,fontSize:13}}>
                <i className={`fa-solid ${cat.icon}`} style={{marginRight:4}}></i>{cat.name}
              </span>;
            })()}
            {m.ownership && <span className="badge" style={{background:"var(--accent-soft)",color:"var(--primary)",fontSize:13}}>
              <i className="fa-solid fa-handshake" style={{marginRight:4}}></i>{m.ownership}
            </span>}
          </div>

          <div className="detail-grid" style={{marginTop:16,gridTemplateColumns:"1fr 1fr"}}>
            <div><div className="k">โครงการ</div><div className="v">{m.project||"—"}</div></div>
            <div><div className="k">ซีเรียล</div><div className="v mono" style={{fontSize:12}}>{m.serial||"—"}</div></div>
            <div><div className="k">สถานที่ติดตั้ง</div><div className="v">{m.location||"—"}</div></div>
            <div><div className="k">ซ่อมบำรุงล่าสุด</div><div className="v">{m.lastService||"—"}</div></div>
            <div><div className="k">ชั่วโมงทำงาน</div><div className="v">{Number(m.hours||0).toLocaleString()} ชม.</div></div>
          </div>
          {m.note && <div style={{marginTop:14,padding:12,background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:10,fontSize:13}}>
            <div style={{fontWeight:500,color:"#92400E",marginBottom:4}}><i className="fa-solid fa-note-sticky"></i> หมายเหตุ</div>
            <div style={{color:"#78350F",whiteSpace:"pre-wrap"}}>{m.note}</div>
          </div>}
        </div>
      </div>

      <div style={{borderTop:"1px dashed var(--line)",paddingTop:16}}>
        <div style={{fontWeight:500,marginBottom:10,fontSize:14}}><i className="fa-solid fa-clock-rotate-left" style={{color:"var(--primary)",marginRight:6}}></i>ประวัติการแจ้งซ่อม ({related.length})</div>
        {related.length>0 ? (
          <table className="data" style={{border:"1px solid var(--line)",borderRadius:8}}>
            <thead><tr><th>เลขที่</th><th>วันที่</th><th>อาการ</th><th>สถานะ</th></tr></thead>
            <tbody>
              {related.map(r=>(
                <tr key={r.id}>
                  <td><span className="ticket-id">{r.running}</span></td>
                  <td style={{color:"var(--muted)"}}>{window.__DATA.fmtDate(r.createdAt)}</td>
                  <td style={{fontSize:13}}>{r.title}</td>
                  <td><Badge status={r.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{color:"var(--muted)",fontSize:13,padding:"12px 0"}}>ยังไม่มีประวัติการซ่อม</div>}
      </div>
    </Modal>
  );
}

window.Machines = Machines;
