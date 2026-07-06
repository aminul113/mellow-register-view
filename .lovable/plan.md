## Issue: "Failed to send a request to the Edge Function"

Ye error ka matlab: browser Supabase tak pahuncha, lekin `pan-find` naam ka edge function us Supabase project mein **exist hi nahi karta** (ya deploy nahi hua). Isliye request bhejne se pehle hi fail ho rahi hai. Secrets add karne se ye theek nahi hoga — pehle function deploy karna zaroori hai.

Source-code sellable rahega — koi key repo mein nahi jayegi.

---

### Step-by-step (click by click)

**STEP 1 — Confirm sahi Supabase project khula hai**
1. Browser mein kholo: https://supabase.com/dashboard
2. Top-left project dropdown → wahi project select karo jiska URL `config.ts` / Vercel env `VITE_SUPABASE_URL` mein hai.
   - Aapka current URL: `https://gcaddharfmuagplvbjnp.supabase.co`
   - Project ref: **gcaddharfmuagplvbjnp** — yehi select hona chahiye.

**STEP 2 — Check karo `pan-find` function hai ya nahi**
1. Left sidebar → **Edge Functions** click karo.
2. List mein `pan-find` dhundo.
   - **Agar nahi dikh raha** → Step 3 karo (deploy).
   - **Agar dikh raha hai** → Step 4 pe jao (secrets check).

**STEP 3 — `pan-find` deploy karo (agar missing hai)**

Option A — apne computer se (recommended, ek baar ka kaam):
1. Terminal kholo, project folder mein jao.
2. Supabase CLI install (agar nahi hai):
   ```
   npm i -g supabase
   ```
3. Login:
   ```
   supabase login
   ```
4. Project link:
   ```
   supabase link --project-ref gcaddharfmuagplvbjnp
   ```
5. Deploy:
   ```
   supabase functions deploy pan-find --no-verify-jwt
   ```
6. Terminal mein "Deployed Function pan-find" dikhna chahiye.

Option B — Dashboard se manual:
1. Edge Functions → **Create a new function** → naam: `pan-find`.
2. `supabase/functions/pan-find/index.ts` ka pura code copy-paste karo.
3. **Deploy** click karo.

**STEP 4 — Secrets confirm karo (sahi jagah)**
1. Left sidebar → **Edge Functions** → top pe **Secrets** (ya **Manage secrets**) tab.
2. Dono secrets exact naam se hone chahiye (case-sensitive):
   - `PAN_API_KEY`
   - `PAN_API_SECRET`
3. Agar naam thoda alag hai (jaise `PANAPI_KEY`, `pan_api_key`, `PAN-API-KEY`) → delete karke sahi naam se dubara add karo.
4. Value paste karke **Save**.

> ⚠️ Ye secrets **sirf yahan** hone chahiye. Vercel env vars mein, `config.ts` mein, ya `.env` mein NA daalo — warna resell karte waqt buyer ki key leak ho jayegi.

**STEP 5 — Function redeploy (secrets ke baad zaroori)**
Secrets add/change karne ke baad function ko dubara deploy karo warna naye secrets pick nahi honge:
```
supabase functions deploy pan-find --no-verify-jwt
```
(Ya dashboard mein function open karke **Deploy** dubara click karo.)

**STEP 6 — App mein verify**
1. App mein login (agar logged in ho to logout → login dubara — fresh JWT ke liye).
2. **Admin Panel → Settings** tab → **"Check PAN setup"** button click.
3. Expected result: **"PAN function is deployed and provider secrets are present."**
   - Agar "function missing" aaye → Step 3 dubara.
   - Agar "missing secrets" aaye → Step 4 + Step 5.
   - Agar "ready" aaye → PAN Finder try karo.

---

### Sabse common wajah aapke case mein

Error text "Failed to send a request to the Edge Function" = **function deployed hi nahi hai**. Sirf Supabase dashboard mein secrets add karne se function auto-create nahi hota. **STEP 3 (deploy)** karna hi actual fix hai.

### Source-code sell safety (already handled)
- Repo mein koi PAN key nahi.
- `SETUP.md` mein buyer ke liye yehi steps documented hain.
- Har buyer apni Supabase, apni keys, apna deploy karega — aapki keys aur unki keys kabhi mix nahi hongi.

Agar Step 2 mein `pan-find` dikh raha hai ya nahi — mujhe screenshot bhejo ya bata do, main aage exactly wahi step guide karunga.
