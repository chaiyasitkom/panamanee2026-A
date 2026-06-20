import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusConfig } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Badge from '../components/Badge';
import CategoryChip from '../components/CategoryChip';
import LoadingOverlay from '../components/LoadingOverlay';
import { fmtDate, fmtDateTime } from '../utils/helpers';
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
