import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ScrollView, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import LoadingOverlay from '../components/LoadingOverlay';
import { fmtDate } from '../utils/helpers';
import { api } from '../api/firebase';

export default function DocPJ2Screen({ user }) {
  const { data, setData } = useAppData();
  const [q, setQ] = useState('');
  const [filterProj, setFilterProj] = useState('all');
  const [editCell, setEditCell] = useState(null); // { id, field, value }
  const [loading, setLoading] = useState(false);

  const canEdit = ['Admin', 'Officer', 'Engineer'].includes(user.role);

  const rows = useMemo(() => {
    if (['Admin', 'Officer', 'Director'].includes(user.role)) return data.machines;
    const allowed = new Set(user.projects || []);
    return data.machines.filter(m => !m.project || allowed.has(m.project));
  }, [data.machines, user]);

  const projects = useMemo(() => [...new Set(rows.map(m => m.project).filter(Boolean))].sort(), [rows]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const filtered = useMemo(() => {
    let base = rows;
    if (filterProj !== 'all') base = base.filter(m => m.project === filterProj);
    if (q) {
      const qq = q.toLowerCase();
      base = base.filter(m => [m.code, m.name, m.project, m.serial].map(x => (x || '').toLowerCase()).join(' ').includes(qq));
    }
    return [...base].sort((a, b) => {
      const da = a.nextInspectionDate ? new Date(a.nextInspectionDate) : null;
      const db = b.nextInspectionDate ? new Date(b.nextInspectionDate) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
  }, [rows, q, filterProj]);

  const nextDateColor = (val) => {
    if (!val) return null;
    const d = new Date(val); d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return Colors.danger;
    if (diff <= 30) return Colors.warning;
    return Colors.success;
  };

  const saveDate = async () => {
    if (!editCell) return;
    const { id, field, value } = editCell;
    setLoading(true);
    try {
      await api('updateMachine', { id, patch: { [field]: value } });
      setData(prev => ({ ...prev, machines: prev.machines.map(m => m.id === id ? { ...m, [field]: value } : m) }));
      setEditCell(null);
    } catch (err) {
      Alert.alert('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('เปิดลิงก์ไม่สำเร็จ', url));
  };

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} text="กำลังบันทึก..." />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหา รหัส / ชื่อ / ซีเรียล..."
          placeholderTextColor={Colors.muted}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {[{ value: 'all', label: 'ทุกโครงการ' }, ...projects.map(p => ({ value: p, label: p }))].map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filterProj === f.value && styles.filterChipActive]}
            onPress={() => setFilterProj(f.value)}
          >
            <Text style={[styles.filterText, filterProj === f.value && styles.filterTextActive]} numberOfLines={1}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.legend}>
        <LegendDot color={Colors.success} label="ยังไม่ถึงกำหนด" />
        <LegendDot color={Colors.warning} label="ใกล้ถึงกำหนด (≤30 วัน)" />
        <LegendDot color={Colors.danger} label="เกินกำหนด" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 30, gap: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyTxt}>ไม่พบข้อมูล</Text>
          </View>
        )}
        renderItem={({ item: m }) => {
          const nextColor = nextDateColor(m.nextInspectionDate);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.code}>{m.code || '—'}</Text>
                <Text style={styles.project} numberOfLines={1}>{m.project || '—'}</Text>
              </View>
              <Text style={styles.name}>{m.name}</Text>
              {m.brand ? <Text style={styles.brand}>{m.brand}{m.model ? ` ${m.model}` : ''}</Text> : null}

              <View style={styles.linksRow}>
                <DocLink label="เอกสาร (1)" url={m.driveLink1} onPress={openLink} />
                <DocLink label="เอกสาร (2)" url={m.driveLink2} onPress={openLink} />
              </View>

              <DateRow
                label="วันที่ตรวจสอบ"
                value={m.inspectionDate}
                color={null}
                canEdit={canEdit}
                editing={editCell?.id === m.id && editCell?.field === 'inspectionDate'}
                editValue={editCell?.value}
                onChangeEditValue={v => setEditCell(ec => ({ ...ec, value: v }))}
                onStartEdit={() => setEditCell({ id: m.id, field: 'inspectionDate', value: m.inspectionDate || '' })}
                onSave={saveDate}
                onCancel={() => setEditCell(null)}
              />
              <DateRow
                label="ตรวจสอบครั้งถัดไป"
                value={m.nextInspectionDate}
                color={nextColor}
                canEdit={canEdit}
                editing={editCell?.id === m.id && editCell?.field === 'nextInspectionDate'}
                editValue={editCell?.value}
                onChangeEditValue={v => setEditCell(ec => ({ ...ec, value: v }))}
                onStartEdit={() => setEditCell({ id: m.id, field: 'nextInspectionDate', value: m.nextInspectionDate || '' })}
                onSave={saveDate}
                onCancel={() => setEditCell(null)}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function DocLink({ label, url, onPress }) {
  if (!url) return <Text style={styles.noLink}>{label}: —</Text>;
  return (
    <TouchableOpacity style={styles.docLink} onPress={() => onPress(url)}>
      <Ionicons name="logo-google" size={13} color="#4285F4" />
      <Text style={styles.docLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

function DateRow({ label, value, color, canEdit, editing, editValue, onChangeEditValue, onStartEdit, onSave, onCancel }) {
  if (editing) {
    return (
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1.4 }}>
          <TextInput
            style={styles.dateInput}
            value={editValue}
            onChangeText={onChangeEditValue}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.muted}
            autoFocus
          />
          <TouchableOpacity onPress={onSave}><Ionicons name="checkmark-circle" size={22} color={Colors.success} /></TouchableOpacity>
          <TouchableOpacity onPress={onCancel}><Ionicons name="close-circle" size={22} color={Colors.muted} /></TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1.4, justifyContent: 'flex-end' }}>
        {value ? (
          <View style={[styles.dateBadge, color && { backgroundColor: color + '18' }]}>
            <Text style={[styles.dateBadgeText, color && { color }]}>{fmtDate(value)}</Text>
          </View>
        ) : <Text style={styles.dateEmpty}>—</Text>}
        {canEdit && (
          <TouchableOpacity onPress={onStartEdit}>
            <Ionicons name={value ? 'pencil' : 'add-circle-outline'} size={16} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.line },
  searchInput:      { flex: 1, fontSize: 14, color: Colors.text },
  filterBar:        { maxHeight: 44, marginBottom: 8 },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, maxWidth: 160 },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:       { fontSize: 12, fontWeight: '500', color: Colors.muted },
  filterTextActive: { color: '#fff' },
  legend:           { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16, paddingBottom: 8 },
  legendText:       { fontSize: 11, color: Colors.muted },
  empty:            { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt:         { fontSize: 14, color: Colors.muted },
  card:             { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  code:             { fontSize: 12, fontWeight: '700', color: Colors.primary },
  project:          { fontSize: 11, color: Colors.muted, flex: 1, textAlign: 'right' },
  name:             { fontSize: 14, fontWeight: '600', color: Colors.text },
  brand:            { fontSize: 12, color: Colors.muted, marginTop: 2 },
  linksRow:         { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 10, flexWrap: 'wrap' },
  docLink:          { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  docLinkText:      { fontSize: 11.5, color: Colors.primary, fontWeight: '500' },
  noLink:           { fontSize: 11.5, color: Colors.muted },
  dateRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.line + '80' },
  dateLabel:        { fontSize: 12.5, color: Colors.muted, flex: 1 },
  dateBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dateBadgeText:    { fontSize: 12, fontWeight: '600', color: Colors.text },
  dateEmpty:        { fontSize: 12, color: Colors.muted },
  dateInput:        { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: Colors.text },
});
