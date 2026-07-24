import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, ProgressBar, EmptyState } from '../components/ui';
import { fmtMoney } from '../logic/utils';

export default function GoalsScreen() {
  const { goals, settings, addGoal, updateGoal, removeGoal, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [date, setDate] = useState('');

  const save = async () => {
    if (!name.trim() || !parseFloat(target)) { showToast('Enter goal name and target'); return; }
    await addGoal({ name: name.trim(), target: parseFloat(target), current: parseFloat(current) || 0, date });
    setModal(false);
    setName(''); setTarget(''); setCurrent('0'); setDate('');
    showToast('Goal created');
  };

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader
          title="Savings goals"
          subtitle="Laptop, vacation, emergency fund..."
          right={
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.ink }]} onPress={() => setModal(true)}>
              <Text style={{ color: theme.paper, fontWeight: '600' }}>+ New</Text>
            </TouchableOpacity>
          }
        />
        {goals.length ? goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          return (
            <Card key={g.id} theme={theme}>
              <Text style={[styles.goalName, { color: theme.text }]}>{g.name}</Text>
              <ProgressBar pct={pct} theme={theme} />
              <Text style={{ color: theme.muted, marginTop: 8, fontFamily: 'monospace' }}>
                {fmtMoney(g.current, settings.currency)} / {fmtMoney(g.target, settings.currency)} ({pct.toFixed(0)}%)
              </Text>
              {g.date ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>Target: {g.date}</Text> : null}
              <View style={styles.row}>
                <TouchableOpacity style={[styles.chip, { borderColor: theme.line }]} onPress={() => updateGoal({ ...g, current: g.current + 500 })}>
                  <Text style={{ color: theme.text }}>+ ₹500</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Delete goal?', g.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeGoal(g.id) }])}>
                  <Text style={{ color: theme.red }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }) : <EmptyState theme={theme} text="No savings goals yet." />}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.paper }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New savings goal</Text>
            {['name', 'target', 'current', 'date'].map((field) => (
              <TextInput
                key={field}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                value={field === 'name' ? name : field === 'target' ? target : field === 'current' ? current : date}
                onChangeText={field === 'name' ? setName : field === 'target' ? setTarget : field === 'current' ? setCurrent : setDate}
                placeholder={field === 'name' ? 'Goal name' : field === 'target' ? 'Target amount' : field === 'current' ? 'Current savings' : 'Target date (optional)'}
                placeholderTextColor={theme.muted}
                keyboardType={field === 'name' || field === 'date' ? 'default' : 'decimal-pad'}
              />
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModal(false)}><Text style={{ color: theme.muted }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.ink }]} onPress={save}><Text style={{ color: theme.paper, fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  goalName: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
