# Automated Attendance System for Rural Schools - System Design

## Overview
This is a Smart India Hackathon (SIH) project - an **Automated Attendance System for Rural Schools** in India. The system uses **Face Recognition as the primary method** and RFID as a backup option, combined with AI auto-training, IoT devices, and a web-based dashboard to automate student attendance tracking, ensuring real-time accuracy and reporting even in low-connectivity conditions.

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RFID Cards    │    │   Arduino UNO   │    │ Raspberry Pi    │
│   (Students)    │────│   + RC522       │────│   Serial        │
└─────────────────┘    │   Module        │    │   Listener      │
                       └─────────────────┘    └─────────────────┘
                                               │
                                               ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web     │────│   Django REST   │────│   MySQL/SQLite  │
│   Dashboard     │    │   API Server    │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │   Offline Sync  │
                       │   Service       │
                       └─────────────────┘
```

### Technology Stack

#### Backend
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: MySQL (production), SQLite (development)
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful API with automatic documentation
- **Offline Sync**: Custom sync service with local SQLite cache

#### Frontend
- **Framework**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Notifications**: React Hot Toast

#### Hardware
- **RFID Reader**: Arduino UNO R3 + RC522 RFID module
- **Gateway**: Raspberry Pi 5 running Python serial listener
- **Communication**: Serial communication (USB) between Arduino and Pi

#### Infrastructure
- **Hosting**: DigitalOcean VPS
- **Domain**: colegiospuno.com
- **SSL**: HTTPS with Let's Encrypt
- **Connectivity**: Starlink Mini for satellite internet

## Core Components

### 1. RFID Hardware Layer
- **Arduino UNO R3**: Reads RFID cards using RC522 module
- **RC522 Module**: 13.56MHz RFID reader/writer
- **RFID Cards**: ISO 14443 Type A cards for students
- **Serial Communication**: Sends card UID to Raspberry Pi

### 2. Gateway Layer (Raspberry Pi)
- **Serial Listener**: Python script listening to Arduino serial output
- **API Client**: Sends attendance data to Django backend
- **Offline Cache**: Stores data locally when internet is unavailable
- **Auto Sync**: Automatically syncs cached data when connection restored

### 3. Backend API Layer
- **Django REST API**: Handles all business logic and data processing
- **Authentication**: JWT-based authentication with role-based access control
- **Models**: Student, User, RFIDCard, AttendanceRecord, School
- **Serializers**: Data validation and transformation
- **Views**: API endpoints for all system operations
- **Admin Interface**: Django admin for system management

### 4. Frontend Dashboard
- **React Application**: Single-page application with responsive design
- **Dashboard**: Real-time attendance overview and statistics
- **Student Management**: CRUD operations for students and RFID cards
- **Reports**: Generate and export attendance reports in PDF/Excel
- **Offline Indicators**: Visual indicators for offline/online status

### 5. Database Layer
- **Primary Database**: MySQL for production with full ACID compliance
- **Development Database**: SQLite for local development
- **Offline Cache**: Local SQLite database for offline operations
- **Data Sync**: Automatic synchronization between offline and online databases

## Data Flow

### Normal Operation (Online)
1. Student scans RFID card at entrance
2. Arduino reads card UID and sends via serial to Raspberry Pi
3. Raspberry Pi receives UID and calls Django API
4. Django validates student and creates attendance record
5. Database is updated with attendance information
6. Real-time updates sent to web dashboard
7. Notifications sent if needed (absence alerts)

### Offline Operation
1. Student scans RFID card at entrance
2. Arduino reads card UID and sends via serial to Raspberry Pi
3. Raspberry Pi detects no internet connection
4. Data is stored in local SQLite cache
5. System continues to function with cached data
6. When internet is restored, cached data is automatically synced
7. All pending records are uploaded to main database

## Security Considerations

### Authentication & Authorization
- JWT tokens for stateless authentication
- Role-based access control (Admin, Teacher, Student, Auxiliary)
- Token refresh mechanism for security
- CSRF protection for web forms

### Data Security
- HTTPS encryption for all communications
- Password hashing using Django's PBKDF2
- Input validation and sanitization
- SQL injection prevention through ORM

### Physical Security
- RFID cards are read-only for students
- Secure card issuance and deactivation process
- Audit trail for all attendance changes
- Encrypted communication between hardware components

## Performance Considerations

### Scalability
- Database indexing for fast queries
- API pagination for large datasets
- Caching strategies for frequently accessed data
- Horizontal scaling capability with load balancers

### Offline Capability
- Local SQLite cache for offline operations
- Automatic sync when connection restored
- Conflict resolution for concurrent updates
- Data integrity checks during sync

### Real-time Updates
- WebSocket connections for real-time dashboard updates
- Efficient polling for hardware status
- Optimized database queries with proper indexing
- Background tasks for heavy operations

## Deployment Architecture

### Production Environment
```
Internet
    │
    ▼
┌─────────────────┐
│   Load Balancer │ (Nginx)
└─────────────────┘
    │
    ▼
┌─────────────────┐    ┌─────────────────┐
│   Django API    │────│   MySQL DB      │
│   Server        │    │   (Primary)     │
└─────────────────┘    └─────────────────┘
    │
    ▼
┌─────────────────┐
│   React App     │
│   (Static)      │
└─────────────────┘
```

### Hardware Deployment
- **School Setup**: Arduino + Raspberry Pi at school entrance
- **Network**: Starlink Mini for internet connectivity
- **Power**: Uninterruptible power supply (UPS) for reliability
- **Backup**: Local data backup on Raspberry Pi SD card

## Monitoring & Maintenance

### System Monitoring
- Hardware status monitoring (Arduino, Raspberry Pi)
- Database performance monitoring
- API response time tracking
- Error logging and alerting

### Maintenance Procedures
- Regular database backups
- Hardware maintenance schedules
- Software updates and security patches
- Performance optimization reviews

## Future Enhancements

### Phase 2 Features
- Parent notification system via SMS/Email
- Advanced analytics and reporting
- Mobile app for teachers and parents
- Integration with school management systems

### Phase 3 Features
- Facial recognition as backup to RFID
- IoT sensors for environmental monitoring
- Advanced machine learning for attendance patterns
- Multi-school management capabilities

## Conclusion
EDURFID provides a comprehensive solution for automated attendance management in rural schools, with particular emphasis on offline capability and ease of use. The modular architecture allows for easy maintenance and future enhancements while ensuring reliable operation in challenging connectivity environments.
