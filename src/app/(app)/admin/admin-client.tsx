"use client";

import {
  ArrowUpDown,
  Bus,
  Check,
  Download,
  ListFilter,
  Map,
  Pencil,
  PlusCircle,
  Route,
  Save,
  Search,
  ScrollText,
  TrainFront,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AdminTab =
  | "buses"
  | "routes"
  | "stops"
  | "route-stops"
  | "logs"
  | "arrival-logs";

type BusStatus = "ACTIVE" | "REPAIR" | "STANDBY";
type RouteStatus = "ON_SCHEDULE" | "MINOR_DELAYS" | "DELAYED";
type ScheduleType = "WEEKDAYS" | "DAILY" | "PEAK";
type SortDirection = "asc" | "desc";
type BusSortKey = "id" | "model" | "capacity" | "status";
type ConfiguredRouteSortKey = "route" | "coverage" | "type" | "status";

type BusItem = {
  id: string;
  fleetCode: string;
  model: string;
  capacity: number;
  status: BusStatus;
  routeId: string | null;
};

type ConfiguredRoute = {
  id: string;
  code: string;
  name: string;
  routeLabel: string;
  direction: string;
  coverage: string;
  type: ScheduleType;
  status: RouteStatus;
};

type StopItem = {
  id: string;
  name: string;
  rfidTag: string;
  lat: number;
  lng: number;
};

type RouteStopItem = {
  id: string;
  routeId: string;
  stopId: string;
  order: number;
  stopName: string;
};

type LogItem = {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  status: "SUCCESS" | "FAILED";
  actorName: string;
  actorRole: string;
  ipAddress: string;
  details: string;
};

type ArrivalLogItem = {
  id: string;
  createdAt: string;
  busId: string;
  routeLabel: string;
  stopName: string;
  rfidTag: string;
};

type BusDraft = {
  id: string;
  fleetCode: string;
  model: string;
  capacity: string;
  status: BusStatus;
  routeId: string;
};

type RouteDraft = {
  id: string;
  code: string;
  name: string;
  coverage: string;
  direction: string;
  scheduleType: ScheduleType;
  status: RouteStatus;
};

const busStatusClass: Record<BusStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  REPAIR: "bg-amber-100 text-amber-700",
  STANDBY: "bg-slate-200 text-slate-600",
};

const routeStatusClass: Record<RouteStatus, string> = {
  ON_SCHEDULE: "bg-emerald-100 text-emerald-700",
  MINOR_DELAYS: "bg-amber-100 text-amber-700",
  DELAYED: "bg-rose-100 text-rose-700",
};

