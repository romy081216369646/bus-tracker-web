DO $$ BEGIN
  CREATE TYPE "BusEventType" AS ENUM ('PASSENGER_IN', 'PASSENGER_OUT', 'RFID_STOP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "Stop" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rfidTag" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Stop_rfidTag_key" ON "Stop"("rfidTag");

CREATE TABLE "RouteStop" (
  "id" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "stopId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RouteStop_routeId_order_idx" ON "RouteStop"("routeId", "order");
CREATE UNIQUE INDEX "RouteStop_routeId_stopId_key" ON "RouteStop"("routeId", "stopId");

CREATE TABLE "BusEvent" (
  "id" TEXT NOT NULL,
  "busId" TEXT NOT NULL,
  "type" "BusEventType" NOT NULL,
  "delta" INTEGER,
  "stopId" TEXT,
  "rfidTag" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BusEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusEvent_busId_createdAt_idx" ON "BusEvent"("busId", "createdAt");

CREATE TABLE "BusState" (
  "busId" TEXT NOT NULL,
  "passengers" INTEGER NOT NULL DEFAULT 0,
  "lastStopId" TEXT,
  "destinationStopId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusState_pkey" PRIMARY KEY ("busId")
);

ALTER TABLE "RouteStop"
  ADD CONSTRAINT "RouteStop_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "Route"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteStop"
  ADD CONSTRAINT "RouteStop_stopId_fkey"
  FOREIGN KEY ("stopId") REFERENCES "Stop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusEvent"
  ADD CONSTRAINT "BusEvent_busId_fkey"
  FOREIGN KEY ("busId") REFERENCES "Bus"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusEvent"
  ADD CONSTRAINT "BusEvent_stopId_fkey"
  FOREIGN KEY ("stopId") REFERENCES "Stop"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BusState"
  ADD CONSTRAINT "BusState_busId_fkey"
  FOREIGN KEY ("busId") REFERENCES "Bus"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusState"
  ADD CONSTRAINT "BusState_lastStopId_fkey"
  FOREIGN KEY ("lastStopId") REFERENCES "Stop"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BusState"
  ADD CONSTRAINT "BusState_destinationStopId_fkey"
  FOREIGN KEY ("destinationStopId") REFERENCES "Stop"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
