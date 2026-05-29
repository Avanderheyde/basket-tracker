# Basket Tracker

A small app for tracking stock baskets, backtests, and strategy-related workflows.

## Why it exists

I wanted a lightweight interface for monitoring baskets and related market data without reaching for a full spreadsheet or internal dashboard.

## What it does

- Create and view baskets of public-market tickers
- Pull current quotes and historical prices through Yahoo Finance-backed API routes
- Chart basket performance over selectable time ranges
- Support equal-weight, custom-weight, and dollar-position basket calculations
- Run locally or deploy as a small Next.js app

## Status

Experimental / in progress. The current implementation uses local app state and Yahoo Finance data routes; the longer-term design notes live in `docs/plans/`.

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui-style components
- Recharts for performance charts
- `yahoo-finance2` for quote, history, and ticker search data

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Gates

```bash
npm run lint
npx jest
npm run build
```
