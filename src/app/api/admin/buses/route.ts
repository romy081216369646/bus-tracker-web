import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRequestMeta, logAuditEvent } from "@/lib/audit-log";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "BUS_CREATE",
      entity: "bus",
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fleetCode?: string;
    model?: string;
    capacity?: number;
    status?: "ACTIVE" | "REPAIR" | "STANDBY";
    routeId?: string | null;
  };

  if (!body.fleetCode || !body.model || !body.capacity) {
    await logAuditEvent({
      action: "BUS_CREATE",
      entity: "bus",
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "MISSING_FIELDS", body },
    });
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const { fleetCode, model, capacity, status, routeId } = body;
    const bus = await prisma.$transaction(async (tx) => {
      const createdBus = await tx.bus.create({
        data: {
          fleetCode: fleetCode!,
          model: model!,
          capacity: capacity!,
          status: status ?? "ACTIVE",
          routeId: routeId ?? null,
        },
      });

      await tx.busState.create({
        data: {
          busId: createdBus.id,
          passengers: 0,
          lastStopId: null,
          destinationStopId: null,
        },
      });

      return createdBus;
    });

    await logAuditEvent({
      action: "BUS_CREATE",
      entity: "bus",
      entityId: bus.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: {
        fleetCode: bus.fleetCode,
        model: bus.model,
      },
    });

    return NextResponse.json(bus);
  } catch (error) {
    await logAuditEvent({
      action: "BUS_CREATE",
      entity: "bus",
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to create bus." }, { status: 500 });
  }
}
