# Deploy บน Netlify (ฟรี · 2 นาที)

## วิธี 1 — ลาก & วาง (ง่ายสุด)
1. ไปที่ https://app.netlify.com/drop
2. Login ด้วย GitHub / Google / Email
3. ลากทั้งโฟลเดอร์โปรเจคนี้ (รวม `index.html`, `styles.css`, `src/`, `netlify.toml`) ไปวางบนหน้า drop zone
4. รอประมาณ 30 วินาที → ได้ URL แบบ `https://xxxxx.netlify.app`
5. (ถ้าต้องการ) คลิก **Site settings → Change site name** เพื่อเปลี่ยนชื่อ subdomain

## วิธี 2 — Git (แนะนำสำหรับอัพเดตต่อเนื่อง)
1. Push โปรเจคขึ้น GitHub repo
2. Netlify → **Add new site → Import an existing project**
3. เลือก GitHub → เลือก repo
4. Build settings:
   - Build command: _(เว้นว่าง)_
   - Publish directory: `.`
5. Deploy

## สำคัญ — หลัง Deploy
- เพิ่ม Netlify URL ของคุณใน Apps Script: ไม่ต้องทำอะไร เพราะ Apps Script Web App ตั้ง CORS เปิดให้ทุก origin เรียกได้อยู่แล้ว
- ถ้าใช้ custom domain → Netlify → **Domain settings → Add custom domain**

## ไฟล์ที่ต้องมีในโปรเจค
```
index.html
styles.css
netlify.toml
src/
  ├── config.jsx
  ├── data.jsx
  ├── shared.jsx
  ├── login.jsx
  ├── sidebar.jsx
  ├── dashboard.jsx
  ├── repairs.jsx
  ├── users.jsx
  ├── categories.jsx
  ├── machines.jsx
  ├── reporter.jsx
  ├── tweaks.jsx
  └── app.jsx
backend/
  ├── Code.gs     (วางใน Apps Script — ไม่ deploy กับ Netlify)
  └── README.md
```
