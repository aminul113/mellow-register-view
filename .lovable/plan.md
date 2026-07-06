## Fix: "Failed to send a request to the Edge Function" — Click by Click

Ye error ka matlab: `pan-find` naam ka edge function aapke Supabase project mein deploy hi nahi hua hai. Sirf secrets add karne se kaam nahi chalega. Neeche exact clicks hain — jo screen aayegi wahi likhi hai.

Documentation mein koi issue nahi hai — issue sirf deployment ka hai.

---

### PART A — Check karo function deployed hai ya nahi

**Click 1:** Browser mein kholo → `https://supabase.com/dashboard`

**Click 2:** Login karo (agar nahi ho) → Google/GitHub/email.

**Click 3:** Login ke baad **"Projects"** list dikhegi. Us project pe click karo jiska ref hai: **`gcaddharfmuagplvbjnp`**
   - (Project name aapne jo rakha hoga wo dikhega. URL check: `https://supabase.com/dashboard/project/gcaddharfmuagplvbjnp` — yehi khulna chahiye.)

**Click 4:** Left sidebar mein icons dikhengi. Neeche scroll karke **⚡ Edge Functions** icon dhundo aur click karo.
   - (Icon: bijli/lightning bolt jaisa.)

**Click 5:** Ab screen pe function list aayegi. Yahan 2 me se 1 dikhega:

   **Case A — List EMPTY hai** ya `pan-find` naam ka function nahi hai
   → PART B karo (deploy karna hai).

   **Case B — `pan-find` naam ka row dikh raha hai**
   → PART C karo (secrets check).

---

### PART B — Function deploy karo (agar Case A)

Ye ek baar ka kaam hai. Aapke computer par karna hoga:

**Click 1:** Apne PC/laptop pe **Terminal** kholo (Windows: PowerShell, Mac: Terminal).

**Click 2:** Type karo aur Enter:
```
npm install -g supabase
```
   - Wait karo jab tak "added N packages" na dikhe.

**Click 3:** Type karo:
```
supabase login
```
   - Browser khulega → **"Authorize"** button pe click karo.
   - Terminal mein "You are now logged in" dikhega.

**Click 4:** Apne project folder mein jao. Type karo (folder ka path badlo):
```
cd path/to/your/project
```

**Click 5:** Type karo:
```
supabase link --project-ref gcaddharfmuagplvbjnp
```
   - Database password pooche to Enter dabao (skip ho jayega).

**Click 6:** Ab deploy command:
```
supabase functions deploy pan-find --no-verify-jwt
```
   - 10-30 seconds wait.
   - Terminal mein green text: **"Deployed Function pan-find on project gcaddharfmuagplvbjnp"** dikhna chahiye.

**Click 7:** Wapas browser → Supabase dashboard → Edge Functions page **refresh** (F5) karo.
   - Ab `pan-find` list mein dikhega.

Ab PART C karo.

---

### PART C — Secrets check aur add karo

**Click 1:** Edge Functions page pe hi ho. Top ke tabs mein dhundo:
   - Tabs: **Functions | Secrets | Logs | Details**
   - **"Secrets"** tab pe click karo.
   - (Ya kabhi-kabhi button "Manage secrets" naam se hota hai — wahi click karo.)

**Click 2:** List mein dekho ye 2 naam hain ya nahi:
   - `PAN_API_KEY`
   - `PAN_API_SECRET`

   **Agar dono hain aur naam exactly wahi hai** → PART D pe jao.

   **Agar naam alag hai** (jaise `panapi_key`, `PAN-API-KEY`, `PanApiKey`):
   - Us row ke right side **⋯ (3 dots)** → **Delete** → confirm.
   - Aur naye naam se add karo (neeche steps).

   **Agar naam hi nahi hai:**

**Click 3:** Top-right **"+ Add new secret"** button click karo.

**Click 4:** Popup khulega:
   - **Key:** field mein type karo → `PAN_API_KEY` (exact caps, underscore).
   - **Value:** field mein PanManager se mili key paste karo.
   - **Save** button click karo.

**Click 5:** Wapas **"+ Add new secret"** click karo:
   - **Key:** `PAN_API_SECRET`
   - **Value:** PanManager ka secret paste karo.
   - **Save**.

**Click 6:** ⚠️ **Ab function ko dubara deploy karna zaroori hai** (naye secrets pick karne ke liye). Terminal mein wapas:
```
supabase functions deploy pan-find --no-verify-jwt
```
   - "Deployed Function pan-find" dubara dikhega.

---

### PART D — App mein verify karo

**Click 1:** Apni deployed app kholo (Vercel URL ya `mellow-register-view.lovable.app`).

**Click 2:** Agar already logged in ho → top-right profile/menu → **Logout** → dubara **Login** karo. (Fresh session ke liye.)

**Click 3:** Left sidebar → **Admin Panel** click karo.

**Click 4:** Top tabs mein → **Settings** tab click karo.

**Click 5:** Neeche scroll karo → **"Check PAN setup"** naam ka button dhundo → click karo.

**Click 6:** 2-3 seconds wait. Result box mein 1 message aayega:

   | Message | Matlab | Fix |
   |---|---|---|
   | ✅ "PAN function is deployed and provider secrets are present" | Sab theek | PAN Finder use karo |
   | ❌ "function missing" / "not deployed" | PART B skip hua | PART B dubara karo |
   | ⚠️ "missing secrets" | Secrets nahi | PART C dubara karo |
   | ⚠️ "unauthorized" | Session purani | Logout → Login |

**Click 7:** Green message aane ke baad → left sidebar → **PAN Finder** → Aadhaar number daalo → **Search** → ab kaam karega.

---

### Agar phir bhi atka

Batao aap kis STEP pe atke:
- PART A ke Click 5 pe `pan-find` dikha ya nahi?
- PART B ke Click 6 pe terminal mein kya error aaya?
- PART D ke Click 6 pe exact kya message aaya?

Screenshot bhej sako to aur bhi accha — main us screen ke hisaab se next click bata dunga.
