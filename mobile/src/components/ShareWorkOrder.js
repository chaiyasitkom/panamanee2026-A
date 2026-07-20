import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import { buildRepairFormDoc, repairFormFileName } from '../utils/repairForm';

// สคริปต์ที่ฉีดเข้า WebView หลังโหลดฟอร์ม: โหลด html2canvas (ชุดเดียวกับเว็บ) แล้วแปลง .sheet → PNG
// ส่ง dataURL กลับมาให้ RN ผ่าน postMessage
const CAPTURE_JS = `
(function(){
  function run(){
    try{
      // เว้นขอบขาวรอบใบงานก่อนแปลงเป็นรูป (แคปทั้ง body ที่ใส่ padding ไว้)
      document.body.style.padding = '28px 24px';
      document.body.style.background = '#ffffff';
      window.html2canvas(document.body, {scale:2, backgroundColor:'#ffffff', useCORS:true})
        .then(function(canvas){
          window.ReactNativeWebView.postMessage(JSON.stringify({ok:true, data:canvas.toDataURL('image/png')}));
        })
        .catch(function(e){
          window.ReactNativeWebView.postMessage(JSON.stringify({ok:false, error:String((e&&e.message)||e)}));
        });
    }catch(e){
      window.ReactNativeWebView.postMessage(JSON.stringify({ok:false, error:String((e&&e.message)||e)}));
    }
  }
  if(window.html2canvas){ run(); return; }
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  s.onload=function(){ setTimeout(run, 350); };
  s.onerror=function(){ window.ReactNativeWebView.postMessage(JSON.stringify({ok:false, error:'โหลดตัวแปลงรูปไม่ได้ (ต้องต่อเน็ต)'})); };
  document.head.appendChild(s);
})();
true;
`;

// autoStart: เริ่มสร้างรูปทันทีที่ mount · hideUI: ไม่ต้องแสดงการ์ด/ปุ่ม (ใช้ตอนแชร์อัตโนมัติหลังแจ้งซ่อม)
// onDone: เรียกเมื่อจบขั้นตอนแชร์ ไม่ว่าจะสำเร็จหรือไม่
export default function ShareWorkOrder({ repair, data, autoStart, hideUI, onDone }) {
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState(null);
  const started = useRef(false);

  const start = () => {
    if (busy) return;
    setBusy(true);
    setHtml(buildRepairFormDoc(repair, data));
  };

  useEffect(() => {
    if (autoStart && !started.current) { started.current = true; start(); }
  }, [autoStart]);

  const finish = () => { setHtml(null); setBusy(false); };
  const done = () => { finish(); if (onDone) onDone(); };

  const onMessage = async (e) => {
    let msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { msg = null; }
    if (!msg || !msg.ok) {
      done();
      Alert.alert('แชร์รูปไม่สำเร็จ', (msg && msg.error) || 'ไม่ทราบสาเหตุ');
      return;
    }
    try {
      const base64 = String(msg.data).replace(/^data:image\/png;base64,/, '');
      const fileUri = FileSystem.cacheDirectory + repairFormFileName(repair);
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      finish();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('แชร์ไม่ได้', 'อุปกรณ์นี้ไม่รองรับการแชร์');
        if (onDone) onDone();
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'แชร์ใบงาน ' + (repair.running || ''),
        UTI: 'public.png',
      });
      if (onDone) onDone();
    } catch (err) {
      done();
      Alert.alert('แชร์รูปไม่สำเร็จ', err.message || String(err));
    }
  };

  const capture = html ? (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://panamanee2026.onrender.com/' }}
        injectedJavaScript={CAPTURE_JS}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
        onError={() => { done(); Alert.alert('แชร์รูปไม่สำเร็จ', 'โหลดฟอร์มไม่ได้'); }}
        style={{ width: 760, height: 1400, backgroundColor: '#fff' }}
      />
    </View>
  ) : null;

  if (hideUI) return capture;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ใบงาน (ฟอร์มพานามณี)</Text>
      <Text style={styles.sub}>สร้างรูปฟอร์ม A4 เพื่อแชร์เข้า LINE หรือบันทึกเก็บไว้</Text>
      <TouchableOpacity style={[styles.btn, busy && { opacity: 0.7 }]} onPress={start} activeOpacity={0.85} disabled={busy}>
        {busy
          ? <ActivityIndicator color="#fff" size="small" />
          : <Ionicons name="share-social-outline" size={16} color="#fff" />}
        <Text style={styles.btnText}>{busy ? 'กำลังสร้างรูป...' : 'แชร์รูปใบงาน'}</Text>
      </TouchableOpacity>

      {/* WebView ซ่อนไว้นอกจอ ใช้เรนเดอร์ฟอร์มแล้วแปลงเป็นรูป */}
      {capture}
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  sub:     { fontSize: 12, color: Colors.muted, marginTop: 3, marginBottom: 12 },
  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#06C755', paddingVertical: 12, borderRadius: 10 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  hidden:  { position: 'absolute', left: -100000, top: 0, width: 760, height: 1400, opacity: 0 },
});
