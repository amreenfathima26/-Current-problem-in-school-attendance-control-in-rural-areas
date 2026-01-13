# EDURFID - Smart Attendance Management System

![EDURFID Logo](https://via.placeholder.com/300x100/3b82f6/ffffff?text=EDURFID)

## Overview

EDURFID (Educational RFID) is a Smart Attendance Management System designed specifically for rural schools in Peru. The system uses RFID technology combined with IoT devices and a web-based dashboard to automate student attendance tracking, ensuring real-time accuracy and reporting even in low-connectivity conditions.

## 🎯 Key Features

- **Face Recognition Attendance** (Primary Method): Automated attendance using AI-based facial recognition technology
- **RFID-based Attendance** (Backup Method): Automatic attendance tracking using RFID cards
- **Auto-Training AI Model**: Machine learning model that automatically improves accuracy with new student data
- **Dataset Upload**: Upload ZIP files containing student face images for training
- **Offline Capability**: Works without internet connection with automatic sync
- **Real-time Dashboard**: Web-based interface for teachers and administrators
- **Multi-role Access**: Support for Admin, Teacher, Student, and Auxiliary roles
- **Report Generation**: PDF and Excel reports for attendance analysis (government-ready)
- **Parent Notifications**: Automatic alerts for student absences
- **Rural Connectivity**: Designed for low-bandwidth satellite internet (Starlink)
- **Low-Cost Deployment**: Works with basic cameras and low-end devices

## 🏗️ System Architecture

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
```

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: MySQL (production), SQLite (development)
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful API with automatic documentation

### Frontend
- **Framework**: React 18 with functional components and hooks
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Query for server state
- **Routing**: React Router v6

### Hardware
- **RFID Reader**: Arduino UNO R3 + RC522 RFID module
- **Gateway**: Raspberry Pi 5 running Python serial listener
- **Communication**: Serial communication (USB) between Arduino and Pi

### Infrastructure
- **Hosting**: DigitalOcean VPS
- **Domain**: colegiospuno.com
- **SSL**: HTTPS with Let's Encrypt
- **Connectivity**: Starlink Mini for satellite internet

## 🚀 Ultimate Setup & Migration
This project is designed for **1000% robust deployment**. Follow these steps for a clean setup or to move data to a new system.

### 📋 System Requirements
| Software | Version | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.10.x - 3.13.x | Backend API & AI Processing |
| **Node.js** | v20.x - v22.x | Frontend Development & Build |
| **NPM** | 10.x+ | Frontend Package Management |

---

### 📥 Option A: Fresh Setup (New System)
1.  **Run Setup**: Double-click **`setup_project.bat`** in the root directory.
2.  **Wait**: The script will automatically create the virtual environment, install all dependencies (Backend & Frontend), and initialize the database.
3.  **Run**: Once finished, double-click **`run_project.bat`**.

---

### 📤 Option B: Migration (Don't Lose Data!)
To move the project to a new computer **without losing student records or trained AI models**:

1.  **Copy Files**: Copy the entire project folder to the new system. **CRITICAL**: Ensure `backend/db.sqlite3` and the `backend/media/` folder are included.
2.  **Run Setup**: Double-click **`setup_project.bat`**.
3.  **Select Migration**: When prompted: `Is this a migration from another system? (Y/N)`, type **`Y`** and press Enter.
4.  **Result**: The script will install the software but **preserve** your existing database and AI models.

---

## 🛠️ Manual Installation (Advanced)

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- Arduino IDE
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/edurfid.git
cd edurfid
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp env.example .env

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend/react_app

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Database Setup

```bash
# Import schema and sample data
mysql -u root -p edurfid < database/schema.sql
mysql -u root -p edurfid < database/init_data.sql
```

### 5. Hardware Setup

1. **Arduino Setup**:
   - Upload `hardware/arduino_rfid/rfid_reader.ino` to Arduino UNO
   - Connect RC522 module as per the code comments

2. **Raspberry Pi Setup**:
   - Install Python dependencies: `pip install pyserial requests`
   - Run: `python hardware/raspberry_pi/serial_listener.py`

## 📱 Usage

### Demo Credentials

- **Admin**: `admin` / `demo123`
- **Teacher**: `teacher1` / `demo123`
- **Student**: `student1` / `demo123`

### Basic Workflow

1. **Student scans RFID card** at school entrance
2. **Arduino reads card** and sends UID to Raspberry Pi
3. **Raspberry Pi calls API** to record attendance
4. **Teachers view dashboard** for real-time attendance
5. **Reports generated** automatically for administrators

## 🔧 Configuration

### Environment Variables

Key configuration options in `backend/.env`:

```env
# Database
DATABASE_URL=mysql://username:password@localhost:3306/edurfid

# API Settings
API_BASE_URL=http://localhost:8000/api

# Hardware Settings
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUDRATE=9600

# Offline Sync
OFFLINE_SYNC_ENABLED=True
OFFLINE_DB_PATH=offline_db.sqlite3
```

### Hardware Configuration

- **Arduino Port**: Configure `SERIAL_PORT` in environment
- **RFID Module**: Ensure RC522 is properly connected
- **Network**: Configure for your school's internet setup

## 📊 API Documentation

The API documentation is available at:
- **Development**: http://localhost:8000/api/docs/
- **Production**: https://colegiospuno.com/api/docs/

### Key Endpoints

- `POST /api/attendance/record/` - Record attendance from RFID
- `GET /api/attendance/daily/` - Get daily attendance summary
- `GET /api/students/` - List students
- `POST /api/auth/login/` - User authentication

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Start production services
docker-compose --profile production up -d
```

## 📈 Monitoring & Maintenance

### System Health

- **Backend Health**: `GET /api/health/`
- **Database Status**: Check Django admin interface
- **Hardware Status**: Monitor Raspberry Pi logs

### Regular Maintenance

- **Database Backups**: Daily automated backups
- **Hardware Checks**: Weekly Arduino/Raspberry Pi status
- **Software Updates**: Monthly security updates
- **Performance Monitoring**: Quarterly performance reviews

## 🔒 Security

### Authentication
- JWT tokens for stateless authentication
- Role-based access control
- Password hashing with PBKDF2

### Data Protection
- HTTPS encryption for all communications
- Input validation and sanitization
- SQL injection prevention through ORM

### Physical Security
- RFID cards are read-only
- Secure card issuance process
- Audit trail for all changes

## 🚨 Troubleshooting

### Common Issues

1. **RFID Not Reading Cards**:
   - Check Arduino connections
   - Verify RC522 module power
   - Test with known working cards

2. **Raspberry Pi Not Connecting**:
   - Check serial port permissions
   - Verify internet connectivity
   - Review serial listener logs

3. **API Connection Issues**:
   - Check Django server status
   - Verify database connection
   - Review API endpoint URLs

### Logs Location

- **Backend**: `backend/logs/edurfid.log`
- **Raspberry Pi**: `/var/log/edurfid/serial_listener.log`
- **Docker**: `docker-compose logs [service_name]`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Write tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/edurfid-resolution/issues)
- **Email**: support@colegiospuno.com

