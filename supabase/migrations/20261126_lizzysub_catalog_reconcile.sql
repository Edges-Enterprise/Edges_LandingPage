-- 20261126_lizzysub_catalog_reconcile.sql
--
-- Reconciles public.global_base_plans (provider 'lizzysub') with the live
-- Lizzysub catalogue, and re-points the two plans that have an exact
-- successor for stores created on/after 2026-11-20.
--
-- Findings and evidence: HANDOVER.md, "Task 13 — Lizzysub catalog drift".
-- Safe to re-run: every statement is idempotent.
--
-- Out of scope by owner decision: per-reseller configs for stores created
-- before 2026-11-20 (they are not re-priced or re-pointed here).

-- 1. Free the four ids that Lizzysub now uses for a DIFFERENT product.
--    Deactivating alone is not enough: the next sync would see the id in the
--    provider's list and reactivate the old row. Renaming to 'legacy-<id>'
--    tombstones it, keeps the row (and its config FKs) and frees the key.
update public.global_base_plans
   set provider_plan_id = 'legacy-' || provider_plan_id,
       is_active = false,
       updated_at = now()
 where provider = 'lizzysub'
   and provider_plan_id in ('239', '242', '243', '311')
   and provider_plan_id not like 'legacy-%';

-- 2. Deactivate ids Lizzysub no longer publishes. Lizzysub answers an unknown
--    id with "Invalid Data Plan ID or Network", so every one of these is a
--    purchase that can only fail.
update public.global_base_plans
   set is_active = false,
       updated_at = now()
 where provider = 'lizzysub'
   and is_active
   and provider_plan_id in (
     '12', '49', '83', '152', '174', '219', '220', '237', '251', '267',
     '269', '270', '277', '305', '307', '308', '309', '310'
   );

-- 3. Raise the 48 rows priced below provider cost, rounded up to the
--    next ₦5 (under ₦1,000) or ₦10, which is the existing buffer convention.
--    Rows already at or above cost are left untouched: their buffer stays.
update public.global_base_plans b
   set base_price = v.price,
       updated_at = now()
  from (values
    ('14', 780.00),
    ('15', 1470.00),
    ('51', 760.00),
    ('55', 2440.00),
    ('56', 2930.00),
    ('71', 480.00),
    ('72', 960.00),
    ('73', 1430.00),
    ('75', 2380.00),
    ('76', 4750.00),
    ('78', 295.00),
    ('85', 100.00),
    ('90', 5850.00),
    ('121', 14630.00),
    ('122', 9750.00),
    ('123', 7800.00),
    ('125', 19500.00),
    ('126', 48750.00),
    ('141', 1950.00),
    ('142', 1950.00),
    ('144', 975.00),
    ('145', 4880.00),
    ('146', 1460.00),
    ('148', 2440.00),
    ('149', 2930.00),
    ('150', 3900.00),
    ('151', 4880.00),
    ('166', 490.00),
    ('167', 490.00),
    ('168', 29250.00),
    ('218', 195.00),
    ('229', 720.00),
    ('230', 1100.00),
    ('231', 1500.00),
    ('235', 810.00),
    ('236', 1150.00),
    ('248', 490.00),
    ('257', 6500.00),
    ('262', 330.00),
    ('263', 345.00),
    ('264', 990.00),
    ('274', 1470.00),
    ('281', 585.00),
    ('284', 345.00),
    ('286', 1030.00),
    ('287', 1650.00),
    ('288', 1710.00),
    ('306', 3100.00)
  ) as v(pid, price)
 where b.provider = 'lizzysub'
   and b.provider_plan_id = v.pid
   and b.base_price < v.price;

-- 4. Import the plans Lizzysub publishes that the catalogue lacks.
--    Skipped on purpose: the ₦500,000 test plan (311, tombstoned above),
--    the ₦500 / 10MB plan (330) and the Airtel COOPERATE GIFTING 1.2–20GB
--    set (312, 314–319) until the "not all sims are eligible" rule is
--    confirmed with the provider.
insert into public.global_base_plans
  (provider, provider_plan_id, country_code, network, name, description,
   category, data_amount, validity, duration_days, base_price, currency,
   metadata, is_active, price_type, last_seen_at, synced_at)
