-- Task 2, pointer 3.a.ii.zi.x
-- Flip the Android App toggle's DB-level default from off to on, to
-- match the application-flow default fixed in 1.a/1.b (StoreConfigStep.tsx
-- and ApplicationWizard.tsx). This is a schema-only default change:
-- it affects only future inserts that don't explicitly set the column
-- (belt-and-suspenders — the application flow always sets it explicitly
-- already). It intentionally does NOT touch any existing row's value.
--
-- Do not add an UPDATE statement here. See Task 2 / 3.a.iii in
-- HANDOVER.md for why existing `false` rows must not be backfilled.

ALTER TABLE public.global_reseller_applications
    ALTER COLUMN android_app SET DEFAULT true;

ALTER TABLE public.resellers
    ALTER COLUMN android_app SET DEFAULT true;
