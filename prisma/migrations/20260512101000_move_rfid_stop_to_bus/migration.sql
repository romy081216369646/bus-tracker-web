ALTER TABLE "Bus"
ADD COLUMN IF NOT EXISTS "rfidTag" TEXT;

UPDATE "Bus"
SET "rfidTag" = CONCAT('BUS-RFID-', "fleetCode")
WHERE "rfidTag" IS NULL;

ALTER TABLE "Bus"
ALTER COLUMN "rfidTag" SET NOT NULL;

DO $$ BEGIN
  CREATE UNIQUE INDEX "Bus_rfidTag_key" ON "Bus"("rfidTag");
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

ALTER TABLE "Stop"
DROP COLUMN IF EXISTS "rfidTag";
