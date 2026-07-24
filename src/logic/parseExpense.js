import { suggestCategory } from './categorize';
import { todayISO } from './utils';

export function parseReceiptText(text, merchantMap, categories) {
  const amountMatch = text.match(/(?:total|amount|grand total|rs\.?|₹|inr)\s*[:\-]?\s*([\d,]+\.?\d{0,2})/i)
    || text.match(/([\d,]+\.\d{2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : '';
  const dateMatch = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  let date = todayISO();
  if (dateMatch) {
    const parts = dateMatch[1].split(/[\/\-.]/);
    if (parts[2] && parts[2].length === 4) {
      date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  const firstLine = text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
  const category = suggestCategory(text, merchantMap, categories);
  return {
    shop: firstLine.slice(0, 40),
    amount: amount ? String(amount) : '',
    date,
    category,
  };
}

export function parseVoiceText(text, merchantMap, categories) {
  const t = text.toLowerCase();
  const amountMatch = t.match(/(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? String(parseFloat(amountMatch[1])) : '';
  let date = todayISO();
  if (t.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().slice(0, 10);
  }
  const category = suggestCategory(t, merchantMap, categories);
  const description = text.replace(/^(spent|paid|bought)\s*/i, '').trim();
  return { amount, date, category, description };
}
