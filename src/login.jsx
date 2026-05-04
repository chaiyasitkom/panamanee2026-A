function Login({onLogin}){
  const [username,setUsername] = React.useState("");
  const [password,setPassword] = React.useState("");
  const [loading,setLoading] = React.useState(false);

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

  const demos = [
    {u:"admin", p:"admin", role:"ผู้ดูแลระบบ (Admin)"},
    {u:"officer", p:"officer", role:"เจ้าหน้าที่ (Officer)"},
    {u:"tech", p:"tech", role:"ช่างซ่อม (Technician)"},
    {u:"user", p:"user", role:"ผู้แจ้งซ่อม (Reporter)"},
    {u:"director", p:"director", role:"ผู้บริหาร (Director)"},
  ];

  const quick = (d) => { setUsername(d.u); setPassword(d.p); };

  return (
    <div className="login-wrap">
      <Loading show={loading} text="กำลังเข้าสู่ระบบ..." />
      <div className="login-brand">
        <div className="grid-bg"></div>
        <div className="login-logo">
          <div className="mark"><i className="fa-solid fa-screwdriver-wrench"></i></div>
          <div style={{lineHeight:1.3}}>
            <div>ระบบแจ้งซ่อมเครื่องจักร</div>
            <div style={{fontSize:12,fontWeight:300,color:"rgba(255,255,255,.6)",marginTop:2}}>Machine Repair Management</div>
          </div>
        </div>
        <div className="login-hero">
          <h1>จัดการงานซ่อมบำรุง<br/>ครบในที่เดียว</h1>
          <p>แจ้งซ่อม ติดตามสถานะ และวิเคราะห์งานบำรุงรักษาเครื่องจักร เชื่อมต่อ Firebase Realtime Database โดยตรง</p>
          <div className="chips">
            <span className="chip"><i className="fa-solid fa-bolt" style={{marginRight:6}}></i>Real-time</span>
            <span className="chip"><i className="fa-solid fa-database" style={{marginRight:6}}></i>Cloud Sync</span>
            <span className="chip"><i className="fa-solid fa-chart-line" style={{marginRight:6}}></i>Analytics</span>
          </div>
        </div>
        <div className="login-foot">© 2026 Repair Management System · v1.0</div>
      </div>
      <div className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <h2>เข้าสู่ระบบ</h2>
          <p className="sub">กรุณาใส่ข้อมูลบัญชีผู้ใช้งานของคุณ</p>
          <div className="field">
            <label>Username</label>
            <i className="fa-solid fa-user"></i>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="ชื่อผู้ใช้" autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <i className="fa-solid fa-lock"></i>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="รหัสผ่าน" autoComplete="current-password" />
          </div>
          <button className="login-btn" type="submit"><i className="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  );
}

window.Login = Login;
