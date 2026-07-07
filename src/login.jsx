function Login({onLogin}){
  const [username,setUsername] = React.useState("");
  const [password,setPassword] = React.useState("");
  const [showPw,setShowPw] = React.useState(false);
  const [loading,setLoading] = React.useState(false);

  const modules = (window.__DATA && window.__DATA.erpSystems) || [];

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try{
      const u = await window.api("login", { username, password });
      setLoading(false);
      onLogin(u);
    }catch(err){
      setLoading(false);
      Swal.fire({icon:"error",title:"เข้าสู่ระบบไม่สำเร็จ",text:err.message||"กรุณาตรวจสอบ Username และ Password",confirmButtonColor:"#1E40AF"});
    }
  };

  return (
    <div className="ow-login">
      <Loading show={loading} text="กำลังเข้าสู่ระบบ..." />

      {/* ===== Concept side: One Workspace ===== */}
      <div className="ow-brand">
        <div className="ow-aurora"></div>
        <div className="ow-grid-bg"></div>

        <div className="ow-top">
          <div className="ow-logo">
            <div className="ow-logo-mark"><i className="fa-solid fa-layer-group"></i></div>
            <div>
              <div className="ow-logo-name">One Workspace</div>
              <div className="ow-logo-sub">Unified Operations Platform</div>
            </div>
          </div>
        </div>

        <div className="ow-hero">
          <span className="ow-eyebrow"><i className="fa-solid fa-sparkles"></i> ระบบเดียว ครบทุกงาน</span>
          <h1>ทุกระบบงาน<br/>รวมไว้ใน<span className="ow-accent"> ที่เดียว</span></h1>
          <p>แจ้งซ่อม ทรัพย์สิน คลัง จัดซื้อ และบุคลากร เชื่อมต่อกันบนพื้นที่ทำงานเดียว — เข้าสู่ระบบครั้งเดียว เลือกใช้ได้ทุกโมดูล</p>

          <div className="ow-modules">
            {modules.map(m=>{
              const ready = m.status==="ready";
              return (
                <div key={m.id} className={`ow-mod ${ready?"is-ready":"is-soon"}`}>
                  <span className="ow-mod-icon"><i className={`fa-solid ${m.icon}`}></i></span>
                  <span className="ow-mod-name">{m.name}</span>
                  {ready
                    ? <span className="ow-mod-dot" title="พร้อมใช้งาน"></span>
                    : <span className="ow-mod-soon">เร็วๆนี้</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="ow-foot">
          <span><i className="fa-solid fa-shield-halved"></i> เชื่อมต่อ Firebase แบบเรียลไทม์</span>
          <span>© 2026 · v1.0</span>
        </div>
      </div>

      {/* ===== Auth side ===== */}
      <div className="ow-auth">
        <form className="ow-card" onSubmit={submit}>
          <div className="ow-card-badge"><i className="fa-solid fa-layer-group"></i></div>
          <h2>เข้าสู่พื้นที่ทำงาน</h2>
          <p className="ow-card-sub">ลงชื่อเข้าใช้เพื่อเลือกระบบงานและโครงการของคุณ</p>

          <label className="ow-field">
            <span className="ow-field-label">ชื่อผู้ใช้</span>
            <span className="ow-input">
              <i className="fa-solid fa-user"></i>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้" autoComplete="username" />
            </span>
          </label>

          <label className="ow-field">
            <span className="ow-field-label">รหัสผ่าน</span>
            <span className="ow-input">
              <i className="fa-solid fa-lock"></i>
              <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="รหัสผ่าน" autoComplete="current-password" />
              <button type="button" className="ow-eye" onClick={()=>setShowPw(v=>!v)}
                title={showPw?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน"} aria-label="สลับการแสดงรหัสผ่าน">
                <i className={`fa-solid ${showPw?"fa-eye-slash":"fa-eye"}`}></i>
              </button>
            </span>
          </label>

          <button className="ow-submit" type="submit">
            <i className="fa-solid fa-arrow-right-to-bracket"></i> เข้าสู่ระบบ
          </button>

          <div className="ow-hint">
            <i className="fa-solid fa-circle-info"></i>
            <span>หลังเข้าสู่ระบบ คุณจะเลือกระบบงานและโครงการที่ต้องการทำงานได้ทันที</span>
          </div>
        </form>
      </div>
    </div>
  );
}

window.Login = Login;
