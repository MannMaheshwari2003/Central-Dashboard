@echo off
setlocal
cd /d %~dp0

echo ================================================
echo DFPD Food ^& Public Distribution Dashboard
echo First-time setup
echo ================================================

cd backend
call npm ci
if errorlevel 1 goto :error
call npm run lint
if errorlevel 1 goto :error
call npm run check-db
if errorlevel 1 goto :error
call npm run validate-data
if errorlevel 1 goto :error
start "DFPD API" cmd /k "npm start"

cd ..\frontend
call npm ci
if errorlevel 1 goto :error
call npm run lint
if errorlevel 1 goto :error
call npm run build
if errorlevel 1 goto :error
start "DFPD Frontend" cmd /k "npm run dev"

cd ..
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
exit /b 0

:error
echo.
echo Setup failed. Review the command output above.
pause
exit /b 1
