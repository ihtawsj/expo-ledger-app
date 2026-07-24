import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, ProgressBar } from '../components/ui';
import { fmtMoney, todayISO, monthKey, daysInMonth } from '../logic/utils';

export default function BudgetScreen() {
  const { expenses, categories, settings, updateSettings, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [budgetInput, setBudgetInput] = useState(String(settings.monthlyBudget || ''));

  const mk = monthKey(todayISO());
  const spent = expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, (settings.monthlyBudget || 0) - spent);
  const daysLeft = daysInMonth(mk) - new Date().getDate() + 1;

  const save = async () => {
    await updateSettings({ monthlyBudget: parseFloat(budgetInput) || 0 });
    showToast('Monthly budget saved');
  };

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title="Budget" subtitle="Set limits and stay on track" />

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Monthly budget</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.paper, color: theme.text, borderColor: theme.line }]}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 25000"
              placeholderTextColor={theme.muted}
            />
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.ink }]} onPress={save}>
              <Text style={{ color: theme.paper, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, marginTop: 10 }}>
            {settings.monthlyBudget
              ? `Safe to spend ${fmtMoney(remaining / Math.max(1, daysLeft), settings.currency)} per day for the rest of the month.`
              : 'Set a monthly budget to see your daily allowance.'}
          </Text>
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Category budgets</Text>
          {categories.filter((c) => c.budget > 0).map((c) => {
            const spentCat = expenses.filter((e) => monthKey(e.date) === mk && e.category === c.name).reduce((s, e) => s + e.amount, 0);
            const pct = Math.min(100, (spentCat / c.budget) * 100);
            return (
              <View key={c.id} style={{ marginBottom: 14 }}>
                <View style={styles.catHead}>
                  <Text style={{ color: theme.text }}>{c.icon} {c.name}</Text>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{fmtMoney(spentCat, settings.currency)} / {fmtMoney(c.budget, settings.currency)}</Text>
                </View>
                <ProgressBar pct={pct} theme={theme} />
              </View>
            );
          })}
          {!categories.some((c) => c.budget > 0) ? (
            <Text style={{ color: theme.muted }}>Set budgets per category from the Categories screen.</Text>
          ) : null}
        </Card>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  btn: { paddingHorizontal: 18, borderRadius: 10, justifyContent: 'center' },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});
