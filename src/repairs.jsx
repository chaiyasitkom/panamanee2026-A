function Repairs({user}){
  const allowAll = window.userCanSeeAllProjects(user);
  const allowed = new Set(user.projects||[]);
  const visibleRows = React.useMemo(()=>(
    allowAll ? window.__DATA.repairs : window.__DATA.repairs.filter(r=>!r.project || allowed.has(r.project))
  ),[allowAll]);

  const [rows,setRows] = React.useState(visibleRows);
  React.useEffect(()=>{ setRows(visibleRows); },[visibleRows]);
  const [q,setQ] = React.useState("");
  const [status,setStatus] = React.useState("all");
  const [cat,setCat] = React.useState("all");
  const [detail,setDetail] = React.useState(null);
  const [statusFor,setStatusFor] = React.useState(null);
  const [editFor,setEditFor] = React.useState(null);
  const [loading,setLoading] = React.useState(false);

  const filtered = React.useMemo(()=>{
    return rows.filter(r=>{
      if(q){
        const qq = q.toLowerCase();
        if(!(r.running.toLowerCase().includes(qq) || r.title.toLowerCase().includes(qq) || (r.siteId||"").toLowerCase().includes(qq))) return false;
      }
      if(status!=="all" && r.status!==status) return false;
      if(cat!=="all" && r.categoryId!==cat) return false;
      if(user.role==="Technician"){
        if(!(r.assignedId===user.id || r.status==="new" || r.status==="assess")) return false;
      }
      return true;
    });
  },[rows,q,status,cat,user]);

  const quickAction = async (r, next, actionLabel) => {
    let cost = r.cost;
    if(next==="assess" || next==="progress"){
      const { value, isConfirmed } = await Swal.fire({
        title: next==="assess"?"ประเมินราคา":"อนุมัติซ่อม",
        input:"number",
        inputLabel:"ค่าใช้จ่ายโดยประมาณ (บาท)",
        inputValue: cost || "",
        inputPlaceholder:"เช่น 5000",
        showCancelButton:true,
        confirmButtonText:next==="assess"?"บันทึกการประเมิน":"อนุมัติและเริ่มซ่อม",
        cancelButtonText:"ยกเลิก",
        confirmButtonColor:"#1E40AF"
      });
      if(!isConfirmed) return;
      cost = Number(value)||cost;
    }
    if(next==="done"){
      const { isConfirmed } = await Swal.fire({
        title:"ปิดงานนี้หรือไม่?",
        text:"ยืนยันว่างานซ่อมเสร็จสมบูรณ์แล้ว",
        icon:"question",
        showCancelButton:true,
        confirmButtonText:"ใช่, ปิดงาน",
        cancelButtonText:"ยกเลิก",
        confirmButtonColor:"#10B981"
      });
      if(!isConfirmed) return;
    }
    setLoading(true);
    try{
      await window.api("updateRepairStatus", { id:r.id, status:next, by:user.name, note:actionLabel, cost });
      const updated = {...r, status:next, cost, timeline:[...r.timeline,{status:next,when:new Date(),by:user.name,note:actionLabel}]};
      const newRows = rows.map(x=>x.id===r.id?updated:x);
      setRows(newRows);
      window.__DATA.repairs = newRows;
      setLoading(false);
      Swal.fire({icon:"success",title:"อัปเดตสถานะสำเร็จ",text:actionLabel,timer:1400,showConfirmButton:false,toast:true,position:"top-end"});
    }catch(err){
      setLoading(false);
      Swal.fire({icon:"error",title:"บันทึกไม่สำเร็จ",text:err.message});
    }
  };

  const openStatusMenu = (r) => {
    setStatusFor(r);
  };

  const saveEdit = async (r, patch) => {
    setLoading(true);
    try{
      // ลองใช้ updateRepair ก่อน (backend ใหม่); ถ้าไม่รู้จัก action fallback ไป updateRepairStatus + patch
      try {
        await window.api("updateRepair", { id:r.id, patch, by:user.name });
      } catch(e1) {
        if(/Unknown action/i.test(String(e1.message||e1))){
          const { status, cost, ...rest } = patch;
          await window.api("updateRepairStatus", {
            id: r.id,
            status: status || r.status,
            cost: cost,
            by: user.name,
            note: "แก้ไขข้อมูลโดย Admin",
            patch: rest
          });
        } else {
          throw e1;
        }
      }
      const updated = {
        ...r, ...patch,
        timeline:[...r.timeline, {status:patch.status||r.status,when:new Date(),by:user.name,note:"แก้ไขข้อมูลโดย Admin"}]
      };
      const newRows = rows.map(x=>x.id===r.id?updated:x);
      setRows(newRows);
      window.__DATA.repairs = window.__DATA.repairs.map(x=>x.id===r.id?updated:x);
      setEditFor(null);
      setLoading(false);
      Swal.fire({icon:"success",title:"บันทึกการแก้ไขแล้ว",timer:1400,showConfirmButton:false,toast:true,position:"top-end"});
    }catch(err){
      setLoading(false);
      Swal.fire({icon:"error",title:"บันทึกไม่สำเร็จ",text:err.message});
    }
  };

  return (
    <>
      <Loading show={loading} text="กำลังบันทึก..."/>
      <div className="card">
        <div className="filters">
          <div className="search-input">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input placeholder="ค้นหาเลขที่ใบงาน / อาการ..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            {window.__DATA.statuses.map(s=>(<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
          <select value={cat} onChange={e=>setCat(e.target.value)}>
            <option value="all">ทุกหมวดหมู่</option>
            {window.__DATA.categories.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <div className="spacer"></div>
          <div style={{color:"var(--muted)",fontSize:13,alignSelf:"center"}}>{filtered.length} / {rows.length} รายการ</div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr>
              <th>เลขที่</th>
              <th>เลขที่ไซต์งาน</th>
              <th>วันที่แจ้ง</th>
              <th>อาการ/ปัญหา</th>
              <th>โครงการ/หน่วยงาน</th>
              <th>หมวดหมู่</th>
              <th>สถานะ</th>
              <th>ผู้แจ้ง</th>
              <th>จัดการ</th>
            </tr></thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id}>
                  <td><span className="ticket-id">{r.running}</span></td>
                  <td><span className="site-id">{r.siteId||"—"}</span></td>
                  <td style={{color:"var(--muted)",whiteSpace:"nowrap"}}>{window.__DATA.fmtDate(r.createdAt)}</td>
                  <td><div className="cell-title">{r.title}<div className="desc">{r.machineCode&&<span className="mono" style={{marginRight:6}}>{r.machineCode}</span>}{r.desc.slice(0,60)}{r.desc.length>60?"…":""}</div></div></td>
                  <td style={{fontSize:13}}>{r.project}</td>
                  <td><CategoryChip categoryId={r.categoryId}/></td>
                  <td><Badge status={r.status}/></td>
                  <td><Avatar name={r.reporterName}/>{r.reporterName}</td>
                  <td>
                    <div className="row-actions">
                      <button className="ia" title="ดูรายละเอียด" onClick={()=>setDetail(r)}><i className="fa-solid fa-eye"></i></button>
                      {["Admin","Officer"].includes(user.role) &&
                        <button className="ia" title="เปลี่ยนสถานะ" onClick={()=>openStatusMenu(r)}><i className="fa-solid fa-pen-to-square"></i></button>}
                      {user.role==="Admin" &&
                        <button className="ia" title="แก้ไขข้อมูล (Admin)" onClick={()=>setEditFor(r)} style={{color:"#1E40AF"}}><i className="fa-solid fa-user-pen"></i></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan="9">
                  <div className="empty">
                    <i className="fa-solid fa-folder-open"></i>
                    <div className="t">ไม่พบข้อมูล</div>
                    <div>ลองเปลี่ยนเงื่อนไขการค้นหา</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <RepairDetail r={detail} onClose={()=>setDetail(null)} user={user} onQuick={quickAction} onEdit={user.role==="Admin"?(r)=>{setDetail(null);setEditFor(r);}:null} />}
      {statusFor && <StatusMenu r={statusFor} onClose={()=>setStatusFor(null)} onPick={(next,label)=>{setStatusFor(null);quickAction(statusFor,next,label);}} />}
      {editFor && <EditRepairModal r={editFor} onClose={()=>setEditFor(null)} onSave={saveEdit} />}
    </>
  );
}

