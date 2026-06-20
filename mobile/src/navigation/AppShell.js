import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import SideDrawer from '../components/SideDrawer';

export default function AppShell({ navItems, pages, page, onSelectPage, user, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeItem = navItems.find(n => n.key === page) || navItems[0];
  const ActiveScreen = pages[page];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{activeItem?.label}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>{ActiveScreen}</View>

      <SideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        activeKey={page}
        onSelect={(key) => { onSelectPage(key); setDrawerOpen(false); }}
        user={user}
        onLogout={onLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.bg },
  header:      { backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn:     { padding: 4 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
});
