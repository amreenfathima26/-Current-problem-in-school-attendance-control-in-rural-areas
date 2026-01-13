#!/bin/bash

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Create admin if environment variables are provided
echo "Checking for admin creation..."
python create_admin.py

# Start Gunicorn
echo "Starting server..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 edurfid.wsgi:application
