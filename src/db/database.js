import * as SQLite from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../logic/constants';
import { uid } from '../logic/utils';
import { savePhoto, deletePhoto, isFilePath } from '../logic/photoUtils';

let db = null;

const DEFAULT_SETTINGS = {
  currency: '₹',
  darkMode: false,
  monthlyBudget: 0,
  pin: null,
  alertedThresholds: {},
  notificationsBudget: true,
  notificationsRecurring: true,
};

export async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('ledger.db');
  await initSchema(db);
  return db;
}

async function initSchema(database) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      payment TEXT,
      location TEXT,
      notes TEXT,
      photo TEXT
    );
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      source TEXT,
      date TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      budget REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL DEFAULT 0,
      target_date TEXT
    );
    CREATE TABLE IF NOT EXISTS recurring (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      day INTEGER DEFAULT 1,
      last_added TEXT
    );
    CREATE TABLE IF NOT EXISTS merchant_map (
      key TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );
  `);

  const catCount = await database.getFirstAsync('SELECT COUNT(*) as c FROM categories');
  if (!catCount?.c) {
    for (const c of DEFAULT_CATEGORIES) {
      await database.runAsync(
        'INSERT INTO categories (id, name, icon, color, budget) VALUES (?, ?, ?, ?, 0)',
        [uid(), c.name, c.icon, c.color],
      );
    }
  }

  const settingsRow = await database.getFirstAsync('SELECT data FROM settings WHERE id = 1');
  if (!settingsRow) {
    await database.runAsync('INSERT INTO settings (id, data) VALUES (1, ?)', [JSON.stringify(DEFAULT_SETTINGS)]);
  }

  // Migrate existing base64 photos to file paths
  await migratePhotosToFiles(database);
}

async function migratePhotosToFiles(database) {
  const expenses = await database.getAllAsync('SELECT id, photo FROM expenses WHERE photo IS NOT NULL');
  
  for (const expense of expenses) {
    if (expense.photo && !isFilePath(expense.photo)) {
      try {
        const filePath = await savePhoto(expense.photo, expense.id);
        await database.runAsync('UPDATE expenses SET photo = ? WHERE id = ?', [filePath, expense.id]);
      } catch (error) {
        console.error(`Failed to migrate photo for expense ${expense.id}:`, error);
      }
    }
  }
}

export async function loadAllData() {
  const database = await getDatabase();
  const [expenses, income, categories, goals, recurring, merchantRows, settingsRow] = await Promise.all([
    database.getAllAsync('SELECT * FROM expenses ORDER BY date DESC'),
    database.getAllAsync('SELECT * FROM income ORDER BY date DESC'),
    database.getAllAsync('SELECT * FROM categories ORDER BY name ASC'),
    database.getAllAsync('SELECT id, name, target, current, target_date as date FROM goals'),
    database.getAllAsync('SELECT id, name, amount, category, day, last_added as lastAdded FROM recurring'),
    database.getAllAsync('SELECT key, category FROM merchant_map'),
    database.getFirstAsync('SELECT data FROM settings WHERE id = 1'),
  ]);

  const merchantMap = {};
  merchantRows.forEach((r) => { merchantMap[r.key] = r.category; });

  let settings = DEFAULT_SETTINGS;
  try {
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRow?.data || '{}') };
  } catch {
    settings = DEFAULT_SETTINGS;
  }

  return {
    expenses: expenses.map(mapExpense),
    income,
    categories: categories.map((c) => ({ ...c, budget: c.budget || 0 })),
    goals,
    recurring,
    merchantMap,
    settings,
  };
}

function mapExpense(row) {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    description: row.description || '',
    date: row.date,
    payment: row.payment || 'Cash',
    location: row.location || '',
    notes: row.notes || '',
    photo: row.photo || null,
  };
}

export async function saveExpense(expense) {
  const database = await getDatabase();
  
  // Handle photo: compress and save as file if it's a new base64 photo
  let photoPath = expense.photo;
  if (expense.photo && !isFilePath(expense.photo)) {
    photoPath = await savePhoto(expense.photo, expense.id);
  }
  
  await database.runAsync(
    `INSERT OR REPLACE INTO expenses (id, amount, category, description, date, payment, location, notes, photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [expense.id, expense.amount, expense.category, expense.description, expense.date, expense.payment, expense.location, expense.notes, photoPath],
  );
}

export async function deleteExpense(id) {
  const database = await getDatabase();
  
  // Get photo path before deleting
  const expense = await database.getFirstAsync('SELECT photo FROM expenses WHERE id = ?', [id]);
  if (expense?.photo && isFilePath(expense.photo)) {
    await deletePhoto(expense.photo);
  }
  
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

export async function saveIncome(entry) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO income (id, amount, source, date, notes) VALUES (?, ?, ?, ?, ?)',
    [entry.id, entry.amount, entry.source, entry.date, entry.notes || ''],
  );
}

export async function deleteIncome(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM income WHERE id = ?', [id]);
}

export async function saveCategory(cat) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO categories (id, name, icon, color, budget) VALUES (?, ?, ?, ?, ?)',
    [cat.id, cat.name, cat.icon, cat.color, cat.budget || 0],
  );
}

export async function deleteCategory(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function saveGoal(goal) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO goals (id, name, target, current, target_date) VALUES (?, ?, ?, ?, ?)',
    [goal.id, goal.name, goal.target, goal.current || 0, goal.date || ''],
  );
}

export async function deleteGoal(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}

export async function saveRecurring(rec) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO recurring (id, name, amount, category, day, last_added) VALUES (?, ?, ?, ?, ?, ?)',
    [rec.id, rec.name, rec.amount, rec.category, rec.day, rec.lastAdded || null],
  );
}

export async function deleteRecurring(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM recurring WHERE id = ?', [id]);
}

export async function saveMerchantMap(merchantMap) {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM merchant_map');
  for (const [key, category] of Object.entries(merchantMap)) {
    await database.runAsync('INSERT INTO merchant_map (key, category) VALUES (?, ?)', [key, category]);
  }
}

export async function saveSettings(settings) {
  const database = await getDatabase();
  await database.runAsync('INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)', [JSON.stringify(settings)]);
}

export async function wipeAllData() {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM expenses;
    DELETE FROM income;
    DELETE FROM goals;
    DELETE FROM recurring;
    DELETE FROM merchant_map;
    DELETE FROM categories;
    DELETE FROM settings;
  `);
  await initSchema(database);
}

export async function restoreBackup(data) {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM expenses;
    DELETE FROM income;
    DELETE FROM goals;
    DELETE FROM recurring;
    DELETE FROM merchant_map;
    DELETE FROM categories;
    DELETE FROM settings;
  `);

  for (const e of data.expenses || []) await saveExpense(mapExpense(e));
  for (const i of data.income || []) await saveIncome(i);
  for (const c of data.categories || []) await saveCategory({ ...c, budget: c.budget || 0 });
  for (const g of data.goals || []) await saveGoal(g);
  for (const r of data.recurring || []) await saveRecurring({ ...r, lastAdded: r.lastAdded || r.last_added || null });
  if (data.merchantMap) await saveMerchantMap(data.merchantMap);
  if (data.settings) await saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  else await initSchema(database);
}
