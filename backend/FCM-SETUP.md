# ตั้งค่าแจ้งเตือนแบบ Push (Firebase Cloud Messaging)

แจ้งเตือนเดิมทำงานเฉพาะตอนเปิดเว็บค้างไว้ · ทำตามเอกสารนี้แล้วจะ **เตือนได้แม้ปิดแอปไปแล้ว**

| ส่วน | อยู่ที่ไหน | สถานะ |
|---|---|---|
| ตัวขอ token + สวิตช์เปิด/ปิด | `ระบบแจ้งซ่อมเครื่องจักร.html` (`window.__FCM`) | เขียนเสร็จแล้ว |
| ตัวรับตอนปิดแอป | `sw.js` | เขียนเสร็จแล้ว |
| ตัวส่งจากเซิร์ฟเวอร์ | `backend/Notify.gs` | เขียนเสร็จแล้ว — **ต้องเอาไปวางใน Apps Script** |
| VAPID key + Service account | Firebase Console | **ต้องทำเอง (ขั้นตอนข้างล่าง)** |

ใช้ Apps Script เป็นตัวส่งเพราะโปรเจคมีอยู่แล้วและ **ไม่ต้องอัปเกรด Firebase เป็นแพ็กเกจ Blaze**
(ถ้าใช้ Cloud Functions ต้องผูกบัตรเครดิต)

---

## 1. เปิด Cloud Messaging API

