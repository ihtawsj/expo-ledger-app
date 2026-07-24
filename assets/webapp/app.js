/* =========================================================
   LEDGER — Smart Expense Tracker
   Single-file app logic. All data stored in localStorage.
   ========================================================= */

const DEFAULT_CATEGORIES = [
  {name:"Food", icon:"🍔", color:"#D9A441"},
  {name:"Groceries", icon:"🛒", color:"#3F7D5C"},
  {name:"Travel", icon:"🚕", color:"#4C7EA8"},
  {name:"Fuel", icon:"⛽", color:"#8A5A44"},
  {name:"Rent", icon:"🏠", color:"#7C5C9C"},
  {name:"Bills", icon:"⚡", color:"#C1543C"},
  {name:"Entertainment", icon:"🎬", color:"#B9457A"},
  {name:"Shopping", icon:"🛍", color:"#3F7D5C"},
  {name:"Health", icon:"💊", color:"#3F8AA8"},
  {name:"Education", icon:"📚", color:"#6B5B95"},
  {name:"Pets", icon:"🐾", color:"#A87A3F"},
  {name:"Gifts", icon:"🎁", color:"#C1543C"},
  {name:"Subscriptions", icon:"📱", color:"#4C7EA8"},
  {name:"Work", icon:"💼", color:"#3F7D5C"},
  {name:"Others", icon:"📦", color:"#6B7A76"},
];

const MERCHANT_RULES = {
  "zomato":"Food","swiggy":"Food","dominos":"Food","mcdonald":"Food","kfc":"Food","starbucks":"Food",
  "uber":"Travel","ola":"Travel","rapido":"Travel","irctc":"Travel",
  "amazon":"Shopping","flipkart":"Shopping","myntra":"Shopping","ajio":"Shopping",
  "apollo":"Health","pharmeasy":"Health","netmeds":"Health","1mg":"Health",
  "netflix":"Subscriptions","spotify":"Subscriptions","hotstar":"Subscriptions","prime":"Subscriptions","youtube":"Subscriptions",
  "petrol":"Fuel","diesel":"Fuel","hp petrol":"Fuel","indian oil":"Fuel","bpcl":"Fuel",
  "electricity":"Bills","broadband":"Bills","wifi":"Bills","recharge":"Bills","jio":"Bills","airtel":"Bills",
  "bigbasket":"Groceries","dmart":"Groceries","grofers":"Groceries","blinkit":"Groceries","zepto":"Groceries",
};

const ACHIEVEMENT_DEFS = [
  {id:"budget_month", label:"Stayed within budget this month", check: s => s.monthBudgetOk},
  {id:"saved_10k", label:"Saved ₹10,000 total", check: s => s.totalSavings >= 10000},
  {id:"logged_week", label:"Logged expenses 7 days running", check: s => s.streak >= 7},
  {id:"no_overspend_week", label:"7 days without overspending daily allowance", check: s => s.weekOk},
];

