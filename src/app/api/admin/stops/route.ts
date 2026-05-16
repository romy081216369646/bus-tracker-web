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
      action: "STOP_CREATE",
      entity: "stop",
      status: "FAILED",
      ipAddress,
      userAgent,
      details: { reason: "UNAUTHORIZED" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    lat?: number;
    lng?: number;
  };

  if (!body.name || body.lat === undefined || body.lng === undefined) {
    await logAuditEvent({
      action: "STOP_CREATE",
      entity: "stop",
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
    const stop = await prisma.stop.create({
      data: {
        name: body.name,
        lat: body.lat,
        lng: body.lng,
      },
    });

    await logAuditEvent({
      action: "STOP_CREATE",
      entity: "stop",
      entityId: stop.id,
      status: "SUCCESS",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { name: stop.name },
    });

    return NextResponse.json(stop);
  } catch (error) {
    await logAuditEvent({
      action: "STOP_CREATE",
      entity: "stop",
      status: "FAILED",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      ipAddress,
      userAgent,
      details: { reason: "DB_ERROR", message: String(error) },
    });
    return NextResponse.json({ error: "Failed to create stop." }, { status: 500 });
  }
}
