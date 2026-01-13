-- EDURFID Initial Data
-- Sample data for development and testing

USE edurfid;

-- Insert sample school
INSERT INTO schools (name, location, connectivity_status, created_at, updated_at) VALUES
('Colegio San José', 'Puno, Peru', TRUE, NOW(), NOW()),
('Escuela Rural San Pedro', 'Rural Puno, Peru', FALSE, NOW(), NOW());

-- Insert sample users (passwords are hashed with Django's default hasher)
-- Password for all demo users is 'demo123'
INSERT INTO users (username, email, first_name, last_name, password, is_active, is_staff, is_superuser, role, school_id, phone_number, date_joined, is_offline_sync_enabled) VALUES
-- Admin user
('admin', 'admin@edurfid.com', 'Admin', 'User', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, TRUE, TRUE, 'admin', 1, '+51987654321', NOW(), TRUE),

-- Teachers
('teacher1', 'teacher1@edurfid.com', 'Maria', 'Garcia', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'teacher', 1, '+51987654322', NOW(), TRUE),
('teacher2', 'teacher2@edurfid.com', 'Carlos', 'Lopez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'teacher', 1, '+51987654323', NOW(), TRUE),

-- Auxiliary staff
('aux1', 'aux1@edurfid.com', 'Ana', 'Rodriguez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'auxiliary', 1, '+51987654324', NOW(), TRUE),

-- Students
('student1', 'student1@edurfid.com', 'Juan', 'Perez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654325', NOW(), TRUE),
('student2', 'student2@edurfid.com', 'Maria', 'Santos', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654326', NOW(), TRUE),
('student3', 'student3@edurfid.com', 'Pedro', 'Gonzalez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654327', NOW(), TRUE),
('student4', 'student4@edurfid.com', 'Lucia', 'Martinez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654328', NOW(), TRUE),
('student5', 'student5@edurfid.com', 'Diego', 'Hernandez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654329', NOW(), TRUE);

-- Insert sample students
INSERT INTO students (user_id, student_id, grade, parent_contact, parent_email, date_of_birth, address, enrollment_date) VALUES
(5, 'STU001', '10', '+51987654330', 'parent1@email.com', '2008-03-15', 'Av. Lima 123, Puno', '2023-01-15'),
(6, 'STU002', '10', '+51987654331', 'parent2@email.com', '2008-07-22', 'Jr. Arequipa 456, Puno', '2023-01-15'),
(7, 'STU003', '11', '+51987654332', 'parent3@email.com', '2007-11-08', 'Av. Titicaca 789, Puno', '2023-01-15'),
(8, 'STU004', '11', '+51987654333', 'parent4@email.com', '2007-05-14', 'Jr. Cusco 321, Puno', '2023-01-15'),
(9, 'STU005', '9', '+51987654334', 'parent5@email.com', '2009-01-30', 'Av. Moquegua 654, Puno', '2023-01-15');

-- Insert sample RFID cards
INSERT INTO rfid_cards (card_id, student_id, status, issued_date) VALUES
('RFID001', 1, 'active', '2023-01-15 08:00:00'),
('RFID002', 2, 'active', '2023-01-15 08:00:00'),
('RFID003', 3, 'active', '2023-01-15 08:00:00'),
('RFID004', 4, 'active', '2023-01-15 08:00:00'),
('RFID005', 5, 'active', '2023-01-15 08:00:00');

-- Insert sample attendance records for the past week
INSERT INTO attendance_records (student_id, date, timestamp, status, recorded_by_id) VALUES
-- Today's attendance
(1, CURDATE(), NOW(), 'present', 1),
(2, CURDATE(), NOW(), 'present', 1),
(3, CURDATE(), NOW(), 'late', 1),
(4, CURDATE(), NOW(), 'present', 1),
(5, CURDATE(), NOW(), 'absent', 1),

-- Yesterday's attendance
(1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'present', 2),
(2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'present', 2),
(3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'present', 2),
(4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'excused', 2),
(5, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'present', 2),

-- Day before yesterday
(1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'present', 2),
(2, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'present', 2),
(3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'present', 2),
(4, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'present', 2),
(5, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'late', 2),

-- 3 days ago
(1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'present', 2),
(2, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'absent', 2),
(3, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'present', 2),
(4, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'present', 2),
(5, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'present', 2),

-- 4 days ago
(1, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 'present', 2),
(2, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 'present', 2),
(3, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 'present', 2),
(4, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 'present', 2),
(5, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 'present', 2);

-- Insert sample attendance alerts
INSERT INTO attendance_alerts (student_id, alert_type, message, is_sent, created_at) VALUES
(5, 'absence', 'Student Diego Hernandez has been absent for 1 consecutive day.', FALSE, NOW()),
(2, 'pattern', 'Student Maria Santos has been absent 2 times in the last 5 days.', FALSE, DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- Insert sample RFID scans
INSERT INTO rfid_scans (card_id, student_id, scan_timestamp, is_processed, processed_at) VALUES
('RFID001', 1, NOW(), TRUE, NOW()),
('RFID002', 2, NOW(), TRUE, NOW()),
('RFID003', 3, DATE_SUB(NOW(), INTERVAL 30 MINUTE), TRUE, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('RFID004', 4, DATE_SUB(NOW(), INTERVAL 1 HOUR), TRUE, DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- Update attendance summaries for the past week
CALL UpdateDailyAttendanceSummary(CURDATE());
CALL UpdateDailyAttendanceSummary(DATE_SUB(CURDATE(), INTERVAL 1 DAY));
CALL UpdateDailyAttendanceSummary(DATE_SUB(CURDATE(), INTERVAL 2 DAY));
CALL UpdateDailyAttendanceSummary(DATE_SUB(CURDATE(), INTERVAL 3 DAY));
CALL UpdateDailyAttendanceSummary(DATE_SUB(CURDATE(), INTERVAL 4 DAY));
CALL UpdateDailyAttendanceSummary(DATE_SUB(CURDATE(), INTERVAL 5 DAY));
CALL UpdateDailyAttendanceSummary(DATE_SUB(CURDATE(), INTERVAL 6 DAY));

-- Update RFID card last used timestamps
UPDATE rfid_cards SET last_used = NOW() WHERE card_id IN ('RFID001', 'RFID002', 'RFID003', 'RFID004');

-- Create some additional sample data for testing
-- Add more students for different grades
INSERT INTO users (username, email, first_name, last_name, password, is_active, is_staff, is_superuser, role, school_id, phone_number, date_joined, is_offline_sync_enabled) VALUES
('student6', 'student6@edurfid.com', 'Sofia', 'Ramirez', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654335', NOW(), TRUE),
('student7', 'student7@edurfid.com', 'Miguel', 'Torres', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654336', NOW(), TRUE),
('student8', 'student8@edurfid.com', 'Camila', 'Vargas', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654337', NOW(), TRUE),
('student9', 'student9@edurfid.com', 'Alejandro', 'Mendoza', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654338', NOW(), TRUE),
('student10', 'student10@edurfid.com', 'Valentina', 'Castro', 'pbkdf2_sha256$260000$demo123$demo123', TRUE, FALSE, FALSE, 'student', 1, '+51987654339', NOW(), TRUE);

INSERT INTO students (user_id, student_id, grade, parent_contact, parent_email, date_of_birth, address, enrollment_date) VALUES
(10, 'STU006', '8', '+51987654340', 'parent6@email.com', '2010-04-12', 'Av. Tacna 987, Puno', '2023-01-15'),
(11, 'STU007', '8', '+51987654341', 'parent7@email.com', '2010-08-25', 'Jr. Piura 654, Puno', '2023-01-15'),
(12, 'STU008', '12', '+51987654342', 'parent8@email.com', '2006-12-03', 'Av. Ayacucho 321, Puno', '2023-01-15'),
(13, 'STU009', '12', '+51987654343', 'parent9@email.com', '2006-06-18', 'Jr. Ica 789, Puno', '2023-01-15'),
(14, 'STU010', '7', '+51987654344', 'parent10@email.com', '2011-02-28', 'Av. Lambayeque 147, Puno', '2023-01-15');

INSERT INTO rfid_cards (card_id, student_id, status, issued_date) VALUES
('RFID006', 6, 'active', '2023-01-15 08:00:00'),
('RFID007', 7, 'active', '2023-01-15 08:00:00'),
('RFID008', 8, 'active', '2023-01-15 08:00:00'),
('RFID009', 9, 'active', '2023-01-15 08:00:00'),
('RFID010', 10, 'active', '2023-01-15 08:00:00');

-- Add more attendance records for the new students
INSERT INTO attendance_records (student_id, date, timestamp, status, recorded_by_id) VALUES
-- Today's attendance for new students
(6, CURDATE(), NOW(), 'present', 1),
(7, CURDATE(), NOW(), 'present', 1),
(8, CURDATE(), NOW(), 'present', 1),
(9, CURDATE(), NOW(), 'late', 1),
(10, CURDATE(), NOW(), 'present', 1);

-- Show summary of inserted data
SELECT 'Schools' as table_name, COUNT(*) as count FROM schools
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'RFID Cards', COUNT(*) FROM rfid_cards
UNION ALL
SELECT 'Attendance Records', COUNT(*) FROM attendance_records
UNION ALL
SELECT 'Attendance Summaries', COUNT(*) FROM attendance_summaries
UNION ALL
SELECT 'Attendance Alerts', COUNT(*) FROM attendance_alerts
UNION ALL
SELECT 'RFID Scans', COUNT(*) FROM rfid_scans;
