@echo off
echo ============================================
echo  Roosterplanner starten
echo ============================================
echo.
echo Backend start op: http://localhost:3001
echo Frontend start op: http://localhost:5173
echo.
echo Sluit dit venster NIET af - dan stopt de software.
echo Druk Ctrl+C om te stoppen.
echo.

start "Roosterplanner Backend" cmd /k "cd /d "%~dp0backend" && node src/seed.js && npm run dev"
timeout /t 3 /nobreak >nul
start "Roosterplanner Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:5173
