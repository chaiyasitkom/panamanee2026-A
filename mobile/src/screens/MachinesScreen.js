import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ScrollView, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import CategoryChip from '../components/CategoryChip';
import Badge from '../components/Badge';
import SelectField from '../components/SelectField';
import LoadingOverlay from '../components/LoadingOverlay';
import { fmtDate } from '../utils/helpers';
import { api } from '../api/firebase';

const STATUS_OPTS = [
  { value: 'ใช้งาน', label: 'ใช้งาน' },
  { value: 'ซ่อม', label: 'ซ่อม' },
  { value: 'รอซ่อม', label: 'รอซ่อม' },
];
const STATUS_COLOR = { 'ใช้งาน': Colors.success, 'ซ่อม': Colors.danger, 'รอซ่อม': Colors.warning };

const emptyMachine = () => ({
  id: '', project: '', code: '', name: '', brand: '', model: '', size: '',
  serial: '', ownership: '', categoryId: '', note: '', status: 'ใช้งาน',
  location: '', lastService: '', hours: 0, icon: 'fa-gears',
});

export default function MachinesScreen({ user }) {
  const { data, setData } = useAppData();
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  const canEdit = ['Admin', 'Officer'].includes(user.role);

  const rows = useMemo(() => {
    if (['Admin', 'Officer', 'Director'].includes(user.role)) return data.machines;
    const allowed = new Set(user.projects || []);
    return data.machines.filter(m => !m.project || allowed.has(m.project));
  }, [data.machines, user]);

  const filtered = useMemo(() => {
    let base = rows;
    if (q) {
      const qq = q.toLowerCase();
      base = base.filter(m => [m.name, m.code, m.brand, m.model, m.serial, m.project]
        .map(x => (x || '').toLowerCase()).join(' ').includes(qq));
    }
    if (statusF !== 'all') base = base.filter(m => m.status === statusF);
    return base;
  }, [rows, q, statusF]);

  const save = async (form) => {
    setLoading(true);
    try {
      if (form.id) {
        await api('updateMachine', { id: form.id, patch: form });
        setData(prev => ({ ...prev, machines: prev.machines.map(x => x.id === form.id ? form : x) }));
      } else {
        const created = await api('createMachine', { m: form });
        setData(prev => ({ ...prev, machines: [...prev.machines, created] }));
      }
      setEdit(null);
    } catch (err) {
      Alert.alert('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = (m) => {
    Alert.alert('ลบเครื่องจักร?', `ต้องการลบ "${m.name}" (${m.code}) ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await api('deleteMachine', { id: m.id });
            setData(prev => ({ ...prev, machines: prev.machines.filter(x => x.id !== m.id) }));
            setDetail(null);
          } catch (err) {
            Alert.alert('ลบไม่สำเร็จ', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: m }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => setDetail(m)}>
      <View style={styles.cardTop}>
        <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
        <View style={[styles.statusDot, { backgroundColor: (STATUS_COLOR[m.status] || Colors.muted) + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[m.status] || Colors.muted }]}>{m.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{m.code}{m.brand ? ` · ${m.brand}` : ''}{m.model ? ` ${m.model}` : ''}</Text>
      <View style={styles.cardBottom}>
        <CategoryChip categoryId={m.categoryId} categories={data.categories} />
        <Text style={styles.project} numberOfLines={1}>{m.project || '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} text="กำลังบันทึก..." />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหา ชื่อ / รหัส / ยี่ห้อ / โครงการ..."
          placeholderTextColor={Colors.muted}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {[{ value: 'all', label: 'ทุกสถานะ' }, ...STATUS_OPTS].map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusF === f.value && styles.filterChipActive]}
            onPress={() => setStatusF(f.value)}
          >
            <Text style={[styles.filterText, statusF === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 90, gap: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyTxt}>ยังไม่มีเครื่องจักรในระบบ</Text>
          </View>
        )}
      />

      {canEdit && (
        <TouchableOpacity style={styles.fab} onPress={() => setEdit(emptyMachine())}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {detail && (
        <MachineDetailModal
          m={detail}
          categories={data.categories}
          repairs={data.repairs}
          canEdit={canEdit}
          onClose={() => setDetail(null)}
          onEdit={() => { setEdit(detail); setDetail(null); }}
          onDelete={() => remove(detail)}
        />
      )}

      {edit && (
        <MachineFormModal
          initial={edit}
          categories={data.categories}
          projects={data.projects}
          onClose={() => setEdit(null)}
          onSave={save}
        />
      )}
    </View>
  );
}

function MachineDetailModal({ m, categories, repairs, canEdit, onClose, onEdit, onDelete }) {
  const related = repairs.filter(r => r.machineCode === m.code).slice(0, 5);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>{m.code}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.detailName}>{m.name}</Text>
        <Text style={styles.detailSub}>{m.brand || '—'} {m.model || ''} {m.size ? `· ${m.size}` : ''}</Text>
        <View style={styles.detailBadges}>
          <View style={[styles.statusDot, { backgroundColor: (STATUS_COLOR[m.status] || Colors.muted) + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[m.status] || Colors.muted }]}>{m.status}</Text>
          </View>
          <CategoryChip categoryId={m.categoryId} categories={categories} />
        </View>

        <View style={styles.card2}>
          <Row label="โครงการ" value={m.project} />
          <Row label="ซีเรียล" value={m.serial} />
          <Row label="กรรมสิทธิ์/เช่า" value={m.ownership} />
          <Row label="สถานที่ติดตั้ง" value={m.location} />
          <Row label="ซ่อมบำรุงล่าสุด" value={m.lastService} />
          <Row label="ชั่วโมงทำงาน" value={`${Number(m.hours || 0).toLocaleString()} ชม.`} />
        </View>

        {m.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}><Ionicons name="document-text-outline" size={13} /> หมายเหตุ</Text>
            <Text style={styles.noteText}>{m.note}</Text>
          </View>
        ) : null}

        <View style={styles.card2}>
          <Text style={styles.cardTitle}>ประวัติการแจ้งซ่อม ({related.length})</Text>
          {related.map(r => (
            <View key={r.id} style={styles.relRow}>
              <Text style={styles.relId}>{r.running}</Text>
              <Text style={styles.relTitle} numberOfLines={1}>{r.title}</Text>
              <Badge status={r.status} />
            </View>
          ))}
          {related.length === 0 && <Text style={styles.emptyTxt}>ยังไม่มีประวัติการซ่อม</Text>}
        </View>

        {canEdit && (
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.btnGhost} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              <Text style={[styles.btnGhostText, { color: Colors.danger }]}>ลบ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={onEdit}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>แก้ไข</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}

function MachineFormModal({ initial, categories, projects, onClose, onSave }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const activeProjects = (projects || []).filter(p => p.status !== 'inactive');

  const submit = () => {
    if (!f.code?.trim() || !f.name?.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณากรอก รหัสเครื่องจักร และ ชื่อเครื่องจักร');
      return;
    }
    onSave({ ...f, hours: Number(f.hours) || 0 });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>{initial.id ? 'แก้ไขเครื่องจักร' : 'เพิ่มเครื่องจักรใหม่'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <SelectField
          label="โครงการ"
          value={f.project}
          options={activeProjects.map(p => ({ value: p.name, label: (p.code ? `[${p.code}] ` : '') + p.name }))}
          onSelect={v => set('project', v)}
          placeholder="— เลือกโครงการ —"
        />
        <Field label="รหัสเครื่องจักร *" value={f.code} onChangeText={v => set('code', v)} placeholder="เช่น XCMG-001" />
        <Field label="เครื่องจักร (ชื่อ) *" value={f.name} onChangeText={v => set('name', v)} placeholder="เช่น Drilling Rig" />
        <Field label="ยี่ห้อ" value={f.brand} onChangeText={v => set('brand', v)} placeholder="เช่น XCMG, Komatsu" />
        <Field label="รุ่น" value={f.model} onChangeText={v => set('model', v)} placeholder="เช่น XR220D" />
        <Field label="ขนาด / ความยาว" value={f.size} onChangeText={v => set('size', v)} placeholder="เช่น 22 ตัน / 12 เมตร" />
        <Field label="ซีเรียล" value={f.serial} onChangeText={v => set('serial', v)} placeholder="Serial Number" />
        <Field label="กรรมสิทธิ์/เช่า" value={f.ownership} onChangeText={v => set('ownership', v)} placeholder="กรรมสิทธิ์, เช่า, ยืม..." />
        <SelectField
          label="หมวดหมู่"
          value={f.categoryId}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          onSelect={v => set('categoryId', v)}
          placeholder="— เลือกหมวดหมู่ —"
        />
        <SelectField
          label="สถานะ"
          value={f.status}
          options={STATUS_OPTS}
          onSelect={v => set('status', v)}
          placeholder="เลือกสถานะ"
        />
        <Field label="สถานที่ติดตั้ง" value={f.location} onChangeText={v => set('location', v)} placeholder="เช่น โรงงาน A - สายการผลิต 1" />
        <Field label="ชั่วโมงทำงานสะสม" value={String(f.hours || 0)} onChangeText={v => set('hours', v)} keyboardType="numeric" />
        <Field label="ซ่อมบำรุงล่าสุด" value={f.lastService} onChangeText={v => set('lastService', v)} placeholder="YYYY-MM-DD" />
        <Field label="หมายเหตุ" value={f.note} onChangeText={v => set('note', v)} placeholder="หมายเหตุเพิ่มเติม" multiline />

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btnGhostFull} onPress={onClose}>
            <Text style={styles.btnGhostText}>ยกเลิก</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimaryFull} onPress={submit}>
            <Ionicons name="save-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>บันทึก</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.textarea]}
        placeholderTextColor={Colors.muted}
        {...props}
      />
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.line },
  searchInput:      { flex: 1, fontSize: 14, color: Colors.text },
  filterBar:        { maxHeight: 44, marginBottom: 8 },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:       { fontSize: 12, fontWeight: '500', color: Colors.muted },
  filterTextActive: { color: '#fff' },
  card:             { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  name:             { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1 },
  meta:             { fontSize: 12, color: Colors.muted, marginBottom: 8 },
  cardBottom:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  project:          { fontSize: 11, color: Colors.muted, flex: 1, textAlign: 'right' },
  statusDot:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText:       { fontSize: 11, fontWeight: '700' },
  empty:            { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt:         { fontSize: 14, color: Colors.muted },
  fab:              { position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  detailHeader:     { backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailHeaderTitle:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  detailName:       { fontSize: 19, fontWeight: '700', color: Colors.text, marginTop: 6 },
  detailSub:        { fontSize: 13, color: Colors.muted, marginTop: 4, marginBottom: 12 },
  detailBadges:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  card2:            { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitle:        { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.line },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.line + '80' },
  rowLabel:         { fontSize: 13, color: Colors.muted },
  rowValue:         { fontSize: 13, fontWeight: '500', color: Colors.text, flex: 1, textAlign: 'right' },
  noteBox:          { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 14, marginBottom: 14 },
  noteTitle:        { fontSize: 12.5, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  noteText:         { fontSize: 13, color: '#78350F' },
  relRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.line + '80' },
  relId:            { fontSize: 11, fontWeight: '700', color: Colors.primary },
  relTitle:         { fontSize: 12.5, color: Colors.text, flex: 1 },
  detailActions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  field:            { marginBottom: 16 },
  label:            { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:            { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  textarea:         { minHeight: 80 },
  buttons:          { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnGhost:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.danger + '50' },
  btnGhostFull:     { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.line, alignItems: 'center' },
  btnGhostText:     { fontSize: 14, fontWeight: '600', color: Colors.muted },
  btnPrimary:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary },
  btnPrimaryFull:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary },
  btnPrimaryText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
