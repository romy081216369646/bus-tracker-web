import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    rfidTag?: string;
    lat?: number;
    lng?: number;
  };

  if (!body.name || !body.rfidTag || body.lat === undefined || body.lng === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const stop = await prisma.stop.create({
    data: {
      name: body.name,
      rfidTag: body.rfidTag,
      lat: body.lat,
      lng: body.lng,
    },
  });

  return NextResponse.json(stop);
}
