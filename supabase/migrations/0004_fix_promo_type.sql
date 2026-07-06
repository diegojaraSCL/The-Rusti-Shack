-- Fix: the actual data includes a 'Holiday' PromoType not covered by the
-- original CHECK constraint (the data dictionary's example list wasn't
-- exhaustive). Run this once in the Supabase SQL Editor before resuming
-- the historical data load.

alter table "Promotions" drop constraint if exists "Promotions_PromoType_check";
alter table "Promotions" add constraint "Promotions_PromoType_check"
  check ("PromoType" in ('Seasonal','Loyalty','Shipping','Daily','Holiday'));
