"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { mqttClient } from "./mqtt-client";

// Matches rfid.ino payload: {"halte":"Halte A","uid":"83 D9 D5 05","timestamp":"00:01:23"}
export interface BusRFID {
  halte: string;
  uid: string;
  timestamp: string;
}

// Matches irSensor.ino payload: {"event":"masuk"|"keluar","passenger_count":1,"bus":"Bis A","timestamp":"00:01:23"}
export interface BusPassengerEvent {
  event: "masuk" | "keluar";
  passenger_count: number;
  bus: string;
  timestamp: string;
}

// Accumulated passenger state per bus (derived from events)
export interface BusPassengerState {
  bus: string;
  totalPassengers: number;
  lastEvent: "masuk" | "keluar";
  lastTimestamp: string;
}

export interface BusHeartbeat {
  busId: string;
  deviceId: string;
  battery?: number;
  signal?: number;
  timestamp: string;
}

interface MqttContextType {
  isConnected: boolean;
  busRFIDs: Map<string, BusRFID>;
  busPassengers: Map<string, BusPassengerState>;
  busHeartbeats: Map<string, BusHeartbeat>;
  recentArrivals: BusRFID[];
  recentPassengerEvents: BusPassengerEvent[];
  lastUpdate: Date | null;
}

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  busRFIDs: new Map(),
  busPassengers: new Map(),
  busHeartbeats: new Map(),
  recentArrivals: [],
  recentPassengerEvents: [],
  lastUpdate: null,
});

export function useMqttContext() {
  return useContext(MqttContext);
}

interface MqttProviderProps {
  children: ReactNode;
}

export function MqttProvider({ children }: MqttProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [busRFIDs, setBusRFIDs] = useState<Map<string, BusRFID>>(new Map());
  const [busPassengers, setBusPassengers] = useState<
    Map<string, BusPassengerState>
  >(new Map());
  const [busHeartbeats, setBusHeartbeats] = useState<
    Map<string, BusHeartbeat>
  >(new Map());
  const [recentArrivals, setRecentArrivals] = useState<BusRFID[]>([]);
  const [recentPassengerEvents, setRecentPassengerEvents] = useState<
    BusPassengerEvent[]
  >([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    let mounted = true;

    const connect = async () => {
      try {
        await mqttClient.connect();
        if (!mounted) return;
        setIsConnected(true);
        console.log("[MqttProvider] Connected to MQTT broker");

        // Subscribe to the exact topics published by ESP32 firmware
        // rfid.ino -> "bus/tracking"
        // irSensor.ino -> "bus/passenger/event"
        const topics = ["bus/tracking", "bus/passenger/event"];
        for (const t of topics) {
          try {
            await mqttClient.subscribe(t);
            console.log(`[MqttProvider] Subscribed to ${t}`);
          } catch (err) {
            console.error(`[MqttProvider] Failed to subscribe to ${t}:`, err);
          }
        }

        // --- Handler for bus/tracking (RFID) ---
        // ESP32 payload: {"halte":"Halte A","uid":"83 D9 D5 05","timestamp":"00:01:23"}
        const unsub1 = mqttClient.on("bus/tracking", (_topic, message) => {
          if (!mounted) return;
          try {
            console.log("[MqttProvider] bus/tracking raw:", message);
            const data = JSON.parse(message);

            // Validate required fields from rfid.ino
            if (
              typeof data.halte !== "string" ||
              typeof data.uid !== "string" ||
              typeof data.timestamp !== "string"
            ) {
              console.warn(
                "[MqttProvider] bus/tracking payload missing required fields:",
                data,
              );
              return;
            }

            const rfidEvent: BusRFID = {
              halte: data.halte,
              uid: data.uid,
              timestamp: data.timestamp,
            };

            setBusRFIDs((prev) => {
              const newMap = new Map(prev);
              // Key by halte name so we track latest arrival per stop
              newMap.set(rfidEvent.halte, rfidEvent);
              return newMap;
            });
            setRecentArrivals((prev) => [rfidEvent, ...prev].slice(0, 50));
            setLastUpdate(new Date());
          } catch (e) {
            console.error(
              "[MqttProvider] Failed to parse bus/tracking payload:",
              e,
              "raw=",
              message,
            );
          }
        });

        // --- Handler for bus/passenger/event (IR Sensor) ---
        // ESP32 payload: {"event":"masuk"|"keluar","passenger_count":1,"bus":"Bis A","timestamp":"00:01:23"}
        const unsub2 = mqttClient.on(
          "bus/passenger/event",
          (_topic, message) => {
            if (!mounted) return;
            try {
              console.log("[MqttProvider] bus/passenger/event raw:", message);
              const data = JSON.parse(message);

              // Validate required fields from irSensor.ino
              if (
                typeof data.event !== "string" ||
                typeof data.passenger_count !== "number" ||
                typeof data.bus !== "string" ||
                typeof data.timestamp !== "string"
              ) {
                console.warn(
                  "[MqttProvider] bus/passenger/event payload missing required fields:",
                  data,
                );
                return;
              }

              const passengerEvent: BusPassengerEvent = {
                event: data.event as "masuk" | "keluar",
                passenger_count: data.passenger_count,
                bus: data.bus,
                timestamp: data.timestamp,
              };

              // Store raw event in recent list
              setRecentPassengerEvents((prev) =>
                [passengerEvent, ...prev].slice(0, 50),
              );

              // Update accumulated passenger state per bus
              setBusPassengers((prev) => {
                const newMap = new Map(prev);
                const existing = newMap.get(passengerEvent.bus);
                const currentTotal = existing ? existing.totalPassengers : 0;
                const newTotal =
                  passengerEvent.event === "masuk"
                    ? currentTotal + passengerEvent.passenger_count
                    : Math.max(0, currentTotal - passengerEvent.passenger_count);

                newMap.set(passengerEvent.bus, {
                  bus: passengerEvent.bus,
                  totalPassengers: newTotal,
                  lastEvent: passengerEvent.event,
                  lastTimestamp: passengerEvent.timestamp,
                });
                return newMap;
              });

              setLastUpdate(new Date());
            } catch (e) {
              console.error(
                "[MqttProvider] Failed to parse bus/passenger/event payload:",
                e,
                "raw=",
                message,
              );
            }
          },
        );

        unsubs = [unsub1, unsub2];
      } catch (error) {
        console.error("[MqttProvider] Failed to connect to MQTT broker:", error);
        if (mounted) setIsConnected(false);
      }
    };

    connect();

    return () => {
      mounted = false;
      // Remove listeners
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          /* ignore */
        }
      });
      // Unsubscribe from topics
      mqttClient.unsubscribe("bus/tracking").catch(() => {});
      mqttClient.unsubscribe("bus/passenger/event").catch(() => {});
      mqttClient.disconnect();
    };
  }, []);

  return (
    <MqttContext.Provider
      value={{
        isConnected,
        busRFIDs,
        busPassengers,
        busHeartbeats,
        recentArrivals,
        recentPassengerEvents,
        lastUpdate,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}
