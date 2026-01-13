#!/usr/bin/env python
"""
Test student login API
"""
import requests
import json

url = 'http://localhost:8000/api/auth/login/'
data = {
    'username': 'student',
    'password': 'student123'
}

print("Testing login with student credentials...")
print(f"URL: {url}")
print(f"Data: {data}")

try:
    response = requests.post(url, json=data)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("\nSUCCESS: Student login successful!")
        user_data = response.json().get('user', {})
        print(f"  Username: {user_data.get('username')}")
        print(f"  Role: {user_data.get('role')}")
        print(f"  Full Name: {user_data.get('get_full_name')}")
    else:
        print(f"\nERROR: Login failed with status {response.status_code}")
except Exception as e:
    print(f"\nERROR: {str(e)}")

