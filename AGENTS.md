# AGENTS.md

Repository notes for `Edges-Enterprise/Edges_LandingPage` (Next.js storefront +
reseller dashboard).

## Project context

- Docs convention: `HANDOVER.md` (authoritative narrative) and
  `TASK-8-BOARD.md` (execution checklist). Update both after a fix, and note the
  commit hash. Task 8 is the current defect batch.
- **Always merge `handover/supabase-dump` into `main` in the same session you
  push the branch** (standing policy, HANDOVER.md top section) — for both this
  repo and the mobile `reseller-app`. Everything is live on web and mobile, so
  keep the two refs identical; the merge has been a clean fast-forward.
  Verify with `git merge-base --is-ancestor origin/main origin/handover/supabase-dump`
  rather than assuming, and never force-push either ref.
- Typecheck: `npx tsc --noEmit` (must be 0 before committing).
- Production URL: `https://edges-landing-page.vercel.app`.

## Vercel

- Project `edges-landing-page`, id `prj_jxynbeusJCMYJKscqALL3iVpZKyc`,
  team `team_xF3vscoESNKJIyV5aqiHOqZ4`.
- Auth for CLI/API: `$VERCEL_ACCESS_TOKEN`.
- Deploy: `npx vercel deploy --prod --yes` (or `vercel deploy --yes` for a
  preview). `vercel curl <path> --deployment <url>` bypasses deployment
  protection (SSO) on preview URLs.
- Preview URLs are blocked by deployment protection
  (`ssoProtection: all_except_custom_domains`); `vercel curl` handles it.

### Environment variables

- `type: sensitive` variables are **write-only**: the API returns
  `value: ""` and `decrypted: false`, and `vercel env pull` writes the literal
  `[SENSITIVE]`. A length of 0 therefore means *redacted*, not *blank*. To learn
  whether a value exists at runtime, deploy a temporary route that reads
  `process.env[...]` and report only presence/length — do not trust the API
  listing.
- `KORAPAY_*` and `FLUTTERWAVE_*` (secret/public/encryption) target
  `preview` **and** `production`. They used to be `production`-only, which made
  every preview deployment fund with an empty key ("authorization token is
  invalid" / "Payment provider is not configured"). `XIXAPAY_*` and the
  `NEXT_PUBLIC_SUPABASE_*` variables target all three environments.
- Updating only the `target` of an env var with
  `PATCH /v9/projects/{id}/env/{envId}` preserves the stored value (verified for
  `sensitive` vars); the CLI has no target-only update.

## Supabase

- Project ref `jjyyfaxcwanrmiipzkoj` (web app uses the same project).
- Edge functions in `supabase/functions/` (e.g. `global-store-fund-wallet`).

## Payments

- `src/lib/payments/{korapay,flutterwave,xixapay}.ts` read their secret at module
  load (`process.env.X || ""`). Both korapay and flutterwave guard a blank secret
  and return "Payment provider is not configured (<env>). Please contact
  support." — the message names `process.env.VERCEL_ENV` so a missing-secret
  report identifies the runtime.
- Country → gateway: `ng`=xixapay, `ke`/`eg`/`za`/`gh`/`cm`=korapay,
  `rw`/`ug`/`zm`=flutterwave (see `src/config/countries/*.ts`).
- The customer fund path reads the customer row through the service-role client
  (`createAdminClient`) because `global_customers` RLS grants SELECT to the store
  owner only.

## Pushing to this repo (credentials)

- The system-injected `GITHUB_TOKEN` is a GitHub **App installation token**
  (`ghu_…`, identity `Phoenix-Boss`). It authenticates and *reads* this repo —
  and the API even reports `permissions: {admin: true, push: true}` — but it
  **cannot write**: `git push` fails with `403 … denied to Phoenix-Boss`, and
  `POST /repos/…/git/refs` returns `Resource not accessible by integration`.
  Do not trust the API `permissions` block or the account name here.
- Use **`P_TOKEN`** (a classic PAT, `repo` scope) to push:
  `git push "https://${P_TOKEN}@github.com/Edges-Enterprise/Edges_LandingPage.git" main:main`.
  The `origin` remote is already pointed at this URL, so a bare `git push`
  works once the URL carries `P_TOKEN`.
- Standing policy: after pushing `handover/supabase-dump`, merge it into `main`
  (fast-forward; the two refs are normally identical) and push both, in the same
  session. Verify with `git rev-parse` on all four refs rather than assuming.
