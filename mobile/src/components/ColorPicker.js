import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PALETTE = ['#3B82F6','#8B5CF6','#EF4444','#10B981','#F59E0B','#06B6D4','#EC4899','#6366F1','#F97316','#14B8A6','#A855F7','#0EA5E9','#DC2626','#16A34A','#D97706','#64748B'];

export default function ColorPicker({ value, onSelect }) {
  return (
    <View style={styles.grid}>
      {PALETTE.map(c => (
        <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }]} onPress={() => onSelect(c)}>
          {value === c && <Ionicons name="checkmark" size={18} color="#fff" />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
