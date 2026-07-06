## Plan: PAN Finder ko host-side server route pe migrate karo (hosting env vars use)

Aap Option 2 chahte ho. Ek chhota tweak: **Vercel-specific serverless function** likhne ki jagah hum **TanStack Start server route** banayenge (`src/routes/api/pan-find.ts`). Ye same file Vercel, Netlify, Cloudflare — sab pe kaam karega, sirf env var naam consistent rakhna hai. Buyer ke liye setup identical rahega.

### Impact summary

| | Before | After |
|---|---|---|
| PAN keys location | Supabase Edge Function Secrets | Hosting platform env vars (Vercel/Netlify/Cloudflare) |
| PAN call path | Browser → Supabase Edge Function → PanManager | Browser → App server route → PanManager |
| Wallet debit/refund | Supabase RPC (unchanged) | Supabase RPC (unchanged) |
| Buyer setup | Deploy edge function + add secrets in Supabase | Just add env vars in hosting dashboard + redeploy |
| Sellable-safe | ✅ | ✅ (keys never in repo, never in browser) |

Wallet flow same rahega — debit/refund abhi bhi Supabase RPC hai. Sirf provider call ka jagah badlega. Speed impact minor: 1 extra hop hosting → Supabase, but overall same order (100-300ms).

### Files to change

**1. New: `src/routes/api/pan-find.ts`**
- TanStack server route with `POST` handler.
- Verify Supabase bearer token from `Authorization` header (calls `supabase.auth.getUser(token)` with publishable-key client to confirm caller is signed in).
- Read `PAN_API_KEY` / `PAN_API_SECRET` from `process.env` inside handler.
- Support `health_check: true` body → returns `{ outcome: "ready" | "missing_secrets", ... }` (same shape as edge function).
- Call PanManager, return same normalized shape as current edge function: `{ outcome, pan, name, dob, tracking_id, message, raw }`.
- CORS not needed (same-origin).

**2. Edit: `src/lib/data-store.ts`**
- Replace both `sb.functions.invoke("pan-find", ...)` calls with `fetch("/api/pan-find", { method: "POST", headers: { Authorization: "Bearer <token>", "Content-Type": "application/json" }, body: ... })`.
- Grab access token via `sb.auth.getSession()` before the call.
- Update `getPanServiceErrorMessage()` messages: mention hosting env vars instead of Supabase Edge Function Secrets.
- `checkPanServiceHealth()` calls the same route with `{ health_check: true }`.

**3. Edit: `supabase/functions/pan-find/index.ts`**
- Delete file (no longer needed). Buyer skips edge function deploy entirely.

**4. Edit: `SETUP.md`**
- Remove "Step 6.5: Deploy pan-find edge function" section.
- Replace with: "Step 6: Add PAN API keys to your hosting platform"
  - Vercel: Settings → Environment Variables → add `PAN_API_KEY` + `PAN_API_SECRET` (Production + Preview + Development scopes) → **Redeploy**.
  - Netlify: Site settings → Environment variables → same 2 keys → trigger redeploy.
  - Cloudflare Pages: Settings → Environment variables → same 2 keys → redeploy.
  - Local dev: add to `.env` (already gitignored).
- **⚠️ Big warning box:** "Do NOT prefix with `VITE_`. `VITE_PAN_API_KEY` will leak the key into the browser bundle where anyone can steal it."

**5. Edit: `README.md`**
- Update "PAN API keys" section to point at hosting env vars.
- Update Vercel deploy button URL to include `PAN_API_KEY` and `PAN_API_SECRET` in the `&env=...` query params (Vercel deploy button prompts buyer for these during import).

**6. Edit: `.env.example`**
- Uncomment/add:
  ```
  # Server-side only. Never prefix with VITE_.
  PAN_API_KEY=
  PAN_API_SECRET=
  ```

**7. Edit: `config.ts`**
- Update the warning comment: remove Supabase Edge Function reference, replace with hosting env vars.

**8. Edit: `src/routes/app.admin.tsx`**
- "Check PAN setup" button already calls `checkPanServiceHealth()` — no change needed since data-store.ts is updated.
- Update result messages if any hardcoded strings mention "Edge Function" — change to "PAN service".

### Security notes (sellable source safe)

- Repo mein koi PAN key nahi (as before).
- Server route `process.env.PAN_API_KEY` — only readable on the server, never in browser bundle.
- Auth check inside handler prevents anonymous abuse of buyer's PanManager quota.
- Same wallet debit/refund pattern = user cannot be charged if provider fails.

### What buyer does after this change (simpler than before)

1. Deploy repo to Vercel/Netlify/Cloudflare.
2. Add 2 env vars in hosting dashboard: `PAN_API_KEY`, `PAN_API_SECRET`.
3. Redeploy.
4. Done. No Supabase CLI, no edge function deploy.

### Confirm before I build

- Option 2 confirm? **Haan / Nahi**
- Vercel-specific `api/pan-find.ts` chahiye ya **TanStack server route (`src/routes/api/pan-find.ts`) — works on all hosts**? (Recommend: server route.)
- `supabase/functions/pan-find/` folder delete kar dun ya safety ke liye rakh dun (unused)? (Recommend: delete — cleaner for buyer.)

Aap "haan proceed" bolo (ya changes suggest karo), main build kar dunga.
