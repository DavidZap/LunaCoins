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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { allCategories, demoBudgets, demoTransactions } from "./data";
import {
  budgetStatus,
  calculateBudgetScenarioAvailable,
  calculateBudgetedExpenses,
  calculateRealAvailable,
  calculateRemainingBudget,
  calculateUnbudgetedExpenses,
  money,
  summary,
} from "./finance";
import type { Budget, Category, Transaction, TransactionType } from "./types";
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
    [dark, setDark] = useState(() => load("fp-dark", false)),
    [modal, setModal] = useState(false),
    [search, setSearch] = useState("");
  activeCategories = categoryItems;
  useEffect(() => {
    localStorage.setItem("fp-tx", JSON.stringify(transactions));
    localStorage.setItem("fp-budgets", JSON.stringify(budgets));
    localStorage.setItem("fp-categories", JSON.stringify(categoryItems));
    localStorage.setItem("fp-dark", JSON.stringify(dark));
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [transactions, budgets, categoryItems, dark]);
  const s = useMemo(() => summary(transactions, month), [transactions, month]);
  const monthly = transactions.filter((t) => t.date.startsWith(month));
  const expenseOverview = monthly
    .filter((transaction) => transaction.type === "expense" || transaction.type === "debt")
    .reduce<{ name: string; spent: number; hasBudget: boolean }[]>((items, transaction) => {
      const category = categoryItems.find((item) => item.id === transaction.categoryId);
      if (category?.active === false) return items;
      const current = items.find((item) => item.name === (category?.name || "Sin categoría"));
      const hasBudget = budgets.some(
        (budget) =>
          budget.month === month &&
          budget.categoryId === transaction.categoryId &&
          budget.limit !== null,
      );
      if (current) current.spent += transaction.amount;
      else items.push({ name: category?.name || "Sin categoría", spent: transaction.amount, hasBudget });
      return items;
    }, [])
    .filter((category) => category.spent > 0);
  const budgetedExpenses = calculateBudgetedExpenses(transactions, budgets, month);
  const unbudgetedExpenses = calculateUnbudgetedExpenses(transactions, budgets, month);
  const budgetAvailable = calculateBudgetScenarioAvailable(transactions, budgets, month);
  const realAvailable = calculateRealAvailable(transactions, budgets, month);
  const remainingBudget = calculateRemainingBudget(transactions, budgets, month);
  const expenseByCat = budgets
    .filter(
      (b) =>
        b.month === month &&
        categoryItems.some((c) => c.id === b.categoryId && c.active !== false),
    )
    .map((b) => {
      const c = categoryItems.find((c) => c.id === b.categoryId)!;
      const spent = monthly
        .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
        .reduce((a, t) => a + t.amount, 0);
      return { ...b, name: c.name, spent, ...budgetStatus(spent, b.limit) };
    });
  const add = (v: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    setTransactions((a) => [
      { ...v, id: crypto.randomUUID(), createdAt: now, updatedAt: now },
      ...a,
    ]);
    setModal(false);
  };
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span>f</span> finanzas
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
          />
        )}{" "}
        {tab === "Movimientos" && (
          <Movements
            transactions={transactions}
            month={month}
            categories={categoryItems}
            search={search}
            setSearch={setSearch}
            onDelete={(id) =>
              setTransactions((x) => x.filter((t) => t.id !== id))
            }
          />
        )}{" "}
        {tab === "Presupuesto" && (
          <BudgetView
            data={expenseByCat}
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
          />
        )}
      </main>
      <button className="new" onClick={() => setModal(true)}>
        <Plus /> <span>Nuevo movimiento</span>
      </button>
      {modal && (
        <TransactionModal
          month={month}
          categories={categoryItems}
          onClose={() => setModal(false)}
          onSave={add}
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
function Dashboard({
  s,
  data,
  expenseOverview,
  budgetedExpenses,
  unbudgetedExpenses,
  budgetAvailable,
  realAvailable,
  remainingBudget,
}: {
  s: ReturnType<typeof summary>;
  data: any[];
  expenseOverview: { name: string; spent: number; hasBudget: boolean }[];
  budgetedExpenses: number;
  unbudgetedExpenses: number;
  budgetAvailable: number;
  realAvailable: number;
  remainingBudget: number;
}) {
  const limitedData = data.filter((item) => item.limit !== null);
  const unlimitedData = data.filter((item) => item.limit === null);
  const cards = [
    ["Ingresos", s.income, "green"],
    ["Deducciones", s.deductions, "orange"],
    ["Gastos con presupuesto", budgetedExpenses, "red"],
    ["Gastos sin presupuesto", unbudgetedExpenses, "red-light"],
    ["Ahorro", s.savings + s.investments, "purple"],
    ["Disponible presupuestado", budgetAvailable, "blue"],
    ["Disponible real", realAvailable, "blue-dark"],
  ];
  const totalExpenses = budgetedExpenses + unbudgetedExpenses;
  const expenseBars = [...expenseOverview]
    .sort((a, b) => b.spent - a.spent)
    .map((item) => ({
      ...item,
      percentage: totalExpenses ? (item.spent / totalExpenses) * 100 : 0,
      type: item.hasBudget ? "Con presupuesto" : "Sin presupuesto",
    }));
  return (
    <>
      <section className="cards">
        {cards.map(([n, v, c]) => (
          <article className={"card " + c} key={n as string}>
            <p>{n}</p>
            <strong>{money(v as number)}</strong>
          </article>
        ))}
      </section>
      <div className="available-notes">
        <span>Presupuestado: considera solo gastos con límite.</span>
        <span>Real: incluye todos los gastos.</span>
        <b>Impacto sin presupuesto: -{money(unbudgetedExpenses)}</b>
      </div>
      <section className="split">
        <article className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CONTROL DEL MES</p>
              <h2>Presupuesto</h2>
            </div>
            <b>
              {money(remainingBudget)} presupuesto restante
            </b>
          </div>
          <div className="budget-columns">
            <div className="budget-column">
              <h3 className="budget-section-title">Con presupuesto</h3>
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
              <h3 className="budget-section-title">Sin presupuesto</h3>
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
                    <small>Gastado sin límite</small>
                  </div>
                )) : <p className="budget-empty">No hay categorías sin presupuesto.</p>}
              </div>
            </div>
          </div>
        </article>
        <article className="panel chart">
          <h2>Gastos del mes</h2>
          <p className="chart-caption">Ordenados de mayor a menor · azul: con presupuesto · coral: sin presupuesto</p>
          {expenseBars.length ? (
            <ResponsiveContainer width="100%" height={Math.max(300, expenseBars.length * 42)}>
              <BarChart data={expenseBars} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={112} tick={{ fill: "#a09caf", fontSize: 11 }} />
                <Tooltip content={<ExpenseTooltip />} />
                <Bar dataKey="spent" radius={[0, 5, 5, 0]}>
                  {expenseBars.map((item) => (
                    <Cell fill={item.hasBudget ? "#4b9ed3" : "#e67882"} key={item.name} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty">No hay gastos registrados este mes.</p>}
        </article>
      </section>
      <section className="split">
        <article className="panel chart">
          <h2>Presupuesto vs. gasto real</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={limitedData}>
              <XAxis dataKey="name" hide />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => money(Number(v || 0))} />
              <Bar dataKey="limit" fill="#dedbf9" radius={5} />
              <Bar dataKey="spent" fill="#705cf6" radius={5} />
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
    </>
  );
}
function Movements({
  transactions,
  month,
  categories,
  search,
  setSearch,
  onDelete,
}: {
  transactions: Transaction[];
  month: string;
  categories: Category[];
  search: string;
  setSearch: (x: string) => void;
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
  month,
  categories,
  onAdd,
  onRemove,
  onChange,
}: {
  data: any[];
  month: string;
  categories: Category[];
  onAdd: (categoryId: string, limit: number | null) => void;
  onRemove: (id: string) => void;
  onChange: (id: string, limit: number | null) => void;
}) {
  const available = byName(
    categories.filter(
      (category) => !data.some((item) => item.categoryId === category.id),
    ),
  );
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const addBudget = () => {
    if (!categoryId || (limit !== "" && Number(limit) < 0)) return;
    onAdd(categoryId, limit === "" ? null : Number(limit));
    setCategoryId("");
    setLimit("");
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">LÍMITES MENSUALES</p>
          <h2>Presupuesto</h2>
        </div>
        <span className="month-label">{month}</span>
      </div>
      <div className="add-budget">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Agregar categoría al presupuesto</option>
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
          placeholder="Tope mensual (opcional)"
          onChange={(e) => setLimit(e.target.value)}
        />
        <button
          className="save"
          type="button"
          onClick={addBudget}
          disabled={!categoryId}
        >
          Agregar
        </button>
      </div>
      <div className="budget-table">
        <div className="thead">
          <span>Categoría</span>
          <span>Tope mensual</span>
          <span>Gastado</span>
          <span>Disponible</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>
        {data.map((x) => (
          <div className="tr budget-row-actions" key={x.id}>
            <b>{x.name}</b>
            <input
              type="number"
              min="0"
              value={x.limit ?? ""}
              placeholder="Sin límite"
              onChange={(e) =>
                onChange(x.id, e.target.value === "" ? null : Number(e.target.value))
              }
            />
            <span>{money(x.spent)}</span>
            <span className={x.remaining !== null && x.remaining < 0 ? "bad" : ""}>
              {x.remaining === null ? "Sin límite" : money(x.remaining)}
            </span>
            <span
              className={
                x.percent === null
                  ? "pill"
                  : x.percent >= 100
                  ? "pill red"
                  : x.percent >= 75
                    ? "pill yellow"
                    : "pill green"
              }
            >
              {x.percent === null ? "Sin límite" : `${x.percent.toFixed(0)}%`}
            </span>
            <button className="delete-category" onClick={() => onRemove(x.id)}>
              <Trash2 /> Quitar
            </button>
          </div>
        ))}
      </div>
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
}: {
  tab: string;
  transactions: Transaction[];
  setTransactions: (x: Transaction[]) => void;
  budgets: Budget[];
  setBudgets: (x: Budget[]) => void;
  categories: Category[];
  setCategories: (x: Category[]) => void;
}) {
  const [categoryName, setCategoryName] = useState("");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const exportJSON = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify({ transactions, budgets }, null, 2)], {
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
    setCategories([
      ...categories,
      { id: `custom-${crypto.randomUUID()}`, name, group, type: "expense" },
    ]);
    setCategoryName("");
    setCategoryGroup("");
    setCategoryError("");
  };
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
  onClose,
  onSave,
}: {
  month: string;
  categories: Category[];
  onClose: () => void;
  onSave: (x: any) => void;
}) {
  const [type, setType] = useState<TransactionType>("expense"),
    [amount, setAmount] = useState(""),
    [categoryId, setCategoryId] = useState("food"),
    [description, setDescription] = useState(""),
    [error, setError] = useState("");
  const choices = byName(
    categories.filter((c) =>
      type === "deduction"
        ? c.type === "deduction"
        : type === "savings" || type === "investment"
          ? c.type === "savings"
          : c.type === "expense",
    ),
  );
  useEffect(() => setCategoryId(choices[0]?.id || ""), [type]);
  const save = () => {
    if (!amount || Number(amount) <= 0 || !description) {
      setError("Ingresa una descripción y un valor mayor a cero.");
      return;
    }
    onSave({
      date: `${month}-01`,
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
        <p className="eyebrow">REGISTRO RÁPIDO</p>
        <h2>Nuevo movimiento</h2>
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