values
  ('lizzysub', '259', 'NG', 'GLO', '6.01GB', 'Get 6.01GB Always ON (410MB Daily for 15 days). Valid for 15 days.', 'data',
   '6.01GB', '15 days', 15, 1860.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 259, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '320', 'NG', 'MTN', '2.00GB', '20-30days (stable)', 'data',
   '2.00GB', '20-30 days', null, 800.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 320, 'plan_type', 'SME', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '321', 'NG', 'MTN', '5.00GB', '20-30days (stable)', 'data',
   '5.00GB', '20-30 days', null, 1550.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 321, 'plan_type', 'SME', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '322', 'NG', 'MTN', '3.00GB', '20-30days (stable)', 'data',
   '3.00GB', '20-30 days', null, 1200.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 322, 'plan_type', 'SME', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '323', 'NG', 'MTN', '2.000GB', '7days', 'data',
   '2.000GB', '7 days', 7, 770.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 323, 'plan_type', 'SME', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '324', 'NG', 'GLO', '30GB', 'Get 30GB Always ON (1GB Daily for 30 days). Valid for 30 days.', 'data',
   '30GB', '30 days', 30, 4650.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 324, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '325', 'NG', 'GLO', '45GB', 'Get 45GB Always ON (1.5GB Daily for 30 days).', 'data',
   '45GB', '30 days', 30, 6510.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 325, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '326', 'NG', 'GLO', '500MB', 'Get 500MB Tuesday Data Fiesta (100MB 12AM-5AM). Valid for 1 day. It works only on TUESDAY', 'data',
   '500MB', '1 day (Tuesday only)', 1, 95.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 326, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '327', 'NG', 'GLO', '1.0GB', 'Get 1GB Tuesday Data Fiesta. Valid for 1 day. It works only on TUESDAY', 'data',
   '1.0GB', '1 day (Tuesday only)', 1, 190.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 327, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '328', 'NG', 'GLO', '3.0GB', 'Get 3GB Tuesday Data Fiesta (1024MB 12AM-5AM). Valid for 1 day. It works only on TUESDAY', 'data',
   '3.0GB', '1 day (Tuesday only)', 1, 465.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 328, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '329', 'NG', 'GLO', '6GB', 'Get 6GB Tuesday Data Fiesta (1024MB 12AM-5AM). Valid for 1 day. It works only on Tuesday', 'data',
   '6GB', '1 day (Tuesday only)', 1, 840.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 329, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '331', 'NG', 'MTN', '200MB', 'Less than 7days', 'data',
   '200MB', 'Less than 7 days', 7, 110.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 331, 'plan_type', 'SME', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '332', 'NG', 'MTN', '150GB', '30days', 'data',
   '150GB', '30 days', 30, 29100.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 332, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '335', 'NG', 'MTN', '4GB', '2 days', 'data',
   '4GB', '2 days', 2, 970.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 335, 'plan_type', 'COOPERATE GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '336', 'NG', 'MTN', '5GB', '2days', 'data',
   '5GB', '2 days', 2, 1170.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 336, 'plan_type', 'COOPERATE GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '337', 'NG', 'MTN', '6.5GB', '2days', 'data',
   '6.5GB', '2 days', 2, 1460.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 337, 'plan_type', 'COOPERATE GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '338', 'NG', 'MTN', '8GB', '2days', 'data',
   '8GB', '2 days', 2, 1750.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 338, 'plan_type', 'COOPERATE GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '339', 'NG', 'MTN', '18.6GB', 'Always On Plan (620MB daily allocation for 30days) valid for 30days', 'data',
   '18.6GB', '30 days', 30, 5340.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 339, 'plan_type', 'COOPERATE GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '340', 'NG', 'MTN', '45GB', 'Always On Plan (1.5GB daily allocation for 30days) valid for 30days', 'data',
   '45GB', '30 days', 30, 8730.00, 'NGN',
   jsonb_build_object('network', 'MTN', 'plan_id', 340, 'plan_type', 'COOPERATE GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '342', 'NG', 'GLO', '2500MB', 'Get 2.5GB guaranteed + Magic Bonus of 500MB to 7.5GB. Valid for 30 days.', 'data',
   '2500MB', '30 days', 30, 1490.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 342, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now()),
  ('lizzysub', '343', 'NG', 'GLO', '8GB', 'Get 8GB guaranteed + Magic Bonus of 1GB to 12GB. Valid for 30 days.', 'data',
   '8GB', '30 days', 30, 3260.00, 'NGN',
   jsonb_build_object('network', 'GLO', 'plan_id', 343, 'plan_type', 'GIFTING', 'original_table', 'lizzysub_import_20261126'), true, 'FIXED', now(), now())
on conflict (provider, provider_plan_id) do update
   set name = excluded.name,
       description = excluded.description,
       network = excluded.network,
       data_amount = excluded.data_amount,
       validity = excluded.validity,
       duration_days = excluded.duration_days,
       base_price = excluded.base_price,
       currency = excluded.currency,
       metadata = excluded.metadata,
       is_active = true,
       price_type = 'FIXED',
       last_seen_at = now(),
       synced_at = now(),
       updated_at = now();

-- 5. Re-point the two plans that have an exact successor, for stores created
--    on/after 2026-11-20 only. The config row (markup_type / markup_value /
--    selling_price) is carried across unchanged, so each reseller keeps the
--    markup they set. The NOT EXISTS guard protects the
--    (reseller_id, plan_id) unique index.

update public.global_reseller_plan_configs c
   set plan_id = n.id,
       updated_at = now()
  from public.global_base_plans o,
       public.global_base_plans n
 where o.provider = 'lizzysub' and o.provider_plan_id = '152'
   and n.provider = 'lizzysub' and n.provider_plan_id = '332'
   and c.plan_id = o.id
   and c.reseller_id in (
     select id from public.global_reseller_applications
      where created_at >= timestamptz '2026-11-20 00:00:00+00'
        and lower(country_code) = 'ng'
   )
   and not exists (
     select 1 from public.global_reseller_plan_configs x
      where x.reseller_id = c.reseller_id and x.plan_id = n.id
   );

update public.global_reseller_plan_configs c
   set plan_id = n.id,
       updated_at = now()
  from public.global_base_plans o,
       public.global_base_plans n
 where o.provider = 'lizzysub' and o.provider_plan_id = '251'
   and n.provider = 'lizzysub' and n.provider_plan_id = '327'
   and c.plan_id = o.id
   and c.reseller_id in (
     select id from public.global_reseller_applications
      where created_at >= timestamptz '2026-11-20 00:00:00+00'
        and lower(country_code) = 'ng'
   )
   and not exists (
     select 1 from public.global_reseller_plan_configs x
      where x.reseller_id = c.reseller_id and x.plan_id = n.id
   );

