// สร้าง HTML ฟอร์มใบงาน A4 "ใบแจ้งซ่อมเครื่องจักรและอุปกรณ์" (บริษัท พานามณี)
// พอร์ตจากเว็บ src/shared.jsx → window.buildRepairFormDoc ให้ได้รูปเหมือนกันเป๊ะ
import { getProblems, getRepairPlace, projectLabel } from './helpers';
import { LOGO_JPEG_BASE64 } from './logoBase64';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtShort = d => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const y = (dt.getFullYear() + 543) % 100;
  return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + String(y).padStart(2, '0');
};

// r: repair, data: { machines, categories, projects }
export function buildRepairFormDoc(r, data = {}) {
  const machines = data.machines || [];
  const categories = data.categories || [];
  const projLabel = projectLabel(data.projects, r.project);
  const m = machines.find(x => x.code === r.machineCode) || {};
  const cat = categories.find(c => c.id === r.categoryId) || {};
  const probs = getProblems(r);
  const dateStr = fmtShort(r.createdAt);
  // ข้อมูลที่กรอก = ตัวอักษรสีน้ำเงิน (แยกจากตัวฟอร์มที่เป็นสีดำ)
  const fill = v => (v ? "<span class='fld'>" + esc(v) + '</span>' : '');
  const rp = getRepairPlace(r);
  const box = on => "<span class='chk'>" + (on ? '✓' : '') + '</span>';

  const rowCount = Math.max(5, probs.length);
  let rows = '';
  for (let i = 0; i < rowCount; i++) {
    const p = probs[i];
    rows += "<tr><td class='c-no'>" + (i + 1) + "</td><td class='c-item'>" + fill(p && p.text) + "</td><td class='c-insp'></td></tr>";
  }

  const logo = "<img src='data:image/jpeg;base64," + LOGO_JPEG_BASE64 + "' width='92' alt='' style='display:block'>";

  const html = "<!doctype html><html lang='th'><head><meta charset='utf-8'>"
    + "<meta name='viewport' content='width=760'>"
    + "<title>ใบแจ้งซ่อม " + esc(r.running) + "</title><style>"
    + "@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:'Sarabun',Tahoma,Arial,sans-serif;color:#000;font-size:13px;margin:0}"
    + ".sheet{width:186mm;margin:0 auto;padding:8mm}.hd{display:flex;align-items:center;gap:14px;margin-bottom:2px}.hd-title{flex:1;text-align:center}.cn-th{font-size:22px;font-weight:700}.cn-en{font-size:15px;font-weight:700;letter-spacing:.5px}.hd-sp{width:92px}"
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
    + ".fld{color:#1D4ED8;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}"
    + "</style></head><body><div class='sheet'>"
    + "<div class='hd'><div>" + logo + "</div><div class='hd-title'><div class='cn-th'>บริษัท พานามณี จำกัด</div><div class='cn-en'>PANAMANEE COMPANY LIMITED</div></div><div class='hd-sp'></div></div>"
    + "<div class='doc-title'>ใบแจ้งซ่อมเครื่องจักรและอุปกรณ์</div>"
    + "<div class='row2'><div>เลขที่ <span class='dot w180'>" + fill(r.running) + "</span></div><div>วันที่ <span class='dot w120'>" + fill(dateStr) + "</span></div></div>"
    + "<div class='info'>"
    + "<div class='ln'><b>ประเภทเครื่องจักร</b><span class='dot f2'>" + fill(cat.name) + "</span><b>หมายเลขเครื่องจักร</b><span class='dot f2'>" + fill(r.machineCode) + "</span><b>กรรมสิทธิ์</b><span class='dot f1'>" + fill(m.ownership) + "</span></div>"
    + "<div class='ln'><b>ยี่ห้อ</b><span class='dot f1'>" + fill(m.brand) + "</span><b>รุ่น</b><span class='dot f1'>" + fill(m.model) + "</span><b>ขนาด</b><span class='dot f1'>" + fill(m.size) + "</span><b>ปี</b><span class='dot f1'></span><b>ทะเบียน</b><span class='dot f1'></span></div>"
    + "<div class='ln'><b>Serial No.</b><span class='dot f1'>" + fill(m.serial) + "</span><b>Engine No.</b><span class='dot f1'></span><b>Chassis No.</b><span class='dot f1'></span></div>"
    + "<div class='ln'><b>เลขมิเตอร์กิโลเมตร</b><span class='dot f1'></span><b>เลขมิเตอร์ชั่วโมง</b><span class='dot f1'>" + fill(m.hours) + "</span></div>"
    + "<div class='ln'><b>หน่วยงาน</b><span class='dot f1'>" + fill(projLabel) + "</span><b>สถานที่</b><span class='dot f1'>" + fill(m.location) + "</span></div>"
    + "</div>"
    + "<div class='box'><div class='box-hd'>รายการซ่อม (อาการผิดปกติ)</div><table class='rt'><thead><tr><th class='c-no'></th><th class='c-item'>รายการ</th><th class='c-insp'>ผู้ตรวจพบ</th></tr></thead><tbody>" + rows + "</tbody></table></div>"
    + "<table class='sig'><tr><th>พนักงานขับ</th><th>ผู้จัดทำเอกสาร/ ผู้รับแจ้ง</th><th>หัวหน้าแผนกปฏิบัติการ</th><th>ผู้จัดการฝ่ายบริหาร</th></tr>"
    + "<tr class='sig-name'><td>" + fill(m.driverName) + "</td><td>" + fill(r.reporterName) + "</td><td></td><td></td></tr>"
    + "<tr class='sig-paren'><td>( ...................... )</td><td>( ...................... )</td><td>( ...................... )</td><td>( ...................... )</td></tr>"
    + "<tr class='sig-date'><td>วันที่ " + fill(dateStr) + "</td><td>วันที่ " + fill(dateStr) + "</td><td>วันที่ ..............</td><td>วันที่ ..............</td></tr></table>"
    + "<div class='box'><div class='box-hd'>สถานที่ทำการซ่อม</div><div class='loc'>"
    + "<div class='ln'><b>แจ้งซ่อมที่</b><span class='dot fwide'>" + fill(rp.reportAt) + "</span></div>"
    + "<div class='ln'><b>สถานที่ทำการซ่อม</b>" + box(rp.mode === 'onsite') + "ส่งช่างซ่อมหน้างาน ที่ <span class='dot f1'>" + fill(rp.onsite) + "</span></div>"
    + "<div class='ln indent'>" + box(rp.mode === 'workshop') + "โรงซ่อมของบริษัทที่แจ้งซ่อม</div>"
    + "<div class='ln indent'>" + box(rp.mode === 'other') + "อื่นๆ <span class='dot f1'>" + fill(rp.other) + "</span></div>"
    + "<div class='ln'><b>หมายเหตุ</b><span class='dot fwide'>" + fill(rp.note) + "</span></div>"
    + "</div></div>"
    + "</div></body></html>";
  return html;
}

export function repairFormFileName(r) {
  return 'ใบแจ้งซ่อม-' + String(r.running || '').replace(/[\\/]/g, '-') + '.png';
}
