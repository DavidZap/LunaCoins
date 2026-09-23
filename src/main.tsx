import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  WalletCards,
  Repeat2,
  Tags,
  History,
  Settings,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Pencil,
  Sun,
  Moon,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { allCategories, demoBudgets, demoTransactions } from "./data";
import {
  budgetStatus,
  calculateBudgetScenarioAvailable,
  calculateBudgetCapacity,
  calculateBudgetLimits,
  calculateBudgetedExpenses,
  calculateAverageDailyExpense,
  calculateBudgetedDailyExpense,
  calculateDailyAvailable,
  calculateDailyPlannedCapacity,
  calculateCategoryDeviation,
  calculateConsumptionRate,
  calculateCumulativeSpending,
  calculateDeductionRate,
  calculateExpenseBreakdown,
  calculateInvestments,
  calculateLoans,
  calculateRealAvailable,
  calculateBenchmarkComparison,
  calculateRemainingBudget,
  calculateSavingsRate,
  calculateSpendingRate,
  calculateTotalExpenses,
  calculateUnbudgetedDailyExpense,
  calculateUnbudgetedExpenseRatio,
  calculateUnbudgetedExpenses,
  getBudgetAllocationRate,
  getBudgetUnassignedCapacity,
  getCategoryBudgetRate,
  getCategorySpentRate,
  getCategoryUsageRate,
  money,
  summary,
} from "./finance";
import type { Benchmark, Budget, Category, FinancialRange, Transaction, TransactionType } from "./types";
import "./styles.css";
import "./overrides.css";
const nav = [
  ["Dashboard", BarChart3],
  ["Movimientos", WalletCards],
  ["Presupuesto", Tags],
  ["Recurrentes", Repeat2],
  ["Categorías", Tags],
  ["Histórico", History],
  ["Configuración", Settings],
] as const;
const load = <T,>(key: string, fallback: T): T => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "") as T;
    if (
      key === "fp-categories" &&
      Array.isArray(saved) &&
      Array.isArray(fallback)
    ) {
      const ids = new Set(saved.map((item: any) => item.id));
      return [
        ...saved,
        ...fallback.filter((item: any) => !ids.has(item.id)),
      ] as T;
    }
    return saved;
  } catch {
    return fallback;
  }
};
const byName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
const rangeForCategory = (category:Category):FinancialRange => ({
  id: `range-${category.id}`,
  categoryId: category.id,
  min: category.group === "Vivienda" ? 5 : category.group === "Transporte" ? 5 : 0,
  max: category.group === "Vivienda" ? 30 : category.group === "Transporte" ? 12 : 15,
  active: true,
});
const defaultFinancialRanges = [...allCategories.filter(category => category.type === "expense").map(rangeForCategory), {id:"range-savings",categoryId:"savings",min:15,max:25,active:true}];
const defaultBenchmarks: Benchmark[] = [{ id: "benchmark-food-usda-2025", categoryId: "food", percentage: 9.7, source: "USDA ERS", year: 2025, country: "EE. UU.", population: "Consumidores estadounidenses", type: "Gasto observado", url: "https://www.ers.usda.gov/" , active: true }];
let activeCategories = allCategories;
function App() {
  const [tab, setTab] = useState<(typeof nav)[number][0]>("Dashboard"),
    [month, setMonth] = useState("2026-09"),
    [transactions, setTransactions] = useState(() =>
      load("fp-tx", demoTransactions),
    ),
    [budgets, setBudgets] = useState(() => load("fp-budgets", demoBudgets)),
    [categoryItems, setCategoryItems] = useState<Category[]>(() =>
      load("fp-categories", allCategories),
    ),
    [financialRanges, setFinancialRanges] = useState<FinancialRange[]>(() =>
      load("fp-financial-ranges", defaultFinancialRanges),
    ),
    [benchmarks, setBenchmarks] = useState<Benchmark[]>(() => load("fp-benchmarks", defaultBenchmarks)),
    [dark, setDark] = useState(() => load("fp-dark", false)),
    [modal, setModal] = useState(false),
    [quickMenu, setQuickMenu] = useState(false),
    [modalType, setModalType] = useState<TransactionType>("expense"),
    [editing, setEditing] = useState<Transaction | null>(null),
    [search, setSearch] = useState("");
  activeCategories = categoryItems;
  useEffect(() => {
    localStorage.setItem("fp-tx", JSON.stringify(transactions));
    localStorage.setItem("fp-budgets", JSON.stringify(budgets));
    localStorage.setItem("fp-categories", JSON.stringify(categoryItems));
    localStorage.setItem("fp-financial-ranges", JSON.stringify(financialRanges));
    localStorage.setItem("fp-benchmarks", JSON.stringify(benchmarks));
    localStorage.setItem("fp-dark", JSON.stringify(dark));
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [transactions, budgets, categoryItems, financialRanges, benchmarks, dark]);
  const s = useMemo(() => summary(transactions, month), [transactions, month]);
  const monthly = transactions.filter((t) => t.date.startsWith(month));
  const expenseOverview = calculateExpenseBreakdown(
    transactions,
    budgets,
    categoryItems,
    month,
  );
  const loans = calculateLoans(transactions, categoryItems, month);
  const budgetCapacity = calculateBudgetCapacity(transactions, categoryItems, month);
  const budgetLimits = calculateBudgetLimits(budgets, month);
  const budgetUnassigned = getBudgetUnassignedCapacity(budgetCapacity, budgetLimits);
  const budgetedExpenses = calculateBudgetedExpenses(transactions, budgets, month);
  const unbudgetedExpenses = calculateUnbudgetedExpenses(transactions, budgets, month);
  const budgetAvailable = calculateBudgetScenarioAvailable(transactions, budgets, month);
  const realAvailable = calculateRealAvailable(transactions, budgets, month);
  const remainingBudget = calculateRemainingBudget(transactions, budgets, month);
  const totalExpenses = calculateTotalExpenses(transactions, budgets, month);
  const plannedDaily = calculateDailyAvailable(budgetAvailable, month);
  const realDaily = calculateDailyAvailable(realAvailable, month);
  const expenseByCat = budgets
    .filter(
      (b) =>
        b.month === month &&
        categoryItems.some((c) => c.id === b.categoryId && c.active !== false),
    )
    .map((b) => {
      const c = categoryItems.find((c) => c.id === b.categoryId)!;
      const spent = monthly
        .filter(
          (t) =>
            t.categoryId === b.categoryId &&
            t.type === "expense",
        )
        .reduce((a, t) => a + t.amount, 0);
      return { ...b, name: c.name, spent, ...budgetStatus(spent, b.limit) };
    });
  const analytics = {
    investments: calculateInvestments(transactions, month),
    averageDaily: calculateAverageDailyExpense(transactions, budgets, month),
    budgetedDaily: calculateBudgetedDailyExpense(transactions, budgets, month),
    unbudgetedDaily: calculateUnbudgetedDailyExpense(transactions, budgets, month),
    plannedCapacity: calculateDailyPlannedCapacity(transactions, budgets, month),
    spendingRate: calculateSpendingRate(transactions, budgets, month),
    unbudgetedRatio: calculateUnbudgetedExpenseRatio(transactions, budgets, month),
    savingsRate: calculateSavingsRate(transactions, month),
    consumptionRate: calculateConsumptionRate(transactions, budgets, month),
    deductionRate: calculateDeductionRate(transactions, month),
    deviations: calculateCategoryDeviation(expenseByCat),
    cumulative: calculateCumulativeSpending(transactions, month),
  };
  const add = (v: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    setTransactions((a) => [
      { ...v, id: crypto.randomUUID(), createdAt: now, updatedAt: now },
      ...a,
    ]);
    setModal(false);
  };
  const update = (v: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
    if (!editing) return;
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === editing.id
          ? { ...transaction, ...v, updatedAt: new Date().toISOString() }
          : transaction,
      ),
    );
    setEditing(null);
    setModal(false);
  };
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span>f</span> Luna Coins
        </div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
              key={name}
            >
              <Icon /> {name}
            </button>
          ))}
        </nav>
        <button className="theme" onClick={() => setDark(!dark)}>
          {dark ? <Sun /> : <Moon />} {dark ? "Modo claro" : "Modo oscuro"}
        </button>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">TU PANORAMA FINANCIERO</p>
            <h1>{tab}</h1>
          </div>
          <div className="header-actions">
            <input
              aria-label="Mes"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <button className="icon" onClick={() => setDark(!dark)}>
              {dark ? <Sun /> : <Moon />}
            </button>
          </div>
        </header>
        {tab === "Dashboard" && (
          <Dashboard
            s={s}
            data={expenseByCat}
            expenseOverview={expenseOverview}
            budgetedExpenses={budgetedExpenses}
            unbudgetedExpenses={unbudgetedExpenses}
            budgetAvailable={budgetAvailable}
            realAvailable={realAvailable}
            remainingBudget={remainingBudget}
            totalExpenses={totalExpenses}
            plannedDaily={plannedDaily}
            realDaily={realDaily}
            loans={loans}
            analytics={analytics}
            benchmarks={benchmarks}
          />
        )}{" "}
        {tab === "Movimientos" && (
          <Movements
            transactions={transactions}
            month={month}
            categories={categoryItems}
            search={search}
            setSearch={setSearch}
            onEdit={(transaction) => {
              setEditing(transaction);
              setModalType(transaction.type);
              setModal(true);
            }}
            onDelete={(id) =>
              setTransactions((x) => x.filter((t) => t.id !== id))
            }
          />
        )}{" "}
        {tab === "Presupuesto" && (
          <BudgetView
            data={expenseByCat}
            expenseOverview={expenseOverview}
            month={month}
            categories={categoryItems}
            onAdd={(categoryId, limit) =>
              setBudgets((current) => [
                ...current,
                { id: crypto.randomUUID(), month, categoryId, limit },
              ])
            }
            onRemove={(id) =>
              setBudgets((current) => current.filter((budget) => budget.id !== id))
            }
            onChange={(id, limit) =>
              setBudgets((x) =>
                x.map((b) => (b.id === id ? { ...b, limit } : b)),
              )
            }
            income={s.income}
            deductions={s.deductions}
            loans={loans}
            savings={s.savings + s.investments}
            budgetCapacity={budgetCapacity}
            budgetLimits={budgetLimits}
            budgetUnassigned={budgetUnassigned}
          />
        )}{" "}
        {tab === "Histórico" && <HistoryView transactions={transactions} />}{" "}
        {["Recurrentes", "Categorías", "Configuración"].includes(tab) && (
          <Secondary
            tab={tab}
            transactions={transactions}
            setTransactions={setTransactions}
            budgets={budgets}
            setBudgets={setBudgets}
            categories={categoryItems}
            setCategories={setCategoryItems}
                      benchmarks={benchmarks}
                      setBenchmarks={setBenchmarks}
          />
        )}
      </main>
      <button className="new" onClick={() => setQuickMenu(!quickMenu)}>
        <Plus /> <span>Nuevo movimiento</span>
      </button>
      {quickMenu && (
        <div className="quick-menu">
          {[
            ["expense", "Gasto"],
            ["income", "Ingreso"],
            ["deduction", "Deducción"],
            ["savings", "Ahorro"],
            ["investment", "Inversión"],
          ].map(([type, label]) => (
            <button
              key={type}
              onClick={() => {
                setEditing(null);
                setModalType(type as TransactionType);
                setQuickMenu(false);
                setModal(true);
              }}
            >
              <Plus /> {label}
            </button>
          ))}
        </div>
      )}
      {modal && (
        <TransactionModal
          key={editing?.id || "new"}
          month={month}
          categories={categoryItems}
          initialType={editing?.type || modalType}
          initialTransaction={editing || undefined}
          onClose={() => {
            setEditing(null);
            setModal(false);
          }}
          onSave={editing ? update : add}
        />
      )}
      <div className="mobile-nav">
        {nav.slice(0, 5).map(([n, I]) => (
          <button
            className={tab === n ? "on" : ""}
            onClick={() => setTab(n)}
            key={n}
          >
            <I />
            <small>{n}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
function ExpenseTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; spent: number; percentage: number; type: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="expense-tooltip">
      <strong>{item.name}</strong>
      <span>{money(item.spent)}</span>
      <span>{item.percentage.toFixed(1)}% del gasto total</span>
      <small>{item.type}</small>
    </div>
  );
}
function WellbeingAnalysis({ income, expenses, savings, investments, rows, benchmarks }: { income:number; expenses:number; savings:number; investments:number; rows:any[]; benchmarks:Benchmark[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = rows.filter(row => filter === "all" || (filter === "budgeted" ? row.budget !== undefined : filter === "unbudgeted" ? row.budget === undefined : row.group === filter));
  const largest = rows[0];
  const largestUnbudgeted = rows.filter(row => row.budget === undefined)[0];
  const largestDeviation = [...rows].filter(row => row.budget !== undefined).sort((a,b) => Math.abs(b.budgetDeviation ?? 0) - Math.abs(a.budgetDeviation ?? 0))[0];
  const needs = rows.filter(row => row.group === "need").reduce((sum,row) => sum + row.spent, 0);
  const wants = rows.filter(row => row.group === "want").reduce((sum,row) => sum + row.spent, 0);
  const savingsShare = income ? savings / income * 100 : 0;
  const distribution = [{name:"Necesidades", value:needs, reference:50}, {name:"Deseos", value:wants, reference:30}, {name:"Ahorro", value:savings, reference:20}];
  const comparisonRows = filtered.filter(row => row.budget !== undefined).slice(0, 8);
  return <section className="wellbeing-panel">
    <div className="wellbeing-heading"><div><p className="eyebrow">BIENESTAR FINANCIERO</p><h2>Cómo se distribuye tu ingreso</h2><p>Cómo se distribuye tu ingreso y cómo se compara con tu presupuesto y referencias de gasto.</p></div></div>
    <div className="wellbeing-stats"><div><span>Mayor categoría</span><b>{largest?.name || "—"}</b><small>{largest ? `${largest.real.toFixed(1)}% del ingreso` : "—"}</small></div><div><span>Mayor desviación vs presupuesto</span><b>{largestDeviation?.name || "—"}</b><small>{largestDeviation?.budgetDeviation == null ? "—" : `${largestDeviation.budgetDeviation > 0 ? "+" : ""}${largestDeviation.budgetDeviation.toFixed(1)} pp`}</small></div><div><span>Mayor gasto sin presupuesto</span><b>{largestUnbudgeted?.name || "—"}</b><small>{largestUnbudgeted ? money(largestUnbudgeted.spent) : "—"}</small></div><div><span>Tasa de ahorro</span><b>{income ? `${(savings / income * 100).toFixed(1)}%` : "—"}</b><small>Solo ahorro registrado</small></div></div>
    <div className="wellbeing-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button><button className={filter === "need" ? "active" : ""} onClick={() => setFilter("need")}>Necesidades</button><button className={filter === "want" ? "active" : ""} onClick={() => setFilter("want")}>Deseos</button><button className={filter === "budgeted" ? "active" : ""} onClick={() => setFilter("budgeted")}>Con presupuesto</button><button className={filter === "unbudgeted" ? "active" : ""} onClick={() => setFilter("unbudgeted")}>Sin presupuesto</button></div>
    <div className="wellbeing-table-wrap"><table className="wellbeing-table"><thead><tr><th>Categoría</th><th>Gasto real</th><th>% ingreso</th><th>Presupuesto</th><th>% presupuestado</th></tr></thead><tbody>{filtered.map(row => <tr key={row.categoryId}><td><b>{row.name}</b></td><td>{money(row.spent)}</td><td>{row.real.toFixed(1)}%</td><td>{row.budget === undefined ? "No definido" : money(row.budget)}</td><td>{row.budgetShare == null ? "—" : `${row.budgetShare.toFixed(1)}%`}</td></tr>)}</tbody></table></div>
    <div className="wellbeing-chart-grid"><article><h3>% del ingreso por categoría</h3><ResponsiveContainer width="100%" height={Math.max(260, filtered.length * 34)}><BarChart data={filtered} layout="vertical" margin={{left:8,right:24}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={105} tick={{fontSize:11,fill:"#aaa5b7"}}/><Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} /><Bar dataKey="real" fill="#8b72f8" radius={[0,4,4,0]}><LabelList dataKey="real" position="right" formatter={(value) => `${Number(value).toFixed(1)}%`} fill="#c7c1d2" fontSize={10}/></Bar></BarChart></ResponsiveContainer></article><article><h3>Real vs presupuesto vs referencia</h3><ResponsiveContainer width="100%" height={Math.max(260, comparisonRows.length * 42)}><BarChart data={comparisonRows} layout="vertical" margin={{left:8,right:24}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={105} tick={{fontSize:11,fill:"#aaa5b7"}}/><Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} /><Bar dataKey="real" name="Tu real" fill="#8b72f8" radius={3}/><Bar dataKey="budgetShare" name="Tu presupuesto" fill="#4b9ed3" radius={3}/><Bar dataKey="reference" name="Referencia" fill="#777286" radius={3}/></BarChart></ResponsiveContainer></article></div>
    <div className="distribution-2030"><h3>Distribución 50/30/20 · regla de referencia</h3>{distribution.map(item => <div key={item.name}><div><span>{item.name}</span><b>{income ? (item.value / income * 100).toFixed(1) : "0.0"}% · referencia {item.reference}%</b></div><i><em style={{width:`${Math.min(income ? item.value / income * 100 : 0,100)}%`}}/><small style={{left:`${item.reference}%`}}/></i></div>)}</div>
    <div className="wellbeing-summary"><h3>Resumen de distribución</h3><p>Necesidades: {income ? (needs / income * 100).toFixed(1) : "0.0"}% · referencia 50%</p><p>Deseos: {income ? (wants / income * 100).toFixed(1) : "0.0"}% · referencia 30%</p><p>Ahorro: {savingsShare.toFixed(1)}% · referencia 20%</p><p>Disponible: {income ? Math.max(0, (income - expenses - savings - investments) / income * 100).toFixed(1) : "0.0"}%</p><p>Gastos sin presupuesto: {income ? (rows.filter(row => row.budget === undefined).reduce((sum,row) => sum + row.spent, 0) / income * 100).toFixed(1) : "0.0"}%</p></div>
    {savings === 0 ? <div className="saving-alert"><strong>AHORRO NO REGISTRADO</strong><span>No has registrado ahorro este mes.</span></div> : <div className="saving-note">Ahorro registrado: {money(savings)} · {(income ? savings / income * 100 : 0).toFixed(1)}% del ingreso{investments ? ` · Inversión: ${money(investments)}` : ""}</div>}
  </section>;
}
function Dashboard({
  s,
  data,
  expenseOverview,
  budgetedExpenses,
  unbudgetedExpenses,
  budgetAvailable,
  realAvailable,
  remainingBudget,
  totalExpenses,
  plannedDaily,
  realDaily,
  loans,
  analytics,
  benchmarks,
}: {
  s: ReturnType<typeof summary>;
  data: any[];
  expenseOverview: { categoryId: string; name: string; spent: number; hasBudget: boolean }[];
  budgetedExpenses: number;
  unbudgetedExpenses: number;
  budgetAvailable: number;
  realAvailable: number;
  remainingBudget: number;
  totalExpenses: number;
  plannedDaily: { daysRemaining: number; daily: number };
  realDaily: { daysRemaining: number; daily: number };
  loans: number;
  analytics: {
    averageDaily: number;
    budgetedDaily: number;
    unbudgetedDaily: number;
    plannedCapacity: { daily: number; daysRemaining: number };
    spendingRate: number;
    unbudgetedRatio: number;
    savingsRate: number;
    consumptionRate: number;
    deductionRate: number;
    deviations: any[];
    cumulative: { day: number; spent: number }[];
  };
  benchmarks: Benchmark[];
}) {
  const limitedData = data.filter((item) => item.limit !== null);
  const unlimitedData = [
    ...data.filter((item) => item.limit === null),
    ...expenseOverview
      .filter((item) => !item.hasBudget && !data.some((budget) => budget.name === item.name))
      .map((item) => ({ ...item, id: `unbudgeted-${item.name}`, limit: null, remaining: null, percent: null })),
  ];
  const cards = [
    ["Ingresos", s.income, "green"],
    ["Deducciones", s.deductions, "orange"],
    ["Gastos totales", totalExpenses, "red"],
    ["Ahorro", s.savings + s.investments, "purple"],
    ["Préstamos", loans, "loan"],
  ];
  const expenseBars = [...expenseOverview]
    .sort((a, b) => b.spent - a.spent)
    .map((item) => ({
      ...item,
      percentage: totalExpenses ? (item.spent / totalExpenses) * 100 : 0,
      type: item.hasBudget ? "Con presupuesto" : "Sin presupuesto",
    }));
  const topBars = expenseBars.slice(0, 10);
  const otherSpent = expenseBars.slice(10).reduce((total, item) => total + item.spent, 0);
  if (otherSpent > 0) {
    topBars.push({
      categoryId: "other",
      name: "Otros",
      spent: otherSpent,
      hasBudget: false,
      percentage: totalExpenses ? (otherSpent / totalExpenses) * 100 : 0,
      type: "Varias categorías",
    });
  }
  const deviations = [
    ...limitedData
      .filter((item) => item.remaining < 0)
      .map((item) => ({ name: item.name, value: -item.remaining, status: "danger", label: "sobre el límite" })),
    ...unlimitedData
      .filter((item) => item.spent > 0)
      .map((item) => ({ name: item.name, value: item.spent, status: "danger", label: "fuera del presupuesto" })),
    ...limitedData
      .filter((item) => item.remaining >= 0)
      .map((item) => ({ name: item.name, value: item.remaining, status: item.percent >= 75 ? "warn" : "ok", label: "disponibles" })),
  ].sort((a, b) => (a.status === "danger" ? -1 : 1) - (b.status === "danger" ? -1 : 1) || b.value - a.value).slice(0, 5);
  const varianceBars = analytics.deviations.slice(0, 8);
  const analysisRows = expenseOverview.map(item => {
    const budget = data.find(budgetItem => budgetItem.categoryId === item.categoryId && budgetItem.limit !== null)?.limit as number | undefined;
    const benchmark = benchmarks.find(itemBenchmark => itemBenchmark.categoryId === item.categoryId && itemBenchmark.active);
    const comparison = calculateBenchmarkComparison(item.spent, budget, benchmark?.percentage, s.income);
    const category = allCategories.find(itemCategory => itemCategory.id === item.categoryId);
    const group = category?.group === "Ocio" || category?.group === "Cuidado personal" || category?.group === "Mascota" || category?.group === "Suscripciones" ? "want" : "need";
    return { ...item, ...comparison, budget, benchmark, group };
  });
  return (
    <>
      <section className="cards">
        {cards.map(([n, v, c]) => (
          <article className={"card " + c} key={n as string}>
            <p>{n}</p>
            <strong>{money(v as number)}</strong>
            {n === "Gastos totales" && (
              <small className="card-breakdown">
                Con límite {money(budgetedExpenses)} · Sin límite {money(unbudgetedExpenses)}
              </small>
            )}
          </article>
        ))}
      </section>
      <section className="scenario-cards">
        <article className="scenario-card planned">
          <p className="eyebrow">DISPONIBLE PLANIFICADO</p>
          <strong>{money(budgetAvailable)}</strong>
          <span>Solo gastos con límite</span>
        </article>
        <article className="scenario-card real">
          <p className="eyebrow">DISPONIBLE REAL</p>
          <strong>{money(realAvailable)}</strong>
          <span>Incluye todos los gastos</span>
        </article>
        <article className="scenario-card impact">
          <p className="eyebrow">IMPACTO FUERA DEL PRESUPUESTO</p>
          <strong>-{money(unbudgetedExpenses)}</strong>
          <span>Gastos sin límite</span>
        </article>
      </section>
      <div className="available-notes">
        <span>Los escenarios de disponible no reemplazan el presupuesto restante.</span>
      </div>
      <section className="split">
        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CONTROL DEL MES</p>
              <h2>Presupuesto</h2>
            </div>
            <b>
              {money(remainingBudget)} presupuesto restante (solo gastos)
            </b>
          </div>
          {s.savings + s.investments === 0 && (
            <div className="saving-alert">
              <strong>Falta registrar el ahorro</strong>
              <span>El presupuesto restante no incluye ahorro hasta que registres un movimiento de ahorro o inversión.</span>
            </div>
          )}
          <div className="control-summary">
            <div><span>Gasto con presupuesto</span><b>{money(budgetedExpenses)}</b></div>
            <div><span>Gasto sin presupuesto</span><b>{money(unbudgetedExpenses)}</b></div>
            <div><span>Gasto total</span><b>{money(totalExpenses)}</b></div>
            <div><span>Ahorro registrado</span><b>{money(s.savings + s.investments)}</b></div>
          </div>
          <div className="budget-columns">
            <div className="budget-column">
              <h3 className="budget-section-title">Con límite</h3>
              <div className="budget-list">
                {limitedData.map((x) => (
                  <div className="budget-row" key={x.id}>
                    <div className="line">
                      <b>{x.name}</b>
                      <span>
                        {money(x.spent)} / {money(x.limit)}
                      </span>
                    </div>
                    <div className="progress">
                      <i
                        style={{ width: `${Math.min(x.percent ?? 0, 100)}%` }}
                        className={
                          x.percent !== null && x.percent >= 100
                            ? "danger"
                            : x.percent !== null && x.percent >= 75
                              ? "warn"
                              : ""
                        }
                      />
                    </div>
                    <small className={x.remaining !== null && x.remaining < 0 ? "bad" : ""}>
                      {x.remaining !== null && x.remaining < 0
                        ? `Excedido en ${money(-x.remaining)}`
                        : `Disponible ${money(x.remaining)}`} {" "}
                      · {x.percent?.toFixed(0)}%
                    </small>
                  </div>
                ))}
              </div>
            </div>
            <div className="budget-column">
              <h3 className="budget-section-title">Sin límite</h3>
              <div className="budget-list">
                {unlimitedData.length > 0 ? unlimitedData.map((x) => (
                  <div className="budget-row" key={x.id}>
                    <div className="line">
                      <b>{x.name}</b>
                      <span>{money(x.spent)}</span>
                    </div>
                    <div className="progress">
                      <i className="unlimited" />
                    </div>
                    <small>Sin límite definido</small>
                  </div>
                )) : <p className="budget-empty">No hay categorías sin presupuesto.</p>}
              </div>
            </div>
          </div>
        </article>
        <article className="panel chart">
          <h2>Gastos del mes</h2>
          <p className="chart-caption">Ordenados de mayor a menor · azul: con presupuesto · coral: sin presupuesto</p>
          {topBars.length ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(300, topBars.length * 42)}>
                <BarChart data={topBars} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={112} tick={{ fill: "#a09caf", fontSize: 11 }} />
                  <Tooltip content={<ExpenseTooltip />} />
                  <Bar dataKey="spent" radius={[0, 5, 5, 0]}>
                    {topBars.map((item) => (
                      <Cell fill={item.hasBudget ? "#4b9ed3" : "#e67882"} key={item.name} />
                    ))}
                    <LabelList dataKey="spent" position="right" formatter={(value) => money(Number(value))} fill="#c5c0cf" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend"><span><i className="budget-dot" />Con límite</span><span><i className="unbudget-dot" />Sin límite</span></div>
            </>
          ) : <p className="empty">No hay gastos registrados este mes.</p>}
        </article>
      </section>
      <WellbeingAnalysis income={s.income} expenses={totalExpenses} savings={s.savings} investments={s.investments} rows={analysisRows.sort((a,b) => b.real - a.real)} benchmarks={benchmarks} />
      <section className="analysis-grid">
        <article className="panel">
          <p className="eyebrow">PRINCIPALES DESVIACIONES</p>
          <h2>Lo que más afecta tu planificación</h2>
          <div className="deviation-list">
            {deviations.map((item) => (
              <div className="deviation" key={item.name}>
                <i className={item.status} />
                <div><b>{item.name}</b><span>{money(item.value)} {item.label}</span></div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">RESUMEN DEL MES</p>
          <h2>En pocas palabras</h2>
          <div className="metric-grid">
            <div><span>Gasto diario promedio</span><b>{money(analytics.averageDaily)} / día</b></div>
            <div><span>Gasto diario con límite</span><b>{money(analytics.budgetedDaily)} / día</b></div>
            <div><span>Gasto diario sin límite</span><b>{money(analytics.unbudgetedDaily)} / día</b></div>
            <div><span>Gasto fuera del presupuesto</span><b>{(analytics.unbudgetedRatio * 100).toFixed(1)}%</b></div>
            <div><span>Tasa de ahorro</span><b>{(analytics.savingsRate * 100).toFixed(1)}%</b></div>
            <div><span>Tasa de consumo</span><b>{(analytics.consumptionRate * 100).toFixed(1)}%</b></div>
            <div><span>Tasa de deducciones</span><b>{(analytics.deductionRate * 100).toFixed(1)}%</b></div>
          </div>
          <div className="distribution-block">
            <div className="distribution-head"><b>DISTRIBUCIÓN DEL GASTO</b><span>Con límite {(totalExpenses ? budgetedExpenses / totalExpenses * 100 : 0).toFixed(1)}% · Sin límite {(totalExpenses ? unbudgetedExpenses / totalExpenses * 100 : 0).toFixed(1)}%</span></div>
            <div className="distribution-bar"><i style={{ width: `${totalExpenses ? budgetedExpenses / totalExpenses * 100 : 0}%` }} /><i style={{ width: `${totalExpenses ? unbudgetedExpenses / totalExpenses * 100 : 0}%` }} /></div>
          </div>
          <div className="summary-list">
            <p>Has gastado <b>{money(totalExpenses)}</b> este mes.</p>
            <p><b>{money(unbudgetedExpenses)}</b> corresponden a gastos sin límite.</p>
            <p>Tu disponible real es <b>{money(realAvailable)}</b>.</p>
          </div>
          <div className="daily-summary">
            <b>CAPACIDAD DIARIA PLANIFICADA</b>
            <span>{analytics.plannedCapacity.daily < 0 ? "Ya estás por encima del disponible proyectado." : `${money(analytics.plannedCapacity.daily)} / día`}</span>
            <span>Ritmo real: {analytics.spendingRate > 0 ? `${(analytics.spendingRate * 100).toFixed(1)}% por encima de lo planificado` : `${Math.abs(analytics.spendingRate * 100).toFixed(1)}% por debajo de lo planificado`}</span>
          </div>
        </article>
      </section>
      <section className="split">
        <article className="panel chart">
          <h2>Presupuesto vs. gasto real</h2>
          <p className="chart-caption">Ordenado por mayor desviación absoluta</p>
          <ResponsiveContainer width="100%" height={Math.max(260, varianceBars.length * 42)}>
            <BarChart data={varianceBars} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={112} tick={{ fill: "#a09caf", fontSize: 11 }} />
              <Tooltip formatter={(value) => money(Number(value || 0))} />
              <Bar dataKey="limit" name="Presupuesto" fill="#7060d9" radius={4} />
              <Bar dataKey="spent" name="Gasto real" fill="#e67882" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="panel insights">
          <p className="eyebrow">INSIGHTS</p>
          <h2>Lo importante este mes</h2>
          {data
            .filter((x) => x.percent !== null && x.percent >= 75)
            .slice(0, 3)
            .map((x) => (
              <p key={x.id}>
                • Has utilizado el {x.percent?.toFixed(0)}% del presupuesto de{" "}
                <b>{x.name}</b>.
              </p>
            ))}
          <p>
            • Tu tasa de ahorro es <b>{(s.savingsRate * 100).toFixed(1)}%</b>.
          </p>
        </article>
      </section>
      <section className="panel chart cumulative-panel">
        <p className="eyebrow">RITMO ACUMULADO DEL MES</p>
        <h2>¿Estoy gastando más rápido de lo planificado?</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analytics.cumulative.map((item) => ({ ...item, expected: totalExpenses ? budgetedExpenses * item.day / analytics.cumulative.length : 0 }))}>
            <XAxis dataKey="day" />
            <YAxis tickFormatter={(value) => `${value / 1000}k`} />
            <Tooltip formatter={(value) => money(Number(value || 0))} />
            <Legend />
            <Line dataKey="spent" name="Gasto acumulado real" stroke="#e67882" strokeWidth={3} dot={false} />
            <Line dataKey="expected" name="Trayectoria planificada" stroke="#7060d9" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}
function Movements({
  transactions,
  month,
  categories,
  search,
  setSearch,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  month: string;
  categories: Category[];
  search: string;
  setSearch: (x: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const rows = transactions.filter(
    (t) =>
      t.date.startsWith(month) &&
      `${t.description}${t.categoryId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">REGISTRO DEL MES</p>
          <h2>Movimientos</h2>
        </div>
        <label className="search">
          <Search />
          <input
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="table">
        {rows.map((t) => {
          const c = categories.find((c) => c.id === t.categoryId);
          return (
            <div className="tx" key={t.id}>
              <div className={"dot " + t.type} />
              <div>
                <b>{t.description}</b>
                <small>
                  {c?.name || "Sin categoría"} ·{" "}
                  {new Date(t.date + "T12:00").toLocaleDateString("es-CO")}
                </small>
              </div>
              <strong className={t.type === "income" ? "income" : ""}>
                {t.type === "income" ? "+" : "−"} {money(t.amount)}
              </strong>
              <button
                className="edit"
                onClick={() => onEdit(t)}
                title="Editar"
              >
                <Pencil />
              </button>
              <button
                className="delete"
                onClick={() => onDelete(t.id)}
                title="Eliminar"
              >
                <Trash2 />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function BudgetView({
  data,
  expenseOverview,
  month,
  categories,
  onAdd,
  onRemove,
  onChange,
  income,
  deductions,
  loans,
  savings,
  budgetCapacity,
  budgetLimits,
  budgetUnassigned,
}: {
  data: any[];
  expenseOverview: { categoryId: string; name: string; spent: number; hasBudget: boolean }[];
  month: string;
  categories: Category[];
  onAdd: (categoryId: string, limit: number | null) => void;
  onRemove: (id: string) => void;
  onChange: (id: string, limit: number | null) => void;
  income: number;
  deductions: number;
  loans: number;
  savings: number;
  budgetCapacity: number;
  budgetLimits: number;
  budgetUnassigned: number;
}) {
  const available = byName(
    categories.filter(
      (category) => !data.some((item) => item.categoryId === category.id),
    ),
  );
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [filter, setFilter] = useState<"all" | "budgeted" | "unbudgeted">("all");
  const [search, setSearch] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [sort, setSort] = useState("usage");
  const addBudget = () => {
    if (!categoryId || (limit !== "" && Number(limit) < 0)) return;
    onAdd(categoryId, limit === "" ? null : Number(limit));
    setCategoryId("");
    setLimit("");
  };
  const budgetCategoryIds = new Set(data.map((item) => item.categoryId));
  const unbudgetedRows = expenseOverview
    .filter((item) => !item.hasBudget && !budgetCategoryIds.has(item.categoryId))
    .map((item) => ({ ...item, id: `unbudgeted-${item.categoryId}`, limit: null, remaining: null, percent: null }));
  const rows = [...data, ...unbudgetedRows];
  const visibleRows = rows
    .filter((item) => filter === "all" || (filter === "budgeted" ? item.limit !== null : item.limit === null))
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "spent") return b.spent - a.spent;
      if (sort === "usage") return (b.percent ?? -1) - (a.percent ?? -1);
      if (sort === "low-usage") return (a.percent ?? 101) - (b.percent ?? 101);
      return (b.limit === null ? 0 : Math.abs(b.spent - b.limit)) - (a.limit === null ? 0 : Math.abs(a.spent - a.limit));
    });
  const budgetedCount = rows.filter((item) => item.limit !== null).length;
  const unbudgetedCount = rows.filter((item) => item.limit === null).length;
  const usedTotal = data.reduce((total, item) => total + item.spent, 0);
  const allocationRate = getBudgetAllocationRate(budgetLimits, budgetCapacity);
  const statusFor = (item: any) => item.limit === null ? "Sin presupuesto" : item.percent >= 100 ? "Excedido" : item.percent >= 90 ? "Al límite" : item.percent >= 75 ? "Cerca del límite" : "Dentro del límite";
  const categoryIcon = (name: string) => ({ Alimentación: "🛒", Arriendo: "🏠", Amoblar: "🛋️", Administración: "🏢", Servicios: "⚡", Internet: "📶", Gasolina: "🚗", Salidas: "🎉" } as Record<string, string>)[name] || "•";
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">LÍMITES MENSUALES</p>
          <h2>Presupuesto</h2>
        </div>
        <span className="month-label">{month}</span>
      </div>
      <section className="budget-summary-card">
        <div className="budget-donut" style={{ background: `conic-gradient(#7968f2 ${Math.max(0, Math.min(allocationRate, 100))}%, #363244 0)` }}><div><strong>{Math.max(0, allocationRate).toFixed(1)}%</strong><span>asignado</span></div></div>
        <div className="budget-summary-main"><p className="eyebrow">RESUMEN DEL PRESUPUESTO</p><h2>Capacidad presupuestable</h2><div className="budget-summary-values"><div><span>Capacidad presupuestable</span><b>{money(budgetCapacity)}</b></div><div><span>Topes definidos</span><b>{money(budgetLimits)}</b></div><div><span>Asignado</span><b>{Math.max(0, allocationRate).toFixed(1)}%</b></div><div><span>Sin asignar</span><b>{money(budgetUnassigned)}</b></div><div><span>Categorías activas</span><b>{budgetedCount} de {rows.length}</b></div></div></div>
      </section>
      <div className="add-budget budget-add-card">
        <div><p className="eyebrow">NUEVA ASIGNACIÓN</p><h3>Agregar categoría al presupuesto</h3></div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Selecciona una categoría</option>
          {available.map((category) => (
            <option value={category.id} key={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={limit}
          placeholder="$ 0"
          onChange={(e) => setLimit(e.target.value)}
        />
        <span className="budget-frequency">Mensual</span>
        <button
          className="save"
          type="button"
          onClick={addBudget}
          disabled={!categoryId}
        >
          + Agregar presupuesto
        </button>
      </div>
      <div className={`budget-health ${budgetLimits > budgetCapacity ? "over" : "ok"}`}>
        <div>
          <strong>Capacidad para presupuestar</strong>
          <span>Tu presupuesto se calcula después de separar deducciones, préstamos y ahorro/inversión.</span>
        </div>
        <div className="budget-flow">
          <div><span>Ingresos</span><b>{money(income)}</b></div><i>−</i><div><span>Deducciones</span><b>{money(Math.max(deductions - loans, 0))}</b></div><i>−</i><div><span>Préstamos</span><b>{money(loans)}</b></div><i>−</i><div><span>Ahorro / inversión</span><b>{money(savings)}</b></div><i>=</i><div className="budget-capacity-final"><span>Capacidad presupuestable</span><b>{money(budgetCapacity)}</b></div>
        </div>
        <strong>{budgetLimits > budgetCapacity ? `Los topes superan en ${money(budgetLimits - budgetCapacity)} el dinero disponible.` : `Quedan ${money(budgetUnassigned)} de capacidad sin asignar.`}</strong>
        <div className="capacity-progress"><i style={{width:`${Math.max(0, Math.min(allocationRate,100))}%`}} /></div><div className="capacity-progress-labels"><span>{Math.max(0, allocationRate).toFixed(1)}% asignado</span><span>{Math.max(0, 100 - allocationRate).toFixed(1)}% disponible</span></div>
      </div>
      <div className="budget-toolbar"><div className="budget-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas <b>{rows.length}</b></button><button className={filter === "budgeted" ? "active" : ""} onClick={() => setFilter("budgeted")}>Con presupuesto <b>{budgetedCount}</b></button><button className={filter === "unbudgeted" ? "active" : ""} onClick={() => setFilter("unbudgeted")}>Sin presupuesto <b>{unbudgetedCount}</b></button></div><div className="budget-tools"><input placeholder="Buscar categoría..." value={search} onChange={(event) => setSearch(event.target.value)} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="usage">Orden: Mayor %</option><option value="spent">Mayor gasto</option><option value="low-usage">Menor % utilizado</option><option value="deviation">Mayor desviación</option><option value="name">Nombre A-Z</option></select></div></div>
      <div className="budget-table budget-table-modern">
        <div className="thead">
          <span>Categoría</span>
          <span>Presupuesto</span>
          <span>Gastado</span>
          <span>Disponible</span>
          <span>Uso</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>
        {visibleRows.map((x) => (
          <div className="tr budget-row-actions" key={x.id}>
            <b className="budget-category-name"><i>{categoryIcon(x.name)}</i>{x.name}</b>
            <div className="budget-cell">{x.limit === null ? <span>Sin presupuesto</span> : <><input
              type="number"
              min="0"
              value={x.limit ?? ""}
              readOnly={editingBudgetId !== x.id}
              id={`budget-limit-${x.id}`}
              placeholder="Sin límite"
              onChange={(e) =>
                onChange(x.id, e.target.value === "" ? null : Number(e.target.value))
              }
              /><small>{x.limit === null ? "—" : `${(getCategoryBudgetRate(x.limit, budgetCapacity) ?? 0).toFixed(1)}% de capacidad`}</small></>}</div>
            <div className="budget-cell"><span>{money(x.spent)}</span><small>{`${getCategorySpentRate(x.spent, budgetCapacity).toFixed(1)}% de capacidad`}</small></div>
            <span className={x.remaining !== null && x.remaining < 0 ? "bad" : ""}>
              {x.remaining === null ? "Sin límite" : money(x.remaining)}
            </span>
            <div className="usage-cell">{x.percent === null ? "—" : <><div className="mini-progress"><i style={{ width: `${Math.min(x.percent, 100)}%` }} /></div><small>{x.percent.toFixed(0)}%</small></>}</div>
            <span className={`budget-status status-${statusFor(x).replaceAll(" ", "-").toLowerCase()}`}>{statusFor(x)}</span>
            <div className="budget-actions">
              <button className="edit" onClick={() => { setEditingBudgetId(x.id); document.getElementById(`budget-limit-${x.id}`)?.focus(); }} disabled={x.limit === null} title="Modificar presupuesto"><Pencil /></button>
              <button className="delete-category" onClick={() => x.limit !== null && onRemove(x.id)} disabled={x.limit === null} title="Eliminar presupuesto"><Trash2 /></button>
            </div>
          </div>
        ))}
      </div>
      {unbudgetedCount > 0 && <div className="unbudgeted-info"><div><strong>Categorías sin presupuesto ({unbudgetedCount})</strong><span>Estas categorías no tienen un límite mensual definido. No afectan el total presupuestado, pero sí afectan tu disponible real.</span></div><button onClick={() => setFilter("unbudgeted")}>Ver categorías sin presupuesto →</button></div>}
    </section>
  );
}
function HistoryView({ transactions }: { transactions: Transaction[] }) {
  const months = ["2026-07", "2026-08", "2026-09"];
  const data = months.map((month) => summary(transactions, month));
  return (
    <section className="panel">
      <p className="eyebrow">COMPARA TU PROGRESO</p>
      <h2>Histórico financiero</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(x) => `${x / 1e6}M`} />
          <Tooltip formatter={(v) => money(Number(v || 0))} />
          <Legend />
          <Line
            dataKey="income"
            name="Ingresos"
            stroke="#705cf6"
            strokeWidth={3}
          />
          <Line
            dataKey="expenses"
            name="Gastos"
            stroke="#ef6b73"
            strokeWidth={3}
          />
          <Line
            dataKey="savings"
            name="Ahorro"
            stroke="#39b68a"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="budget-table">
        <div className="thead">
          <span>Mes</span>
          <span>Ingresos</span>
          <span>Gastos</span>
          <span>Ahorro</span>
          <span>Disponible</span>
        </div>
        {data.map((x) => (
          <div className="tr" key={x.month}>
            <b>
              {new Date(x.month + "-02T12:00").toLocaleDateString("es-CO", {
                month: "long",
                year: "numeric",
              })}
            </b>
            <span>{money(x.income)}</span>
            <span>{money(x.expenses)}</span>
            <span>{money(x.savings + x.investments)}</span>
            <span>{money(x.available)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
function Secondary({
  tab,
  transactions,
  setTransactions,
  budgets,
  setBudgets,
  categories,
  setCategories,
  benchmarks,
  setBenchmarks,
}: {
  tab: string;
  transactions: Transaction[];
  setTransactions: (x: Transaction[]) => void;
  budgets: Budget[];
  setBudgets: (x: Budget[]) => void;
  categories: Category[];
  setCategories: (x: Category[]) => void;
  benchmarks: Benchmark[];
  setBenchmarks: (x: Benchmark[]) => void;
}) {
  const [categoryName, setCategoryName] = useState("");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [benchmarkDraft, setBenchmarkDraft] = useState({ categoryId: "food", percentage: "9.7", source: "", year: "2025", country: "", population: "", type: "Gasto observado" });
  const exportJSON = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify({ transactions, budgets, benchmarks }, null, 2)], {
        type: "application/json",
      }),
    );
    a.download = "respaldo-finanzas.json";
    a.click();
  };
  const removeCategory = (category: Category) => {
    if (
      !window.confirm(
        `¿Eliminar “${category.name}”? También se quitará de tu presupuesto. Los movimientos existentes se conservarán en el histórico.`,
      )
    )
      return;
    localStorage.setItem(
      "fp-categories",
      JSON.stringify(
        activeCategories.filter((item) => item.id !== category.id),
      ),
    );
    localStorage.setItem(
      "fp-budgets",
      JSON.stringify(budgets.filter((item) => item.categoryId !== category.id)),
    );
    window.location.reload();
  };
  const addCategory = () => {
    const name = categoryName.trim();
    const group = categoryGroup.trim() || "Otros";
    if (!name) {
      setCategoryError("Escribe un nombre para la categoría.");
      return;
    }
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError("Ya existe una categoría con ese nombre.");
      return;
    }
    const category = { id: `custom-${crypto.randomUUID()}`, name, group, type: "expense" as const };
    setCategories([...categories, category]);
    setCategoryName("");
    setCategoryGroup("");
    setCategoryError("");
  };
  const updateBenchmark = (benchmark: Benchmark, field: keyof Benchmark, value: string | number | boolean) => setBenchmarks(benchmarks.map(item => item.id === benchmark.id ? { ...item, [field]: value } : item));
  const addBenchmark = () => { if (!benchmarkDraft.source || !benchmarkDraft.percentage) return; setBenchmarks([...benchmarks, { id: `benchmark-${crypto.randomUUID()}`, categoryId: benchmarkDraft.categoryId, percentage: Number(benchmarkDraft.percentage), source: benchmarkDraft.source, year: Number(benchmarkDraft.year), country: benchmarkDraft.country, population: benchmarkDraft.population, type: benchmarkDraft.type, active: true }]); };
  if (tab === "Categorías")
    return (
      <section className="panel">
        <p className="eyebrow">GESTIÓN DE CATEGORÍAS</p>
        <h2>Categorías disponibles</h2>
        <p className="empty">
          Eliminar una categoría también la retira del presupuesto. Sus
          movimientos anteriores se conservan.
        </p>
        <form
          className="category-form"
          onSubmit={(event) => {
            event.preventDefault();
            addCategory();
          }}
        >
          <input
            aria-label="Nombre de categoría"
            placeholder="Nombre de categoría"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
          />
          <input
            aria-label="Grupo de categoría"
            placeholder="Grupo (opcional)"
            value={categoryGroup}
            onChange={(event) => setCategoryGroup(event.target.value)}
          />
          <button className="save" type="submit">
            <Plus /> Agregar categoría
          </button>
          {categoryError && <small className="bad">{categoryError}</small>}
        </form>
        <div className="category-grid">
          {activeCategories.map((category) => (
            <div className="category-card" key={category.id}>
              <div>
                <b>{category.name}</b>
                <span>{category.group}</span>
              </div>
              <button
                className="delete-category"
                onClick={() => removeCategory(category)}
                title={`Eliminar ${category.name}`}
              >
                <Trash2 /> Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  return (
    <section className="panel">
      <p className="eyebrow">{tab.toUpperCase()}</p>
      <h2>
        {tab === "Configuración"
          ? "Tus datos, siempre contigo"
          : "Movimientos programados"}
      </h2>
      {tab === "Configuración" ? (
        <div className="settings">
          <div className="benchmark-settings">
            <p className="eyebrow">BENCHMARKS FINANCIEROS</p><h3>Referencias externas configurables</h3><p className="empty">Las referencias son comparaciones documentadas, no reglas universales ni recomendaciones.</p>
            <div className="benchmark-form"><select value={benchmarkDraft.categoryId} onChange={event => setBenchmarkDraft({...benchmarkDraft, categoryId:event.target.value})}>{byName(categories.filter(category => category.type === "expense")).map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select><input type="number" min="0" max="100" placeholder="%" value={benchmarkDraft.percentage} onChange={event => setBenchmarkDraft({...benchmarkDraft, percentage:event.target.value})}/><input placeholder="Fuente" value={benchmarkDraft.source} onChange={event => setBenchmarkDraft({...benchmarkDraft, source:event.target.value})}/><input type="number" placeholder="Año" value={benchmarkDraft.year} onChange={event => setBenchmarkDraft({...benchmarkDraft, year:event.target.value})}/><button className="save" onClick={addBenchmark}>Agregar</button></div>
            <div className="benchmark-table"><div className="benchmark-head"><span>Categoría</span><span>%</span><span>Fuente</span><span>Año</span><span>País / población</span><span>Activo</span></div>{benchmarks.map(benchmark => <div className="benchmark-row" key={benchmark.id}><b>{categories.find(category => category.id === benchmark.categoryId)?.name || benchmark.categoryId}</b><input type="number" min="0" max="100" value={benchmark.percentage} onChange={event => updateBenchmark(benchmark,"percentage",Number(event.target.value))}/><input value={benchmark.source} onChange={event => updateBenchmark(benchmark,"source",event.target.value)}/><input type="number" value={benchmark.year} onChange={event => updateBenchmark(benchmark,"year",Number(event.target.value))}/><input value={benchmark.country} placeholder="País" onChange={event => updateBenchmark(benchmark,"country",event.target.value)}/><input type="checkbox" checked={benchmark.active} onChange={event => updateBenchmark(benchmark,"active",event.target.checked)}/></div>)}</div>
          </div>
          <button onClick={exportJSON}>
            <Download /> Crear respaldo JSON
          </button>
          <label>
            <Upload /> Importar respaldo
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  f.text().then((x) => {
                    const d = JSON.parse(x);
                    setTransactions(d.transactions || []);
                    setBudgets(d.budgets || []);
                    setBenchmarks(d.benchmarks || []);
                  });
              }}
            />
          </label>
          <button
            className="danger-btn"
            onClick={() => {
              setTransactions(transactions.filter((t) => !t.demo));
              setBudgets([]);
            }}
          >
            <Trash2 /> Eliminar datos de demostración
          </button>
        </div>
      ) : (
        <p className="empty">
          Configura ingresos y gastos periódicos. Próximamente se copiarán al
          iniciar cada mes.
        </p>
      )}
    </section>
  );
}
function TransactionModal({
  month,
  categories,
  initialType,
  initialTransaction,
  onClose,
  onSave,
}: {
  month: string;
  categories: Category[];
  initialType: TransactionType;
  initialTransaction?: Transaction;
  onClose: () => void;
  onSave: (x: any) => void;
}) {
  const [type, setType] = useState<TransactionType>(initialType),
    [amount, setAmount] = useState(initialTransaction ? String(initialTransaction.amount) : ""),
    [categoryId, setCategoryId] = useState(initialTransaction?.categoryId || "food"),
    [description, setDescription] = useState(initialTransaction?.description || ""),
    [date, setDate] = useState(initialTransaction?.date || `${month}-01`),
    [error, setError] = useState("");
  const choices = byName(
    categories.filter((c) =>
      type === "income"
        ? true
        : type === "deduction"
        ? c.type === "deduction"
        : type === "savings" || type === "investment"
          ? c.type === "savings"
          : c.type === "expense",
    ),
  );
  useEffect(
    () =>
      setCategoryId(
        initialTransaction && type === initialTransaction.type
          ? initialTransaction.categoryId
          : choices[0]?.id || "",
      ),
    [type],
  );
  const save = () => {
    if (!amount || Number(amount) <= 0 || !description) {
      setError("Ingresa una descripción y un valor mayor a cero.");
      return;
    }
    onSave({
      date,
      type,
      categoryId,
      description,
      amount: Number(amount),
      account: "Cuenta principal",
      paymentMethod: "Débito",
      notes: "",
    });
  };
  return (
    <div className="overlay">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <button type="button" className="close" onClick={onClose}>
          <X />
        </button>
        <p className="eyebrow">{initialTransaction ? "EDITAR MOVIMIENTO" : "REGISTRO RÁPIDO"}</p>
        <h2>{initialTransaction ? "Editar movimiento" : "Nuevo movimiento"}</h2>
        <label>
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
          >
            {[
              ["expense", "Gasto"],
              ["income", "Ingreso"],
              ["deduction", "Deducción"],
              ["savings", "Ahorro"],
              ["investment", "Inversión"],
              ["debt", "Pago de deuda"],
            ].sort(([, a], [, b]) => a.localeCompare(b, "es")).map(([v, n]) => (
              <option value={v} key={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Valor
          <input
            autoFocus
            inputMode="numeric"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ej. 45000"
          />
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Categoría
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {choices.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Descripción
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Restaurante"
          />
        </label>
        {error && <small className="bad">{error}</small>}
        <button className="save">Guardar movimiento</button>
      </form>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
