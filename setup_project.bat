@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   EDURFID Project Setup - Automated Installer
echo ===================================================

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js and NPM.
    pause
    exit /b 1
)

echo.
echo [1/5] Setting up Backend Virtual Environment...
cd backend

:: Check for migration data
set MIGRATION_MODE=N
if exist db.sqlite3 (
    if exist media (
        echo [INFO] Existing data detected (db.sqlite3 and media folder).
        set /p MIGRATION_MODE="Is this a migration from another system? (Y/N): "
    )
)

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/5] Installing Backend Dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
echo Installing requirements (this uses specific versions for stability)...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)

echo.
echo [3/5] Configuring Environment and Database...
if not exist .env (
    echo Creating .env from env.example...
    copy env.example .env
)

echo Running database migrations...
python manage.py migrate

if /i "%MIGRATION_MODE%"=="Y" (
    echo [INFO] Migration Mode: Skipping sample data creation to preserve existing trained data.
) else (
    echo Creating initial setup and admin user...
    python setup_database.py
)

echo.
echo [4/5] Setting up Frontend Dependencies...
cd ..\frontend\react_app
echo Running npm install (This may take a few minutes)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b 1
)

echo.
echo [5/5] Finalizing Setup...
echo ===================================================
echo   SETUP COMPLETE!
echo ===================================================
if /i "%MIGRATION_MODE%"=="Y" (
    echo [IMPORTANT] Your trained data and models have been preserved.
)
echo To run the project:
echo 1. Run 'run_project.bat' from the root folder.
echo.
pause
cd ..\..
