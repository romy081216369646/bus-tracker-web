import { prisma } from "@/lib/prisma";

type RfidTrackingPayload = {
  uid?: string;
  stopId?: string;
  timestamp?: string;
};

type PassengerEventPayload = {
  uid?: string;
  bus?: string;
  event?: "masuk" | "keluar" | "in" | "out";
  passenger_count?: number;
  delta?: number;
  timestamp?: string;
};

async function resolveBusId(payload: { uid?: string; bus?: string }) {
  if (payload.uid) {
    const bus = await prisma.bus.findFirst({
      where: { rfidTag: payload.uid },
      select: { id: true, rfidTag: true, fleetCode: true, routeId: true },
    });
    if (bus) return bus;
  }

  if (payload.bus) {
    const bus = await prisma.bus.findFirst({
      where: {
        OR: [
          { fleetCode: payload.bus },
          { model: payload.bus },
          { rfidTag: payload.bus },
        ],
      },
      select: { id: true, rfidTag: true, fleetCode: true, routeId: true },
    });
    if (bus) return bus;
  }

  return null;
}

async function resolveNextStopId(routeId: string | null, currentStopId: string | null) {
  if (!routeId || !currentStopId) {
    return null;
  }

  const routeStops = await prisma.routeStop.findMany({
    where: { routeId },
    select: { stopId: true, order: true },
    orderBy: { order: "asc" },
  });

  if (routeStops.length === 0) {
    return null;
  }

  const currentIndex = routeStops.findIndex((item) => item.stopId === currentStopId);
  if (currentIndex < 0) {
    return routeStops[0].stopId;
  }

  const nextIndex = (currentIndex + 1) % routeStops.length;
  return routeStops[nextIndex].stopId;
}

async function resolveStopId(payload: { stopId?: string }) {
  if (!payload.stopId) {
    return null;
  }

  const stop = await prisma.stop.findUnique({
    where: { id: payload.stopId },
    select: { id: true, name: true },
  });

  return stop;
}

export async function ingestRfidTracking(payload: RfidTrackingPayload) {
  const bus = await resolveBusId({ uid: payload.uid });
  if (!bus) {
    throw new Error("Bus not found for RFID tracking payload");
  }

  const stop = await resolveStopId({ stopId: payload.stopId });
  const nextStopId = await resolveNextStopId(bus.routeId ?? null, stop?.id ?? null);

  await prisma.busEvent.create({
    data: {
      busId: bus.id,
      type: "RFID_STOP",
      stopId: stop?.id,
      rfidTag: payload.uid ?? bus.rfidTag,
      payload,
    },
  });

  await prisma.busState.upsert({
    where: { busId: bus.id },
    update: {
      lastStopId: stop?.id,
      destinationStopId: nextStopId,
    },
    create: {
      busId: bus.id,
      lastStopId: stop?.id,
      destinationStopId: nextStopId,
    },
  });
}

export async function ingestPassengerEvent(payload: PassengerEventPayload) {
  const bus = await resolveBusId({ uid: payload.uid, bus: payload.bus });
  if (!bus) {
    throw new Error("Bus not found for passenger event payload");
  }

  const rawEvent = payload.event?.toLowerCase();
  const normalizedEvent =
    rawEvent === "masuk" || rawEvent === "in"
      ? "PASSENGER_IN"
      : rawEvent === "keluar" || rawEvent === "out"
        ? "PASSENGER_OUT"
        : null;

  if (!normalizedEvent) {
    throw new Error("Invalid passenger event type");
  }

  const delta =
    typeof payload.delta === "number"
      ? payload.delta
      : typeof payload.passenger_count === "number"
        ? payload.passenger_count
        : 0;

  await prisma.$transaction(async (tx) => {
    await tx.busEvent.create({
      data: {
        busId: bus.id,
        type: normalizedEvent,
        delta,
        rfidTag: payload.uid ?? bus.rfidTag,
        payload,
      },
    });

    const currentState = await tx.busState.findUnique({
      where: { busId: bus.id },
      select: { passengers: true },
    });

    const currentPassengers = currentState?.passengers ?? 0;
    const nextPassengers = Math.max(
      0,
      normalizedEvent === "PASSENGER_IN"
        ? currentPassengers + delta
        : currentPassengers - delta,
    );

    await tx.busState.upsert({
      where: { busId: bus.id },
      update: {
        passengers: nextPassengers,
      },
      create: {
        busId: bus.id,
        passengers: nextPassengers,
      },
    });

    await tx.bus.update({
      where: { id: bus.id },
      data: { passengers: nextPassengers },
    });
  });
}
