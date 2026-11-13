-- Provider-scoped platform markups, and the home/cross-border split.
--
-- Two changes to `global_platform_markups`:
--
-- 1. `scope` gains 'provider'. The platform can now set a cut per provider
--    (e.g. "Lizzysub plans carry 5%"), alongside the existing default /
--    country / plan levels. The unique index on (scope, scope_key) already
--    covers the new scope, so no new index is needed.
--
-- 2. The resolution semantics split by case (see `_shared/currency/markup.ts`):
--
--      HOME (plan cost currency == store currency, i.e. a Lizzysub NGN plan
--      in an NG store): plan -> provider -> 0. No FX exists, so there is
--      nothing to convert and no buffer; the platform takes nothing unless it
--      set a plan/provider row. The reseller marks up on the RAW cost.
--
--      CROSS-BORDER (any mismatch, including every Zendit plan because Zendit
--      is USD): country -> default (12%), plus the FX buffer. Plan and
--      provider rows are HOME-ONLY and are ignored here, so a per-plan cut
--      cannot leak into the FX path.
--
-- This migration only widens the constraint; the rows themselves are set by
-- the platform-admin surface (or SQL). Existing rows are unaffected: the
-- single live row is ('default','*',12%).

ALTER TABLE public.global_platform_markups
  DROP CONSTRAINT IF EXISTS global_platform_markups_scope_check;

ALTER TABLE public.global_platform_markups
  ADD CONSTRAINT global_platform_markups_scope_check
  CHECK (scope IN ('default', 'country', 'provider', 'plan'));
