-- The previous backfill skipped any medicine that already had *some*
-- ConsumptionRecord history (e.g. from an earlier manual seed run), but that
-- history can be weeks old and fall outside the velocity chart's query
-- window, leaving it showing zeros. Refresh the last 30 days unconditionally
-- for every medicine instead of only filling in medicines with no rows at all.
INSERT INTO "ConsumptionRecord" (id, "medicineId", date, quantity)
SELECT
  gen_random_uuid()::text,
  m.id,
  (CURRENT_DATE - (d::text || ' days')::interval)::timestamp,
  GREATEST(0, ROUND(
    (8 + (abs(hashtext(m."batchNo")) % 15))
    * (0.7 + (abs(hashtext(m."batchNo" || d::text)) % 100) / 100.0 * 0.8)
  ))::int
FROM "Medicine" m
CROSS JOIN generate_series(1, 30) AS d
ON CONFLICT ("medicineId", "date") DO UPDATE SET quantity = EXCLUDED.quantity;
