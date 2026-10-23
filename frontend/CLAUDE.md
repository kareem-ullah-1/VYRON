# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server (0.0.0.0:3000)
npm run build      # production build
npm run lint       # ESLint
npm run clean-install  # clean deps via scripts/clean-install.js
```

No test suite configured.

## Architecture

Next.js 14 App Router + TypeScript + Tailwind. Frontend only — all APIs are external (backend at `NEXT_PUBLIC_API_URL`).

**Route structure:**
- `src/app/login`, `/signup`, `/landing` — public
- `src/app/(dashboard)/` — protected route group, wrapped in `ProtectedRoute`

**State:** Redux Toolkit with 13 slices (auth, cart, products, customers, sales, category, attributes, dashboard, supplier, rawMaterial, purchase, customOrders, users). Only `cart` slice persisted to localStorage via redux-persist.

**API layer:**
- `src/lib/axios.ts` — two axios instances: `api` (401 → redirect `/login`) and `authApi` (no redirect, used for auth endpoints only)
- Request interceptor attaches `Authorization: Bearer {token}` from localStorage
- Higher-level API fns in `src/Apis/` (e.g., `Product.ts`, `CustomOrder.ts`)

**Components:** `src/components/` organized by domain (POS, Products, Customers, Sales, CustomOrders, Procurement, Settings). Reusable primitives in `components/ui/`.

## Auth

Token stored in both `localStorage` (`pos_auth_token`, `pos_auth_user`) and a cookie (`pos_auth_token`). `ProtectedRoute` checks the cookie server-side; `HydrateAuth` (in `Providers.tsx`) restores Redux state from localStorage on mount.

## Config

`NEXT_PUBLIC_API_URL` in `.env` — points to backend (ngrok tunnel or `http://localhost:5122/api` for local dev).

Path alias: `@/*` → `src/*`.

Custom Tailwind theme: primary = blue scale, secondary = slate scale, font = Inter.
