import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Avatar from '../components/Avatar';
import SelectField from '../components/SelectField';
import LoadingOverlay from '../components/LoadingOverlay';
import { api } from '../api/firebase';

const ROLES = ['Admin', 'Officer', 'Engineer', 'Technician', 'Reporter', 'Director'];
const ROLE_COLORS = { Admin: '#1E40AF', Officer: '#8B5CF6', Technician: '#F59E0B', Engineer: '#06B6D4', Reporter: '#10B981', Director: '#EF4444' };

const emptyUser = () => ({ username: '', password: '', name: '', role: 'Reporter', dept: '', email: '', projects: [] });

export default function UsersScreen() {
  const { data, setData } = useAppData();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return data.users;
    const qq = q.toLowerCase();
    return data.users.filter(u => (u.name + u.username).toLowerCase().includes(qq));
  }, [data.users, q]);

  const save = async (form) => {
    setLoading(true);
    try {
      if (form.id) {
        await api('updateUser', { id: form.id, patch: form });
        setData(prev => ({ ...prev, users: prev.users.map(x => x.id === form.id ? form : x) }));
      } else {
        const created = await api('createUser', { user: form });
        setData(prev => ({ ...prev, users: [...prev.users, created] }));
      }
      setEdit(null);
    } catch (err) {
      Alert.alert('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = (u) => {
    Alert.alert('ลบผู้ใช้งาน?', `ต้องการลบ "${u.name}" ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await api('deleteUser', { id: u.id });
            setData(prev => ({ ...prev, users: prev.users.filter(x => x.id !== u.id) }));
          } catch (err) {
            Alert.alert('ลบไม่สำเร็จ', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const projectAccessLabel = (u) => {
    const hasAll = ['Admin', 'Director'].includes(u.role) || !Array.isArray(u.projects) || u.projects.length === 0;
    if (hasAll) return 'ทุกโครงการ';
    return `${u.projects.length} โครงการ`;
  };

  const renderItem = ({ item: u }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => setEdit({ ...u, password: '', projects: Array.isArray(u.projects) ? u.projects : [] })}
    >
      <Avatar name={u.name} size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name}>{u.name}</Text>
        <Text style={styles.username}>@{u.username} · {u.dept || '—'}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[u.role] || Colors.muted) + '22' }]}>
            <Text style={[styles.roleText, { color: ROLE_COLORS[u.role] || Colors.muted }]}>{u.role}</Text>
          </View>
          <Text style={styles.accessText}>{projectAccessLabel(u)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.delBtn} onPress={() => remove(u)}>
        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} text="กำลังบันทึก..." />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาชื่อ หรือ username..."
          placeholderTextColor={Colors.muted}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 90, gap: 8 }}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setEdit(emptyUser())}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {edit && (
        <UserFormModal
          initial={edit}
          machines={data.machines}
          onClose={() => setEdit(null)}
          onSave={save}
        />
      )}
    </View>
  );
}

function UserFormModal({ initial, machines, onClose, onSave }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isSuperRole = ['Admin', 'Director'].includes(f.role);

  const allProjects = useMemo(() => {
    return [...new Set((machines || []).map(m => m.project).filter(Boolean))].sort();
  }, [machines]);

  const toggleProject = (p) => {
    setF(prev => {
      const cur = prev.projects || [];
      return { ...prev, projects: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] };
    });
  };

  const submit = () => {
    if (!f.username || !f.name) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณาใส่ Username และชื่อ-นามสกุล');
      return;
    }
    onSave(f);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>{initial.id ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Field label="Username *" value={f.username} onChangeText={v => set('username', v)} autoCapitalize="none" />
        <Field
          label={`Password ${initial.id ? '(เว้นว่างหากไม่เปลี่ยน)' : ''}`}
          value={f.password} onChangeText={v => set('password', v)} secureTextEntry
        />
        <Field label="ชื่อ-นามสกุล *" value={f.name} onChangeText={v => set('name', v)} />
        <SelectField
          label="ตำแหน่ง/บทบาท"
          value={f.role}
          options={ROLES.map(r => ({ value: r, label: r }))}
          onSelect={v => set('role', v)}
          placeholder="เลือกบทบาท"
        />
        <Field label="หน่วยงาน" value={f.dept} onChangeText={v => set('dept', v)} />
        <Field label="อีเมล" value={f.email} onChangeText={v => set('email', v)} autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>สิทธิ์เข้าถึงโครงการ</Text>
        {isSuperRole ? (
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>บทบาท {f.role} เห็นข้อมูลได้ทุกโครงการโดยอัตโนมัติ</Text>
          </View>
        ) : allProjects.length === 0 ? (
          <View style={styles.infoBoxMuted}>
            <Text style={styles.infoTextMuted}>ยังไม่มีโครงการในระบบ</Text>
          </View>
        ) : (
          <View style={styles.projectGrid}>
            {allProjects.map(p => {
              const on = (f.projects || []).includes(p);
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.projectChip, on && styles.projectChipActive]}
                  onPress={() => toggleProject(p)}
                >
                  {on && <Ionicons name="checkmark" size={13} color={Colors.primary} style={{ marginRight: 4 }} />}
                  <Text style={[styles.projectChipText, on && { color: Colors.primary, fontWeight: '600' }]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {!isSuperRole && <Text style={styles.hint}>ไม่เลือกเลย = เห็นทุกโครงการ</Text>}

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
      <TextInput style={styles.input} placeholderTextColor={Colors.muted} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  searchWrap:        { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.line },
  searchInput:       { flex: 1, fontSize: 14, color: Colors.text },
  card:              { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  name:              { fontSize: 14, fontWeight: '600', color: Colors.text },
  username:          { fontSize: 12, color: Colors.muted, marginTop: 2 },
  metaRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  roleBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  roleText:          { fontSize: 11, fontWeight: '700' },
  accessText:        { fontSize: 11, color: Colors.muted },
  delBtn:            { padding: 8 },
  fab:               { position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  detailHeader:      { backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  field:             { marginBottom: 16 },
  label:             { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:             { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  infoBox:           { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary + '10', borderWidth: 1, borderColor: Colors.primary + '30', borderRadius: 12, padding: 14, marginBottom: 8 },
  infoText:          { fontSize: 13, color: Colors.primary, flex: 1 },
  infoBoxMuted:      { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center' },
  infoTextMuted:     { fontSize: 13, color: Colors.muted },
  projectGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  projectChip:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.line, backgroundColor: '#fff' },
  projectChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  projectChipText:   { fontSize: 12.5, color: Colors.text },
  hint:              { fontSize: 11, color: Colors.muted, marginTop: 8, marginBottom: 8 },
  buttons:           { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnGhostFull:      { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.line, alignItems: 'center' },
  btnGhostText:      { fontSize: 14, fontWeight: '600', color: Colors.muted },
  btnPrimaryFull:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary },
  btnPrimaryText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
});
