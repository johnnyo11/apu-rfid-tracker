#include <HTTPClient.h>
#include <MFRC522.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

// ESP32 VSPI wiring: SDA/SS=5, SCK=18, MOSI=23, MISO=19, RST=22, 3.3V and GND.
constexpr byte SS_PIN = 5;
constexpr byte RST_PIN = 22;
constexpr byte STATUS_LED_PIN = 2;
constexpr unsigned long WIFI_TIMEOUT_MS = 20000;

const char* WIFI_NAME = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// For local testing, replace this with your computer's LAN IP, not localhost.
// Example: http://192.168.1.20:3000/api/rfid/scan
const char* API_URL = "http://YOUR_COMPUTER_IP:3000/api/rfid/scan";
const char* DEVICE_KEY = "THE_SAME_VALUE_AS_RFID_DEVICE_SECRET";

MFRC522 reader(SS_PIN, RST_PIN);

void blinkStatus(byte times, unsigned int durationMs = 150) {
  for (byte count = 0; count < times; count++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(durationMs);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(durationMs);
  }
}

String uidAsHex() {
  String uid;
  for (byte index = 0; index < reader.uid.size; index++) {
    if (reader.uid.uidByte[index] < 0x10) uid += "0";
    uid += String(reader.uid.uidByte[index], HEX);
  }
  uid.toUpperCase();
  return uid;
}

template <typename TClient>
void sendScan(TClient& client, const String& uid) {
  HTTPClient http;
  if (!http.begin(client, API_URL)) {
    Serial.println("Could not open the scan endpoint.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  const int status = http.POST("{\"tag_uid\":\"" + uid + "\"}");

  Serial.printf("Scan %s -> HTTP %d\n", uid.c_str(), status);
  if (status > 0) Serial.println(http.getString());

  if (status == 200) {
    Serial.println("Movement accepted (or a repeated read was safely ignored).");
    blinkStatus(2);
  } else if (status == 404) {
    Serial.println("Tag not assigned. Copy the UID above into the web RFID page and select its equipment.");
    blinkStatus(3, 300);
  } else if (status == 401) {
    Serial.println("Device key rejected. Check RFID_DEVICE_SECRET and DEVICE_KEY.");
    blinkStatus(4, 300);
  } else if (status == 503) {
    Serial.println("The web server is missing its RFID environment variables.");
    blinkStatus(4, 300);
  } else if (status < 0) {
    Serial.printf("Network request failed: %s\n", http.errorToString(status).c_str());
    blinkStatus(5, 300);
  } else {
    Serial.println("The server could not record this scan.");
    blinkStatus(5, 300);
  }
  http.end();
}

bool connectToWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  const unsigned long startedAt = millis();
  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startedAt < WIFI_TIMEOUT_MS
  ) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWi-Fi connection timed out. Retrying shortly.");
    return false;
  }
  Serial.printf("\nConnected. ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("\n=== APU AV RFID reader starting ===");
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  Serial.println("Initializing SPI and RC522...");
  SPI.begin();
  reader.PCD_Init();
  delay(50);

  const byte readerVersion = reader.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("RC522 version register: 0x%02X\n", readerVersion);
  if (readerVersion == 0x00 || readerVersion == 0xFF) {
    Serial.println(
      "RC522 not detected. Check 3.3V, GND, SDA=5, SCK=18, "
      "MOSI=23, MISO=19, and RST=22."
    );
  } else {
    Serial.println("RC522 communication ready.");
  }

  Serial.println("Starting Wi-Fi connection...");
  connectToWifi();
  Serial.println("RC522 ready. Present a tag and remove it after the scan.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    if (!connectToWifi()) {
      delay(3000);
      return;
    }
  }
  if (!reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) return;

  const String uid = uidAsHex();
  if (String(API_URL).startsWith("https://")) {
    WiFiClientSecure secureClient;
    // MVP only. Install the server CA certificate before production use.
    secureClient.setInsecure();
    sendScan(secureClient, uid);
  } else {
    WiFiClient client;
    sendScan(client, uid);
  }

  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  delay(1000);
}
