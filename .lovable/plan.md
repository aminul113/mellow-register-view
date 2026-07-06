## Fix: `has_role` referenced before it exists in `database.sql`

### Problem
`database.sql` creates the `profiles` table policies at the top, and those policies call `public.has_role(auth.uid(),'admin')`. But the `has_role` function is defined later in the "roles" section. Postgres runs the file top-to-bottom, so when the `profiles` policy is created the function does not exist yet → `42883: function public.has_role(uuid, unknown) does not exist`.

### Fix (single file: `database.sql`)
Reorder sections so roles + `has_role()` are created **before** any policy that calls it:

```text
1. admin_emails            (no has_role refs — OK)
2. app_role enum
3. user_roles table + GRANTs + RLS enable
4. has_role() function          ← must exist before step 5+
5. user_roles policies
6. profiles  (table + policies that call has_role)
7. app_settings
8. wallets   (policies call has_role)
9. wallet_transactions (policies call has_role)
10. pan_searches       (policies call has_role)
11. handle_new_user trigger
12. updated_at helpers
13. RPCs (already use has_role — fine, they come last)
```

No SQL logic changes — only section order. All `create policy` / `create table` statements stay identical. Idempotency (`if not exists`, `do $$ ... exception when duplicate_object`) is preserved so re-running remains safe.

### Buyer action after fix
Re-run the updated `database.sql` in Supabase SQL Editor. Because everything is idempotent, partial objects from the failed run won't cause errors — the reordered file will complete cleanly.

### Files touched
- `database.sql` — reorder only (no new tables, no new policies, no behavior change)

No changes to app code, edge function, `SETUP.md`, or `config.ts`.
