@echo off
echo ===================================================
echo   EDURFID Project - Runner
echo ===================================================

echo starting Backend Server...
start "EDURFID Backend" cmd /k "cd backend && venv\Scripts\activate.bat && python manage.py runserver"

echo Starting Frontend Development Server...
start "EDURFID Frontend" cmd /k "cd frontend\react_app && npm start"

echo.
echo ===================================================
echo   SERVERS STARTING...
echo ===================================================
echo.
echo Backend URL: http://localhost:8000
echo Frontend URL: http://localhost:3000
echo.
echo Closing this window will NOT stop the servers.
echo Please close the separate command prompts to stop.
echo ===================================================
pause
