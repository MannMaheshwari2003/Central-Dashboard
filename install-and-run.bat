@echo off
setlocal
cd /d %~dp0

echo ================================================
echo DFPD Food ^& Public Distribution Dashboard
echo First-time setup
 echo ================================================

cd backend
call npm install
call npm run seed-db
call npm run validate-data
start "DFPD API" cmd /k "npm start"

cd ..\frontend
call npm install
start "DFPD Frontend" cmd /k "npm run dev"

cd ..
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
