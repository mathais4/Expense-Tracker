# Expense & Budget Tracker

A personal finance dashboard built with React, Vite and Chart.js. No backend or API key needed. Data is saved in your browser's localStorage.

## Features
- Add, edit and delete income and expense transactions, with form validation
- Monthly summary: income, expenses, balance
- Charts: spending by category (doughnut) and income vs expenses for the last 6 months (bar)
- Per-category monthly budgets with progress bars that turn red when exceeded
- Search and filter transactions, export to CSV, one-click sample data for demos

## Run it
```
npm install
npm run dev
```

## Tests
Business logic (totals, category grouping, month maths, validation, budget status, CSV export) lives in `src/utils.js` as pure functions and is unit tested with Vitest:
```
npm test
```

## Design notes
- Money is rounded to 2 decimals to avoid floating point drift (`0.1 + 0.2`).
- Derived data (totals, chart data, filtered list) is computed with `useMemo` from a single source of truth (the transactions array).
- A custom `useStored` hook keeps state and localStorage in sync.
- Chart.js is wrapped in a small React component that creates and destroys the chart in an effect.
