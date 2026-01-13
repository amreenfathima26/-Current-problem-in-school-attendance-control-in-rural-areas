# EDURFID Backend Setup Script for Windows with Python 3.13
Write-Host "Setting up EDURFID Backend for Windows with Python 3.13..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH. Please install Python 3.13 first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install requirements
Write-Host "Installing requirements..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

# Copy environment file
if (-not (Test-Path ".env")) {
    Write-Host "Copying environment file..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "Please edit .env file with your database settings" -ForegroundColor Cyan
}

# Run migrations
Write-Host "Running migrations..." -ForegroundColor Yellow
python manage.py migrate

# Create superuser (optional)
Write-Host ""
$createSuperuser = Read-Host "Do you want to create a superuser? (y/n)"
if ($createSuperuser -eq "y" -or $createSuperuser -eq "Y") {
    python manage.py createsuperuser
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "To start the development server, run:" -ForegroundColor Cyan
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  python manage.py runserver" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
