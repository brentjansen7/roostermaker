@echo off
echo ============================================
echo  Roosterplanner - Eerste keer setup
echo ============================================
echo.

echo Stap 1: Backend dependencies installeren...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo FOUT: npm install backend mislukt
    pause
    exit /b 1
)

echo.
echo Stap 2: Frontend dependencies installeren...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo FOUT: npm install frontend mislukt
    pause
    exit /b 1
)

echo.
echo Stap 3: Database aanmaken en migraties uitvoeren...
cd ..\backend
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo.
    echo FOUT: Database migratie mislukt.
    pause
    exit /b 1
)

echo.
echo Stap 4: Database vullen met standaard data...
call node src/seed.js

echo.
echo ============================================
echo  Setup klaar! Start de software met start.bat
echo ============================================
pause
