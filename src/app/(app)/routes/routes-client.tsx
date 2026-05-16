"use client";

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMqttContext } from "@/lib/iot";

type RouteStatus = "on-schedule" | "minor-delays" | "delayed";
type RouteFilter = RouteStatus | "all";
type RouteSortKey = "id" | "status" | "activeBuses";
type SortDirection = "asc" | "desc";

type RouteItem = {
  id: string;
  name: string;
  status: RouteStatus;
  activeBuses: number;
  stops: { name: string; schedule: string }[];
};

const statusStyles: Record<RouteStatus, string> = {
  "on-schedule": "bg-emerald-100 text-emerald-800",
  "minor-delays": "bg-amber-100 text-amber-800",
  delayed: "bg-red-100 text-red-700",
};

const statusDotStyles: Record<RouteStatus, string> = {
  "on-schedule": "bg-emerald-500",
  "minor-delays": "bg-amber-500",
  delayed: "bg-red-600",
};

const statusLabels: Record<RouteStatus, string> = {
  "on-schedule": "On Schedule",
  "minor-delays": "Minor Delays",
  delayed: "Delayed",
};

const filterLabels: Record<RouteFilter, string> = {
  all: "All",
  "on-schedule": "On Schedule",
  "minor-delays": "Minor Delays",
  delayed: "Delayed",
};

const statusMap: Record<string, RouteStatus> = {
  ON_SCHEDULE: "on-schedule",
  MINOR_DELAYS: "minor-delays",
  DELAYED: "delayed",
};

