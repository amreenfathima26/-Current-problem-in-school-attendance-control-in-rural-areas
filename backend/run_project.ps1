# EDURFID Project Runner Script
Write-Host "Starting EDURFID Project Setup..." -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Checking Django installation..." -ForegroundColor Yellow
python -c "import django; print('Django version:', django.get_version())"

Write-Host ""
Write-Host "Step 2: Running Django system check..." -ForegroundColor Yellow
python manage.py check

Write-Host ""
Write-Host "Step 3: Running migrations..." -ForegroundColor Yellow
python manage.py migrate

Write-Host ""
Write-Host "Step 4: Creating superuser..." -ForegroundColor Yellow
python manage.py createsuperuser --username admin --email admin@edurfid.com --noinput

Write-Host ""
Write-Host "Step 5: Starting development server..." -ForegroundColor Yellow
Write-Host "The server will start at http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
python manage.py runserver
