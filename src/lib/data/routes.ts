import { prisma } from "@/lib/prisma";

type RouteQueryResult = {
  id: string;
  code: string;
  name: string;
  status: string;
  stops: {
    order: number;
    etaMinutes: number;
    stop: { name: string };
  }[];
  buses: { id: string }[];
};

export async function getRoutesOverview() {
  const routes = await prisma.route.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      stops: {
        select: {
          order: true,
          etaMinutes: true,
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
  }) as unknown as RouteQueryResult[];

  return routes.map((route: RouteQueryResult) => ({
    id: route.code,
    name: route.name,
    status: route.status,
    activeBuses: route.buses.length,
    stops: route.stops.map((item: { stop: { name: string }; etaMinutes: number }) => ({
      name: item.stop.name,
      etaMinutes: item.etaMinutes,
    })),
  }));
}