function RouteStatusBadge({ status }: { status: RouteStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-tight ${statusStyles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${statusDotStyles[status]} ${status === "on-schedule" ? "animate-pulse" : ""}`}
      />
      {statusLabels[status]}
    </span>
  );
}

export default function RoutesClientPage({
  routesData,
}: {
  routesData: {
    id: string;
    name: string;
    status: string;
    activeBuses: number;
    stops: { name: string; schedule: string }[];
  }[];
}) {
  const routes: RouteItem[] = routesData.map((route) => ({
    id: route.id,
    name: route.name,
    status: statusMap[route.status] ?? "on-schedule",
    activeBuses: route.activeBuses,
    stops: route.stops,
  }));

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RouteFilter>("all");
  const [sortKey, setSortKey] = useState<RouteSortKey>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewingRoute, setViewingRoute] = useState<RouteItem | null>(null);
  const { isConnected, busPassengers, busRFIDs, lastUpdate } = useMqttContext();

  const handleSort = (key: RouteSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const displayedRoutes = useMemo(() => {
    const filtered = routes.filter((route) => {
      const bySearch =
        searchQuery.trim() === "" ||
        `${route.id} ${route.name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const byStatus = statusFilter === "all" || route.status === statusFilter;

      return bySearch && byStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "id") {
        comparison = a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      } else if (sortKey === "status") {
        comparison = statusLabels[a.status].localeCompare(
          statusLabels[b.status],
        );
      } else {
        comparison = a.activeBuses - b.activeBuses;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [routes, searchQuery, statusFilter, sortDirection, sortKey]);

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#586579]">
            Routes Dashboard
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#141b2c]">
            Active Route Oversight
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isConnected ? 'MQTT Online' : 'MQTT Offline'}
          </div>
          {lastUpdate && (
            <span className="text-xs text-[#586579]">
              {busPassengers.size} IR sensors | {busRFIDs.size} RFID active
            </span>
          )}
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737785]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route..."
              className="w-full rounded-lg border border-[#c3c6d6]/70 bg-white py-2 pl-9 pr-3 text-sm text-[#141b2c] outline-none ring-[#0056d2] transition focus:ring-2"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RouteFilter)}
            className="cursor-pointer rounded-md border border-[#d4daea] bg-[#eef2ff] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#485062] outline-none ring-[#0a4cad] focus:ring-2"
          >
            {(Object.keys(filterLabels) as RouteFilter[]).map((filter) => (
              <option key={filter} value={filter}>
                {filterLabels[filter]}
              </option>
            ))}
          </select>

        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[#c3c6d6]/40 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#c3c6d6]/35 bg-[#f5f7ff]">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  <button
                    type="button"
                    onClick={() => handleSort("id")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "id"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Route ID <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "status"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Live Status <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  <button
                    type="button"
                    onClick={() => handleSort("activeBuses")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "activeBuses"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Active Buses <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Quick Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#c3c6d6]/30">
              {displayedRoutes.map((route) => {
                const routePillClass =
                  route.status === "delayed"
                    ? "bg-[#ffdad6] text-[#ba1a1a]"
                    : route.status === "minor-delays"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-[#dae2ff] text-[#0040a1]";

                return (
                  <tr
                    key={route.id}
                    className="transition-colors hover:bg-[#f6f8ff]"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold ${routePillClass}`}
                        >
                          {route.id}
                        </div>
                        <div>
                          <p className="font-bold text-[#1f2633]">
                            {route.name}
                          </p>
                          <p className="text-xs text-[#737785]">{route.name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <RouteStatusBadge status={route.status} />
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="text-2xl font-bold leading-none text-[#1f2633] max-lg:text-2xl">
                        {route.activeBuses}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          aria-label={`View route ${route.id}`}
                          onClick={() => setViewingRoute(route)}
                          className="cursor-pointer rounded-lg p-2 text-[#0040a1] transition-colors hover:bg-[#eaf0ff]"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`More actions for route ${route.id}`}
                          className="cursor-pointer rounded-lg p-2 text-[#586579] transition-colors hover:bg-[#eef2ff]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayedRoutes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm font-medium text-[#737785]"
                  >
                    No routes match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {displayedRoutes.map((route) => (
            <article
              key={route.id}
              className="rounded-xl border border-[#dbe2f9] bg-[#f9faff] p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#586579]">
                    Route {route.id}
                  </p>
                  <h2 className="text-lg font-extrabold text-[#1f2633]">
                    {route.name}
                  </h2>
                  <p className="text-xs text-[#737785]">{route.name}</p>
                </div>
                <RouteStatusBadge status={route.status} />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#586579]">
                  Active Buses
                </p>
                <p className="text-2xl font-extrabold text-[#1f2633]">
                  {route.activeBuses}
                </p>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  aria-label={`View route ${route.id}`}
                  onClick={() => setViewingRoute(route)}
                  className="cursor-pointer rounded-lg bg-white p-2 text-[#0040a1] ring-1 ring-[#dbe2f9]"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  aria-label={`More actions for route ${route.id}`}
                  className="cursor-pointer rounded-lg bg-white p-2 text-[#586579] ring-1 ring-[#dbe2f9]"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}

          {displayedRoutes.length === 0 && (
            <div className="rounded-xl border border-[#dbe2f9] bg-[#f9faff] p-4 text-center text-sm font-medium text-[#737785]">
              No routes match your current filters.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#c3c6d6]/35 bg-[#f8f9ff] px-5 py-4 text-sm text-[#586579] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing{" "}
            <span className="font-bold text-[#141b2c]">
              {displayedRoutes.length}
            </span>{" "}
            route{displayedRoutes.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              disabled
              aria-label="Previous page"
              className="cursor-pointer rounded-md border border-[#c3c6d6]/60 p-1.5 text-[#9da3b0] disabled:opacity-70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next page"
              className="cursor-pointer rounded-md border border-[#c3c6d6]/60 p-1.5 text-[#586579] transition-colors hover:bg-[#eef2ff]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {viewingRoute ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#586579]">
                  Route {viewingRoute.id}
                </p>
                <h3 className="text-2xl font-extrabold text-[#1f2633]">
                  {viewingRoute.name}
                </h3>
                <p className="text-sm text-[#586579]">{viewingRoute.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingRoute(null)}
                className="rounded-lg border border-[#d4daea] px-3 py-1.5 text-sm font-semibold text-[#485062]"
              >
                Close
              </button>
            </div>

            <div className="rounded-xl border border-[#dbe2f9] bg-[#f8faff] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#586579]">
                Route Stops
              </p>
              {viewingRoute.stops.length === 0 ? (
                <p className="text-sm font-medium text-[#737785]">
                  No stops assigned to this route yet.
                </p>
              ) : (
                <div className="relative px-2 py-3">
                  <span className="pointer-events-none absolute left-4 right-4 top-[3.2rem] h-1 rounded-full bg-[#c8d8ff]" />
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4">
                    {viewingRoute.stops.map((stop, index) => (
                      <div
                        key={`${viewingRoute.id}-${stop.name}-${index}`}
                        className="flex flex-col items-center text-center"
                      >
                        <span className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7385]">
                          {stop.schedule}
                        </span>
                        <span className="mb-2 line-clamp-2 min-h-10 text-xs font-semibold text-[#1f2633]">
                          {stop.name}
                        </span>
                        <span className="z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0040a1] text-xs font-bold text-white shadow-sm">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
