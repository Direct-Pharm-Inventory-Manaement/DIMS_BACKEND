-- Demo data: fills 30 days of daily consumption history for any medicine
-- that has none yet, so the Consumption Velocity chart has an actual-vs-
-- predicted trend to show instead of "No consumption history yet".
-- Rate varies per medicine (seeded off its batch number) plus day-to-day
-- noise, so the line looks like real usage rather than a flat value.
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
WHERE NOT EXISTS (
  SELECT 1 FROM "ConsumptionRecord" cr WHERE cr."medicineId" = m.id
)
ON CONFLICT ("medicineId", "date") DO NOTHING;
