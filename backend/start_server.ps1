Write-Host "Starting EDURFID Django Server..." -ForegroundColor Green
Write-Host ""

# Set MySQL database environment variables
$env:DB_ENGINE = "django.db.backends.mysql"
$env:DB_NAME = "edurfid"
$env:DB_USER = "root"
$env:DB_PASSWORD = "12345"
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"

Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "- Engine: MySQL"
Write-Host "- Database: edurfid"
Write-Host "- User: root"
Write-Host "- Host: localhost"
Write-Host ""

Write-Host "Starting Django development server..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Admin panel: http://localhost:8000/admin" -ForegroundColor Cyan
Write-Host "Username: admin" -ForegroundColor Cyan
Write-Host "Password: admin123" -ForegroundColor Cyan
Write-Host ""

python manage.py runserver
