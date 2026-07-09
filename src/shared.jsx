// Shared UI primitives

const { useState, useEffect, useRef, useMemo } = React;

function Badge({status}){
  const s = window.getStatus(status);
  return (
    <span className={`badge ${s.className}`}>
      <span className="dot"></span>{s.label}
    </span>
  );
}

function CategoryChip({categoryId}){
  const c = window.getCategory(categoryId);
  const bg = c.color+"22";
  return (
    <span className="cat-chip" style={{background:bg,color:c.color}}>
      <i className={`fa-solid ${c.icon}`}></i>{c.name}
    </span>
  );
}

function Avatar({name,size=28}){
  const bg = window.avatarColor(name);
  return (
    <span className="avatar-xs" style={{background:bg,width:size,height:size}}>{window.initials(name)}</span>
  );
}

function Modal({open,onClose,title,children,footer,size=""}){
  useEffect(()=>{
    if(!open) return;
    const h=(e)=>{ if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[open,onClose]);
  if(!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className={`modal ${size}`} onClick={e=>e.stopPropagation()}>
        <div className="modal-h">
          <h3>{title}</h3>
          <button className="close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

function Loading({show,text="กำลังโหลด..."}){
  if(!show) return null;
  return (
    <div className="loading-scrim">
      <div className="loading-box">
        <div className="spinner"></div>
        <span>{text}</span>
      </div>
    </div>
  );
}

// Fake async wrapper that shows a spinner briefly (simulates GSheet call)
function simulate(ms=500){
  return new Promise(r=>setTimeout(r,ms));
}

// อาการ/ปัญหา แบบหลายรายการ — controlled: value เป็น string คั่นด้วย \n
function ProblemsField({value,onChange,disabled,placeholder}){
  const list = (value && value.length) ? value.split("\n") : [""];
  const commit = (arr)=>onChange(arr.join("\n"));
  const setAt = (i,v)=>{ const a=list.slice(); a[i]=v; commit(a); };
  const add = ()=>commit(list.concat([""]));
  const removeAt = (i)=>{ const a=list.filter((_,idx)=>idx!==i); commit(a.length?a:[""]); };
  return (
    <div style={{display:"grid",gap:8}}>
      {list.map((p,i)=>(
        <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{width:20,textAlign:"right",color:"var(--muted)",fontSize:13,flexShrink:0}}>{i+1}.</span>
          <input className="inp" style={{flex:1}} value={p} disabled={disabled} onChange={e=>setAt(i,e.target.value)} placeholder={placeholder||"เช่น มอเตอร์ไหม้ ใช้งานไม่ได้"} />
          <button type="button" className="ia" title="ลบอาการนี้" disabled={disabled||list.length<=1} onClick={()=>removeAt(i)} style={{color:"#EF4444",opacity:(disabled||list.length<=1)?0.35:1,flexShrink:0}}><i className="fa-solid fa-trash"></i></button>
        </div>
      ))}
      <div><button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={add}><i className="fa-solid fa-plus"></i> เพิ่มอาการ</button></div>
    </div>
  );
}

// รวมรายการอาการ + สถานะรายอาการ (backcompat: ใบเก่าที่มีแต่ title บรรทัดเดียว)
function getProblems(r){
  if(Array.isArray(r.problems) && r.problems.length){
    return r.problems.map(p=>({text:String(p.text||""),status:p.status||r.status||"new"}));
  }
  return String(r.title||"").split("\n").map(s=>s.trim()).filter(Boolean).map(t=>({text:t,status:r.status||"new"}));
}

// สถานที่ทำการซ่อม (มี default ครบทุกช่อง)
function getRepairPlace(r){
  const base = {mode:"", onsite:"", other:"", reportAt:"", note:""};
  const p = r.repairPlace;
  return (p && typeof p==="object" && !Array.isArray(p)) ? Object.assign(base, p) : base;
}

// พิมพ์ใบแจ้งซ่อม — เปิดหน้าต่าง A4 ตามฟอร์มบริษัทพานามณี (เว้นเส้นประช่องที่ไม่มีข้อมูล)
window.buildRepairFormDoc = function(r, user){
  const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const m = (window.__DATA.machines||[]).find(x=>x.code===r.machineCode) || {};
  const cat = (window.getCategory && window.getCategory(r.categoryId)) || {};
  const probs = window.getProblems(r);
  const fmtDate = d => { if(!d) return ""; const dt=new Date(d); if(isNaN(dt)) return ""; const y=(dt.getFullYear()+543)%100; return dt.getDate()+"/"+(dt.getMonth()+1)+"/"+String(y).padStart(2,"0"); };
  const dateStr = fmtDate(r.createdAt);
  const fill = v => v?esc(v):"";
  const rp = window.getRepairPlace(r);
  const box = on => "<span class='chk'>"+(on?"✓":"")+"</span>";
  const rowCount = Math.max(5, probs.length);
  let rows = "";
  for(let i=0;i<rowCount;i++){ const p=probs[i]; rows += "<tr><td class='c-no'>"+(i+1)+"</td><td class='c-item'>"+(p?esc(p.text):"")+"</td><td class='c-insp'></td></tr>"; }
  const logo = "<img src='data:image/jpeg;base64,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' width='92' alt='' style='display:block'>";
  const html = "<!doctype html><html lang='th'><head><meta charset='utf-8'><title>ใบแจ้งซ่อม "+esc(r.running)+"</title><style>"
    + "@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:'Sarabun',Tahoma,Arial,sans-serif;color:#000;font-size:13px;margin:0}"
    + ".sheet{width:186mm;margin:0 auto}.hd{display:flex;align-items:center;gap:14px;margin-bottom:2px}.hd-title{flex:1;text-align:center}.cn-th{font-size:22px;font-weight:700}.cn-en{font-size:15px;font-weight:700;letter-spacing:.5px}.hd-sp{width:92px}"
    + ".doc-title{text-align:center;font-size:16px;font-weight:700;margin:6px 0 12px}"
    + ".row2{display:flex;justify-content:space-between;margin-bottom:8px}"
    + ".info .ln{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:5px 0}"
    + "b{font-weight:600;white-space:nowrap}"
    + ".dot{border-bottom:1px dotted #000;min-height:16px;padding:0 4px;text-align:center;display:inline-block}"
    + ".f1{flex:1;min-width:70px}.f2{flex:2;min-width:120px}.w180{width:180px}.w120{width:120px}.fwide{flex:1;min-width:300px}"
    + ".box{border:1.5px solid #000;margin:10px 0}.box-hd{text-align:center;font-weight:700;border-bottom:1.5px solid #000;padding:5px;background:#f2f2f2}"
    + ".rt{width:100%;border-collapse:collapse}.rt th,.rt td{border:1px solid #000;padding:5px 8px;font-size:13px}.rt thead th{background:#fafafa}.rt .c-no{width:8%;text-align:center}.rt .c-item{width:64%}.rt .c-insp{width:28%;text-align:center}.rt tbody td{height:26px}"
    + ".sig{width:100%;border-collapse:collapse;margin:10px 0}.sig th,.sig td{border:1px solid #000;text-align:center;padding:6px 4px;font-size:12px}.sig th{font-weight:600}.sig .sig-name td{height:34px;vertical-align:bottom;font-weight:600}.sig .sig-date td{font-size:12px}"
    + ".loc{padding:8px 10px}.loc .ln{display:flex;align-items:baseline;gap:6px;margin:6px 0;flex-wrap:wrap}.loc .indent{padding-left:120px}"
    + ".chk{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1.3px solid #000;margin-right:5px;font-size:11px;line-height:1;font-weight:700;vertical-align:middle}"
    + "</style></head><body><div class='sheet'>"
    + "<div class='hd'><div>"+logo+"</div><div class='hd-title'><div class='cn-th'>บริษัท พานามณี จำกัด</div><div class='cn-en'>PANAMANEE COMPANY LIMITED</div></div><div class='hd-sp'></div></div>"
    + "<div class='doc-title'>ใบแจ้งซ่อมเครื่องจักรและอุปกรณ์</div>"
    + "<div class='row2'><div>เลขที่ <span class='dot w180'>"+fill(r.running)+"</span></div><div>วันที่ <span class='dot w120'>"+fill(dateStr)+"</span></div></div>"
    + "<div class='info'>"
    + "<div class='ln'><b>ประเภทเครื่องจักร</b><span class='dot f2'>"+fill(cat.name)+"</span><b>หมายเลขเครื่องจักร</b><span class='dot f2'>"+fill(r.machineCode)+"</span><b>กรรมสิทธิ์</b><span class='dot f1'>"+fill(m.ownership)+"</span></div>"
    + "<div class='ln'><b>ยี่ห้อ</b><span class='dot f1'>"+fill(m.brand)+"</span><b>รุ่น</b><span class='dot f1'>"+fill(m.model)+"</span><b>ขนาด</b><span class='dot f1'>"+fill(m.size)+"</span><b>ปี</b><span class='dot f1'></span><b>ทะเบียน</b><span class='dot f1'></span></div>"
    + "<div class='ln'><b>Serial No.</b><span class='dot f1'>"+fill(m.serial)+"</span><b>Engine No.</b><span class='dot f1'></span><b>Chassis No.</b><span class='dot f1'></span></div>"
    + "<div class='ln'><b>เลขมิเตอร์กิโลเมตร</b><span class='dot f1'></span><b>เลขมิเตอร์ชั่วโมง</b><span class='dot f1'>"+fill(m.hours)+"</span></div>"
    + "<div class='ln'><b>หน่วยงาน</b><span class='dot f1'>"+fill(r.project)+"</span><b>สถานที่</b><span class='dot f1'>"+fill(m.location)+"</span></div>"
    + "</div>"
    + "<div class='box'><div class='box-hd'>รายการซ่อม (อาการผิดปกติ)</div><table class='rt'><thead><tr><th class='c-no'></th><th class='c-item'>รายการ</th><th class='c-insp'>ผู้ตรวจพบ</th></tr></thead><tbody>"+rows+"</tbody></table></div>"
    + "<table class='sig'><tr><th>พนักงานขับ</th><th>ผู้จัดทำเอกสาร/ ผู้รับแจ้ง</th><th>หัวหน้าแผนกปฏิบัติการ</th><th>ผู้จัดการฝ่ายบริหาร</th></tr>"
    + "<tr class='sig-name'><td>"+fill(m.driverName)+"</td><td>"+fill(r.reporterName)+"</td><td></td><td></td></tr>"
    + "<tr class='sig-paren'><td>( ...................... )</td><td>( ...................... )</td><td>( ...................... )</td><td>( ...................... )</td></tr>"
    + "<tr class='sig-date'><td>วันที่ "+fill(dateStr)+"</td><td>วันที่ "+fill(dateStr)+"</td><td>วันที่ ..............</td><td>วันที่ ..............</td></tr></table>"
    + "<div class='box'><div class='box-hd'>สถานที่ทำการซ่อม</div><div class='loc'>"
    + "<div class='ln'><b>แจ้งซ่อมที่</b><span class='dot fwide'>"+fill(rp.reportAt)+"</span></div>"
    + "<div class='ln'><b>สถานที่ทำการซ่อม</b>"+box(rp.mode==="onsite")+"ส่งช่างซ่อมหน้างาน ที่ <span class='dot f1'>"+fill(rp.onsite)+"</span></div>"
    + "<div class='ln indent'>"+box(rp.mode==="workshop")+"โรงซ่อมของบริษัทที่แจ้งซ่อม</div>"
    + "<div class='ln indent'>"+box(rp.mode==="other")+"อื่นๆ <span class='dot f1'>"+fill(rp.other)+"</span></div>"
    + "<div class='ln'><b>หมายเหตุ</b><span class='dot fwide'>"+fill(rp.note)+"</span></div>"
    + "</div></div>"
    + "</div></body></html>";
  return html;
};

window.printRepairForm = function(r, user){
  const w = window.open("", "_blank");
  if(!w){ Swal.fire({icon:"warning",title:"เปิดหน้าต่างพิมพ์ไม่ได้",text:"กรุณาอนุญาต popup ของเบราว์เซอร์"}); return; }
  w.document.open(); w.document.write(window.buildRepairFormDoc(r,user)); w.document.close(); w.focus();
  w.onload = ()=>{ try{ w.print(); }catch(e){} };
  setTimeout(()=>{ try{ w.print(); }catch(e){} }, 500);
};

window.shareRepairImage = async function(r, user){
  const ensureH2C = async () => {
    if(window.html2canvas) return window.html2canvas;
    await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"; s.onload=res; s.onerror=()=>rej(new Error("โหลดตัวแปลงรูปไม่ได้")); document.head.appendChild(s); });
    return window.html2canvas;
  };
  let iframe;
  try{
    Swal.fire({title:"กำลังสร้างรูป...",allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    const H2C = await ensureH2C();
    iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-100000px;top:0;width:760px;height:1200px;border:0;background:#fff";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(window.buildRepairFormDoc(r,user)); doc.close();
    await new Promise(res=>setTimeout(res, 500));
    const node = doc.querySelector(".sheet") || doc.body;
    const w = node.scrollWidth||720, h = node.scrollHeight;
    const canvas = await H2C(node, {scale:2, backgroundColor:"#ffffff", useCORS:true, width:w, height:h, windowWidth:w, x:0, y:0, scrollX:0, scrollY:0});
    const blob = await new Promise(res=>canvas.toBlob(res,"image/png"));
    const dataUrl = canvas.toDataURL("image/png");
    const fname = "ใบแจ้งซ่อม-"+String(r.running||"").replace(/[\\/]/g,"-")+".png";
    const file = new File([blob], fname, {type:"image/png"});
    Swal.close();
    window.__showShareSheet(r, blob, dataUrl, file, fname);
  }catch(err){
    Swal.close();
    if(!(err && err.name==="AbortError")) Swal.fire({icon:"error",title:"แชร์รูปไม่สำเร็จ",text:(err&&err.message)||String(err)});
  }finally{
    if(iframe) iframe.remove();
  }
};

// ป็อปอัพพรีวิว + ปุ่มแชร์ (ต้องเรียก navigator.share ใน gesture ที่ผู้ใช้กดปุ่มเอง ไม่งั้นมือถือจะบล็อก)
window.__showShareSheet = function(r, blob, dataUrl, file, fname){
  const runTxt = String(r.running||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const canShareFiles = !!(navigator.canShare && navigator.canShare({files:[file]}));
  const canCopy = !!(navigator.clipboard && window.ClipboardItem && window.isSecureContext);
  const hint = canShareFiles
    ? "มือถือ: กด &quot;ส่ง / แชร์&quot; แล้วเลือก LINE&nbsp;&nbsp;·&nbsp;&nbsp;คอม: กด &quot;คัดลอกรูป&quot; แล้ววางในแชท (Ctrl+V)"
    : (canCopy ? "กด &quot;คัดลอกรูป&quot; แล้ววางในแชท LINE ได้เลย (Ctrl+V)" : "กด &quot;ดาวน์โหลด&quot; แล้วส่งรูปเข้า LINE เอง");
  const dl = ()=>{ const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); };
  const btn = (act,bg,color,border,label,icon)=>"<button data-act='"+act+"' style='flex:1;min-width:120px;padding:11px 14px;border:"+border+";border-radius:8px;background:"+bg+";color:"+color+";font-weight:600;cursor:pointer'><i class='fa-solid "+icon+"'></i> "+label+"</button>";
  const scrim = document.createElement("div");
  scrim.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px";
  scrim.innerHTML = "<div style='background:#fff;color:#111827;border-radius:14px;max-width:460px;width:100%;max-height:92vh;overflow:auto;padding:16px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)'>"
    + "<div style='font-weight:700;font-size:15px;margin-bottom:2px'>ใบแจ้งซ่อม "+runTxt+"</div>"
    + "<div style='font-size:12px;color:#64748B;margin-bottom:10px'>"+hint+"</div>"
    + "<img src='"+dataUrl+"' style='max-width:100%;border:1px solid #e5e7eb;border-radius:8px'/>"
    + "<div style='display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;justify-content:center'>"
    + (canShareFiles?btn("share","#06C755","#fff","0","ส่ง / แชร์","fa-share-nodes"):"")
    + (canCopy?btn("copy","#1E40AF","#fff","0","คัดลอกรูป","fa-copy"):"")
    + btn("dl","#fff","#111","1px solid #cbd5e1","ดาวน์โหลด","fa-download")
    + "</div>"
    + "<button data-act='close' style='margin-top:8px;width:100%;padding:9px;border:0;border-radius:8px;background:#f1f5f9;color:#475569;cursor:pointer'>ปิด</button>"
    + "</div>";
  document.body.appendChild(scrim);
  const close = ()=>scrim.remove();
  scrim.addEventListener("click", e=>{ if(e.target===scrim) close(); });
  scrim.querySelector("[data-act='close']").onclick = close;
  scrim.querySelector("[data-act='dl']").onclick = ()=>{ dl(); close(); };
  const sb = scrim.querySelector("[data-act='share']");
  if(sb) sb.onclick = async ()=>{
    try{ await navigator.share({files:[file], title:"ใบแจ้งซ่อม "+(r.running||""), text:"ใบแจ้งซ่อม "+(r.running||"")}); close(); }
    catch(err){ if(err && err.name!=="AbortError") Swal.fire({icon:"error",title:"แชร์ไม่สำเร็จ",text:(err&&err.message)||String(err)}); }
  };
  const cp = scrim.querySelector("[data-act='copy']");
  if(cp) cp.onclick = async ()=>{
    try{
      await navigator.clipboard.write([new ClipboardItem({[blob.type||"image/png"]: blob})]);
      close();
      Swal.fire({icon:"success",title:"คัดลอกรูปแล้ว",text:"ไปที่แชท LINE แล้ววาง (Ctrl+V) ได้เลย",timer:2600,showConfirmButton:false});
    }catch(e){ Swal.fire({icon:"error",title:"คัดลอกไม่ได้",text:"เบราว์เซอร์นี้อาจไม่รองรับ ลองใช้ดาวน์โหลดแทน"}); }
  };
};

Object.assign(window, { Badge, CategoryChip, Avatar, Modal, Loading, simulate, ProblemsField, getProblems, getRepairPlace });
