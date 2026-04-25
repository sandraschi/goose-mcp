@echo off
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WindowsApps"
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
pause
