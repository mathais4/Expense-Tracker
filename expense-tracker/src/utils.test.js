import { describe, it, expect } from "vitest";
import { round2, totals, expensesByCategory, lastMonths, validate, budgetStatus, toCSV, inMonth } from "./utils.js";

const tx = (over) => ({ id: "1", type: "expense", category: "Groceries", amount: 10, date: "2026-09-10", note: "", ...over });

describe("round2", () => {
  it("avoids floating point errors", () => expect(round2(0.1 + 0.2)).toBe(0.3));
});

describe("totals", () => {
  it("sums income and expenses and computes balance", () => {
    const r = totals([tx({ type: "income", amount: 100 }), tx({ amount: 30.5 }), tx({ amount: 19.5 })]);
    expect(r).toEqual({ income: 100, expenses: 50, balance: 50 });
  });
  it("handles an empty list", () => expect(totals([])).toEqual({ income: 0, expenses: 0, balance: 0 }));
});

describe("expensesByCategory", () => {
  it("groups expenses only", () => {
    const r = expensesByCategory([tx({ amount: 5 }), tx({ amount: 7 }), tx({ category: "Rent", amount: 100 }), tx({ type: "income", category: "Salary", amount: 999 })]);
    expect(r).toEqual({ Groceries: 12, Rent: 100 });
  });
});

describe("inMonth", () => {
  it("filters by YYYY-MM", () => {
    expect(inMonth([tx({ date: "2026-09-01" }), tx({ date: "2026-08-31" })], "2026-09")).toHaveLength(1);
  });
});

describe("lastMonths", () => {
  it("returns months oldest first", () => expect(lastMonths("2026-09", 3)).toEqual(["2026-07", "2026-08", "2026-09"]));
  it("crosses year boundaries", () => expect(lastMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]));
});

describe("validate", () => {
  it("accepts a valid entry", () => expect(validate({ amount: "12.50", category: "Rent", date: "2026-09-01" })).toEqual({}));
  it("rejects zero, negative and blank amounts", () => {
    for (const a of ["0", "-5", ""]) expect(validate({ amount: a, category: "Rent", date: "2026-09-01" }).amount).toBeTruthy();
  });
  it("requires a date and category", () => {
    const e = validate({ amount: "5", category: "", date: "" });
    expect(e.category).toBeTruthy();
    expect(e.date).toBeTruthy();
  });
});

describe("budgetStatus", () => {
  it("reports percentage used", () => expect(budgetStatus(50, 200)).toEqual({ pct: 25, over: false }));
  it("flags overspending and caps at 100", () => expect(budgetStatus(250, 200)).toEqual({ pct: 100, over: true }));
  it("treats a missing budget as unset", () => expect(budgetStatus(50, 0)).toEqual({ pct: 0, over: false }));
});

describe("toCSV", () => {
  it("escapes quotes and sorts by date", () => {
    const csv = toCSV([tx({ date: "2026-09-02", note: 'He said "hi"' }), tx({ date: "2026-09-01", note: "a,b" })]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Type,Category,Amount,Note");
    expect(lines[1]).toContain('"a,b"');
    expect(lines[2]).toContain('"He said ""hi"""');
  });
});
