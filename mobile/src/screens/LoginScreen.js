import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../api/firebase';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณากรอก Username และ Password');
      return;
    }
    setLoading(true);
    try {
      const user = await api('login', { username: username.trim(), password });
      onLogin(user);
    } catch (err) {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', err.message || 'กรุณาตรวจสอบ Username และ Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="construct" size={34} color="#fff" />
            </View>
            <Text style={styles.brandTitle}>ระบบแจ้งซ่อมเครื่องจักร</Text>
            <Text style={styles.brandSub}>Machine Repair Management</Text>
            <View style={styles.chips}>
              <View style={styles.chip}><Text style={styles.chipText}>⚡ Real-time</Text></View>
              <View style={styles.chip}><Text style={styles.chipText}>☁ Cloud Sync</Text></View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>
            <Text style={styles.cardSub}>กรุณาใส่ข้อมูลบัญชีผู้ใช้งานของคุณ</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={Colors.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="ชื่อผู้ใช้"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={Colors.muted}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="รหัสผ่าน"
                  secureTextEntry={!showPw}
                  placeholderTextColor={Colors.muted}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                />
                <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="log-in-outline" size={18} color="#fff" /><Text style={styles.btnText}> เข้าสู่ระบบ</Text></>
              }
            </TouchableOpacity>

            <Text style={styles.hint}>บัญชีทดสอบ: admin / komdevil99</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.primary },
  scroll:     { flexGrow: 1 },
  brand:      { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  logo:       { width: 76, height: 76, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  brandTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  brandSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  chips:      { flexDirection: 'row', gap: 8, marginTop: 14 },
  chip:       { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 },
  chipText:   { color: '#fff', fontSize: 12 },
  card:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, flex: 1, minHeight: 380 },
  cardTitle:  { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardSub:    { fontSize: 13, color: Colors.muted, marginBottom: 24 },
  field:      { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FAFBFC' },
  input:      { flex: 1, fontSize: 15, color: Colors.text },
  btn:        { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint:       { textAlign: 'center', color: Colors.muted, fontSize: 12, marginTop: 18 },
});
