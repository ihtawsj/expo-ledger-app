import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, StatCard, Card, EmptyState } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import { INCOME_SOURCES } from '../logic/constants';
import { fmtMoney, todayISO, monthKey } from '../logic/utils';

export default function IncomeScreen() {
  const { income, expenses, settings, addIncome, removeIncome, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Salary');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const mk = monthKey(todayISO());
  const monthIncome = income.filter((i) => monthKey(i.date) === mk).reduce((s, i) => s + i.amount, 0);
  const monthExpense = expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);

  const save = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { showToast('Enter a valid amount'); return; }
    await addIncome({ amount: num, source, date, notes });
    setModal(false);
    setAmount('');
    showToast('Income added');
  };

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader
          title="Income"
          subtitle="Track what comes in"
          right={
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.ink }]} onPress={() => setModal(true)}>
              <Text style={{ color: theme.paper, fontWeight: '600' }}>+ Add</Text>
            </TouchableOpacity>
          }
        />
        <View style={styles.stats}>
          <StatCard theme={theme} label="Income this month" value={fmtMoney(monthIncome, settings.currency)} />
          <StatCard theme={theme} label="Expenses" value={fmtMoney(monthExpense, settings.currency)} />
          <StatCard theme={theme} label="Net savings" value={fmtMoney(monthIncome - monthExpense, settings.currency)} />
        </View>
        <Card theme={theme}>
          {income.length ? [...income].sort((a, b) => b.date.localeCompare(a.date)).map((i) => (
            <TransactionRow key={i.id} item={i} income onDelete={removeIncome} />
          )) : <EmptyState theme={theme} text="No income logged yet." />}
        </Card>
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.paper }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add income</Text>
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={theme.muted} />
            <ScrollView horizontal style={styles.chips}>
              {INCOME_SOURCES.map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: source === s ? theme.gold : theme.paper2 }]} onPress={() => setSource(s)}>
                  <Text>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={date} onChangeText={setDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={notes} onChangeText={setNotes} placeholder="Notes" placeholderTextColor={theme.muted} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModal(false)}><Text style={{ color: theme.muted }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.ink }]} onPress={save}><Text style={{ color: theme.paper, fontWeight: '600' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 8 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  chips: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
