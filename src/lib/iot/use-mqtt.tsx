"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { mqttClient } from "./mqtt-client";

export function useMqtt() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<{
    topic: string;
    message: string;
  } | null>(null);
  const listenersRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        await mqttClient.connect();
        if (mounted) setIsConnected(true);
      } catch (error) {
        console.error("[useMqtt] Failed to connect to MQTT broker:", error);
        if (mounted) setIsConnected(false);
      }
    };

    connect();

    return () => {
      mounted = false;
      // Clean up all listeners registered by this hook instance
      listenersRef.current.forEach((unsub) => {
        try {
          unsub();
        } catch (_) {
          /* ignore */
        }
      });
      listenersRef.current.clear();
      mqttClient.disconnect();
    };
  }, []);

  const subscribe = useCallback(async (topic: string) => {
    try {
      await mqttClient.subscribe(topic);
      // Avoid registering duplicate listeners for the same topic within this hook
      if (listenersRef.current.has(topic)) {
        console.log(`[useMqtt] Already listening to ${topic}`);
        return;
      }
      const unsub = mqttClient.on(topic, (t, msg) => {
        setLastMessage({ topic: t, message: msg });
      });
      listenersRef.current.set(topic, unsub);
    } catch (error) {
      console.error(`[useMqtt] Failed to subscribe to ${topic}:`, error);
    }
  }, []);

  const unsubscribe = useCallback(async (topic: string) => {
    try {
      // Remove listener registered by this hook, if any
      const unsub = listenersRef.current.get(topic);
      if (unsub) {
        try {
          unsub();
        } catch (_) {
          /* ignore */
        }
        listenersRef.current.delete(topic);
      }
      await mqttClient.unsubscribe(topic);
    } catch (error) {
      console.error(`[useMqtt] Failed to unsubscribe from ${topic}:`, error);
    }
  }, []);

  const publish = useCallback(
    async (topic: string, message: string | object) => {
      try {
        await mqttClient.publish(topic, message);
      } catch (error) {
        console.error(`[useMqtt] Failed to publish to ${topic}:`, error);
      }
    },
    [],
  );

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    publish,
  };
}
