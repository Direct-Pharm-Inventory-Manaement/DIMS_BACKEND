-- Demo/backfill data: there's no real dispensing feed yet, so give existing
-- medicines a plausible consumption rate (derived from their own stock level)
-- instead of leaving every prediction blank.
UPDATE "Medicine"
SET "avgDailyConsumption" = GREATEST(1, ROUND(("quantity"::numeric / 30), 1))
WHERE "avgDailyConsumption" IS NULL;
