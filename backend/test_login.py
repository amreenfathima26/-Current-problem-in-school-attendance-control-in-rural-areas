#!/usr/bin/env python
"""
Test login API
"""
import requests
import json

url = 'http://localhost:8000/api/auth/login/'
data = {
    'username': 'teacher',
    'password': 'teacher123'
}

print("Testing login with teacher credentials...")
print(f"URL: {url}")
print(f"Data: {data}")

try:
    response = requests.post(url, json=data)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("\nSUCCESS: Login successful!")
    else:
        print(f"\nERROR: Login failed with status {response.status_code}")
except Exception as e:
    print(f"\nERROR: {str(e)}")

