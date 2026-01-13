#!/usr/bin/env python
"""
Script to reset the database and start fresh.
"""
import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

def main():
    """Reset database and run migrations."""
    # Set environment variables for MySQL
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edurfid.settings')
    os.environ['DB_ENGINE'] = 'django.db.backends.mysql'
    os.environ['DB_NAME'] = 'edurfid'
    os.environ['DB_USER'] = 'root'
    os.environ['DB_PASSWORD'] = '12345'
    os.environ['DB_HOST'] = 'localhost'
    os.environ['DB_PORT'] = '3306'
    
    # Setup Django
    django.setup()
    
    # Import MySQL connection
    import pymysql
    pymysql.install_as_MySQLdb()
    
    try:
        # Connect to MySQL and drop/recreate database
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='12345',
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Drop database if exists
            cursor.execute("DROP DATABASE IF EXISTS edurfid")
            # Create fresh database
            cursor.execute("CREATE DATABASE edurfid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print("Database 'edurfid' recreated successfully!")
            
        connection.close()
        
        # Now run migrations
        print("Running migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        print("Migrations completed successfully!")
        
        # Create superuser
        print("Creating superuser...")
        execute_from_command_line(['manage.py', 'createsuperuser', '--username', 'admin', '--email', 'admin@example.com', '--noinput'])
        
        # Set password for superuser
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user = User.objects.get(username='admin')
        admin_user.set_password('admin123')
        admin_user.save()
        print("Superuser created: username='admin', password='admin123'")
        
        print("Database setup completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
