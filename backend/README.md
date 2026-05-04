# Google Apps Script Backend — วิธี Deploy (อัพเดตล่าสุด)

ระบบใช้ **2 Google Sheets** + **1 Google Drive Folder**:

| # | ID | เก็บข้อมูล |
|---|---|---|
| Sheet หลัก | `1TK9qhEbPhMNjygRD2dvibW2IY8MrSI0ORqW2nIbbUFw` | Repairs · Machines · Categories · Timeline |
| Sheet Users | `1CngMtXwDz8v0whavy_8bC481-npc3hROPpjk6tTHv4w` | Users |
| Drive Folder | `1jZPV5NDh374VMnm4H_hOLkA6tWArjIQW` | รูปภาพก่อน/หลังซ่อม (แยกโฟลเดอร์ตามเลข RE-69/xxx) |

## 1. สร้างโปรเจค Apps Script
1. เปิด https://script.google.com → **New project**
2. เปลี่ยนชื่อโปรเจคเป็น `Repair System Backend`
3. ลบ `Code.gs` เดิมทิ้ง แล้ววางเนื้อหาจาก `backend/Code.gs` (ในโปรเจคนี้) ทั้งหมด

## 2. ตั้งค่า Timezone
เมนู **Project Settings** (เฟืองซ้ายมือ) → Time zone → `(GMT+07:00) Bangkok`

## 3. รัน setupSheets (ครั้งแรกเท่านั้น)
1. ใน dropdown เหนือ editor เลือกฟังก์ชัน `setupSheets` → กด **Run**
2. กด **Review permissions** → เลือก Google account
3. หากเจอ "Google hasn't verified this app" → **Advanced → Go to Repair System Backend (unsafe) → Allow**
4. รอจนเห็น `✅ Setup complete` ใน Execution log
5. ตรวจสอบ:
   - Sheet `1TK9qh...` → มี tabs: **Repairs, Categories, Machines, Timeline**
   - Sheet `1CngMt...` → มี tab: **Users**

## 4. Deploy เป็น Web App
1. ปุ่ม **Deploy** (มุมขวาบน) → **New deployment**
2. ไอคอนเฟือง → **Web app**
3. ตั้งค่า:
   - Description: `v2`
   - Execute as: **Me**
   - Who has access: **Anyone** ⚠️ สำคัญ
4. **Deploy** → คัดลอก Web app URL (ลงท้าย `/exec`)

## 5. เชื่อม Frontend
เปิด `src/config.jsx` แก้ค่า `APPS_SCRIPT_URL` เป็น URL ใหม่ที่ได้

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXXXXXX/exec";
```

## 6. ถ้าแก้โค้ดแล้วไม่อัพเดต
**Deploy → Manage deployments → แก้ไข deployment เดิม → Version: New version → Deploy**
(ถ้า New deployment ใหม่ทุกครั้ง URL จะเปลี่ยน ต้องแก้ frontend ตาม)

## 7. รีเซ็ตข้อมูล
ถ้าต้องการลบข้อมูลทั้งหมด ลบ tab ใน Sheet ด้วยมือก่อน แล้ว Run `setupSheets` ใหม่

---

## API Actions
`ping` · `login` · `bootstrap` · `listRepairs` · `createRepair` · `updateRepairStatus` · `uploadAfterPhotos` ·
`listUsers` / `createUser` / `updateUser` / `deleteUser` ·
`listCategories` / `createCategory` / `updateCategory` / `deleteCategory` ·
`listMachines` / `createMachine` / `updateMachine` / `deleteMachine`

ทุก action ส่ง POST ไปที่ URL เดียว body:
```json
{ "action": "xxx", ...payload }
```

response:
```json
{ "ok": true, "data": ... }
// หรือ
{ "ok": false, "error": "..." }
```
