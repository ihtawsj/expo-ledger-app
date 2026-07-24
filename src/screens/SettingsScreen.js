import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { notificationsAvailable } from '../notifications/notifications';
import { ThemedScreen, ScreenHeader, Card } from '../components/ui';
import { ACHIEVEMENT_DEFS } from '../logic/constants';
import { monthKey, todayISO } from '../logic/utils';

const CURRENCIES = [
  { value: '₹', label: '₹ Indian Rupee' },
  { value: '$', label: '$ US Dollar' },
  { value: '€', label: '€ Euro' },
  { value: '£', label: '£ British Pound' },
];

export default function SettingsScreen() {
  const ledger = useLedger();
  const { settings, updateSettings, wipeData, restoreBackup, showToast } = ledger;
  const theme = getTheme(settings.darkMode);
  const [pinInput, setPinInput] = useState('');
  const [pinEnabled, setPinEnabled] = useState(!!settings.pin);

  const shareFile = async (content, filename) => {
    const path = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(path, content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path);
    } else {
      showToast('Sharing not available on this device');
    }
  };

  const exportCsv = async () => {
    const rows = [['Date', 'Category', 'Description', 'Amount', 'Payment', 'Location', 'Notes']];
    ledger.expenses.forEach((e) => rows.push([e.date, e.category, e.description, e.amount, e.payment, e.location || '', e.notes || '']));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    await shareFile(csv, 'ledger_expenses.csv');
  };

  const exportJson = async () => {
    const backup = {
      expenses: ledger.expenses,
      income: ledger.income,
      categories: ledger.categories,
      goals: ledger.goals,
      recurring: ledger.recurring,
      merchantMap: ledger.merchantMap,
      settings: ledger.settings,
    };
    await shareFile(JSON.stringify(backup, null, 2), 'ledger_backup.json');
  };

  const importBackup = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled || !result.assets?.[0]) return;
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
    try {
      await restoreBackup(JSON.parse(content));
      showToast('Backup restored');
    } catch {
      showToast('Invalid backup file');
    }
  };

  const stats = computeAchievementStats(ledger);

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader title="Settings" subtitle="Customize & manage data" />

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Appearance</Text>
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text }}>Dark mode</Text>
            <Switch value={settings.darkMode} onValueChange={(v) => updateSettings({ darkMode: v })} trackColor={{ true: theme.green }} />
          </View>
          <Text style={[styles.label, { color: theme.muted }]}>Currency</Text>
          <View style={styles.chips}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[styles.chip, { backgroundColor: settings.currency === c.value ? theme.gold : theme.paper }]}
                onPress={() => updateSettings({ currency: c.value })}
              >
                <Text style={{ color: theme.text, fontSize: 13 }}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Notifications</Text>
          {!notificationsAvailable ? (
            <Text style={[styles.note, { color: theme.goldDeep }]}>
              Push-style alerts are not available in Expo Go on Android. Budget warnings still appear as in-app toasts. Install a preview APK (eas build) for real notifications.
            </Text>
          ) : (
            <Text style={[styles.note, { color: theme.muted }]}>
              Local alerts on this phone only — works offline.
            </Text>
          )}
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, flex: 1, paddingRight: 12 }}>Budget alerts (50%, 75%, 90%, 100%)</Text>
            <Switch
              value={settings.notificationsBudget !== false}
              onValueChange={(v) => updateSettings({ notificationsBudget: v })}
              trackColor={{ true: theme.green }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, flex: 1, paddingRight: 12 }}>Recurring bill reminders</Text>
            <Switch
              value={settings.notificationsRecurring !== false}
              onValueChange={(v) => updateSettings({ notificationsRecurring: v })}
              trackColor={{ true: theme.green }}
            />
          </View>
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Security</Text>
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text }}>PIN lock</Text>
            <Switch
              value={pinEnabled}
              onValueChange={(v) => {
                setPinEnabled(v);
                if (!v) updateSettings({ pin: null });
              }}
              trackColor={{ true: theme.green }}
            />
          </View>
          {pinEnabled ? (
            <>
              <TextInput
                style={[styles.input, { borderColor: theme.line, color: theme.text, backgroundColor: theme.paper }]}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Set 4-6 digit PIN"
                placeholderTextColor={theme.muted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.ink }]}
                onPress={() => {
                  if (pinInput.length < 4) { showToast('PIN must be at least 4 digits'); return; }
                  updateSettings({ pin: pinInput });
                  showToast('PIN saved');
                }}
              >
                <Text style={{ color: theme.paper, fontWeight: '600' }}>Save PIN</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Achievements 🏆</Text>
          <View style={styles.achGrid}>
            {ACHIEVEMENT_DEFS.map((a) => {
              const unlocked = checkAchievement(a.id, stats);
              return (
                <View key={a.id} style={[styles.badge, unlocked ? { backgroundColor: theme.gold } : { opacity: 0.5, borderColor: theme.line, borderWidth: 1 }]}>
                  <Text style={{ fontSize: 12, textAlign: 'center', color: unlocked ? theme.inkDeep : theme.text }}>
                    {unlocked ? '🏆' : '🔒'} {a.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card theme={theme}>
          <Text style={[styles.h, { color: theme.text }]}>Backup & export</Text>
          <TouchableOpacity style={[styles.btnGhost, { borderColor: theme.line }]} onPress={exportCsv}><Text style={{ color: theme.text }}>Export CSV</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { borderColor: theme.line }]} onPress={exportJson}><Text style={{ color: theme.text }}>Backup (JSON)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { borderColor: theme.line }]} onPress={importBackup}><Text style={{ color: theme.text }}>Restore backup</Text></TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnGhost, { borderColor: theme.red }]}
            onPress={() => Alert.alert('Erase all data?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Erase', style: 'destructive', onPress: wipeData },
            ])}
          >
            <Text style={{ color: theme.red }}>Erase all data</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </ThemedScreen>
  );
}

function computeAchievementStats(ledger) {
  const mk = monthKey(todayISO());
  const budget = ledger.settings.monthlyBudget;
  const spent = ledger.expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);
  const totalIncome = ledger.income.reduce((s, i) => s + i.amount, 0);
  const totalSpent = ledger.expenses.reduce((s, e) => s + e.amount, 0);
  const dates = [...new Set(ledger.expenses.map((e) => e.date))].sort();
  let streak = 0; let maxStreak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0 || (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000 === 1) streak++;
    else streak = 1;
    maxStreak = Math.max(maxStreak, streak);
  }
  return {
    monthBudgetOk: budget ? spent <= budget : false,
    totalSavings: totalIncome - totalSpent,
    streak: maxStreak,
    weekOk: true,
  };
}

function checkAchievement(id, stats) {
  if (id === 'budget_month') return stats.monthBudgetOk;
  if (id === 'saved_10k') return stats.totalSavings >= 10000;
  if (id === 'logged_week') return stats.streak >= 7;
  if (id === 'no_overspend_week') return stats.weekOk;
  return false;
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  note: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 16 },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  btnGhost: { padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginBottom: 10 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '47%', padding: 12, borderRadius: 10 },
});
