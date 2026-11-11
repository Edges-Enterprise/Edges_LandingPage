-- Revoke public EXECUTE on the four global money RPCs.
--
-- These are SECURITY DEFINER (they bypass RLS and move wallet balances), and
-- Supabase's default privileges grant EXECUTE to PUBLIC/anon/authenticated, so
-- an unauthenticated caller holding only the public anon key could read any
-- store's balance and mint or drain wallet balances. Verified live before this
-- migration: has_function_privilege('anon', ..., 'EXECUTE') was true for all
-- four.
--
-- Only the edge/actions layer calls them, and it does so with the service-role
-- key (supabase/functions/_shared/purchaseOrchestrator.ts and
-- src/actions/reseller/publishing/purchasePublishingPlan.ts), so revoking
-- anon/authenticated closes the public door without touching the real flow.
--
-- Scope note: this closes the four RPCs recorded in HANDOVER's deferred-items
-- list. The legacy *_reseller_* / *_purchase_* / *_wallet_after_* twins are
-- left alone deliberately — changing them is a separate, riskier decision.

REVOKE ALL ON FUNCTION public.create_global_purchase_order(
  uuid, uuid, text, uuid, text, numeric, numeric, text, text, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.deduct_global_reseller_cost(
  uuid, numeric
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_global_reseller_balance(
  uuid
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.process_global_purchase_deductions(
  uuid, numeric, uuid, numeric, numeric, numeric
) FROM PUBLIC, anon, authenticated;

-- service_role keeps EXECUTE (it is the owner-delegated role the edge functions
-- use). Grant it explicitly so the intent is unambiguous and idempotent.
GRANT EXECUTE ON FUNCTION public.create_global_purchase_order(
  uuid, uuid, text, uuid, text, numeric, numeric, text, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.deduct_global_reseller_cost(
  uuid, numeric
) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_global_reseller_balance(
  uuid
) TO service_role;

GRANT EXECUTE ON FUNCTION public.process_global_purchase_deductions(
  uuid, numeric, uuid, numeric, numeric, numeric
) TO service_role;
