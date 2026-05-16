'use client';

import BusCard from "@/components/BusCard";
import { useMqttContext } from "@/lib/iot";
import { useEffect, useRef, useState } from "react";

interface FleetCard {
  id: string;
  busCode: string;
  rfidTag: string;
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

type StopLookupItem = {
  id: string;
  name: string;
};

/**
 * Finds a matching entry in a Map by trying exact match first,
 * then case-insensitive/trimmed match. Handles format differences
 * between database values and MQTT payload values.
 */
function findInMap<T>(map: Map<string, T>, key: string): T | undefined {
  // Exact match
  const exact = map.get(key);
  if (exact) return exact;

  // Normalized fallback (trim whitespace, case-insensitive)
  const keyNorm = key.trim().toLowerCase();
  for (const [k, v] of map.entries()) {
    if (k.trim().toLowerCase() === keyNorm) return v;
  }
  return undefined;
}

export default function DashboardClient({ fleetCards }: DashboardClientProps) {
  const { busRFIDs, busPassengers, busHeartbeats, isConnected, lastUpdate } =
    useMqttContext();
  const [liveFleetCards, setLiveFleetCards] = useState<FleetCard[]>(fleetCards);
  const [pollError, setPollError] = useState<string | null>(null);
  const [pendingPassengerDelta, setPendingPassengerDelta] = useState<
    Map<string, number>
  >(new Map());
  const lastPolledPassengersRef = useRef<Map<string, number>>(new Map());
  const lastMqttTotalsRef = useRef<Map<string, number>>(new Map());
  const [stopLookup, setStopLookup] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setLiveFleetCards(fleetCards);
  }, [fleetCards]);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchFleetCards = async () => {
      try {
        const response = await fetch("/api/dashboard/fleet", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to refresh fleet data.");
        }

        const data = (await response.json()) as FleetCard[];
        if (mounted) {
          setLiveFleetCards(data);
          setPollError(null);
        }
      } catch (error) {
        if (mounted) {
          setPollError((error as Error).message ?? "Failed to refresh fleet data.");
        }
      }
    };

    fetchFleetCards();
    intervalId = setInterval(fetchFleetCards, 10000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchStops = async () => {
      try {
        const response = await fetch("/api/stops/lookup", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as StopLookupItem[];
        if (!mounted) return;
        const nextLookup = new Map<string, string>();
        data.forEach((stop) => nextLookup.set(stop.id, stop.name));
        setStopLookup(nextLookup);
      } catch (_) {
        // ignore stop lookup failures
      }
    };

    fetchStops();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const prevPolled = lastPolledPassengersRef.current;
    const nextPolled = new Map<string, number>();
    const nextPending = new Map(pendingPassengerDelta);

    liveFleetCards.forEach((bus) => {
      const previous = prevPolled.get(bus.rfidTag) ?? bus.passengers;
      const current = bus.passengers;
      nextPolled.set(bus.rfidTag, current);

      if (current !== previous) {
        const appliedDelta = current - previous;
        const existingPending = nextPending.get(bus.rfidTag) ?? 0;
        const updatedPending = existingPending - appliedDelta;
        nextPending.set(bus.rfidTag, Math.max(0, updatedPending));
      }
    });

    lastPolledPassengersRef.current = nextPolled;
    setPendingPassengerDelta(nextPending);
  }, [liveFleetCards]);

  useEffect(() => {
    const nextPending = new Map(pendingPassengerDelta);
    busPassengers.forEach((passenger, uid) => {
      const previousTotal = lastMqttTotalsRef.current.get(uid) ?? 0;
      const delta = passenger.totalPassengers - previousTotal;
      if (delta !== 0) {
        const existingPending = nextPending.get(uid) ?? 0;
        nextPending.set(uid, Math.max(0, existingPending + delta));
        lastMqttTotalsRef.current.set(uid, passenger.totalPassengers);
      }
    });
    setPendingPassengerDelta(nextPending);
  }, [busPassengers]);

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
          {pollError ? (
            <span className="text-xs text-amber-600">{pollError}</span>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {liveFleetCards.length === 0 ? (
          <div className="rounded-xl border border-[#dbe2f9] bg-white p-6 text-sm font-semibold text-[#586579]">
            No buses have been added yet.
          </div>
        ) : (
          liveFleetCards.map((bus) => {
            // RFID lookup: busRFIDs is keyed by UID, bus.rfidTag is the UID from database
            const rfid = findInMap(busRFIDs, bus.rfidTag);

            // Heartbeat lookup
            const heartbeat = findInMap(busHeartbeats, bus.busCode);

            // Merge realtime data into existing card props (no new cards created)
            const passengerDelta = pendingPassengerDelta.get(bus.rfidTag) ?? 0;
            const realtimePassengers = bus.passengers + passengerDelta;
            const realtimeLastStop = rfid?.stopId
              ? stopLookup.get(rfid.stopId) ?? bus.lastStop
              : bus.lastStop;

            return (
              <div key={bus.id} className="relative">
                <BusCard
                  busId={bus.busCode}
                  route={bus.route}
                  nextArrival={bus.nextArrival}
                  lastStop={realtimeLastStop}
                  passengers={realtimePassengers}
                  capacity={bus.capacity}
                  heading={bus.heading}
                  status={bus.status}
                />
                {rfid && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    At {stopLookup.get(rfid.stopId) ?? rfid.stopId}
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
    </section>
  );
}
