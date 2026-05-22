import { prisma } from "@/lib/prisma";

export type BusCardSummary = {
  id: string;
  route: string;
  busCode: string;
  rfidTag: string;
  nextArrival: string;
  lastStop: string;
  passengers: number;
  capacity: number;
  heading: string;
  status: "normal" | "warning" | "delayed";
};

type RouteStopScheduleItem = {
  routeId: string;
  stopId: string;
  order: number;
  schedule: string;
  stop: { name: string };
};

type BusQueryResult = {
  id: string;
  fleetCode: string;
  rfidTag: string;
  routeId: string | null;
  route: { name: string } | null;
  status: string;
  passengers: number;
  capacity: number;
  state: {
    lastStopId: string | null;
    lastStop: { name: string } | null;
    destination: { name: string } | null;
  } | null;
};

type GroupByResult = {
  status: string;
  _count: { status: number };
};

export async function getBusCards() {
  const [buses, routeStops] = await Promise.all([
    prisma.bus.findMany({
      select: {
        id: true,
        fleetCode: true,
        rfidTag: true,
        routeId: true,
        route: {
          select: {
            name: true,
          },
        },
        status: true,
        passengers: true,
        capacity: true,
        state: {
          select: {
            lastStopId: true,
            lastStop: { select: { name: true } },
            destination: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }) as unknown as BusQueryResult[],
    prisma.routeStop.findMany({
      select: {
        routeId: true,
        stopId: true,
        order: true,
        schedule: true,
        stop: { select: { name: true } },
      },
      orderBy: [{ routeId: "asc" }, { order: "asc" }],
    }) as unknown as RouteStopScheduleItem[],
  ]);

  const routeStopsByRoute = new Map<string, RouteStopScheduleItem[]>();
  routeStops.forEach((item: RouteStopScheduleItem) => {
    const list = routeStopsByRoute.get(item.routeId) ?? [];
    list.push(item);
    routeStopsByRoute.set(item.routeId, list);
  });

  return buses.map<BusCardSummary>((bus: BusQueryResult) => {
    const routeSchedule = bus.routeId
      ? (routeStopsByRoute.get(bus.routeId) ?? [])
      : [];

    const currentLastStopId = bus.state?.lastStopId ?? null;
    const currentLastStopName = bus.state?.lastStop?.name ?? "Unknown";
    const busCode = bus.fleetCode ?? "N/A";

    let nextArrival = "--:--";
    let nextStopName = bus.state?.destination?.name ?? "Unknown";

    if (routeSchedule.length > 0) {
      const currentIndex = currentLastStopId
        ? routeSchedule.findIndex((item: RouteStopScheduleItem) => item.stopId === currentLastStopId)
        : -1;

      const nextIndex =
        currentIndex >= 0 ? (currentIndex + 1) % routeSchedule.length : 0;

      const nextStop = routeSchedule[nextIndex];
      nextArrival = nextStop.schedule;
      if (!bus.state?.destination?.name) {
        nextStopName = nextStop.stop.name;
      }
    }

    const status: BusCardSummary["status"] =
      bus.status === "REPAIR"
        ? "warning"
        : bus.status === "STANDBY"
          ? "delayed"
          : "normal";

    return {
      id: bus.id,
      route: bus.route?.name ?? "Unassigned",
      nextArrival,
      lastStop: currentLastStopName,
      busCode: busCode,
      rfidTag: bus.rfidTag,
      passengers: bus.passengers,
      capacity: bus.capacity,
      heading: nextStopName,
      status,
    };
  });
}

export async function getFleetSummary() {
  const counts = await prisma.bus.groupBy({
    by: ["status"],
    _count: { status: true },
  }) as unknown as GroupByResult[];

  const activeCount = counts.reduce(
    (total: number, item: GroupByResult) =>
      item.status === "ACTIVE" ? total + item._count.status : total,
    0,
  );

  const delayedCount = counts.reduce(
    (total: number, item: GroupByResult) =>
      item.status !== "ACTIVE" ? total + item._count.status : total,
    0,
  );

  return {
    delayedCount,
    activeCount,
  };
}
