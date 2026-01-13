"""
RFID Reader utility for EDURFID system.
"""
import serial
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class RFIDReader:
    """RFID Reader class for handling serial communication with Arduino."""
    
    def __init__(self, port: str = '/dev/ttyUSB0', baudrate: int = 9600, timeout: int = 1):
        """
        Initialize RFID Reader.
        
        Args:
            port: Serial port (e.g., '/dev/ttyUSB0' for Linux, 'COM3' for Windows)
            baudrate: Baud rate for serial communication
            timeout: Timeout for serial read operations
        """
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.connection = None
        self.is_connected = False

    def connect(self) -> bool:
        """
        Connect to the RFID reader via serial port.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            self.is_connected = True
            logger.info(f"Connected to RFID reader on port {self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to RFID reader: {e}")
            self.is_connected = False
            return False

    def disconnect(self):
        """Disconnect from the RFID reader."""
        if self.connection and self.is_connected:
            self.connection.close()
            self.is_connected = False
            logger.info("Disconnected from RFID reader")

    def read_card(self) -> Optional[str]:
        """
        Read RFID card ID from the reader.
        
        Returns:
            str: Card ID if successful, None otherwise
        """
        if not self.is_connected or not self.connection:
            logger.warning("RFID reader not connected")
            return None

        try:
            # Read data from serial port
            if self.connection.in_waiting > 0:
                data = self.connection.readline().decode('utf-8').strip()
                if data and data.startswith('CARD:'):
                    card_id = data.replace('CARD:', '').strip()
                    logger.info(f"RFID card read: {card_id}")
                    return card_id
            return None
        except Exception as e:
            logger.error(f"Error reading RFID card: {e}")
            return None

    def send_command(self, command: str) -> bool:
        """
        Send command to the RFID reader.
        
        Args:
            command: Command to send
            
        Returns:
            bool: True if command sent successfully, False otherwise
        """
        if not self.is_connected or not self.connection:
            logger.warning("RFID reader not connected")
            return False

        try:
            self.connection.write(f"{command}\n".encode('utf-8'))
            logger.info(f"Command sent to RFID reader: {command}")
            return True
        except Exception as e:
            logger.error(f"Error sending command to RFID reader: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """
        Get RFID reader status.
        
        Returns:
            dict: Status information
        """
        return {
            'is_connected': self.is_connected,
            'port': self.port,
            'baudrate': self.baudrate,
            'timeout': self.timeout,
            'has_data': self.connection.in_waiting > 0 if self.connection else False
        }


class RFIDMonitor:
    """RFID Monitor for continuous card reading."""
    
    def __init__(self, reader: RFIDReader, callback_func=None):
        """
        Initialize RFID Monitor.
        
        Args:
            reader: RFIDReader instance
            callback_func: Callback function to handle card reads
        """
        self.reader = reader
        self.callback_func = callback_func
        self.is_monitoring = False
        self.last_card_id = None

    def start_monitoring(self):
        """Start monitoring for RFID cards."""
        if not self.reader.connect():
            logger.error("Failed to connect RFID reader for monitoring")
            return False

        self.is_monitoring = True
        logger.info("Started RFID monitoring")

        try:
            while self.is_monitoring:
                card_id = self.reader.read_card()
                if card_id and card_id != self.last_card_id:
                    self.last_card_id = card_id
                    if self.callback_func:
                        self.callback_func(card_id)
                time.sleep(0.1)  # Small delay to prevent excessive CPU usage
        except KeyboardInterrupt:
            logger.info("RFID monitoring stopped by user")
        except Exception as e:
            logger.error(f"Error during RFID monitoring: {e}")
        finally:
            self.stop_monitoring()

    def stop_monitoring(self):
        """Stop monitoring for RFID cards."""
        self.is_monitoring = False
        self.reader.disconnect()
        logger.info("Stopped RFID monitoring")

    def set_callback(self, callback_func):
        """
        Set callback function for card reads.
        
        Args:
            callback_func: Function to call when a card is read
        """
        self.callback_func = callback_func


# Example usage and testing
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Create RFID reader instance
    reader = RFIDReader(port='/dev/ttyUSB0')  # Adjust port as needed
    
    # Test connection
    if reader.connect():
        print("RFID Reader connected successfully")
        
        # Test reading cards
        for i in range(5):
            card_id = reader.read_card()
            if card_id:
                print(f"Card read: {card_id}")
            time.sleep(1)
        
        reader.disconnect()
    else:
        print("Failed to connect to RFID reader")
