import { prisma } from "@/lib/prisma";

export type AdminBusItem = {
  id: string;
  fleetCode: string;
  rfidTag: string;
  model: string;
  capacity: number;
  status: "ACTIVE" | "REPAIR" | "STANDBY";
  routeId: string | null;
};

export type AdminRouteItem = {
  id: string;
  code: string;
  name: string;
  routeLabel: string;
  status: "ON_SCHEDULE" | "MINOR_DELAYS" | "DELAYED";
};

export type AdminStopItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type AdminRouteStopItem = {
  id: string;
  routeId: string;
  stopId: string;
  order: number;
  stopName: string;
  schedule: string;
};

export type AdminLogItem = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  status: "SUCCESS" | "FAILED";
  actorName: string;
  actorRole: string;
  ipAddress: string;
  details: string;
};

export type AdminArrivalLogItem = {
  id: string;
  createdAt: string;
  busId: string;
  routeLabel: string;
  stopName: string;
  rfidTag: string;
};

export async function getAdminBuses(): Promise<AdminBusItem[]> {
  const buses = await prisma.bus.findMany({
    select: {
      id: true,
      fleetCode: true,
      rfidTag: true,
      model: true,
      capacity: true,
      status: true,
      routeId: true,
    },
    orderBy: { fleetCode: "asc" },
  });

  return buses.map((bus) => ({
    id: bus.id,
    fleetCode: bus.fleetCode,
    rfidTag: bus.rfidTag,
    model: bus.model,
    capacity: bus.capacity,
    status: bus.status,
    routeId: bus.routeId,
  }));
}

export async function getAdminRoutes(): Promise<AdminRouteItem[]> {
  const routes = await prisma.route.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
    },
    orderBy: { code: "asc" },
  });

  return routes.map((route) => ({
    id: route.id,
    code: route.code,
    name: route.name,
    routeLabel: `${route.code} - ${route.name}`,
    status: route.status,
  }));
}

export async function getAdminStops(): Promise<AdminStopItem[]> {
  const stops = await prisma.stop.findMany({
    select: {
      id: true,
      name: true,
      lat: true,
      lng: true,
    },
    orderBy: { name: "asc" },
  });

  return stops;
}

export async function getAdminRouteStops(): Promise<AdminRouteStopItem[]> {
  const routeStops = await prisma.routeStop.findMany({
    select: {
      id: true,
      routeId: true,
      stopId: true,
      order: true,
      schedule: true,
      stop: {
        select: { name: true },
      },
    },
    orderBy: [{ routeId: "asc" }, { order: "asc" }],
  });

  return routeStops.map((routeStop) => ({
    id: routeStop.id,
    routeId: routeStop.routeId,
    stopId: routeStop.stopId,
    order: routeStop.order,
    stopName: routeStop.stop.name,
    schedule: routeStop.schedule,
  }));
}

export async function getAdminLogs(limit = 200): Promise<AdminLogItem[]> {
  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      action: true,
      entity: true,
      entityId: true,
      status: true,
      actorRole: true,
      ipAddress: true,
      details: true,
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    status: log.status,
    actorName: log.actor?.name ?? log.actor?.email ?? "System",
    actorRole: log.actorRole ?? "-",
    ipAddress: log.ipAddress ?? "-",
    details: log.details ? JSON.stringify(log.details) : "-",
  }));
}

export async function getAdminArrivalLogs(
  limit = 200,
): Promise<AdminArrivalLogItem[]> {
  const events = await prisma.busEvent.findMany({
    where: { type: "RFID_STOP" },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      rfidTag: true,
      stop: { select: { name: true } },
      bus: {
        select: {
          id: true,
          fleetCode: true,
          route: { select: { code: true, name: true } },
        },
      },
    },
  });

  return events.map((event) => {
    const routeLabel = event.bus.route
      ? `Route ${event.bus.route.code} - ${event.bus.route.name}`
      : "Unassigned";

    return {
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      busId: event.bus.fleetCode ?? event.bus.id,
      routeLabel,
      stopName: event.stop?.name ?? "Unknown",
      rfidTag: event.rfidTag ?? "-",
    };
  });
}
