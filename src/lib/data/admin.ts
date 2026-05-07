import { prisma } from "@/lib/prisma";

export type AdminBusItem = {
  id: string;
  fleetCode: string;
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
  direction: string;
  coverage: string;
  type: "WEEKDAYS" | "DAILY" | "PEAK";
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
};

export type AdminStopItem = {
  id: string;
  name: string;
  rfidTag: string;
  lat: number;
  lng: number;
};

export type AdminRouteStopItem = {
  id: string;
  routeId: string;
  stopId: string;
  order: number;
  stopName: string;
};

export async function getAdminBuses(): Promise<AdminBusItem[]> {
  const buses = await prisma.bus.findMany({
    select: {
      id: true,
      fleetCode: true,
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
      coverage: true,
      direction: true,
      scheduleType: true,
      configStatus: true,
    },
    orderBy: { code: "asc" },
  });

  return routes.map((route) => ({
    id: route.id,
    code: route.code,
    name: route.name,
    routeLabel: `${route.code} - ${route.name}`,
    direction: route.direction,
    coverage: route.coverage,
    type: route.scheduleType,
    status: route.configStatus,
  }));
}

export async function getAdminStops(): Promise<AdminStopItem[]> {
  const stops = await prisma.stop.findMany({
    select: {
      id: true,
      name: true,
      rfidTag: true,
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
  }));
}
