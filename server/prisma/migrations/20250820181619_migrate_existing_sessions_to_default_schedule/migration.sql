-- Update any sessions that don't have a scheduleId to reference the first available schedule
UPDATE "sessions" 
SET "schedule_id" = (SELECT "id" FROM "schedules" LIMIT 1)
WHERE "schedule_id" IS NULL OR "schedule_id" NOT IN (SELECT "id" FROM "schedules");