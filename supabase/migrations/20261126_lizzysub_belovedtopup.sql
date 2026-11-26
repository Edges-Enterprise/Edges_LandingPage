-- 20261126_lizzysub_belovedtopup.sql
--
-- Brings BelovedTopup (created 2026-11-19, brought into scope by the owner)
-- in line with the reconciled Lizzysub catalogue.
--
-- Two things only:
--   1. Re-point the two plans that have an exact successor (152 -> 332,
--      251 -> 327), carrying the reseller's own markup across.
--   2. Recompute selling_price from that markup where the stored price had
--      fallen below the new base cost.
--
-- The reseller's markup (markup_type / markup_value) is never changed: the
-- stored selling_price is set back to base + markup, which is what the
-- pricing pipeline would charge if selling_price were null. Safe to re-run.

-- 1. Re-point 152 -> 332 and 251 -> 327.
update public.global_reseller_plan_configs c
   set plan_id = n.id,
       selling_price = round(
         case
           when c.markup_type = 'fixed'
             then n.base_price + c.markup_value
           else n.base_price * (1 + c.markup_value / 100.0)
         end,
         2
       ),
       updated_at = now()
  from public.global_base_plans o,
       public.global_base_plans n,
       public.global_reseller_applications a
 where a.id = c.reseller_id
   and a.store_name = 'BelovedTopup'
   and o.provider = 'lizzysub'
   and o.provider_plan_id = '152'
   and n.provider = 'lizzysub'
   and n.provider_plan_id = '332'
   and c.plan_id = o.id
   and not exists (
     select 1 from public.global_reseller_plan_configs x
      where x.reseller_id = c.reseller_id and x.plan_id = n.id
   );

update public.global_reseller_plan_configs c
   set plan_id = n.id,
       selling_price = round(
         case
           when c.markup_type = 'fixed'
             then n.base_price + c.markup_value
           else n.base_price * (1 + c.markup_value / 100.0)
         end,
         2
       ),
       updated_at = now()
  from public.global_base_plans o,
       public.global_base_plans n,
       public.global_reseller_applications a
 where a.id = c.reseller_id
   and a.store_name = 'BelovedTopup'
   and o.provider = 'lizzysub'
   and o.provider_plan_id = '251'
   and n.provider = 'lizzysub'
   and n.provider_plan_id = '327'
   and c.plan_id = o.id
   and not exists (
     select 1 from public.global_reseller_plan_configs x
      where x.reseller_id = c.reseller_id and x.plan_id = n.id
   );

-- 2. Any enabled config still priced below base cost gets its markup back.
--    Plan 72 had a hand-set ₦800 against a ₦960 cost; its own markup says
--    +₦232, so it goes to ₦1,192. Plans 263 and 281 declare 0% markup, so
--    they land exactly at cost.
update public.global_reseller_plan_configs c
   set selling_price = round(
         case
           when c.markup_type = 'fixed'
             then b.base_price + c.markup_value
           else b.base_price * (1 + c.markup_value / 100.0)
         end,
         2
       ),
       updated_at = now()
  from public.global_base_plans b,
       public.global_reseller_applications a
 where a.id = c.reseller_id
   and a.store_name = 'BelovedTopup'
   and b.id = c.plan_id
   and b.provider = 'lizzysub'
   and b.is_active
   and c.enabled
   and c.selling_price is not null
   and c.selling_price < b.base_price;
