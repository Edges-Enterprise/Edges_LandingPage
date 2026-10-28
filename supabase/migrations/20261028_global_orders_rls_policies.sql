-- 20261028_global_orders_rls_policies.sql
--
-- global_orders had RLS enabled and the standard table grants to
-- `authenticated`, but no policies at all. With RLS on and no policy, Postgres
-- denies by default, so every reseller SELECT returned an empty set: the
-- dashboard orders page showed "No orders yet" and 0 in every stat card no
-- matter how many orders the store actually had. Verified live against project
-- jjyyfaxcwanrmiipzkoj (pg_policies returned no rows for global_orders, while
-- global_customers had its four owner policies).
--
-- The orders page reads with the reseller's own session, and UpdateStatusModal
-- writes the new status with the browser client, so both SELECT and UPDATE are
-- needed. INSERT and DELETE are not granted: orders are created by the purchase
-- RPC and the service-role purchase flow, and resellers must not be able to
-- remove order records. The owner check mirrors the global_customers policies.

CREATE POLICY "Resellers can view their own orders"
  ON public.global_orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_orders.reseller_id
    )
  );

CREATE POLICY "Resellers can update their own orders"
  ON public.global_orders
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_orders.reseller_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT global_reseller_applications.auth_user_id
      FROM public.global_reseller_applications
      WHERE global_reseller_applications.id = global_orders.reseller_id
    )
  );
