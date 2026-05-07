import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stopId } = await params;

  const body = (await request.json()) as {
    name?: string;
    rfidTag?: string;
    lat?: number;
    lng?: number;
  };

  const stop = await prisma.stop.update({
    where: { id: stopId },
    data: {
      name: body.name,
      rfidTag: body.rfidTag,
      lat: body.lat,
      lng: body.lng,
    },
  });

  return NextResponse.json(stop);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stopId } = await params;

  await prisma.stop.delete({
    where: { id: stopId },
  });

  return NextResponse.json({ ok: true });
}
