function TweaksPanel({open,onClose,density,onDensityChange}){
  if(!open) return null;
  return (
    <div className="tweaks-panel">
      <div className="tweaks-h">
        <div className="t"><i className="fa-solid fa-sliders"></i> Tweaks</div>
        <button className="x" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
      </div>
      <div className="tweaks-b">
        <div className="lbl">Table density</div>
        <div className="seg">
          <button className={density==="comfortable"?"on":""} onClick={()=>onDensityChange("comfortable")}>Comfortable</button>
          <button className={density==="compact"?"on":""} onClick={()=>onDensityChange("compact")}>Compact</button>
        </div>
      </div>
    </div>
  );
}
window.TweaksPanel = TweaksPanel;
