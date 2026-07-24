import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';

export default function LockScreen() {
  const { settings, unlock } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const tryUnlock = () => {
    if (unlock(pin)) {
      setError('');
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.paper }]}>
      <View style={[styles.card, { backgroundColor: theme.paper2, borderColor: theme.line }]}>
        <Text style={styles.coin}>📒</Text>
        <Text style={[styles.title, { color: theme.text }]}>Ledger is locked</Text>
        <Text style={{ color: theme.muted, marginBottom: 16 }}>Enter your PIN to continue</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.line, color: theme.text, backgroundColor: theme.paper }]}
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder="••••"
          placeholderTextColor={theme.muted}
          onSubmitEditing={tryUnlock}
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.ink }]} onPress={tryUnlock}>
          <Text style={{ color: theme.paper, fontWeight: '700', fontSize: 16 }}>Unlock</Text>
        </TouchableOpacity>
        {error ? <Text style={{ color: theme.red, marginTop: 10 }}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center' },
  coin: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  input: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 20, textAlign: 'center', marginBottom: 14 },
  btn: { width: '100%', padding: 14, borderRadius: 10, alignItems: 'center' },
});
