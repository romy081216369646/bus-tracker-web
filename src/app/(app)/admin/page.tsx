import AdminClientPage from "@/app/(app)/admin/admin-client";
import {
  getAdminBuses,
  getAdminArrivalLogs,
  getAdminLogs,
  getAdminRoutes,
  getAdminStops,
  getAdminRouteStops,
} from "@/lib/data/admin";

export default async function AdminPage() {
  const [buses, configuredRoutes, stops, routeStops, logs, arrivalLogs] =
    await Promise.all([
      getAdminBuses(),
      getAdminRoutes(),
      getAdminStops(),
      getAdminRouteStops(),
      getAdminLogs(),
      getAdminArrivalLogs(),
    ]);

  return (
    <AdminClientPage
      buses={buses}
      configuredRoutes={configuredRoutes}
      stops={stops}
      routeStops={routeStops}
      logs={logs}
      arrivalLogs={arrivalLogs}
    />
  );
}
