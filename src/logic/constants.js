export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#D9A441' },
  { name: 'Groceries', icon: '🛒', color: '#3F7D5C' },
  { name: 'Travel', icon: '🚕', color: '#4C7EA8' },
  { name: 'Fuel', icon: '⛽', color: '#8A5A44' },
  { name: 'Rent', icon: '🏠', color: '#7C5C9C' },
  { name: 'Bills', icon: '⚡', color: '#C1543C' },
  { name: 'Entertainment', icon: '🎬', color: '#B9457A' },
  { name: 'Shopping', icon: '🛍', color: '#3F7D5C' },
  { name: 'Health', icon: '💊', color: '#3F8AA8' },
  { name: 'Education', icon: '📚', color: '#6B5B95' },
  { name: 'Pets', icon: '🐾', color: '#A87A3F' },
  { name: 'Gifts', icon: '🎁', color: '#C1543C' },
  { name: 'Subscriptions', icon: '📱', color: '#4C7EA8' },
  { name: 'Work', icon: '💼', color: '#3F7D5C' },
  { name: 'Others', icon: '📦', color: '#6B7A76' },
];

export const MERCHANT_RULES = {
  zomato: 'Food', swiggy: 'Food', dominos: 'Food', mcdonald: 'Food', kfc: 'Food', starbucks: 'Food',
  uber: 'Travel', ola: 'Travel', rapido: 'Travel', irctc: 'Travel',
  amazon: 'Shopping', flipkart: 'Shopping', myntra: 'Shopping', ajio: 'Shopping',
  apollo: 'Health', pharmeasy: 'Health', netmeds: 'Health', '1mg': 'Health',
  netflix: 'Subscriptions', spotify: 'Subscriptions', hotstar: 'Subscriptions', prime: 'Subscriptions', youtube: 'Subscriptions',
  petrol: 'Fuel', diesel: 'Fuel', 'hp petrol': 'Fuel', 'indian oil': 'Fuel', bpcl: 'Fuel',
  electricity: 'Bills', broadband: 'Bills', wifi: 'Bills', recharge: 'Bills', jio: 'Bills', airtel: 'Bills',
  bigbasket: 'Groceries', dmart: 'Groceries', grofers: 'Groceries', blinkit: 'Groceries', zepto: 'Groceries',
};

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Wallet'];

export const INCOME_SOURCES = ['Salary', 'Freelance', 'Gift', 'Other'];

export const ACHIEVEMENT_DEFS = [
  { id: 'budget_month', label: 'Stayed within budget this month' },
  { id: 'saved_10k', label: 'Saved ₹10,000 total' },
  { id: 'logged_week', label: 'Logged expenses 7 days running' },
  { id: 'no_overspend_week', label: '7 days without overspending daily allowance' },
];
