@echo off
echo.
echo ========================================
echo Medical Medium Archive Explorer
echo ========================================
echo.
echo Starting local server...
echo.
echo The archive will open in your browser automatically.
echo To stop the server, close this window or press Ctrl+C
echo.

REM Try Python 3 first, then Python 2
python -m http.server 8080 >nul 2>&1
if %errorlevel% neq 0 (
    python3 -m http.server 8080 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python is not installed or not in PATH
        echo Please install Python from https://python.org
        pause
        exit /b 1
    )
)

REM Open browser after short delay
timeout /t 2 /nobreak >nul
start http://localhost:8080

REM Keep server running
python -m http.server 8080 2>nul || python3 -m http.server 8080 