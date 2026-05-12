import { prisma } from "@/lib/prisma";

export async function getRoutesOverview() {
  const routes = await prisma.route.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      direction: true,
      status: true,
      coverage: true,
      stops: {
        select: {
          order: true,
          schedule: true,
          stop: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
      buses: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
    orderBy: { code: "asc" },
  });

  return routes.map((route) => ({
    id: route.code,
    name: route.name,
    direction: route.direction,
    coverage: route.coverage,
    status: route.status,
    activeBuses: route.buses.length,
    stops: route.stops.map((item) => ({
      name: item.stop.name,
      schedule: item.schedule,
    })),
  }));
}
