export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtMoney(n, currency = '₹') {
  const val = Number(n || 0);
  return currency + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function monthKey(dateStr) {
  return (dateStr || todayISO()).slice(0, 7);
}

export function monthLabel(mk) {
  const [y, m] = mk.split('-');
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function daysInMonth(mk) {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function lastMonthKey(fromDate = todayISO()) {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() - 1);
  return monthKey(d.toISOString().slice(0, 10));
}
