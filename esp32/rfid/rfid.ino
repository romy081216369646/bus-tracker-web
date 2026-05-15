/*
  Dual MFRC522 readers on ESP32 - Bus Tracking Simulator
  
  Simulasi: Bis masuk/keluar di Halte A dan Halte B
  Setiap kali bis tap, LED menyala dan mencatat UID + timestamp

  Wiring:
  - Shared: SCK(GPIO18), MOSI(GPIO23), MISO(GPIO19), RST(GPIO22), 3.3V, GND
  - RFID 1 (Halte A) SDA: GPIO5   -> LED1: GPIO25
  - RFID 2 (Halte B) SDA: GPIO21  -> LED2: GPIO26
  
  LED Wiring (CORRECT):
  - LED1: GPIO25 ──[220Ω resistor]──> LED1 kaki panjang (+)
          LED1 kaki pendek (-) ────────> GND
  - LED2: GPIO26 ──[220Ω resistor]──> LED2 kaki panjang (+)
          LED2 kaki pendek (-) ────────> GND

  Behavior:
  - Tap card di Halte A -> LED1 flash + log "Bis masuk Halte A"
  - Tap card di Halte B -> LED2 flash + log "Bis masuk Halte B"
  - Bisa tap berkali-kali (simulasi bis tracking)
*/

#include <SPI.h>
#include <MFRC522.h>
// WiFi + MQTT
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#define SS_PIN_1 5   // Halte A
#define SS_PIN_2 21  // Halte B
#define RST_PIN 22   // Common RST

#define LED1_PIN 25  // Halte A LED
#define LED2_PIN 26  // Halte B LED
#define LED_FLASH_MS 300

MFRC522 rfid1(SS_PIN_1, RST_PIN);
MFRC522 rfid2(SS_PIN_2, RST_PIN);

// Counter untuk log
// Timestamp boot
unsigned long bootTime = 0;

// RFID state
bool cardDetectedA = false;
bool cardDetectedB = false;

// Last detected UID
String lastUidA = "";
String lastUidB = "";

// -------------------------
// WiFi / MQTT configuration
// -------------------------
// Fill these with your WiFi and Mosquitto broker info
const char* WIFI_SSID = "Redmi 9C";
const char* WIFI_PASS = "mondaymorning";
const char* MQTT_SERVER = "852671eea23e4af0963854c283e25d73.s1.eu.hivemq.cloud"; // HiveMQ broker IP
const uint16_t MQTT_PORT = 8883;
const char* MQTT_USER = "kelompok4bus"; // optional
const char* MQTT_PASS = "Buskelompok4"; // optional
const char* MQTT_TOPIC = "bus/tracking";

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// Function declarations for WiFi/MQTT
void connectWiFi();
void reconnectMQTT();

// --- Function declarations ---
void initHardware();
void runDiagnostics();
void checkRFIDConnection(MFRC522 &reader, const char* readerName);
void checkLEDConnection();
String getUidString(MFRC522 &reader);
void checkAndProcessRFID(MFRC522 &reader, int ledPin, const char* halte, bool &cardDetected, String &lastUid);
void flashLED(int pin, int durationMs);
String getTimestamp();

void setup() {
  Serial.begin(115200);
  delay(500);
  bootTime = millis();
  initHardware();
  Serial.println("\n===== BUS TRACKING SIMULATOR =====");
  Serial.println("Halte A (RFID 1) dan Halte B (RFID 2)");
  Serial.println("====== DIAGNOSTICS ======");
  runDiagnostics();
  
  // Connect WiFi and MQTT
  connectWiFi();
  espClient.setInsecure();
  espClient.setTimeout(15);
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(512);
  // try connect immediately
  reconnectMQTT();
  Serial.println("====== READY ======");
  Serial.println("Menunggu bis tap di halte...");
  Serial.println();
}

void loop() {
  // Ensure WiFi and MQTT stay connected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();
  // Check readers
  checkAndProcessRFID(rfid1, LED1_PIN, "Halte A", cardDetectedA, lastUidA);
  checkAndProcessRFID(rfid2, LED2_PIN, "Halte B", cardDetectedB, lastUidB);
  delay(50);
}

// ============================================
// Initialize Hardware (LEDs & RFID readers)
// ============================================
void initHardware() {
  // Setup LEDs
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);

  // Setup SPI and RFID readers
  SPI.begin(18, 19, 23);  // SCK, MISO, MOSI
  rfid1.PCD_Init();
  rfid2.PCD_Init();
}

// ============================================
// Run Diagnostics at startup
// ============================================
void runDiagnostics() {
  Serial.println("\n[LED Check]");
  checkLEDConnection();
  
  Serial.println("\n[RFID Check]");
  checkRFIDConnection(rfid1, "Halte A (RFID 1)");
  checkRFIDConnection(rfid2, "Halte B (RFID 2)");
  Serial.println();
}

// ============================================
// Check LED Connection
// ============================================
void checkLEDConnection() {
  // Test LED 1 (Halte A)
  Serial.print("LED 1 - Halte A (GPIO");
  Serial.print(LED1_PIN);
  Serial.print(") - ");
  digitalWrite(LED1_PIN, HIGH);
  delay(150);
  int state1 = digitalRead(LED1_PIN);
  digitalWrite(LED1_PIN, LOW);
  Serial.println(state1 == HIGH ? "[OK] LED menyala" : "[WARN] LED mungkin tidak terkoneksi");

  delay(100);

  // Test LED 2 (Halte B)
  Serial.print("LED 2 - Halte B (GPIO");
  Serial.print(LED2_PIN);
  Serial.print(") - ");
  digitalWrite(LED2_PIN, HIGH);
  delay(150);
  int state2 = digitalRead(LED2_PIN);
  digitalWrite(LED2_PIN, LOW);
  Serial.println(state2 == HIGH ? "[OK] LED menyala" : "[WARN] LED mungkin tidak terkoneksi");
}

