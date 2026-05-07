import AdminClientPage from "@/app/(app)/admin/admin-client";
import {
  getAdminBuses,
  getAdminRoutes,
  getAdminStops,
  getAdminRouteStops,
} from "@/lib/data/admin";

export default async function AdminPage() {
  const [buses, configuredRoutes, stops, routeStops] = await Promise.all([
    getAdminBuses(),
    getAdminRoutes(),
    getAdminStops(),
    getAdminRouteStops(),
  ]);

  return (
    <AdminClientPage
      buses={buses}
      configuredRoutes={configuredRoutes}
      stops={stops}
      routeStops={routeStops}
    />
  );
}
