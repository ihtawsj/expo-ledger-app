import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, StyleSheet } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, EmptyState } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import { PAYMENT_METHODS } from '../logic/constants';

export default function SearchScreen({ navigation }) {
  const { expenses, settings, removeExpense } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('');
  const [pay, setPay] = useState('');

  const results = useMemo(() => expenses.filter((e) => {
    if (text && !(`${e.description} ${e.notes} ${e.location} ${e.category}`.toLowerCase().includes(text.toLowerCase()))) return false;
    if (cat && e.category !== cat) return false;
    if (pay && e.payment !== pay) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)), [expenses, text, cat, pay]);

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title="Search" subtitle="Find any transaction" />
        <Card theme={theme}>
          <TextInput style={[styles.input, { backgroundColor: theme.paper, color: theme.text, borderColor: theme.line }]} value={text} onChangeText={setText} placeholder="Search merchant, notes..." placeholderTextColor={theme.muted} />
          <TextInput style={[styles.input, { backgroundColor: theme.paper, color: theme.text, borderColor: theme.line }]} value={cat} onChangeText={setCat} placeholder="Category filter" placeholderTextColor={theme.muted} />
          <TextInput style={[styles.input, { backgroundColor: theme.paper, color: theme.text, borderColor: theme.line }]} value={pay} onChangeText={setPay} placeholder={`Payment (${PAYMENT_METHODS.join(', ')})`} placeholderTextColor={theme.muted} />
        </Card>
        <Card theme={theme}>
          {results.length ? results.map((e) => (
            <TransactionRow key={e.id} item={e} onEdit={(exp) => navigation.getParent()?.navigate('AddExpense', { expense: exp })} onDelete={removeExpense} />
          )) : <EmptyState theme={theme} text="No matching transactions." />}
        </Card>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
});
