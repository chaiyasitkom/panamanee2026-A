import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ScrollView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Badge from '../components/Badge';
import CategoryChip from '../components/CategoryChip';
import { fmtDate } from '../utils/helpers';
import { api } from '../api/firebase';

const STATUS_FILTERS = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'new',      label: 'รอดำเนินการ' },
  { key: 'assess',   label: 'ประเมินราคา' },
  { key: 'progress', label: 'กำลังซ่อม' },
  { key: 'parts',    label: 'รออะไหล่' },
  { key: 'done',     label: 'เสร็จสิ้น' },
  { key: 'cancel',   label: 'ยกเลิก' },
];

export default function RepairsScreen({ navigation, user }) {
  const { data, setData } = useAppData();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const del = (r) => {
    Alert.alert('ลบใบแจ้งซ่อมนี้?', `เลขที่ ${r.running}\nการลบไม่สามารถกู้คืนได้`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        try {
          await api('deleteRepair', { id: r.id, role: user.role });
          setData(prev => ({ ...prev, repairs: prev.repairs.filter(x => x.id !== r.id) }));
        } catch (e) { Alert.alert('ลบไม่สำเร็จ', e.message); }
      } },
    ]);
  };

  const rows = useMemo(() => {
    let base = data.repairs;
    if (user.role === 'Technician') {
      base = base.filter(r => r.assignedId === user.id || r.status === 'new' || r.status === 'assess');
    } else if (!['Admin', 'Officer', 'Director'].includes(user.role)) {
      const allowed = new Set(user.projects || []);
      base = base.filter(r => !r.project || allowed.has(r.project));
    }
    if (q) {
      const qq = q.toLowerCase();
      base = base.filter(r =>
        r.running.toLowerCase().includes(qq) ||
        r.title.toLowerCase().includes(qq) ||
        (r.siteId || '').toLowerCase().includes(qq)
      );
    }
    if (statusFilter !== 'all') base = base.filter(r => r.status === statusFilter);
    return base;
  }, [data.repairs, q, statusFilter, user]);

  const renderItem = ({ item: r }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('RepairDetail', { repair: r, user })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.runId}>{r.running}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Badge status={r.status} />
          {['Admin', 'Officer'].includes(user.role) && (
            <TouchableOpacity onPress={() => del(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={17} color={Colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{r.title}</Text>
      {r.siteId ? <Text style={styles.siteId}>ไซต์: {r.siteId}</Text> : null}
      <View style={styles.cardBottom}>
        <CategoryChip categoryId={r.categoryId} categories={data.categories} />
        <Text style={styles.date}>{fmtDate(r.createdAt)}</Text>
      </View>
      <Text style={styles.reporter}>
        <Ionicons name="person-outline" size={11} color={Colors.muted} /> {r.reporterName}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาเลขที่ / อาการ..."
          placeholderTextColor={Colors.muted}
          value={q}
          onChangeText={setQ}
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={16} color={Colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>{rows.length} / {data.repairs.length} รายการ</Text>

      <FlatList
        data={rows}
        keyExtractor={r => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 90, gap: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={50} color={Colors.muted} />
            <Text style={styles.emptyTxt}>ไม่พบข้อมูล</Text>
            <Text style={styles.emptyHint}>ลองเปลี่ยนเงื่อนไขการค้นหา</Text>
          </View>
        )}
      />

      {['Admin', 'Officer'].includes(user.role) && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateRepair', { user })}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.line },
  searchInput:     { flex: 1, fontSize: 14, color: Colors.text },
  filterBar:       { maxHeight: 44 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line },
  filterChipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:      { fontSize: 12, fontWeight: '500', color: Colors.muted },
  filterTextActive:{ color: '#fff' },
  count:           { fontSize: 12, color: Colors.muted, paddingHorizontal: 16, paddingTop: 8 },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  runId:           { fontSize: 12, fontWeight: '700', color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  title:           { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  siteId:          { fontSize: 12, color: Colors.muted, marginBottom: 4 },
  cardBottom:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  date:            { fontSize: 11, color: Colors.muted },
  reporter:        { fontSize: 11, color: Colors.muted, marginTop: 6 },
  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt:        { fontSize: 15, fontWeight: '600', color: Colors.muted },
  emptyHint:       { fontSize: 13, color: Colors.muted },
  fab:             { position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});
