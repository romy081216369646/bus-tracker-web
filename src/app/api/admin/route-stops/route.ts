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
      action: "ROUTE_STOP_CREATE",
      entity: "route-stop",
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    routeId?: string;
    stopId?: string;
    order?: number;
  };

  if (!body.routeId || !body.stopId || body.order === undefined) {
    await logAuditEvent({
      action: "ROUTE_STOP_CREATE",
      entity: "route-stop",
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
    const routeStop = await prisma.routeStop.create({
      data: {
        routeId: body.routeId,
        stopId: body.stopId,
        order: body.order,
      },
    });

    await logAuditEvent({
      action: "ROUTE_STOP_CREATE",
      entity: "route-stop",
      entityId: routeStop.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { body },
    });

    return NextResponse.json(routeStop);
  } catch (error) {
    await logAuditEvent({
      action: "ROUTE_STOP_CREATE",
      entity: "route-stop",
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to add route stop." }, { status: 500 });
  }
}
