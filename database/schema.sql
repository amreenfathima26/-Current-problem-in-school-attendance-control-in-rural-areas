-- EDURFID Database Schema
-- MySQL Database Schema for Smart Attendance Management System

-- Create database
CREATE DATABASE IF NOT EXISTS edurfid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edurfid;

-- Schools table
CREATE TABLE schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(300) NOT NULL,
    connectivity_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table (extends Django's auth_user)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254),
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    password VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_staff BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,
    date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    role ENUM('admin', 'teacher', 'auxiliary', 'student') DEFAULT 'student',
    school_id INT,
    phone_number VARCHAR(20),
    is_offline_sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP NULL,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
    INDEX idx_users_username (username),
    INDEX idx_users_role (role),
    INDEX idx_users_school (school_id)
);

-- Students table
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    grade ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12') NOT NULL,
    parent_contact VARCHAR(20),
    parent_email VARCHAR(254),
    date_of_birth DATE,
    address TEXT,
    enrollment_date DATE DEFAULT (CURRENT_DATE),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_students_student_id (student_id),
    INDEX idx_students_grade (grade),
    INDEX idx_students_user (user_id)
);

-- RFID Cards table
CREATE TABLE rfid_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(50) UNIQUE NOT NULL,
    student_id INT NOT NULL,
    status ENUM('active', 'inactive', 'lost', 'damaged') DEFAULT 'active',
    issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_rfid_cards_card_id (card_id),
    INDEX idx_rfid_cards_student (student_id),
    INDEX idx_rfid_cards_status (status)
);

-- Attendance Records table
CREATE TABLE attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
    notes TEXT,
    recorded_by_id INT,
    is_offline_record BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_date (student_id, date),
    INDEX idx_attendance_student (student_id),
    INDEX idx_attendance_date (date),
    INDEX idx_attendance_status (status),
    INDEX idx_attendance_recorded_by (recorded_by_id)
);

-- Attendance Summaries table
CREATE TABLE attendance_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_students INT DEFAULT 0,
    present_count INT DEFAULT 0,
    absent_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    excused_count INT DEFAULT 0,
    attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_summaries_date (date)
);

-- Attendance Alerts table
CREATE TABLE attendance_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    alert_type ENUM('absence', 'pattern', 'threshold') NOT NULL,
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_alerts_student (student_id),
    INDEX idx_alerts_type (alert_type),
    INDEX idx_alerts_created (created_at)
);

-- RFID Scans table
CREATE TABLE rfid_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(50) NOT NULL,
    student_id INT,
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    error_message TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
    INDEX idx_scans_card_id (card_id),
    INDEX idx_scans_student (student_id),
    INDEX idx_scans_timestamp (scan_timestamp),
    INDEX idx_scans_processed (is_processed)
);

-- Django session table (for Django sessions)
CREATE TABLE django_session (
    session_key VARCHAR(40) NOT NULL PRIMARY KEY,
    session_data LONGTEXT NOT NULL,
    expire_date DATETIME(6) NOT NULL,
    INDEX django_session_expire_date_idx (expire_date)
);

-- Django migrations table
CREATE TABLE django_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6)
);

-- Create views for easier querying

-- View for student attendance summary
CREATE VIEW student_attendance_summary AS
SELECT 
    s.id as student_id,
    s.student_id as student_number,
    CONCAT(u.first_name, ' ', u.last_name) as student_name,
    s.grade,
    COUNT(ar.id) as total_days,
    SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_days,
    SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
    SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_days,
    SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused_days,
    ROUND(
        (SUM(CASE WHEN ar.status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) / COUNT(ar.id)) * 100, 
        2
    ) as attendance_percentage
FROM students s
JOIN users u ON s.user_id = u.id
LEFT JOIN attendance_records ar ON s.id = ar.student_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.student_id, student_name, s.grade;

-- View for daily attendance overview
CREATE VIEW daily_attendance_overview AS
SELECT 
    ar.date,
    COUNT(DISTINCT ar.student_id) as students_with_records,
    SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
    COUNT(DISTINCT s.id) as total_students,
    ROUND(
        (SUM(CASE WHEN ar.status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) / COUNT(DISTINCT s.id)) * 100, 
        2
    ) as attendance_percentage
FROM attendance_records ar
JOIN students s ON ar.student_id = s.id
WHERE s.is_active = TRUE
GROUP BY ar.date
ORDER BY ar.date DESC;

-- Create stored procedures

-- Procedure to update daily attendance summary
DELIMITER //
CREATE PROCEDURE UpdateDailyAttendanceSummary(IN target_date DATE)
BEGIN
    DECLARE total_students INT;
    DECLARE present_count INT;
    DECLARE absent_count INT;
    DECLARE late_count INT;
    DECLARE excused_count INT;
    DECLARE attendance_percentage DECIMAL(5,2);
    
    -- Get counts
    SELECT COUNT(*) INTO total_students FROM students WHERE is_active = TRUE;
    
    SELECT 
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END)
    INTO present_count, absent_count, late_count, excused_count
    FROM attendance_records 
    WHERE date = target_date;
    
    -- Calculate percentage
    IF total_students > 0 THEN
        SET attendance_percentage = ((present_count + late_count + excused_count) / total_students) * 100;
    ELSE
        SET attendance_percentage = 0;
    END IF;
    
    -- Insert or update summary
    INSERT INTO attendance_summaries (
        date, total_students, present_count, absent_count, 
        late_count, excused_count, attendance_percentage
    ) VALUES (
        target_date, total_students, present_count, absent_count,
        late_count, excused_count, attendance_percentage
    ) ON DUPLICATE KEY UPDATE
        total_students = VALUES(total_students),
        present_count = VALUES(present_count),
        absent_count = VALUES(absent_count),
        late_count = VALUES(late_count),
        excused_count = VALUES(excused_count),
        attendance_percentage = VALUES(attendance_percentage),
        updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Create triggers

-- Trigger to update attendance summary when attendance record is inserted/updated
DELIMITER //
CREATE TRIGGER tr_attendance_record_after_insert
AFTER INSERT ON attendance_records
FOR EACH ROW
BEGIN
    CALL UpdateDailyAttendanceSummary(NEW.date);
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER tr_attendance_record_after_update
AFTER UPDATE ON attendance_records
FOR EACH ROW
BEGIN
    CALL UpdateDailyAttendanceSummary(NEW.date);
    IF OLD.date != NEW.date THEN
        CALL UpdateDailyAttendanceSummary(OLD.date);
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER tr_attendance_record_after_delete
AFTER DELETE ON attendance_records
FOR EACH ROW
BEGIN
    CALL UpdateDailyAttendanceSummary(OLD.date);
END //
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_attendance_records_date_status ON attendance_records(date, status);
CREATE INDEX idx_attendance_records_student_date ON attendance_records(student_id, date);
CREATE INDEX idx_rfid_scans_card_timestamp ON rfid_scans(card_id, scan_timestamp);
CREATE INDEX idx_attendance_alerts_student_type ON attendance_alerts(student_id, alert_type);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON edurfid.* TO 'edurfid_user'@'localhost' IDENTIFIED BY 'secure_password';
-- FLUSH PRIVILEGES;
