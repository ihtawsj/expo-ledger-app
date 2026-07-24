import { fmtMoney, monthKey, todayISO, daysInMonth, lastMonthKey, monthLabel } from './utils';

export function computeInsights(state) {
  const insights = [];
  const mk = monthKey(todayISO());
  const lastMk = lastMonthKey();
  const thisMonthExp = state.expenses.filter((e) => monthKey(e.date) === mk);
  const lastMonthExp = state.expenses.filter((e) => monthKey(e.date) === lastMk);

  const byCatThis = {};
  thisMonthExp.forEach((e) => { byCatThis[e.category] = (byCatThis[e.category] || 0) + e.amount; });
  const byCatLast = {};
  lastMonthExp.forEach((e) => { byCatLast[e.category] = (byCatLast[e.category] || 0) + e.amount; });

  Object.keys(byCatThis).forEach((cat) => {
    const prev = byCatLast[cat] || 0;
    if (prev > 0) {
      const change = ((byCatThis[cat] - prev) / prev) * 100;
      if (Math.abs(change) >= 15) {
        insights.push(`${cat} spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% compared to last month.`);
      }
    }
  });

  if (Object.keys(byCatThis).length) {
    const top = Object.keys(byCatThis).sort((a, b) => byCatThis[b] - byCatThis[a])[0];
    insights.push(`${top} is your highest expense category this month at ${fmtMoney(byCatThis[top], state.settings.currency)}.`);
  }

  const budget = state.settings.monthlyBudget;
  if (budget) {
    const spent = thisMonthExp.reduce((s, e) => s + e.amount, 0);
    const daysPassed = new Date().getDate();
    const dailyRate = spent / Math.max(1, daysPassed);
    const projectedTotal = dailyRate * daysInMonth(mk);
    if (projectedTotal > budget) {
      const daysUntilExceed = Math.max(0, Math.floor((budget - spent) / dailyRate));
      insights.push(`At your current pace, you're on track to exceed your monthly budget in about ${daysUntilExceed} day(s).`);
    } else {
      insights.push("You're on track to stay within budget this month if spending stays steady.");
    }
  }

  if (!insights.length) insights.push('Log a few more expenses so we can start surfacing patterns and personalized tips.');
  return insights;
}

export function answerFinanceQuery(q, state) {
  const text = q.toLowerCase();
  const mk = monthKey(todayISO());
  const lastMk = lastMonthKey();
  const monthWord = text.includes('last month') ? lastMk : mk;
  const currency = state.settings.currency;

  const catMatch = state.categories.find((c) => text.includes(c.name.toLowerCase()));
  if (catMatch) {
    const total = state.expenses
      .filter((e) => monthKey(e.date) === monthWord && e.category === catMatch.name)
      .reduce((s, e) => s + e.amount, 0);
    return `You spent ${fmtMoney(total, currency)} on ${catMatch.name} in ${monthLabel(monthWord)}.`;
  }
  if (text.includes('compare')) {
    const thisTotal = state.expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);
    const lastTotal = state.expenses.filter((e) => monthKey(e.date) === lastMk).reduce((s, e) => s + e.amount, 0);
    const diff = thisTotal - lastTotal;
    return `This month: ${fmtMoney(thisTotal, currency)}, last month: ${fmtMoney(lastTotal, currency)}. That's ${diff >= 0 ? '' : '−'}${fmtMoney(Math.abs(diff), currency)} ${diff >= 0 ? 'more' : 'less'} than last month.`;
  }
  if (text.includes('highest') || text.includes('most')) {
    const byCat = {};
    state.expenses.filter((e) => monthKey(e.date) === mk).forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const top = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])[0];
    return top ? `Your highest spending category this month is ${top} at ${fmtMoney(byCat[top], currency)}.` : 'No expenses logged this month yet.';
  }
  const total = state.expenses.filter((e) => monthKey(e.date) === monthWord).reduce((s, e) => s + e.amount, 0);
  return `You spent a total of ${fmtMoney(total, currency)} in ${monthLabel(monthWord)}. Try asking about a specific category, or say "compare this month with last month".`;
}
