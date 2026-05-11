import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRequestMeta, logAuditEvent } from "@/lib/audit-log";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routeStopId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { routeStopId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "ROUTE_STOP_UPDATE",
      entity: "route-stop",
      entityId: routeStopId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    order?: number;
  };

  if (body.order === undefined) {
    await logAuditEvent({
      action: "ROUTE_STOP_UPDATE",
      entity: "route-stop",
      entityId: routeStopId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "MISSING_ORDER" },
    });
    return NextResponse.json({ error: "Missing order" }, { status: 400 });
  }

  try {
    const routeStop = await prisma.routeStop.update({
      where: { id: routeStopId },
      data: { order: body.order },
    });

    await logAuditEvent({
      action: "ROUTE_STOP_UPDATE",
      entity: "route-stop",
      entityId: routeStop.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { order: body.order },
    });

    return NextResponse.json(routeStop);
  } catch (error) {
    await logAuditEvent({
      action: "ROUTE_STOP_UPDATE",
      entity: "route-stop",
      entityId: routeStopId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to update route stop." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ routeStopId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { routeStopId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "ROUTE_STOP_DELETE",
      entity: "route-stop",
      entityId: routeStopId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.routeStop.delete({
      where: { id: routeStopId },
    });

    await logAuditEvent({
      action: "ROUTE_STOP_DELETE",
      entity: "route-stop",
      entityId: routeStopId,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logAuditEvent({
      action: "ROUTE_STOP_DELETE",
      entity: "route-stop",
      entityId: routeStopId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json(
      { error: "Failed to delete route stop." },
      { status: 500 },
    );
  }
}
