import BusCard from "@/components/BusCard";
import { getBusCards, getFleetSummary } from "@/lib/data/buses";

export default async function DashboardPage() {
  const [fleetCards, summary] = await Promise.all([
    getBusCards(),
    getFleetSummary(),
  ]);
  const { delayedCount, activeCount } = summary;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] p-5 ring-1 ring-[#dbe2f9] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#586579]">
            System Overview
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#141b2c] sm:text-3xl">
            Active Fleet Control
          </h1>
        </div>

        {/* <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-[#dbe2f9]">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-[#141b2c]">
              {activeCount} Active
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-[#dbe2f9]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#bc140d]" />
            <span className="text-sm font-semibold text-[#141b2c]">
              {delayedCount} Delayed
            </span>
          </div>
        </div> */}
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fleetCards.length === 0 ? (
          <div className="rounded-xl border border-[#dbe2f9] bg-white p-6 text-sm font-semibold text-[#586579]">
            No buses have been added yet.
          </div>
        ) : (
          fleetCards.map((bus) => (
            <BusCard
              key={bus.id}
              route={bus.route}
              nextArrival={bus.nextArrival}
              lastStop={bus.lastStop}
              passengers={bus.passengers}
              capacity={bus.capacity}
              heading={bus.heading}
              status={bus.status}
            />
          ))
        )}
      </div>
    </section>
  );
}
