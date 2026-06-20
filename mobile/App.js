import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider, useAppData } from './src/context/AppContext';
import { api } from './src/api/firebase';
import { Colors } from './src/theme/colors';

function AppInner() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [bootErr, setBootErr] = useState(null);
  const { setData } = useAppData();

  const boot = async () => {
    setBootErr(null);
    setBooting(true);
    try {
      const raw = await AsyncStorage.getItem('rms_user');
      const bootstrapData = await api('bootstrap');
      setData(bootstrapData);
      if (raw) {
        const saved = JSON.parse(raw);
        const fresh = bootstrapData.users.find(u => u.id === saved.id);
        if (fresh) setUser(fresh);
      }
    } catch (err) {
      setBootErr(err.message || String(err));
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => { boot(); }, []);

  const handleLogin = async (u) => {
    setUser(u);
    await AsyncStorage.setItem('rms_user', JSON.stringify(u));
  };

  const handleLogout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('rms_user');
  };

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.bootText}>กำลังเชื่อมต่อ Firebase...</Text>
      </View>
    );
  }

  if (bootErr) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>เชื่อมต่อ Backend ไม่สำเร็จ</Text>
        <Text style={styles.errText}>{bootErr}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={boot}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator user={user} onLogin={handleLogin} onLogout={handleLogout} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppInner />
        <StatusBar style="auto" />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: Colors.bg, padding: 24 },
  bootText:  { color: Colors.muted, fontSize: 15 },
  errTitle:  { fontSize: 17, fontWeight: '700', color: Colors.danger, textAlign: 'center' },
  errText:   { color: Colors.muted, fontSize: 13, textAlign: 'center' },
  retryBtn:  { marginTop: 10, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
