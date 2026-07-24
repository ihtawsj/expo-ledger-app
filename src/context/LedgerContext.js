import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../db/database';
import { learnCategory } from '../logic/categorize';
import { uid, todayISO, monthKey, fmtMoney } from '../logic/utils';
import {
  initNotifications,
  checkBudgetAlerts,
  sendBudgetAlert,
  scheduleRecurringReminders,
} from '../notifications/notifications';

const LedgerContext = createContext(null);

export function LedgerProvider({ children }) {
  const [state, setState] = useState({
    expenses: [],
    income: [],
    categories: [],
    goals: [],
    recurring: [],
    merchantMap: {},
    goalContributions: [],
    settings: {
      currency: '₹',
      darkMode: false,
      monthlyBudget: 0,
      pin: null,
      alertedThresholds: {},
      notificationsBudget: true,
      notificationsRecurring: true,
    },
  });
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refresh = useCallback(async () => {
    const data = await db.loadAllData();
    setState(data);
    if (data.settings.pin) setLocked(true);
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      await initNotifications();
      const data = await refresh();
      await processRecurringInternal(data);
      await processAutoSaveInternal(data);
      await scheduleRecurringReminders(data.recurring, data.settings.notificationsRecurring !== false);
      setReady(true);
    })();
  }, [refresh]);

  const persistSettings = useCallback(async (settings) => {
    await db.saveSettings(settings);
    setState((s) => ({ ...s, settings }));
  }, []);

  const runBudgetCheck = useCallback(async (expenses, settings) => {
    const updated = checkBudgetAlerts(settings, expenses, async ({ title, body }) => {
      if (settings.notificationsBudget !== false) {
        await sendBudgetAlert(title, body, true);
      }
      showToast(body);
    });
    if (updated !== settings) {
      await db.saveSettings(updated);
      setState((s) => ({ ...s, settings: updated }));
    }
  }, [showToast]);

  async function processRecurringInternal(data) {
    const now = new Date();
    const mk = monthKey(todayISO());
    let added = 0;
    const recurring = [...data.recurring];

    for (const r of recurring) {
      if (r.lastAdded === mk) continue;
      if (now.getDate() >= r.day) {
        const date = `${mk}-${String(r.day).padStart(2, '0')}`;
        await db.saveExpense({
          id: uid(),
          amount: r.amount,
          category: r.category,
          description: `${r.name} (recurring)`,
          date,
          payment: 'Bank Transfer',
          location: '',
          notes: 'Auto-added recurring expense',
          photo: null,
        });
        r.lastAdded = mk;
        await db.saveRecurring(r);
        added++;
      }
    }
    if (added) {
      showToast(`${added} recurring expense${added > 1 ? 's' : ''} added for this month`);
      await refresh();
    }
  }

  const addExpense = useCallback(async (expense) => {
    const record = { id: expense.id || uid(), ...expense };
    await db.saveExpense(record);
    const merchantMap = learnCategory(record.description, record.category, state.merchantMap);
    await db.saveMerchantMap(merchantMap);
    const data = await db.loadAllData();
    setState(data);
    await runBudgetCheck(data.expenses, data.settings);
  }, [state.merchantMap, runBudgetCheck]);

  const updateExpense = useCallback(async (expense) => {
    await db.saveExpense(expense);
    const merchantMap = learnCategory(expense.description, expense.category, state.merchantMap);
    await db.saveMerchantMap(merchantMap);
    const data = await db.loadAllData();
    setState(data);
    await runBudgetCheck(data.expenses, data.settings);
  }, [state.merchantMap, runBudgetCheck]);

  const removeExpense = useCallback(async (id) => {
    await db.deleteExpense(id);
    await refresh();
  }, [refresh]);

  const addIncome = useCallback(async (entry) => {
    await db.saveIncome({ id: uid(), ...entry });
    await refresh();
  }, [refresh]);

  const removeIncome = useCallback(async (id) => {
    await db.deleteIncome(id);
    await refresh();
  }, [refresh]);

  const saveCategoryItem = useCallback(async (cat) => {
    await db.saveCategory({ id: cat.id || uid(), ...cat });
    await refresh();
  }, [refresh]);

  const removeCategory = useCallback(async (id) => {
    await db.deleteCategory(id);
    await refresh();
  }, [refresh]);

  const addGoal = useCallback(async (goal) => {
    await db.saveGoal({ id: uid(), current: 0, ...goal });
    await refresh();
  }, [refresh]);

  const updateGoal = useCallback(async (goal) => {
    await db.saveGoal(goal);
    await refresh();
  }, [refresh]);

  const removeGoal = useCallback(async (id) => {
    await db.deleteGoal(id);
    await refresh();
  }, [refresh]);

  const addGoalContribution = useCallback(async (contribution) => {
    await db.saveGoalContribution({ id: uid(), ...contribution });
    await refresh();
  }, [refresh]);

  const removeGoalContribution = useCallback(async (id) => {
    await db.deleteGoalContribution(id);
    await refresh();
  }, [refresh]);

  async function processAutoSaveInternal(data) {
    const mk = monthKey(todayISO());
    
    // Check if already processed this month
    const alreadyProcessed = await db.hasAutoSaveProcessed(mk);
    if (alreadyProcessed) return;

    // Only run auto-save if we're on the last day of the month
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() !== lastDayOfMonth) return;

    const budget = data.settings.monthlyBudget || 0;
    if (!budget) return;

    const monthExpenses = data.expenses.filter((e) => monthKey(e.date) === mk);
    const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const remaining = budget - monthTotal;

    if (remaining <= 0) {
      await db.logAutoSave(mk);
      return;
    }

    const priorityGoal = data.goals.find((g) => g.priority === 1);
    if (!priorityGoal) {
      await db.logAutoSave(mk);
      return;
    }

    let distributions = [];

    if (remaining <= 2000) {
      // Entire amount to #1 priority goal
      distributions.push({ goal: priorityGoal, amount: remaining });
    } else {
      // 60% to #1 priority goal
      const priorityAmount = remaining * 0.6;
      distributions.push({ goal: priorityGoal, amount: priorityAmount });

      // 40% divided evenly across other goals
      const otherGoals = data.goals.filter((g) => g.priority !== 1 && g.priority > 0);
      if (otherGoals.length > 0) {
        const otherAmount = remaining * 0.4;
        const perGoal = otherAmount / otherGoals.length;
        otherGoals.forEach((g) => {
          distributions.push({ goal: g, amount: perGoal });
        });
      }
    }

    // Apply distributions
    for (const dist of distributions) {
      await db.saveGoalContribution({
        id: uid(),
        goalId: dist.goal.id,
        amount: dist.amount,
        date: todayISO(),
        monthKey: mk,
      });
      await db.saveGoal({ ...dist.goal, current: dist.goal.current + dist.amount });
    }

    await db.logAutoSave(mk);
    showToast(`Auto-saved ${fmtMoney(remaining, data.settings.currency)} to goals`);
  }

  const addRecurring = useCallback(async (rec) => {
    await db.saveRecurring({ id: uid(), lastAdded: null, ...rec });
    const data = await refresh();
    await scheduleRecurringReminders(data.recurring, data.settings.notificationsRecurring !== false);
  }, [refresh]);

  const removeRecurring = useCallback(async (id) => {
    await db.deleteRecurring(id);
    const data = await refresh();
    await scheduleRecurringReminders(data.recurring, data.settings.notificationsRecurring !== false);
  }, [refresh]);

  const updateSettings = useCallback(async (patch) => {
    const settings = { ...state.settings, ...patch };
    await persistSettings(settings);
    if ('pin' in patch) setLocked(!!settings.pin);
    if ('notificationsRecurring' in patch) {
      const data = await db.loadAllData();
      await scheduleRecurringReminders(data.recurring, settings.notificationsRecurring !== false);
    }
  }, [state.settings, persistSettings]);

  const unlock = useCallback((pin) => {
    if (pin === state.settings.pin) {
      setLocked(false);
      return true;
    }
    return false;
  }, [state.settings.pin]);

  const wipeData = useCallback(async () => {
    await db.wipeAllData();
    setLocked(false);
    await refresh();
  }, [refresh]);

  const restoreBackup = useCallback(async (data) => {
    await db.restoreBackup(data);
    await refresh();
  }, [refresh]);

  const catByName = useCallback((name) => state.categories.find((c) => c.name.toLowerCase() === String(name).toLowerCase()), [state.categories]);

  const value = useMemo(() => ({
    ...state,
    ready,
    locked,
    toast,
    showToast,
    refresh,
    addExpense,
    updateExpense,
    removeExpense,
    addIncome,
    removeIncome,
    saveCategoryItem,
    removeCategory,
    addGoal,
    updateGoal,
    removeGoal,
    addGoalContribution,
    removeGoalContribution,
    addRecurring,
    removeRecurring,
    updateSettings,
    unlock,
    wipeData,
    restoreBackup,
    catByName,
    setLocked,
  }), [
    state, ready, locked, toast, showToast, refresh,
    addExpense, updateExpense, removeExpense, addIncome, removeIncome,
    saveCategoryItem, removeCategory, addGoal, updateGoal, removeGoal,
    addGoalContribution, removeGoalContribution,
    addRecurring, removeRecurring, updateSettings, unlock, wipeData,
    restoreBackup, catByName,
  ]);

  return (
    <LedgerContext.Provider value={value}>
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedger must be used within LedgerProvider');
  return ctx;
}
