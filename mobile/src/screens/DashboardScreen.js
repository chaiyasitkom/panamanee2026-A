import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Badge from '../components/Badge';
import CategoryChip from '../components/CategoryChip';
import { fmtDate, avatarColor, initials } from '../utils/helpers';

export default function DashboardScreen({ navigation, user }) {
  const { data } = useAppData();

  const repairs = useMemo(() => {
    if (['Admin', 'Officer', 'Director', 'Technician'].includes(user.role)) return data.repairs;
    const allowed = new Set(user.projects || []);
    return data.repairs.filter(r => !r.project || allowed.has(r.project));
  }, [data.repairs, user]);

  const counts = {
    all:      repairs.length,
    assess:   repairs.filter(r => r.status === 'assess').length,
    new:      repairs.filter(r => r.status === 'new').length,
    progress: repairs.filter(r => ['progress', 'parts'].includes(r.status)).length,
    done:     repairs.filter(r => r.status === 'done').length,
  };

  const stats = [
    { label: 'ทั้งหมด',    val: counts.all,      icon: 'clipboard-outline',       color: Colors.primaryLight },
    { label: 'รอประเมิน',  val: counts.assess,   icon: 'search-outline',          color: Colors.purple },
    { label: 'รออนุมัติ',  val: counts.new,      icon: 'time-outline',            color: Colors.warning },
    { label: 'กำลังซ่อม', val: counts.progress,  icon: 'construct-outline',       color: Colors.danger },
    { label: 'เสร็จสิ้น', val: counts.done,      icon: 'checkmark-circle-outline', color: Colors.success },
  ];

  const recent = repairs.slice(0, 8);
  const avColor = avatarColor(user.name);
  const avInit  = initials(user.name);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* Greeting bar */}
      <View style={styles.greet}>
        <View style={[styles.avatar, { backgroundColor: avColor }]}>
          <Text style={styles.avatarTxt}>{avInit}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetName}>{user.name}</Text>
          <Text style={styles.greetRole}>{user.role} · {user.dept}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
              <Ionicons name={s.icon} size={22} color={s.color} />
            </View>
            <Text style={styles.statVal}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent */}
      <View style={styles.section}>
        <View style={styles.sectionHdr}>
          <Text style={styles.sectionTitle}>รายการแจ้งซ่อมล่าสุด</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Repairs')}>
            <Text style={styles.seeAll}>ดูทั้งหมด →</Text>
          </TouchableOpacity>
        </View>

        {recent.map(r => (
          <TouchableOpacity
            key={r.id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('RepairDetail', { repair: r, user })}
          >
            <View style={styles.cardTop}>
              <Text style={styles.runId}>{r.running}</Text>
              <Badge status={r.status} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{r.title}</Text>
            <View style={styles.cardBottom}>
              <CategoryChip categoryId={r.categoryId} categories={data.categories} />
              <Text style={styles.cardDate}>{fmtDate(r.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {recent.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={44} color={Colors.muted} />
            <Text style={styles.emptyTxt}>ยังไม่มีรายการแจ้งซ่อม</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  greet:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.line },
  avatar:       { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
  greetName:    { fontSize: 16, fontWeight: '600', color: Colors.text },
  greetRole:    { fontSize: 12, color: Colors.muted, marginTop: 1 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  statCard:     { flex: 1, minWidth: '28%', backgroundColor: '#fff', borderRadius: 14, padding: 13, alignItems: 'center', gap: 5, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statIcon:     { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal:      { fontSize: 24, fontWeight: '800', color: Colors.text },
  statLabel:    { fontSize: 10, color: Colors.muted, textAlign: 'center' },
  section:      { margin: 12 },
  sectionHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  seeAll:       { fontSize: 13, color: Colors.primary },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  runId:        { fontSize: 12, fontWeight: '700', color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardTitle:    { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate:     { fontSize: 11, color: Colors.muted },
  empty:        { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTxt:     { fontSize: 14, color: Colors.muted },
});
