# EDURFID API Documentation

## Overview
The EDURFID API provides RESTful endpoints for managing student attendance, RFID cards, users, and generating reports. All endpoints require authentication using JWT tokens.

## Base URL
```
Production: https://colegiospuno.com/api/
Development: http://localhost:8000/api/
```

## Authentication

### Login
**POST** `/auth/login/`

Request body:
```json
{
  "username": "teacher1",
  "password": "demo123"
}
```

Response:
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "teacher1",
    "email": "teacher1@edurfid.com",
    "first_name": "Maria",
    "last_name": "Garcia",
    "role": "teacher",
    "school": 1,
    "school_name": "Colegio San José"
  }
}
```

### Logout
**POST** `/auth/logout/`

Request body:
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Get Profile
**GET** `/auth/profile/`

Headers:
```
Authorization: Bearer <access_token>
```

Response:
```json
{
  "id": 1,
  "username": "teacher1",
  "email": "teacher1@edurfid.com",
  "first_name": "Maria",
  "last_name": "Garcia",
  "role": "teacher",
  "school": 1,
  "school_name": "Colegio San José",
  "phone_number": "+51987654322",
  "is_offline_sync_enabled": true,
  "last_sync": null
}
```

### Update Profile
**PUT** `/auth/profile/update/`

Request body:
```json
{
  "first_name": "Maria",
  "last_name": "Garcia",
  "email": "maria.garcia@edurfid.com",
  "phone_number": "+51987654322"
}
```

## Students API

### List Students
**GET** `/users/students/`

Query parameters:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20)
- `grade`: Filter by grade
- `search`: Search by name or student ID

Response:
```json
{
  "count": 50,
  "next": "http://localhost:8000/api/users/students/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": {
        "id": 5,
        "username": "student1",
        "email": "student1@edurfid.com",
        "first_name": "Juan",
        "last_name": "Perez",
        "role": "student"
      },
      "student_id": "STU001",
      "grade": "10",
      "parent_contact": "+51987654330",
      "parent_email": "parent1@email.com",
      "date_of_birth": "2008-03-15",
      "address": "Av. Lima 123, Puno",
      "enrollment_date": "2023-01-15",
      "is_active": true,
      "full_name": "Juan Perez",
      "rfid_cards": [
        {
          "id": 1,
          "card_id": "RFID001",
          "student": 1,
          "student_name": "Juan Perez",
          "status": "active",
          "issued_date": "2023-01-15T08:00:00Z",
          "last_used": "2024-01-15T08:30:00Z"
        }
      ]
    }
  ]
}
```

### Get Student
**GET** `/users/students/{id}/`

Response: Single student object (same format as in list)

### Create Student
**POST** `/users/students/`

Request body:
```json
{
  "user": {
    "username": "newstudent",
    "email": "newstudent@edurfid.com",
    "first_name": "New",
    "last_name": "Student",
    "password": "securepassword",
    "password_confirm": "securepassword",
    "role": "student",
    "school": 1,
    "phone_number": "+51987654399"
  },
  "student_id": "STU999",
  "grade": "9",
  "parent_contact": "+51987654400",
  "parent_email": "parent999@email.com",
  "date_of_birth": "2009-05-20",
  "address": "Av. Example 999, Puno"
}
```

### Update Student
**PUT** `/users/students/{id}/`

Request body: Same as create, but all fields optional

### Delete Student
**DELETE** `/users/students/{id}/`

Response: `204 No Content`

## RFID Cards API

### List RFID Cards
**GET** `/users/rfid-cards/`

Query parameters:
- `student`: Filter by student ID
- `status`: Filter by status (active, inactive, lost, damaged)
- `search`: Search by card ID

Response:
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "card_id": "RFID001",
      "student": 1,
      "student_name": "Juan Perez",
      "status": "active",
      "issued_date": "2023-01-15T08:00:00Z",
      "last_used": "2024-01-15T08:30:00Z",
      "notes": ""
    }
  ]
}
```

### Create RFID Card
**POST** `/users/rfid-cards/`

Request body:
```json
{
  "card_id": "RFID999",
  "student": 1,
  "status": "active",
  "notes": "New card issued"
}
```

### Update RFID Card
**PUT** `/users/rfid-cards/{id}/`

### Delete RFID Card
**DELETE** `/users/rfid-cards/{id}/`

## Attendance API

### Record Attendance from RFID
**POST** `/attendance/record/`

Request body:
```json
{
  "card_id": "RFID001"
}
```

Response:
```json
{
  "message": "Attendance recorded for Juan Perez",
  "student": "Juan Perez",
  "grade": "10",
  "status": "present",
  "timestamp": "2024-01-15T08:30:00Z"
}
```

### Get Daily Attendance
**GET** `/attendance/daily/`

Query parameters:
- `date`: Date in YYYY-MM-DD format (default: today)

Response:
```json
{
  "date": "2024-01-15",
  "total_students": 50,
  "present_count": 45,
  "absent_count": 3,
  "late_count": 2,
  "excused_count": 0,
  "attendance_percentage": 94.0,
  "students": [
    {
      "id": 1,
      "student": 1,
      "student_name": "Juan Perez",
      "student_id": "STU001",
      "grade": "10",
      "date": "2024-01-15",
      "timestamp": "2024-01-15T08:30:00Z",
      "status": "present",
      "notes": "",
      "recorded_by": 1,
      "recorded_by_name": "Admin User",
      "is_offline_record": false,
      "synced_at": null
    }
  ]
}
```

