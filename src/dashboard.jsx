function Dashboard({user,goTo}){
  const [loading,setLoading] = React.useState(true);
  const [costView,setCostView] = React.useState("category"); // category | project
  const doughnutRef = React.useRef(null);
  const barRef = React.useRef(null);
  const costRef = React.useRef(null);
  const chartsRef = React.useRef({});

  React.useEffect(()=>{
    const t = setTimeout(()=>setLoading(false),350);
    return ()=>clearTimeout(t);
  },[]);

  const repairs = React.useMemo(()=>{
    return window.filterByUserProjects(user, window.__DATA.repairs, "project");
  },[user]);

  // ====== Cost analytics ======
  const costStats = React.useMemo(()=>{
    const total = repairs.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const done  = repairs.filter(r=>r.status==="done").reduce((s,r)=>s+(Number(r.cost)||0),0);
    const pending = total - done;
    const avg = repairs.length ? total/repairs.length : 0;

    // by category
    const byCatMap = {};
    repairs.forEach(r=>{
      const c = r.categoryId || "uncat";
      if(!byCatMap[c]) byCatMap[c]={count:0,cost:0};
      byCatMap[c].count++;
      byCatMap[c].cost += Number(r.cost)||0;
    });
    const byCat = Object.entries(byCatMap).map(([id,v])=>{
      const cat = window.getCategory(id);
      return {id, name:cat.name, color:cat.color, icon:cat.icon, ...v};
    }).sort((a,b)=>b.cost-a.cost);

    // by project
    const byProjMap = {};
    repairs.forEach(r=>{
      const p = r.project || "ไม่ระบุโครงการ";
      if(!byProjMap[p]) byProjMap[p]={count:0,cost:0};
      byProjMap[p].count++;
      byProjMap[p].cost += Number(r.cost)||0;
    });
    const projColors = ["#1E40AF","#8B5CF6","#EF4444","#10B981","#F59E0B","#06B6D4","#EC4899","#6366F1","#14B8A6","#F97316"];
    const byProj = Object.entries(byProjMap).map(([name,v],i)=>({
      name, color:projColors[i%projColors.length], ...v
    })).sort((a,b)=>b.cost-a.cost);

    return {total,done,pending,avg,byCat,byProj};
  },[repairs]);

  const fmtBaht = (n) => "฿" + Math.round(Number(n)||0).toLocaleString();

  const counts = {
    all: repairs.length,
    assess: repairs.filter(r=>r.status==="assess").length,
    approve: repairs.filter(r=>r.status==="new").length,
    progress: repairs.filter(r=>["progress","parts"].includes(r.status)).length,
    done: repairs.filter(r=>r.status==="done").length,
  };

  React.useEffect(()=>{
    if(loading) return;
    // Doughnut
    if(doughnutRef.current){
      if(chartsRef.current.d) chartsRef.current.d.destroy();
      const catCount = {};
      repairs.forEach(r=>{ catCount[r.categoryId]=(catCount[r.categoryId]||0)+1; });
      const cats = window.__DATA.categories.filter(c=>catCount[c.id]);
      chartsRef.current.d = new Chart(doughnutRef.current,{
        type:"doughnut",
        data:{
          labels:cats.map(c=>c.name),
          datasets:[{
            data:cats.map(c=>catCount[c.id]),
            backgroundColor:cats.map(c=>c.color),
            borderWidth:0,
            hoverOffset:6
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          cutout:"68%",
          plugins:{
            legend:{position:"right",labels:{font:{family:"Kanit",size:12},usePointStyle:true,pointStyle:"circle",padding:12}},
            tooltip:{titleFont:{family:"Kanit"},bodyFont:{family:"Kanit"}}
          }
        }
      });
    }
    if(barRef.current){
      if(chartsRef.current.b) chartsRef.current.b.destroy();
      const now = new Date();
      const months=[]; const labels=[]; const data=[]; const dataDone=[];
      const mThai = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
      for(let i=5;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        months.push(d);
        labels.push(mThai[d.getMonth()]+" "+(d.getFullYear()+543-2500));
      }
      months.forEach(m=>{
        const total = repairs.filter(r=>{
          const d=new Date(r.createdAt);
          return d.getFullYear()===m.getFullYear() && d.getMonth()===m.getMonth();
        }).length;
        const done = repairs.filter(r=>{
          const d=new Date(r.createdAt);
          return d.getFullYear()===m.getFullYear() && d.getMonth()===m.getMonth() && r.status==="done";
        }).length;
        data.push(total); dataDone.push(done);
      });
      chartsRef.current.b = new Chart(barRef.current,{
        type:"bar",
        data:{
          labels,
          datasets:[
            {label:"งานทั้งหมด",data,backgroundColor:"#3B82F6",borderRadius:6,barThickness:18},
            {label:"ปิดงานแล้ว",data:dataDone,backgroundColor:"#10B981",borderRadius:6,barThickness:18}
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{
            legend:{labels:{font:{family:"Kanit"},usePointStyle:true,pointStyle:"circle"}},
            tooltip:{titleFont:{family:"Kanit"},bodyFont:{family:"Kanit"}}
          },
          scales:{
            x:{grid:{display:false},ticks:{font:{family:"Kanit"}}},
            y:{beginAtZero:true,grid:{color:"#F1F5F9"},ticks:{font:{family:"Kanit"},precision:0}}
          }
        }
      });
    }
    return ()=>{
      if(chartsRef.current.d) chartsRef.current.d.destroy();
      if(chartsRef.current.b) chartsRef.current.b.destroy();
      if(chartsRef.current.c) chartsRef.current.c.destroy();
    };
  },[loading]);

  // Cost chart
  React.useEffect(()=>{
    if(loading) return;
    if(!costRef.current) return;
    if(chartsRef.current.c) chartsRef.current.c.destroy();
    const src = costView==="category" ? costStats.byCat.map(x=>({label:x.name,val:x.cost,color:x.color})) : costStats.byProj.map(x=>({label:x.name,val:x.cost,color:x.color}));
    chartsRef.current.c = new Chart(costRef.current,{
      type:"bar",
      data:{
        labels: src.map(x=>x.label),
        datasets:[{
          label:"ค่าใช้จ่าย (บาท)",
          data: src.map(x=>x.val),
          backgroundColor: src.map(x=>x.color),
          borderRadius:6,
          barThickness:22,
        }]
      },
      options:{
        indexAxis:"y", responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            titleFont:{family:"Kanit"},bodyFont:{family:"Kanit"},
            callbacks:{label:(ctx)=>" ฿"+Math.round(ctx.parsed.x).toLocaleString()}
          }
        },
        scales:{
          x:{beginAtZero:true,grid:{color:"#F1F5F9"},ticks:{font:{family:"Kanit"},callback:(v)=>"฿"+Number(v).toLocaleString()}},
          y:{grid:{display:false},ticks:{font:{family:"Kanit",size:11.5}}}
        }
      }
    });
  },[loading,costView,costStats]);

  const recent = repairs.slice(0,5);

  const stats = [
    { key:"all", label:"รายการทั้งหมด", val:counts.all, icon:"fa-clipboard-list", color:"#3B82F6", delta:"+12% vs เดือนก่อน", up:true },
    { key:"assess", label:"รอประเมินราคา", val:counts.assess, icon:"fa-magnifying-glass-dollar", color:"#8B5CF6" },
    { key:"approve", label:"รออนุมัติ", val:counts.approve, icon:"fa-hourglass-half", color:"#F59E0B" },
    { key:"progress", label:"กำลังซ่อม", val:counts.progress, icon:"fa-screwdriver-wrench", color:"#EF4444" },
    { key:"done", label:"เสร็จสิ้น", val:counts.done, icon:"fa-circle-check", color:"#10B981", delta:"-3% vs เดือนก่อน", up:false },
  ];

  return (
    <>
      <Loading show={loading} />
      {!loading && <>
        <div className="stat-grid">
          {stats.map(s=>(
            <div className="stat" key={s.key}>
              <div className="ic" style={{background:s.color+"1a",color:s.color}}>
                <i className={`fa-solid ${s.icon}`}></i>
              </div>
              <div className="label">{s.label}</div>
              <div className="val">{s.val}</div>
              {s.delta && <div className="delta"><span className={s.up?"up":"down"}><i className={`fa-solid fa-arrow-${s.up?"up":"down"}`}></i></span> {s.delta}</div>}
            </div>
          ))}
        </div>

        <div className="charts-grid">
          <div className="card">
            <div className="card-h">
              <div>
                <h3>สถิติย้อนหลัง 6 เดือน</h3>
                <div className="sub">เปรียบเทียบจำนวนงานแจ้งเข้าและงานที่ปิดแล้ว</div>
              </div>
              <button className="btn btn-ghost btn-sm"><i className="fa-solid fa-download"></i> Export</button>
            </div>
            <div className="card-body" style={{height:320}}>
              <canvas ref={barRef}></canvas>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <div>
                <h3>สัดส่วนตามหมวดหมู่</h3>
                <div className="sub">งานซ่อมทั้งหมดแยกตามประเภท</div>
              </div>
            </div>
            <div className="card-body" style={{height:320}}>
              <canvas ref={doughnutRef}></canvas>
            </div>
          </div>
        </div>

        {/* ===== Cost analytics ===== */}
        <div className="stat-grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",marginBottom:18}}>
          <div className="stat"><div className="ic" style={{background:"rgba(30,64,175,.1)",color:"#1E40AF"}}><i className="fa-solid fa-sack-dollar"></i></div><div className="label">ประเมินค่าใช้จ่ายรวม</div><div className="val" style={{fontSize:22}}>{fmtBaht(costStats.total)}</div></div>
          <div className="stat"><div className="ic" style={{background:"rgba(16,185,129,.1)",color:"#10B981"}}><i className="fa-solid fa-circle-check"></i></div><div className="label">ปิดงาน/จ่ายแล้ว</div><div className="val" style={{fontSize:22}}>{fmtBaht(costStats.done)}</div></div>
          <div className="stat"><div className="ic" style={{background:"rgba(245,158,11,.1)",color:"#F59E0B"}}><i className="fa-solid fa-clock"></i></div><div className="label">ค้างอยู่ในระบบ</div><div className="val" style={{fontSize:22}}>{fmtBaht(costStats.pending)}</div></div>
          <div className="stat"><div className="ic" style={{background:"rgba(139,92,246,.1)",color:"#8B5CF6"}}><i className="fa-solid fa-chart-line"></i></div><div className="label">เฉลี่ย/งาน</div><div className="val" style={{fontSize:22}}>{fmtBaht(costStats.avg)}</div></div>
        </div>

        <div className="card" style={{marginBottom:18}}>
          <div className="card-h">
            <div>
              <h3>ประเมินค่าใช้จ่าย</h3>
              <div className="sub">แยกตาม{costView==="category"?"หมวดหมู่":"โครงการ"} · {repairs.length} งาน · รวม {fmtBaht(costStats.total)}</div>
            </div>
            <div className="seg" style={{display:"inline-flex",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:10,padding:3}}>
              <button className={costView==="category"?"on":""} onClick={()=>setCostView("category")}
                style={{padding:"7px 14px",borderRadius:7,border:"none",fontSize:13,cursor:"pointer",background:costView==="category"?"var(--primary)":"transparent",color:costView==="category"?"#fff":"var(--muted)",fontFamily:"Kanit"}}>
                <i className="fa-solid fa-tags"></i> หมวดหมู่
              </button>
              <button className={costView==="project"?"on":""} onClick={()=>setCostView("project")}
                style={{padding:"7px 14px",borderRadius:7,border:"none",fontSize:13,cursor:"pointer",background:costView==="project"?"var(--primary)":"transparent",color:costView==="project"?"#fff":"var(--muted)",fontFamily:"Kanit"}}>
                <i className="fa-solid fa-diagram-project"></i> โครงการ
              </button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:0}}>
            <div className="card-body" style={{height:360,borderRight:"1px solid var(--line)"}}>
              <canvas ref={costRef}></canvas>
            </div>
            <div style={{maxHeight:360,overflowY:"auto"}}>
              <table className="data">
                <thead><tr><th>{costView==="category"?"หมวดหมู่":"โครงการ"}</th><th style={{textAlign:"right"}}>งาน</th><th style={{textAlign:"right"}}>ค่าใช้จ่าย</th><th style={{textAlign:"right"}}>%</th></tr></thead>
                <tbody>
                  {(costView==="category"?costStats.byCat:costStats.byProj).map((x,i)=>{
                    const pct = costStats.total ? (x.cost/costStats.total*100) : 0;
                    return (
                      <tr key={i}>
                        <td>
                          <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                            <span style={{width:10,height:10,borderRadius:"50%",background:x.color,display:"inline-block"}}></span>
                            <span style={{fontSize:13}}>{x.name}</span>
                          </span>
                        </td>
                        <td style={{textAlign:"right",color:"var(--muted)",fontSize:12.5}}>{x.count}</td>
                        <td style={{textAlign:"right",fontWeight:500,fontSize:13}}>{fmtBaht(x.cost)}</td>
                        <td style={{textAlign:"right",color:"var(--muted)",fontSize:12}}>{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  {(costView==="category"?costStats.byCat:costStats.byProj).length===0 && (
                    <tr><td colSpan="4"><div className="empty" style={{padding:30}}><i className="fa-solid fa-chart-column"></i><div className="t" style={{fontSize:14}}>ยังไม่มีข้อมูลค่าใช้จ่าย</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <div>
              <h3>รายการแจ้งซ่อมล่าสุด</h3>
              <div className="sub">5 รายการที่เพิ่งแจ้งเข้ามา</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>goTo("repairs")}>ดูทั้งหมด <i className="fa-solid fa-arrow-right"></i></button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr>
                <th>เลขที่</th><th>อาการ/ปัญหา</th><th>หมวดหมู่</th><th>สถานะ</th><th>ผู้แจ้ง</th><th>วันที่</th>
              </tr></thead>
              <tbody>
                {recent.map(r=>(
                  <tr key={r.id}>
                    <td><span className="ticket-id">{r.running}</span></td>
                    <td><div className="cell-title">{r.title}</div></td>
                    <td><CategoryChip categoryId={r.categoryId}/></td>
                    <td><Badge status={r.status}/></td>
                    <td><Avatar name={r.reporterName}/>{r.reporterName}</td>
                    <td style={{color:"var(--muted)"}}>{window.__DATA.fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </>
  );
}
window.Dashboard = Dashboard;
