@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (echo Python 3 is required to build the exe: https://www.python.org/downloads/ & pause & exit /b 1)
py -3 -m pip install --upgrade pyinstaller
if errorlevel 1 (echo pip failed - check the internet connection & pause & exit /b 1)
echo Installing the native window component (pywebview)...
py -3 -m pip install --upgrade pywebview
set EXTRA=--noconsole
py -3 -c "import webview" >nul 2>nul
if not errorlevel 1 set EXTRA=--noconsole --collect-all webview
if "%EXTRA%"=="--noconsole" echo WARNING: pywebview could not be installed - the exe will open the app in your browser instead of its own window.
py -3 -m PyInstaller --noconfirm --onefile --name StalkerTV %EXTRA% --add-data "app;app" StalkerTV.py
if errorlevel 1 (echo build failed & pause & exit /b 1)
copy /y dist\StalkerTV.exe StalkerTV.exe >nul
rmdir /s /q build dist 2>nul
del StalkerTV.spec 2>nul
echo.
echo Done: StalkerTV.exe was created in this folder. Keep the "ffmpeg" folder next to it.
pause
