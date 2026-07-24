import { MERCHANT_RULES } from './constants';

export function suggestCategory(text, merchantMap = {}, categories = []) {
  const t = (text || '').toLowerCase();
  for (const key in merchantMap) {
    if (t.includes(key)) return merchantMap[key];
  }
  for (const key in MERCHANT_RULES) {
    if (t.includes(key)) return MERCHANT_RULES[key];
  }
  if (/lunch|dinner|breakfast|coffee|tea|restaurant|food/.test(t)) return 'Food';
  if (/medicine|doctor|hospital|clinic/.test(t)) return 'Health';
  if (/movie|cinema|game/.test(t)) return 'Entertainment';
  if (/rent/.test(t)) return 'Rent';
  if (/fuel|petrol|diesel/.test(t)) return 'Fuel';
  const names = categories.map((c) => c.name);
  if (names.includes('Others')) return 'Others';
  return categories[0]?.name || 'Others';
}

export function learnCategory(description, category, merchantMap) {
  const t = (description || '').toLowerCase().trim();
  if (!t) return merchantMap;
  const firstWord = t.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    return { ...merchantMap, [firstWord]: category };
  }
  return merchantMap;
}
