#!/usr/bin/env python
"""
EDURFID Database Setup Script
This script will create migrations, run them, and populate the database with sample data.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edurfid.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import School
from attendance.models import Student, RFIDCard

def create_migrations():
    """Create migrations for all apps."""
    print("Creating migrations...")
    execute_from_command_line(['manage.py', 'makemigrations'])
    print("✅ Migrations created successfully!")

def run_migrations():
    """Run all migrations."""
    print("Running migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    print("✅ Migrations completed successfully!")

def create_superuser():
    """Create admin superuser."""
    print("Creating superuser...")
    User = get_user_model()
    
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser(
            username='admin',
            email='admin@edurfid.com',
            password='admin123'
        )
        print("✅ Admin user created successfully!")
        print("   Username: admin")
        print("   Password: admin123")
    else:
        print("✅ Admin user already exists!")

def create_sample_data():
    """Create sample data for the database."""
    print("Creating sample data...")
    
    # Create sample school
    school, created = School.objects.get_or_create(
        name='Escuela Rural San Juan',
        defaults={
            'address': 'Carretera Principal Km 45, San Juan, Peru',
            'phone': '+51 987654321',
            'email': 'contacto@escuelasanjuan.edu.pe',
            'is_active': True
        }
    )
    print(f"✅ School created: {created}")
    
    # Create sample students
    students_data = [
        {'first_name': 'Maria', 'last_name': 'Gonzalez', 'student_id': 'STU001', 'grade': '6', 'section': 'A'},
        {'first_name': 'Carlos', 'last_name': 'Rodriguez', 'student_id': 'STU002', 'grade': '6', 'section': 'A'},
        {'first_name': 'Ana', 'last_name': 'Martinez', 'student_id': 'STU003', 'grade': '7', 'section': 'B'},
        {'first_name': 'Luis', 'last_name': 'Lopez', 'student_id': 'STU004', 'grade': '7', 'section': 'B'},
        {'first_name': 'Sofia', 'last_name': 'Perez', 'student_id': 'STU005', 'grade': '8', 'section': 'A'},
    ]
    
    for student_data in students_data:
        student, created = Student.objects.get_or_create(
            student_id=student_data['student_id'],
            defaults={
                'first_name': student_data['first_name'],
                'last_name': student_data['last_name'],
                'grade': student_data['grade'],
                'section': student_data['section'],
                'school': school,
                'is_active': True
            }
        )
        print(f"✅ Student {student_data['student_id']} created: {created}")
        
        # Create RFID card for each student
        rfid_card, created = RFIDCard.objects.get_or_create(
            student=student,
            defaults={
                'card_number': f"RFID{student_data['student_id']}",
                'is_active': True
            }
        )
        print(f"✅ RFID card for {student_data['student_id']} created: {created}")
    
    print("✅ Sample data creation completed!")

def main():
    """Main setup function."""
    print("=" * 50)
    print("    EDURFID Database Setup")
    print("=" * 50)
    
    try:
        create_migrations()
        run_migrations()
        create_superuser()
        create_sample_data()
        
        print("\n" + "=" * 50)
        print("    Setup Completed Successfully!")
        print("=" * 50)
        print("\n🌐 Access URLs:")
        print("   Backend API: http://localhost:8000")
        print("   Admin Panel: http://localhost:8000/admin")
        print("\n🔑 Login Credentials:")
        print("   Username: admin")
        print("   Password: admin123")
        print("\n🚀 To start the server, run:")
        print("   python manage.py runserver")
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
