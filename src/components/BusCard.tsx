type BusStatus = "normal" | "warning" | "delayed";

type BusCardProps = {
  route: string;
  nextArrival: string;
  lastStop: string;
  passengers: number;
  capacity: number;
  heading: string;
  status?: BusStatus;
};

export default function BusCard({
  route,
  nextArrival,
  lastStop,
  passengers,
  capacity,
  heading,
  status = "normal",
}: BusCardProps) {
  const occupancy =
    capacity > 0
      ? Math.max(0, Math.min(100, Math.round((passengers / capacity) * 100)))
      : 0;

  const isWarning = status === "warning";
  const isDelayed = status === "delayed";

  const badgeClass = isDelayed
    ? "bg-[#bc140d] text-white"
    : isWarning
      ? "bg-[#d6e3fb] text-[#3b485a]"
      : "bg-[#dae2ff] text-[#001847]";

  const etaClass = isDelayed ? "text-[#930002]" : "text-[#0040a1]";
  const progressClass = isDelayed ? "bg-[#bc140d]" : "bg-[#0056d2]";

  return (
    <article className="rounded-xl bg-[#f8f9ff] p-5 shadow-sm ring-1 ring-[#dbe2f9] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-tight ${badgeClass}`}
        >
          {route}
        </span>
        {/* <span className={`text-2xl font-extrabold tracking-tight ${etaClass}`}>
          {nextArrival}
        </span> */}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#586579]">
              Last Stop
            </p>
            <h3 className="text-[1.65rem] font-bold leading-tight text-[#141b2c] max-2xl:text-[1.5rem] max-xl:text-xl">
              {lastStop}
            </h3>
          </div>
          <div className="text-right">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#586579]">
              Next Arrival
            </p>
            <p className="text-xl font-extrabold tracking-tight text-[#141b2c]">
              {nextArrival}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#e7ebf7] p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#586579]">
            Passengers
          </p>
          <p className="text-[1.75rem] font-bold leading-tight text-[#141b2c] max-2xl:text-2xl max-xl:text-lg">
            {passengers}/{capacity}
          </p>
        </div>
        <div className="rounded-lg bg-[#e7ebf7] p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#586579]">
            Next Stop
          </p>
          <p className="wrap-break-words text-[1.3rem] font-bold leading-tight text-[#141b2c] max-2xl:text-2xl max-xl:text-lg">
            {heading}
          </p>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e0e8ff]">
        <div
          className={`h-full rounded-full ${progressClass}`}
          style={{ width: `${occupancy}%` }}
        />
      </div>
    </article>
  );
}
