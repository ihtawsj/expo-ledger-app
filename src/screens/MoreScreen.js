import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card } from '../components/ui';

const MENU = [
  { title: 'Budget', icon: '💰', screen: 'Budget' },
  { title: 'Search & filter', icon: '🔍', screen: 'Search' },
  { title: 'Income', icon: '💵', screen: 'Income' },
  { title: 'Savings goals', icon: '🎯', screen: 'Goals' },
  { title: 'Recurring', icon: '🔁', screen: 'Recurring' },
  { title: 'Categories', icon: '📂', screen: 'Categories' },
  { title: 'AI Insights', icon: '📈', screen: 'Insights' },
  { title: 'Receipt gallery', icon: '📷', screen: 'Gallery' },
  { title: 'Settings', icon: '⚙️', screen: 'Settings' },
];

export default function MoreScreen({ navigation }) {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);

  return (
    <ThemedScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="More" subtitle="Budget, goals, settings & more" />
        <Card theme={theme} style={styles.menu}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.row, { borderBottomColor: theme.line }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={[styles.label, { color: theme.text }]}>{item.title}</Text>
              <Text style={{ color: theme.muted }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>
        <Text style={[styles.foot, { color: theme.muted }]}>Runs offline on your device. Data stays on this phone.</Text>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  menu: { paddingVertical: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  icon: { fontSize: 20, width: 28 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  foot: { textAlign: 'center', fontSize: 12, paddingHorizontal: 30, marginTop: 8 },
});