const CURRENCY_KEY = "ledger_settings";

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtMoney(n){
  const cur = state.settings.currency || "₹";
  const val = Number(n||0);
  return cur + val.toLocaleString('en-IN', {maximumFractionDigits:0});
}
function monthKey(dateStr){ return (dateStr||todayISO()).slice(0,7); }
function monthLabel(mk){
  const [y,m] = mk.split("-");
  return new Date(y, m-1, 1).toLocaleString('en-US',{month:'long', year:'numeric'});
}
function daysInMonth(mk){
  const [y,m]=mk.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/* ---------------- STATE ---------------- */
let state = {
  expenses: [],
  income: [],
  categories: [],
  goals: [],
  recurring: [],
  merchantMap: {},
  settings: {currency:"₹", darkMode:false, monthlyBudget:0, pin:null, alertedThresholds:{}},
};

function loadState(){
  try{
    state.expenses = JSON.parse(localStorage.getItem("ledger_expenses")||"[]");
    state.income = JSON.parse(localStorage.getItem("ledger_income")||"[]");
    state.categories = JSON.parse(localStorage.getItem("ledger_categories")||"null") || DEFAULT_CATEGORIES.map(c=>({id:uid(),...c,budget:0}));
    state.goals = JSON.parse(localStorage.getItem("ledger_goals")||"[]");
    state.recurring = JSON.parse(localStorage.getItem("ledger_recurring")||"[]");
    state.merchantMap = JSON.parse(localStorage.getItem("ledger_merchantmap")||"{}");
    state.settings = JSON.parse(localStorage.getItem(CURRENCY_KEY)||"null") || state.settings;
  }catch(e){ console.error("Failed to load state", e); }
  saveAll();
}
function saveAll(){
  localStorage.setItem("ledger_expenses", JSON.stringify(state.expenses));
  localStorage.setItem("ledger_income", JSON.stringify(state.income));
  localStorage.setItem("ledger_categories", JSON.stringify(state.categories));
  localStorage.setItem("ledger_goals", JSON.stringify(state.goals));
  localStorage.setItem("ledger_recurring", JSON.stringify(state.recurring));
  localStorage.setItem("ledger_merchantmap", JSON.stringify(state.merchantMap));
  localStorage.setItem(CURRENCY_KEY, JSON.stringify(state.settings));
}
function catById(id){ return state.categories.find(c=>c.id===id); }
function catByName(name){ return state.categories.find(c=>c.name.toLowerCase()===String(name).toLowerCase()); }

/* ---------------- TOASTS ---------------- */
function toast(msg, {alert=false, action=null}={}){
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast" + (alert?" alert":"");
  el.innerHTML = `<span>${msg}</span>`;
  if(action){
    const btn = document.createElement("button");
    btn.textContent = action.label;
    btn.onclick = () => { action.fn(); el.remove(); };
    el.appendChild(btn);
  }
  host.appendChild(el);
  setTimeout(()=>el.remove(), action?7000:4500);
}

/* ---------------- SMART CATEGORIZATION ---------------- */
function suggestCategory(text){
  const t = (text||"").toLowerCase();
  for(const key in state.merchantMap){
    if(t.includes(key)) return state.merchantMap[key];
  }
  for(const key in MERCHANT_RULES){
    if(t.includes(key)) return MERCHANT_RULES[key];
  }
  if(/lunch|dinner|breakfast|coffee|tea|restaurant|food/.test(t)) return "Food";
  if(/medicine|doctor|hospital|clinic/.test(t)) return "Health";
  if(/movie|cinema|game/.test(t)) return "Entertainment";
  if(/rent/.test(t)) return "Rent";
  if(/fuel|petrol|diesel/.test(t)) return "Fuel";
  return "Others";
}
function learnCategory(description, category){
  const t = (description||"").toLowerCase().trim();
  if(!t) return;
  const firstWord = t.split(/\s+/)[0];
  if(firstWord.length >= 3) state.merchantMap[firstWord] = category;
}

/* ---------------- NAVIGATION ---------------- */
function initNav(){
  document.querySelectorAll("#navList li").forEach(li=>{
    li.addEventListener("click", ()=> switchTab(li.dataset.tab));
  });
  document.querySelectorAll("[data-tab-link]").forEach(a=>{
    a.addEventListener("click", ()=> switchTab(a.dataset.tabLink));
  });
}
function switchTab(tab){
  document.querySelectorAll("#navList li").forEach(li=> li.classList.toggle("active", li.dataset.tab===tab));
  document.querySelectorAll(".tab").forEach(sec=> sec.classList.toggle("active", sec.id === "tab-"+tab));
  renderAll();
}

/* ---------------- MODALS ---------------- */
function openModal(id){ document.getElementById(id).classList.remove("hidden"); }
function closeModal(id){ document.getElementById(id).classList.add("hidden"); }
function initModalClosers(){
  document.querySelectorAll("[data-close]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const backdrop = e.target.closest(".modal-backdrop");
      backdrop.classList.add("hidden");
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(bd=>{
    bd.addEventListener("click", (e)=>{ if(e.target === bd) bd.classList.add("hidden"); });
  });
}

/* ---------------- CATEGORY SELECTS ---------------- */
function fillCategorySelect(selectEl, includeAll=false){
  selectEl.innerHTML = "";
  if(includeAll){
    const o = document.createElement("option"); o.value=""; o.textContent="All categories"; selectEl.appendChild(o);
  }
  state.categories.forEach(c=>{
    const o = document.createElement("option");
    o.value = c.name; o.textContent = `${c.icon} ${c.name}`;
    selectEl.appendChild(o);
  });
}

/* ---------------- EXPENSE CRUD ---------------- */
function openExpenseModal(expense=null){
  document.getElementById("expenseModalTitle").textContent = expense ? "Edit expense" : "Add expense";
  fillCategorySelect(document.getElementById("expCategory"));
  document.getElementById("expenseId").value = expense ? expense.id : "";
  document.getElementById("expAmount").value = expense ? expense.amount : "";
  document.getElementById("expCategory").value = expense ? expense.category : suggestCategory("");
  document.getElementById("expDescription").value = expense ? expense.description : "";
  document.getElementById("expDate").value = expense ? expense.date : todayISO();
  document.getElementById("expPayment").value = expense ? expense.payment : "Cash";
  document.getElementById("expLocation").value = expense ? (expense.location||"") : "";
  document.getElementById("expNotes").value = expense ? (expense.notes||"") : "";
  document.getElementById("expPhoto").value = "";
  const preview = document.getElementById("expPhotoPreview");
  if(expense && expense.photo){ preview.src = expense.photo; preview.classList.remove("hidden"); } else { preview.classList.add("hidden"); }
  openModal("expenseModalBackdrop");
}
function saveExpenseFromModal(){
  const id = document.getElementById("expenseId").value || uid();
  const amount = parseFloat(document.getElementById("expAmount").value);
  if(!amount || amount <= 0){ toast("Enter a valid amount"); return; }
  const category = document.getElementById("expCategory").value;
  const description = document.getElementById("expDescription").value;
  const date = document.getElementById("expDate").value || todayISO();
  const payment = document.getElementById("expPayment").value;
  const location = document.getElementById("expLocation").value;
  const notes = document.getElementById("expNotes").value;
  const photoFile = document.getElementById("expPhoto").files[0];
  const existing = state.expenses.find(e=>e.id===id);

  const finalize = (photoData) => {
    const record = {id, amount, category, description, date, payment, location, notes, photo: photoData};
    if(existing){ Object.assign(existing, record); }
    else { state.expenses.push(record); }
    learnCategory(description, category);
    saveAll();
    closeModal("expenseModalBackdrop");
    checkBudgetAlerts();
    renderAll();
    toast(existing ? "Expense updated" : "Expense added");
  };
  if(photoFile){
    const reader = new FileReader();
    reader.onload = () => finalize(reader.result);
    reader.readAsDataURL(photoFile);
  } else {
    finalize(existing ? existing.photo : null);
  }
}
function deleteExpense(id){
  const idx = state.expenses.findIndex(e=>e.id===id);
  if(idx<0) return;
  const removed = state.expenses[idx];
  state.expenses.splice(idx,1);
  saveAll(); renderAll();
  toast("Expense deleted", {action:{label:"Undo", fn:()=>{ state.expenses.splice(idx,0,removed); saveAll(); renderAll(); }}});
}

/* ---------------- BUDGET ALERTS ---------------- */
function checkBudgetAlerts(){
  const mk = monthKey(todayISO());
  const budget = state.settings.monthlyBudget;
  if(!budget) return;
  const spent = state.expenses.filter(e=>monthKey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
  const pct = spent/budget*100;
  state.settings.alertedThresholds[mk] = state.settings.alertedThresholds[mk] || [];
  const already = state.settings.alertedThresholds[mk];
  const thresholds = [[100,"Budget exceeded! 🚨",true],[90,"You've used 90% of your monthly budget",true],[75,"You've used 75% of your monthly budget",false],[50,"You've used 50% of your monthly budget",false]];
  for(const [th,msg,isAlert] of thresholds){
    if(pct>=th && !already.includes(th)){
      toast(msg, {alert:isAlert});
      already.push(th);
      break;
    }
  }
  saveAll();
}

/* ---------------- INCOME ---------------- */
function saveIncomeFromModal(){
  const amount = parseFloat(document.getElementById("incAmount").value);
  if(!amount||amount<=0){ toast("Enter a valid amount"); return; }
  state.income.push({id:uid(), amount, source:document.getElementById("incSource").value, date:document.getElementById("incDate").value||todayISO(), notes:document.getElementById("incNotes").value});
  saveAll(); closeModal("incomeModalBackdrop"); renderAll(); toast("Income added");
}
function deleteIncome(id){
  state.income = state.income.filter(i=>i.id!==id);
  saveAll(); renderAll();
}

/* ---------------- CATEGORIES ---------------- */
function openCategoryModal(cat=null){
  document.getElementById("categoryModalTitle").textContent = cat ? "Edit category" : "New category";
  document.getElementById("categoryId").value = cat ? cat.id : "";
  document.getElementById("categoryName").value = cat ? cat.name : "";
  document.getElementById("categoryIcon").value = cat ? cat.icon : "🏷";
  document.getElementById("categoryColor").value = cat ? cat.color : "#4f8a6d";
  document.getElementById("categoryBudget").value = cat ? (cat.budget||"") : "";
  document.getElementById("deleteCategoryBtn").classList.toggle("hidden", !cat);
  openModal("categoryModalBackdrop");
}
function saveCategoryFromModal(){
  const id = document.getElementById("categoryId").value || uid();
  const name = document.getElementById("categoryName").value.trim();
  if(!name){ toast("Enter a category name"); return; }
  const icon = document.getElementById("categoryIcon").value || "🏷";
  const color = document.getElementById("categoryColor").value;
  const budget = parseFloat(document.getElementById("categoryBudget").value)||0;
  const existing = catById(id);
  if(existing){ Object.assign(existing, {name,icon,color,budget}); }
  else { state.categories.push({id,name,icon,color,budget}); }
  saveAll(); closeModal("categoryModalBackdrop"); renderAll(); toast("Category saved");
}
function deleteCategory(){
  const id = document.getElementById("categoryId").value;
  if(!id) return;
  state.categories = state.categories.filter(c=>c.id!==id);
  saveAll(); closeModal("categoryModalBackdrop"); renderAll(); toast("Category deleted");
}

/* ---------------- GOALS ---------------- */
function saveGoalFromModal(){
  const name = document.getElementById("goalName").value.trim();
  const target = parseFloat(document.getElementById("goalTarget").value);
  if(!name || !target){ toast("Enter goal name and target"); return; }
  const current = parseFloat(document.getElementById("goalCurrent").value)||0;
  const date = document.getElementById("goalDate").value||"";
  state.goals.push({id:uid(), name, target, current, date});
  saveAll(); closeModal("goalModalBackdrop"); renderAll(); toast("Goal created");
}
function updateGoalProgress(id, delta){
  const g = state.goals.find(x=>x.id===id);
  if(!g) return;
  g.current = Math.max(0, g.current + delta);
  saveAll(); renderAll();
}
function deleteGoal(id){ state.goals = state.goals.filter(g=>g.id!==id); saveAll(); renderAll(); }

/* ---------------- RECURRING ---------------- */
function saveRecurringFromModal(){
  const name = document.getElementById("recName").value.trim();
  const amount = parseFloat(document.getElementById("recAmount").value);
  if(!name||!amount){ toast("Enter name and amount"); return; }
  const category = document.getElementById("recCategory").value;
  const day = parseInt(document.getElementById("recDay").value)||1;
  state.recurring.push({id:uid(), name, amount, category, day, lastAdded:null});
  saveAll(); closeModal("recurringModalBackdrop"); renderAll(); toast("Recurring expense added");
}
function deleteRecurring(id){ state.recurring = state.recurring.filter(r=>r.id!==id); saveAll(); renderAll(); }
function processRecurring(){
  const now = new Date();
  const mk = monthKey(todayISO());
  let added = 0;
  state.recurring.forEach(r=>{
    if(r.lastAdded === mk) return;
    if(now.getDate() >= r.day){
      const date = `${mk}-${String(r.day).padStart(2,'0')}`;
      state.expenses.push({id:uid(), amount:r.amount, category:r.category, description:r.name+" (recurring)", date, payment:"Bank Transfer", location:"", notes:"Auto-added recurring expense", photo:null});
      r.lastAdded = mk;
      added++;
    }
  });
  if(added){ saveAll(); toast(`${added} recurring expense${added>1?'s':''} added for this month`); }
}

/* ---------------- RENDER: DASHBOARD ---------------- */
let chartRefs = {};
function destroyChart(key){ if(chartRefs[key]){ chartRefs[key].destroy(); delete chartRefs[key]; } }

function renderDashboard(){
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const mk = monthKey(todayISO());
  const lastMk = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return monthKey(d.toISOString().slice(0,10)); })();
  const monthExpenses = state.expenses.filter(e=>monthKey(e.date)===mk);
  const monthTotal = monthExpenses.reduce((s,e)=>s+e.amount,0);
  const lastMonthTotal = state.expenses.filter(e=>monthKey(e.date)===lastMk).reduce((s,e)=>s+e.amount,0);
  const todayTotal = state.expenses.filter(e=>e.date===todayISO()).reduce((s,e)=>s+e.amount,0);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekTotal = state.expenses.filter(e=> new Date(e.date) >= weekAgo).reduce((s,e)=>s+e.amount,0);

  const monthIncome = state.income.filter(i=>monthKey(i.date)===mk).reduce((s,i)=>s+i.amount,0);
  const savings = monthIncome - monthTotal;

  document.getElementById("statMonthSpent").textContent = fmtMoney(monthTotal);
  document.getElementById("statRemaining").textContent = fmtMoney(Math.max(0,(state.settings.monthlyBudget||0)-monthTotal));
  document.getElementById("statToday").textContent = fmtMoney(todayTotal);
  document.getElementById("statWeek").textContent = fmtMoney(weekTotal);
  document.getElementById("statLastMonth").textContent = fmtMoney(lastMonthTotal);
  document.getElementById("statSavings").textContent = fmtMoney(savings);

  const budget = state.settings.monthlyBudget;
  const fill = document.getElementById("budgetProgress");
  const foot = document.getElementById("budgetFoot");
  if(budget){
    const pct = Math.min(100, monthTotal/budget*100);
    fill.style.width = pct+"%";
    fill.className = "progress-fill" + (pct>=100?" danger": pct>=75?" warn":"");
    foot.textContent = `${pct.toFixed(0)}% of ${fmtMoney(budget)} monthly budget used`;
  } else {
    fill.style.width = "0%"; foot.textContent = "No budget set — go to Budget tab";
  }

  const recentList = document.getElementById("recentList");
  recentList.innerHTML = "";
  [...state.expenses].sort((a,b)=> b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0,8).forEach(e=> recentList.appendChild(txRow(e)));
  if(!state.expenses.length) recentList.innerHTML = `<p class="muted">No expenses yet — add your first one!</p>`;

  destroyChart("dashPie");
  const byCat = {};
  monthExpenses.forEach(e=> byCat[e.category] = (byCat[e.category]||0)+e.amount);
  const labels = Object.keys(byCat);
  if(labels.length){
    chartRefs.dashPie = new Chart(document.getElementById("dashPie"), {
      type:"doughnut",
      data:{labels, datasets:[{data:labels.map(l=>byCat[l]), backgroundColor:labels.map(l=> (catByName(l)||{color:"#999"}).color)}]},
      options:{plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:11}}}}}
    });
  }
}

