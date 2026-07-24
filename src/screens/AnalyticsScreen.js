import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, StatCard } from '../components/ui';
import { fmtMoney, todayISO, monthKey, lastMonthKey, monthLabel } from '../logic/utils';

export default function AnalyticsScreen() {
  const { expenses, settings, categories } = useLedger();
  const theme = getTheme(settings.darkMode);
  const width = Dimensions.get('window').width - 72;

  const chartConfig = {
    backgroundGradientFrom: theme.paper2,
    backgroundGradientTo: theme.paper2,
    color: (opacity = 1) => theme.ink,
    labelColor: () => theme.muted,
    decimalPlaces: 0,
    propsForBackgroundLines: { stroke: theme.line },
  };

  const { monthExpenses, byCat, sortedMonths, weekLabels, weekData, dayLabels, dayData, compare } = useMemo(() => {
    const mk = monthKey(todayISO());
    const monthExp = expenses.filter((e) => monthKey(e.date) === mk);
    const catTotals = {};
    monthExp.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

    const monthTotals = {};
    expenses.forEach((e) => { const k = monthKey(e.date); monthTotals[k] = (monthTotals[k] || 0) + e.amount; });
    const months = Object.keys(monthTotals).sort().slice(-6);

    const wLabels = [];
    const wData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      wLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      wData.push(expenses.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0));
    }

    const dLabels = [];
    const dData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      dLabels.push(iso.slice(5));
      dData.push(expenses.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0));
    }

    const lastMk = lastMonthKey();
    const thisTotal = monthTotals[mk] || 0;
    const lastTotal = monthTotals[lastMk] || 0;
    const delta = lastTotal ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    const topCat = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];

    return {
      monthExpenses: monthExp,
      byCat: catTotals,
      sortedMonths: months,
      weekLabels: wLabels,
      weekData: wData,
      dayLabels: dLabels,
      dayData: dData,
      compare: { thisTotal, lastTotal, delta, topCat },
    };
  }, [expenses]);

  const monthTotalsMap = useMemo(() => {
    const m = {};
    expenses.forEach((e) => { const k = monthKey(e.date); m[k] = (m[k] || 0) + e.amount; });
    return m;
  }, [expenses]);

  return (
    <ThemedScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Analytics" subtitle="Where your money is going" />

        {Object.keys(byCat).length ? (
          <Card theme={theme}>
            <Text style={[styles.title, { color: theme.text }]}>By category (this month)</Text>
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <View key={cat} style={styles.catRow}>
                <Text style={{ color: theme.text }}>{categories.find((c) => c.name === cat)?.icon || '📦'} {cat}</Text>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{fmtMoney(amt, settings.currency)}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {sortedMonths.length > 0 ? (
          <Card theme={theme}>
            <Text style={[styles.title, { color: theme.text }]}>Monthly totals</Text>
            <BarChart
              data={{
                labels: sortedMonths.map((m) => monthLabel(m).split(' ')[0].slice(0, 3)),
                datasets: [{ data: sortedMonths.map((m) => monthTotalsMap[m] || 0) }],
              }}
              width={width}
              height={200}
              chartConfig={{ ...chartConfig, color: () => theme.gold }}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
            />
          </Card>
        ) : null}

        <Card theme={theme}>
          <Text style={[styles.title, { color: theme.text }]}>This week</Text>
          <BarChart
            data={{ labels: weekLabels, datasets: [{ data: weekData.length ? weekData : [0] }] }}
            width={width}
            height={180}
            chartConfig={{ ...chartConfig, color: () => theme.green }}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
          />
        </Card>

        <Card theme={theme}>
          <Text style={[styles.title, { color: theme.text }]}>Daily trend (30 days)</Text>
          <LineChart
            data={{ labels: dayLabels.filter((_, i) => i % 5 === 0), datasets: [{ data: dayData.filter((_, i) => i % 5 === 0) }] }}
            width={width}
            height={180}
            chartConfig={chartConfig}
            bezier
          />
        </Card>

        <View style={styles.compareGrid}>
          <StatCard theme={theme} label="This month" value={fmtMoney(compare.thisTotal, settings.currency)} />
          <StatCard theme={theme} label="Last month" value={fmtMoney(compare.lastTotal, settings.currency)} />
          <StatCard theme={theme} label="Change" value={`${compare.delta >= 0 ? '+' : ''}${compare.delta.toFixed(1)}%`} />
          <StatCard theme={theme} label="Top category" value={compare.topCat || '—'} />
        </View>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCD5C455' },
  compareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
});
