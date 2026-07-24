import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';

export function LoadingScreen() {
  const { settings } = useLedger();
  const theme = getTheme(settings?.darkMode);
  return (
    <View style={[styles.wrap, { backgroundColor: theme?.paper || '#FAF8F3' }]}>
      <ActivityIndicator size="large" color={theme?.ink || '#0F3D3E'} />
      <Text style={[styles.text, { color: theme?.muted || '#6B7A76' }]}>Loading Ledger…</Text>
    </View>
  );
}

export function ToastOverlay() {
  const { toast, settings } = useLedger();
  if (!toast) return null;
  const theme = getTheme(settings.darkMode);
  return (
    <View style={styles.toastWrap} pointerEvents="none">
      <View style={[styles.toast, { backgroundColor: theme.ink }]}>
        <Text style={[styles.toastText, { color: theme.paper }]}>{toast}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 15 },
  toastWrap: { position: 'absolute', bottom: 90, left: 20, right: 20, zIndex: 999 },
  toast: { padding: 14, borderRadius: 12, elevation: 4 },
  toastText: { fontSize: 14, textAlign: 'center' },
});