function txRow(e, isIncome=false){
  const div = document.createElement("div");
  div.className = "tx-row" + (isIncome?" tx-income":"");
  if(isIncome){
    div.innerHTML = `
      <div class="tx-icon" style="background:#3F7D5C22;">💵</div>
      <div class="tx-main"><div class="tx-title">${e.source}</div><div class="tx-sub">${e.date}${e.notes? " · "+e.notes:""}</div></div>
      <div class="tx-amount">+${fmtMoney(e.amount)}</div>
      <div class="tx-actions"><button data-del-income="${e.id}">🗑</button></div>`;
    div.querySelector("[data-del-income]").onclick = ()=> deleteIncome(e.id);
    return div;
  }
  const cat = catByName(e.category) || {icon:"📦",color:"#999"};
  div.innerHTML = `
    <div class="tx-icon" style="background:${cat.color}22;">${cat.icon}</div>
    <div class="tx-main"><div class="tx-title">${e.description || e.category}</div><div class="tx-sub">${e.date} · ${e.category} · ${e.payment}</div></div>
    <div class="tx-amount">-${fmtMoney(e.amount)}</div>
    <div class="tx-actions"><button data-edit="${e.id}">✏️</button><button data-del="${e.id}">🗑</button></div>`;
  div.querySelector("[data-edit]").onclick = ()=> openExpenseModal(e);
  div.querySelector("[data-del]").onclick = ()=> deleteExpense(e.id);
  return div;
}