### List Attendance Records
**GET** `/attendance/records/`

Query parameters:
- `date`: Filter by date
- `status`: Filter by status
- `student__grade`: Filter by grade
- `search`: Search by student name or ID

Response:
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/attendance/records/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "student": 1,
      "student_name": "Juan Perez",
      "student_id": "STU001",
      "grade": "10",
      "date": "2024-01-15",
      "timestamp": "2024-01-15T08:30:00Z",
      "status": "present",
      "notes": "",
      "recorded_by": 1,
      "recorded_by_name": "Admin User",
      "is_offline_record": false,
      "synced_at": null
    }
  ]
}
```

### Create Attendance Record
**POST** `/attendance/records/`

Request body:
```json
{
  "student": 1,
  "date": "2024-01-15",
  "status": "present",
  "notes": "Manual entry"
}
```

### Update Attendance Record
**PUT** `/attendance/records/{id}/`

### Delete Attendance Record
**DELETE** `/attendance/records/{id}/`

### Get Attendance Statistics
**GET** `/attendance/stats/`

Query parameters:
- `period`: week, month, year (default: week)

Response:
```json
{
  "period": "week",
  "total_days": 7,
  "average_attendance": 92.5,
  "best_day": "2024-01-15",
  "worst_day": "2024-01-12",
  "total_present": 315,
  "total_absent": 25,
  "total_late": 10,
  "total_excused": 0
}
```

### Get Student Attendance History
**GET** `/attendance/students/{student_id}/history/`

Response:
```json
{
  "student": {
    "id": 1,
    "user": {
      "id": 5,
      "username": "student1",
      "first_name": "Juan",
      "last_name": "Perez"
    },
    "student_id": "STU001",
    "grade": "10"
  },
  "total_days": 30,
  "present_days": 28,
  "absent_days": 1,
  "late_days": 1,
  "excused_days": 0,
  "attendance_percentage": 96.67,
  "recent_records": [
    {
      "id": 1,
      "student": 1,
      "student_name": "Juan Perez",
      "date": "2024-01-15",
      "timestamp": "2024-01-15T08:30:00Z",
      "status": "present",
      "notes": ""
    }
  ]
}
```

### Get Attendance Summaries
**GET** `/attendance/summaries/`

Response:
```json
{
  "count": 30,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "date": "2024-01-15",
      "total_students": 50,
      "present_count": 45,
      "absent_count": 3,
      "late_count": 2,
      "excused_count": 0,
      "attendance_percentage": 94.0,
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:30:00Z"
    }
  ]
}
```

### Get Attendance Alerts
**GET** `/attendance/alerts/`

Response:
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "student": 5,
      "student_name": "Diego Hernandez",
      "student_id": "STU005",
      "alert_type": "absence",
      "message": "Student Diego Hernandez has been absent for 1 consecutive day.",
      "is_sent": false,
      "sent_at": null,
      "created_at": "2024-01-15T09:00:00Z",
      "is_resolved": false,
      "resolved_at": null
    }
  ]
}
```

## Reports API

### Generate Daily Report (PDF)
**GET** `/reports/daily/{date}/`

Response: PDF file download

### Generate Monthly Report (PDF)
**GET** `/reports/monthly/{year}/{month}/`

Response: PDF file download

### Generate Student Report (PDF)
**GET** `/reports/student/{student_id}/`

Response: PDF file download

### Export Attendance Excel
**GET** `/reports/export/excel/`

Query parameters:
- `start_date`: Start date for export
- `end_date`: End date for export
- `grade`: Filter by grade

Response: Excel file download

## Schools API

### List Schools
**GET** `/users/schools/`

Response:
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Colegio San José",
      "location": "Puno, Peru",
      "connectivity_status": true,
      "created_at": "2023-01-15T08:00:00Z",
      "updated_at": "2023-01-15T08:00:00Z"
    }
  ]
}
```

### Create School
**POST** `/users/schools/`

### Update School
**PUT** `/users/schools/{id}/`

### Delete School
**DELETE** `/users/schools/{id}/`

## Error Responses

### Authentication Error
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Validation Error
```json
{
  "field_name": [
    "This field is required."
  ]
}
```

### Not Found Error
```json
{
  "detail": "Not found."
}
```

### Permission Error
```json
{
  "detail": "You do not have permission to perform this action."
}
```

## Rate Limiting
- API calls are limited to 1000 requests per hour per user
- RFID scan endpoints have a 1-second cooldown to prevent duplicate scans

## Webhooks (Future Feature)
Webhooks will be available for:
- Attendance alerts
- Student registration
- RFID card events
- System status changes

## SDKs and Libraries
- JavaScript/React: Available in the frontend codebase
- Python: Use the `requests` library with the examples above
- Arduino: Serial communication protocol documented in hardware folder

## Support
For API support and questions, contact the development team or refer to the system documentation.
