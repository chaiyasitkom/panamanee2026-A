import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import LoadingOverlay from '../components/LoadingOverlay';
import { api } from '../api/firebase';

function SelectField({ label, value, options, onSelect, disabled, placeholder, hint }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.select, disabled && styles.selectDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectText, !current && styles.placeholder]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.muted} />
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalScrim} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o, i) => o.value + i}
              style={{ maxHeight: 360 }}
              renderItem={({ item: o }) => (
                <TouchableOpacity
                  style={styles.dropItem}
                  onPress={() => { onSelect(o.value); setOpen(false); }}
                >
                  <Text style={[styles.dropText, value === o.value && styles.dropActive]}>{o.label}</Text>
                  {value === o.value && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => <Text style={styles.dropEmpty}>ไม่มีตัวเลือก</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function NewRepairScreen({ navigation, user }) {
  const { data, addRepair } = useAppData();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ project: '', categoryId: '', machineCode: '', title: '', desc: '', siteId: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const allProjects = useMemo(() => {
    const all = [...new Set((data.machines || []).map(m => m.project).filter(Boolean))];
    if (['Admin', 'Officer', 'Director'].includes(user.role)) return all;
    const allowed = new Set(user.projects || []);
    return all.filter(p => allowed.has(p));
  }, [data.machines, user]);

  const projectMachines = useMemo(() => {
    if (!f.project) return [];
    return data.machines.filter(m => m.project === f.project);
  }, [f.project, data.machines]);

  const projectCategories = useMemo(() => {
    const ids = new Set(projectMachines.map(m => m.categoryId).filter(Boolean));
    return data.categories.filter(c => ids.has(c.id));
  }, [projectMachines, data.categories]);

  const filteredMachines = useMemo(() => {
    if (!f.categoryId) return projectMachines;
    return projectMachines.filter(m => m.categoryId === f.categoryId);
  }, [f.categoryId, projectMachines]);

  const submit = async () => {
    if (!f.project) { Alert.alert('กรอกไม่ครบ', 'กรุณาเลือกโครงการ/หน่วยงานก่อน'); return; }
    if (!f.categoryId) { Alert.alert('กรอกไม่ครบ', 'กรุณาเลือกหมวดหมู่'); return; }
    if (!f.title.trim() || !f.desc.trim()) { Alert.alert('กรอกไม่ครบ', 'กรุณาระบุอาการและรายละเอียดเพิ่มเติม'); return; }

    setLoading(true);
    try {
      const repair = {
        siteId: f.siteId, title: f.title, desc: f.desc,
        project: f.project, categoryId: f.categoryId,
        status: 'new', reporterId: user.id, reporterName: user.name,
        assignedId: '', cost: '', machineCode: f.machineCode,
      };
      const saved = await api('createRepair', { repair });
      addRepair({ ...saved, timeline: [{ status: 'new', when: new Date().toISOString(), by: user.name, note: 'แจ้งเข้าระบบ' }] });
      setLoading(false);
      Alert.alert('แจ้งซ่อมสำเร็จ! ✓', `เลขที่ใบแจ้งซ่อม: ${saved.running}`, [
        {
          text: 'ตกลง',
          onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('MyRepairs');
          },
        },
      ]);
    } catch (err) {
      setLoading(false);
      Alert.alert('บันทึกไม่สำเร็จ', err.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <LoadingOverlay visible={loading} text="กำลังบันทึก..." />

      <Text style={styles.pageTitle}>แบบฟอร์มแจ้งซ่อม</Text>
      <Text style={styles.pageSub}>ระบบจะออกเลขที่ใบแจ้งซ่อมให้อัตโนมัติหลังส่งแบบฟอร์ม</Text>

      <SelectField
        label="1. โครงการ/หน่วยงาน *"
        value={f.project}
        options={allProjects.map(p => ({ value: p, label: p }))}
        onSelect={v => setF(p => ({ ...p, project: v, categoryId: '', machineCode: '' }))}
        placeholder="— กรุณาเลือกโครงการ —"
      />

      <SelectField
        label="2. หมวดหมู่ *"
        value={f.categoryId}
        options={projectCategories.map(c => ({ value: c.id, label: c.name }))}
        onSelect={v => setF(p => ({ ...p, categoryId: v, machineCode: '' }))}
        disabled={!f.project}
        placeholder={!f.project ? '— เลือกโครงการก่อน —' : '— เลือกหมวดหมู่ —'}
        hint={f.project && projectCategories.length > 0 ? `พบ ${projectCategories.length} หมวดหมู่ในโครงการนี้` : null}
      />

      <SelectField
        label="3. เครื่องจักร"
        value={f.machineCode}
        options={filteredMachines.map(m => ({ value: m.code, label: `${m.code} — ${m.name}` }))}
        onSelect={v => set('machineCode', v)}
        disabled={!f.categoryId}
        placeholder={!f.categoryId ? '— เลือกหมวดหมู่ก่อน —' : '— เลือกเครื่องจักร —'}
        hint={f.categoryId && filteredMachines.length > 0 ? `พบ ${filteredMachines.length} เครื่องจักรในหมวดหมู่นี้` : null}
      />

      <View style={styles.field}>
        <Text style={styles.label}>4. อาการ/ปัญหา *</Text>
        <TextInput
          style={styles.input}
          value={f.title}
          onChangeText={v => set('title', v)}
          placeholder="เช่น มอเตอร์ไหม้ ใช้งานไม่ได้"
          placeholderTextColor={Colors.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>เลขที่ใบแจ้งซ่อม (ที่ไซต์งาน)</Text>
        <TextInput
          style={styles.input}
          value={f.siteId}
          onChangeText={v => set('siteId', v)}
          placeholder="เช่น WR-1234 (ไม่บังคับ)"
          placeholderTextColor={Colors.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>5. รายละเอียดเพิ่มเติม *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={f.desc}
          onChangeText={v => set('desc', v)}
          placeholder="อธิบายอาการ ลักษณะปัญหา ช่วงเวลาที่เกิด ผลกระทบต่อการผลิต..."
          placeholderTextColor={Colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttons}>
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.goBack()}>
            <Text style={styles.btnGhostText}>ยกเลิก</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnPrimary} onPress={submit} activeOpacity={0.85}>
          <Ionicons name="paper-plane-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>ส่งคำร้องแจ้งซ่อม</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  pageTitle:       { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  pageSub:         { fontSize: 12, color: Colors.muted, marginBottom: 20 },
  field:           { marginBottom: 16 },
  label:           { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:           { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  textarea:        { minHeight: 100 },
  select:          { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectDisabled:  { opacity: 0.5 },
  selectText:      { fontSize: 14, color: Colors.text, flex: 1, marginRight: 8 },
  placeholder:     { color: Colors.muted },
  hint:            { fontSize: 11, color: Colors.muted, marginTop: 5 },
  modalScrim:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalBox:        { backgroundColor: '#fff', borderRadius: 18, padding: 16, maxHeight: '70%' },
  modalTitle:      { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10, paddingHorizontal: 4 },
  dropItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.line },
  dropText:        { fontSize: 14, color: Colors.text, flex: 1 },
  dropActive:      { color: Colors.primary, fontWeight: '700' },
  dropEmpty:       { textAlign: 'center', color: Colors.muted, padding: 20 },
  modalClose:      { marginTop: 10, alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.bg, borderRadius: 10 },
  modalCloseText:  { fontSize: 14, fontWeight: '600', color: Colors.muted },
  buttons:         { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnGhost:        { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.line, alignItems: 'center' },
  btnGhostText:    { fontSize: 15, fontWeight: '600', color: Colors.muted },
  btnPrimary:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary },
  btnPrimaryText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});
