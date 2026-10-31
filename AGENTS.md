# Bloom by Pela - Agent Rules

Read this file fully before every task. These rules override any conflicting instruction in a prompt unless the prompt explicitly says "OVERRIDE RULE n".

## Project
Production e-commerce web app for Bloom by Pela (Newcastle upon Tyne, UK): premium packaged snacks and fresh juices, one-off orders and weekly juice subscriptions. Delivery logistics are handled by the owner; the app only stores delivery rules, records what must be delivered, produces delivery lists and emails customers. Do not build courier, routing, rider or live-tracking features.

## Stack (fixed, do not swap)
- Frontend: React 19, TypeScript (strict), Vite SPA, Tailwind CSS 4, motion (Framer Motion successor already installed), lucide-react, React Router with BROWSER routing (never hash routing).
- Backend: Firebase Auth, Cloud Firestore (europe-west2), Cloud Functions 2nd gen (TypeScript, region europe-west2), Firebase Hosting, App Check.
- Payments: Stripe Checkout, Stripe Billing, Stripe Customer Portal.
- Email: Resend (called only from Cloud Functions).
- Images: Cloudinary (signed uploads via a Cloud Function; store only URL and public ID in Firestore).
- Tests: Vitest (unit), Firebase Emulator Suite with @firebase/rules-unit-testing (rules), Playwright (smoke e2e).

## Commands (keep these working; add to package.json if missing)
- `npm run dev` - Vite dev server
- `npm run lint` - `tsc --noEmit` for app and functions
- `npm run build` - production build
- `npm test` - unit tests
- `npm run test:rules` - Firestore rules tests (emulator)
- `npm run emulators` - Firebase emulators (auth, firestore, functions, hosting)

## Non-negotiable rules
1. No secrets in client code or in git. Stripe secret key, webhook secret, Resend key and Cloudinary secret live ONLY in Cloud Functions via Firebase secrets (`defineSecret`). Only public values use `VITE_` variables. Never commit `.env*` except `.env.example`.
2. The browser is never trusted for money. Prices, delivery fees, discounts and totals are recalculated in Cloud Functions from Firestore data before any Stripe session is created.
3. Orders, subscriptions, deliveries, stock, capacity and promotion usage are written ONLY by Cloud Functions (Admin SDK). Client code can never write them. Firestore rules enforce this (default deny).
4. Orders and subscriptions are created or changed ONLY from signature-verified Stripe webhooks. The success redirect never confirms anything.
5. Webhook handlers are idempotent: record each Stripe event id in `stripeEvents` inside a transaction and skip duplicates.
6. Money is integer pence, GBP only. Format with `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`. Never use floats for money.
7. Time: store UTC, but all business logic (delivery days, cut-offs, billing days) uses Europe/London via Luxon and must be correct across British Summer Time changes (last Sunday of March and October). Never use `new Date()` arithmetic for business rules.
8. Roles are Firebase custom claims (`role: 'admin' | 'staff'`), set only by a protected script or function. The UI hides things by role, but real enforcement is in rules and Functions.
9. Validate every Cloud Function input with zod. Escape or avoid raw HTML. Restrict CORS to the live domain and the emulator. Rate limit checkout, contact and sign-up paths.
10. No demo/fake auth in production code. Local development uses the Firebase Emulator Suite.
11. Strict TypeScript. No `any` unless commented with a reason. No `@ts-ignore`.
12. Every list or detail screen has loading, empty and error states. Every form has validation messages and disabled-while-submitting buttons.
13. Accessibility: WCAG 2.1 AA (labels, focus states, contrast, keyboard use, alt text). Mobile first from 360px.
14. Do not invent business data. Placeholder content must be clearly marked `PLACEHOLDER` so it can be found and replaced.
15. Never write `TODO` or stub implementations to "finish later" inside code you claim is complete. If something cannot be completed, say so in the report.

## How to work
1. Read the files you will change before changing them. List them first.
2. Plan: write a short numbered plan (max 12 lines) before editing.
3. Implement in small steps. After each meaningful step run `npm run lint` and `npm run build`. Fix failures before continuing.
4. Do not touch files unrelated to the task. No drive-by refactors.
5. When unsure of a library API, read its types in `node_modules` or its README. Do not guess method names or option shapes. Check the installed version first.
6. Never run destructive commands (`rm -rf` outside `dist`/`node_modules`, `git push --force`, `git reset --hard`, deleting Firestore data). Never read or print the contents of `.env` files.
7. Use one git branch per section (`section-NN-short-name`) and commit with conventional commits (`feat:`, `fix:`, `chore:`, `test:`). Do not push unless asked.
8. Ask the user a question only if you are blocked. Otherwise state your assumption and proceed.

## Folder structure
```
src/
  components/ (ui, layout, cart, auth, admin)
  pages/ (public, auth, admin)
  features/ (catalogue, checkout, subscriptions, orders, delivery)
  context/  hooks/  lib/  types/  data/seed/
functions/
  src/ (checkout, webhooks, orders, subscriptions, delivery, email, admin, lib)
  test/
tests/ (e2e)
scripts/ (seed, set-role, prerender, sitemap)
firestore.rules  firestore.indexes.json  storage.rules  firebase.json
```

## Standard report (end every section with exactly this)
1. Summary (3-6 lines)
2. Files created or changed
3. Commands run and their results (lint, build, tests)
4. Manual steps the owner must do (Firebase console, Stripe dashboard, env vars)
5. Known gaps or risks
6. Suggested commit message
