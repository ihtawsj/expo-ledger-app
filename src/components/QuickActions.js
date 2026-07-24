import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export function QuickActions({ theme, onAdd, onScan, onVoice }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.primary, { backgroundColor: theme.ink }]} onPress={onAdd} activeOpacity={0.85}>
        <Text style={[styles.primaryText, { color: theme.paper }]}>+ Add expense</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.ghost, { borderColor: theme.line }]} onPress={onScan} activeOpacity={0.85}>
        <Text style={[styles.ghostText, { color: theme.text }]}>📸 Scan receipt</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.ghost, { borderColor: theme.line }]} onPress={onVoice} activeOpacity={0.85}>
        <Text style={[styles.ghostText, { color: theme.text }]}>🎙 Voice entry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  primary: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  primaryText: { fontWeight: '700', fontSize: 14 },
  ghost: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  ghostText: { fontWeight: '600', fontSize: 14 },
});
