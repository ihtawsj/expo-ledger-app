import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, GhostButton } from '../components/ui';
import { VoiceListener } from '../components/VoiceListener';
import { parseVoiceText } from '../logic/parseExpense';
import { todayISO, uid } from '../logic/utils';

export default function VoiceEntryScreen({ navigation }) {
  const { categories, merchantMap, settings, addExpense, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);

  const [phrase, setPhrase] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Others');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!phrase.trim()) return;
    const parsed = parseVoiceText(phrase, merchantMap, categories);
    if (parsed.amount) setAmount(parsed.amount);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.date) setDate(parsed.date);
  }, [phrase, merchantMap, categories]);

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
      description,
      date,
      payment: 'Cash',
      location: '',
      notes: 'Added via voice entry',
      photo: null,
    });
    showToast('Expense added from voice');
    navigation.goBack();
  };

  return (
    <ThemedScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Voice entry" subtitle='Say: "Spent 350 on lunch"' />

        <VoiceListener
          theme={theme}
          onTranscript={(text) => {
            setPhrase(text);
            showToast(`Got it: "${text}"`);
          }}
          onError={(msg) => showToast(msg)}
        />

        <Field label="What you said" theme={theme}>
          <TextInput
            style={inputStyle(theme)}
            value={phrase}
            onChangeText={setPhrase}
            placeholder='Or type: "Paid 700 for petrol yesterday"'
            placeholderTextColor={theme.muted}
            multiline
          />
        </Field>

        <Field label="Amount" theme={theme}>
          <TextInput style={inputStyle(theme)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.muted} />
        </Field>
        <Field label="Description" theme={theme}>
          <TextInput style={inputStyle(theme)} value={description} onChangeText={setDescription} placeholderTextColor={theme.muted} />
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
  field: { paddingHorizontal: 20, marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 8, alignItems: 'center' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
});