1. เข้า [Firebase Console](https://console.firebase.google.com/) → เลือกโปรเจค **uesr-panamanee**
2. ไอคอนเฟือง ⚙️ → **Project settings** → แท็บ **Cloud Messaging**
3. ถ้าหัวข้อ **Firebase Cloud Messaging API (V1)** ขึ้นว่า *Disabled* → กด **⋮ → Enable** (จะเด้งไป Google Cloud Console ให้กด Enable)

## 2. เอา VAPID key (Web Push certificate)

1. หน้าเดิม **Project settings → Cloud Messaging** → เลื่อนลงหา **Web configuration → Web Push certificates**
2. ถ้ายังไม่มี → กด **Generate key pair**
3. คัดลอกค่า **Key pair** (สตริงยาว ๆ ขึ้นต้นด้วย `B...`)
4. เอาไปใส่ที่ **Realtime Database** (ไม่ต้องแก้โค้ด):
   - Firebase Console → **Realtime Database** → ที่ node ราก กด **+**
   - สร้าง `config` → ข้างใน สร้าง `fcmVapidKey` → value = คีย์ที่คัดลอกมา
   - ผลลัพธ์: `config/fcmVapidKey = "B...."`
   - *(หรือจะใส่ในโค้ดตรง `const FCM_VAPID_KEY = ""` ในไฟล์ `ระบบแจ้งซ่อมเครื่องจักร.html` ก็ได้ แต่ต้อง build + deploy ใหม่)*

## 3. สร้าง Service account (กุญแจให้ Apps Script ยิง push ได้)

1. Firebase Console → ⚙️ **Project settings** → แท็บ **Service accounts**
2. กด **Generate new private key** → **Generate key** → ได้ไฟล์ `.json` ดาวน์โหลดมา
3. เปิดไฟล์นั้นด้วย Notepad → **คัดลอกทั้งไฟล์** (ตั้งแต่ `{` ถึง `}`)

> ⚠️ ไฟล์นี้คือกุญแจเข้าโปรเจค ห้ามอัปขึ้น GitHub หรือส่งให้คนอื่น — เก็บไว้ใน Apps Script เท่านั้น

## 4. วางโค้ดตัวส่งใน Apps Script

1. เปิด [script.google.com](https://script.google.com/) → เปิดโปรเจค **Repair System Backend** (ตัวเดียวกับที่ใช้อัปรูป)
2. กด **+** ข้าง Files → **Script** → ตั้งชื่อ `Notify`
3. ลบโค้ดตัวอย่างทิ้ง แล้ววางเนื้อหาทั้งหมดจาก `backend/Notify.gs`
4. เมนูซ้าย ⚙️ **Project Settings** → เลื่อนลงหา **Script Properties** → **Add script property**
   - Property: `FCM_SERVICE_ACCOUNT`
   - Value: วาง JSON ทั้งก้อนจากข้อ 3
   - กด **Save script properties**
5. ตรวจว่า **Time zone** เป็น `(GMT+07:00) Bangkok` (ไม่งั้นรอบ 08:00 จะเพี้ยน)

## 5. สร้าง trigger

1. ใน Apps Script เลือกไฟล์ `Notify` → dropdown ด้านบนเลือกฟังก์ชัน **`setupNotifyTriggers`** → กด **Run**
2. ครั้งแรกจะขอสิทธิ์ → **Review permissions → เลือกบัญชี → Advanced → Go to ... (unsafe) → Allow**
3. ดู Execution log ต้องขึ้นว่า `ตั้ง trigger เรียบร้อย...`
4. ตรวจที่เมนูซ้าย ⏰ **Triggers** จะเห็น 5 รายการ:
   - `pushNewRepairs` — ทุก 5 นาที
   - `pushPendingDigest` — วันละครั้ง × 4 รอบ (08:00 / 11:00 / 13:00 / 17:00)

## 6. เปิดรับแจ้งเตือนที่เครื่องผู้ใช้

บนเครื่องของแต่ละคน (Admin / ช่าง):

1. เปิดเว็บ → เมนูซ้ายล่าง **ตั้งค่า**
2. หัวข้อ **การแจ้งเตือนบนเครื่องนี้** → กด **เปิดการแจ้งเตือน** → เบราว์เซอร์ถามสิทธิ์ ให้กด **อนุญาต**
3. ป้ายต้องเปลี่ยนเป็น **เปิดอยู่**

**iPhone / iPad:** ต้องกด **แชร์ → Add to Home Screen** เปิดใช้จากไอคอนบนหน้าจอก่อน จึงจะเปิดแจ้งเตือนได้ (ข้อจำกัดของ iOS — ใช้ได้ตั้งแต่ iOS 16.4 ขึ้นไป)

## 7. ทดสอบ

1. ใน Apps Script เลือกฟังก์ชัน **`pushTestMessage`** → **Run**
2. ดู log ว่าเจอ token กี่เครื่อง และส่งสำเร็จกี่เครื่อง
3. ที่มือถือ (ปิดแอปได้เลย) ต้องเด้งข้อความ *"ทดสอบการแจ้งเตือน"*

ถ้าไม่เด้ง ให้ไล่ตามนี้:

| อาการใน log | สาเหตุ / วิธีแก้ |
|---|---|
| `พบ token ที่จะส่ง: 0` | ยังไม่มีใครกดเปิดแจ้งเตือนในหน้าตั้งค่า หรือ role ไม่ใช่ Admin/Technician |
| `ขอ access token ไม่สำเร็จ` | `FCM_SERVICE_ACCOUNT` ผิด/ไม่ครบ — คัดลอก JSON ใหม่ทั้งไฟล์ |
| `HTTP 403` + `SERVICE_DISABLED` | ยังไม่ได้เปิด FCM API (ข้อ 1) |
| `HTTP 404` / `UNREGISTERED` | token เก่าตายแล้ว ระบบลบให้เองอัตโนมัติ ให้กดเปิดแจ้งเตือนใหม่ที่เครื่องนั้น |
| เปิดสวิตช์ไม่ได้ ขึ้นว่ายังตั้งค่าไม่เสร็จ | ยังไม่ได้ใส่ `config/fcmVapidKey` (ข้อ 2) |

---

## หมายเหตุการทำงาน

- **ใบแจ้งซ่อมใหม่**: trigger ทุก 5 นาที → แจ้งเตือนช้าสุดประมาณ 5 นาที (ถ้าเปิดแอปอยู่ จะเด้ง toast ทันทีจากตัวเตือนในแอป)
- **สรุปงานค้าง**: Apps Script มีช่วงคลาดเคลื่อนของ trigger ประมาณ ±15 นาที ถือเป็นเรื่องปกติ
- ไม่ส่งแจ้งเตือนใบงานให้ "คนที่แจ้งเอง" และไม่ส่งสรุปถ้าไม่มีงานค้าง
- เครื่องที่เปิด push ไว้ ตัวเตือนในแอปจะหยุดเด้งแจ้งเตือนระดับเบราว์เซอร์ให้เอง (กันเด้งซ้ำ 2 อัน) แต่ยังมี toast ในหน้าเว็บตามปกติ
- ปิดรับแจ้งเตือนเครื่องไหนก็ไปกดปิดที่ **ตั้งค่า** ของเครื่องนั้น (token จะถูกลบออกจากฐานข้อมูล)
