#!/usr/bin/env python3
"""
EDURFID - Raspberry Pi Serial Listener
Listens to Arduino serial input and sends data to Django API
"""

import serial
import requests
import json
import time
import logging
import sys
import os
from datetime import datetime
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/edurfid/serial_listener.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class SerialListener:
    """Serial listener for RFID data from Arduino."""
    
    def __init__(self, port: str = '/dev/ttyUSB0', baudrate: int = 9600, 
                 api_url: str = 'http://localhost:8000/api/attendance/record/'):
        """
        Initialize serial listener.
        
        Args:
            port: Serial port (e.g., '/dev/ttyUSB0', '/dev/ttyACM0')
            baudrate: Baud rate for serial communication
            api_url: Django API endpoint URL
        """
        self.port = port
        self.baudrate = baudrate
        self.api_url = api_url
        self.serial_connection = None
        self.is_running = False
        self.last_card_id = None
        self.card_cooldown = 2  # seconds between same card scans
        
        # Create log directory if it doesn't exist
        os.makedirs('/var/log/edurfid', exist_ok=True)

    def connect(self) -> bool:
        """
        Connect to serial port.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.serial_connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1
            )
            logger.info(f"Connected to serial port {self.port} at {self.baudrate} baud")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to serial port {self.port}: {e}")
            return False

    def disconnect(self):
        """Disconnect from serial port."""
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
            logger.info("Disconnected from serial port")

    def read_card_id(self) -> Optional[str]:
        """
        Read card ID from serial port.
        
        Returns:
            str: Card ID if found, None otherwise
        """
        if not self.serial_connection or not self.serial_connection.is_open:
            return None

        try:
            if self.serial_connection.in_waiting > 0:
                line = self.serial_connection.readline().decode('utf-8').strip()
                if line.startswith('CARD:'):
                    card_id = line.replace('CARD:', '').strip()
                    return card_id
            return None
        except Exception as e:
            logger.error(f"Error reading from serial port: {e}")
            return None

    def send_to_api(self, card_id: str) -> bool:
        """
        Send card ID to Django API.
        
        Args:
            card_id: RFID card ID
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            data = {'card_id': card_id}
            headers = {'Content-Type': 'application/json'}
            
            response = requests.post(
                self.api_url,
                json=data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully sent card {card_id} to API")
                return True
            else:
                logger.warning(f"API returned status {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("Connection error: Unable to reach Django API")
            return False
        except requests.exceptions.Timeout:
            logger.error("Timeout error: API request timed out")
            return False
        except Exception as e:
            logger.error(f"Error sending to API: {e}")
            return False

    def store_offline(self, card_id: str) -> bool:
        """
        Store card ID offline for later sync.
        
        Args:
            card_id: RFID card ID
            
        Returns:
            bool: True if stored successfully, False otherwise
        """
        try:
            offline_file = '/var/log/edurfid/offline_scans.log'
            timestamp = datetime.now().isoformat()
            
            with open(offline_file, 'a') as f:
                f.write(f"{timestamp},{card_id}\n")
            
            logger.info(f"Stored card {card_id} offline for later sync")
            return True
        except Exception as e:
            logger.error(f"Error storing offline: {e}")
            return False

    def process_card(self, card_id: str):
        """
        Process RFID card scan.
        
        Args:
            card_id: RFID card ID
        """
        # Check cooldown to prevent duplicate scans
        current_time = time.time()
        if (self.last_card_id == card_id and 
            hasattr(self, 'last_scan_time') and 
            current_time - self.last_scan_time < self.card_cooldown):
            return
        
        self.last_card_id = card_id
        self.last_scan_time = current_time
        
        logger.info(f"Processing RFID card: {card_id}")
        
        # Try to send to API
        if self.send_to_api(card_id):
            logger.info(f"Card {card_id} processed successfully")
        else:
            # Store offline if API is unavailable
            logger.warning(f"API unavailable, storing card {card_id} offline")
            self.store_offline(card_id)

    def sync_offline_scans(self):
        """
        Sync offline stored scans to API.
        """
        offline_file = '/var/log/edurfid/offline_scans.log'
        if not os.path.exists(offline_file):
            return
        
        try:
            with open(offline_file, 'r') as f:
                lines = f.readlines()
            
            synced_count = 0
            failed_count = 0
            
            for line in lines:
                try:
                    timestamp, card_id = line.strip().split(',', 1)
                    if self.send_to_api(card_id):
                        synced_count += 1
                    else:
                        failed_count += 1
                except ValueError:
                    continue
            
            # Remove synced scans from file
            if synced_count > 0:
                with open(offline_file, 'w') as f:
                    for line in lines[synced_count:]:
                        f.write(line)
                
                logger.info(f"Synced {synced_count} offline scans to API")
            
            if failed_count > 0:
                logger.warning(f"Failed to sync {failed_count} offline scans")
                
        except Exception as e:
            logger.error(f"Error syncing offline scans: {e}")

    def start_listening(self):
        """Start listening for RFID cards."""
        if not self.connect():
            logger.error("Failed to connect to serial port")
            return
        
        self.is_running = True
        logger.info("Started RFID card listening")
        
        try:
            while self.is_running:
                # Try to sync offline scans periodically
                if hasattr(self, 'last_sync_time'):
                    if time.time() - self.last_sync_time > 60:  # Sync every minute
                        self.sync_offline_scans()
                        self.last_sync_time = time.time()
                else:
                    self.last_sync_time = time.time()
                
                # Read card ID
                card_id = self.read_card_id()
                if card_id:
                    self.process_card(card_id)
                
                time.sleep(0.1)  # Small delay to prevent excessive CPU usage
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, stopping...")
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
        finally:
            self.stop_listening()

    def stop_listening(self):
        """Stop listening for RFID cards."""
        self.is_running = False
        self.disconnect()
        logger.info("Stopped RFID card listening")

    def get_status(self) -> Dict[str, Any]:
        """
        Get listener status.
        
        Returns:
            dict: Status information
        """
        return {
            'is_running': self.is_running,
            'port': self.port,
            'baudrate': self.baudrate,
            'api_url': self.api_url,
            'is_connected': self.serial_connection.is_open if self.serial_connection else False,
            'last_card_id': self.last_card_id
        }


def main():
    """Main function."""
    # Configuration
    SERIAL_PORT = os.environ.get('SERIAL_PORT', '/dev/ttyUSB0')
    API_URL = os.environ.get('API_URL', 'http://localhost:8000/api/attendance/record/')
    
    # Create and start listener
    listener = SerialListener(port=SERIAL_PORT, api_url=API_URL)
    
    try:
        listener.start_listening()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
