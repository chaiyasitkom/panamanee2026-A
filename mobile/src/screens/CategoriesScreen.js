import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import ColorPicker from '../components/ColorPicker';
import LoadingOverlay from '../components/LoadingOverlay';
import { api } from '../api/firebase';

const emptyCategory = () => ({ name: '', color: '#3B82F6', icon: 'fa-tags' });

export default function CategoriesScreen() {
  const { data, setData } = useAppData();
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  const save = async (form) => {
    setLoading(true);
    try {
      if (form.id) {
        await api('updateCategory', { id: form.id, patch: form });
        setData(prev => ({ ...prev, categories: prev.categories.map(x => x.id === form.id ? form : x) }));
      } else {
        const created = await api('createCategory', { cat: form });
        setData(prev => ({ ...prev, categories: [...prev.categories, created] }));
      }
      setEdit(null);
    } catch (err) {
      Alert.alert('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = (c) => {
    Alert.alert('ลบหมวดหมู่?', `ต้องการลบ "${c.name}" ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await api('deleteCategory', { id: c.id });
            setData(prev => ({ ...prev, categories: prev.categories.filter(x => x.id !== c.id) }));
          } catch (err) {
            Alert.alert('ลบไม่สำเร็จ', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: c }) => {
    const count = data.repairs.filter(r => r.categoryId === c.id).length;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => setEdit(c)}>
        <View style={[styles.swatch, { backgroundColor: c.color }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.count}>{count} งาน</Text>
        </View>
        <TouchableOpacity style={styles.delBtn} onPress={() => remove(c)}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} text="กำลังบันทึก..." />

      <View style={styles.topBar}>
        <Text style={styles.topBarText}>ทั้งหมด {data.categories.length} หมวดหมู่</Text>
      </View>

      <FlatList
        data={data.categories}
        keyExtractor={c => c.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 90, gap: 8 }}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setEdit(emptyCategory())}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {edit && <CategoryFormModal initial={edit} onClose={() => setEdit(null)} onSave={save} />}
    </View>
  );
}

function CategoryFormModal({ initial, onClose, onSave }) {
  const [f, setF] = useState(initial);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>{initial.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>ชื่อหมวดหมู่</Text>
          <TextInput
            style={styles.input}
            value={f.name}
            onChangeText={v => setF({ ...f, name: v })}
            placeholder="เช่น ไฟฟ้า, เครื่องจักรกล"
            placeholderTextColor={Colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>สี</Text>
          <ColorPicker value={f.color} onSelect={c => setF({ ...f, color: c })} />
        </View>

        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>ตัวอย่าง</Text>
          <View style={[styles.previewChip, { backgroundColor: f.color + '22' }]}>
            <Text style={[styles.previewChipText, { color: f.color }]}>{f.name || 'ชื่อหมวดหมู่'}</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btnGhostFull} onPress={onClose}>
            <Text style={styles.btnGhostText}>ยกเลิก</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimaryFull} onPress={() => onSave(f)}>
            <Ionicons name="save-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>บันทึก</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  topBar:            { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.line },
  topBarText:        { fontSize: 13, color: Colors.muted },
  card:              { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  swatch:            { width: 36, height: 36, borderRadius: 10 },
  name:              { fontSize: 14, fontWeight: '600', color: Colors.text },
  count:             { fontSize: 12, color: Colors.muted, marginTop: 2 },
  delBtn:            { padding: 8 },
  fab:               { position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  detailHeader:      { backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  field:             { marginBottom: 18 },
  label:             { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input:             { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  previewBox:        { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Colors.line, borderStyle: 'dashed', padding: 16, marginBottom: 16 },
  previewLabel:      { fontSize: 11, color: Colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewChip:       { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  previewChipText:   { fontSize: 13, fontWeight: '600' },
  buttons:           { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnGhostFull:      { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.line, alignItems: 'center' },
  btnGhostText:      { fontSize: 14, fontWeight: '600', color: Colors.muted },
  btnPrimaryFull:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary },
  btnPrimaryText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
});
