function Users({user}){
  const [rows,setRows] = React.useState(window.__DATA.users);
  const [edit,setEdit] = React.useState(null);
  const [q,setQ] = React.useState("");

  const filtered = rows.filter(u =>
    !q || (u.name.toLowerCase()+u.username).includes(q.toLowerCase())
  );

  const save = async (form) => {
    try{
      if(form.id){
        await window.api("updateUser",{id:form.id, patch:form});
        const upd = rows.map(x=>x.id===form.id?form:x);
        setRows(upd); window.__DATA.users = upd;
        // ถ้าแก้ตัวเอง → refresh session ทันทีเพื่อให้สิทธิ์โครงการ update
        try{
          const cur = JSON.parse(localStorage.getItem("rms_user")||"null");
          if(cur && cur.id===form.id){
            localStorage.setItem("rms_user", JSON.stringify(form));
            Swal.fire({
              icon:"info",title:"อัปเดตสิทธิ์แล้ว",
              text:"กำลังโหลดหน้าใหม่เพื่อใช้สิทธิ์ล่าสุด",
              timer:1500,showConfirmButton:false
            }).then(()=>location.reload());
            return;
          }
        }catch(e){}
      } else {
        const nu = await window.api("createUser",{user:form});
        const upd = [...rows, nu];
        setRows(upd); window.__DATA.users = upd;
      }
      setEdit(null);
      Swal.fire({icon:"success",title:"บันทึกสำเร็จ",timer:1200,showConfirmButton:false,toast:true,position:"top-end"});
    }catch(err){ Swal.fire({icon:"error",title:"บันทึกไม่สำเร็จ",text:err.message}); }
  };

  const del = (u) => {
    Swal.fire({
      title:"ลบผู้ใช้งาน?",
      text:`ต้องการลบ "${u.name}" ใช่หรือไม่?`,
      icon:"warning",
      showCancelButton:true,
      confirmButtonText:"ลบ",
      cancelButtonText:"ยกเลิก",
      confirmButtonColor:"#EF4444"
    }).then(async r=>{
      if(r.isConfirmed){
        try{
          await window.api("deleteUser",{id:u.id});
          const upd = rows.filter(x=>x.id!==u.id);
          setRows(upd); window.__DATA.users = upd;
          Swal.fire({icon:"success",title:"ลบแล้ว",timer:1000,showConfirmButton:false,toast:true,position:"top-end"});
        }catch(err){ Swal.fire({icon:"error",title:"ลบไม่สำเร็จ",text:err.message}); }
      }
    });
  };

  const roleColors = {Admin:"#1E40AF",Officer:"#8B5CF6",Technician:"#F59E0B",Engineer:"#06B6D4",Reporter:"#10B981",Director:"#EF4444"};

  const renderProjectAccess = (u) => {
    const hasAll = ["Admin","Director"].includes(u.role) || !Array.isArray(u.projects) || u.projects.length===0;
    if(hasAll) return <span className="badge" style={{background:"rgba(30,64,175,.1)",color:"#1E40AF",fontSize:11.5}}><i className="fa-solid fa-globe" style={{marginRight:4}}></i>ทุกโครงการ</span>;
    if(u.projects.length<=2) return (
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {u.projects.map(p=>(<span key={p} className="badge" style={{background:"var(--line-soft)",color:"var(--text)",fontSize:11.5}}>{p}</span>))}
      </div>
    );
    return <span className="badge" style={{background:"var(--line-soft)",color:"var(--text)",fontSize:11.5}} title={u.projects.join(", ")}>
      <i className="fa-solid fa-folder" style={{marginRight:4}}></i>{u.projects.length} โครงการ
    </span>;
  };

  return (
    <div className="card">
      <div className="filters">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="ค้นหาชื่อ หรือ username..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <div className="spacer"></div>
        <button className="btn btn-primary" onClick={()=>setEdit({username:"",password:"",name:"",role:"Reporter",dept:"",email:"",projects:[]})}>
          <i className="fa-solid fa-plus"></i> เพิ่มผู้ใช้งาน
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr>
            <th>Username</th><th>ชื่อ-นามสกุล</th><th>ตำแหน่ง</th><th>หน่วยงาน</th><th>สิทธิ์เข้าถึงโครงการ</th><th>อีเมล</th><th>จัดการ</th>
          </tr></thead>
          <tbody>
            {filtered.map(u=>(
              <tr key={u.id}>
                <td><span className="mono" style={{background:"var(--line-soft)",padding:"2px 7px",borderRadius:6,fontSize:12.5}}>{u.username}</span></td>
                <td><Avatar name={u.name}/>{u.name}</td>
                <td>
                  <span className="badge" style={{background:roleColors[u.role]+"22",color:roleColors[u.role]}}>
                    <span className="dot"></span>{u.role}
                  </span>
                </td>
                <td>{u.dept}</td>
                <td>{renderProjectAccess(u)}</td>
                <td style={{color:"var(--muted)",fontSize:13}}>{u.email}</td>
                <td>
                  <div className="row-actions">
                    <button className="ia" title="แก้ไข" onClick={()=>setEdit({...u, projects:Array.isArray(u.projects)?u.projects:[]})}><i className="fa-solid fa-pen"></i></button>
                    <button className="ia danger" title="ลบ" onClick={()=>del(u)}><i className="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <UserForm init={edit} onClose={()=>setEdit(null)} onSave={save}/>}
    </div>
  );
}

function UserForm({init,onClose,onSave}){
  const [f,setF] = React.useState({...init, projects: Array.isArray(init.projects)?init.projects:[]});
  const roles = ["Admin","Officer","Engineer","Technician","Reporter","Director"];

  // ดึงรายการโครงการจาก machines
  const allProjects = React.useMemo(()=>{
    return Array.from(new Set((window.__DATA.machines||[]).map(m=>m.project).filter(Boolean))).sort();
  },[]);

  const isSuperRole = ["Admin","Director"].includes(f.role);

  const toggleProject = (p) => {
    setF(prev => {
      const cur = prev.projects||[];
      return {...prev, projects: cur.includes(p) ? cur.filter(x=>x!==p) : [...cur, p]};
    });
  };

  const selectAll = () => setF(prev => ({...prev, projects:[...allProjects]}));
  const clearAll = () => setF(prev => ({...prev, projects:[]}));

  const submit = () => {
    if(!f.username || !f.name){
      Swal.fire({icon:"warning",title:"กรอกข้อมูลไม่ครบ",text:"กรุณาใส่ Username และชื่อ-นามสกุล"});
      return;
    }
    onSave(f);
  };
  return (
    <Modal open={true} onClose={onClose} size="lg" title={init.id?"แก้ไขผู้ใช้งาน":"เพิ่มผู้ใช้งานใหม่"}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={submit}><i className="fa-solid fa-floppy-disk"></i> บันทึก</button>
      </>}>
      <div className="form-grid">
        <div className="form-field">
          <label>Username *</label>
          <input value={f.username} onChange={e=>setF({...f,username:e.target.value})} />
        </div>
        <div className="form-field">
          <label>Password {init.id && <span style={{color:"var(--muted)",fontWeight:400}}>(เว้นว่างหากไม่เปลี่ยน)</span>}</label>
          <input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} />
        </div>
        <div className="form-field full">
          <label>ชื่อ-นามสกุล *</label>
          <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} />
        </div>
        <div className="form-field">
          <label>ตำแหน่ง/บทบาท</label>
          <select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>
            {roles.map(r=>(<option key={r} value={r}>{r}</option>))}
          </select>
        </div>
        <div className="form-field">
          <label>หน่วยงาน</label>
          <input value={f.dept} onChange={e=>setF({...f,dept:e.target.value})} />
        </div>
        <div className="form-field full">
          <label>อีเมล</label>
          <input value={f.email} onChange={e=>setF({...f,email:e.target.value})} />
        </div>

        {/* Project access */}
        <div className="form-field full">
          <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span><i className="fa-solid fa-folder-tree" style={{color:"var(--primary)",marginRight:6}}></i>สิทธิ์เข้าถึงโครงการ</span>
            {!isSuperRole && <span style={{fontWeight:400,fontSize:12,color:"var(--muted)"}}>
              {f.projects?.length ? `เลือกแล้ว ${f.projects.length}/${allProjects.length}` : `ไม่เลือก = เห็นทุกโครงการ`}
            </span>}
          </label>

          {isSuperRole ? (
            <div style={{padding:14,background:"rgba(30,64,175,.06)",border:"1px solid rgba(30,64,175,.2)",borderRadius:10,fontSize:13,color:"var(--primary)"}}>
              <i className="fa-solid fa-shield-halved" style={{marginRight:8}}></i>
              บทบาท <strong>{f.role}</strong> เห็นข้อมูลได้ทุกโครงการโดยอัตโนมัติ (ไม่จำเป็นต้องเลือก)
            </div>
          ) : (
            <>
              <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll}>
                  <i className="fa-solid fa-check-double"></i> เลือกทั้งหมด
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                  <i className="fa-solid fa-xmark"></i> ยกเลิกทั้งหมด
                </button>
                <div style={{flex:1}}></div>
                <div style={{fontSize:11.5,color:"var(--muted)",alignSelf:"center"}}>
                  ไม่เลือกเลย = เห็นทุกโครงการ
                </div>
              </div>
              {allProjects.length === 0 ? (
                <div style={{padding:14,background:"var(--bg)",border:"1px dashed var(--line)",borderRadius:10,fontSize:13,color:"var(--muted)",textAlign:"center"}}>
                  <i className="fa-solid fa-circle-info"></i> ยังไม่มีโครงการในระบบ · เพิ่มเครื่องจักรในแต่ละโครงการก่อน
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8,padding:12,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:10,maxHeight:260,overflowY:"auto"}}>
                  {allProjects.map(p=>{
                    const on = (f.projects||[]).includes(p);
                    return (
                      <label key={p} style={{
                        display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,cursor:"pointer",
                        background: on?"rgba(30,64,175,.08)":"#fff",
                        border: `1px solid ${on?"rgba(30,64,175,.4)":"var(--line)"}`,
                        fontSize:13, transition:"all .15s"
                      }}>
                        <input type="checkbox" checked={on} onChange={()=>toggleProject(p)} style={{margin:0,cursor:"pointer",accentColor:"var(--primary)",width:16,height:16}} />
                        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

window.Users = Users;
