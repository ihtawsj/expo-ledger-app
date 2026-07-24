import React, { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, StatCard, Card, EmptyState } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import { fmtMoney, monthKey, todayISO, monthLabel } from '../logic/utils';

export default function HistoryScreen({ navigation }) {
  const { expenses, settings, removeExpense } = useLedger();
  const theme = getTheme(settings.darkMode);

  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => monthKey(e.date)));
    set.add(monthKey(todayISO()));
    return [...set].sort().reverse();
  }, [expenses]);

  const [selected, setSelected] = useState(months[0] || monthKey(todayISO()));

  const { total, byCat, list } = useMemo(() => {
    const mExp = expenses.filter((e) => monthKey(e.date) === selected);
    const t = mExp.reduce((s, e) => s + e.amount, 0);
    const bc = {};
    mExp.forEach((e) => { bc[e.category] = (bc[e.category] || 0) + e.amount; });
    const sorted = [...mExp].sort((a, b) => b.date.localeCompare(a.date));
    return { total: t, byCat: bc, list: sorted };
  }, [expenses, selected]);

  return (
    <ThemedScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="History" subtitle="Browse past months" />

        <View style={[styles.pickerWrap, { borderColor: theme.line, backgroundColor: theme.paper2 }]}>
          <Picker selectedValue={selected} onValueChange={setSelected} dropdownIconColor={theme.text} style={{ color: theme.text }}>
            {months.map((m) => (
              <Picker.Item key={m} label={monthLabel(m)} value={m} color={theme.text} />
            ))}
          </Picker>
        </View>

        <View style={styles.stats}>
          <StatCard theme={theme} label="Total" value={fmtMoney(total, settings.currency)} />
          {Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).slice(0, 3).map((c) => (
            <StatCard key={c} theme={theme} label={c} value={fmtMoney(byCat[c], settings.currency)} />
          ))}
        </View>

        <Card theme={theme}>
          {list.length ? list.map((e) => (
            <TransactionRow
              key={e.id}
              item={e}
              onEdit={(exp) => navigation.getParent()?.getParent()?.navigate('AddExpense', { expense: exp })}
              onDelete={removeExpense}
            />
          )) : <EmptyState theme={theme} text="No transactions this month." />}
        </Card>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  pickerWrap: { marginHorizontal: 20, borderRadius: 10, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 8 },
});
