import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Colors } from '../theme/colors';

export default function LoadingOverlay({ visible, text = 'กำลังโหลด...' }) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={styles.scrim}>
        <View style={styles.box}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  box:   { backgroundColor: '#fff', borderRadius: 18, padding: 30, gap: 14, alignItems: 'center', minWidth: 160 },
  text:  { fontSize: 14, color: Colors.muted },
});