// ============================================
// Check RFID Reader Connection
// ============================================
void checkRFIDConnection(MFRC522 &reader, const char* readerName) {
  Serial.print(readerName);
  Serial.print(" - ");
  
  // Baca register versi untuk cek koneksi
  byte version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  delay(50);
  byte version2 = reader.PCD_ReadRegister(MFRC522::VersionReg);
  
  Serial.print("Version: 0x");
  if (version < 16) Serial.print("0");
  Serial.print(version, HEX);
  Serial.print(" - ");
  
  // Cek apakah hasil konsisten (bukan 0x00 atau 0xFF = tidak koneksi)
  if ((version != 0x00 && version != 0xFF) && (version == version2)) {
    Serial.println("[OK] Reader terdeteksi");
  } else if (version == 0x00 || version == 0xFF) {
    Serial.println("[ERROR] Reader tidak terkoneksi - cek kabel dan power");
  } else {
    Serial.println("[WARN] Reader terdeteksi tapi sinyal tidak stabil");
  }
}

// ============================================
// WiFi & MQTT helpers
// ============================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to WiFi: "); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Connected!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.print("[WiFi] Connection failed. Status code: ");
    Serial.println(WiFi.status());
    Serial.println("[WiFi] Will retry in loop");
  }
}

void reconnectMQTT() {
  if (mqttClient.connected()) return;
  // Ensure WiFi connected before MQTT
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] WiFi not connected, skipping MQTT");
    return;
  }

  Serial.print("[MQTT] Attempting connection to ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  // Try to connect
  String clientId = "ESP32-BusTracker-" + String((uint32_t)ESP.getEfuseMac());
  bool ok;
  if (strlen(MQTT_USER) > 0) {
    ok = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    ok = mqttClient.connect(clientId.c_str());
  }
  if (ok) {
    Serial.println("[MQTT] Connected");
    // Could subscribe to topics here if needed
  } else {
    Serial.print("[MQTT] Failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" - will retry in loop");
    delay(5000);
  }
}

// ============================================
// Extract UID as hex string (e.g., "83:D9:D5:05")
// ============================================
String getUidString(MFRC522 &reader) {
  String uid = "";
  for (byte i = 0; i < reader.uid.size; i++) {
    if (reader.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(reader.uid.uidByte[i], HEX);
    if (i != reader.uid.size - 1) uid += ":";
  }
  uid.toUpperCase();
  return uid;
}

// ============================================
// Check RFID reader and process card tap
// ============================================
void checkAndProcessRFID(
  MFRC522 &reader,
  int ledPin,
  const char* halte,
  bool &cardDetected,
  String &lastUid
) {
  // Simple read flow: ketika kartu hadir dan terbaca, langsung proses
  if (reader.PICC_IsNewCardPresent() && reader.PICC_ReadCardSerial()) {
    // Build UID string (hex, space-separated like the test sketch)
    String uid = "";
    for (byte i = 0; i < reader.uid.size; i++) {
      if (reader.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(reader.uid.uidByte[i], HEX);
      if (i != reader.uid.size - 1) uid += " ";
    }
    uid.toUpperCase();

    // Log to serial similar to the simple test
    Serial.print(halte);
    Serial.print(" UID: ");
    Serial.println(uid);

    // LED briefly ON (like test sketch)
    digitalWrite(ledPin, HIGH);
    delay(1000);
    digitalWrite(ledPin, LOW);

    // MQTT publish (keep same payload structure)
    if (mqttClient.connected()) {
      String timestamp = getTimestamp();
      String payload = "{";
      payload += "\"halte\":\"" + String(halte) + "\",";
      payload += "\"uid\":\"" + uid + "\",";
      payload += "\"timestamp\":\"" + timestamp + "\"";
      payload += "}";

      char buf[256];
      payload.toCharArray(buf, sizeof(buf));
      bool ok = mqttClient.publish(MQTT_TOPIC, buf);
      Serial.print("MQTT publish -> ");
      Serial.println(ok ? "OK" : "FAILED");
    }

    // Clean up reader
    reader.PICC_HaltA();
    reader.PCD_StopCrypto1();
  }
}

// ============================================
// Flash LED for specified duration
// ============================================
void flashLED(int pin, int durationMs) {
  digitalWrite(pin, HIGH);
  delay(durationMs);
  digitalWrite(pin, LOW);
}

// ============================================
// Get timestamp since boot (HH:MM:SS)
// ============================================
String getTimestamp() {
  unsigned long elapsed = millis() - bootTime;
  unsigned long seconds = elapsed / 1000;
  unsigned long hours = seconds / 3600;
  unsigned long minutes = (seconds % 3600) / 60;
  unsigned long secs = seconds % 60;
  
  String timestamp = "";
  if (hours < 10) timestamp += "0";
  timestamp += String(hours);
  timestamp += ":";
  if (minutes < 10) timestamp += "0";
  timestamp += String(minutes);
  timestamp += ":";
  if (secs < 10) timestamp += "0";
  timestamp += String(secs);
  
  return timestamp;
}
