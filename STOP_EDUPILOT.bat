@echo off
title EduPilot Shutdown
setlocal enabledelayedexpansion

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop_edupilot.ps1"

echo.
echo Shutdown complete.
timeout /t 3 >nul
