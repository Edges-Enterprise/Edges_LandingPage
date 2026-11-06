-- Platform markup default: 12%.
--
-- Phase 2 seeded this row at 0 ("no platform markup yet"), which shipped the
-- raw Zendit wholesale cost to resellers as their cost basis — the platform's
-- markup rung existed but was never taken. The reseller marks up on the
-- PLATFORM price (cost + platform markup + FX buffer), so a zero here means
-- the platform earns nothing and the reseller's margin absorbs the FX risk the
-- platform is supposed to carry.
--
-- 12% is the design's worked-example figure (HANDOVER.md, "Worked example —
-- RW store, UG destination"). The intended band is 12-18%; country- and
-- plan-scoped rows in `global_platform_markups` override this default
-- (replace, not stack), so a volatile currency can carry more.
--
-- The FX buffer is separate and already set per currency in
-- `global_currencies.buffer_fraction` (2-3%).

UPDATE public.global_platform_markups
SET markup_type = 'percentage',
    markup_value = 12,
    updated_at = NOW()
WHERE scope = 'default' AND scope_key = '*';
