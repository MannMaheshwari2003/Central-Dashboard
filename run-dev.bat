@echo off
start "DFPD API" cmd /k "cd /d %~dp0backend && npm start"
start "DFPD Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
