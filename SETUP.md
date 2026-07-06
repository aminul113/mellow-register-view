# PANME SHOP — Setup Guide

Buyer ke liye complete step-by-step guide. Aapko sirf **2 files** touch karni hain:

1. `config.ts` — apne Supabase details paste karo
2. `database.sql` — iska content Supabase SQL Editor me paste karke Run karo

Bas. Koi coding nahi.

> **Admin banna:** `config.ts` me `ADMIN_EMAIL` set karo AUR `database.sql` ke top me `insert into public.admin_emails(email) values ('admin@example.com')` line me wahi email daalo. Us email se signup karte hi admin role auto-grant ho jayega.
> **Search price:** default ₹2. Admin panel → Settings se change kar sakte ho.
> **Support contacts:** Admin panel → Settings me phone / WhatsApp / email daalo — Support page aur wallet top-up modal me automatic dikhega.
> **Wallet top-up:** Users admin ko contact karenge → admin `Admin → Users & Wallets` se manually credit karega. (Payment gateway phir kabhi add kar sakte hain.)

---

## Step 1 — Requirements

Aapke computer par install hona chahiye:

- **Node.js 18+** or **Bun** (recommended) — https://bun.sh
- Ek code editor jaise VS Code (bas file kholne ke liye)

---

## Step 2 — Install & run

Project folder me terminal kholo aur:

```bash
bun install
bun run dev
```

App khulega `http://localhost:8080` par. Pehli baar aapko ek screen dikhega jo bolega **"Setup required — open config.ts"**. Ye normal hai. Neeche wale steps follow karo.

---

## Step 3 — Supabase project banao (free)

1. https://supabase.com par jao aur **Sign up** karo (Google se login easy hai)
2. **New project** click karo
3. Details bharo:
   - **Project name:** kuch bhi (e.g. `panme-shop`)
   - **Database password:** strong password (kahin note kar lo)
   - **Region:** apne country ke pass ka choose karo
4. **Create new project** — 1–2 minute wait karo project ready hone tak

---

## Step 4 — Config file edit karo

1. Supabase dashboard me apna project khol lo
2. Left sidebar → **Project Settings** (gear icon) → **API**
3. Do values copy karo:
   - **Project URL** (upar box me, `https://xxxxx.supabase.co`)
   - **anon public** key (`Project API keys` section, long string starting with `eyJ...`)

Ab code folder me `config.ts` file kholo. Aapko ye dikhega:

```ts
export const APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY-HERE",
};
```

Placeholder values ki jagah apne real values paste karo:

```ts
export const APP_CONFIG = {
  SUPABASE_URL: "https://abcdxyz12345.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
};
```

**Save** karo (`Ctrl+S` / `Cmd+S`).

---

## Step 5 — Database create karo

Ab tables, users, permissions sab ek script se ban jayenge.

1. Code folder me `database.sql` file kholo
2. **Line ~20** dhundo:
   ```sql
   insert into public.admin_emails(email) values ('admin@example.com')
   ```
   `admin@example.com` ki jagah **wahi email** daalo jo aapne `config.ts` me `ADMIN_EMAIL` me set ki thi. Us email se signup karte hi admin role auto-grant ho jayega.
3. File **save** karo (`Ctrl+S`)
4. Supabase dashboard → left sidebar → **SQL Editor** → **+ New query**
5. `database.sql` ka **saara content copy** karo (Ctrl+A → Ctrl+C) → SQL Editor me paste
6. Right-bottom me **Run** button dabao (ya `Ctrl+Enter`)
7. Green success message aana chahiye: *"Success. No rows returned."*

**Verify karo** — left sidebar → **Table Editor** me ye **7 tables** dikhni chahiye:

| Table | Purpose |
|-------|---------|
| `admin_emails` | Admin email whitelist |
| `profiles` | User name / email |
| `user_roles` | Role assignments (admin / user) |
| `wallets` | Har user ka balance |
| `wallet_transactions` | Credit / debit / refund history |
| `pan_searches` | PAN search records (Aadhaar last 4 only) |
| `app_settings` | Search price + support contacts (singleton) |

Agar koi table missing hai, SQL dobara run karo — script idempotent hai, safe hai.

---

## Step 6 — App chalao

Browser me `http://localhost:8080` refresh karo. Ab register/login screen kholega. Try karo:

1. `/register` → naam, email, password daal ke account banao
2. Supabase dashboard → **Authentication → Users** → aapka user waha dikhega
3. `/login` se wapas login karo → dashboard khulega

**Ho gaya!** App fully working hai aur pura data aapke apne Supabase me store ho raha hai.

---

## Step 6.5 — PAN Finder API setup (2 minutes)

