# This entire directory is disabled dead scaffold code

Every `.tsx` file here has been renamed to `.tsx.disabled` to unblock
the Vercel build. Confirmed via repo-wide search: **none of these
files are imported anywhere else in the app.** Same pattern as the
`supabase/rpc/**` scaffold found and removed in Task 1 (see
`HANDOVER.md`) — components that were scaffolded early on but never
actually wired into a real page, then left to bit-rot as the real
action functions they call evolved out from under them.

Every file checked so far has the same shape of bug: it calls a real
server action with an outdated calling convention — usually old
positional arguments (`fn(amount, method)`) where the real action now
takes a single options object with a different, often-incompatible
shape (a required field the modal never had, like `countryCode`; or a
field name that no longer exists, like `paymentMethod` vs.
`mobileMoney`). These aren't mechanical fixes — reconciling them
requires real product/business-logic decisions the person doing this
should make deliberately, not a sandbox session guessing.

**To re-enable any one of these:** read it against the real action
function it's supposed to call (check `src/actions/reseller/**` for
the matching action), rewrite the call against that action's actual
current parameter shape, confirm the resulting behavior is what's
actually wanted (not just "what compiles"), wire it into an actual
page/trigger so it's not still orphaned, rename `.tsx.disabled` back
to `.tsx`, and remove its entry from this README.

| File | Status |
|---|---|
| `CreateOrderModal.tsx.disabled` | Reviewed — see header comment in the file for specifics (`plan.price` field ambiguity) |
| `FundWalletModal.tsx.disabled` | Reviewed — see header comment in the file for specifics (`fundWallet` signature mismatch); a *different*, actually-used `FundWalletModal` exists at `src/app/[countryCode]/dashboard/wallet/FundWalletModal.tsx` — don't confuse the two |
| `CreateCustomerModal.tsx.disabled` | Not yet reviewed in detail — disabled on sight, same orphaned-directory pattern |
| `CreatePlanModal.tsx.disabled` | Not yet reviewed in detail |
| `EditPlanModal.tsx.disabled` | Not yet reviewed in detail |
| `PurchaseModal.tsx.disabled` | Not yet reviewed in detail |
| `SupportTicketModal.tsx.disabled` | Not yet reviewed in detail |
| `WithdrawModal.tsx.disabled` | Confirmed same bug pattern: calls `withdrawFunds(amount, bankDetails)` positionally; real action's actual signature not yet checked in detail |
