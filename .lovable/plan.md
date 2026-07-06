# Sellable Source Code — "Bring Your Own Supabase" Setup

Goal: Aap apna PAN-finder code sell karo. Har buyer apna khud ka Supabase project use kare. Code me ek **first-run Setup Wizard** hoga jaha buyer apna Supabase URL + anon key daale, aur ek ready SQL script mile jo unke Supabase SQL Editor me paste karke pura schema (tables, RLS, policies, triggers) auto-create kar de. Uske baad us buyer ke app me jo bhi user signup karega, wo **usi buyer ke Supabase** me store hoga — completely isolated per buyer.

Haan, ye 100% possible hai. Neeche exact system:

## Architecture (simple)

```
Buyer A downloads code ──► runs locally / hosts on own server
        │
        ▼
  /setup wizard (first run)
        │  paste: SUPABASE_URL + SUPABASE_ANON_KEY
        │  paste: SQL script into their Supabase SQL Editor
        ▼
  Config saved to localStorage + .env.local
        │
        ▼
  App boots with THEIR Supabase client
        │
        ▼
  End users signup/login ──► stored in Buyer A's Supabase only
```

Buyer B does the same with his own Supabase → fully isolated. Aap ka koi central server nahi.

## What I will build

### 1. Runtime Supabase config (no hardcoded keys)
- New file `src/lib/supabase-config.ts` — reads config in this order:
  1. `localStorage` (`lovable_supabase_config`) — set by wizard
  2. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — for buyers who prefer `.env`
- New file `src/integrations/supabase/client.ts` — creates client lazily from above config. If missing → returns `null` and app redirects to `/setup`.

### 2. Setup Wizard route `/setup`
Three-step UI:
- **Step 1 — Credentials:** Inputs for Supabase URL + anon key + "Test connection" button (does a harmless `auth.getSession()` call).
- **Step 2 — Database:** Shows the full SQL script in a code block with **Copy** button + link "Open Supabase SQL Editor". Instructions: paste → Run. A "Verify schema" button checks that required tables exist.
- **Step 3 — Done:** Save config to localStorage, redirect to `/register`.

Also a "Reconfigure" link on the setup page to overwrite existing config.

### 3. Setup guard
- `src/routes/__root.tsx` — if no Supabase config found and current route ≠ `/setup`, redirect to `/setup`.

### 4. SQL bootstrap script `supabase/setup.sql`
One-paste script that creates everything the app needs. Includes:
- `profiles` table (linked to `auth.users`, cascade delete)
- `app_role` enum + `user_roles` table + `has_role()` security-definer function
- Any PAN-finder specific tables (e.g. `pan_reports`)
- All required `GRANT`s to `authenticated` / `service_role`
- RLS enabled + policies (users read/write only their own rows; admins via `has_role`)
- Trigger `on_auth_user_created` → auto-insert profile row
- Storage bucket (if we later add image uploads) — optional, off by default

### 5. Docs `README.md` (buyer-facing)
Short setup guide:
1. `bun install`
2. `bun run dev`
3. Open `/setup`, paste Supabase URL + anon key
4. Copy SQL → paste into Supabase SQL Editor → Run
5. Deploy anywhere (Vercel, Cloudflare, own VPS)

License note that you can customize (single-buyer license).

## What I will NOT do
- No central licensing server / phone-home. (If you want per-buyer license keys later, that's a separate feature.)
- No changes to the current UI/theme/colors — only add wizard + config layer.
- Won't touch existing pages beyond wiring the new client + guard.

## Files to add/edit
- add: `src/lib/supabase-config.ts`
- add: `src/routes/setup.tsx`
- add: `supabase/setup.sql`
- add: `README.md` (buyer setup guide)
- edit: `src/integrations/supabase/client.ts` (make lazy/runtime-based)
- edit: `src/routes/__root.tsx` (setup guard)

## Confirm before I build
1. **Right now Lovable Cloud (Supabase) is NOT enabled** in this project. For a sellable template it's actually better — the buyer plugs in their own. Should I proceed with the pure "bring your own Supabase" model above? (Recommended.)
2. Any extra tables beyond `profiles` + `user_roles` + `pan_reports` you want in the SQL script?
