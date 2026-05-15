import mqtt, { MqttClient, IClientOptions } from 'mqtt';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtts://852671eea23e4af0963854c283e25d73.s1.eu.hivemq.cloud:8883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || 'kelompok4bus';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'Buskelompok4';

class MqttClientManager {
  private client: MqttClient | null = null;
  private listeners: Map<string, Set<(topic: string, message: string) => void>> = new Map();
  private isConnected: boolean = false;

  private getClientOptions(): IClientOptions {
    return {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      rejectUnauthorized: true,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client && this.isConnected) {
        resolve();
        return;
      }

      try {
        this.client = mqtt.connect(MQTT_BROKER_URL, this.getClientOptions());

        this.client.on('connect', () => {
          console.log('[MQTT] Connected to HiveMQ broker');
          this.isConnected = true;
          resolve();
        });

        this.client.on('error', (error) => {
          console.error('[MQTT] Connection error:', error.message);
          this.isConnected = false;
          reject(error);
        });

        this.client.on('offline', () => {
          console.log('[MQTT] Client offline');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          console.log('[MQTT] Reconnecting...');
        });

        this.client.on('message', (topic, message) => {
          const msgString = message.toString();
          const topicListeners = this.listeners.get(topic);
          if (topicListeners) {
            topicListeners.forEach((callback) => callback(topic, msgString));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  subscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to subscribe to ${topic}:`, err.message);
          reject(err);
        } else {
          console.log(`[MQTT] Subscribed to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.unsubscribe(topic, {}, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to unsubscribe from ${topic}:`, err.message);
          reject(err);
        } else {
          console.log(`[MQTT] Unsubscribed from topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  publish(topic: string, message: string | object, qos: 0 | 1 | 2 = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const payload = typeof message === 'object' ? JSON.stringify(message) : message;

      this.client.publish(topic, payload, { qos }, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to publish to ${topic}:`, err.message);
          reject(err);
        } else {
          console.log(`[MQTT] Published to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  on(topic: string, callback: (topic: string, message: string) => void): void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);
  }

  off(topic: string, callback: (topic: string, message: string) => void): void {
    const topicListeners = this.listeners.get(topic);
    if (topicListeners) {
      topicListeners.delete(callback);
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
      console.log('[MQTT] Disconnected from broker');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const mqttClient = new MqttClientManager();
export default mqttClient;