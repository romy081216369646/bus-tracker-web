'use client';

import BusCard from "@/components/BusCard";
import { useMqttContext } from "@/lib/iot";

interface FleetCard {
  id: string;
  busCode: string;
  route: string;
  nextArrival: string;
  lastStop: string;
  passengers: number;
  capacity: number;
  heading: string;
  status: "normal" | "warning" | "delayed";
}

interface DashboardClientProps {
  fleetCards: FleetCard[];
}

export default function DashboardClient({ fleetCards }: DashboardClientProps) {
  const { busRFIDs, busPassengers, busHeartbeats, isConnected, lastUpdate } = useMqttContext();

  const getBusRFID = (busId: string) => {
    return busRFIDs.get(busId);
  };

  const getBusPassenger = (busId: string) => {
    return busPassengers.get(busId);
  };

  const getBusHeartbeat = (busId: string) => {
    return busHeartbeats.get(busId);
  };

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
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            MQTT: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {lastUpdate && (
            <span className="text-xs text-[#586579]">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fleetCards.length === 0 ? (
          <div className="rounded-xl border border-[#dbe2f9] bg-white p-6 text-sm font-semibold text-[#586579]">
            No buses have been added yet.
          </div>
        ) : (
          fleetCards.map((bus) => {
            const rfid = getBusRFID(bus.busCode);
            const passenger = getBusPassenger(bus.busCode);
            const heartbeat = getBusHeartbeat(bus.busCode);
            
            return (
              <div key={bus.id} className="relative">
                <BusCard
                  busId={bus.busCode}
                  route={bus.route}
                  nextArrival={bus.nextArrival}
                  lastStop={bus.lastStop}
                  passengers={passenger?.totalPassengers ?? bus.passengers}
                  capacity={bus.capacity}
                  heading={bus.heading}
                  status={bus.status}
                />
                {rfid && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    At Halte
                  </div>
                )}
                {heartbeat && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                    Online
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {busPassengers.size > 0 && (
        <div className="rounded-xl border border-[#dbe2f9] bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-[#141b2c]">Real-Time Passenger Data (IR Sensor)</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(busPassengers.entries()).map(([busId, data]) => (
              <div key={busId} className="rounded-lg bg-[#f8f9ff] p-3 text-xs">
                <div className="font-semibold text-[#0040a1]">{busId}</div>
                <div className="text-[#586579]">
                  In: {data.passengerIn} | Out: {data.passengerOut}
                </div>
                <div className="text-[#586579]">
                  Total: {data.totalPassengers} passengers
                </div>
                <div className="text-[#586579]">
                  {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}