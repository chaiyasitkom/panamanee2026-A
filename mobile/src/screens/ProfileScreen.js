import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { avatarColor, initials } from '../utils/helpers';

const ROLE_LABEL = {
  Admin: 'ผู้ดูแลระบบ',
  Officer: 'เจ้าหน้าที่',
  Technician: 'ช่างซ่อม',
  Reporter: 'ผู้แจ้งซ่อม',
  Engineer: 'วิศวกร',
  Director: 'ผู้บริหาร',
};

const APP_VERSION = '1.1.0';

export default function ProfileScreen({ user, onLogout, navigation }) {
  const handleLogout = () => {
    Alert.alert('ออกจากระบบ?', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: onLogout },
    ]);
  };

  const roleLabel = ROLE_LABEL[user.role] || user.role;

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.muted} style={{ width: 24 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(user.name) }]}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ข้อมูลบัญชี</Text>
        <InfoRow icon="person-outline" label="ชื่อ-นามสกุล" value={user.name} />
        <InfoRow icon="at-outline" label="Username" value={user.username} />
        <InfoRow icon="mail-outline" label="อีเมล" value={user.email} />
        <InfoRow icon="business-outline" label="แผนก/ฝ่าย" value={user.dept} />
        <InfoRow icon="shield-outline" label="บทบาท" value={roleLabel} />
      </View>

      {user.role === 'Admin' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เครื่องมือผู้ดูแลระบบ</Text>
          <TouchableOpacity style={styles.toolRow} onPress={() => navigation.navigate('Users')}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} style={{ width: 24 }} />
            <Text style={styles.toolText}>จัดการผู้ใช้งาน</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolRow, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('Categories')}>
            <Ionicons name="pricetags-outline" size={18} color={Colors.primary} style={{ width: 24 }} />
            <Text style={styles.toolText}>จัดการหมวดหมู่</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ระบบแจ้งซ่อมเครื่องจักร · v{APP_VERSION}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  hero:        { backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: 36, paddingBottom: 28 },
  avatar:      { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:  { fontSize: 30, fontWeight: '700', color: '#fff' },
  name:        { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  roleBadge:   { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 99 },
  roleText:    { fontSize: 13, color: '#fff', fontWeight: '500' },
  card:        { backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.line },
  infoRow:     { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.line + '80' },
  infoLabel:   { fontSize: 11, color: Colors.muted },
  infoValue:   { fontSize: 14, fontWeight: '500', color: Colors.text, marginTop: 2 },
  toolRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.line + '80' },
  toolText:    { fontSize: 14, fontWeight: '500', color: Colors.text, flex: 1 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: Colors.danger + '40' },
  logoutText:  { fontSize: 15, fontWeight: '700', color: Colors.danger },
  version:     { textAlign: 'center', fontSize: 11, color: Colors.muted, marginTop: 8 },
});
