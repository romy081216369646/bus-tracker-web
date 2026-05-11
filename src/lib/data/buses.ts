import { prisma } from "@/lib/prisma";

export type BusCardSummary = {
  id: string;
  route: string;
  eta: string;
  lastStop: string;
  passengers: number;
  capacity: number;
  heading: string;
  status: "normal" | "warning" | "delayed";
};

export async function getBusCards() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [buses, routeStops, stopList, recentEvents] = await Promise.all([
    prisma.bus.findMany({
      include: {
        route: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.routeStop.findMany({
      select: { routeId: true, stopId: true, order: true },
      orderBy: [{ routeId: "asc" }, { order: "asc" }],
    }),
    prisma.stop.findMany({
      select: { id: true, name: true },
    }),
    prisma.busEvent.findMany({
      where: {
        type: "RFID_STOP",
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        busId: true,
        stopId: true,
        createdAt: true,
        bus: { select: { routeId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const stopNameById = new Map(stopList.map((stop) => [stop.id, stop.name]));

  const routeStopsByRoute = new Map<string, string[]>();
  routeStops.forEach((item) => {
    const list = routeStopsByRoute.get(item.routeId) ?? [];
    list.push(item.stopId);
    routeStopsByRoute.set(item.routeId, list);
  });

  const eventsByBus = new Map<string, { stopId: string | null; createdAt: Date; routeId: string | null }[]>();
  recentEvents.forEach((event) => {
    const list = eventsByBus.get(event.busId) ?? [];
    list.push({
      stopId: event.stopId,
      createdAt: event.createdAt,
      routeId: event.bus.routeId ?? null,
    });
    eventsByBus.set(event.busId, list);
  });

  const segmentDurations = new Map<string, number[]>();
  eventsByBus.forEach((events) => {
    const sorted = [...events].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (!current.routeId || current.routeId !== next.routeId) {
        continue;
      }
      if (!current.stopId || !next.stopId) {
        continue;
      }
      const routeStopsList = routeStopsByRoute.get(current.routeId);
      if (!routeStopsList || routeStopsList.length === 0) {
        continue;
      }
      const currentIndex = routeStopsList.indexOf(current.stopId);
      if (currentIndex === -1) {
        continue;
      }
      const expectedNextStopId =
        routeStopsList[(currentIndex + 1) % routeStopsList.length];
      if (expectedNextStopId !== next.stopId) {
        continue;
      }
      const minutes =
        (next.createdAt.getTime() - current.createdAt.getTime()) / 60000;
      if (minutes < 0.5 || minutes > 60) {
        continue;
      }
      const key = `${current.routeId}:${current.stopId}->${next.stopId}`;
      const list = segmentDurations.get(key) ?? [];
      list.push(minutes);
      segmentDurations.set(key, list);
    }
  });

  const medianMinutesBySegment = new Map<string, number>();
  segmentDurations.forEach((list, key) => {
    const sorted = [...list].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    medianMinutesBySegment.set(key, median);
  });

  const etaByBusId = new Map<string, number>();
  const lastStopNameByBusId = new Map<string, string>();

  eventsByBus.forEach((events, busId) => {
    const latest = events.reduce((acc, item) =>
      item.createdAt > acc.createdAt ? item : acc,
    );
    if (!latest.routeId || !latest.stopId) {
      return;
    }
    const routeStopsList = routeStopsByRoute.get(latest.routeId);
    if (!routeStopsList || routeStopsList.length === 0) {
      return;
    }
    const currentIndex = routeStopsList.indexOf(latest.stopId);
    if (currentIndex === -1) {
      return;
    }
    const nextStopId = routeStopsList[(currentIndex + 1) % routeStopsList.length];
    const segmentKey = `${latest.routeId}:${latest.stopId}->${nextStopId}`;
    const etaMinutes = medianMinutesBySegment.get(segmentKey);
    if (typeof etaMinutes === "number") {
      etaByBusId.set(busId, Math.max(1, Math.round(etaMinutes)));
    }
    const stopName = stopNameById.get(latest.stopId);
    if (stopName) {
      lastStopNameByBusId.set(busId, stopName);
    }
  });

  return buses.map<BusCardSummary>((bus) => {
    const computedEta = etaByBusId.get(bus.id);
    const etaText =
      typeof computedEta === "number"
        ? `${computedEta} mins`
        : typeof bus.etaMinutes === "number"
          ? `${bus.etaMinutes} mins`
          : "Delayed";
    const statusLabel = bus.serviceStatus.toLowerCase() as
      | "normal"
      | "warning"
      | "delayed";

    return {
      id: bus.id,
      route: bus.route
        ? `Route ${bus.route.code}`
        : "Unassigned",
      eta: etaText,
      lastStop: lastStopNameByBusId.get(bus.id) ?? bus.lastStop ?? "Unknown",
      passengers: bus.passengers,
      capacity: bus.capacity,
      heading: bus.heading,
      status: statusLabel,
    };
  });
}

export async function getFleetSummary() {
  const counts = await prisma.bus.groupBy({
    by: ["serviceStatus"],
    _count: { serviceStatus: true },
  });

  const delayedCount = counts.reduce(
    (total, item) =>
      item.serviceStatus === "DELAYED"
        ? total + item._count.serviceStatus
        : total,
    0,
  );

  const totalCount = counts.reduce(
    (total, item) => total + item._count.serviceStatus,
    0,
  );

  const activeCount = Math.max(0, totalCount - delayedCount);

  return {
    delayedCount,
    activeCount,
  };
}