PAN Finder feature ke liye ek Supabase **Edge Function** deploy karni hai. Ye function aapke provider API keys ko secure server-side rakhti hai — browser me kabhi expose nahi hoti.

### 6.5a — Provider keys add karo (secure, secret)

1. Supabase dashboard → left sidebar → **Edge Functions**
2. Upar right corner → **Manage secrets** (ya `Settings → Edge Functions → Secrets`)
3. **Add new secret** click karke ye do secrets add karo:

| Name | Value |
|------|-------|
| `PAN_API_KEY` | Aapki PanManager AI se mili `x-api-key` |
| `PAN_API_SECRET` | Aapki PanManager AI se mili `x-api-secret` |

> Ye values sirf server par rehti hain. Kabhi bhi `config.ts` me ya code me mat paste karna.

### 6.5b — Edge function deploy karo

Ek baar Supabase CLI install karo (agar nahi hai):

```bash
npm install -g supabase
```

Ab project folder me:

```bash
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase functions deploy pan-find
```

`<YOUR-PROJECT-REF>` = aapke Supabase project URL ka pehla part (jaise `abcdxyz12345` from `https://abcdxyz12345.supabase.co`).

Deploy successful hone par terminal me green message aayega: `Deployed Function pan-find`.

### 6.5c — Test karo

1. App me login karo
2. Admin panel → **Users & Wallets** → apne user ko kuch balance credit karo (e.g. ₹100)
3. Admin → **Settings** → **Search price** set karo (default ₹2, provider ke hisab se ₹70 bhi rakh sakte ho)
4. **PAN Finder** page kholo → 12-digit Aadhaar enter karo → Search
5. Success ho to PAN card dikhega + Copy button, fail ho to wallet auto-refund

### Kaise kaam karta hai (security summary)

- Aap **12-digit Aadhaar** enter karte ho
- Pehle server par wallet debit hota hai (RPC: `debit_wallet_for_search`) — balance kam hua to API call hi nahi hoti, error dikhta hai
- Fir edge function `pan-find` provider ko call karti hai (keys server par)
- Success → PAN card dikhta hai, no refund
- Fail / not found → server-side atomic refund (RPC: `finalize_search`)
- **Double refund impossible** — RPC pending guard hai, retry safe
- Full Aadhaar kabhi store nahi hoti — sirf last 4 digits DB me
- Provider ke wallet fields (`wallet_balance`, `provider_balance`) client tak nahi jaate

### Stuck pending search?

Agar kabhi network partition ki wajah se koi search `pending` me atak jaye (10+ min), Admin → **All Searches** tab me **Force refund** button dikhega. Safe hai — already-refunded rows par no-op ho jayega.

---

## Step 7 — Deploy (optional)

Apne server / cloud pe host karne ke liye:

```bash
bun run build
```

Ye `dist/` folder banayega. Isko in me se kahin bhi deploy kar sakte ho:

- **Vercel** — https://vercel.com → New Project → repo import → Deploy
- **Netlify** — https://netlify.com → drag-and-drop `dist/` folder
- **Cloudflare Pages** — https://pages.cloudflare.com
- **Apna VPS / cPanel** — `dist/` ka content upload kar do

`config.ts` values build me include ho jati hain, alag se kuch set karne ki zarurat nahi.

---

## Troubleshooting

### "Setup required" screen ja hi nahi raha
- `config.ts` me values save hui hain? File save karke browser hard-refresh (`Ctrl+Shift+R`) karo
- Dev server restart karo (`Ctrl+C` phir `bun run dev`)

### Register par error: "relation profiles does not exist"
- Aapne `database.sql` run nahi kiya. Step 5 dobara karo.

### Register par error: "Invalid API key" / "fetch failed"
- `config.ts` me URL ya anon key galat paste hui hai. Supabase dashboard se dobara copy karo. URL ke end me `/` nahi hona chahiye.

### Users register kar rahe hain but email confirmation aa raha hai
- Supabase → **Authentication → Providers → Email** → **"Confirm email"** toggle OFF karo agar aap instant signup chahte ho.

### Password reset chahiye
- Supabase built-in hai — code me `supabase.auth.resetPasswordForEmail()` use karo.

---

## Files reference

| File | Kya karta hai | Edit karna hai? |
|------|---------------|-----------------|
| `config.ts` | Supabase URL + key | **Yes** — Step 4 |
| `database.sql` | Tables + RLS + triggers | **Copy-paste** — Step 5 |
| `supabase/functions/pan-find/` | PAN provider edge function | **Deploy once** — Step 6.5 |
| `SETUP.md` | Ye guide | No |
| `src/**` | App source code | No |

Koi problem aaye toh `database.sql` ke top se saara SQL dobara Supabase me run kar do — script safe hai, dobara run karne se kuch nahi tootega.