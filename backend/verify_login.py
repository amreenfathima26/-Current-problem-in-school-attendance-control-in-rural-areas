import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edurfid.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model

User = get_user_model()

def verify_logins():
    print("Verifying logins...")
    
    credentials = [
        ('admin', 'admin123'),
        ('teacher', 'teacher123'),
        ('student', 'student123')
    ]
    
    for username, password in credentials:
        print(f"\nTesting {username}...")
        try:
            user = User.objects.get(username=username)
            print(f"User found: {user.username} (Active: {user.is_active})")
            
            # Check password directly first
            if user.check_password(password):
                 print(f"✅ Password '{password}' is CORRECT.")
            else:
                 print(f"❌ Password '{password}' is INCORRECT.")
                 
            # Test full authentication
            auth_user = authenticate(username=username, password=password)
            if auth_user:
                print("✅ authenticate() returned User.")
            else:
                print("❌ authenticate() returned None.")
                
        except User.DoesNotExist:
            print(f"❌ User '{username}' does not exist in DB.")

if __name__ == '__main__':
    verify_logins()
