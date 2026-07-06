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

1. Supabase dashboard → left sidebar → **SQL Editor**
2. **+ New query** click karo
3. Code folder me `database.sql` file kholo → **saara content copy** karo (Ctrl+A → Ctrl+C)
4. Supabase ke SQL Editor me paste karo
5. Right-bottom me **Run** button dabao (ya `Ctrl+Enter`)
6. Green success message aana chahiye: *"Success. No rows returned."*

Verify karne ke liye: left sidebar → **Table Editor** → aapko `profiles`, `user_roles`, `pan_reports` tables dikhengi.

---

## Step 6 — App chalao

Browser me `http://localhost:8080` refresh karo. Ab register/login screen kholega. Try karo:

1. `/register` → naam, email, password daal ke account banao
2. Supabase dashboard → **Authentication → Users** → aapka user waha dikhega
3. `/login` se wapas login karo → dashboard khulega

**Ho gaya!** App fully working hai aur pura data aapke apne Supabase me store ho raha hai.

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
| `SETUP.md` | Ye guide | No |
| `src/**` | App source code | No |

Koi problem aaye toh `database.sql` ke top se saara SQL dobara Supabase me run kar do — script safe hai, dobara run karne se kuch nahi tootega.