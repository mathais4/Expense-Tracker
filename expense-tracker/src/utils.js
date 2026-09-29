// Pure helper functions (no React) so they are easy to unit test.

export const EXPENSE_CATEGORIES = ["Groceries", "Rent", "Transport", "Eating out", "Bills", "Entertainment", "Health", "Shopping", "Other"];
export const INCOME_CATEGORIES = ["Salary", "Gift", "Other income"];

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const fmt = (n) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);

const pad = (n) => String(n).padStart(2, "0");
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthOf = (dateStr) => dateStr.slice(0, 7); // "2026-09-28" -> "2026-09"

export const inMonth = (txs, month) => txs.filter((t) => monthOf(t.date) === month);

export function totals(txs) {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  return { income: round2(income), expenses: round2(expenses), balance: round2(income - expenses) };
}

export function expensesByCategory(txs) {
  const out = {};
  for (const t of txs) {
    if (t.type === "expense") out[t.category] = round2((out[t.category] || 0) + t.amount);
  }
  return out;
}

// The n months ending at `month`, oldest first, e.g. lastMonths("2026-02", 3) -> ["2025-12","2026-01","2026-02"]
export function lastMonths(month, n) {
  const [y, m] = month.split("-").map(Number);
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return result;
}

export const monthLabel = (month) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IE", { month: "short" });
};

export function validate({ amount, category, date }) {
  const errors = {};
  const n = Number(amount);
  if (amount === "" || Number.isNaN(n) || n <= 0) errors.amount = "Enter an amount greater than 0.";
  else if (n > 1e7) errors.amount = "That amount is too large.";
  if (!category) errors.category = "Choose a category.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) errors.date = "Choose a date.";
  return errors;
}

export function budgetStatus(spent, limit) {
  if (!limit || limit <= 0) return { pct: 0, over: false };
  return { pct: Math.min(100, Math.round((spent / limit) * 100)), over: spent > limit };
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
export function toCSV(txs) {
  const header = ["Date", "Type", "Category", "Amount", "Note"].join(",");
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, t.category, t.amount.toFixed(2), t.note || ""].map(csvCell).join(","));
  return [header, ...rows].join("\n");
}

// Sample data so the app can be demoed instantly (last 3 months).
export function demoData() {
  const now = new Date();
  const out = [];
  const add = (monthsAgo, day, type, category, amount, note) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
    out.push({ id: crypto.randomUUID(), type, category, amount, note, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` });
  };
  for (let m = 0; m < 3; m++) {
    add(m, 1, "income", "Salary", 1850, "Monthly pay");
    add(m, 2, "expense", "Rent", 650, "Room rent");
    add(m, 4, "expense", "Groceries", 62.4 + m * 7, "Weekly shop");
    add(m, 11, "expense", "Groceries", 48.9, "Top-up shop");
    add(m, 6, "expense", "Transport", 40, "Leap card top-up");
    add(m, 9, "expense", "Bills", 55, "Phone and broadband");
    add(m, 14, "expense", "Eating out", 32.5 + m * 4, "Dinner with friends");
    add(m, 18, "expense", "Entertainment", 15.99, "Streaming and cinema");
    add(m, 22, "expense", "Shopping", 45 + m * 12, "Clothes");
  }
  return out;
}
