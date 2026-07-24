import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card } from '../components/ui';
import { computeInsights, answerFinanceQuery } from '../logic/insights';
import { fmtMoney, monthKey, todayISO, monthLabel } from '../logic/utils';

export default function InsightsScreen() {
  const ledger = useLedger();
  const { settings } = ledger;
  const theme = getTheme(settings.darkMode);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');

  const insights = useMemo(() => computeInsights(ledger), [ledger.expenses, ledger.income, ledger.settings]);
  const mk = monthKey(todayISO());

  const generateReport = () => {
    const exps = ledger.expenses.filter((e) => monthKey(e.date) === mk);
    const total = exps.reduce((s, e) => s + e.amount, 0);
    const byCat = {};
    exps.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const income = ledger.income.filter((i) => monthKey(i.date) === mk).reduce((s, i) => s + i.amount, 0);
    return { total, byCat, income, savings: income - total };
  };

  const report = generateReport();

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title="AI Insights" subtitle="Patterns in your spending" />

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Insights</Text>
          {insights.map((i, idx) => (
            <View key={idx} style={[styles.insight, { borderLeftColor: theme.gold, backgroundColor: theme.paper }]}>
              <Text style={{ color: theme.text }}>💡 {i}</Text>
            </View>
          ))}
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Ask your finances</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, borderColor: theme.line, color: theme.text, backgroundColor: theme.paper }]}
              value={query}
              onChangeText={setQuery}
              placeholder="How much on food last month?"
              placeholderTextColor={theme.muted}
              onSubmitEditing={() => setAnswer(answerFinanceQuery(query, ledger))}
            />
            <TouchableOpacity style={[styles.askBtn, { backgroundColor: theme.ink }]} onPress={() => setAnswer(answerFinanceQuery(query, ledger))}>
              <Text style={{ color: theme.paper, fontWeight: '600' }}>Ask</Text>
            </TouchableOpacity>
          </View>
          {answer ? <Text style={[styles.answer, { color: theme.text, backgroundColor: theme.paper }]}>{answer}</Text> : null}
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>📄 Report — {monthLabel(mk)}</Text>
          <Text style={{ color: theme.text, marginBottom: 6 }}>Total spent: <Text style={{ fontWeight: '700' }}>{fmtMoney(report.total, settings.currency)}</Text></Text>
          <Text style={{ color: theme.text, marginBottom: 6 }}>Savings estimate: <Text style={{ fontWeight: '700' }}>{fmtMoney(report.savings, settings.currency)}</Text></Text>
          {Object.keys(report.byCat).sort((a, b) => report.byCat[b] - report.byCat[a]).map((c) => (
            <Text key={c} style={{ color: theme.muted, fontSize: 14 }}>{c}: {fmtMoney(report.byCat[c], settings.currency)}</Text>
          ))}
        </Card>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  insight: { borderLeftWidth: 3, padding: 12, borderRadius: 6, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  askBtn: { paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  answer: { marginTop: 12, padding: 12, borderRadius: 8, fontSize: 15 },
});
