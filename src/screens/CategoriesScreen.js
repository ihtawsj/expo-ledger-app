import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';
import { ThemedScreen, ScreenHeader, Card, EmptyState } from '../components/ui';
import { fmtMoney, todayISO, monthKey, uid } from '../logic/utils';

export default function CategoriesScreen() {
  const { categories, expenses, settings, saveCategoryItem, removeCategory, showToast } = useLedger();
  const theme = getTheme(settings.darkMode);
  const mk = monthKey(todayISO());
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷');
  const [color, setColor] = useState('#4f8a6d');
  const [budget, setBudget] = useState('');

  const openNew = () => {
    setEditing(null);
    setName(''); setIcon('🏷'); setColor('#4f8a6d'); setBudget('');
    setModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setName(cat.name); setIcon(cat.icon); setColor(cat.color); setBudget(String(cat.budget || ''));
    setModal(true);
  };

  const save = async () => {
    if (!name.trim()) { showToast('Enter a category name'); return; }
    await saveCategoryItem({
      id: editing?.id || uid(),
      name: name.trim(),
      icon: icon || '🏷',
      color,
      budget: parseFloat(budget) || 0,
    });
    setModal(false);
    showToast('Category saved');
  };

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader
          title="Categories"
          subtitle="Organize spending"
          right={
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.ink }]} onPress={openNew}>
              <Text style={{ color: theme.paper, fontWeight: '600' }}>+ New</Text>
            </TouchableOpacity>
          }
        />
        <View style={styles.grid}>
          {categories.map((c) => {
            const spent = expenses.filter((e) => monthKey(e.date) === mk && e.category === c.name).reduce((s, e) => s + e.amount, 0);
            return (
              <TouchableOpacity key={c.id} style={[styles.tile, { backgroundColor: theme.paper2, borderColor: theme.line }]} onPress={() => openEdit(c)}>
                <View style={[styles.iconWrap, { backgroundColor: `${c.color}22` }]}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                </View>
                <Text style={[styles.catName, { color: theme.text }]}>{c.name}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{fmtMoney(spent, settings.currency)} this month</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.paper }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit category' : 'New category'}</Text>
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={icon} onChangeText={setIcon} placeholder="Icon emoji" placeholderTextColor={theme.muted} maxLength={2} />
            <TextInput style={[styles.input, { borderColor: theme.line, color: theme.text }]} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="Monthly budget (optional)" placeholderTextColor={theme.muted} />
            <View style={styles.modalActions}>
              {editing ? (
                <TouchableOpacity onPress={() => Alert.alert('Delete?', editing.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await removeCategory(editing.id); setModal(false); } }])}>
                  <Text style={{ color: theme.red }}>Delete</Text>
                </TouchableOpacity>
              ) : <View />}
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => setModal(false)}><Text style={{ color: theme.muted }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.ink }]} onPress={save}><Text style={{ color: theme.paper, fontWeight: '600' }}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  tile: { width: '47%', borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catName: { fontWeight: '600', marginBottom: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
