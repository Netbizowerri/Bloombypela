# Bloom by Pela

Premium packaged snacks and cold-pressed juices from Newcastle upon Tyne, UK.
React 19 + Vite front end, Firebase Auth / Firestore, Vercel Serverless APIs for
Stripe checkout, and Cloud Functions (2nd gen, `europe-west2`) for features that
require an upgraded Firebase plan.

## Repository layout

```
src/                 React SPA (Vite, Tailwind 4, React Router browser routing)
functions/           Vercel API routes, shared checkout services, Cloud Functions and tests
scripts/             Operational scripts (set-role)
tests/               Playwright smoke tests (added in a later section)
firestore.rules      Firestore security rules (default deny)
storage.rules        Firebase Storage rules (deny all; images live in Cloudinary)
firebase.json        Emulator, hosting and deploy configuration
.firebaserc          Firebase project alias
```

## Local development

Prerequisites: Node.js 24 LTS (matches the Cloud Functions runtime) and Java 21+
for the Firestore emulator, which is a JVM service. Check with `node --version`
and `java -version`.

1. Install dependencies:

   ```bash
   npm install
   npm --prefix functions install
   ```

   Vercel deployment uses `functions/` as the project root directory; its
   `api/` folder contains the serverless endpoints.

2. Create `.env` from `.env.example` and fill in the `VITE_FIREBASE_*` values
   (Firebase console > Project settings > Your apps). For emulator work the API
   key only needs to be a non-empty placeholder value, for example
   `VITE_FIREBASE_API_KEY="demo-key"`.
3. `npm run dev` also loads `.env.development` (git-ignored), which sets
   `VITE_USE_EMULATORS="true"` and the public Cloudinary values. Emulator wiring
   only runs when both `import.meta.env.DEV` and `VITE_USE_EMULATORS === "true"`
   are true, so production builds never connect to an emulator. Delete
   `.env.development` to point the dev server back at the live project and set
   `VITE_CHECKOUT_API_URL` to the deployed Vercel API origin.
4. Start the emulators (Auth `9099`, Firestore `8080`, Functions `5001`,
   Hosting `5000`, Emulator UI `4000`):

   ```bash
   npm run emulators
   ```

   The Functions emulator is pre-built automatically.

5. In another terminal, seed the catalogue into the Firestore emulator:

   ```bash
   npm run seed
   ```

6. Create a disposable local admin in the Auth emulator (no service account
   needed). This account exists only inside the emulator and is never part of
   the real Firebase project:

   ```bash
   npm run dev:admin -- admin@bloombypela.local "LocalOnly-1234"
   ```

   Sign in at <http://localhost:3000/login> with those credentials. The
   Emulator UI at <http://127.0.0.1:4000> shows the users and documents. To use
   the real Firebase project and its real owner accounts instead, set
   `VITE_USE_EMULATORS="false"` in `.env.development` (or delete that file) and
   restart `npm run dev`.

7. Start the app:

   ```bash
   npm run dev
   ```

### Spark-plan architecture (no Cloud Functions)

This project runs on the free Spark plan, which cannot execute Cloud Functions.
The admin portal therefore talks to Firestore directly and `firestore.rules` is
the security boundary:

| Admin action | How it runs | Enforced by |
| --- | --- | --- |
| Products (create, edit, hide, duplicate) | Firestore write from the browser | `staff`/`admin` claim + document shape validation |
| Delivery areas, schedules, closed dates, capacity | Firestore write | `staff`/`admin` claim + money/field validation |
| Promotions | Firestore write | `admin` claim only |
| Public delivery settings | Firestore write | `admin` claim only |
| Order status changes | One transaction: status + `statusHistory` + `auditLog` | `staff`/`admin`, only `status`/`statusHistory`/`internalNote`/`updatedAt` |
| Refund bookkeeping | One transaction: `refundedPence` + `paymentStatus` + audit | `admin` only, cannot exceed the order total |
| Dashboard stats, CSV export | Computed in the browser from data staff may read | Firestore read rules |

Image upload works on Spark: the browser posts to an unsigned Cloudinary
preset, so no function or secret is involved. A Cloudinary URL can also be
pasted directly.

Firebase Spark cannot run Cloud Functions, but checkout does not require
upgrading Firebase: the Vercel Serverless API handles authoritative quotes,
Stripe Checkout sessions, signed webhooks, and success-page order lookups.
It uses the Firebase Admin SDK to read and update Firestore; browser clients
still cannot write orders, reservations, stock holds, or Stripe events.
Cloud-Function-only features such as Resend email triggers and scheduled
reservation cleanup remain unavailable on Spark.

## Firebase project

