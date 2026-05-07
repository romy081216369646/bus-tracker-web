import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routeStopId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { routeStopId } = await params;
  const body = (await request.json()) as {
    order?: number;
  };

  if (body.order === undefined) {
    return NextResponse.json({ error: "Missing order" }, { status: 400 });
  }

  const routeStop = await prisma.routeStop.update({
    where: { id: routeStopId },
    data: { order: body.order },
  });

  return NextResponse.json(routeStop);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ routeStopId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { routeStopId } = await params;

  await prisma.routeStop.delete({
    where: { id: routeStopId },
  });

  return NextResponse.json({ ok: true });
}
