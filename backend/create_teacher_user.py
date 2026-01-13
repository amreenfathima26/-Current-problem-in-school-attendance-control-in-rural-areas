#!/usr/bin/env python
"""
Create teacher user for testing
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

# Check if teacher user exists
teacher_username = 'teacher'
teacher_password = 'teacher123'

if User.objects.filter(username=teacher_username).exists():
    teacher = User.objects.get(username=teacher_username)
    teacher.set_password(teacher_password)
    teacher.role = 'teacher'
    teacher.school = school
    teacher.is_active = True
    teacher.save()
    print(f"SUCCESS: Teacher user '{teacher_username}' password updated!")
else:
    teacher = User.objects.create_user(
        username=teacher_username,
        password=teacher_password,
        email='teacher@edurfid.com',
        first_name='Teacher',
        last_name='User',
        role='teacher',
        school=school,
        is_active=True
    )
    print(f"SUCCESS: Teacher user '{teacher_username}' created successfully!")

print(f"\nLogin Credentials:")
print(f"  Username: {teacher_username}")
print(f"  Password: {teacher_password}")
print(f"  Role: {teacher.role}")
print(f"  Active: {teacher.is_active}")

