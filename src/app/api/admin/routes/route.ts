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
      action: "ROUTE_CREATE",
      entity: "route",
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

  if (!body.code || !body.name || !body.coverage || !body.direction) {
    await logAuditEvent({
      action: "ROUTE_CREATE",
      entity: "route",
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
    const route = await prisma.route.create({
      data: {
        code: body.code,
        name: body.name,
        coverage: body.coverage,
        direction: body.direction,
        scheduleType: body.scheduleType ?? "WEEKDAYS",
        configStatus: body.configStatus ?? "ACTIVE",
        status: body.status ?? "ON_SCHEDULE",
      },
    });

    await logAuditEvent({
      action: "ROUTE_CREATE",
      entity: "route",
      entityId: route.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { code: route.code, name: route.name },
    });

    return NextResponse.json(route);
  } catch (error) {
    await logAuditEvent({
      action: "ROUTE_CREATE",
      entity: "route",
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to create route." }, { status: 500 });
  }
}
