import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';

export function ThemedScreen({ children, style, edges = [] }) {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: theme.paper }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle, right }) {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function StatCard({ label, value, hero, foot, theme }) {
  return (
    <View style={[styles.stat, hero && styles.statHero, { backgroundColor: theme.paper2, borderColor: theme.line }]}>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      {foot ? <Text style={[styles.statFoot, { color: theme.muted }]}>{foot}</Text> : null}
    </View>
  );
}

export function ProgressBar({ pct, theme }) {
  const color = pct >= 100 ? theme.red : pct >= 75 ? theme.goldDeep : theme.green;
  return (
    <View style={[styles.track, { backgroundColor: theme.line }]}>
      <View style={[styles.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Card({ children, theme, style }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.paper2, borderColor: theme.line }, style]}>
      {children}
    </View>
  );
}

export function EmptyState({ text, theme }) {
  return <Text style={[styles.empty, { color: theme.muted }]}>{text}</Text>;
}

export function PrimaryButton({ title, onPress, theme, style }) {
  return (
    <Text style={[styles.primaryBtn, { backgroundColor: theme.ink, color: theme.paper }, style]} onPress={onPress}>
      {title}
    </Text>
  );
}

export function GhostButton({ title, onPress, theme, danger }) {
  return (
    <Text
      style={[styles.ghostBtn, { borderColor: danger ? theme.red : theme.line, color: danger ? theme.red : theme.text }]}
      onPress={onPress}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerText: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  stat: { borderWidth: 1, borderRadius: 14, padding: 16, minWidth: '46%', flexGrow: 1 },
  statHero: { minWidth: '100%' },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statFoot: { fontSize: 12, marginTop: 6 },
  track: { height: 8, borderRadius: 6, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginHorizontal: 20, marginBottom: 14 },
  empty: { textAlign: 'center', padding: 24, fontSize: 14 },
  primaryBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, overflow: 'hidden', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 14 },
});