`.firebaserc` contains the project id `bloombypela-ec784`. Deploying Cloud
Functions additionally needs the **Blaze** plan; 2nd gen functions are not
available on Spark. Everything in the admin portal above works without it.

Never commit service account keys, `.env` files or Stripe/Resend/Cloudinary
secrets. Checkout secrets and the Firebase service-account JSON belong only in
Vercel's encrypted environment variables.

### Setting the admin role

Roles are custom claims set with the Admin SDK from your machine, which works on
Spark (a service account is not a paid feature). After deploying rules:

```bash
npm run set-role -- admin owner@example.com
npm run set-role -- staff shop@example.com
```

The user must sign out and back in for the new claim to reach their ID token.

### Hosting

`firebase.json` serves `dist/` and rewrites unmatched paths to `/index.html` so
React Router (browser history) works on refresh. Two things are not affected by
the rewrite:

- existing static files (Firebase Hosting serves a matching file before applying
  a rewrite), and
- `/__/*`, which is reserved by the Hosting emulator for its own control
  endpoints.

## Security model

- Every Firestore path is default deny.
- Catalogue and public settings are publicly readable; writes require the
  `staff` or `admin` custom claim and are shape-validated in the rules.
- Operational data (`dateCapacity`) is staff-readable and staff-writable;
  `promotions` and `settings` are staff-readable and admin-writable only.
- Customers may create and update only their own `customers/{uid}` document,
  and only the allowed profile fields. `stripeCustomerId` and roles are
  rejected.
- Orders are never created or deleted by a client and can never be repriced in
  the browser. Staff may change only `status`, `statusHistory`, `internalNote`
  and `updatedAt`; admins may additionally record `refundedPence` and
  `paymentStatus`, capped at the order total.
- `auditLog` is append-only: staff/admin may add an entry for their own uid with
  the request server timestamp, and nobody may edit or delete one.
- `stripeEvents`, `reservations`, `stockHolds` and `counters` are never readable
  or writable by clients.
- Firebase Storage is deny-all because images are hosted on Cloudinary.

## Tests

```bash
npm run test:rules
```

This starts the Firestore emulator with `firebase emulators:exec` and runs the
Vitest suites in `functions/test/` against `firestore.rules` and the checkout
flow (pricing, reservations, webhook idempotency, expiry and refunds). Java 21+
must be on `PATH`.

Type checking:

```bash
npm run lint              # app + scripts + functions (tsc --noEmit)
npm run build             # app production build
npm run build:functions   # functions compile to functions/lib
```

## Product images (Cloudinary)

The project runs without Firebase Storage. Admin-uploaded product images go
straight from the browser to Cloudinary using an **unsigned upload preset**, so
no Cloud Function, API key or API secret is involved and the flow works on the
free Spark plan as well as on Blaze.

Each product can have up to three images. The first image is the listing/hero
photo; the others appear in the product gallery. Uploads are stored under
`bloom-by-pela/products/`. An existing image can also be added by pasting its
https URL; the public id is read from Cloudinary URLs for display sizing.

### Configuration

Create an **unsigned** preset once in the Cloudinary dashboard (Settings >
Upload > Upload presets), optionally with the folder `bloom-by-pela/products`,
then set the public values in `.env` (and in the build environment used for the
live site):

```
VITE_CLOUDINARY_CLOUD_NAME=titznrnk
VITE_CLOUDINARY_UPLOAD_PRESET=bloombypela
```

`.env.development` already carries these values for local development. No
Cloudinary secret is ever needed by the app. Deleting a Cloudinary asset does
need the API secret, so removing an image from a product only removes the
reference from Firestore; clean up orphaned assets in the Cloudinary media
library.

## Payments (Stripe via Vercel)

The browser never decides prices. `createCheckoutSession` re-prices the basket
from Firestore, writes a 15-minute `reservations` hold (snack stock and juice
capacity) in a transaction, and only then creates a Stripe Checkout Session.
Orders are created **only** by the signature-verified `stripeWebhook`; the
success page just polls `getOrderBySession` and never confirms anything.

The Vercel project uses `functions/` as its root directory. Add these variables
in Vercel Project Settings > Environment Variables (never commit their values):

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the full JSON for a dedicated Firebase
  service account granted only the `roles/datastore.user` role; do not grant
  Owner or Editor.
- `STRIPE_SECRET_KEY`: `sk_test_...` for testing, then `sk_live_...`.
- `STRIPE_WEBHOOK_SECRET`: the `whsec_...` for the deployed Vercel webhook.
- `APP_URL`: `https://bloombypela.com` (the public site URL).
- `ALLOWED_ORIGINS`: comma-separated allowed storefront origins, including
  `https://bloombypela.com` and `https://www.bloombypela.com`.

