# Zero-Code Config File + Setup Docs (No Wizard)

Buyer ko koi bhi coding nahi karni — bas ek ready-made config file kholni hai, apne Supabase ke real values placeholders ke jagah paste karne hain, save. Aur ek alag documentation file me database setup ka pura A-to-Z step-by-step likha hoga.

## What I will build

### 1. One editable config file: `config.ts` (project root)
Currently config `/setup` wizard + localStorage se aata hai. Wo hata ke ek plain file bana denge jo buyer sidha edit kare. File me sirf 2 fields honge, dono placeholder ke saath:

```ts
// config.ts — EDIT THIS FILE ONLY. Do not touch anything else.
export const APP_CONFIG = {
  // Paste your Supabase Project URL here (from Supabase → Project Settings → API)
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",

  // Paste your Supabase anon public key here
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY-HERE",
};
```

- `src/lib/supabase-config.ts` ko update karenge — `APP_CONFIG` se read karega.
- Agar buyer ne values replace nahi ki (still "YOUR-..."), toh app ek friendly full-screen message dikhayega: *"Open config.ts and paste your Supabase URL and anon key, then reload."* Koi crash nahi, koi wizard nahi.
- `/setup` wizard route delete kar denge (ab zarurat nahi).
- LocalStorage-based config bhi hata denge.

### 2. Documentation file: `SETUP.md` (project root)
Ek clean step-by-step guide, screenshots ke references ke saath (text-only). Sections:

1. **Requirements** — Node.js/Bun install
2. **Install & run** — `bun install`, `bun run dev`
3. **Supabase project banao** — supabase.com pe free project create karne ke steps
4. **Config file edit karo** — `config.ts` khol ke URL + anon key paste
5. **Database create karo** — Supabase → SQL Editor → New query → `database.sql` ka pura content paste → Run
6. **App chalao** — login/register try karo
7. **Deploy** — Vercel/Netlify/own server par kaise host kare
8. **Troubleshooting** — common errors + fixes

### 3. Ready SQL file: `database.sql` (project root)
Already `supabase/setup.sql` me hai — usko root pe `database.sql` naam se copy kar denge taki buyer ko dhundhna na pade. `SETUP.md` isi file ko reference karega. Existing `supabase/setup.sql` bhi rahega.

## Files to add/edit
- **add:** `config.ts` (root — the ONE file buyer edits)
- **add:** `SETUP.md` (root — buyer documentation, Hinglish + English)
- **add:** `database.sql` (root — copy of supabase/setup.sql for easy access)
- **edit:** `src/lib/supabase-config.ts` — read from `APP_CONFIG` instead of localStorage/wizard, detect placeholder values
- **edit:** `src/routes/__root.tsx` (or add small `NotConfiguredScreen` component) — show friendly "edit config.ts" screen when placeholders detected
- **edit:** `src/routes/index.tsx`, `login.tsx`, `register.tsx`, `dashboard.tsx` — remove `/setup` redirects; instead let the app render the "not configured" screen if needed
- **delete:** `src/routes/setup.tsx` (wizard hata denge)
- **update:** `README.md` — point buyer to `SETUP.md` and `config.ts`

## Buyer's actual workflow (super simple)
1. Code download kare → `bun install && bun run dev`
2. `config.ts` open kare → 2 placeholders replace kare → save
3. `SETUP.md` khol ke Supabase pe SQL Editor me `database.sql` paste + Run
4. Browser refresh → app chalu, register/login work karega

Bas. Koi wizard, koi setup page, koi coding nahi.

## Confirm
Ye approach thik hai? Ya aap chahte ho ki `config.ts` ki jagah `.env` file ho (buyer `.env` me `VITE_SUPABASE_URL=...` daale)? `.env` industry standard hai lekin `config.ts` visually thoda friendlier hota hai non-devs ke liye. Default meri recommendation: **`config.ts`** (jaisa upar plan me hai).
