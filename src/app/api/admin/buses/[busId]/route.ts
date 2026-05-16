import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRequestMeta, logAuditEvent } from "@/lib/audit-log";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ busId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { busId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "BUS_UPDATE",
      entity: "bus",
      entityId: busId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fleetCode?: string;
    rfidTag?: string;
    model?: string;
    capacity?: number;
    status?: "ACTIVE" | "REPAIR" | "STANDBY";
    routeId?: string | null;
  };

  try {
    const bus = await prisma.bus.update({
      where: { id: busId },
      data: {
        fleetCode: body.fleetCode,
        rfidTag: body.rfidTag,
        model: body.model,
        capacity: body.capacity,
        status: body.status,
        routeId: body.routeId,
      },
    });

    await logAuditEvent({
      action: "BUS_UPDATE",
      entity: "bus",
      entityId: bus.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { body },
    });

    return NextResponse.json(bus);
  } catch (error) {
    await logAuditEvent({
      action: "BUS_UPDATE",
      entity: "bus",
      entityId: busId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to update bus." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ busId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { busId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "BUS_DELETE",
      entity: "bus",
      entityId: busId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.bus.delete({
      where: { id: busId },
    });

    await logAuditEvent({
      action: "BUS_DELETE",
      entity: "bus",
      entityId: busId,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logAuditEvent({
      action: "BUS_DELETE",
      entity: "bus",
      entityId: busId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to delete bus." }, { status: 500 });
  }
}