function BusesPanel({
  buses,
  configuredRoutes,
}: {
  buses: BusItem[];
  configuredRoutes: ConfiguredRoute[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BusStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<BusSortKey>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [formState, setFormState] = useState({
    fleetCode: "",
    model: "",
    capacity: "",
    status: "ACTIVE" as BusStatus,
    routeId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editBus, setEditBus] = useState<BusDraft | null>(null);
  const [deleteBusId, setDeleteBusId] = useState<string | null>(null);

  const handleSort = (key: BusSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const displayedBuses = useMemo(() => {
    const filtered = buses.filter((bus) => {
      const bySearch =
        searchQuery.trim() === "" ||
        `${bus.fleetCode} ${bus.model}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const byStatus = statusFilter === "ALL" || bus.status === statusFilter;

      return bySearch && byStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "id") {
        comparison = a.fleetCode.localeCompare(b.fleetCode, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      } else if (sortKey === "model") {
        comparison = a.model.localeCompare(b.model);
      } else if (sortKey === "capacity") {
        comparison = a.capacity - b.capacity;
      } else {
        comparison = a.status.localeCompare(b.status);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [buses, searchQuery, sortDirection, sortKey, statusFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#cfd4e2] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-[#1f2633]">
          <PlusCircle className="h-5 w-5 text-[#0a4cad]" />
          <h2 className="text-3xl font-extrabold tracking-tight max-md:text-2xl">
            Register New Bus
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Bus ID
            </span>
            <input
              type="text"
              placeholder="e.g., VT-2024-001"
              value={formState.fleetCode}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  fleetCode: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Capacity
            </span>
            <input
              type="number"
              placeholder="Max Passengers"
              value={formState.capacity}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  capacity: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Status
            </span>
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  status: event.target.value as BusStatus,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            >
              <option value="ACTIVE">Active</option>
              <option value="REPAIR">Repair</option>
              <option value="STANDBY">Standby</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Assigned Route
            </span>
            <select
              value={formState.routeId}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  routeId: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            >
              <option value="">Unassigned</option>
              {configuredRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.routeLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Model
            </span>
            <input
              type="text"
              placeholder="e.g., Orion VII"
              value={formState.model}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  model: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>
        </div>

        {errorMessage ? (
          <p className="rounded-md bg-[#ffe8e8] px-3 py-2 text-sm font-medium text-[#a82121]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={async () => {
            setErrorMessage(null);
            if (!formState.fleetCode || !formState.model || !formState.capacity) {
              setErrorMessage("Please fill all bus fields.");
              return;
            }

            setIsSubmitting(true);
            const response = await fetch("/api/admin/buses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fleetCode: formState.fleetCode,
                model: formState.model,
                capacity: Number(formState.capacity),
                status: formState.status,
                routeId: formState.routeId || null,
              }),
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              setErrorMessage(payload.error ?? "Failed to create bus.");
              setIsSubmitting(false);
              return;
            }

            setFormState({
              fleetCode: "",
              model: "",
              capacity: "",
              status: "ACTIVE",
              routeId: "",
            });
            setIsSubmitting(false);
            router.refresh();
          }}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a4cad] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Bus Entry"}
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8deeb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1f2633]">
            Manage All Buses
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737b8c]" />
              <input
                type="text"
                placeholder="Search fleet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-[#d4daea] bg-[#eef2ff] py-2 pl-9 pr-3 text-sm outline-none ring-[#0a4cad] transition focus:ring-2"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as BusStatus | "ALL")
              }
              className="cursor-pointer rounded-md border border-[#d4daea] bg-[#eef2ff] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#485062] outline-none ring-[#0a4cad] focus:ring-2"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="REPAIR">Repair</option>
              <option value="STANDBY">Standby</option>
            </select>

            <button className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0a4cad] transition-opacity hover:opacity-80">
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f1f4ff] text-[11px] font-bold uppercase tracking-[0.15em] text-[#586579]">
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("id")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "id"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Bus ID <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("model")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "model"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Model <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("capacity")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "capacity"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Capacity <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "status"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Status <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e5f1]">
              {displayedBuses.map((bus) => (
                <tr key={bus.id} className="hover:bg-[#f9fbff]">
                  <td className="px-4 py-4 font-bold text-[#1f2633]">
                    {bus.fleetCode}
                  </td>
                  <td className="px-4 py-4 text-[#5b6272]">{bus.model}</td>
                  <td className="px-4 py-4 font-semibold text-[#3e4658]">
                    {bus.capacity}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${busStatusClass[bus.status]}`}
                    >
                      {bus.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#eef2ff] hover:text-[#0a4cad]"
                        onClick={() =>
                          setEditBus({
                            id: bus.id,
                            fleetCode: bus.fleetCode,
                            model: bus.model,
                            capacity: String(bus.capacity),
                            status: bus.status,
                            routeId: bus.routeId ?? "",
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#fff1f1] hover:text-[#c33c45]"
                        onClick={() => setDeleteBusId(bus.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {displayedBuses.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm font-medium text-[#737b8c]"
                  >
                    No buses found for this search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {displayedBuses.map((bus) => (
            <article
              key={bus.id}
              className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-base font-bold text-[#1f2633]">
                  {bus.fleetCode}
                </h4>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${busStatusClass[bus.status]}`}
                >
                  {bus.status}
                </span>
              </div>
              <p className="text-sm text-[#586579]">{bus.model}</p>
              <p className="mt-1 text-sm font-semibold text-[#3e4658]">
                Capacity: {bus.capacity}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="cursor-pointer rounded-md bg-white p-2 text-[#586579] ring-1 ring-[#dbe2f0]"
                  onClick={() =>
                    setEditBus({
                      id: bus.id,
                      fleetCode: bus.fleetCode,
                      model: bus.model,
                      capacity: String(bus.capacity),
                      status: bus.status,
                      routeId: bus.routeId ?? "",
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="cursor-pointer rounded-md bg-white p-2 text-[#c33c45] ring-1 ring-[#dbe2f0]"
                  onClick={() => setDeleteBusId(bus.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}

          {displayedBuses.length === 0 && (
            <div className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4 text-center text-sm font-medium text-[#737b8c]">
              No buses found for this search/filter.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#d8deeb] bg-[#f5f7ff] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#586579]">
          <p>
            Showing {displayedBuses.length} of {buses.length} Fleet Vehicles
          </p>
          <div className="flex gap-2">
            <button className="cursor-pointer rounded-md border border-[#ccd4e7] px-3 py-1.5 text-[#2d3545]">
              Prev
            </button>
            <button className="cursor-pointer rounded-md border border-[#ccd4e7] px-3 py-1.5 text-[#2d3545]">
              Next
            </button>
          </div>
        </div>
      </section>
      {editBus ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#1f2633]">Edit Bus</h3>
              <p className="text-sm text-[#586579]">
                Update fleet details for this bus.
              </p>
            </div>
            <div className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Bus ID
                </span>
                <input
                  type="text"
                  value={editBus.fleetCode}
                  onChange={(event) =>
                    setEditBus((prev) =>
                      prev
                        ? { ...prev, fleetCode: event.target.value }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Model
                </span>
                <input
                  type="text"
                  value={editBus.model}
                  onChange={(event) =>
                    setEditBus((prev) =>
                      prev ? { ...prev, model: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Capacity
                </span>
                <input
                  type="number"
                  value={editBus.capacity}
                  onChange={(event) =>
                    setEditBus((prev) =>
                      prev ? { ...prev, capacity: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Status
                </span>
                <select
                  value={editBus.status}
                  onChange={(event) =>
                    setEditBus((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: event.target.value as BusStatus,
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="REPAIR">Repair</option>
                  <option value="STANDBY">Standby</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Assigned Route
                </span>
                <select
                  value={editBus.routeId}
                  onChange={(event) =>
                    setEditBus((prev) =>
                      prev
                        ? {
                            ...prev,
                            routeId: event.target.value,
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                >
                  <option value="">Unassigned</option>
                  {configuredRoutes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.routeLabel}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditBus(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editBus) {
                    return;
                  }
                  const capacity = Number(editBus.capacity);
                  if (!Number.isFinite(capacity) || capacity <= 0) {
                    setErrorMessage("Capacity must be a number.");
                    return;
                  }
                  const response = await fetch(
                    `/api/admin/buses/${editBus.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        fleetCode: editBus.fleetCode,
                        model: editBus.model,
                        capacity,
                        status: editBus.status,
                        routeId: editBus.routeId || null,
                      }),
                    },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(payload.error ?? "Failed to update bus.");
                    return;
                  }
                  setEditBus(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#0a4cad] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteBusId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1f2633]">
              Delete bus?
            </h3>
            <p className="mt-2 text-sm text-[#586579]">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteBusId(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch(
                    `/api/admin/buses/${deleteBusId}`,
                    { method: "DELETE" },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(payload.error ?? "Failed to delete bus.");
                    return;
                  }
                  setDeleteBusId(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#c33c45] px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoutesPanel({
  configuredRoutes,
}: {
  configuredRoutes: ConfiguredRoute[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<ConfiguredRouteSortKey>("route");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [formState, setFormState] = useState({
    code: "",
    name: "",
    coverage: "",
    direction: "",
    scheduleType: "WEEKDAYS" as ScheduleType,
    status: "ON_SCHEDULE" as RouteStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editRoute, setEditRoute] = useState<RouteDraft | null>(null);
  const [deleteRouteId, setDeleteRouteId] = useState<string | null>(null);

  const handleSort = (key: ConfiguredRouteSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const displayedConfiguredRoutes = useMemo(() => {
    const filtered = configuredRoutes.filter((item) => {
      const bySearch =
        searchQuery.trim() === "" ||
        `${item.routeLabel} ${item.coverage} ${item.type}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const byStatus = statusFilter === "ALL" || item.status === statusFilter;

      return bySearch && byStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "route") {
        comparison = a.routeLabel.localeCompare(b.routeLabel, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      } else if (sortKey === "coverage") {
        comparison = a.coverage.localeCompare(b.coverage);
      } else if (sortKey === "type") {
        comparison = a.type.localeCompare(b.type);
      } else {
        comparison = a.status.localeCompare(b.status);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [configuredRoutes, searchQuery, sortDirection, sortKey, statusFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#cfd4e2] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-[#1f2633]">
          <ListFilter className="h-5 w-5 text-[#0a4cad]" />
          <h2 className="text-3xl font-extrabold tracking-tight max-md:text-2xl">
            Create New Route
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Route Code
            </span>
            <input
              type="text"
              placeholder="e.g., 101"
              value={formState.code}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  code: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Route Name
            </span>
            <input
              type="text"
              placeholder="e.g., Downtown Express 101"
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Coverage
            </span>
            <input
              type="text"
              placeholder="e.g., Oak St -> Market"
              value={formState.coverage}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  coverage: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Direction
            </span>
            <input
              type="text"
              placeholder="e.g., Northbound / Southbound"
              value={formState.direction}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  direction: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </label>

          <fieldset className="space-y-2 md:col-span-2">
            <legend className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Schedule Type
            </legend>
            <div className="flex flex-wrap gap-4 text-sm text-[#3d4558]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="schedule"
                  className="accent-[#0a4cad]"
                  checked={formState.scheduleType === "DAILY"}
                  onChange={() =>
                    setFormState((prev) => ({
                      ...prev,
                      scheduleType: "DAILY",
                    }))
                  }
                />{" "}
                Daily
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="schedule"
                  className="accent-[#0a4cad]"
                  checked={formState.scheduleType === "WEEKDAYS"}
                  onChange={() =>
                    setFormState((prev) => ({
                      ...prev,
                      scheduleType: "WEEKDAYS",
                    }))
                  }
                />
                Weekdays
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="schedule"
                  className="accent-[#0a4cad]"
                  checked={formState.scheduleType === "PEAK"}
                  onChange={() =>
                    setFormState((prev) => ({
                      ...prev,
                      scheduleType: "PEAK",
                    }))
                  }
                />{" "}
                Peak
              </label>
            </div>
          </fieldset>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Live Status
            </span>
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  status: event.target.value as RouteStatus,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
            >
              <option value="ON_SCHEDULE">On Schedule</option>
              <option value="MINOR_DELAYS">Minor Delays</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </label>
        </div>

        {errorMessage ? (
          <p className="rounded-md bg-[#ffe8e8] px-3 py-2 text-sm font-medium text-[#a82121]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={async () => {
            setErrorMessage(null);
            if (
              !formState.code ||
              !formState.name ||
              !formState.coverage ||
              !formState.direction
            ) {
              setErrorMessage("Please fill all route fields.");
              return;
            }

            setIsSubmitting(true);
            const response = await fetch("/api/admin/routes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: formState.code,
                name: formState.name,
                coverage: formState.coverage,
                direction: formState.direction,
                scheduleType: formState.scheduleType,
                status: formState.status,
              }),
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              setErrorMessage(payload.error ?? "Failed to create route.");
              setIsSubmitting(false);
              return;
            }

            setFormState({
              code: "",
              name: "",
              coverage: "",
              direction: "",
              scheduleType: "WEEKDAYS",
              status: "ON_SCHEDULE",
            });
            setIsSubmitting(false);
            router.refresh();
          }}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a4cad] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Route Configuration"}
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8deeb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1f2633]">
            Configured Routes
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737b8c]" />
              <input
                type="text"
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-[#d4daea] bg-[#eef2ff] py-2 pl-9 pr-3 text-sm outline-none ring-[#0a4cad] transition focus:ring-2"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RouteStatus | "ALL")
              }
              className="cursor-pointer rounded-md border border-[#d4daea] bg-[#eef2ff] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#485062] outline-none ring-[#0a4cad] focus:ring-2"
            >
              <option value="ALL">All</option>
              <option value="ON_SCHEDULE">On Schedule</option>
              <option value="MINOR_DELAYS">Minor Delays</option>
              <option value="DELAYED">Delayed</option>
            </select>

            <button className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0a4cad] transition-opacity hover:opacity-80">
              <Map className="h-3.5 w-3.5" />
              Map View
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f1f4ff] text-[11px] font-bold uppercase tracking-[0.15em] text-[#586579]">
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("route")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "route"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Route <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("coverage")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "coverage"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Coverage <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("type")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "type"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Type <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors ${
                      sortKey === "status"
                        ? "text-[#0a4cad]"
                        : "hover:text-[#0a4cad]"
                    }`}
                  >
                    Status <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e5f1]">
              {displayedConfiguredRoutes.map((item) => (
                <tr key={item.id} className="hover:bg-[#f9fbff]">
                  <td className="px-4 py-4 font-bold text-[#1f2633]">
                    {item.routeLabel}
                  </td>
                  <td className="px-4 py-4 text-[#5b6272]">{item.coverage}</td>
                  <td className="px-4 py-4 text-sm font-bold text-[#1f56b4]">
                    {item.type}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${routeStatusClass[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#eef2ff] hover:text-[#0a4cad]"
                        onClick={() =>
                          setEditRoute({
                            id: item.id,
                            code: item.code,
                            name: item.name,
                            coverage: item.coverage,
                            direction: item.direction,
                            scheduleType: item.type,
                            status: item.status,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#fff1f1] hover:text-[#c33c45]"
                        onClick={() => setDeleteRouteId(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {displayedConfiguredRoutes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm font-medium text-[#737b8c]"
                  >
                    No routes found for this search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {displayedConfiguredRoutes.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-base font-bold text-[#1f2633]">
                  {item.routeLabel}
                </h4>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${routeStatusClass[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-[#586579]">{item.coverage}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#1f56b4]">
                {item.type}
              </p>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="cursor-pointer rounded-md bg-white p-2 text-[#586579] ring-1 ring-[#dbe2f0]"
                  onClick={() =>
                    setEditRoute({
                      id: item.id,
                      code: item.code,
                      name: item.name,
                      coverage: item.coverage,
                      direction: item.direction,
                      scheduleType: item.type,
                      status: item.status,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="cursor-pointer rounded-md bg-white p-2 text-[#c33c45] ring-1 ring-[#dbe2f0]"
                  onClick={() => setDeleteRouteId(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}

          {displayedConfiguredRoutes.length === 0 && (
            <div className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4 text-center text-sm font-medium text-[#737b8c]">
              No routes found for this search/filter.
            </div>
          )}
        </div>
      </section>
      {editRoute ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#1f2633]">Edit Route</h3>
              <p className="text-sm text-[#586579]">
                Update core route information.
              </p>
            </div>
            <div className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Route Code
                </span>
                <input
                  type="text"
                  value={editRoute.code}
                  onChange={(event) =>
                    setEditRoute((prev) =>
                      prev ? { ...prev, code: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Route Name
                </span>
                <input
                  type="text"
                  value={editRoute.name}
                  onChange={(event) =>
                    setEditRoute((prev) =>
                      prev ? { ...prev, name: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Coverage
                </span>
                <input
                  type="text"
                  value={editRoute.coverage}
                  onChange={(event) =>
                    setEditRoute((prev) =>
                      prev ? { ...prev, coverage: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Direction
                </span>
                <input
                  type="text"
                  value={editRoute.direction}
                  onChange={(event) =>
                    setEditRoute((prev) =>
                      prev ? { ...prev, direction: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Schedule Type
                </span>
                <select
                  value={editRoute.scheduleType}
                  onChange={(event) =>
                    setEditRoute((prev) =>
                      prev
                        ? {
                            ...prev,
                            scheduleType: event.target.value as ScheduleType,
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                >
                  <option value="WEEKDAYS">Weekdays</option>
                  <option value="DAILY">Daily</option>
                  <option value="PEAK">Peak</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Status
                </span>
                <select
                  value={editRoute.status}
                  onChange={(event) =>
                    setEditRoute((prev) =>
                      prev
                        ? {
                            ...prev,
                          status: event.target.value as RouteStatus,
                        }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                >
                  <option value="ON_SCHEDULE">On Schedule</option>
                  <option value="MINOR_DELAYS">Minor Delays</option>
                  <option value="DELAYED">Delayed</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditRoute(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editRoute) {
                    return;
                  }
                  const response = await fetch(
                    `/api/admin/routes/${editRoute.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        code: editRoute.code,
                        name: editRoute.name,
                        coverage: editRoute.coverage,
                        direction: editRoute.direction,
                        scheduleType: editRoute.scheduleType,
                        status: editRoute.status,
                      }),
                    },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(payload.error ?? "Failed to update route.");
                    return;
                  }
                  setEditRoute(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#0a4cad] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteRouteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1f2633]">
              Delete route?
            </h3>
            <p className="mt-2 text-sm text-[#586579]">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteRouteId(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch(
                    `/api/admin/routes/${deleteRouteId}`,
                    { method: "DELETE" },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(
                      payload.error ?? "Failed to delete route.",
                    );
                    return;
                  }
                  setDeleteRouteId(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#c33c45] px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StopsPanel({ stops }: { stops: StopItem[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editStop, setEditStop] = useState<{
    id: string;
    name: string;
    rfidTag: string;
    lat: string;
    lng: string;
  } | null>(null);
  const [deleteStopId, setDeleteStopId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    rfidTag: "",
    lat: "",
    lng: "",
  });

  const filteredStops = useMemo(() => {
    if (!searchQuery.trim()) {
      return stops;
    }
    const term = searchQuery.toLowerCase();
    return stops.filter((stop) =>
      `${stop.name} ${stop.rfidTag}`.toLowerCase().includes(term),
    );
  }, [stops, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#cfd4e2] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-[#1f2633]">
          <PlusCircle className="h-5 w-5 text-[#0a4cad]" />
          <h2 className="text-3xl font-extrabold tracking-tight max-md:text-2xl">
            Add New Stop
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Stop Name
            </span>
            <input
              type="text"
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              RFID Tag
            </span>
            <input
              type="text"
              value={formState.rfidTag}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  rfidTag: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Latitude
            </span>
            <input
              type="number"
              value={formState.lat}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  lat: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Longitude
            </span>
            <input
              type="number"
              value={formState.lng}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  lng: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2.5 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
            />
          </label>
        </div>

        {errorMessage ? (
          <p className="rounded-md bg-[#ffe8e8] px-3 py-2 text-sm font-medium text-[#a82121]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={async () => {
            setErrorMessage(null);
            if (
              !formState.name ||
              !formState.rfidTag ||
              !formState.lat ||
              !formState.lng
            ) {
              setErrorMessage("Please fill all stop fields.");
              return;
            }
            const lat = Number(formState.lat);
            const lng = Number(formState.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              setErrorMessage("Latitude and longitude must be numbers.");
              return;
            }

            setIsSubmitting(true);
            const response = await fetch("/api/admin/stops", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: formState.name,
                rfidTag: formState.rfidTag,
                lat,
                lng,
              }),
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              setErrorMessage(payload.error ?? "Failed to create stop.");
              setIsSubmitting(false);
              return;
            }

            setFormState({ name: "", rfidTag: "", lat: "", lng: "" });
            setIsSubmitting(false);
            router.refresh();
          }}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a4cad] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Stop"}
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8deeb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1f2633]">
            Manage All Stops
          </h3>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737b8c]" />
            <input
              type="text"
              placeholder="Search stops..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-md border border-[#d4daea] bg-[#eef2ff] py-2 pl-9 pr-3 text-sm outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f1f4ff] text-[11px] font-bold uppercase tracking-[0.15em] text-[#586579]">
                <th className="px-4 py-3">Stop</th>
                <th className="px-4 py-3">RFID Tag</th>
                <th className="px-4 py-3">Lat</th>
                <th className="px-4 py-3">Lng</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e5f1]">
              {filteredStops.map((stop) => (
                <tr key={stop.id} className="hover:bg-[#f9fbff]">
                  <td className="px-4 py-4 font-bold text-[#1f2633]">
                    {stop.name}
                  </td>
                  <td className="px-4 py-4 text-[#5b6272]">
                    {stop.rfidTag}
                  </td>
                  <td className="px-4 py-4 text-[#5b6272]">
                    {stop.lat.toFixed(5)}
                  </td>
                  <td className="px-4 py-4 text-[#5b6272]">
                    {stop.lng.toFixed(5)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#eef2ff] hover:text-[#0a4cad]"
                        onClick={() =>
                          setEditStop({
                            id: stop.id,
                            name: stop.name,
                            rfidTag: stop.rfidTag,
                            lat: String(stop.lat),
                            lng: String(stop.lng),
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#fff1f1] hover:text-[#c33c45]"
                        onClick={() => setDeleteStopId(stop.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStops.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm font-medium text-[#737b8c]"
                  >
                    No stops found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredStops.map((stop) => (
            <article
              key={stop.id}
              className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-base font-bold text-[#1f2633]">
                  {stop.name}
                </h4>
                <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold uppercase text-[#0a4cad]">
                  {stop.rfidTag}
                </span>
              </div>
              <p className="text-xs text-[#586579]">
                Lat: {stop.lat.toFixed(5)} | Lng: {stop.lng.toFixed(5)}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="cursor-pointer rounded-md bg-white p-2 text-[#586579] ring-1 ring-[#dbe2f0]"
                  onClick={() =>
                    setEditStop({
                      id: stop.id,
                      name: stop.name,
                      rfidTag: stop.rfidTag,
                      lat: String(stop.lat),
                      lng: String(stop.lng),
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="cursor-pointer rounded-md bg-white p-2 text-[#c33c45] ring-1 ring-[#dbe2f0]"
                  onClick={() => setDeleteStopId(stop.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editStop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#1f2633]">Edit Stop</h3>
              <p className="text-sm text-[#586579]">
                Update the RFID and coordinates for this stop.
              </p>
            </div>
            <div className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Stop Name
                </span>
                <input
                  type="text"
                  value={editStop.name}
                  onChange={(event) =>
                    setEditStop((prev) =>
                      prev ? { ...prev, name: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  RFID Tag
                </span>
                <input
                  type="text"
                  value={editStop.rfidTag}
                  onChange={(event) =>
                    setEditStop((prev) =>
                      prev ? { ...prev, rfidTag: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Latitude
                </span>
                <input
                  type="number"
                  value={editStop.lat}
                  onChange={(event) =>
                    setEditStop((prev) =>
                      prev ? { ...prev, lat: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
                  Longitude
                </span>
                <input
                  type="number"
                  value={editStop.lng}
                  onChange={(event) =>
                    setEditStop((prev) =>
                      prev ? { ...prev, lng: event.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
                />
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditStop(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editStop) {
                    return;
                  }
                  const lat = Number(editStop.lat);
                  const lng = Number(editStop.lng);
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    setErrorMessage("Latitude and longitude must be numbers.");
                    return;
                  }
                  const response = await fetch(
                    `/api/admin/stops/${editStop.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: editStop.name,
                        rfidTag: editStop.rfidTag,
                        lat,
                        lng,
                      }),
                    },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(payload.error ?? "Failed to update stop.");
                    return;
                  }
                  setEditStop(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#0a4cad] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteStopId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1f2633]">
              Delete stop?
            </h3>
            <p className="mt-2 text-sm text-[#586579]">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteStopId(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch(
                    `/api/admin/stops/${deleteStopId}`,
                    { method: "DELETE" },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(payload.error ?? "Failed to delete stop.");
                    return;
                  }
                  setDeleteStopId(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#c33c45] px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RouteStopsPanel({
  configuredRoutes,
  stops,
  routeStops,
}: {
  configuredRoutes: ConfiguredRoute[];
  stops: StopItem[];
  routeStops: RouteStopItem[];
}) {
  const router = useRouter();
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [stopSearchQuery, setStopSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderedStops, setOrderedStops] = useState<RouteStopItem[]>([]);
  const [originalOrder, setOriginalOrder] = useState<Record<string, number>>(
    {},
  );
  const [deleteRouteStopId, setDeleteRouteStopId] = useState<string | null>(
    null,
  );

  const filteredRouteStops = useMemo(() => {
    if (!selectedRouteId) {
      return routeStops;
    }
    return routeStops.filter((item) => item.routeId === selectedRouteId);
  }, [routeStops, selectedRouteId]);

  const selectedRouteStops = useMemo(() => {
    if (!selectedRouteId) {
      return [] as RouteStopItem[];
    }
    return routeStops.filter((item) => item.routeId === selectedRouteId);
  }, [routeStops, selectedRouteId]);

  useEffect(() => {
    setOrderedStops(filteredRouteStops);
    const initialOrder = filteredRouteStops.reduce<Record<string, number>>(
      (acc, item, index) => {
        acc[item.id] = item.order;
        return acc;
      },
      {},
    );
    setOriginalOrder(initialOrder);
  }, [filteredRouteStops]);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    setOrderedStops((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const hasReorderChanges = useMemo(() => {
    return orderedStops.some((item, index) => item.order !== index + 1);
  }, [orderedStops]);

  const assignedStopIds = useMemo(() => {
    return new Set(selectedRouteStops.map((item) => item.stopId));
  }, [selectedRouteStops]);

  const nextOrder = useMemo(() => {
    if (selectedRouteStops.length === 0) {
      return 1;
    }
    const maxOrder = selectedRouteStops.reduce(
      (max, item) => Math.max(max, item.order),
      0,
    );
    return maxOrder + 1;
  }, [selectedRouteStops]);

  const filteredStops = useMemo(() => {
    if (!stopSearchQuery.trim()) {
      return stops;
    }
    const term = stopSearchQuery.toLowerCase();
    return stops.filter((stop) =>
      `${stop.name} ${stop.rfidTag}`.toLowerCase().includes(term),
    );
  }, [stops, stopSearchQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#cfd4e2] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-[#1f2633]">
          <ListFilter className="h-5 w-5 text-[#0a4cad]" />
          <h2 className="text-3xl font-extrabold tracking-tight max-md:text-2xl">
            Assign Stops to Route
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Route
            </span>
            <select
              value={selectedRouteId}
              onChange={(event) => setSelectedRouteId(event.target.value)}
              className="w-full rounded-lg border border-[#c7cfe1] bg-[#eef2ff] px-3 py-2 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
            >
              <option value="">Select route</option>
              {configuredRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.routeLabel}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#586579]">
              Stops
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737b8c]" />
              <input
                type="text"
                value={stopSearchQuery}
                onChange={(event) => setStopSearchQuery(event.target.value)}
                placeholder="Search stops..."
                className="w-full rounded-lg border border-[#c7cfe1] bg-white py-2 pl-9 pr-3 text-sm text-[#1f2633] outline-none ring-[#0a4cad] focus:ring-2"
              />
            </div>
            <div className="h-44 space-y-2 overflow-auto rounded-lg border border-[#c7cfe1] bg-[#eef2ff] p-2">
              {filteredStops.map((stop) => {
                const selected = selectedStopIds.includes(stop.id);
                const alreadyAssigned = assignedStopIds.has(stop.id);
                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() =>
                      setSelectedStopIds((prev) =>
                        prev.includes(stop.id)
                          ? prev.filter((id) => id !== stop.id)
                          : [...prev, stop.id],
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-[#0a4cad] bg-white text-[#1f2633]"
                        : "border-transparent bg-white/70 text-[#3d4558] hover:border-[#c7cfe1]"
                    }`}
                  >
                    <span>{stop.name}</span>
                    {selected ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0a4cad] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    {alreadyAssigned ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Assigned
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {filteredStops.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[#737b8c]">No stops found.</p>
              ) : null}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
              Next order starts at {nextOrder}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-md bg-[#ffe8e8] px-3 py-2 text-sm font-medium text-[#a82121]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={async () => {
            setErrorMessage(null);
            if (!selectedRouteId || selectedStopIds.length === 0) {
              setErrorMessage("Please select route and at least one stop.");
              return;
            }
            const selectedAssigned = selectedStopIds.filter((id) =>
              assignedStopIds.has(id),
            );
            if (selectedAssigned.length > 0) {
              setErrorMessage(
                "Some selected stops are already assigned to this route and were skipped.",
              );
            }

            const pendingStopIds = selectedStopIds.filter(
              (id) => !assignedStopIds.has(id),
            );

            for (const [index, stopId] of pendingStopIds.entries()) {
              const response = await fetch("/api/admin/route-stops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  routeId: selectedRouteId,
                  stopId,
                  order: nextOrder + index,
                }),
              });
              if (!response.ok) {
                const payload = (await response.json()) as { error?: string };
                setErrorMessage(
                  payload.error ?? "Failed to add stops to route.",
                );
                return;
              }
            }
            setSelectedStopIds([]);
            router.refresh();
          }}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a4cad] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Save className="h-4 w-4" />
          Add Stop
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8deeb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1f2633]">
            Route Stop Order
          </h3>
          <button
            type="button"
            disabled={!selectedRouteId || orderedStops.length === 0 || !hasReorderChanges}
            onClick={async () => {
              setErrorMessage(null);
              for (const [index, item] of orderedStops.entries()) {
                const newOrder = index + 1;
                if (originalOrder[item.id] === newOrder) {
                  continue;
                }
                const response = await fetch(
                  `/api/admin/route-stops/${item.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order: newOrder }),
                  },
                );
                if (!response.ok) {
                  const payload = (await response.json()) as { error?: string };
                  setErrorMessage(payload.error ?? "Failed to update order.");
                  return;
                }
              }
              router.refresh();
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a4cad] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save Order
          </button>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f1f4ff] text-[11px] font-bold uppercase tracking-[0.15em] text-[#586579]">
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Stop</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e5f1]">
              {!selectedRouteId ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm font-medium text-[#737b8c]"
                  >
                    Select a route to manage its stops.
                  </td>
                </tr>
              ) : (
                orderedStops.map((item, index) => {
                const routeLabel =
                  configuredRoutes.find((route) => route.id === item.routeId)
                    ?.routeLabel ?? "Unknown route";
                return (
                  <tr key={item.id} className="hover:bg-[#f9fbff]">
                    <td className="px-4 py-4 font-bold text-[#1f2633]">
                      {routeLabel}
                    </td>
                    <td className="px-4 py-4 text-[#5b6272]">
                      {item.stopName}
                    </td>
                    <td
                      className="px-4 py-4 text-[#5b6272]"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "text/plain",
                          String(index),
                        );
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromIndex = Number(
                          event.dataTransfer.getData("text/plain"),
                        );
                        handleReorder(fromIndex, index);
                      }}
                    >
                      <span className="inline-flex cursor-grab items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#0a4cad]">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          className="cursor-pointer rounded-md p-2 text-[#586579] transition-colors hover:bg-[#fff1f1] hover:text-[#c33c45]"
                          onClick={() => setDeleteRouteStopId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
              {selectedRouteId && orderedStops.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm font-medium text-[#737b8c]"
                  >
                    No route stops yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>


      {deleteRouteStopId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1f2633]">
              Remove stop from route?
            </h3>
            <p className="mt-2 text-sm text-[#586579]">
              This will delete the stop assignment only.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteRouteStopId(null)}
                className="rounded-lg border border-[#d4daea] px-4 py-2 text-sm font-semibold text-[#485062]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch(
                    `/api/admin/route-stops/${deleteRouteStopId}`,
                    { method: "DELETE" },
                  );
                  if (!response.ok) {
                    const payload = (await response.json()) as {
                      error?: string;
                    };
                    setErrorMessage(
                      payload.error ?? "Failed to delete route stop.",
                    );
                    return;
                  }
                  setDeleteRouteStopId(null);
                  router.refresh();
                }}
                className="rounded-lg bg-[#c33c45] px-4 py-2 text-sm font-semibold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LogsPanel({ logs }: { logs: LogItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LogItem["status"] | "ALL">(
    "ALL",
  );

  const filteredLogs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return logs.filter((item) => {
      const matchesSearch =
        term === "" ||
        `${item.action} ${item.entity} ${item.entityId ?? ""} ${item.actorName} ${item.actorRole} ${item.ipAddress} ${item.details}`
          .toLowerCase()
          .includes(term);
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#d8deeb] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1f2633]">
          System Logs (Latest 200)
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737b8c]" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-md border border-[#d4daea] bg-[#eef2ff] py-2 pl-9 pr-3 text-sm outline-none ring-[#0a4cad] transition focus:ring-2"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as LogItem["status"] | "ALL")
            }
            className="cursor-pointer rounded-md border border-[#d4daea] bg-[#eef2ff] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#485062] outline-none ring-[#0a4cad] focus:ring-2"
          >
            <option value="ALL">All</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#f1f4ff] text-[11px] font-bold uppercase tracking-[0.15em] text-[#586579]">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e5f1]">
            {filteredLogs.map((item) => (
              <tr key={item.id} className="hover:bg-[#f9fbff]">
                <td className="px-4 py-3 text-sm text-[#586579]">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-bold text-[#1f2633]">{item.action}</td>
                <td className="px-4 py-3 text-[#586579]">
                  {item.entity}
                  {item.entityId ? ` (${item.entityId})` : ""}
                </td>
                <td className="px-4 py-3 text-[#586579]">
                  {item.actorName} ({item.actorRole})
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      item.status === "SUCCESS"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#586579]">{item.ipAddress}</td>
                <td className="max-w-md truncate px-4 py-3 text-[#586579]" title={item.details}>
                  {item.details}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#737b8c]">
                  No logs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {filteredLogs.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#1f2633]">{item.action}</p>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  item.status === "SUCCESS"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#586579]">
              {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-[#586579]">
              {item.entity}
              {item.entityId ? ` (${item.entityId})` : ""}
            </p>
            <p className="text-xs text-[#586579]">
              {item.actorName} ({item.actorRole}) • {item.ipAddress}
            </p>
            <p className="mt-2 text-xs text-[#586579] break-all">{item.details}</p>
          </article>
        ))}
        {filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4 text-center text-sm text-[#737b8c]">
            No logs found.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ArrivalLogsPanel({ logs }: { logs: ArrivalLogItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return logs.filter((item) => {
      if (!term) {
        return true;
      }
      return `${item.busId} ${item.routeLabel} ${item.stopName} ${item.rfidTag}`
        .toLowerCase()
        .includes(term);
    });
  }, [logs, searchQuery]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#d8deeb] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1f2633]">
          Arrival Logs (Latest 200)
        </h3>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737b8c]" />
          <input
            type="text"
            placeholder="Search arrivals..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-md border border-[#d4daea] bg-[#eef2ff] py-2 pl-9 pr-3 text-sm outline-none ring-[#0a4cad] transition focus:ring-2"
          />
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#f1f4ff] text-[11px] font-bold uppercase tracking-[0.15em] text-[#586579]">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Bus</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Stop</th>
              <th className="px-4 py-3">RFID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e5f1]">
            {filteredLogs.map((item) => (
              <tr key={item.id} className="hover:bg-[#f9fbff]">
                <td className="px-4 py-3 text-sm text-[#586579]">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-bold text-[#1f2633]">{item.busId}</td>
                <td className="px-4 py-3 text-[#586579]">{item.routeLabel}</td>
                <td className="px-4 py-3 text-[#586579]">{item.stopName}</td>
                <td className="px-4 py-3 text-[#586579]">{item.rfidTag}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#737b8c]">
                  No arrival logs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {filteredLogs.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4">
            <p className="text-sm font-bold text-[#1f2633]">{item.busId}</p>
            <p className="mt-1 text-xs text-[#586579]">
              {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-[#586579]">{item.routeLabel}</p>
            <p className="text-sm text-[#586579]">Stop: {item.stopName}</p>
            <p className="text-xs text-[#586579]">RFID: {item.rfidTag}</p>
          </article>
        ))}
        {filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-[#dbe2f0] bg-[#fbfcff] p-4 text-center text-sm text-[#737b8c]">
            No arrival logs found.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function AdminClientPage({
  buses,
  configuredRoutes,
  stops,
  routeStops,
  logs,
  arrivalLogs,
}: {
  buses: BusItem[];
  configuredRoutes: ConfiguredRoute[];
  stops: StopItem[];
  routeStops: RouteStopItem[];
  logs: LogItem[];
  arrivalLogs: ArrivalLogItem[];
}) {
  const [tab, setTab] = useState<AdminTab>("buses");

  return (
    <section className="space-y-6 md:space-y-8">
      <header>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#586579]">
          Administrator Console
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b2435] max-md:text-3xl">
          Fleet & Route Management
        </h1>
      </header>

      <div className="border-b border-[#cdd4e4]">
        <div className="flex gap-5 sm:gap-6" role="tablist" aria-label="Admin Tabs">
          <button
            role="tab"
            aria-selected={tab === "buses"}
            onClick={() => setTab("buses")}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-bold transition-colors ${
              tab === "buses"
                ? "border-[#0a4cad] text-[#0a4cad]"
                : "border-transparent text-[#586579] hover:text-[#0a4cad]"
            }`}
          >
            <Bus className="h-4 w-4" />
            Buses
          </button>

          <button
            role="tab"
            aria-selected={tab === "routes"}
            onClick={() => setTab("routes")}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-bold transition-colors ${
              tab === "routes"
                ? "border-[#0a4cad] text-[#0a4cad]"
                : "border-transparent text-[#586579] hover:text-[#0a4cad]"
            }`}
          >
            <Route className="h-4 w-4" />
            Routes
          </button>
          <button
            role="tab"
            aria-selected={tab === "stops"}
            onClick={() => setTab("stops")}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-bold transition-colors ${
              tab === "stops"
                ? "border-[#0a4cad] text-[#0a4cad]"
                : "border-transparent text-[#586579] hover:text-[#0a4cad]"
            }`}
          >
            <Map className="h-4 w-4" />
            Stops
          </button>
          <button
            role="tab"
            aria-selected={tab === "route-stops"}
            onClick={() => setTab("route-stops")}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-bold transition-colors ${
              tab === "route-stops"
                ? "border-[#0a4cad] text-[#0a4cad]"
                : "border-transparent text-[#586579] hover:text-[#0a4cad]"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            Route Stops
          </button>
          <button
            role="tab"
            aria-selected={tab === "arrival-logs"}
            onClick={() => setTab("arrival-logs")}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-bold transition-colors ${
              tab === "arrival-logs"
                ? "border-[#0a4cad] text-[#0a4cad]"
                : "border-transparent text-[#586579] hover:text-[#0a4cad]"
            }`}
          >
            <TrainFront className="h-4 w-4" />
            Arrivals
          </button>
          <button
            role="tab"
            aria-selected={tab === "logs"}
            onClick={() => setTab("logs")}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-bold transition-colors ${
              tab === "logs"
                ? "border-[#0a4cad] text-[#0a4cad]"
                : "border-transparent text-[#586579] hover:text-[#0a4cad]"
            }`}
          >
            <ScrollText className="h-4 w-4" />
            Logs
          </button>
        </div>
      </div>

      {tab === "buses" ? (
        <BusesPanel buses={buses} configuredRoutes={configuredRoutes} />
      ) : tab === "routes" ? (
        <RoutesPanel configuredRoutes={configuredRoutes} />
      ) : tab === "stops" ? (
        <StopsPanel stops={stops} />
      ) : tab === "route-stops" ? (
        <RouteStopsPanel
          configuredRoutes={configuredRoutes}
          stops={stops}
          routeStops={routeStops}
        />
      ) : tab === "arrival-logs" ? (
        <ArrivalLogsPanel logs={arrivalLogs} />
      ) : (
        <LogsPanel logs={logs} />
      )}
    </section>
  );
}
