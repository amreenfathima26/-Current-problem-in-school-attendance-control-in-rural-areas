#!/usr/bin/env python
"""
Create all test users (admin, teacher, student)
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

# Test users to create
test_users = [
    {
        'username': 'admin',
        'password': 'admin123',
        'email': 'admin@edurfid.com',
        'first_name': 'Admin',
        'last_name': 'User',
        'role': 'admin',
        'is_superuser': True,
        'is_staff': True
    },
    {
        'username': 'teacher',
        'password': 'teacher123',
        'email': 'teacher@edurfid.com',
        'first_name': 'Teacher',
        'last_name': 'User',
        'role': 'teacher'
    },
    {
        'username': 'student',
        'password': 'student123',
        'email': 'student@edurfid.com',
        'first_name': 'Student',
        'last_name': 'User',
        'role': 'student'
    }
]

print("=" * 50)
print("Creating Test Users")
print("=" * 50)

for user_data in test_users:
    username = user_data['username']
    password = user_data.pop('password')
    is_superuser = user_data.pop('is_superuser', False)
    is_staff = user_data.pop('is_staff', False)
    
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        user.set_password(password)
        user.role = user_data['role']
        user.school = school
        user.is_active = True
        if is_superuser:
            user.is_superuser = True
            user.is_staff = True
        user.save()
        print(f"UPDATED: {username} ({user_data['role']})")
    else:
        if is_superuser:
            user = User.objects.create_superuser(username=username, password=password, email=user_data['email'])
        else:
            user = User.objects.create_user(username=username, password=password, **user_data)
        user.school = school
        user.is_active = True
        user.save()
        print(f"CREATED: {username} ({user_data['role']})")

print("\n" + "=" * 50)
print("Test Users Summary")
print("=" * 50)
print("\nLogin Credentials:")
print("\n  Admin:")
print("    Username: admin")
print("    Password: admin123")
print("\n  Teacher:")
print("    Username: teacher")
print("    Password: teacher123")
print("\n  Student:")
print("    Username: student")
print("    Password: student123")
print("\n" + "=" * 50)