/* ---------------- RENDER: ANALYTICS ---------------- */
function renderAnalytics(){
  const mk = monthKey(todayISO());
  const monthExpenses = state.expenses.filter(e=>monthKey(e.date)===mk);

  destroyChart("cat");
  const byCat = {};
  monthExpenses.forEach(e=> byCat[e.category] = (byCat[e.category]||0)+e.amount);
  let labels = Object.keys(byCat);
  chartRefs.cat = new Chart(document.getElementById("chartCategory"), {
    type:"pie",
    data:{labels, datasets:[{data:labels.map(l=>byCat[l]), backgroundColor:labels.map(l=>(catByName(l)||{color:"#999"}).color)}]},
    options:{plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:10}}}}}
  });

  destroyChart("monthly");
  const monthTotals = {};
  state.expenses.forEach(e=>{ const k=monthKey(e.date); monthTotals[k]=(monthTotals[k]||0)+e.amount; });
  const sortedMonths = Object.keys(monthTotals).sort().slice(-6);
  chartRefs.monthly = new Chart(document.getElementById("chartMonthly"), {
    type:"bar",
    data:{labels:sortedMonths.map(m=>monthLabel(m).split(" ")[0]), datasets:[{label:"Spent", data:sortedMonths.map(m=>monthTotals[m]), backgroundColor:"#D9A441"}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  destroyChart("weekly");
  const weekLabels = []; const weekData = [];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const iso=d.toISOString().slice(0,10); weekLabels.push(d.toLocaleDateString('en-US',{weekday:'short'})); weekData.push(state.expenses.filter(e=>e.date===iso).reduce((s,e)=>s+e.amount,0)); }
  chartRefs.weekly = new Chart(document.getElementById("chartWeekly"), {
    type:"bar",
    data:{labels:weekLabels, datasets:[{label:"Spent", data:weekData, backgroundColor:"#3F7D5C"}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  destroyChart("daily");
  const dayLabels=[]; const dayData=[];
  for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const iso=d.toISOString().slice(0,10); dayLabels.push(iso.slice(5)); dayData.push(state.expenses.filter(e=>e.date===iso).reduce((s,e)=>s+e.amount,0)); }
  chartRefs.daily = new Chart(document.getElementById("chartDaily"), {
    type:"line",
    data:{labels:dayLabels, datasets:[{label:"Spent", data:dayData, borderColor:"#0F3D3E", backgroundColor:"#0F3D3E33", fill:true, tension:0.3}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  const lastMk = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return monthKey(d.toISOString().slice(0,10)); })();
  const thisTotal = monthTotals[mk]||0;
  const lastTotal = monthTotals[lastMk]||0;
  const delta = lastTotal ? ((thisTotal-lastTotal)/lastTotal*100) : 0;
  const highestCat = labels.sort((a,b)=>byCat[b]-byCat[a])[0];
  document.getElementById("monthCompare").innerHTML = `
    <div class="compare-item"><div class="stat-label">This month</div><div class="stat-value mono">${fmtMoney(thisTotal)}</div></div>
    <div class="compare-item"><div class="stat-label">Last month</div><div class="stat-value mono">${fmtMoney(lastTotal)}</div></div>
    <div class="compare-item"><div class="stat-label">Change</div><div class="stat-value mono ${delta>0?'delta-up':'delta-down'}">${delta>=0?'+':''}${delta.toFixed(1)}%</div></div>
    <div class="compare-item"><div class="stat-label">Highest category</div><div class="stat-value mono">${highestCat||'—'}</div></div>`;
}

/* ---------------- RENDER: BUDGET ---------------- */
function renderBudget(){
  document.getElementById("monthlyBudgetInput").value = state.settings.monthlyBudget || "";
  const mk = monthKey(todayISO());
  const spent = state.expenses.filter(e=>monthKey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
  const remaining = Math.max(0,(state.settings.monthlyBudget||0)-spent);
  const daysLeft = daysInMonth(mk) - new Date().getDate() + 1;
  document.getElementById("dailyAllowance").textContent = state.settings.monthlyBudget ?
    `You can safely spend ${fmtMoney(remaining/Math.max(1,daysLeft))} per day for the rest of the month.` : "Set a monthly budget to see your daily allowance.";

  const list = document.getElementById("categoryBudgetList");
  list.innerHTML = "";
  state.categories.filter(c=>c.budget>0).forEach(c=>{
    const spentCat = state.expenses.filter(e=>monthKey(e.date)===mk && e.category===c.name).reduce((s,e)=>s+e.amount,0);
    const pct = Math.min(100, spentCat/c.budget*100);
    const row = document.createElement("div");
    row.style.marginBottom="14px";
    row.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:4px;"><span>${c.icon} ${c.name}</span><span class="mono">${fmtMoney(spentCat)} / ${fmtMoney(c.budget)}</span></div>
      <div class="progress-track"><div class="progress-fill${pct>=100?' danger':pct>=75?' warn':''}" style="width:${pct}%"></div></div>`;
    list.appendChild(row);
  });
  if(!state.categories.some(c=>c.budget>0)) list.innerHTML = `<p class="muted">Set budgets per category from the Categories tab.</p>`;
}

/* ---------------- RENDER: HISTORY ---------------- */
function renderHistory(){
  const months = [...new Set(state.expenses.map(e=>monthKey(e.date)))].sort().reverse();
  const sel = document.getElementById("historyMonthSelect");
  const current = sel.value || months[0] || monthKey(todayISO());
  sel.innerHTML = "";
  if(!months.includes(current)) months.unshift(current);
  months.forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=monthLabel(m); sel.appendChild(o); });
  sel.value = current;
  sel.onchange = renderHistory;

  const mExpenses = state.expenses.filter(e=>monthKey(e.date)===sel.value);
  const total = mExpenses.reduce((s,e)=>s+e.amount,0);
  const byCat = {};
  mExpenses.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+e.amount);
  const summary = document.getElementById("historySummary");
  summary.innerHTML = `<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value mono">${fmtMoney(total)}</div></div>` +
    Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]).map(c=>`<div class="stat-card"><div class="stat-label">${c}</div><div class="stat-value mono">${fmtMoney(byCat[c])}</div></div>`).join("");

  const list = document.getElementById("historyList");
  list.innerHTML = "";
  [...mExpenses].sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=> list.appendChild(txRow(e)));
  if(!mExpenses.length) list.innerHTML = `<p class="muted">No transactions this month.</p>`;
}

/* ---------------- RENDER: SEARCH ---------------- */
function initSearchFilters(){
  fillCategorySelect(document.getElementById("filterCategory"), true);
  ["searchText","filterCategory","filterPayment","filterDateFrom","filterDateTo","filterMin","filterMax"].forEach(id=>{
    document.getElementById(id).addEventListener("input", renderSearch);
    document.getElementById(id).addEventListener("change", renderSearch);
  });
  document.getElementById("clearFilters").addEventListener("click", ()=>{
    ["searchText","filterCategory","filterPayment","filterDateFrom","filterDateTo","filterMin","filterMax"].forEach(id=> document.getElementById(id).value="");
    renderSearch();
  });
}
function renderSearch(){
  const text = document.getElementById("searchText").value.toLowerCase();
  const cat = document.getElementById("filterCategory").value;
  const pay = document.getElementById("filterPayment").value;
  const from = document.getElementById("filterDateFrom").value;
  const to = document.getElementById("filterDateTo").value;
  const min = parseFloat(document.getElementById("filterMin").value);
  const max = parseFloat(document.getElementById("filterMax").value);
  let results = state.expenses.filter(e=>{
    if(text && !(`${e.description} ${e.notes} ${e.location} ${e.category}`.toLowerCase().includes(text))) return false;
    if(cat && e.category!==cat) return false;
    if(pay && e.payment!==pay) return false;
    if(from && e.date<from) return false;
    if(to && e.date>to) return false;
    if(!isNaN(min) && e.amount<min) return false;
    if(!isNaN(max) && e.amount>max) return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const list = document.getElementById("searchResults");
  list.innerHTML = "";
  results.forEach(e=> list.appendChild(txRow(e)));
  if(!results.length) list.innerHTML = `<p class="muted">No matching transactions.</p>`;
}
function fillPaymentFilter(){
  const sel = document.getElementById("filterPayment");
  const methods = ["Cash","UPI","Debit Card","Credit Card","Bank Transfer","Wallet"];
  sel.innerHTML = `<option value="">All payment methods</option>` + methods.map(m=>`<option>${m}</option>`).join("");
}

/* ---------------- RENDER: INCOME ---------------- */
function renderIncome(){
  const mk = monthKey(todayISO());
  const monthIncome = state.income.filter(i=>monthKey(i.date)===mk).reduce((s,i)=>s+i.amount,0);
  const monthExpense = state.expenses.filter(e=>monthKey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
  document.getElementById("incomeTotal").textContent = fmtMoney(monthIncome);
  document.getElementById("incomeExpenses").textContent = fmtMoney(monthExpense);
  document.getElementById("incomeSavings").textContent = fmtMoney(monthIncome-monthExpense);
  const list = document.getElementById("incomeList");
  list.innerHTML = "";
  [...state.income].sort((a,b)=>b.date.localeCompare(a.date)).forEach(i=> list.appendChild(txRow(i, true)));
  if(!state.income.length) list.innerHTML = `<p class="muted">No income logged yet.</p>`;
}

/* ---------------- RENDER: GOALS ---------------- */
function renderGoals(){
  const grid = document.getElementById("goalsGrid");
  grid.innerHTML = "";
  state.goals.forEach(g=>{
    const pct = Math.min(100, g.current/g.target*100);
    const div = document.createElement("div");
    div.className = "goal-card";
    div.innerHTML = `<h4>${g.name}</h4>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="goal-progress-num">${fmtMoney(g.current)} / ${fmtMoney(g.target)} (${pct.toFixed(0)}%)</div>
      ${g.date?`<div class="muted" style="margin-top:6px;">Target: ${g.date}</div>`:""}
      <div class="form-row" style="margin-top:10px;">
        <button class="btn-ghost" data-add="${g.id}">+ ₹500</button>
        <button class="btn-ghost" data-del="${g.id}">Delete</button>
      </div>`;
    div.querySelector("[data-add]").onclick = ()=> updateGoalProgress(g.id, 500);
    div.querySelector("[data-del]").onclick = ()=> deleteGoal(g.id);
    grid.appendChild(div);
  });
  if(!state.goals.length) grid.innerHTML = `<p class="muted">No savings goals yet. Create one to start tracking progress.</p>`;
}

/* ---------------- RENDER: RECURRING ---------------- */
function renderRecurring(){
  const list = document.getElementById("recurringList");
  list.innerHTML = "";
  state.recurring.forEach(r=>{
    const cat = catByName(r.category)||{icon:"📦",color:"#999"};
    const div = document.createElement("div");
    div.className = "tx-row";
    div.innerHTML = `<div class="tx-icon" style="background:${cat.color}22;">${cat.icon}</div>
      <div class="tx-main"><div class="tx-title">${r.name}</div><div class="tx-sub">Day ${r.day} of every month · ${r.category}</div></div>
      <div class="tx-amount">${fmtMoney(r.amount)}</div>
      <div class="tx-actions"><button data-del="${r.id}">🗑</button></div>`;
    div.querySelector("[data-del]").onclick = ()=> deleteRecurring(r.id);
    list.appendChild(div);
  });
  if(!state.recurring.length) list.innerHTML = `<p class="muted">No recurring expenses set up.</p>`;
}

/* ---------------- RENDER: GALLERY ---------------- */
function renderGallery(){
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = "";
  const withPhotos = state.expenses.filter(e=>e.photo);
  withPhotos.sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=>{
    const div = document.createElement("div");
    div.className = "gallery-item";
    div.innerHTML = `<img src="${e.photo}"><div class="gi-cap">${e.description||e.category} · ${fmtMoney(e.amount)}<br>${e.date}</div>`;
    div.onclick = ()=> openExpenseModal(e);
    grid.appendChild(div);
  });
  if(!withPhotos.length) grid.innerHTML = `<p class="muted">No receipt photos yet. Add one from "Add Expense" or "Scan Receipt".</p>`;
}

/* ---------------- RENDER: CATEGORIES ---------------- */
function renderCategories(){
  const mk = monthKey(todayISO());
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  state.categories.forEach(c=>{
    const spent = state.expenses.filter(e=>monthKey(e.date)===mk && e.category===c.name).reduce((s,e)=>s+e.amount,0);
    const div = document.createElement("div");
    div.className = "category-tile";
    div.innerHTML = `<div class="cat-icon-big" style="background:${c.color}22;">${c.icon}</div><div class="cat-name">${c.name}</div><div class="cat-spend">${fmtMoney(spent)} this month</div>`;
    div.onclick = ()=> openCategoryModal(c);
    grid.appendChild(div);
  });
}

/* ---------------- INSIGHTS ---------------- */
function computeInsights(){
  const insights = [];
  const mk = monthKey(todayISO());
  const lastMk = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return monthKey(d.toISOString().slice(0,10)); })();
  const thisMonthExp = state.expenses.filter(e=>monthKey(e.date)===mk);
  const lastMonthExp = state.expenses.filter(e=>monthKey(e.date)===lastMk);

  const byCatThis = {}; thisMonthExp.forEach(e=>byCatThis[e.category]=(byCatThis[e.category]||0)+e.amount);
  const byCatLast = {}; lastMonthExp.forEach(e=>byCatLast[e.category]=(byCatLast[e.category]||0)+e.amount);

  Object.keys(byCatThis).forEach(cat=>{
    const prev = byCatLast[cat]||0;
    if(prev>0){
      const change = ((byCatThis[cat]-prev)/prev*100);
      if(Math.abs(change) >= 15){
        insights.push(`${cat} spending ${change>0?'increased':'decreased'} by ${Math.abs(change).toFixed(0)}% compared to last month.`);
      }
    }
  });

  if(Object.keys(byCatThis).length){
    const top = Object.keys(byCatThis).sort((a,b)=>byCatThis[b]-byCatThis[a])[0];
    insights.push(`${top} is your highest expense category this month at ${fmtMoney(byCatThis[top])}.`);
  }

  const weekendTotal = thisMonthExp.filter(e=>{ const d=new Date(e.date).getDay(); return d===0||d===6; }).reduce((s,e)=>s+e.amount,0);
  const weekdayTotal = thisMonthExp.reduce((s,e)=>s+e.amount,0) - weekendTotal;
  if(weekendTotal > weekdayTotal * 0.6 && weekendTotal>0){
    insights.push(`You spend a large share of your money on weekends — ${fmtMoney(weekendTotal)} so far this month.`);
  }

  const foodThis = byCatThis["Food"]||0;
  if(foodThis > 0){
    const perDay = foodThis / new Date().getDate();
    const potentialSave = perDay * 0.3 * daysInMonth(mk);
    insights.push(`If you trim daily food spending by 30%, you could save around ${fmtMoney(potentialSave)} this month.`);
  }

  const budget = state.settings.monthlyBudget;
  if(budget){
    const spent = thisMonthExp.reduce((s,e)=>s+e.amount,0);
    const daysPassed = new Date().getDate();
    const dailyRate = spent/Math.max(1,daysPassed);
    const projectedTotal = dailyRate * daysInMonth(mk);
    if(projectedTotal > budget){
      const daysUntilExceed = Math.max(0, Math.floor((budget-spent)/dailyRate));
      insights.push(`At your current pace, you're on track to exceed your monthly budget in about ${daysUntilExceed} day(s).`);
    } else {
      insights.push(`You're on track to stay within budget this month if spending stays steady.`);
    }
  }

  const subs = thisMonthExp.filter(e=>e.category==="Subscriptions").reduce((s,e)=>s+e.amount,0);
  const subsLast = lastMonthExp.filter(e=>e.category==="Subscriptions").reduce((s,e)=>s+e.amount,0);
  if(subsLast>0 && subs>subsLast){
    insights.push(`Your subscription costs increased by ${(((subs-subsLast)/subsLast)*100).toFixed(0)}% versus last month.`);
  }

  if(!insights.length) insights.push("Log a few more expenses so we can start surfacing patterns and personalized tips.");
  return insights;
}
function renderInsights(){
  const list = document.getElementById("insightsList");
  list.innerHTML = computeInsights().map(i=>`<div class="insight-item">💡 ${i}</div>`).join("");
}

/* ---- Ask your finances (rule-based NL query) ---- */
function answerFinanceQuery(q){
  const text = q.toLowerCase();
  const mk = monthKey(todayISO());
  const lastMk = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return monthKey(d.toISOString().slice(0,10)); })();
  const monthWord = text.includes("last month") ? lastMk : mk;

  const catMatch = state.categories.find(c=> text.includes(c.name.toLowerCase()));
  if(catMatch){
    const total = state.expenses.filter(e=>monthKey(e.date)===monthWord && e.category===catMatch.name).reduce((s,e)=>s+e.amount,0);
    return `You spent ${fmtMoney(total)} on ${catMatch.name} in ${monthLabel(monthWord)}.`;
  }
  if(text.includes("compare")){
    const thisTotal = state.expenses.filter(e=>monthKey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
    const lastTotal = state.expenses.filter(e=>monthKey(e.date)===lastMk).reduce((s,e)=>s+e.amount,0);
    const diff = thisTotal-lastTotal;
    return `This month: ${fmtMoney(thisTotal)}, last month: ${fmtMoney(lastTotal)}. That's ${diff>=0?'':'−'}${fmtMoney(Math.abs(diff))} ${diff>=0?'more':'less'} than last month.`;
  }
  if(text.includes("save") || text.includes("saving")){
    const insights = computeInsights().filter(i=>i.toLowerCase().includes("save") || i.toLowerCase().includes("trim"));
    return insights.length ? insights.join(" ") : "Try setting category budgets so I can flag where you're overspending.";
  }
  if(text.includes("highest") || text.includes("most")){
    const byCat = {};
    state.expenses.filter(e=>monthKey(e.date)===mk).forEach(e=>byCat[e.category]=(byCat[e.category]||0)+e.amount);
    const top = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a])[0];
    return top ? `Your highest spending category this month is ${top} at ${fmtMoney(byCat[top])}.` : "No expenses logged this month yet.";
  }
  const total = state.expenses.filter(e=>monthKey(e.date)===monthWord).reduce((s,e)=>s+e.amount,0);
  return `You spent a total of ${fmtMoney(total)} in ${monthLabel(monthWord)}. Try asking about a specific category, or say "compare this month with last month".`;
}

/* ---- Monthly report ---- */
function generateReport(){
  const mk = monthKey(todayISO());
  const exps = state.expenses.filter(e=>monthKey(e.date)===mk);
  const total = exps.reduce((s,e)=>s+e.amount,0);
  const byCat = {}; exps.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+e.amount);
  const biggest = [...exps].sort((a,b)=>b.amount-a.amount)[0];
  const income = state.income.filter(i=>monthKey(i.date)===mk).reduce((s,i)=>s+i.amount,0);
  const savings = income-total;
  const insights = computeInsights();
  const budget = state.settings.monthlyBudget;
  const budgetPerf = budget ? `${Math.min(100, total/budget*100).toFixed(0)}% of ${fmtMoney(budget)} budget used` : "No budget set";

  const html = `
    <div class="card" id="reportCard">
      <div class="card-head"><h3>📄 Report — ${monthLabel(mk)}</h3><button class="btn-ghost" id="printReportBtn">Export / Print as PDF</button></div>
      <p><strong>Total spent:</strong> <span class="mono">${fmtMoney(total)}</span></p>
      <p><strong>Category breakdown:</strong></p>
      <ul>${Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]).map(c=>`<li>${c}: ${fmtMoney(byCat[c])}</li>`).join("")}</ul>
      <p><strong>Biggest purchase:</strong> ${biggest ? `${biggest.description||biggest.category} — ${fmtMoney(biggest.amount)} on ${biggest.date}` : "—"}</p>
      <p><strong>Budget performance:</strong> ${budgetPerf}</p>
      <p><strong>Savings estimate:</strong> <span class="mono">${fmtMoney(savings)}</span></p>
      <p><strong>AI recommendations:</strong></p>
      <ul>${insights.map(i=>`<li>${i}</li>`).join("")}</ul>
    </div>`;
  document.getElementById("reportOutput").innerHTML = html;
  document.getElementById("printReportBtn").onclick = () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Report - ${monthLabel(mk)}</title>
      <style>body{font-family:sans-serif;padding:30px;} h2{font-family:serif;}</style></head><body>
      <h2>Ledger — Monthly Report: ${monthLabel(mk)}</h2>${document.getElementById("reportCard").innerHTML}</body></html>`);
    w.document.close(); w.print();
  };
}

/* ---------------- ACHIEVEMENTS ---------------- */
function computeAchievementStats(){
  const mk = monthKey(todayISO());
  const budget = state.settings.monthlyBudget;
  const spent = state.expenses.filter(e=>monthKey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
  const totalIncome = state.income.reduce((s,i)=>s+i.amount,0);
  const totalSpent = state.expenses.reduce((s,e)=>s+e.amount,0);
  const dates = [...new Set(state.expenses.map(e=>e.date))].sort();
  let streak = 0, maxStreak = 0;
  for(let i=0;i<dates.length;i++){
    if(i===0 || (new Date(dates[i]) - new Date(dates[i-1]))/86400000 === 1){ streak++; } else { streak=1; }
    maxStreak = Math.max(maxStreak, streak);
  }
  return {
    monthBudgetOk: budget ? spent <= budget : false,
    totalSavings: totalIncome - totalSpent,
    streak: maxStreak,
    weekOk: true,
  };
}
function renderAchievements(){
  const stats = computeAchievementStats();
  const grid = document.getElementById("achievementsList");
  grid.innerHTML = ACHIEVEMENT_DEFS.map(a=>{
    const unlocked = a.check(stats);
    return `<div class="ach-badge ${unlocked?'unlocked':'locked'}">${unlocked?'🏆':'🔒'} ${a.label}</div>`;
  }).join("");
}

/* ---------------- SETTINGS ---------------- */
function renderSettings(){
  document.getElementById("darkModeToggle").checked = !!state.settings.darkMode;
  document.getElementById("currencySelect").value = state.settings.currency || "₹";
  document.getElementById("pinToggle").checked = !!state.settings.pin;
  document.getElementById("pinSetRow").style.display = document.getElementById("pinToggle").checked ? "flex" : "none";
  renderAchievements();
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme", state.settings.darkMode ? "dark" : "light");
}

/* ---------------- EXPORT / BACKUP ---------------- */
function exportCsv(){
  const rows = [["Date","Category","Description","Amount","Payment","Location","Notes"]];
  state.expenses.forEach(e=> rows.push([e.date,e.category,e.description,e.amount,e.payment,e.location||"",e.notes||""]));
  const csv = rows.map(r=> r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadFile(csv, "ledger_expenses.csv", "text/csv");
}
function exportJson(){
  const backup = {expenses:state.expenses, income:state.income, categories:state.categories, goals:state.goals, recurring:state.recurring, merchantMap:state.merchantMap, settings:state.settings};
  downloadFile(JSON.stringify(backup,null,2), "ledger_backup.json", "application/json");
}
function downloadFile(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
function restoreBackup(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      state.expenses = data.expenses||[]; state.income = data.income||[]; state.categories = data.categories||state.categories;
      state.goals = data.goals||[]; state.recurring = data.recurring||[]; state.merchantMap = data.merchantMap||{};
      state.settings = data.settings||state.settings;
      saveAll(); applyTheme(); renderAll();
      toast("Backup restored");
    }catch(e){ toast("Invalid backup file"); }
  };
  reader.readAsText(file);
}

/* ---------------- RECEIPT SCANNER (OCR) ---------------- */
function initScanModal(){
  document.getElementById("scanInput").addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const preview = document.getElementById("scanPreview");
    const reader = new FileReader();
    reader.onload = () => { preview.src = reader.result; preview.classList.remove("hidden"); };
    reader.readAsDataURL(file);

    document.getElementById("scanStatus").textContent = "Reading receipt with OCR... this can take a few seconds.";
    document.getElementById("scanResult").classList.add("hidden");
    document.getElementById("saveScanBtn").classList.add("hidden");
    try{
      const {data:{text}} = await Tesseract.recognize(file, "eng");
      document.getElementById("scanStatus").textContent = "Done — please review the extracted details below.";
      parseReceiptText(text);
    }catch(err){
      document.getElementById("scanStatus").textContent = "Couldn't read the receipt automatically. Please enter the details manually.";
      document.getElementById("scanResult").classList.remove("hidden");
      document.getElementById("saveScanBtn").classList.remove("hidden");
      fillCategorySelect(document.getElementById("scanCategory"));
    }
  });
  document.getElementById("saveScanBtn").addEventListener("click", ()=>{
    const amount = parseFloat(document.getElementById("scanAmount").value);
    if(!amount||amount<=0){ toast("Enter a valid amount"); return; }
    const photo = document.getElementById("scanPreview").src;
    const shop = document.getElementById("scanShop").value;
    const category = document.getElementById("scanCategory").value;
    const date = document.getElementById("scanDate").value || todayISO();
    state.expenses.push({id:uid(), amount, category, description:shop, date, payment:"Cash", location:"", notes:"Added via receipt scan", photo});
    learnCategory(shop, category);
    saveAll(); closeModal("scanModalBackdrop"); checkBudgetAlerts(); renderAll();
    toast("Expense added from receipt");
  });
}
function parseReceiptText(text){
  const amountMatch = text.match(/(?:total|amount|grand total|rs\.?|₹|inr)\s*[:\-]?\s*([\d,]+\.?\d{0,2})/i) || text.match(/([\d,]+\.\d{2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g,"")) : "";
  const dateMatch = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  let date = todayISO();
  if(dateMatch){
    const parts = dateMatch[1].split(/[\/\-.]/);
    if(parts[2] && parts[2].length===4){ date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; }
  }
  const firstLine = text.split("\n").map(l=>l.trim()).filter(Boolean)[0] || "";
  const category = suggestCategory(text);

  document.getElementById("scanShop").value = firstLine.slice(0,40);
  document.getElementById("scanAmount").value = amount;
  document.getElementById("scanDate").value = date;
  fillCategorySelect(document.getElementById("scanCategory"));
  document.getElementById("scanCategory").value = category;
  document.getElementById("scanResult").classList.remove("hidden");
  document.getElementById("saveScanBtn").classList.remove("hidden");
}

/* ---------------- VOICE ENTRY ---------------- */
function initVoiceModal(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  document.getElementById("startVoiceBtn").addEventListener("click", ()=>{
    if(!SpeechRecognition){
      toast("Voice recognition isn't supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN"; rec.interimResults = false; rec.maxAlternatives = 1;
    document.getElementById("voiceTranscript").textContent = "Listening...";
    rec.start();
    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById("voiceTranscript").textContent = `"${transcript}"`;
      parseVoiceText(transcript);
    };
    rec.onerror = () => { document.getElementById("voiceTranscript").textContent = "Didn't catch that — try again or type manually."; };
  });
  document.getElementById("saveVoiceBtn").addEventListener("click", ()=>{
    const amount = parseFloat(document.getElementById("voiceAmount").value);
    if(!amount||amount<=0){ toast("Enter a valid amount"); return; }
    const category = document.getElementById("voiceCategory").value;
    const description = document.getElementById("voiceDescription").value;
    const date = document.getElementById("voiceDate").value || todayISO();
    state.expenses.push({id:uid(), amount, category, description, date, payment:"Cash", location:"", notes:"Added via voice entry", photo:null});
    learnCategory(description, category);
    saveAll(); closeModal("voiceModalBackdrop"); checkBudgetAlerts(); renderAll();
    toast("Expense added from voice entry");
  });
}
function parseVoiceText(text){
  const t = text.toLowerCase();
  const amountMatch = t.match(/(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : "";
  let date = todayISO();
  if(t.includes("yesterday")){ const d=new Date(); d.setDate(d.getDate()-1); date = d.toISOString().slice(0,10); }
  const category = suggestCategory(t);
  const description = text.replace(/^(spent|paid|bought)\s*/i,"").trim();

  fillCategorySelect(document.getElementById("voiceCategory"));
  document.getElementById("voiceAmount").value = amount;
  document.getElementById("voiceCategory").value = category;
  document.getElementById("voiceDescription").value = description;
  document.getElementById("voiceDate").value = date;
  document.getElementById("voiceResult").classList.remove("hidden");
  document.getElementById("saveVoiceBtn").classList.remove("hidden");
}

/* ---------------- PIN LOCK ---------------- */
function initLock(){
  if(state.settings.pin){
    document.getElementById("lockScreen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  } else {
    document.getElementById("app").classList.remove("hidden");
  }
  document.getElementById("unlockBtn").addEventListener("click", tryUnlock);
  document.getElementById("pinInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") tryUnlock(); });
}
function tryUnlock(){
  const val = document.getElementById("pinInput").value;
  if(val === state.settings.pin){
    document.getElementById("lockScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  } else {
    document.getElementById("lockError").textContent = "Incorrect PIN";
  }
}

/* ---------------- INIT EVENT WIRING ---------------- */
function initEvents(){
  document.getElementById("qAdd").addEventListener("click", ()=> openExpenseModal());
  document.getElementById("qScan").addEventListener("click", ()=>{
    document.getElementById("scanStatus").textContent="";
    document.getElementById("scanPreview").classList.add("hidden");
    document.getElementById("scanResult").classList.add("hidden");
    document.getElementById("saveScanBtn").classList.add("hidden");
    document.getElementById("scanInput").value="";
    openModal("scanModalBackdrop");
  });
  document.getElementById("qVoice").addEventListener("click", ()=>{
    document.getElementById("voiceTranscript").textContent="";
    document.getElementById("voiceResult").classList.add("hidden");
    document.getElementById("saveVoiceBtn").classList.add("hidden");
    openModal("voiceModalBackdrop");
  });
  document.getElementById("saveExpenseBtn").addEventListener("click", saveExpenseFromModal);
  document.getElementById("expPhoto").addEventListener("change", (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => { document.getElementById("expPhotoPreview").src = reader.result; document.getElementById("expPhotoPreview").classList.remove("hidden"); };
    reader.readAsDataURL(f);
  });

  document.getElementById("saveMonthlyBudget").addEventListener("click", ()=>{
    state.settings.monthlyBudget = parseFloat(document.getElementById("monthlyBudgetInput").value)||0;
    saveAll(); renderAll(); toast("Monthly budget saved");
  });

  document.getElementById("addCategoryBtn").addEventListener("click", ()=> openCategoryModal());
  document.getElementById("saveCategoryBtn").addEventListener("click", saveCategoryFromModal);
  document.getElementById("deleteCategoryBtn").addEventListener("click", deleteCategory);

  document.getElementById("addIncomeBtn").addEventListener("click", ()=>{
    document.getElementById("incAmount").value=""; document.getElementById("incDate").value=todayISO(); document.getElementById("incNotes").value="";
    openModal("incomeModalBackdrop");
  });
  document.getElementById("saveIncomeBtn").addEventListener("click", saveIncomeFromModal);

  document.getElementById("addGoalBtn").addEventListener("click", ()=>{
    document.getElementById("goalName").value=""; document.getElementById("goalTarget").value=""; document.getElementById("goalCurrent").value=0; document.getElementById("goalDate").value="";
    openModal("goalModalBackdrop");
  });
  document.getElementById("saveGoalBtn").addEventListener("click", saveGoalFromModal);

  document.getElementById("addRecurringBtn").addEventListener("click", ()=>{
    fillCategorySelect(document.getElementById("recCategory"));
    document.getElementById("recName").value=""; document.getElementById("recAmount").value=""; document.getElementById("recDay").value=1;
    openModal("recurringModalBackdrop");
  });
  document.getElementById("saveRecurringBtn").addEventListener("click", saveRecurringFromModal);

  document.getElementById("genReportBtn").addEventListener("click", generateReport);
  document.getElementById("chatAskBtn").addEventListener("click", ()=>{
    const q = document.getElementById("chatQuery").value.trim();
    if(!q) return;
    document.getElementById("chatAnswer").textContent = answerFinanceQuery(q);
  });
  document.getElementById("chatQuery").addEventListener("keydown", (e)=>{ if(e.key==="Enter") document.getElementById("chatAskBtn").click(); });

  document.getElementById("darkModeToggle").addEventListener("change", (e)=>{
    state.settings.darkMode = e.target.checked; saveAll(); applyTheme();
  });
  document.getElementById("currencySelect").addEventListener("change", (e)=>{
    state.settings.currency = e.target.value; saveAll(); renderAll();
  });
  document.getElementById("pinToggle").addEventListener("change", (e)=>{
    document.getElementById("pinSetRow").style.display = e.target.checked ? "flex" : "none";
    if(!e.target.checked){ state.settings.pin = null; saveAll(); toast("PIN lock disabled"); }
  });
  document.getElementById("savePinBtn").addEventListener("click", ()=>{
    const pin = document.getElementById("newPinInput").value;
    if(pin.length<4){ toast("PIN must be at least 4 digits"); return; }
    state.settings.pin = pin; saveAll(); toast("PIN saved");
  });

  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("restoreInput").addEventListener("change", (e)=>{ if(e.target.files[0]) restoreBackup(e.target.files[0]); });
  document.getElementById("wipeBtn").addEventListener("click", ()=>{
    if(confirm("This will permanently erase all data in this browser. Continue?")){
      localStorage.clear(); location.reload();
    }
  });
}

/* ---------------- RENDER ALL ---------------- */
function renderAll(){
  fillPaymentFilter();
  renderDashboard();
  renderAnalytics();
  renderBudget();
  renderHistory();
  renderSearch();
  renderIncome();
  renderGoals();
  renderRecurring();
  renderGallery();
  renderCategories();
  renderInsights();
  renderSettings();
}

/* ---------------- BOOTSTRAP ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  applyTheme();
  initNav();
  initModalClosers();
  initEvents();
  initSearchFilters();
  initScanModal();
  initVoiceModal();
  initLock();
  processRecurring();
  renderAll();
});
