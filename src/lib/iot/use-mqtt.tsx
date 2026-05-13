'use client';

import { useEffect, useState, useCallback } from 'react';
import { mqttClient } from './mqtt-client';

export function useMqtt() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ topic: string; message: string } | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await mqttClient.connect();
        setIsConnected(true);
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

  const subscribe = useCallback(async (topic: string) => {
    try {
      await mqttClient.subscribe(topic);
      mqttClient.on(topic, (t, msg) => {
        setLastMessage({ topic: t, message: msg });
      });
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error);
    }
  }, []);

  const unsubscribe = useCallback(async (topic: string) => {
    try {
      mqttClient.off(topic, () => {});
      await mqttClient.unsubscribe(topic);
    } catch (error) {
      console.error(`Failed to unsubscribe from ${topic}:`, error);
    }
  }, []);

  const publish = useCallback(async (topic: string, message: string | object) => {
    try {
      await mqttClient.publish(topic, message);
    } catch (error) {
      console.error(`Failed to publish to ${topic}:`, error);
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    publish,
  };
}