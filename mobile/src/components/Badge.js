import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusConfig } from '../theme/colors';

export default function Badge({ status }) {
  const cfg = StatusConfig[status] || StatusConfig.new;
  return (
    <View style={[styles.wrap, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, gap: 5 },
  dot:  { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});
