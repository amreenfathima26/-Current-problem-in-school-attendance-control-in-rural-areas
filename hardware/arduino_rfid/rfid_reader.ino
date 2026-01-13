/*
 * EDURFID - Arduino RFID Reader
 * Reads RFID cards using RC522 module and sends card ID via Serial
 * 
 * Hardware Connections:
 * RC522    Arduino UNO
 * VCC  ->  3.3V
 * GND  ->  GND
 * RST  ->  Pin 9
 * IRQ  ->  Pin 2 (not used)
 * MISO ->  Pin 12
 * MOSI ->  Pin 11
 * SCK  ->  Pin 13
 * SDA  ->  Pin 10
 */

#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN         9
#define SS_PIN          10

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance

void setup() {
  Serial.begin(9600);   // Initialize serial communications
  SPI.begin();          // Initialize SPI bus
  mfrc522.PCD_Init();   // Initialize MFRC522
  
  // Show details of PCD - MFRC522 Card Reader details
  Serial.println("EDURFID RFID Reader Initialized");
  Serial.println("Waiting for RFID cards...");
  Serial.println();
}

void loop() {
  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Show UID on serial monitor
  Serial.print("CARD:");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();

  // Halt PICC
  mfrc522.PICC_HaltA();
  // Stop encryption on PCD
  mfrc522.PCD_StopCrypto1();
  
  // Wait a bit before next scan
  delay(1000);
}

/*
 * Function to get card type
 */
String getCardType(MFRC522::PICC_Type piccType) {
  switch (piccType) {
    case MFRC522::PICC_TYPE_MIFARE_MINI:
      return "Mifare Mini";
    case MFRC522::PICC_TYPE_MIFARE_1KB:
      return "Mifare 1KB";
    case MFRC522::PICC_TYPE_MIFARE_4KB:
      return "Mifare 4KB";
    case MFRC522::PICC_TYPE_MIFARE_UL:
      return "Mifare Ultralight";
    case MFRC522::PICC_TYPE_TNP3XXX:
      return "TNP3XXX";
    case MFRC522::PICC_TYPE_ISO_14443_4:
      return "ISO 14443-4";
    case MFRC522::PICC_TYPE_ISO_18092:
      return "ISO 18092";
    case MFRC522::PICC_TYPE_MIFARE_PLUS:
      return "Mifare Plus";
    case MFRC522::PICC_TYPE_T4T:
      return "T4T";
    default:
      return "Unknown";
  }
}

/*
 * Function to read card data (for future use)
 */
void readCardData() {
  // This function can be expanded to read specific data from cards
  // For now, we only read the UID
  Serial.print("Card Type: ");
  Serial.println(getCardType(mfrc522.PICC_GetType(mfrc522.uid.sak)));
  
  Serial.print("UID: ");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();
  Serial.println();
}
