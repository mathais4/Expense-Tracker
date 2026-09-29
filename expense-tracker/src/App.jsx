import { useMemo, useState, useEffect } from "react";
import ChartView from "./ChartView.jsx";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, fmt, round2, todayStr, monthOf, inMonth, totals,
  expensesByCategory, lastMonths, monthLabel, validate, budgetStatus, toCSV, demoData,
} from "./utils.js";

const PALETTE = ["#4c6ef5", "#f59f00", "#2f9e44", "#e03131", "#7048e8", "#0c8599", "#d6336c", "#868e96", "#e8590c"];
const DOUGHNUT_OPTIONS = { plugins: { legend: { position: "bottom" } } };
const BAR_OPTIONS = { scales: { y: { beginAtZero: true } }, plugins: { legend: { position: "bottom" } } };

// useState that persists to localStorage.
function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, [key, value]);
  return [value, setValue];
}

function TxForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const changeType = (e) => {
    const type = e.target.value;
    setForm((f) => ({ ...f, type, category: (type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] }));
  };
  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit(form);
  };

  return (
    <form className="panel form" onSubmit={submit} noValidate>
      <h2>{initial.id ? "Edit transaction" : "Add transaction"}</h2>
      <label>Type
        <select value={form.type} onChange={changeType}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>
      <label>Amount (€)
        <input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set("amount")} aria-invalid={!!errors.amount} />
        {errors.amount && <span className="error">{errors.amount}</span>}
      </label>
      <label>Category
        <select value={form.category} onChange={set("category")}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Date
        <input type="date" value={form.date} onChange={set("date")} aria-invalid={!!errors.date} />
        {errors.date && <span className="error">{errors.date}</span>}
      </label>
      <label>Note (optional)
        <input type="text" maxLength={80} value={form.note} onChange={set("note")} />
      </label>
      <div className="row">
        <button className="btn" type="submit">{initial.id ? "Save changes" : "Add transaction"}</button>
        {initial.id && <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function Budgets({ byCat, budgets, setBudgets }) {
  const setLimit = (cat, value) =>
    setBudgets((b) => {
      const next = { ...b };
      const n = parseFloat(value);
      if (!n || n <= 0) delete next[cat];
      else next[cat] = n;
      return next;
    });
  return (
    <section className="panel">
      <h2>Monthly budgets</h2>
      <p className="mut small">Set a limit per category to track spending against it.</p>
      <ul className="budgets">
        {EXPENSE_CATEGORIES.map((cat) => {
          const spent = byCat[cat] || 0;
          const { pct, over } = budgetStatus(spent, budgets[cat]);
          return (
            <li key={cat}>
              <div className="brow">
                <span>{cat}</span>
                <span className={over ? "error" : "mut"}>{fmt(spent)}{budgets[cat] ? ` of ` : ""}</span>
                <input
                  type="number" min="0" step="10" placeholder="Limit" aria-label={`${cat} monthly limit`}
                  defaultValue={budgets[cat] || ""} onBlur={(e) => setLimit(cat, e.target.value)}
                />
              </div>
              {budgets[cat] > 0 && (
                <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${cat} budget used`}>
                  <div className={over ? "fill over" : "fill"} style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function App() {
  const [txs, setTxs] = useStored("expenses:txs", []);
  const [budgets, setBudgets] = useStored("expenses:budgets", {});
  const [month, setMonth] = useState(monthOf(todayStr()));
  const [editing, setEditing] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [q, setQ] = useState("");

  const monthTxs = useMemo(() => inMonth(txs, month), [txs, month]);
  const sums = useMemo(() => totals(monthTxs), [monthTxs]);
  const byCat = useMemo(() => expensesByCategory(monthTxs), [monthTxs]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return monthTxs
      .filter((t) => typeFilter === "all" || t.type === typeFilter)
      .filter((t) => !needle || `${t.category} ${t.note}`.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTxs, typeFilter, q]);

  const doughnut = useMemo(
    () => ({ labels: Object.keys(byCat), datasets: [{ data: Object.values(byCat), backgroundColor: PALETTE }] }),
    [byCat]
  );
  const trend = useMemo(() => {
    const months = lastMonths(month, 6);
    const sumFor = (m) => totals(inMonth(txs, m));
    return {
      labels: months.map(monthLabel),
      datasets: [
        { label: "Income", data: months.map((m) => sumFor(m).income), backgroundColor: "#2f9e44" },
        { label: "Expenses", data: months.map((m) => sumFor(m).expenses), backgroundColor: "#e03131" },
      ],
    };
  }, [txs, month]);

  const save = (form) => {
    const tx = { ...form, amount: round2(parseFloat(form.amount)), note: form.note.trim() };
    if (editing) setTxs((all) => all.map((t) => (t.id === editing.id ? { ...tx, id: editing.id } : t)));
    else setTxs((all) => [...all, { ...tx, id: crypto.randomUUID() }]);
    setMonth(monthOf(tx.date)); // jump to the month of the entry so it is visible
    setEditing(null);
    setNonce((n) => n + 1);
  };
  const remove = (t) => {
    if (window.confirm(`Delete ${t.category} ${fmt(t.amount)} on ${t.date}?`)) setTxs((all) => all.filter((x) => x.id !== t.id));
  };
  const exportCSV = () => {
    const url = URL.createObjectURL(new Blob([toCSV(txs)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "expenses.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const formInitial = editing ?? { type: "expense", amount: "", category: EXPENSE_CATEGORIES[0], date: todayStr(), note: "" };

  return (
    <div className="wrap">
      <header className="top">
        <h1>Expense & Budget Tracker</h1>
        <label className="month">Month
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </header>

      <section className="summary" aria-label="Monthly summary">
        <div className="stat"><span className="mut">Income</span><b className="pos">{fmt(sums.income)}</b></div>
        <div className="stat"><span className="mut">Expenses</span><b className="neg">{fmt(sums.expenses)}</b></div>
        <div className="stat"><span className="mut">Balance</span><b className={sums.balance < 0 ? "neg" : ""}>{fmt(sums.balance)}</b></div>
      </section>

      {txs.length === 0 && (
        <div className="panel empty">
          <p>No transactions yet. Add your first one below, or load sample data to see how the dashboard looks.</p>
          <button className="btn" onClick={() => setTxs(demoData())}>Load sample data</button>
        </div>
      )}

      <div className="charts">
        <section className="panel">
          <h2>Spending by category</h2>
          {Object.keys(byCat).length ? <ChartView type="doughnut" data={doughnut} options={DOUGHNUT_OPTIONS} label="Doughnut chart of spending by category" /> : <p className="mut">No expenses this month.</p>}
        </section>
        <section className="panel">
          <h2>Last 6 months</h2>
          <ChartView type="bar" data={trend} options={BAR_OPTIONS} label="Bar chart of income and expenses for the last six months" />
        </section>
      </div>

      <div className="cols">
        <TxForm key={editing?.id ?? `new-${nonce}`} initial={formInitial} onSubmit={save} onCancel={() => setEditing(null)} />
        <Budgets key={month} byCat={byCat} budgets={budgets} setBudgets={setBudgets} />
      </div>

      <section className="panel">
        <div className="listhead">
          <h2>Transactions</h2>
          <div className="row">
            <input type="search" placeholder="Search" aria-label="Search transactions" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
              <option value="all">All</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
            <button className="btn ghost" onClick={exportCSV} disabled={!txs.length}>Export CSV</button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mut">Nothing to show for this month and filter.</p>
        ) : (
          <ul className="tx">
            {shown.map((t) => (
              <li key={t.id}>
                <div>
                  <b>{t.category}</b>
                  <span className="mut small"> {t.date}{t.note ? ` · ${t.note}` : ""}</span>
                </div>
                <span className={t.type === "income" ? "pos" : "neg"}>{t.type === "income" ? "+" : "−"}{fmt(t.amount)}</span>
                <span className="acts">
                  <button className="link" onClick={() => { setEditing(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <button className="link" onClick={() => remove(t)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer>Your data is stored only in this browser.</footer>
    </div>
  );
}
