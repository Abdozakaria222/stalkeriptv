@echo off
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install it from https://git-scm.com/download/win then run this file again.
  pause
  exit /b 1
)
if exist .git rmdir /s /q .git
git init -b main
git add -A
git -c user.name="abdo" -c user.email="abdo@example.com" commit -m "Stalker TV Android"
git remote add origin https://github.com/Abdozakaria222/stalkeriptv.git
echo.
echo A GitHub sign-in window may appear - sign in and allow.
git push -u origin main --force
echo.
echo Done. Open https://github.com/Abdozakaria222/stalkeriptv/actions
pause
