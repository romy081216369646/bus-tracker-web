/*
  IR Sensor People Counter - Bus Tracking
  
  Wiring:
  - IR Sensor Masuk (GPIO 23) -> LED Masuk: GPIO 22
    Fungsi: Deteksi penumpang masuk, counter +1
  - IR Sensor Keluar (GPIO 19) -> LED Keluar: GPIO 21
    Fungsi: Deteksi penumpang keluar, counter -1
  
  Behavior:
  - Sensor HIGH (sesaat) = Ada orang melewati sensor
  - Setiap deteksi -> LED flash + counter update + publish via MQTT
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>

// =====================
// Pin Configuration
// =====================
#define IR_SENSOR_IN 23    // Sensor masuk
#define LED_IN 22          // LED masuk
#define IR_SENSOR_OUT 19   // Sensor keluar
#define LED_OUT 18         // LED keluar

// =====================
// Timing
// =====================
#define DEBOUNCE_DELAY 500  // ms - prevent double counting
#define CHECK_INTERVAL 50   // ms - polling interval
#define LED_FLASH_MS 300    // ms - LED flash duration

// Sensor active level: set to LOW if your IR module outputs LOW when object detected
// Common modules: most give HIGH when idle and LOW when detection occurs. Set accordingly.
#define SENSOR_ACTIVE_LEVEL LOW

// =====================
// WiFi / MQTT configuration
// =====================
const char* WIFI_SSID = "Redmi 9C";
const char* WIFI_PASS = "mondaymorning";
const char* MQTT_SERVER = "852671eea23e4af0963854c283e25d73.s1.eu.hivemq.cloud";
const uint16_t MQTT_PORT = 8883;
const char* MQTT_USER = "kelompok4bus";
const char* MQTT_PASS = "Buskelompok4";
const char* MQTT_TOPIC_EVENT = "bus/passenger/event";

// UID RFID card yang mewakili bus ini
// Samakan dengan UID kartu RFID fisik yang digunakan untuk tap di halte
const char* BUS_RFID_UID = "1C B8 D8 05";

// =====================
// Global Variables
// =====================
int passengerCount = 0;
const int MAX_CAPACITY = 40;  // Kapasitas maksimal bis

// Debounce state
unsigned long lastDetectionIn = 0;
unsigned long lastDetectionOut = 0;
unsigned long bootTime = 0;
bool sensorInOccupied = false;   // true while first object is still blocking entry sensor
bool sensorOutOccupied = false;  // true while first object is still blocking exit sensor

// WiFi & MQTT
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// =====================
// Function declarations
// =====================
void initHardware();
void scanWiFiNetworks();
void checkDoorIn();
void checkDoorOut();
void processPerson(bool isEntering, const char* doorName);
void flashLED(int ledPin);
void publishEvent(bool isEntering, const char* doorName);
String getTimestamp();

void setup() {
  Serial.begin(115200);
  delay(500);
  bootTime = millis();
  initHardware();
  
  Serial.println("\n========== BUS PASSENGER COUNTER ==========");
  Serial.println("IR Sensor Masuk  (GPIO23) -> +1 penumpang");
  Serial.println("IR Sensor Keluar (GPIO19) -> -1 penumpang");
  Serial.println("=========================================");
  
  // ===== SETUP WIFI & MQTT (ONE TIME ONLY) =====
  Serial.println("\n[Setup] Scanning WiFi networks...");
  scanWiFiNetworks();
  
  Serial.println("\n[Setup] Connecting to WiFi (max 20 seconds)...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  unsigned long setupStart = millis();
  int dotCount = 0;
  while (WiFi.status() != WL_CONNECTED && millis() - setupStart < 20000) {
    delay(500);
    Serial.print('.');
    dotCount++;
    if (dotCount % 10 == 0) {
      Serial.print(" ("); Serial.print(millis() - setupStart); Serial.println("ms)");
    }
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[Setup] ✓ WiFi connected!");
    Serial.print("[Setup] IP: "); Serial.println(WiFi.localIP());
    Serial.print("[Setup] RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
    
    // Sync NTP time (WIB = UTC+7)
    configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("[Setup] Syncing NTP time...");
    struct tm timeinfo;
    int retries = 0;
    while (!getLocalTime(&timeinfo) && retries < 10) {
      delay(500);
      Serial.print(".");
      retries++;
    }
    Serial.println();
    if (retries < 10) {
      Serial.print("[Setup] ✓ NTP synced: ");
      Serial.println(&timeinfo, "%Y-%m-%d %H:%M:%S WIB");
    } else {
      Serial.println("[Setup] ✗ NTP sync failed, timestamp will fallback to uptime");
    }

    // Setup MQTT with SSL/TLS
    espClient.setInsecure();
    espClient.setTimeout(15);  // 15 second timeout
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setBufferSize(512);
    mqttClient.setKeepAlive(60);  // Keep-alive 60 seconds
    delay(1000);
    
    Serial.print("[Setup] Attempting MQTT connection... ");
    String clientId = "ESP32-PassengerCounter-" + String((uint32_t)ESP.getEfuseMac());
    bool mqttOk = false;
    if (strlen(MQTT_USER) > 0) {
      mqttOk = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      mqttOk = mqttClient.connect(clientId.c_str());
    }
    
    if (mqttOk) {
      Serial.println("✓ MQTT connected!");
    } else {
      Serial.print("✗ MQTT failed (rc=");
      Serial.print(mqttClient.state());
      Serial.println(")");
      Serial.println("[Setup] WARNING: MQTT not ready, will reconnect in loop");
    }
  } else {
    Serial.print("[Setup] ✗ WiFi FAILED after 20s (Status: "); 
    Serial.print(WiFi.status()); Serial.println(")");
    Serial.println("[Setup] ERROR: Check SSID/password/router");
    delay(5000);
    ESP.restart();
  }
  
  Serial.println("\n=============== READY =================");
  displayPassengerStatus();
  Serial.println();
}

void loop() {
  // ===== MAIN OPERATION: SENSORS + MQTT MAINTENANCE =====
  
  // Maintain MQTT connection
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();
  }
  
  // Check sensors and count passengers
  checkDoorIn();
  checkDoorOut();
  
  delay(CHECK_INTERVAL);
}

// =====================
// MQTT Reconnect (with safety)
// =====================
void reconnectMQTT() {
  static unsigned long lastReconnectAttempt = 0;
  
  // Try reconnect every 5 seconds max
  if (millis() - lastReconnectAttempt < 5000) {
    return;
  }
  lastReconnectAttempt = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.print("[MQTT] Attempting connection... ");
  String clientId = "ESP32-PassengerCounter-" + String((uint32_t)ESP.getEfuseMac());
  
  bool ok = false;
  if (strlen(MQTT_USER) > 0) {
    ok = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    ok = mqttClient.connect(clientId.c_str());
  }
  
  if (ok) {
    Serial.println("✓ Connected!");
  } else {
    Serial.print("✗ Failed (rc=");
    Serial.print(mqttClient.state());
    Serial.println(")");
  }
}

// =====================
// Initialize Hardware
// =====================
void initHardware() {
  pinMode(IR_SENSOR_IN, INPUT);
  pinMode(LED_IN, OUTPUT);
  pinMode(IR_SENSOR_OUT, INPUT);
  pinMode(LED_OUT, OUTPUT);
  
  digitalWrite(LED_IN, LOW);
  digitalWrite(LED_OUT, LOW);
  
  Serial.println("Hardware initialized");
}

// =====================
// Scan WiFi Networks (Debug)
// =====================
void scanWiFiNetworks() {
  Serial.println("[Scan] Starting WiFi scan...");
  
  int numNetworks = WiFi.scanNetworks();
  Serial.print("[Scan] Found "); Serial.print(numNetworks); Serial.println(" networks:");
  
  for (int i = 0; i < numNetworks && i < 15; i++) {
    Serial.print("  "); Serial.print(i + 1); Serial.print(". ");
    Serial.print(WiFi.SSID(i)); Serial.print(" (RSSI: ");
    Serial.print(WiFi.RSSI(i)); Serial.println(" dBm)");
  }
  
  // Check if target SSID found
  bool found = false;
  for (int i = 0; i < numNetworks; i++) {
    if (String(WiFi.SSID(i)) == String(WIFI_SSID)) {
      found = true;
      Serial.print("[Scan] ✓ Target SSID '"); Serial.print(WIFI_SSID);
      Serial.println("' found!");
      break;
    }
  }
  if (!found) {
    Serial.print("[Scan] ✗ Target SSID '"); Serial.print(WIFI_SSID);
    Serial.println("' NOT found!");
  }
  Serial.println();
}

// =====================
// Check Sensor Masuk (entry door)
// =====================
void checkDoorIn() {
  int sensorValue = digitalRead(IR_SENSOR_IN);
  bool detected = (sensorValue == SENSOR_ACTIVE_LEVEL);
  
  // Count only on first detection, then wait until sensor is clear again.
  if (detected && !sensorInOccupied) {
    if (millis() - lastDetectionIn >= DEBOUNCE_DELAY) {
      lastDetectionIn = millis();
      sensorInOccupied = true;
      processPerson(true, "Masuk");
    }
  }

  // Reset latch when object leaves sensor area
  if (!detected && sensorInOccupied) {
    sensorInOccupied = false;
  }
}

// =====================
// Check Sensor Keluar (exit door)
// =====================
void checkDoorOut() {
  int sensorValue = digitalRead(IR_SENSOR_OUT);
  bool detected = (sensorValue == SENSOR_ACTIVE_LEVEL);
  
  // Count only on first detection, then wait until sensor is clear again.
  if (detected && !sensorOutOccupied) {
    if (millis() - lastDetectionOut >= DEBOUNCE_DELAY) {
      lastDetectionOut = millis();
      sensorOutOccupied = true;
      processPerson(false, "Keluar");
    }
  }

  // Reset latch when object leaves sensor area
  if (!detected && sensorOutOccupied) {
    sensorOutOccupied = false;
  }
}

// =====================
// Process Person Detection
// =====================
void processPerson(bool isEntering, const char* doorName) {
  String timestamp = getTimestamp();
  
  if (isEntering) {
    // Penumpang masuk
    if (passengerCount < MAX_CAPACITY) {
      passengerCount++;
      Serial.print("["); Serial.print(timestamp); Serial.print("] ");
      Serial.print(doorName); Serial.print(" -> +1 | Total: ");
      Serial.println(passengerCount);
      flashLED(LED_IN);
      publishEvent(true, doorName);
    } else {
      Serial.print("["); Serial.print(timestamp); Serial.print("] ");
      Serial.println("WARNING: Kapasitas bis penuh!");
    }
  } else {
    // Penumpang keluar
    if (passengerCount > 0) {
      passengerCount--;
      Serial.print("["); Serial.print(timestamp); Serial.print("] ");
      Serial.print(doorName); Serial.print(" -> -1 | Total: ");
      Serial.println(passengerCount);
      flashLED(LED_OUT);
      publishEvent(false, doorName);
    } else {
      Serial.print("["); Serial.print(timestamp); Serial.print("] ");
      Serial.println("WARNING: Tidak ada penumpang untuk keluar!");
    }
  }
}

// =====================
// Display Passenger Status
// =====================
void displayPassengerStatus() {
  Serial.print("Penumpang saat ini: ");
  Serial.print(passengerCount);
  Serial.print(" / ");
  Serial.print(MAX_CAPACITY);
  Serial.println();
}

// Publish Event to MQTT
// =====================
void publishEvent(bool isEntering, const char* doorName) {
  if (!mqttClient.connected()) return;
  
  String payload = "{";
  payload += "\"uid\":\"" + String(BUS_RFID_UID) + "\",";
  payload += "\"event\":\"" + String(isEntering ? "masuk" : "keluar") + "\",";
  payload += "\"passenger_count\":1,";
  payload += "\"timestamp\":\"" + getTimestamp() + "\"";
  payload += "}";
  
  char buf[256];
  payload.toCharArray(buf, sizeof(buf));
  bool success = mqttClient.publish(MQTT_TOPIC_EVENT, buf);
  
  Serial.print("[MQTT] Publish EVENT: ");
  Serial.println(success ? "✓ OK" : "✗ FAILED");
}

// =====================
// Flash LED
// =====================
void flashLED(int ledPin) {

  digitalWrite(ledPin, HIGH);

  delay(LED_FLASH_MS);

  digitalWrite(ledPin, LOW);
}

// =====================
// Get Timestamp (HH:MM:SS WIB realtime via NTP)
// =====================
String getTimestamp() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char buf[9];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    return String(buf);
  }
  
  // Fallback ke uptime jika NTP belum sync
  unsigned long elapsed = millis() - bootTime;
  unsigned long seconds = elapsed / 1000;
  unsigned long hours = seconds / 3600;
  unsigned long minutes = (seconds % 3600) / 60;
  unsigned long secs = seconds % 60;
  
  char buf[9];
  snprintf(buf, sizeof(buf), "%02lu:%02lu:%02lu", hours, minutes, secs);
  return String(buf);
}