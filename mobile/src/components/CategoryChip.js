import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CategoryChip({ categoryId, categories = [] }) {
  const cat = categories.find(c => c.id === categoryId) || { name: 'ไม่ระบุ', color: '#64748B' };
  return (
    <View style={[styles.wrap, { backgroundColor: cat.color + '22' }]}>
      <Text style={[styles.text, { color: cat.color }]}>{cat.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '600' },
});
