# Fix SQL syntax error in database.sql

## Problem

The user ran `database.sql` and got:

```
ERROR: 42601: syntax error at or near "@"
LINE 20: insert into public.admin_emails(admin@panme.shop) values ('admin@example.com')
```

Line 20 has the column placeholder/value swapped: `admin@panme.shop` was written as the column name, and `'admin@example.com'` as the value. The correct column name is `email`.

## Change

Edit `database.sql` line 20:

```sql
-- before
insert into public.admin_emails(admin@panme.shop) values ('admin@example.com')
  on conflict do nothing;

-- after
insert into public.admin_emails(email) values ('admin@panme.shop')
  on conflict do nothing;
```

No other tables, policies, or app code are changed.

## Verification

- Re-run `database.sql` in Supabase SQL Editor; it should complete without the 42601 error.
- After running, `public.admin_emails` should contain one row: `admin@panme.shop`.
- The script is idempotent (`on conflict do nothing`), so re-running is safe.
