import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function SelectField({ label, value, options, onSelect, disabled, placeholder, hint }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.select, disabled && styles.selectDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectText, !current && styles.placeholder]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.muted} />
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalScrim} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{label || placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(o, i) => o.value + i}
              style={{ maxHeight: 360 }}
              renderItem={({ item: o }) => (
                <TouchableOpacity
                  style={styles.dropItem}
                  onPress={() => { onSelect(o.value); setOpen(false); }}
                >
                  <Text style={[styles.dropText, value === o.value && styles.dropActive]}>{o.label}</Text>
                  {value === o.value && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => <Text style={styles.dropEmpty}>ไม่มีตัวเลือก</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field:          { marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  select:         { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectDisabled: { opacity: 0.5 },
  selectText:     { fontSize: 14, color: Colors.text, flex: 1, marginRight: 8 },
  placeholder:    { color: Colors.muted },
  hint:           { fontSize: 11, color: Colors.muted, marginTop: 5 },
  modalScrim:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalBox:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, maxHeight: '70%' },
  modalTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10, paddingHorizontal: 4 },
  dropItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.line },
  dropText:       { fontSize: 14, color: Colors.text, flex: 1 },
  dropActive:     { color: Colors.primary, fontWeight: '700' },
  dropEmpty:      { textAlign: 'center', color: Colors.muted, padding: 20 },
  modalClose:     { marginTop: 10, alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.bg, borderRadius: 10 },
  modalCloseText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
});
