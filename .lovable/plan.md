
# PAN SHOP — Dashboard, Wallet, PAN Finder, Admin Panel

Goal: extend the current "bring-your-own-Supabase" app with a full user dashboard, wallet, PAN search flow, history, support and admin panel. Everything runs against the buyer's own Supabase (no Lovable Cloud), remains configurable from `config.ts`, and ships resellable.

---

## 1. Buyer-config additions (`config.ts`)

Add two new fields alongside the existing Supabase keys:

```ts
ADMIN_EMAIL: "admin@example.com",        // first admin (auto-granted on signup)
DEFAULT_SEARCH_PRICE: 2,                 // fallback ₹ per search until admin sets it in DB
```

Runtime reads price from the `app_settings` table; `DEFAULT_SEARCH_PRICE` is only used before the admin sets one.

Nothing else the buyer must edit for this phase. PAN API keys will be added to `config.ts` in the next phase, once you send the API docs.

---

## 2. Database (`database.sql`, one-paste, idempotent)

New tables added on top of what's already there:

- `app_settings` — singleton (`id=1`), columns: `search_price numeric`, `support_phone text`, `support_whatsapp text`, `support_email text`, `updated_at`. Admin-only write, everyone-read.
- `wallets` — `user_id (PK, FK auth.users)`, `balance numeric default 0`, `updated_at`. Auto-created row on signup via trigger.
- `wallet_transactions` — `id`, `user_id`, `type` ('credit' | 'debit' | 'refund'), `amount`, `note`, `ref_id` (nullable, e.g. pan_search id), `created_at`. Owner-read; admin-read all.
- `pan_searches` — `id`, `user_id`, `aadhaar_last4` (only last 4 stored — never full Aadhaar), `status` ('success' | 'not_found' | 'error' | 'refunded'), `pan_number`, `full_name`, `dob`, `raw_response jsonb`, `cost numeric`, `created_at`. Owner-read/insert; admin-read all.
- `user_roles` (already exists) — extend with auto-grant trigger: on new signup, if `NEW.email = current_setting('app.admin_email', true)` grant `admin` role. `app.admin_email` is set at query time from a helper RPC; simpler alternative baked in — trigger reads a row in `app_settings.admin_email` seeded from `config.ts` on first login. Chosen: **check inside `handle_new_user()` against a hardcoded lookup in a small `admin_emails` table** seeded by the buyer (one row = `ADMIN_EMAIL` value; documented in `SETUP.md`).

Security-definer RPCs (server-authoritative, prevent tampering):

- `debit_wallet_for_search(_aadhaar_last4 text)` → checks balance ≥ price, inserts `pan_searches` (status=pending), inserts debit txn, returns `{search_id, cost}`. All-or-nothing transaction.
- `finalize_search(_search_id uuid, _status text, _pan text, _name text, _dob text, _raw jsonb)` → updates search row; if status ∈ ('not_found','error') inserts refund txn and re-credits wallet.
- `admin_credit_wallet(_user_id uuid, _amount numeric, _note text)` → admin-only (checks `has_role`), credits wallet + inserts txn.
- `admin_set_price(_price numeric)`, `admin_set_support(...)`.

RLS: strict owner scoping on wallets/txns/searches; admin bypass via `has_role(auth.uid(),'admin')` in policies. GRANTs for `authenticated` + `service_role` on every new table.

---

## 3. Routes & UI (all under `_authenticated/` layout; existing `login`/`register` unchanged)

New authenticated layout `src/routes/_authenticated/route.tsx` with a shadcn **Sidebar** (collapsible). Sidebar items:

- **Home** — `/app` — three stat cards: Total PAN searches, Rejected/not-found count, Wallet balance. Recent 5 searches table.
- **Wallet** — `/app/wallet` — balance card, "Request top-up" button (opens modal explaining "contact admin", pre-fills a WhatsApp/email link from `app_settings.support_*`). Transaction history table.
- **PAN Finder** — `/app/pan-finder` — hero banner card, single input (12-digit Aadhaar, numeric only, client-side Zod validation), Search button. On submit: call `panSearch` server fn → shows animated loading → result card with PAN, name, DOB or "Not found (refunded)" state. **API call is stubbed for now** — server fn is scaffolded, returns `{status:'error', message:'PAN API not configured yet'}` and refunds. Wired end-to-end so once you send docs I only edit one function.
- **PAN List** — `/app/pan-list` — paginated table of all past searches with filters (status, date, PAN search box), CSV export button.
- **Support** — `/app/support` — reads `app_settings`, shows phone / WhatsApp / email as tap-to-contact cards.
- **Admin** — `/app/admin` (visible only if `has_role(admin)`) — three tabs:
  - **Users & Wallets**: search user by email, credit wallet form (amount + note), see their balance & recent txns.
  - **Settings**: edit search price, support phone/WhatsApp/email.
  - **All searches**: read-only table across all users.

Existing `/dashboard` becomes a redirect to `/app`.

Visual style: keep current mint background + shadcn tokens; sidebar uses `bg-primary` header strip to match current dashboard header. Cards use `rounded-2xl` and the existing hover-lift animation. Framer-motion NOT added (keep bundle small).

---

## 4. Server functions (client-safe modules)

All in `src/lib/*.functions.ts`, using `requireSupabaseAuth`:

- `getWallet`, `listTransactions`
- `getDashboardStats`
- `panSearch({ aadhaar })` — validates 12-digit, calls `debit_wallet_for_search`, **TODO: call external API**, then `finalize_search`. Currently finalizes as `error` → auto-refund path is exercised so buyer sees the flow work end-to-end.
- `listMySearches({ page, filters })`
- `getSupportInfo`
- Admin: `adminSearchUser(email)`, `adminCreditWallet(...)`, `adminUpdateSettings(...)`, `adminListAllSearches(...)` — each re-checks `has_role` server-side.

Client bearer attach: verified the existing `functionMiddleware` in `src/start.ts` sends the Supabase token; append the generated attacher only if missing.

---

## 5. Security posture (reseller-grade)

- Full Aadhaar never stored (only `last4`); raw API response redacted before insert (strip full Aadhaar echo).
- Every mutation goes through security-definer RPCs — client cannot forge balance changes even with a leaked anon key.
- Admin check is server-side on every admin fn (not just UI hidden).
- RLS on every table; explicit GRANTs; `authenticator` cannot read others' rows.
- Input validation with Zod on both client and server fn `.inputValidator()`.
- No `service_role` key in the app — buyer never pastes it into `config.ts`.

---

## 6. Docs updates

- `SETUP.md` — add: how to set `ADMIN_EMAIL`, run `database.sql`, sign up with that email → automatic admin, then use Admin → Settings to set price and support contacts.
- `README.md` — feature list updated.

---

## 7. What ships in THIS build (Phase 1)

Everything above **except** the real PAN API call — that's a single ~30-line edit inside `panSearch` once you paste the API docs. The wallet-debit → API-call → finalize/refund pipeline is fully wired and testable today (every search will refund because API returns error).

## Phase 2 (after you send API docs)

- Replace the stubbed fetch in `panSearch` with the real provider call + response mapper.
- Add provider API key to `config.ts` with a placeholder + `SETUP.md` section.

---

Confirm and I'll build Phase 1 exactly as above.
