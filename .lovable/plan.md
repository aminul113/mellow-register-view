## Kyun Admin show nahi ho raha

Aap ne Vercel me `VITE_ADMIN_EMAIL` set kar diya — lekin admin role **frontend se decide nahi hoti**. Role Supabase database me `user_roles` table me store hoti hai, aur ye ek DB trigger deta hai jab koi user signup karta hai — trigger check karta hai ki us user ka email `admin_emails` table me hai ya nahi.

`VITE_ADMIN_EMAIL` sirf `config.ts` ka fallback hai (UI/branding side), Supabase trigger use nahi karta. Isliye:

- Agar `database.sql` chalate waqt line 20 pe `'admin@example.com'` ko apne email se **replace nahi kiya**, to `admin_emails` table me aapka email nahi hai → trigger admin role nahi deta.
- Agar aap apne admin email se signup **pehle** kar chuke ho aur baad me email add kiya, tab bhi trigger dobara nahi chalega — pehle wale user ke liye role manually daalna padega.

## Fix karne ka plan (2 chhoti cheezein)

### Part A — Aap ke Supabase pe abhi ka fix (1 SQL query)

Supabase Dashboard → SQL Editor me ye paste karke Run karo (email apna daalo — wahi jo Vercel ke `VITE_ADMIN_EMAIL` me hai aur jis se aap login karte ho):

```sql
-- 1) admin_emails me apna email daalo (agar pehle se hai to skip ho jayega)
insert into public.admin_emails(email) values ('YOUR-EMAIL@example.com')
on conflict (email) do nothing;

-- 2) Agar aap pehle se signup kar chuke ho, admin role bhi manually daal do
insert into public.user_roles(user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = lower('YOUR-EMAIL@example.com')
on conflict (user_id, role) do nothing;
```

Iske baad app me **logout → login** karo — sidebar me "Admin Panel" aa jayega.

### Part B — Future buyers ke liye ek chhoti code change

Taaki naye buyer ko bhi ye issue na aaye, main `database.sql` me trigger ko thoda smart bana dunga: `admin_emails` table ke saath-saath ek Supabase secret `ADMIN_EMAIL` (agar set ho) ko bhi check karega. Fir buyer sirf 1 jagah admin email set kare — Supabase Dashboard → Project Settings → Database → Custom config me `app.admin_email` set karne ka simple option, ya seedhe SQL me insert.

Files jo edit hongi:

- `database.sql` — trigger me `admin_emails` check ke saath fallback jodna, aur SETUP.md me clearer 1-line instruction.
- `SETUP.md` — Vercel deploy ke baad "Admin Panel dikhane ke liye ye SQL chalao" wala box add karna (upar wali SQL).
- `README.md` — env vars table me note: "VITE_ADMIN_EMAIL sirf UI ke liye. Real admin role ke liye `admin_emails` table me email daalna zaroori hai — SETUP.md dekhein."

### Jo change NAHI hoga

- Koi business logic / RLS / edge function / branding / swal / skeleton kuch nahi.
- Frontend me role check waise ka waisa hi rahega (`isCurrentUserAdmin` → `user_roles` table).

## Aap ka action abhi

Part A wali SQL turant chalao — 30 second me admin dikhne lagega. Part B main tabhi implement karunga jab aap "Approve plan" karoge (source code sell karne ke liye future-proof). but dhyan rakho ki a source code sell karunga to oncer per user ka hona chahiye 