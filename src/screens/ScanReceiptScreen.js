import React, { useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, GhostButton } from '../components/ui';
import { todayISO, uid } from '../logic/utils';

export default function ScanReceiptScreen({ navigation }) {
  const { categories, settings, addExpense, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);

  const [photo, setPhoto] = useState(null);
  const [shop, setShop] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(categories[0]?.name || 'Others');
  const [status, setStatus] = useState('');

  const pickImage = async (useCamera) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      showToast(useCamera ? 'Camera permission required' : 'Gallery permission required');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setPhoto(result.assets[0].uri);
    setStatus('Photo saved — enter shop name and amount from your receipt below.');
  };

  const save = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      showToast('Enter a valid amount');
      return;
    }
    await addExpense({
      id: uid(),
      amount: num,
      category,
      description: shop,
      date,
      payment: 'Cash',
      location: '',
      notes: 'Added via receipt scan',
      photo,
    });
    showToast('Expense added from receipt');
    navigation.goBack();
  };

  return (
    <ThemedScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Scan receipt" subtitle="Photo + amount from your bill" />

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.ink }]} onPress={() => pickImage(true)}>
            <Text style={{ color: theme.paper, fontWeight: '600' }}>📸 Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { borderColor: theme.line, borderWidth: 1 }]} onPress={() => pickImage(false)}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>🖼 Gallery</Text>
          </TouchableOpacity>
        </View>

        {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}

        {status ? <Text style={[styles.status, { color: theme.muted }]}>{status}</Text> : null}

        <Field label="Shop / merchant" theme={theme}>
          <TextInput style={inputStyle(theme)} value={shop} onChangeText={setShop} placeholder="Shop name" placeholderTextColor={theme.muted} />
        </Field>
        <Field label="Amount" theme={theme}>
          <TextInput style={inputStyle(theme)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.muted} />
        </Field>
        <Field label="Date (YYYY-MM-DD)" theme={theme}>
          <TextInput style={inputStyle(theme)} value={date} onChangeText={setDate} placeholderTextColor={theme.muted} />
        </Field>
        <Field label="Category" theme={theme}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, { borderColor: theme.line, backgroundColor: category === c.name ? theme.gold : theme.paper2 }]}
                onPress={() => setCategory(c.name)}
              >
                <Text style={{ color: category === c.name ? theme.inkDeep : theme.text }}>{c.icon} {c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <View style={styles.footer}>
          <GhostButton title="Cancel" theme={theme} onPress={() => navigation.goBack()} />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.ink }]} onPress={save}>
            <Text style={{ color: theme.paper, fontWeight: '700' }}>Save expense</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedScreen>
  );
}

function Field({ label, theme, children }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(theme) {
  return {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.paper,
    color: theme.text,
    borderColor: theme.line,
  };
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  preview: { marginHorizontal: 20, height: 180, borderRadius: 10, marginBottom: 12 },
  status: { paddingHorizontal: 20, marginBottom: 12, fontSize: 13, lineHeight: 18 },
  field: { paddingHorizontal: 20, marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 8, alignItems: 'center' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
});
