import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@pbl.local" },
    update: {
      name: "PBL Admin",
      role: "admin",
      updatedAt: now,
    },
    create: {
      id: "seed-admin-user",
      name: "PBL Admin",
      email: "admin@pbl.local",
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.busEvent.deleteMany();
  await prisma.busState.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.auditLog.deleteMany();

  const stops = await Promise.all([
    prisma.stop.create({
      data: { name: "Terminal A", lat: -6.2, lng: 106.8167 },
    }),
    prisma.stop.create({
      data: { name: "Central Station", lat: -6.1901, lng: 106.82 },
    }),
    prisma.stop.create({
      data: { name: "City Mall", lat: -6.1822, lng: 106.83 },
    }),
    prisma.stop.create({
      data: { name: "University Gate", lat: -6.1725, lng: 106.835 },
    }),
    prisma.stop.create({
      data: { name: "North Park", lat: -6.1655, lng: 106.842 },
    }),
    prisma.stop.create({
      data: { name: "South Hub", lat: -6.225, lng: 106.81 },
    }),
  ]);

  const routeA = await prisma.route.create({
    data: {
      code: "101",
      name: "Downtown Loop",
      status: "ON_SCHEDULE",
    },
  });

  const routeB = await prisma.route.create({
    data: {
      code: "202",
      name: "South Connector",
      status: "MINOR_DELAYS",
    },
  });

  await prisma.routeStop.createMany({
    data: [
      { routeId: routeA.id, stopId: stops[0].id, order: 1, etaMinutes: 6 },
      { routeId: routeA.id, stopId: stops[1].id, order: 2, etaMinutes: 8 },
      { routeId: routeA.id, stopId: stops[2].id, order: 3, etaMinutes: 7 },
      { routeId: routeA.id, stopId: stops[3].id, order: 4, etaMinutes: 6 },
      { routeId: routeB.id, stopId: stops[5].id, order: 1, etaMinutes: 11 },
      { routeId: routeB.id, stopId: stops[0].id, order: 2, etaMinutes: 9 },
      { routeId: routeB.id, stopId: stops[4].id, order: 3, etaMinutes: 12 },
    ],
  });

  const busA = await prisma.bus.create({
    data: {
      fleetCode: "B-101",
      rfidTag: "BUS-RFID-101",
      model: "Hino RK8",
      capacity: 40,
      status: "ACTIVE",
      serviceStatus: "NORMAL",
      etaMinutes: 4,
      passengers: 18,
      heading: "Central Station",
      routeId: routeA.id,
      lastStop: "Terminal A",
    },
  });

  const busB = await prisma.bus.create({
    data: {
      fleetCode: "B-202",
      rfidTag: "BUS-RFID-202",
      model: "Mercedes OH 1526",
      capacity: 36,
      status: "ACTIVE",
      serviceStatus: "WARNING",
      etaMinutes: 9,
      passengers: 27,
      heading: "Terminal A",
      routeId: routeB.id,
      lastStop: "South Hub",
    },
  });

  await prisma.busState.createMany({
    data: [
      {
        busId: busA.id,
        passengers: 18,
        lastStopId: stops[0].id,
        destinationStopId: stops[1].id,
        lastStopAt: now,
      },
      {
        busId: busB.id,
        passengers: 27,
        lastStopId: stops[5].id,
        destinationStopId: stops[0].id,
        lastStopAt: now,
      },
    ],
  });

  const baseTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const minutesAfter = (minutes: number) =>
    new Date(baseTime.getTime() + minutes * 60 * 1000);

  const busArrivalEvents = [] as {
    busId: string;
    type: "RFID_STOP";
    stopId: string;
    rfidTag: string;
    createdAt: Date;
  }[];

  const routeAStops = [stops[0], stops[1], stops[2], stops[3]];
  const routeBStops = [stops[5], stops[0], stops[4]];

  let currentMinute = 0;
  for (let lap = 0; lap < 8; lap += 1) {
    routeAStops.forEach((stop, index) => {
      const travel = index === 0 ? 0 : 7 + ((lap + index) % 3);
      currentMinute += travel;
      busArrivalEvents.push({
        busId: busA.id,
        type: "RFID_STOP",
        stopId: stop.id,
        rfidTag: busA.rfidTag,
        createdAt: minutesAfter(currentMinute),
      });
    });
  }

  currentMinute = 5;
  for (let lap = 0; lap < 10; lap += 1) {
    routeBStops.forEach((stop, index) => {
      const travel = index === 0 ? 0 : 9 + ((lap + index) % 4);
      currentMinute += travel;
      busArrivalEvents.push({
        busId: busB.id,
        type: "RFID_STOP",
        stopId: stop.id,
        rfidTag: busB.rfidTag,
        createdAt: minutesAfter(currentMinute),
      });
    });
  }

  await prisma.busEvent.createMany({
    data: [
      ...busArrivalEvents,
      {
        busId: busA.id,
        type: "PASSENGER_IN",
        delta: 5,
        createdAt: minutesAfter(currentMinute + 3),
      },
      {
        busId: busB.id,
        type: "PASSENGER_OUT",
        delta: 2,
        createdAt: minutesAfter(currentMinute + 6),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: "SEED_RUN",
        entity: "system",
        entityId: null,
        status: "SUCCESS",
        actorUserId: adminUser.id,
        actorRole: "admin",
        ipAddress: "127.0.0.1",
        userAgent: "seed-script",
        details: {
          routes: 2,
          stops: stops.length,
          buses: 2,
          events: 4,
        },
      },
      {
        action: "ROUTE_SYNC",
        entity: "route",
        entityId: routeA.id,
        status: "SUCCESS",
        actorUserId: adminUser.id,
        actorRole: "admin",
        ipAddress: "127.0.0.1",
        userAgent: "seed-script",
        details: {
          code: routeA.code,
          status: routeA.status,
        },
      },
    ],
  });

  console.log("Seed completed successfully.");
  console.log(`Routes: 2, Stops: ${stops.length}, Buses: 2`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
