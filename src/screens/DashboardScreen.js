import React, { useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, StatCard, ProgressBar, Card, EmptyState } from '../components/ui';
import { QuickActions } from '../components/QuickActions';
import { TransactionRow } from '../components/TransactionRow';
import { fmtMoney, todayISO, monthKey, lastMonthKey } from '../logic/utils';

export default function DashboardScreen({ navigation }) {
  const { expenses, income, settings, categories, refresh, removeExpense } = useLedger();
  const theme = getTheme(settings.darkMode);
  const [refreshing, setRefreshing] = React.useState(false);

  const stats = useMemo(() => {
    const mk = monthKey(todayISO());
    const lastMk = lastMonthKey();
    const monthExpenses = expenses.filter((e) => monthKey(e.date) === mk);
    const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const lastMonthTotal = expenses.filter((e) => monthKey(e.date) === lastMk).reduce((s, e) => s + e.amount, 0);
    const todayTotal = expenses.filter((e) => e.date === todayISO()).reduce((s, e) => s + e.amount, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTotal = expenses.filter((e) => new Date(e.date) >= weekAgo).reduce((s, e) => s + e.amount, 0);
    const monthIncome = income.filter((i) => monthKey(i.date) === mk).reduce((s, i) => s + i.amount, 0);
    const budget = settings.monthlyBudget || 0;
    const pct = budget ? Math.min(100, (monthTotal / budget) * 100) : 0;

    const byCat = {};
    monthExpenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

    return { monthTotal, lastMonthTotal, todayTotal, weekTotal, monthIncome, budget, pct, byCat, mk };
  }, [expenses, income, settings.monthlyBudget]);

  const recent = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [expenses],
  );

  const chartData = useMemo(() => {
    const labels = Object.keys(stats.byCat);
    if (!labels.length) return null;
    return {
      labels,
      datasets: [{ data: labels.map((l) => stats.byCat[l]) }],
    };
  }, [stats.byCat]);

  const chartColors = Object.keys(stats.byCat).map((name) => {
    const cat = categories.find((c) => c.name === name);
    return cat?.color || '#999';
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <ThemedScreen edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.ink} />}
        contentContainerStyle={styles.scroll}
      >
        <ScreenHeader
          title="Dashboard"
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        />

        <QuickActions
          theme={theme}
          onAdd={() => navigation.getParent()?.navigate('AddExpense')}
          onScan={() => navigation.getParent()?.navigate('ScanReceipt')}
          onVoice={() => navigation.getParent()?.navigate('VoiceEntry')}
        />

        <View style={styles.statGrid}>
          <StatCard
            hero
            theme={theme}
            label="Spent this month"
            value={fmtMoney(stats.monthTotal, settings.currency)}
            foot={stats.budget
              ? `${stats.pct.toFixed(0)}% of ${fmtMoney(stats.budget, settings.currency)} budget`
              : 'No budget set — go to Budget'}
          />
          {stats.budget ? <ProgressBar pct={stats.pct} theme={theme} /> : null}

          <View style={styles.statRow}>
            <StatCard theme={theme} label="Remaining" value={fmtMoney(Math.max(0, stats.budget - stats.monthTotal), settings.currency)} />
            <StatCard theme={theme} label="Today" value={fmtMoney(stats.todayTotal, settings.currency)} />
          </View>
          <View style={styles.statRow}>
            <StatCard theme={theme} label="This week" value={fmtMoney(stats.weekTotal, settings.currency)} />
            <StatCard theme={theme} label="Last month" value={fmtMoney(stats.lastMonthTotal, settings.currency)} />
          </View>
          <StatCard theme={theme} label="Savings this month" value={fmtMoney(stats.monthIncome - stats.monthTotal, settings.currency)} />
        </View>

        <Card theme={theme}>
          <View style={[styles.cardHead, { borderBottomColor: theme.line }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recent transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={{ color: theme.green, fontSize: 14 }}>View all</Text>
            </TouchableOpacity>
          </View>
          {recent.length ? recent.map((e) => (
            <TransactionRow
              key={e.id}
              item={e}
              onEdit={(exp) => navigation.getParent()?.navigate('AddExpense', { expense: exp })}
              onDelete={removeExpense}
            />
          )) : <EmptyState theme={theme} text="No expenses yet — use the buttons above or tap + below!" />}
        </Card>

        {chartData ? (
          <Card theme={theme}>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>This month by category</Text>
            <PieChart
              data={chartData.labels.map((label, i) => ({
                name: label,
                population: chartData.datasets[0].data[i],
                color: chartColors[i],
                legendFontColor: theme.muted,
                legendFontSize: 11,
              }))}
              width={Dimensions.get('window').width - 72}
              height={180}
              chartConfig={{ color: () => theme.ink }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
            />
          </Card>
        ) : null}
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  statGrid: { paddingHorizontal: 20, gap: 12, marginBottom: 8 },
  statRow: { flexDirection: 'row', gap: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  cardTitle: { fontSize: 17, fontWeight: '700' },
});
