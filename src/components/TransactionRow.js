import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { fmtMoney } from '../logic/utils';

export function TransactionRow({ item, onEdit, onDelete, income }) {
  const { settings, catByName } = useLedger();
  const theme = getTheme(settings.darkMode);
  const cat = income ? null : catByName(item.category) || { icon: '📦', color: '#999' };

  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <View style={[styles.icon, { backgroundColor: income ? `${theme.green}22` : `${cat.color}22` }]}>
        <Text style={styles.iconText}>{income ? '💵' : cat.icon}</Text>
      </View>
      <View style={styles.main}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {income ? item.source : (item.description || item.category)}
        </Text>
        <Text style={[styles.sub, { color: theme.muted }]} numberOfLines={1}>
          {item.date}{income ? (item.notes ? ` · ${item.notes}` : '') : ` · ${item.category} · ${item.payment}`}
        </Text>
      </View>
      <Text style={[styles.amount, { color: income ? theme.green : theme.text }]}>
        {income ? '+' : '-'}{fmtMoney(item.amount, settings.currency)}
      </Text>
      <View style={styles.actions}>
        {!income && onEdit ? (
          <TouchableOpacity onPress={() => onEdit(item)} hitSlop={8}>
            <Text style={styles.actionBtn}>✏️</Text>
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity
            onPress={() => Alert.alert('Delete?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ])}
            hitSlop={8}
          >
            <Text style={styles.actionBtn}>🗑</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  main: { flex: 1, minWidth: 0 },
  title: { fontWeight: '600', fontSize: 15 },
  sub: { fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { fontSize: 16, padding: 4 },
});
