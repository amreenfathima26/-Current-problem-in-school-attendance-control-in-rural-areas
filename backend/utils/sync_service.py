"""
Offline sync service for EDURFID system.
"""
import sqlite3
import requests
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.utils import timezone as django_timezone

logger = logging.getLogger(__name__)


class OfflineSyncService:
    """Service for handling offline data synchronization."""
    
    def __init__(self, offline_db_path: str = None):
        """
        Initialize offline sync service.
        
        Args:
            offline_db_path: Path to offline SQLite database
        """
        self.offline_db_path = offline_db_path or str(settings.OFFLINE_DB_PATH)
        self.api_base_url = getattr(settings, 'API_BASE_URL', 'http://localhost:8000/api')
        self.init_offline_database()

    def init_offline_database(self):
        """Initialize offline SQLite database with required tables."""
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                cursor = conn.cursor()
                
                # Create attendance_records table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS attendance_records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER,
                        date TEXT,
                        timestamp TEXT,
                        status TEXT,
                        notes TEXT,
                        recorded_by_id INTEGER,
                        is_offline_record INTEGER DEFAULT 1,
                        synced_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create rfid_scans table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS rfid_scans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        card_id TEXT,
                        student_id INTEGER,
                        scan_timestamp TEXT,
                        is_processed INTEGER DEFAULT 0,
                        processed_at TEXT,
                        error_message TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create sync_log table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sync_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sync_type TEXT,
                        records_count INTEGER,
                        status TEXT,
                        error_message TEXT,
                        sync_timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                conn.commit()
                logger.info("Offline database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize offline database: {e}")

    def store_attendance_record(self, student_id: int, date: str, status: str, 
                              notes: str = "", recorded_by_id: int = None) -> bool:
        """
        Store attendance record in offline database.
        
        Args:
            student_id: Student ID
            date: Attendance date
            status: Attendance status
            notes: Additional notes
            recorded_by_id: ID of user who recorded attendance
            
        Returns:
            bool: True if stored successfully, False otherwise
        """
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO attendance_records 
                    (student_id, date, timestamp, status, notes, recorded_by_id, is_offline_record)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                ''', (student_id, date, datetime.now().isoformat(), status, notes, recorded_by_id))
                conn.commit()
                logger.info(f"Stored attendance record offline: Student {student_id}, Date {date}")
                return True
        except Exception as e:
            logger.error(f"Failed to store attendance record offline: {e}")
            return False

    def store_rfid_scan(self, card_id: str, student_id: int = None, 
                       error_message: str = "") -> bool:
        """
        Store RFID scan in offline database.
        
        Args:
            card_id: RFID card ID
            student_id: Student ID (if found)
            error_message: Error message if scan failed
            
        Returns:
            bool: True if stored successfully, False otherwise
        """
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO rfid_scans 
                    (card_id, student_id, scan_timestamp, error_message)
                    VALUES (?, ?, ?, ?)
                ''', (card_id, student_id, datetime.now().isoformat(), error_message))
                conn.commit()
                logger.info(f"Stored RFID scan offline: Card {card_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to store RFID scan offline: {e}")
            return False

    def get_unsynced_attendance_records(self) -> List[Dict[str, Any]]:
        """
        Get unsynced attendance records from offline database.
        
        Returns:
            List of unsynced attendance records
        """
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM attendance_records 
                    WHERE synced_at IS NULL
                    ORDER BY created_at ASC
                ''')
                records = [dict(row) for row in cursor.fetchall()]
                return records
        except Exception as e:
            logger.error(f"Failed to get unsynced attendance records: {e}")
            return []

    def get_unsynced_rfid_scans(self) -> List[Dict[str, Any]]:
        """
        Get unsynced RFID scans from offline database.
        
        Returns:
            List of unsynced RFID scans
        """
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM rfid_scans 
                    WHERE is_processed = 0
                    ORDER BY created_at ASC
                ''')
                scans = [dict(row) for row in cursor.fetchall()]
                return scans
        except Exception as e:
            logger.error(f"Failed to get unsynced RFID scans: {e}")
            return []

    def sync_attendance_records(self) -> Dict[str, Any]:
        """
        Sync attendance records to online server.
        
        Returns:
            Dictionary with sync results
        """
        records = self.get_unsynced_attendance_records()
        if not records:
            return {'status': 'success', 'message': 'No records to sync', 'count': 0}

        synced_count = 0
        failed_count = 0
        errors = []

        for record in records:
            try:
                # Prepare data for API
                data = {
                    'student': record['student_id'],
                    'date': record['date'],
                    'status': record['status'],
                    'notes': record['notes'],
                    'is_offline_record': True
                }

                # Send to API
                response = requests.post(
                    f"{self.api_base_url}/attendance/records/",
                    json=data,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )

                if response.status_code in [200, 201]:
                    # Mark as synced
                    self.mark_attendance_record_synced(record['id'])
                    synced_count += 1
                else:
                    failed_count += 1
                    errors.append(f"Record {record['id']}: {response.text}")

            except Exception as e:
                failed_count += 1
                errors.append(f"Record {record['id']}: {str(e)}")

        # Log sync results
        self.log_sync('attendance_records', synced_count + failed_count, 
                     'success' if failed_count == 0 else 'partial', 
                     '; '.join(errors) if errors else None)

        return {
            'status': 'success' if failed_count == 0 else 'partial',
            'synced_count': synced_count,
            'failed_count': failed_count,
            'errors': errors
        }

    def sync_rfid_scans(self) -> Dict[str, Any]:
        """
        Sync RFID scans to online server.
        
        Returns:
            Dictionary with sync results
        """
        scans = self.get_unsynced_rfid_scans()
        if not scans:
            return {'status': 'success', 'message': 'No scans to sync', 'count': 0}

        synced_count = 0
        failed_count = 0
        errors = []

        for scan in scans:
            try:
                # Send to API
                data = {'card_id': scan['card_id']}
                response = requests.post(
                    f"{self.api_base_url}/attendance/record/",
                    json=data,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )

                if response.status_code in [200, 201]:
                    # Mark as processed
                    self.mark_rfid_scan_processed(scan['id'])
                    synced_count += 1
                else:
                    failed_count += 1
                    errors.append(f"Scan {scan['id']}: {response.text}")

            except Exception as e:
                failed_count += 1
                errors.append(f"Scan {scan['id']}: {str(e)}")

        # Log sync results
        self.log_sync('rfid_scans', synced_count + failed_count, 
                     'success' if failed_count == 0 else 'partial', 
                     '; '.join(errors) if errors else None)

        return {
            'status': 'success' if failed_count == 0 else 'partial',
            'synced_count': synced_count,
            'failed_count': failed_count,
            'errors': errors
        }

    def mark_attendance_record_synced(self, record_id: int):
        """Mark attendance record as synced."""
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE attendance_records 
                    SET synced_at = ?, is_offline_record = 0
                    WHERE id = ?
                ''', (datetime.now().isoformat(), record_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to mark attendance record as synced: {e}")

    def mark_rfid_scan_processed(self, scan_id: int):
        """Mark RFID scan as processed."""
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE rfid_scans 
                    SET is_processed = 1, processed_at = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), scan_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to mark RFID scan as processed: {e}")

    def log_sync(self, sync_type: str, records_count: int, status: str, error_message: str = None):
        """Log sync operation."""
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO sync_log (sync_type, records_count, status, error_message)
                    VALUES (?, ?, ?, ?)
                ''', (sync_type, records_count, status, error_message))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to log sync operation: {e}")

    def get_sync_status(self) -> Dict[str, Any]:
        """
        Get sync status information.
        
        Returns:
            Dictionary with sync status
        """
        try:
            with sqlite3.connect(self.offline_db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Count unsynced records
                cursor.execute('SELECT COUNT(*) FROM attendance_records WHERE synced_at IS NULL')
                unsynced_attendance = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM rfid_scans WHERE is_processed = 0')
                unsynced_scans = cursor.fetchone()[0]
                
                # Get last sync info
                cursor.execute('''
                    SELECT * FROM sync_log 
                    ORDER BY sync_timestamp DESC 
                    LIMIT 1
                ''')
                last_sync = dict(cursor.fetchone()) if cursor.fetchone() else None
                
                return {
                    'unsynced_attendance_records': unsynced_attendance,
                    'unsynced_rfid_scans': unsynced_scans,
                    'last_sync': last_sync,
                    'offline_db_path': self.offline_db_path
                }
        except Exception as e:
            logger.error(f"Failed to get sync status: {e}")
            return {}

    def full_sync(self) -> Dict[str, Any]:
        """
        Perform full synchronization of all offline data.
        
        Returns:
            Dictionary with sync results
        """
        logger.info("Starting full sync")
        
        attendance_result = self.sync_attendance_records()
        rfid_result = self.sync_rfid_scans()
        
        total_synced = attendance_result.get('synced_count', 0) + rfid_result.get('synced_count', 0)
        total_failed = attendance_result.get('failed_count', 0) + rfid_result.get('failed_count', 0)
        
        result = {
            'status': 'success' if total_failed == 0 else 'partial',
            'total_synced': total_synced,
            'total_failed': total_failed,
            'attendance_sync': attendance_result,
            'rfid_sync': rfid_result
        }
        
        logger.info(f"Full sync completed: {result}")
        return result


# Example usage
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Create sync service
    sync_service = OfflineSyncService()
    
    # Test sync
    result = sync_service.full_sync()
    print(f"Sync result: {result}")
    
    # Get status
    status = sync_service.get_sync_status()
    print(f"Sync status: {status}")
