import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { avatarColor, initials } from '../utils/helpers';

const WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

export default function SideDrawer({ visible, onClose, navItems, activeKey, onSelect, user, onLogout }) {
  const translateX = useRef(new Animated.Value(-WIDTH)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(user.name) }]}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.role}>{user.role} · {user.dept || '—'}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          {navItems.map(item => {
            const active = item.key === activeKey;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => onSelect(item.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={20} color={active ? Colors.primary : Colors.muted} style={{ width: 26 }} />
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.label}</Text>
                {item.badge > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.logoutRow} onPress={onLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} style={{ width: 26 }} />
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 999 },
  scrim:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)' },
  panel:       { width: WIDTH, height: '100%', backgroundColor: '#fff', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 2, height: 0 } },
  header:      { backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  avatar:      { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 20 },
  name:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  role:        { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  item:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20 },
  itemActive:  { backgroundColor: Colors.primary + '12' },
  itemText:    { fontSize: 14, color: Colors.text, flex: 1 },
  itemTextActive: { color: Colors.primary, fontWeight: '700' },
  badge:       { backgroundColor: Colors.danger, borderRadius: 99, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  logoutRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: Colors.line },
  logoutText:  { fontSize: 14, fontWeight: '600', color: Colors.danger },
});
