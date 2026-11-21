@echo off
cd /d "%~dp0"
where pyw >nul 2>nul
if not errorlevel 1 (start "" pyw -3 StalkerTV.py & exit /b)
where pythonw >nul 2>nul
if not errorlevel 1 (start "" pythonw StalkerTV.py & exit /b)
echo Python 3 is required: https://www.python.org/downloads/
pause
