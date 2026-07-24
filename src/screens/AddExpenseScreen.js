import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, GhostButton } from '../components/ui';
import { PAYMENT_METHODS } from '../logic/constants';
import { suggestCategory } from '../logic/categorize';
import { todayISO, uid } from '../logic/utils';

export default function AddExpenseScreen({ navigation, route }) {
  const editing = route.params?.expense;
  const { categories, merchantMap, settings, addExpense, updateExpense, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [payment, setPayment] = useState('Cash');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (editing) {
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDescription(editing.description || '');
      setDate(editing.date);
      setPayment(editing.payment || 'Cash');
      setLocation(editing.location || '');
      setNotes(editing.notes || '');
      setPhoto(editing.photo);
    } else if (categories.length) {
      setCategory(suggestCategory('', merchantMap, categories));
    }
  }, [editing, categories, merchantMap]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission is required for receipt photos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const save = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      showToast('Enter a valid amount');
      return;
    }
    const record = {
      id: editing?.id || uid(),
      amount: num,
      category,
      description,
      date,
      payment,
      location,
      notes,
      photo,
    };
    if (editing) await updateExpense(record);
    else await addExpense(record);
    showToast(editing ? 'Expense updated' : 'Expense added');
    navigation.goBack();
  };

  return (
    <ThemedScreen edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={editing ? 'Edit expense' : 'Add expense'} subtitle="Track what you spent" />

          <Field label="Amount" theme={theme}>
            <TextInput style={[styles.input, inputStyle(theme)]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.muted} />
          </Field>

          <Field label="Category" theme={theme}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
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

          <Field label="Description" theme={theme}>
            <TextInput style={[styles.input, inputStyle(theme)]} value={description} onChangeText={(t) => { setDescription(t); if (!editing) setCategory(suggestCategory(t, merchantMap, categories)); }} placeholder="e.g. Lunch with team" placeholderTextColor={theme.muted} />
          </Field>

          <Field label="Date (YYYY-MM-DD)" theme={theme}>
            <TextInput style={[styles.input, inputStyle(theme)]} value={date} onChangeText={setDate} placeholder="2026-07-23" placeholderTextColor={theme.muted} />
          </Field>

          <Field label="Payment method" theme={theme}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {PAYMENT_METHODS.map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, { borderColor: theme.line, backgroundColor: payment === p ? theme.ink : theme.paper2 }]} onPress={() => setPayment(p)}>
                  <Text style={{ color: payment === p ? theme.paper : theme.text, fontSize: 13 }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Field label="Location (optional)" theme={theme}>
            <TextInput style={[styles.input, inputStyle(theme)]} value={location} onChangeText={setLocation} placeholder="e.g. Kozhikode" placeholderTextColor={theme.muted} />
          </Field>

          <Field label="Notes" theme={theme}>
            <TextInput style={[styles.input, styles.textarea, inputStyle(theme)]} value={notes} onChangeText={setNotes} multiline placeholder="Optional notes" placeholderTextColor={theme.muted} />
          </Field>

          <TouchableOpacity style={[styles.photoBtn, { borderColor: theme.line }]} onPress={pickPhoto}>
            <Text style={{ color: theme.text }}>📸 Attach receipt photo</Text>
          </TouchableOpacity>
          {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}

          <View style={styles.actions}>
            <GhostButton title="Cancel" theme={theme} onPress={() => navigation.goBack()} />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.ink }]} onPress={save}>
              <Text style={[styles.saveText, { color: theme.paper }]}>{editing ? 'Update' : 'Save expense'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  return { backgroundColor: theme.paper, color: theme.text, borderColor: theme.line };
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  field: { paddingHorizontal: 20, marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  photoBtn: { marginHorizontal: 20, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginBottom: 12 },
  preview: { marginHorizontal: 20, height: 160, borderRadius: 10, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 8, alignItems: 'center' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 16 },
});
