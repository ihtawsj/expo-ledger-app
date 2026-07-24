import React from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, EmptyState } from '../components/ui';
import { fmtMoney } from '../logic/utils';

export default function GalleryScreen({ navigation }) {
  const { expenses, settings } = useLedger();
  const theme = getTheme(settings.darkMode);
  const withPhotos = expenses.filter((e) => e.photo).sort((a, b) => b.date.localeCompare(a.date));
  const width = (Dimensions.get('window').width - 52) / 2;

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title="Receipt gallery" subtitle="Scanned & uploaded receipts" />
        {withPhotos.length ? (
          <View style={styles.grid}>
            {withPhotos.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.item, { width, borderColor: theme.line, backgroundColor: theme.paper2 }]}
                onPress={() => navigation.getParent()?.navigate('AddExpense', { expense: e })}
              >
                <Image source={{ uri: e.photo }} style={styles.img} />
                <Text style={[styles.cap, { color: theme.muted }]} numberOfLines={2}>
                  {e.description || e.category} · {fmtMoney(e.amount, settings.currency)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState theme={theme} text="No receipt photos yet. Add one from Add Expense." />
        )}
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  item: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  img: { width: '100%', height: 120 },
  cap: { padding: 8, fontSize: 11 },
});
