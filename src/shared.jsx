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

function PhotoPlaceholder({label,idx=1}){
  const hues = ["#475569","#64748B","#334155","#1E293B"];
  return (
    <div className="photo" style={{background:`linear-gradient(135deg,${hues[idx%hues.length]},#0F172A)`}}>
      <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",color:"rgba(255,255,255,.7)"}}>
        <i className="fa-regular fa-image" style={{fontSize:24}}></i>
      </div>
      <div className="ph-label">{label}</div>
    </div>
  );
}

Object.assign(window, { Badge, CategoryChip, Avatar, Modal, Loading, simulate, PhotoPlaceholder });
