import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edurfid.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_users():
    print("Checking for users...")
    users = User.objects.all()
    if not users.exists():
        print("No users found in the database!")
        return

    print(f"Found {users.count()} users:")
    for user in users:
        print(f"- Username: {user.username}, Email: {user.email}, Role: {getattr(user, 'role', 'N/A')}")
        
    expected_users = ['admin', 'teacher', 'student']
    for username in expected_users:
        if not User.objects.filter(username=username).exists():
            print(f"WARNING: Demo user '{username}' does NOT exist!")
        else:
            print(f"Demo user '{username}' exists.")

if __name__ == '__main__':
    check_users()
