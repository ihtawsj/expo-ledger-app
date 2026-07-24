import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, EmptyState } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import { fmtMoney } from '../logic/utils';

export default function RecurringScreen() {
  const { recurring, categories, settings, addRecurring, removeRecurring, catByName, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Others');
  const [day, setDay] = useState('1');

  const save = async () => {
    if (!name.trim() || !parseFloat(amount)) { showToast('Enter name and amount'); return; }
    await addRecurring({ name: name.trim(), amount: parseFloat(amount), category, day: parseInt(day, 10) || 1 });
    setModal(false);
    setName(''); setAmount('');
    showToast('Recurring expense added');
  };

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader
          title="Recurring"
          subtitle="Rent, subscriptions, EMIs"
          right={
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.ink }]} onPress={() => setModal(true)}>
              <Text style={{ color: theme.paper, fontWeight: '600' }}>+ Add</Text>
            </TouchableOpacity>
          }
        />
        <Card theme={theme}>
          {recurring.length ? recurring.map((r) => {
            const cat = catByName(r.category) || { icon: '📦', color: '#999' };
            return (
              <TouchableOpacity key={r.id} style={[styles.row, { borderBottomColor: theme.line }]}>
                <Text style={styles.icon}>{cat.icon}</Text>
                <Text style={[styles.main, { color: theme.text }]}>{r.name}{'\n'}<Text style={{ color: theme.muted, fontSize: 12 }}>Day {r.day} · {r.category}</Text></Text>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{fmtMoney(r.amount, settings.currency)}</Text>
                <TouchableOpacity onPress={() => removeRecurring(r.id)}><Text>🗑</Text></TouchableOpacity>
              </TouchableOpacity>
            );
          }) : <EmptyState theme={theme} text="No recurring expenses set up." />}
        </Card>
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.paper }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New recurring expense</Text>
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={name} onChangeText={setName} placeholder="e.g. Netflix" placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={theme.muted} />
            <ScrollView horizontal style={styles.chips}>
              {categories.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.chip, { backgroundColor: category === c.name ? theme.gold : theme.paper2 }]} onPress={() => setCategory(c.name)}>
                  <Text>{c.icon} {c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={day} onChangeText={setDay} keyboardType="number-pad" placeholder="Day of month (1-28)" placeholderTextColor={theme.muted} />
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
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { fontSize: 20 },
  main: { flex: 1, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  chips: { marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
