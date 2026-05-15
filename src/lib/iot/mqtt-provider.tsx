'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { mqttClient } from './mqtt-client';

export interface BusRFID {
  busId: string;
  rfid: string;
  stopId: string;
  stopName?: string;
  timestamp: string;
}

export interface BusPassenger {
  busId: string;
  passengerIn: number;
  passengerOut: number;
  totalPassengers: number;
  timestamp: string;
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
  busPassengers: Map<string, BusPassenger>;
  busHeartbeats: Map<string, BusHeartbeat>;
  recentArrivals: BusRFID[];
  lastUpdate: Date | null;
}

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  busRFIDs: new Map(),
  busPassengers: new Map(),
  busHeartbeats: new Map(),
  recentArrivals: [],
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
  const [busPassengers, setBusPassengers] = useState<Map<string, BusPassenger>>(new Map());
  const [busHeartbeats, setBusHeartbeats] = useState<Map<string, BusHeartbeat>>(new Map());
  const [recentArrivals, setRecentArrivals] = useState<BusRFID[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await mqttClient.connect();
        setIsConnected(true);

        await mqttClient.subscribe('bus/rfid');
        await mqttClient.subscribe('bus/passenger');
        await mqttClient.subscribe('bus/heartbeat');

        mqttClient.on('bus/rfid', (topic, message) => {
          try {
            const data = JSON.parse(message) as BusRFID;
            setBusRFIDs(prev => {
              const newMap = new Map(prev);
              newMap.set(data.busId, data);
              return newMap;
            });
            setRecentArrivals(prev => [data, ...prev].slice(0, 20));
            setLastUpdate(new Date());
          } catch (e) {
            console.error('Failed to parse bus RFID:', e);
          }
        });

        mqttClient.on('bus/passenger', (topic, message) => {
          try {
            const data = JSON.parse(message) as BusPassenger;
            setBusPassengers(prev => {
              const newMap = new Map(prev);
              newMap.set(data.busId, data);
              return newMap;
            });
            setLastUpdate(new Date());
          } catch (e) {
            console.error('Failed to parse passenger data:', e);
          }
        });

        mqttClient.on('bus/heartbeat', (topic, message) => {
          try {
            const data = JSON.parse(message) as BusHeartbeat;
            setBusHeartbeats(prev => {
              const newMap = new Map(prev);
              newMap.set(data.busId, data);
              return newMap;
            });
            setLastUpdate(new Date());
          } catch (e) {
            console.error('Failed to parse bus heartbeat:', e);
          }
        });

      } catch (error) {
        console.error('Failed to connect to MQTT broker:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
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
        lastUpdate,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}