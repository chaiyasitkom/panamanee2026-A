function Categories({user}){
  const [rows,setRows] = React.useState(window.__DATA.categories);
  const [edit,setEdit] = React.useState(null);

  const save = async (form) => {
    try{
      if(form.id){
        await window.api("updateCategory",{id:form.id, patch:form});
        const upd = rows.map(x=>x.id===form.id?form:x);
        setRows(upd); window.__DATA.categories = upd;
      } else {
        const nu = await window.api("createCategory",{cat:form});
        const upd=[...rows,nu]; setRows(upd); window.__DATA.categories=upd;
      }
      setEdit(null);
      Swal.fire({icon:"success",title:"บันทึกสำเร็จ",timer:1200,showConfirmButton:false,toast:true,position:"top-end"});
    }catch(err){ Swal.fire({icon:"error",title:"บันทึกไม่สำเร็จ",text:err.message}); }
  };

  const del = (c) => {
    Swal.fire({
      title:"ลบหมวดหมู่?",
      text:`ต้องการลบ "${c.name}" ใช่หรือไม่?`,
      icon:"warning",
      showCancelButton:true,
      confirmButtonText:"ลบ",
      cancelButtonText:"ยกเลิก",
      confirmButtonColor:"#EF4444"
    }).then(async r=>{
      if(r.isConfirmed){
        try{
          await window.api("deleteCategory",{id:c.id});
          const upd = rows.filter(x=>x.id!==c.id);
          setRows(upd); window.__DATA.categories=upd;
          Swal.fire({icon:"success",title:"ลบแล้ว",timer:1000,showConfirmButton:false,toast:true,position:"top-end"});
        }catch(err){ Swal.fire({icon:"error",title:"ลบไม่สำเร็จ",text:err.message}); }
      }
    });
  };

  return (
    <div className="card">
      <div className="filters">
        <div style={{color:"var(--muted)",fontSize:13,alignSelf:"center"}}>
          ทั้งหมด {rows.length} หมวดหมู่
        </div>
        <div className="spacer"></div>
        <button className="btn btn-primary" onClick={()=>setEdit({name:"",color:"#3B82F6",icon:"fa-wrench"})}>
          <i className="fa-solid fa-plus"></i> เพิ่มหมวดหมู่
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr>
            <th style={{width:80}}>สี</th>
            <th style={{width:80}}>ไอคอน</th>
            <th>ชื่อหมวดหมู่</th>
            <th>FontAwesome Class</th>
            <th>จำนวนงาน</th>
            <th>จัดการ</th>
          </tr></thead>
          <tbody>
            {rows.map(c=>{
              const cnt = window.__DATA.repairs.filter(r=>r.categoryId===c.id).length;
              return (
                <tr key={c.id}>
                  <td><span className="color-swatch" style={{background:c.color}}></span> <span className="mono" style={{fontSize:12,color:"var(--muted)"}}>{c.color}</span></td>
                  <td><div style={{width:36,height:36,borderRadius:8,background:c.color+"22",color:c.color,display:"grid",placeItems:"center",fontSize:16}}><i className={`fa-solid ${c.icon}`}></i></div></td>
                  <td style={{fontWeight:500}}>{c.name}</td>
                  <td><span className="mono" style={{fontSize:12,color:"var(--muted)"}}>{c.icon}</span></td>
                  <td><strong>{cnt}</strong> <span style={{color:"var(--muted)",fontSize:12}}>งาน</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="ia" onClick={()=>setEdit(c)}><i className="fa-solid fa-pen"></i></button>
                      <button className="ia danger" onClick={()=>del(c)}><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && <CatForm init={edit} onClose={()=>setEdit(null)} onSave={save}/>}
    </div>
  );
}

function CatForm({init,onClose,onSave}){
  const [f,setF] = React.useState(init);
  const palette = ["#3B82F6","#8B5CF6","#EF4444","#10B981","#F59E0B","#06B6D4","#EC4899","#6366F1","#F97316","#14B8A6","#A855F7","#0EA5E9","#DC2626","#16A34A","#D97706","#64748B"];
  const icons = ["fa-bolt","fa-gears","fa-wind","fa-droplet","fa-desktop","fa-building","fa-truck","fa-wrench","fa-screwdriver","fa-hammer","fa-fan","fa-temperature-high","fa-car-battery","fa-plug","fa-fire","fa-snowflake"];

  return (
    <Modal open={true} onClose={onClose} title={init.id?"แก้ไขหมวดหมู่":"เพิ่มหมวดหมู่ใหม่"}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={()=>onSave(f)}><i className="fa-solid fa-floppy-disk"></i> บันทึก</button>
      </>}>
      <div className="form-field" style={{marginBottom:16}}>
        <label>ชื่อหมวดหมู่</label>
        <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} />
      </div>
      <div className="form-field" style={{marginBottom:16}}>
        <label>สี</label>
        <div className="color-grid">
          {palette.map(c=>(
            <button key={c} className={f.color===c?"sel":""} style={{background:c}} onClick={()=>setF({...f,color:c})}></button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>ไอคอน (FontAwesome)</label>
        <div className="color-grid" style={{gridTemplateColumns:"repeat(8,1fr)"}}>
          {icons.map(ic=>(
            <button key={ic} className={f.icon===ic?"sel":""} style={{background:f.icon===ic?f.color+"33":"#F8FAFC",color:f.icon===ic?f.color:"#64748B"}} onClick={()=>setF({...f,icon:ic})}>
              <i className={`fa-solid ${ic}`}></i>
            </button>
          ))}
        </div>
        <div className="hint mono">{f.icon}</div>
      </div>

      <div style={{marginTop:20,padding:16,background:"#FAFBFC",borderRadius:10,border:"1px dashed var(--line)"}}>
        <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:8,fontWeight:500}}>ตัวอย่าง</div>
        <span className="cat-chip" style={{background:f.color+"22",color:f.color}}>
          <i className={`fa-solid ${f.icon}`}></i>{f.name || "ชื่อหมวดหมู่"}
        </span>
      </div>
    </Modal>
  );
}

window.Categories = Categories;
