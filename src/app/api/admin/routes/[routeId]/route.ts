import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRequestMeta, logAuditEvent } from "@/lib/audit-log";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { routeId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "ROUTE_UPDATE",
      entity: "route",
      entityId: routeId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    name?: string;
    coverage?: string;
    direction?: string;
    scheduleType?: "WEEKDAYS" | "DAILY" | "PEAK";
    configStatus?: "ACTIVE" | "DRAFT" | "INACTIVE";
    status?: "ON_SCHEDULE" | "MINOR_DELAYS" | "DELAYED";
  };

  if (body.direction === undefined) {
    await logAuditEvent({
      action: "ROUTE_UPDATE",
      entity: "route",
      entityId: routeId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "MISSING_DIRECTION", body },
    });
    return NextResponse.json({ error: "Missing direction" }, { status: 400 });
  }

  try {
    const route = await prisma.route.update({
      where: { id: routeId },
      data: {
        code: body.code,
        name: body.name,
        coverage: body.coverage,
        direction: body.direction,
        scheduleType: body.scheduleType,
        configStatus: body.configStatus,
        status: body.status,
      },
    });

    await logAuditEvent({
      action: "ROUTE_UPDATE",
      entity: "route",
      entityId: route.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { body },
    });

    return NextResponse.json(route);
  } catch (error) {
    await logAuditEvent({
      action: "ROUTE_UPDATE",
      entity: "route",
      entityId: routeId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to update route." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { ipAddress, userAgent } = getRequestMeta(request);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { routeId } = await params;

  if (!session || session.user.role !== "admin") {
    await logAuditEvent({
      action: "ROUTE_DELETE",
      entity: "route",
      entityId: routeId,
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.route.delete({
      where: { id: routeId },
    });

    await logAuditEvent({
      action: "ROUTE_DELETE",
      entity: "route",
      entityId: routeId,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logAuditEvent({
      action: "ROUTE_DELETE",
      entity: "route",
      entityId: routeId,
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to delete route." }, { status: 500 });
  }
}
