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
    routeId?: string;
    stopId?: string;
    order?: number;
  };

  if (!body.routeId || !body.stopId || body.order === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const routeStop = await prisma.routeStop.create({
    data: {
      routeId: body.routeId,
      stopId: body.stopId,
      order: body.order,
    },
  });

  return NextResponse.json(routeStop);
}
