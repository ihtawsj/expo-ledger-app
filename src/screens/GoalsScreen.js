import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, ProgressBar, EmptyState } from '../components/ui';
import { fmtMoney, todayISO, monthKey } from '../logic/utils';

export default function GoalsScreen() {
  const { goals, settings, addGoal, updateGoal, removeGoal, showToast, income, expenses, goalContributions, addGoalContribution } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState('0');
  const [contributeModal, setContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const availableSavings = useMemo(() => {
    const mk = monthKey(todayISO());
    const monthIncome = income.filter((i) => monthKey(i.date) === mk).reduce((s, i) => s + i.amount, 0);
    const monthExpenses = expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);
    const monthContributions = goalContributions
      .filter((c) => c.month_key === mk)
      .reduce((s, c) => s + c.amount, 0);
    return monthIncome - monthExpenses - monthContributions;
  }, [income, expenses, goalContributions]);

  const save = async () => {
    if (!name.trim() || !parseFloat(target)) { showToast('Enter goal name and target'); return; }
    await addGoal({ name: name.trim(), target: parseFloat(target), current: parseFloat(current) || 0, date, priority: parseInt(priority) });
    setModal(false);
    setName(''); setTarget(''); setCurrent('0'); setDate(''); setPriority('0');
    showToast('Goal created');
  };

  const openContributeModal = (goal) => {
    setSelectedGoal(goal);
    setContributeAmount('');
    setContributeModal(true);
  };

  const saveContribution = async () => {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
    if (amount > availableSavings) { showToast(`Only ${fmtMoney(availableSavings, settings.currency)} available`); return; }
    
    await addGoalContribution({
      goalId: selectedGoal.id,
      amount,
      date: todayISO(),
      monthKey: monthKey(todayISO()),
    });
    await updateGoal({ ...selectedGoal, current: selectedGoal.current + amount });
    
    setContributeModal(false);
    setSelectedGoal(null);
    setContributeAmount('');
    showToast(`Added ${fmtMoney(amount, settings.currency)} to ${selectedGoal.name}`);
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
        {availableSavings > 0 && (
          <Card theme={theme} style={{ marginHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ color: theme.text, fontSize: 14, marginBottom: 4 }}>Available savings this month</Text>
            <Text style={{ color: theme.green, fontSize: 20, fontWeight: '700' }}>{fmtMoney(availableSavings, settings.currency)}</Text>
            <TouchableOpacity 
              style={[styles.contributeBtn, { backgroundColor: theme.ink }]} 
              onPress={() => goals.length > 0 ? openContributeModal(null) : showToast('Create a goal first')}
            >
              <Text style={{ color: theme.paper, fontWeight: '600' }}>Add to goal</Text>
            </TouchableOpacity>
          </Card>
        )}
        {goals.length ? goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          return (
            <Card key={g.id} theme={theme}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalName, { color: theme.text }]}>{g.name}</Text>
                {g.priority > 0 && (
                  <View style={[styles.priorityBadge, { backgroundColor: theme.gold }]}>
                    <Text style={{ color: theme.paper, fontSize: 10, fontWeight: '700' }}>#{g.priority}</Text>
                  </View>
                )}
              </View>
              <ProgressBar pct={pct} theme={theme} />
              <Text style={{ color: theme.muted, marginTop: 8, fontFamily: 'monospace' }}>
                {fmtMoney(g.current, settings.currency)} / {fmtMoney(g.target, settings.currency)} ({pct.toFixed(0)}%)
              </Text>
              {g.date ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>Target: {g.date}</Text> : null}
              <View style={styles.row}>
                <TouchableOpacity style={[styles.chip, { borderColor: theme.line }]} onPress={() => openContributeModal(g)}>
                  <Text style={{ color: theme.text }}>Add to goal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Set priority', 'Set this as priority goal?', [
                  { text: 'Cancel' },
                  { text: '#1', onPress: () => updateGoal({ ...g, priority: 1 }) },
                  { text: '#2', onPress: () => updateGoal({ ...g, priority: 2 }) },
                  { text: '#3', onPress: () => updateGoal({ ...g, priority: 3 }) },
                  { text: 'Clear', onPress: () => updateGoal({ ...g, priority: 0 }) },
                ])}>
                  <Text style={{ color: theme.ink }}>Priority</Text>
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
            {['name', 'target', 'current', 'date', 'priority'].map((field) => (
              <TextInput
                key={field}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                value={field === 'name' ? name : field === 'target' ? target : field === 'current' ? current : field === 'date' ? date : priority}
                onChangeText={field === 'name' ? setName : field === 'target' ? setTarget : field === 'current' ? setCurrent : field === 'date' ? setDate : setPriority}
                placeholder={field === 'name' ? 'Goal name' : field === 'target' ? 'Target amount' : field === 'current' ? 'Current savings' : field === 'date' ? 'Target date (optional)' : 'Priority (1=highest, 0=none)'}
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

      <Modal visible={contributeModal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.paper }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add to goal</Text>
            <Text style={{ color: theme.muted, marginBottom: 16 }}>
              Available: {fmtMoney(availableSavings, settings.currency)}
            </Text>
            
            <Text style={{ color: theme.text, marginBottom: 8, fontWeight: '600' }}>Select goal</Text>
            <ScrollView style={{ maxHeight: 150, marginBottom: 16 }}>
              {goals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.goalOption,
                    { 
                      backgroundColor: selectedGoal?.id === g.id ? theme.ink : 'transparent',
                      borderColor: theme.line 
                    }
                  ]}
                  onPress={() => setSelectedGoal(g)}
                >
                  <Text style={{ color: selectedGoal?.id === g.id ? theme.paper : theme.text, fontWeight: '600' }}>
                    {g.name}
                  </Text>
                  <Text style={{ color: selectedGoal?.id === g.id ? theme.paper : theme.muted, fontSize: 12 }}>
                    {fmtMoney(g.current, settings.currency)} / {fmtMoney(g.target, settings.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              value={contributeAmount}
              onChangeText={setContributeAmount}
              placeholder="Amount to add"
              placeholderTextColor={theme.muted}
              keyboardType="decimal-pad"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setContributeModal(false)}><Text style={{ color: theme.muted }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.ink, opacity: !selectedGoal || !contributeAmount ? 0.5 : 1 }]} 
                onPress={saveContribution}
                disabled={!selectedGoal || !contributeAmount}
              >
                <Text style={{ color: theme.paper, fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  contributeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8, alignSelf: 'flex-start' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalName: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 },
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  goalOption: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