## 🙏 Acknowledgments

- Django and React communities
- Arduino and Raspberry Pi hardware communities
- Rural education initiatives in Peru
- Starlink for satellite internet connectivity

## 📋 Project Status

- ✅ **Phase 1**: Core system development (Complete)
- ✅ **Phase 2**: Hardware integration (Complete)
- ✅ **Phase 3**: Frontend development (Complete)
- ✅ **Phase 4**: Face Recognition System (Complete)
- ✅ **Phase 5**: AI Model Auto-Training (Complete)
- ✅ **Phase 6**: Testing and deployment (Complete)
- 🔄 **Phase 7**: Monitoring and maintenance (Ongoing)

## 📚 Documentation

- **[Face Recognition Setup Guide](FACE_RECOGNITION_SETUP.md)** - Complete guide for face recognition system
- **[Integration Verification](INTEGRATION_VERIFICATION.md)** - Frontend-Backend-Database mappings
- **[System Design](docs/system_design.md)** - Detailed system architecture
- **[API Documentation](docs/api_docs.md)** - API endpoints documentation

## 🎓 Smart India Hackathon (SIH) Project

This project is built for **Smart India Hackathon** with the problem statement:
**"Automated Attendance System for Rural Schools"**

Key Requirements Met:
- ✅ Low-cost, user-friendly software
- ✅ Facial recognition-based attendance system
- ✅ RFID-based system (optional backup)
- ✅ Minimal infrastructure requirements
- ✅ Suitable for rural school deployment
- ✅ Government-ready reporting
- ✅ Mid-day meal data compatibility

---

**EDURFID** - Making attendance tracking simple and reliable for rural schools worldwide using AI-powered face recognition technology.
