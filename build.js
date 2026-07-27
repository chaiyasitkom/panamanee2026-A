#!/usr/bin/env node
/*
 * build.js — คอมไพล์ JSX ล่วงหน้า แทนการให้ Babel แปลงในเบราว์เซอร์ทุกครั้งที่เปิดเว็บ
 *
 *   ระบบแจ้งซ่อมเครื่องจักร.html  (ไฟล์ต้นฉบับที่แก้ — JSX อ่านง่ายเหมือนเดิม)
 *        │
 *        ├──> index.html      (บล็อก JSX ถูกถอดออก + ไม่โหลด babel.min.js แล้ว)
 *        └──> app.build.js    (JSX ทั้งหมดที่คอมไพล์เป็น JS ธรรมดาแล้ว)
 *
 * โหมด --check = ตรวจ syntax อย่างเดียว ไม่เขียนไฟล์
 *
 * ห้ามแก้ index.html หรือ app.build.js ตรงๆ — จะถูกเขียนทับทุกครั้งที่ commit
 */
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const ROOT = __dirname;
const SRC = path.join(ROOT, "ระบบแจ้งซ่อมเครื่องจักร.html");
const OUT_HTML = path.join(ROOT, "index.html");
const OUT_JS = path.join(ROOT, "app.build.js");

const CHECK_ONLY = process.argv.includes("--check");
const BABEL_TAG = /<script[^>]*src="[^"]*babel[^"]*"[^>]*><\/script>\s*/i;
const BLOCK = /[ \t]*<script type="text\/babel">([\s\S]*?)<\/script>\n?/g;

function die(msg) {
  console.error("\n[build] ✖ " + msg + "\n");
  process.exit(1);
}

if (!fs.existsSync(SRC)) die("ไม่พบไฟล์ต้นฉบับ: " + path.basename(SRC));

const html = fs.readFileSync(SRC, "utf8");

// ---- 1) ดึงบล็อก JSX ออกมา ----------------------------------------------
const blocks = [];
let m;
while ((m = BLOCK.exec(html)) !== null) {
  blocks.push({ code: m[1], index: m.index });
}
if (blocks.length === 0) {
  die('ไม่พบ <script type="text/babel"> ในไฟล์ต้นฉบับเลย — โครงสร้างไฟล์อาจเปลี่ยนไป');
}

// เลขบรรทัดของแต่ละบล็อก เอาไว้บอกตำแหน่งตอน error
for (const b of blocks) {
  b.line = html.slice(0, b.index).split("\n").length;
}

// ---- 2) คอมไพล์ทีละบล็อก -------------------------------------------------
const compiled = [];
for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i];
  try {
    const out = babel.transformSync(b.code, {
      filename: `block-${i + 1}.jsx`,
      // sourceType: script — โค้ดทั้งหมดใช้ global scope ร่วมกัน ไม่ใช่ ES module
      sourceType: "script",
      presets: [["@babel/preset-react", { runtime: "classic" }]],
      babelrc: false,
      configFile: false,
      compact: false,
      comments: false,
    });
    compiled.push(`/* ---- block ${i + 1} (ต้นฉบับบรรทัด ${b.line}) ---- */\n${out.code}`);
  } catch (err) {
    die(
      `คอมไพล์ JSX ไม่ผ่าน — block ${i + 1} (เริ่มที่บรรทัด ${b.line} ของ ${path.basename(SRC)})\n\n` +
        String(err.message)
    );
  }
}

// ---- 3) ประกอบ index.html ------------------------------------------------
if (!BABEL_TAG.test(html)) {
  die("ไม่พบแท็ก <script src=...babel...> ในไฟล์ต้นฉบับ — ตรวจสอบส่วน <head>");
}

let outHtml = html.replace(BABEL_TAG, "");

// บล็อกแรกกลายเป็นแท็กเรียก app.build.js (ตำแหน่งเดิม = ลำดับ defer ถูกต้อง คือรันหลัง React)
let first = true;
outHtml = outHtml.replace(BLOCK, () => {
  if (first) {
    first = false;
    return '<script defer src="app.build.js"></script>\n';
  }
  return "";
});

// ---- 4) กันไฟล์เสียหลุดขึ้น production ------------------------------------
if (/text\/babel/.test(outHtml)) die("ยังมี text/babel ค้างใน index.html — build ไม่สมบูรณ์");
if (/src="[^"]*babel[^"]*"/i.test(outHtml)) die("ยังโหลด babel.min.js อยู่ใน index.html");
if (!outHtml.includes('src="app.build.js"')) die("ไม่ได้ใส่แท็ก app.build.js ลงใน index.html");

const outJs =
  "/* สร้างอัตโนมัติโดย build.js — ห้ามแก้ไฟล์นี้ตรงๆ\n" +
  "   แก้ที่ ระบบแจ้งซ่อมเครื่องจักร.html แล้ว commit (hook จะ build ให้เอง) */\n\n" +
  compiled.join("\n\n");

if (CHECK_ONLY) {
  console.log(`[build] ✔ ตรวจแล้ว: JSX ${blocks.length} บล็อก คอมไพล์ผ่านทั้งหมด (ไม่ได้เขียนไฟล์)`);
  process.exit(0);
}

fs.writeFileSync(OUT_JS, outJs, "utf8");
fs.writeFileSync(OUT_HTML, outHtml, "utf8");

const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(
  `[build] ✔ JSX ${blocks.length} บล็อก → app.build.js (${kb(Buffer.byteLength(outJs))}) ` +
    `+ index.html (${kb(Buffer.byteLength(outHtml))})`
);
