#!/usr/bin/env python
"""
Create student user for testing
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edurfid.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import School

User = get_user_model()

# Get or create a school
school, _ = School.objects.get_or_create(
    name='Default School',
    defaults={
        'location': 'Default Location',
        'connectivity_status': True
    }
)

# Check if student user exists
student_username = 'student'
student_password = 'student123'

if User.objects.filter(username=student_username).exists():
    student = User.objects.get(username=student_username)
    student.set_password(student_password)
    student.role = 'student'
    student.school = school
    student.is_active = True
    student.save()
    print(f"SUCCESS: Student user '{student_username}' password updated!")
else:
    student = User.objects.create_user(
        username=student_username,
        password=student_password,
        email='student@edurfid.com',
        first_name='Student',
        last_name='User',
        role='student',
        school=school,
        is_active=True
    )
    print(f"SUCCESS: Student user '{student_username}' created successfully!")

print(f"\nLogin Credentials:")
print(f"  Username: {student_username}")
print(f"  Password: {student_password}")
print(f"  Role: {student.role}")
print(f"  Active: {student.is_active}")

