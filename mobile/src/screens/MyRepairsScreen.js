import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Badge from '../components/Badge';
import CategoryChip from '../components/CategoryChip';
import { fmtDate } from '../utils/helpers';
import { api } from '../api/firebase';

export default function MyRepairsScreen({ navigation, user }) {
  const { data, updateRepair } = useAppData();

  const rows = useMemo(() => {
    if (user.role === 'Engineer') {
      const allowed = new Set(user.projects || []);
      return data.repairs.filter(r => !r.project || allowed.has(r.project));
    }
    return data.repairs.filter(r => r.reporterId === user.id);
  }, [data.repairs, user]);

  const cancel = (r) => {
    Alert.alert('ยกเลิกคำร้อง?', `ต้องการยกเลิกคำร้อง "${r.running}" ใช่หรือไม่?`, [
      { text: 'ไม่', style: 'cancel' },
      {
        text: 'ยกเลิกคำร้อง',
        style: 'destructive',
        onPress: async () => {
          try {
            await api('updateRepairStatus', { id: r.id, status: 'cancel', by: user.name, note: 'ผู้แจ้งยกเลิกคำร้อง' });
            updateRepair(r.id, prev => ({
              ...prev,
              status: 'cancel',
              timeline: [...(prev.timeline || []), { status: 'cancel', when: new Date().toISOString(), by: user.name, note: 'ผู้แจ้งยกเลิกคำร้อง' }],
            }));
          } catch (err) {
            Alert.alert('ไม่สำเร็จ', err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: r }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('RepairDetail', { repair: r, user })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.runId}>{r.running}</Text>
        <Badge status={r.status} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{r.title}</Text>
      <View style={styles.cardMid}>
        <CategoryChip categoryId={r.categoryId} categories={data.categories} />
        <Text style={styles.date}>{fmtDate(r.createdAt)}</Text>
      </View>
      {r.status === 'new' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(r)}>
          <Ionicons name="ban-outline" size={14} color={Colors.danger} />
          <Text style={styles.cancelText}>ยกเลิกคำร้อง</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>คำร้องแจ้งซ่อมของฉัน ({rows.length} รายการ)</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={r => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 30, gap: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>ยังไม่มีคำร้อง</Text>
            <Text style={styles.emptyHint}>แตะ "แจ้งซ่อมใหม่" เพื่อเริ่มต้น</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  topBar:      { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.line },
  topBarText:  { fontSize: 13, color: Colors.muted },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  runId:       { fontSize: 12, fontWeight: '700', color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  title:       { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  cardMid:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:        { fontSize: 11, color: Colors.muted },
  cancelBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.line },
  cancelText:  { fontSize: 12, fontWeight: '500', color: Colors.danger },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText:   { fontSize: 15, fontWeight: '600', color: Colors.muted },
  emptyHint:   { fontSize: 13, color: Colors.muted },
});
