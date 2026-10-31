# Bloom by Pela

Premium packaged snacks and cold-pressed juices from Newcastle upon Tyne, UK.
React 19 + Vite front end, Firebase Auth / Firestore / Cloud Functions (2nd gen,
`europe-west2`) back end, Stripe for payments and Resend for transactional email.

## Repository layout

```
src/                 React SPA (Vite, Tailwind 4, React Router browser routing)
functions/           Cloud Functions (TypeScript) and Firestore rules tests
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

2. Create `.env` from `.env.example` and fill in the `VITE_FIREBASE_*` values
   (Firebase console > Project settings > Your apps). For emulator work the API
   key only needs to be a non-empty placeholder value, for example
   `VITE_FIREBASE_API_KEY="demo-key"`.
3. Set `VITE_USE_EMULATORS="true"` in `.env` to connect the browser to the local
   emulators. Emulator wiring only runs when both `import.meta.env.DEV` and
   `VITE_USE_EMULATORS === "true"` are true, so production builds never connect
   to an emulator. Never enable it on the live site.
4. Start the emulators (Auth `9099`, Firestore `8080`, Functions `5001`,
   Hosting `5000`, Emulator UI `4000`):

   ```bash
   npm run build          # builds dist/ for the Hosting emulator
   npm run emulators
   ```

   The Functions emulator is pre-built automatically. Sign-up against the Auth
   emulator works with any email/password, and the Emulator UI at
   <http://127.0.0.1:4000> shows the created users and documents.

## Firebase project

`.firebaserc` currently contains the **PLACEHOLDER** project id
`bloom-by-pela-placeholder`. Replace it with the real project id before any
`firebase deploy`:

```json
{ "projects": { "default": "your-real-project-id" } }
```

Never commit service account keys, `.env` files or Stripe/Resend/Cloudinary
secrets. Server secrets belong in Cloud Functions via `defineSecret`.

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
  `admin` custom claim.
- Operational data (`dateCapacity`, `promotions`, `settings`) is staff-readable
  and admin-writable.
- Customers may create and update only their own `customers/{uid}` document,
  and only the allowed profile fields. `stripeCustomerId`, roles and all order,
  subscription, delivery, capacity, promotion-usage and audit writes are
  server-only.
- `stripeEvents` and `reservations` are never readable or writable by clients.
- Firebase Storage is deny-all because images are hosted on Cloudinary.

## Tests

```bash
npm run test:rules
```

This starts the Firestore emulator with `firebase emulators:exec` and runs the
Vitest suite in `functions/test/rules.test.ts` against `firestore.rules`. Java 21+
must be on `PATH`.

Type checking:

```bash
npm run lint              # app + scripts + functions (tsc --noEmit)
npm run build             # app production build
npm run build:functions   # functions compile to functions/lib
```

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

Against the emulator, no service account is needed — start the emulators and
point the script at the Auth emulator:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
npm run set-role -- owner@example.com admin
```

The script never writes credentials anywhere and only sets the `role` claim,
preserving any other existing custom claims.