Set `VITE_CHECKOUT_API_URL` in the frontend build environment to
`https://bloombypela.vercel.app` (this is also the production default), then
rebuild and deploy the frontend to Firebase Hosting.

Register the Stripe webhook endpoint
`https://<vercel-project>.vercel.app/api/stripe-webhook` with these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Delayed payment methods (for example bank debits) finish the session before the
money clears. Those sessions arrive as `checkout.session.completed` with
`payment_status: "unpaid"`; the hold is kept and the order is only created when
`checkout.session.async_payment_succeeded` reports `payment_status: "paid"`.
`checkout.session.async_payment_failed` releases the hold so nothing is held for
a payment that never cleared.

Payment method types are intentionally not hardcoded, so Stripe uses the
automatic payment methods enabled in the dashboard (card, Apple Pay, Google Pay).

### Local testing with the Stripe CLI

1. Start the Vercel API locally from the `functions/` root with
   `vercel dev --listen 3001`. Start the Firebase emulators (`npm run emulators`)
   and set these local API variables in an ignored environment file:

   ```
   GCLOUD_PROJECT=bloombypela-ec784
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   STRIPE_SECRET_KEY=sk_test_...
   APP_URL=http://localhost:3000
   ALLOWED_ORIGINS=http://localhost:3000
   ```

   Do not use production service-account credentials for emulator tests.
2. Run `stripe listen` once, copy the printed `whsec_...`, and configure it as
   `STRIPE_WEBHOOK_SECRET` for local development:

   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Forward Stripe events to the local API:

   ```bash
   stripe listen --forward-to http://localhost:3001/api/stripe-webhook
   ```

4. Run the Vite frontend separately with `VITE_CHECKOUT_API_URL` set to
   `http://localhost:3001`. Add items to the basket and use Stripe test cards.

Test cards:

| Card number           | Behaviour                          |
| --------------------- | ---------------------------------- |
| `4242 4242 4242 4242` | Payment succeeds                   |
| `4000 0025 0000 3155` | Succeeds after 3D Secure challenge |
| `4000 0000 0000 9995` | Declined (insufficient funds)      |

Use any future expiry date, any 3-digit CVC and any UK postcode.

### Idempotency check

After a successful payment the `stripe listen` console prints the event id
(`evt_...`) and the webhook returns 200. Replay the same event:

```bash
stripe events resend evt_xxxxxxxxxxxx
```

The second delivery is acknowledged with `{"duplicate":true}` and **no** second
order is created: the event id is recorded in `stripeEvents` in the same
transaction that writes the order and decrements stock.

### Refunds

Refund a payment in the Stripe dashboard (test mode) or with
`stripe refunds create --payment-intent pi_...`. The `charge.refunded` webhook
sets the order to `partially_refunded` or `refunded` and records
`refundedPence`. Stock is not restocked automatically.

### Abandoned checkouts

The checkout session expires after 35 minutes, a margin over Stripe's
30 minute minimum (a 30 minute value is rejected because it is calculated
before the quote and reservation round-trips). Stripe's
`checkout.session.expired` webhook releases its reservation; failed delayed
payments release theirs when Stripe sends
`checkout.session.async_payment_failed`. A session that Stripe reports as
already paid is never released, so a delayed webhook cannot lose a paid order.

## Granting admin

Roles are Firebase custom claims (`role: "admin"` or `role: "staff"`). The UI
only hides or shows screens; real enforcement is in `firestore.rules` and Cloud
Functions. Roles are granted with `scripts/set-role.ts`.

1. Create a service account key: Firebase console > Project settings >
   Service accounts > Generate new private key. Save the JSON file outside the
   repository (it is git-ignored, but keep it out of the project folder anyway).
2. Point `GOOGLE_APPLICATION_CREDENTIALS` at that file and run the script:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\secrets\bloom-service-account.json"
   npm run set-role -- owner@bloombypela.com admin
   npm run set-role -- packer@bloombypela.com staff
   ```

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/secrets/bloom-service-account.json"
   npm run set-role -- owner@bloombypela.com admin
   ```

3. The user must sign out and sign in again (the app forces an ID token refresh
   on login) before the new claim is visible. Tokens issued before the change
   keep the old role until they refresh.

Against the emulator, no service account is needed and the easiest path is the
dedicated bootstrap script (creates the user if needed, resets the password and
sets the claim):

```powershell
npm run dev:admin -- owner@example.com "LocalOnly-1234"
npm run dev:admin -- packer@example.com "LocalOnly-1234" staff
```

`scripts/set-role.ts` also works against the emulator when its host is set:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
npm run set-role -- owner@example.com admin
```

The script never writes credentials anywhere and only sets the `role` claim,
preserving any other existing custom claims.
