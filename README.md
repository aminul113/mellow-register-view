# PANME SHOP — self-hosted source

A "bring your own Supabase" app. Every buyer plugs in their own Supabase
project and gets a fully isolated database of users and PAN reports.

## Quick start

```bash
bun install
bun run dev
```

Open the app and you'll be redirected to **/setup**. Then:

1. Create a free Supabase project at https://supabase.com
2. In **Project Settings → API**, copy the **Project URL** and **anon public** key
3. Paste them in `/setup` → click **Test & save connection**
4. Click **Copy SQL**, open the Supabase **SQL Editor**, paste, click **Run**
5. Back in `/setup` click **Verify schema** → done

The schema script lives at `supabase/setup.sql` (also served at `/setup.sql`).

## What gets created

- `profiles` table (auto-created on signup via trigger)
- `user_roles` + `has_role()` security-definer function
- `pan_reports` table with per-owner RLS
- All required GRANTs for the Supabase Data API

## Optional: use environment variables

Instead of pasting into `/setup`, buyers can set at build time:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

## Deploy

Standard TanStack Start / Vite build. Deploy to Vercel, Cloudflare Pages,
Netlify, or any Node/edge host.

```bash
bun run build
```

## Isolation

There is **no central server**. Each buyer's app talks only to their own
Supabase project. User accounts are scoped to that project.