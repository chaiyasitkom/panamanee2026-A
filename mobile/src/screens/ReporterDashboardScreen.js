import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import Badge from '../components/Badge';
import CategoryChip from '../components/CategoryChip';
import { fmtDate } from '../utils/helpers';

export default function ReporterDashboardScreen({ navigation, user }) {
  const { data } = useAppData();

  const mine = useMemo(() => {
    if (user.role === 'Engineer') {
      const allowed = new Set(user.projects || []);
      return data.repairs.filter(r => !r.project || allowed.has(r.project));
    }
    return data.repairs.filter(r => r.reporterId === user.id);
  }, [data.repairs, user]);

  const counts = {
    all:      mine.length,
    progress: mine.filter(r => ['progress', 'assess', 'new'].includes(r.status)).length,
    parts:    mine.filter(r => r.status === 'parts').length,
    done:     mine.filter(r => r.status === 'done').length,
  };

  const stats = [
    { label: 'ทั้งหมด',     val: counts.all,      icon: 'clipboard-outline',        color: Colors.primaryLight },
    { label: 'ดำเนินการ',   val: counts.progress, icon: 'construct-outline',        color: Colors.warning },
    { label: 'รออะไหล่',    val: counts.parts,    icon: 'cube-outline',             color: Colors.danger },
    { label: 'เสร็จสิ้น',   val: counts.done,     icon: 'checkmark-circle-outline', color: Colors.success },
  ];

  const recent = mine.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={styles.greet}>
        <Text style={styles.hi}>สวัสดี, {user.name}!</Text>
        <Text style={styles.sub}>{user.role} · {user.dept}</Text>
      </View>

      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
              <Ionicons name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={styles.statVal}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} activeOpacity={0.8} onPress={() => navigation.navigate('NewRepair')}>
        <View style={styles.ctaIcon}>
          <Ionicons name="add-circle" size={32} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>พบปัญหาเครื่องจักร?</Text>
          <Text style={styles.ctaSub}>แจ้งซ่อมได้ทันที ระบบส่งต่อให้ช่างประเมิน</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHdr}>
          <Text style={styles.sectionTitle}>คำร้องล่าสุดของฉัน</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyRepairs')}>
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
            <Text style={styles.title} numberOfLines={1}>{r.title}</Text>
            <View style={styles.cardBottom}>
              <CategoryChip categoryId={r.categoryId} categories={data.categories} />
              <Text style={styles.date}>{fmtDate(r.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {recent.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={42} color={Colors.muted} />
            <Text style={styles.emptyTxt}>ยังไม่มีคำร้อง</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  greet:        { backgroundColor: Colors.primary, padding: 20 },
  hi:           { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub:          { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsRow:     { flexDirection: 'row', padding: 12, gap: 8 },
  statCard:     { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statIcon:     { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal:      { fontSize: 21, fontWeight: '800', color: Colors.text },
  statLabel:    { fontSize: 10, color: Colors.muted, textAlign: 'center' },
  cta:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 14, padding: 16, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, borderWidth: 1.5, borderColor: Colors.primary + '40' },
  ctaIcon:      { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  ctaTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  ctaSub:       { fontSize: 12, color: Colors.muted, marginTop: 2 },
  section:      { margin: 12 },
  sectionHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  seeAll:       { fontSize: 13, color: Colors.primary },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  runId:        { fontSize: 12, fontWeight: '700', color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  title:        { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:         { fontSize: 11, color: Colors.muted },
  empty:        { alignItems: 'center', paddingTop: 36, gap: 8 },
  emptyTxt:     { fontSize: 14, color: Colors.muted },
});