function RepairDetail({r,onClose,user,onQuick,onEdit}){
  const cat = window.getCategory(r.categoryId);
  const canAct = ["Admin","Officer","Technician"].includes(user.role);

  return (
    <Modal open={true} onClose={onClose} title={<>ใบแจ้งซ่อม <span className="ticket-id" style={{marginLeft:6}}>{r.running}</span></>} size="lg"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
        {onEdit && <button className="btn btn-ghost" onClick={()=>onEdit(r)} style={{color:"#1E40AF"}}><i className="fa-solid fa-user-pen"></i> แก้ไขข้อมูล</button>}
        <button className="btn btn-ghost"><i className="fa-solid fa-print"></i> พิมพ์ใบงาน</button>
      </>}>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <Badge status={r.status}/>
        <CategoryChip categoryId={r.categoryId}/>
        <span style={{color:"var(--muted)",fontSize:13}}>
          <i className="fa-solid fa-calendar"></i> {window.__DATA.fmtDateTime(r.createdAt)}
        </span>
      </div>

      <div className="detail-grid">
        <div className="full">
          <div className="k">อาการ/ปัญหา</div>
          <div className="v" style={{fontSize:16,fontWeight:500}}>{r.title}</div>
          <div style={{color:"var(--muted)",fontSize:13,marginTop:4,lineHeight:1.5}}>{r.desc}</div>
        </div>
        <div><div className="k">เลขที่ไซต์งาน</div><div className="v mono">{r.siteId||"—"}</div></div>
        <div><div className="k">รหัสเครื่องจักร</div><div className="v mono">{r.machineCode||"—"}</div></div>
        <div><div className="k">โครงการ/หน่วยงาน</div><div className="v">{r.project}</div></div>
        <div><div className="k">หมวดหมู่</div><div className="v"><CategoryChip categoryId={r.categoryId}/></div></div>
        <div><div className="k">ผู้แจ้ง</div><div className="v"><Avatar name={r.reporterName}/>{r.reporterName}</div></div>
        <div><div className="k">ผู้รับผิดชอบ</div><div className="v">{r.assignedId ? <><Avatar name={window.getUser(r.assignedId)?.name}/>{window.getUser(r.assignedId)?.name}</> : <span style={{color:"var(--muted)"}}>ยังไม่มอบหมาย</span>}</div></div>
        <div><div className="k">ค่าใช้จ่าย</div><div className="v">{r.cost ? <span style={{color:"var(--primary)",fontWeight:500}}>{r.cost.toLocaleString()} บาท</span> : <span style={{color:"var(--muted)"}}>—</span>}</div></div>
        <div><div className="k">สถานะปัจจุบัน</div><div className="v"><Badge status={r.status}/></div></div>
      </div>

      <div style={{marginTop:22}}>
        <div className="k" style={{color:"var(--muted)",fontSize:12,marginBottom:8}}>รูปภาพ "ก่อนซ่อม"</div>
        <div className="photo-grid">
          {r.photos.map((p,i)=>(<PhotoPlaceholder key={i} label={p} idx={i}/>))}
        </div>
      </div>

      {r.afterPhotos.length>0 && <div style={{marginTop:16}}>
        <div className="k" style={{color:"var(--muted)",fontSize:12,marginBottom:8}}>รูปภาพ "หลังซ่อม"</div>
        <div className="photo-grid">
          {r.afterPhotos.map((p,i)=>(<PhotoPlaceholder key={i} label={p} idx={i+2}/>))}
        </div>
      </div>}

      <div className="timeline">
        <div style={{fontWeight:500,marginBottom:12,fontSize:14}}><i className="fa-solid fa-timeline" style={{color:"var(--primary)",marginRight:6}}></i>ประวัติการดำเนินการ</div>
        {r.timeline.map((t,i)=>{
          const s = window.getStatus(t.status);
          const color = {new:"#0EA5E9",assess:"#8B5CF6",progress:"#F59E0B",parts:"#EF4444",done:"#10B981",cancel:"#64748B"}[t.status];
          return (
            <div className="t-item" key={i}>
              <div className="t-dot" style={{background:color}}><i className={`fa-solid ${s.icon}`}></i></div>
              <div className="t-body">
                <div><strong>{s.label}</strong> — {t.note}</div>
                <div className="when">โดย {t.by} · {window.__DATA.fmtDateTime(t.when)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {canAct && r.status!=="done" && r.status!=="cancel" && <div className="status-actions">
        {r.status==="new" && <button className="quick-action" onClick={()=>onQuick(r,"assess","เริ่มประเมินราคา")}><i className="fa-solid fa-magnifying-glass-dollar"></i> ประเมินราคา</button>}
        {r.status==="assess" && <button className="quick-action" onClick={()=>onQuick(r,"progress","อนุมัติซ่อม เริ่มดำเนินการ")}><i className="fa-solid fa-check"></i> อนุมัติซ่อม</button>}
        {r.status==="progress" && <>
          <button className="quick-action" onClick={()=>onQuick(r,"parts","รออะไหล่")}><i className="fa-solid fa-box-open"></i> รออะไหล่</button>
          <button className="quick-action" onClick={()=>onQuick(r,"done","ปิดงาน")}><i className="fa-solid fa-flag-checkered"></i> ปิดงาน</button>
        </>}
        {r.status==="parts" && <button className="quick-action" onClick={()=>onQuick(r,"progress","อะไหล่พร้อม กลับมาดำเนินการ")}><i className="fa-solid fa-play"></i> กลับมาดำเนินการ</button>}
      </div>}
    </Modal>
  );
}

function StatusMenu({r,onClose,onPick}){
  const opts = [
    {k:"assess",l:"ประเมินราคา",i:"fa-magnifying-glass-dollar"},
    {k:"progress",l:"อนุมัติและเริ่มซ่อม",i:"fa-screwdriver-wrench"},
    {k:"parts",l:"รออะไหล่",i:"fa-box-open"},
    {k:"done",l:"ปิดงาน",i:"fa-flag-checkered"},
    {k:"cancel",l:"ยกเลิกงาน",i:"fa-ban"},
  ];
  return (
    <Modal open={true} onClose={onClose} title={`เปลี่ยนสถานะ · ${r.running}`}>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:14}}>สถานะปัจจุบัน: <Badge status={r.status}/></div>
      <div style={{display:"grid",gap:8}}>
        {opts.filter(o=>o.k!==r.status).map(o=>(
          <button key={o.k} className="quick-action" style={{justifyContent:"flex-start",padding:"12px 14px"}} onClick={()=>onPick(o.k,o.l)}>
            <i className={`fa-solid ${o.i}`} style={{width:16}}></i>
            <span>{o.l}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function EditRepairModal({r,onClose,onSave}){
  const [f,setF] = React.useState({
    title:r.title||"", desc:r.desc||"", siteId:r.siteId||"", machineCode:r.machineCode||"",
    project:r.project||"", categoryId:r.categoryId||"", status:r.status||"new",
    reporterName:r.reporterName||"", assignedId:r.assignedId||"", cost:r.cost||""
  });
  const set = (k,v)=>setF(p=>({...p,[k]:v}));
  const submit = () => {
    const patch = {...f, cost: f.cost===""?"":Number(f.cost)||0};
    onSave(r, patch);
  };
  const technicians = (window.__DATA.users||[]).filter(u=>["Technician","Officer","Admin"].includes(u.role));
  return (
    <Modal open={true} onClose={onClose} size="lg"
      title={<><i className="fa-solid fa-user-pen" style={{color:"#1E40AF",marginRight:8}}></i>แก้ไขข้อมูล · <span className="ticket-id" style={{marginLeft:6}}>{r.running}</span></>}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={submit}><i className="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข</button>
      </>}>
      <div style={{background:"#FEF3C7",border:"1px solid #FCD34D",color:"#92400E",padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:16}}>
        <i className="fa-solid fa-shield-halved" style={{marginRight:6}}></i>
        โหมด Admin — แก้ไขข้อมูลใบแจ้งซ่อมได้ทุกฟิลด์ ประวัติการแก้ไขจะถูกบันทึกไว้ใน Timeline
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        <div style={{gridColumn:"1 / -1"}}>
          <label className="k">อาการ/ปัญหา</label>
          <input className="inp" value={f.title} onChange={e=>set("title",e.target.value)} />
        </div>
        <div style={{gridColumn:"1 / -1"}}>
          <label className="k">รายละเอียด</label>
          <textarea className="inp" rows="3" value={f.desc} onChange={e=>set("desc",e.target.value)} />
        </div>
        <div><label className="k">เลขที่ไซต์งาน</label><input className="inp" value={f.siteId} onChange={e=>set("siteId",e.target.value)} /></div>
        <div><label className="k">รหัสเครื่องจักร</label><input className="inp" value={f.machineCode} onChange={e=>set("machineCode",e.target.value)} /></div>
        <div>
          <label className="k">โครงการ/หน่วยงาน</label>
          <select className="inp" value={f.project} onChange={e=>set("project",e.target.value)}>
            <option value="">— ไม่ระบุ —</option>
            {Array.from(new Set((window.__DATA.machines||[]).map(m=>m.project).filter(Boolean))).sort().map(p=>(
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="k">หมวดหมู่</label>
          <select className="inp" value={f.categoryId} onChange={e=>set("categoryId",e.target.value)}>
            {window.__DATA.categories.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="k">สถานะ</label>
          <select className="inp" value={f.status} onChange={e=>set("status",e.target.value)}>
            {window.__DATA.statuses.map(s=>(<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
        </div>
        <div>
          <label className="k">ค่าใช้จ่าย (บาท)</label>
          <input className="inp" type="number" value={f.cost} onChange={e=>set("cost",e.target.value)} />
        </div>
        <div><label className="k">ผู้แจ้ง</label><input className="inp" value={f.reporterName} onChange={e=>set("reporterName",e.target.value)} /></div>
        <div>
          <label className="k">ผู้รับผิดชอบ</label>
          <select className="inp" value={f.assignedId} onChange={e=>set("assignedId",e.target.value)}>
            <option value="">— ยังไม่มอบหมาย —</option>
            {technicians.map(u=>(<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
          </select>
        </div>
      </div>
      <style>{`
        .inp{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font-family:Kanit;font-size:13.5;background:#fff}
        .inp:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,64,175,.1)}
        label.k{display:block;font-size:12px;color:var(--muted);margin-bottom:5px}
      `}</style>
    </Modal>
  );
}

window.Repairs = Repairs;
