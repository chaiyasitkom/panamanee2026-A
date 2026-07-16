import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusConfig } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Badge from '../components/Badge';
import CategoryChip from '../components/CategoryChip';
import LoadingOverlay from '../components/LoadingOverlay';
import ShareWorkOrder from '../components/ShareWorkOrder';
import { fmtDate, fmtDateTime, getProblems, getRepairPlace } from '../utils/helpers';
import { api } from '../api/firebase';

export default function RepairDetailScreen({ route }) {
  const { repair: init, user } = route.params;
  const [repair, setRepair] = useState(init);
  const [loading, setLoading] = useState(false);
  const { data, updateRepair } = useAppData();

  const canAct   = ['Admin', 'Officer', 'Technician'].includes(user.role);
  const isAdmin  = ['Admin', 'Officer'].includes(user.role);
  const cat      = data.categories.find(c => c.id === repair.categoryId);
  const assigned = data.users.find(u => u.id === repair.assignedId);

  const [probs, setProbs] = useState(() => getProblems(init));
  const [pickerFor, setPickerFor] = useState(null);
  const [place, setPlace] = useState(() => getRepairPlace(init));
  const doneCount = probs.filter(p => p.status === 'done').length;

  const setProbStatus = async (i, st) => {
    const prev = probs;
    const next = probs.map((p, idx) => (idx === i ? { ...p, status: st } : p));
    setProbs(next);
    setPickerFor(null);
    try {
      await api('updateRepairProblems', { id: repair.id, problems: next, by: user.name, note: `ปรับสถานะ "${next[i].text}" → ${(StatusConfig[st] || {}).label || st}` });
      const updated = { ...repair, problems: next };
      setRepair(updated); updateRepair(repair.id, () => updated);
    } catch (e) { setProbs(prev); Alert.alert('บันทึกไม่สำเร็จ', e.message); }
  };

  const setPl = (k, v) => setPlace(p => ({ ...p, [k]: v }));
  const savePlace = async () => {
    try {
      await api('updateRepairPlace', { id: repair.id, repairPlace: place, by: user.name });
      const updated = { ...repair, repairPlace: place };
      setRepair(updated); updateRepair(repair.id, () => updated);
      Alert.alert('บันทึกแล้ว ✓', 'สถานที่ทำการซ่อม');
    } catch (e) { Alert.alert('บันทึกไม่สำเร็จ', e.message); }
  };

  const doChange = async (nextStatus, label, note) => {
    setLoading(true);
    try {
      await api('updateRepairStatus', { id: repair.id, status: nextStatus, by: user.name, note: note || label });
      const tlEntry = { status: nextStatus, when: new Date().toISOString(), by: user.name, note: note || label };
      const updated = { ...repair, status: nextStatus, timeline: [...repair.timeline, tlEntry] };
      setRepair(updated);
      updateRepair(repair.id, () => updated);
      Alert.alert('สำเร็จ ✓', label);
    } catch (err) {
      Alert.alert('ไม่สำเร็จ', err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = (nextStatus, label, note, destructive = false) => {
    Alert.alert(label, `ยืนยันการดำเนินการ: "${label}"?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ยืนยัน', style: destructive ? 'destructive' : 'default', onPress: () => doChange(nextStatus, label, note) },
    ]);
  };

  const InfoRow = ({ label, children }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoVal}>{typeof children === 'string' ? <Text style={styles.infoValText}>{children || '—'}</Text> : children}</View>
    </View>
  );

  const isClosed = repair.status === 'done' || repair.status === 'cancel';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <LoadingOverlay visible={loading} text="กำลังบันทึก..." />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.runId}>{repair.running}</Text>
          <Badge status={repair.status} />
        </View>
        <Text style={styles.title}>{repair.title}</Text>
        {repair.desc ? <Text style={styles.desc}>{repair.desc}</Text> : null}
        <Text style={styles.headerDate}><Ionicons name="calendar-outline" size={12} /> {fmtDate(repair.createdAt)}</Text>
      </View>

      {/* ใบงาน — แชร์รูปฟอร์ม A4 (เหมือนเว็บ) */}
      <ShareWorkOrder repair={repair} data={data} />

      {/* Problems + per-item status */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitleFlat}>อาการ/ปัญหา</Text>
          {probs.length > 1 && (
            <Text style={[styles.doneCount, doneCount === probs.length && { color: Colors.success }]}>เสร็จ {doneCount}/{probs.length}</Text>
          )}
        </View>
        {probs.map((p, i) => {
          const cfg = StatusConfig[p.status] || StatusConfig.new;
          return (
            <View key={i} style={styles.probRow}>
              <Text style={styles.probNo}>{i + 1}.</Text>
              <Text style={styles.probText}>{p.text}</Text>
              <TouchableOpacity
                style={[styles.probStatus, { backgroundColor: cfg.bg }]}
                onPress={() => canAct && setPickerFor(i)}
                disabled={!canAct}
                activeOpacity={0.7}
              >
                <Text style={[styles.probStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                {canAct && <Ionicons name="chevron-down" size={12} color={cfg.color} />}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Repair place */}
      {canAct && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>สถานที่ทำการซ่อม</Text>
          <Text style={styles.plLabel}>แจ้งซ่อมที่</Text>
          <TextInput style={styles.plInput} value={place.reportAt} onChangeText={v => setPl('reportAt', v)} placeholder="—" placeholderTextColor={Colors.muted} />
          {[{ k: 'onsite', label: 'ส่งช่างซ่อมหน้างาน' }, { k: 'workshop', label: 'โรงซ่อมของบริษัทที่แจ้งซ่อม' }, { k: 'other', label: 'อื่นๆ' }].map(opt => (
            <View key={opt.k}>
              <TouchableOpacity style={styles.radioRow} onPress={() => setPl('mode', opt.k)} activeOpacity={0.7}>
                <Ionicons name={place.mode === opt.k ? 'radio-button-on' : 'radio-button-off'} size={20} color={place.mode === opt.k ? Colors.primary : Colors.muted} />
                <Text style={styles.radioText}>{opt.label}</Text>
              </TouchableOpacity>
              {opt.k === 'onsite' && place.mode === 'onsite' && (
                <TextInput style={styles.plInputIndent} value={place.onsite} onChangeText={v => setPl('onsite', v)} placeholder="ระบุสถานที่" placeholderTextColor={Colors.muted} />
              )}
              {opt.k === 'other' && place.mode === 'other' && (
                <TextInput style={styles.plInputIndent} value={place.other} onChangeText={v => setPl('other', v)} placeholder="ระบุ" placeholderTextColor={Colors.muted} />
              )}
            </View>
          ))}
          <Text style={styles.plLabel}>หมายเหตุ</Text>
          <TextInput style={[styles.plInput, { minHeight: 56 }]} value={place.note} onChangeText={v => setPl('note', v)} multiline textAlignVertical="top" placeholder="—" placeholderTextColor={Colors.muted} />
          <TouchableOpacity style={styles.saveBtn} onPress={savePlace} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>บันทึกสถานที่ซ่อม</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ข้อมูลการแจ้งซ่อม</Text>
        <InfoRow label="เลขที่ไซต์งาน">{repair.siteId || '—'}</InfoRow>
        <InfoRow label="รหัสเครื่องจักร">{repair.machineCode || '—'}</InfoRow>
        <InfoRow label="โครงการ/หน่วยงาน">{repair.project || '—'}</InfoRow>
        <InfoRow label="หมวดหมู่">
          <CategoryChip categoryId={repair.categoryId} categories={data.categories} />
        </InfoRow>
        <InfoRow label="ผู้แจ้ง">{repair.reporterName || '—'}</InfoRow>
        <InfoRow label="ผู้รับผิดชอบ">{assigned?.name || 'ยังไม่มอบหมาย'}</InfoRow>
        <InfoRow label="ค่าใช้จ่าย">
          {repair.cost ? `฿${Number(repair.cost).toLocaleString()}` : '—'}
        </InfoRow>
      </View>

      {/* Quick Actions */}
      {canAct && !isClosed && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ดำเนินการ</Text>
          <View style={styles.actionsWrap}>
            {repair.status === 'new' && (
              <ActionButton icon="search-outline" label="ประเมินราคา" color={Colors.purple}
                onPress={() => confirm('assess', 'ประเมินราคา')} />
            )}
            {repair.status === 'assess' && (
              <ActionButton icon="checkmark-outline" label="อนุมัติซ่อม" color={Colors.warning}
                onPress={() => confirm('progress', 'อนุมัติซ่อม เริ่มดำเนินการ')} />
            )}
            {repair.status === 'progress' && (<>
              <ActionButton icon="cube-outline" label="รออะไหล่" color={Colors.danger}
                onPress={() => confirm('parts', 'รออะไหล่')} />
              <ActionButton icon="flag-outline" label="ปิดงาน" color={Colors.success}
                onPress={() => confirm('done', 'ปิดงาน', 'ปิดงานสำเร็จ', true)} />
            </>)}
            {repair.status === 'parts' && (
              <ActionButton icon="play-outline" label="กลับมาดำเนินการ" color={Colors.warning}
                onPress={() => confirm('progress', 'กลับมาดำเนินการ')} />
            )}
            {isAdmin && (
              <ActionButton icon="ban-outline" label="ยกเลิกงาน" color={Colors.danger}
                onPress={() => confirm('cancel', 'ยกเลิกงาน', 'ยกเลิกงานโดย Admin', true)} />
            )}
          </View>
        </View>
      )}

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ประวัติการดำเนินการ</Text>
        {[...repair.timeline].reverse().map((t, i, arr) => {
          const cfg = StatusConfig[t.status] || StatusConfig.new;
          return (
            <View key={i} style={styles.tlItem}>
              <View style={{ alignItems: 'center', width: 20 }}>
                <View style={[styles.tlDot, { backgroundColor: cfg.color }]} />
                {i < arr.length - 1 && <View style={styles.tlLine} />}
              </View>
              <View style={styles.tlBody}>
                <Text style={styles.tlStatus}>{cfg.label}</Text>
                <Text style={styles.tlNote}>{t.note}</Text>
                <Text style={styles.tlWhen}>โดย {t.by} · {fmtDateTime(t.when)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Status picker for a problem */}
      <Modal visible={pickerFor !== null} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <TouchableOpacity style={styles.pkScrim} activeOpacity={1} onPress={() => setPickerFor(null)}>
          <View style={styles.pkBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.pkTitle}>เลือกสถานะรายอาการ</Text>
            {Object.entries(StatusConfig).map(([k, cfg]) => (
              <TouchableOpacity key={k} style={styles.pkItem} onPress={() => setProbStatus(pickerFor, k)} activeOpacity={0.7}>
                <View style={[styles.pkDot, { backgroundColor: cfg.color }]} />
                <Text style={styles.pkItemText}>{cfg.label}</Text>
                {pickerFor !== null && probs[pickerFor] && probs[pickerFor].status === k && (
                  <Ionicons name="checkmark" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pkClose} onPress={() => setPickerFor(null)}>
              <Text style={styles.pkCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function ActionButton({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color + '15', borderColor: color + '55' }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.actionTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { backgroundColor: Colors.primary, padding: 20 },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  runId:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  title:       { fontSize: 19, fontWeight: '700', color: '#fff', marginBottom: 6 },
  desc:        { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 19, marginBottom: 8 },
  headerDate:  { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  card:        { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.line },
  cardTitleRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.line },
  cardTitleFlat:{ fontSize: 14, fontWeight: '700', color: Colors.text },
  doneCount:   { fontSize: 12, fontWeight: '500', color: Colors.muted },
  probRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.line + '80' },
  probNo:      { fontSize: 13, color: Colors.muted, width: 16, textAlign: 'right' },
  probText:    { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
  probStatus:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  probStatusText:{ fontSize: 12, fontWeight: '600' },
  plLabel:     { fontSize: 12, color: Colors.muted, marginTop: 10, marginBottom: 5 },
  plInput:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text },
  plInputIndent:{ backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.text, marginLeft: 28, marginTop: 4 },
  radioRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  radioText:   { fontSize: 14, color: Colors.text },
  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10, marginTop: 14 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pkScrim:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  pkBox:       { backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  pkTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10, paddingHorizontal: 4 },
  pkItem:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.line },
  pkDot:       { width: 12, height: 12, borderRadius: 6 },
  pkItemText:  { flex: 1, fontSize: 14, color: Colors.text },
  pkClose:     { marginTop: 10, alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.bg, borderRadius: 10 },
  pkCloseText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.line + '80' },
  infoLabel:   { fontSize: 13, color: Colors.muted, flex: 1 },
  infoVal:     { flex: 1.5, alignItems: 'flex-end' },
  infoValText: { fontSize: 13, fontWeight: '500', color: Colors.text, textAlign: 'right' },
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionTxt:   { fontSize: 13, fontWeight: '600' },
  tlItem:      { flexDirection: 'row', gap: 10, marginBottom: 0 },
  tlDot:       { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  tlLine:      { width: 1.5, flex: 1, backgroundColor: Colors.line, marginTop: 2, marginBottom: -4, alignSelf: 'center' },
  tlBody:      { flex: 1, paddingBottom: 14 },
  tlStatus:    { fontSize: 13, fontWeight: '600', color: Colors.text },
  tlNote:      { fontSize: 12, color: Colors.muted, marginTop: 1 },
  tlWhen:      { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
