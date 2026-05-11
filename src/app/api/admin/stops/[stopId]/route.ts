import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRequestMeta, logAuditEvent } from "@/lib/audit-log";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    const { stopId: unauthorizedStopId } = await params;
    await logAuditEvent({
      action: "STOP_UPDATE",
      entity: "stop",
      entityId: unauthorizedStopId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stopId } = await params;

  const body = (await request.json()) as {
    name?: string;
    rfidTag?: string;
    lat?: number;
    lng?: number;
  };

  try {
    const stop = await prisma.stop.update({
      where: { id: stopId },
      data: {
        name: body.name,
        rfidTag: body.rfidTag,
        lat: body.lat,
        lng: body.lng,
      },
    });

    await logAuditEvent({
      action: "STOP_UPDATE",
      entity: "stop",
      entityId: stop.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { body },
    });

    return NextResponse.json(stop);
  } catch (error) {
    await logAuditEvent({
      action: "STOP_UPDATE",
      entity: "stop",
      entityId: stopId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to update stop." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { stopId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "STOP_DELETE",
      entity: "stop",
      entityId: stopId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.stop.delete({
      where: { id: stopId },
    });

    await logAuditEvent({
      action: "STOP_DELETE",
      entity: "stop",
      entityId: stopId,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logAuditEvent({
      action: "STOP_DELETE",
      entity: "stop",
      entityId: stopId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to delete stop." }, { status: 500 });
  }
}
