## PAN Finder — Phase 2 (real API integration)

Goal: wire the real PanManager AI endpoint into the existing wallet + refund flow. Buyer only adds two Supabase secrets — no code edits.

---

### 1. Buyer setup (docs only, zero code for buyer)

In their own Supabase project → **Edge Functions → Secrets**, buyer adds:

- `PAN_API_KEY`
- `PAN_API_SECRET`

That's it. `SETUP.md` gets a new **"PAN API"** section with screenshots-style steps.

No changes to `config.ts` (keys must never touch the browser bundle, per the API docs).

---

### 2. New Supabase Edge Function: `pan-find`

File: `supabase/functions/pan-find/index.ts` (buyer deploys via Supabase CLI — one-command step added to `SETUP.md`).

Responsibilities:
- Verify the caller's JWT (`Authorization: Bearer …` from the browser) using the buyer's Supabase URL + anon key → get `user_id`. Reject if unauth.
- Validate `aadhaar_number` is 12 digits (server-side, Zod-equivalent).
- Read `PAN_API_KEY` / `PAN_API_SECRET` from `Deno.env`.
- POST to `https://panmanagerai.in/service-api/v1/instant-aadhaar-to-pan/find-pan` with the two `x-api-*` headers.
- Return a **normalized** shape to the client, stripping provider wallet fields:
  ```json
  { "outcome": "success" | "not_found" | "error",
    "pan": "ABCDE1234F" | null,
    "name": null,          // provider doesn't return name/dob in this response — will be null
    "dob": null,
    "tracking_id": "PMI-PF-…",
    "message": "…" }
  ```
- Outcome mapping (per docs):
  - `status===true && data.pan_number` → `success`
  - `status===false && request_status==='rejected'` (message contains "No record") → `not_found`
  - anything else (validation error, 5xx, network) → `error`
- Never log the full Aadhaar; log only masked value + tracking_id.
- Provider API keys never leave this function.

---

### 3. Rewrite `runPanSearch` in `src/lib/data-store.ts`

Replace the stubbed block only. Flow (unchanged skeleton):

1. Client validates 12-digit Aadhaar (Zod).
2. Client calls `rpc('debit_wallet_for_search', { _aadhaar_last4 })` → gets `search_id` + `cost`. If insufficient balance, RPC throws → UI shows "Insufficient balance, top up wallet" (no API call made — money safety ✔).
3. Client calls the edge function `supabase.functions.invoke('pan-find', { body:{ aadhaar_number } })`.
4. Based on `outcome`, client calls `rpc('finalize_search', { _search_id, _status, _pan, _name, _dob, _raw })`.
   - `finalize_search` (already exists) is the **single source of truth** for refunds: only refunds when status ≠ success, and is idempotent (adds `WHERE status='pending'` guard — see §4).
5. `try/catch/finally`:
   - If edge function throws / network fails → mark as `error` via `finalize_search` → auto-refund.
   - If the whole browser tab dies mid-call, next call to `finalize_search` on same row is a no-op (idempotency). No double refund, no double debit. Search row stays `pending` — a small admin utility (§6) can force-refund stuck pendings.
6. UI returns the same `PanSearchResult` shape — no changes needed in `app.pan-finder.tsx` logic.

---

### 4. `database.sql` — idempotency hardening (single small addition)

Update `finalize_search` to guard against double-finalize:

```sql
-- inside finalize_search body, before UPDATE:
if (select status from pan_searches where id = _search_id) <> 'pending' then
  return;  -- already finalized, no-op
end if;
```

Guarantees:
- One debit per search (RPC is atomic).
- One refund max per search (only fires on first non-success finalize).
- No refund on success.
- Retrying `finalize_search` with same id is safe (no-op).

Migration is idempotent — buyer re-runs the same `database.sql`.

---

### 5. UI polish on `app.pan-finder.tsx` (small, per user ask)

- Success card: show PAN prominently + **copy button** (uses `navigator.clipboard`, toast "PAN copied"). Card gets a subtle gradient border and a checkmark badge.
- Not-found / error card: red-tinted with clear "₹X refunded to wallet" line + link to wallet.
- Loading state: keep current spinner + disable input.
- Insufficient balance: catch RPC error message and show a dedicated card with "Top up wallet" CTA linking to `/app/wallet`.

No layout rewrite — just refine the existing result card.

---

### 6. Small admin helper (optional but included)

Admin panel → "All searches" tab: add a "Force refund" button on rows stuck in `pending` for >10 min. Calls an admin-only RPC `admin_force_refund_search(_search_id)` that runs the same guarded refund path. Reseller-grade safety net for network partitions.

---

### 7. Files that change

- `supabase/functions/pan-find/index.ts` — **new**
- `src/lib/data-store.ts` — rewrite `runPanSearch` (~40 lines)
- `src/routes/app.pan-finder.tsx` — result-card polish + copy button + insufficient-balance branch
- `src/routes/app.admin.tsx` — add "Force refund" action row (small)
- `database.sql` — add pending-guard to `finalize_search` + new `admin_force_refund_search` RPC (idempotent re-run)
- `SETUP.md` — new "PAN API setup" section: add 2 secrets + `supabase functions deploy pan-find` command
- `config.ts` — **no change** (keys never in client)

---

### 8. Security / correctness checklist

- ✅ Provider keys only in Supabase Edge Function env — never in `config.ts`, never in browser bundle.
- ✅ Aadhaar last-4 only in DB; full Aadhaar never stored; masked in logs.
- ✅ Balance check happens BEFORE provider call (RPC is atomic — cannot bypass).
- ✅ Refund is server-authoritative (security-definer RPC), guarded against double-fire.
- ✅ Success never refunds. Not-found / error always refunds exactly once.
- ✅ Idempotent: replay of finalize_search is a no-op.
- ✅ Edge function verifies user JWT — nobody can call it anonymously to burn buyer's provider quota.
- ✅ Provider wallet fields (`wallet_balance`, `provider_balance`) stripped before returning to client.

Confirm and I'll implement.