@echo off
title EduPilot Launcher
setlocal enabledelayedexpansion

:: Switch to script directory (project root)
cd /d "%~dp0"

echo Launching EduPilot Development Environment...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_edupilot.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Startup encountered an error.
    pause
)
