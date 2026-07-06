
## Problem

Gateway se payment successfully capture ho raha hai, but return page pe "Payment failed" dikh raha hai. Yeh **aapki side ka issue hai**, gateway ka nahi — verify server route (`/api/payment-verify`) provider ke status response ko sahi se interpret nahi kar raha.

## Root cause (verified in code)

`src/routes/api/payment-verify.ts` gateway ke status API ko call karta hai aur `result.txnStatus` field padhta hai. Sirf `"SUCCESS"` / `"success"` ko success maanta hai, `"PENDING"` ko pending, aur **baaki sab kuch turant failed maan ke `mark_payment_failed` RPC call kar deta hai**. Iski wajah se:

1. **Status field ka naam / path alag ho sakta hai** — RapidX-style providers kabhi `result.txnStatus`, kabhi `status`, kabhi `data.status` return karte hain. Agar path match nahi hua toh `undefined` → failed.
2. **Late confirmation** — payment capture hone ke turant baad status API abhi bhi `PENDING` ya blank return kar sakti hai. User redirect ho jaata hai issi window mein, aur pehli hi verify call permanently `failed` mark kar deti hai. Baad me webhook aane par bhi order pehle se failed hone ki wajah se short-circuit ho jaata hai (verify route `status === 'failed'` par turant return karta hai).
3. **Success values list chhoti hai** — real gateways `"COMPLETED"`, `"PAID"`, `"CAPTURED"`, `1`, `"1"`, `true` bhi bhejte hain.

## Fix (my side — no gateway change needed)

### 1. `src/routes/api/payment-verify.ts`
- **Never mark failed on first unknown response.** If `txnStatus` is `undefined`/null/empty or not in success/pending list, return `pending` (not failed). Only call `mark_payment_failed` when provider explicitly returns a known failure value (`FAILURE`, `FAILED`, `CANCELLED`, `EXPIRED`, `DECLINED`).
- **Broaden success detection**: also accept `COMPLETED`, `PAID`, `CAPTURED`, `1`, `true`.
- **Fallback status paths**: if `result.txnStatus` is undefined, try `status`, `data.status`, `result.status`, `txnStatus`, `payment_status` before deciding.
- **Return `raw` provider JSON in the response** (dev builds only, gated by a query flag `?debug=1`) so we can see exactly what RapidX sent — makes future tuning trivial.
- **Log the full raw response** with `console.log` so it shows in server-function logs.
- Remove the short-circuit on `status === 'failed'` OR add a "retry-verify" mode — but simpler: because we won't mark failed anymore on unknown, the row will stay `pending` and re-poll will work.

### 2. `src/routes/api/public/payment-callback.ts` (webhook)
Apply the same three rules (broader success values, fallback paths, don't mark failed on unknown).

### 3. `config.ts` — expand default lists
```ts
successValues: ["SUCCESS","success","COMPLETED","completed","PAID","paid","CAPTURED","captured",1,"1",true,"true"],
pendingValues: ["PENDING","pending","INITIATED","initiated","PROCESSING","processing"],
failureValues: ["FAILURE","failure","FAILED","failed","CANCELLED","cancelled","EXPIRED","expired","DECLINED","declined"],
```
Add new `failureValues` field and use it in both routes.

### 4. Return page (`src/routes/app.payment-return.tsx`)
- Increase polling from ~1 min (12 tries) to ~2 min (24 tries) — gateway callbacks sometimes take longer.
- Show a "raw response" collapsible details panel when status is failed, populated from the verify response, so you can see the actual gateway payload while debugging live.

### 5. One-time DB cleanup helper
Since some `payment_orders` rows are already stuck in `failed` state even though the money was captured, add a small admin action (button on Admin → Users → Credit page already exists) — no schema change needed. Just document: for stuck orders, re-run status manually or credit via existing `adminCreditWallet`.

## What NOT to change

- Database schema, RPCs (`credit_wallet_for_payment`, `mark_payment_failed`) — they're correct and idempotent.
- Payment create route — order creation is working.
- Webhook URL / redirect URL — already correct.
- Gateway dashboard settings — no change needed on RapidX side.

## After deploy

1. Do one ₹10 test payment.
2. On the return page, if it shows failed with a raw JSON panel, paste that JSON back to me — we'll add whatever exact status string RapidX returns to `successValues`.
3. Once verified, remove the debug panel.
